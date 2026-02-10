'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@clerk/nextjs';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  currentPage?: string;
  lastSeen: string;
  status?: 'online' | 'away' | 'busy';
}

interface UsePresenceOptions {
  channelName?: string;
  trackPage?: boolean;
}

export function usePresence(options: UsePresenceOptions = {}) {
  const { channelName = 'skopaq-presence', trackPage = true } = options;
  const { user } = useUser();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const isConnectedRef = useRef(false);

  // Update current page when navigation occurs
  const updatePresence = useCallback(async (updates: Partial<PresenceUser>) => {
    if (!channel || !user) return;

    try {
      await channel.track({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        name: user.fullName || user.username || 'Anonymous',
        avatarUrl: user.imageUrl,
        lastSeen: new Date().toISOString(),
        ...updates,
      });
    } catch (err) {
      console.error('Failed to update presence:', err);
    }
  }, [channel, user]);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    const presenceChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users: PresenceUser[] = Object.values(state).flatMap((presences) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (presences as any[]).map((p) => ({
            id: p.id,
            email: p.email,
            name: p.name,
            avatarUrl: p.avatarUrl,
            currentPage: p.currentPage,
            lastSeen: p.lastSeen,
            status: p.status || 'online',
          }))
        );
        // Filter out current user from the list
        setOnlineUsers(users.filter(u => u.id !== user.id));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          isConnectedRef.current = true;
          setIsConnected(true);
          setChannel(presenceChannel);

          // Track initial presence
          await presenceChannel.track({
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress || '',
            name: user.fullName || user.username || 'Anonymous',
            avatarUrl: user.imageUrl,
            currentPage: trackPage ? window.location.pathname : undefined,
            lastSeen: new Date().toISOString(),
            status: 'online',
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          isConnectedRef.current = false;
          setIsConnected(false);
          setChannel(null);
        }
      });

    // Update presence when page changes
    const handlePageChange = () => {
      if (trackPage && presenceChannel) {
        presenceChannel.track({
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          name: user.fullName || user.username || 'Anonymous',
          avatarUrl: user.imageUrl,
          currentPage: window.location.pathname,
          lastSeen: new Date().toISOString(),
          status: 'online',
        });
      }
    };

    // Listen for navigation events
    window.addEventListener('popstate', handlePageChange);

    // Heartbeat to keep presence alive
    const heartbeatInterval = setInterval(() => {
      if (presenceChannel && isConnectedRef.current) {
        presenceChannel.track({
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          name: user.fullName || user.username || 'Anonymous',
          avatarUrl: user.imageUrl,
          currentPage: trackPage ? window.location.pathname : undefined,
          lastSeen: new Date().toISOString(),
          status: 'online',
        });
      }
    }, 30000); // Update every 30 seconds

    return () => {
      window.removeEventListener('popstate', handlePageChange);
      clearInterval(heartbeatInterval);
      presenceChannel.unsubscribe();
      isConnectedRef.current = false;
      setIsConnected(false);
      setChannel(null);
    };
    // Note: isConnected intentionally excluded to prevent infinite reconnection loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, channelName, trackPage]);

  // Set status to 'away' when tab is hidden
  useEffect(() => {
    if (!channel || !user) return;

    const handleVisibilityChange = () => {
      const status = document.hidden ? 'away' : 'online';
      channel.track({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        name: user.fullName || user.username || 'Anonymous',
        avatarUrl: user.imageUrl,
        currentPage: window.location.pathname,
        lastSeen: new Date().toISOString(),
        status,
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [channel, user]);

  return { onlineUsers, isConnected, updatePresence };
}

// Hook for project-specific presence
export function useProjectPresence(projectId: string | null) {
  const channelName = projectId ? `skopaq-presence:project:${projectId}` : 'skopaq-presence';
  return usePresence({ channelName, trackPage: true });
}

// Hook for getting presence count
export function usePresenceCount(channelName: string = 'skopaq-presence') {
  const { onlineUsers, isConnected } = usePresence({ channelName, trackPage: false });
  return { count: onlineUsers.length, isConnected };
}
