'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ActivityLog {
  id: string;
  project_id: string;
  session_id: string;
  activity_type: 'discovery' | 'visual_test' | 'test_run' | 'quality_audit' | 'global_test';
  event_type: 'started' | 'step' | 'screenshot' | 'thinking' | 'action' | 'error' | 'completed' | 'cancelled';
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  screenshot_url?: string;
  duration_ms?: number;
  created_at: string;
}

export interface LiveSession {
  id: string;
  project_id: string;
  session_type: 'discovery' | 'visual_test' | 'test_run' | 'quality_audit' | 'global_test';
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  current_step?: string;
  total_steps: number;
  completed_steps: number;
  last_screenshot_url?: string;
  started_at: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
}

// Connection status types for real-time monitoring
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

// Configuration for reconnection
const RECONNECT_CONFIG = {
  maxAttempts: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
};

// Hook to get active sessions for a project
export function useActiveSessions(projectId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['live-sessions', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await (supabase.from('live_sessions') as any)
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data as LiveSession[];
    },
    enabled: !!projectId,
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

// Hook to get activity logs for a session with real-time updates and connection health
export function useActivityStream(sessionId: string | null) {
  const supabase = getSupabaseClient();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);

  // Refs for reconnection logic
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate backoff delay with jitter
  const getBackoffDelay = useCallback((attempt: number) => {
    const delay = Math.min(
      RECONNECT_CONFIG.baseDelay * Math.pow(RECONNECT_CONFIG.backoffMultiplier, attempt),
      RECONNECT_CONFIG.maxDelay
    );
    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, [supabase]);

  // Subscribe to channel with reconnection logic
  const subscribe = useCallback(async () => {
    if (!sessionId) return;

    cleanup();
    setConnectionStatus('connecting');

    const channel = supabase
      .channel(`activity-${sessionId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: sessionId },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: unknown) => {
          const typedPayload = payload as { new: ActivityLog };
          setActivities((prev) => [...prev, typedPayload.new]);
          setLastHeartbeat(new Date());
        }
      )
      .on('system', { event: '*' }, (payload: unknown) => {
        const typedPayload = payload as { status?: string };
        // Handle system events for connection health
        if (typedPayload.status === 'ok') {
          setLastHeartbeat(new Date());
        }
      });

    // Subscribe with status callback
    channel.subscribe((status) => {
      switch (status) {
        case 'SUBSCRIBED':
          setConnectionStatus('connected');
          reconnectAttemptRef.current = 0;
          setLastHeartbeat(new Date());
          console.log(`[ActivityStream] Connected to session ${sessionId}`);
          break;
        case 'CHANNEL_ERROR':
        case 'TIMED_OUT':
          setConnectionStatus('error');
          console.error(`[ActivityStream] Connection error for session ${sessionId}`);
          // Attempt reconnection
          if (reconnectAttemptRef.current < RECONNECT_CONFIG.maxAttempts) {
            const delay = getBackoffDelay(reconnectAttemptRef.current);
            console.log(`[ActivityStream] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current + 1})`);
            setConnectionStatus('reconnecting');
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptRef.current++;
              subscribe();
            }, delay);
          } else {
            console.error(`[ActivityStream] Max reconnection attempts reached`);
            setConnectionStatus('error');
          }
          break;
        case 'CLOSED':
          setConnectionStatus('disconnected');
          break;
      }
    });

    channelRef.current = channel;

    // Set up heartbeat check (every 10 seconds)
    heartbeatIntervalRef.current = setInterval(() => {
      if (lastHeartbeat) {
        const timeSinceHeartbeat = Date.now() - lastHeartbeat.getTime();
        if (timeSinceHeartbeat > 30000) { // 30 seconds without activity
          console.warn('[ActivityStream] Connection may be stale, checking...');
          // Force a reconnection if stale
          if (connectionStatus === 'connected') {
            subscribe();
          }
        }
      }
    }, 10000);
  }, [sessionId, supabase, cleanup, getBackoffDelay, connectionStatus, lastHeartbeat]);

  // Initial fetch and subscription
  useEffect(() => {
    if (!sessionId) {
      setActivities([]);
      setConnectionStatus('disconnected');
      cleanup();
      return;
    }

    const fetchActivities = async () => {
      const { data, error } = await (supabase.from('activity_logs') as unknown as {
        select: (columns: string) => {
          eq: (column: string, value: string) => {
            order: (column: string, options: { ascending: boolean }) => Promise<{ data: ActivityLog[] | null; error: Error | null }>;
          };
        };
      })
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setActivities(data);
      }
    };

    fetchActivities();
    subscribe();

    return cleanup;
  }, [sessionId, supabase, subscribe, cleanup]);

  return {
    activities,
    connectionStatus,
    lastHeartbeat,
    reconnect: subscribe,
    isConnected: connectionStatus === 'connected',
    isReconnecting: connectionStatus === 'reconnecting',
  };
}

// Simple hook that returns just activities (backward compatible)
export function useActivityStreamSimple(sessionId: string | null): ActivityLog[] {
  const { activities } = useActivityStream(sessionId);
  return activities;
}

// Hook to create a new live session
export function useCreateLiveSession() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      sessionType,
      totalSteps = 0,
      metadata = {},
    }: {
      projectId: string;
      sessionType: LiveSession['session_type'];
      totalSteps?: number;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await (supabase.from('live_sessions') as any)
        .insert({
          project_id: projectId,
          session_type: sessionType,
          status: 'active',
          total_steps: totalSteps,
          completed_steps: 0,
          metadata,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LiveSession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['live-sessions', data.project_id] });
    },
  });
}

// Hook to update a live session
export function useUpdateLiveSession() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      updates,
    }: {
      sessionId: string;
      updates: Partial<Pick<LiveSession, 'status' | 'current_step' | 'completed_steps' | 'last_screenshot_url' | 'completed_at' | 'metadata'>>;
    }) => {
      const { data, error } = await (supabase.from('live_sessions') as any)
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as LiveSession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['live-sessions', data.project_id] });
    },
  });
}

// Hook to log an activity
export function useLogActivity() {
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      sessionId,
      activityType,
      eventType,
      title,
      description,
      metadata,
      screenshotUrl,
      durationMs,
    }: {
      projectId: string;
      sessionId: string;
      activityType: ActivityLog['activity_type'];
      eventType: ActivityLog['event_type'];
      title: string;
      description?: string;
      metadata?: Record<string, unknown>;
      screenshotUrl?: string;
      durationMs?: number;
    }) => {
      const { data, error } = await (supabase.from('activity_logs') as any)
        .insert({
          project_id: projectId,
          session_id: sessionId,
          activity_type: activityType,
          event_type: eventType,
          title,
          description,
          metadata,
          screenshot_url: screenshotUrl,
          duration_ms: durationMs,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ActivityLog;
    },
  });
}

// Combined hook for managing a live session with activity logging
export function useLiveSessionManager(projectId: string | null) {
  const createSession = useCreateLiveSession();
  const updateSession = useUpdateLiveSession();
  const logActivity = useLogActivity();
  const [currentSession, setCurrentSession] = useState<LiveSession | null>(null);

  const startSession = useCallback(async (
    sessionType: LiveSession['session_type'],
    totalSteps: number = 0
  ) => {
    if (!projectId) return null;

    const session = await createSession.mutateAsync({
      projectId,
      sessionType,
      totalSteps,
    });

    setCurrentSession(session);

    // Log start event
    await logActivity.mutateAsync({
      projectId,
      sessionId: session.id,
      activityType: sessionType,
      eventType: 'started',
      title: `${sessionType.replace('_', ' ')} started`,
    });

    return session;
  }, [projectId, createSession, logActivity]);

  const logStep = useCallback(async (
    title: string,
    description?: string,
    screenshotUrl?: string
  ) => {
    if (!projectId || !currentSession) return;

    await logActivity.mutateAsync({
      projectId,
      sessionId: currentSession.id,
      activityType: currentSession.session_type,
      eventType: 'step',
      title,
      description,
      screenshotUrl,
    });

    // Update session progress
    await updateSession.mutateAsync({
      sessionId: currentSession.id,
      updates: {
        completed_steps: (currentSession.completed_steps || 0) + 1,
        current_step: title,
        last_screenshot_url: screenshotUrl || currentSession.last_screenshot_url,
      },
    });
  }, [projectId, currentSession, logActivity, updateSession]);

  const logThinking = useCallback(async (thought: string) => {
    if (!projectId || !currentSession) return;

    await logActivity.mutateAsync({
      projectId,
      sessionId: currentSession.id,
      activityType: currentSession.session_type,
      eventType: 'thinking',
      title: 'AI Thinking',
      description: thought,
    });
  }, [projectId, currentSession, logActivity]);

  const logError = useCallback(async (error: string) => {
    if (!projectId || !currentSession) return;

    await logActivity.mutateAsync({
      projectId,
      sessionId: currentSession.id,
      activityType: currentSession.session_type,
      eventType: 'error',
      title: 'Error',
      description: error,
    });
  }, [projectId, currentSession, logActivity]);

  const completeSession = useCallback(async (success: boolean) => {
    if (!projectId || !currentSession) return;

    const status = success ? 'completed' : 'failed';

    await logActivity.mutateAsync({
      projectId,
      sessionId: currentSession.id,
      activityType: currentSession.session_type,
      eventType: 'completed',
      title: success ? 'Completed successfully' : 'Failed',
    });

    await updateSession.mutateAsync({
      sessionId: currentSession.id,
      updates: {
        status,
        completed_at: new Date().toISOString(),
      },
    });

    setCurrentSession(null);
  }, [projectId, currentSession, logActivity, updateSession]);

  return {
    currentSession,
    startSession,
    logStep,
    logThinking,
    logError,
    completeSession,
    isLoading: createSession.isPending || updateSession.isPending,
  };
}
