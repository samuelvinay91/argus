'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useProjects } from './use-projects';
import {
  activityApi,
  type ActivityEventApi,
  type ActivityEventType as ApiActivityEventType,
} from '@/lib/api-client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Activity event types (re-export from api-client for backward compatibility)
export type ActivityEventType = ApiActivityEventType;

// Legacy ActivityEvent interface for backward compatibility
export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  description: string;
  timestamp: string;
  user?: {
    name: string;
    avatar?: string;
  };
  metadata?: {
    projectId?: string;
    projectName?: string;
    testId?: string;
    testName?: string;
    duration?: number;
    link?: string;
  };
}

/**
 * Transform API response to legacy ActivityEvent format
 * Ensures backward compatibility with existing consumers
 */
function transformApiEventToLegacy(apiEvent: ActivityEventApi): ActivityEvent {
  return {
    id: apiEvent.id,
    type: apiEvent.type,
    title: apiEvent.title,
    description: apiEvent.description,
    timestamp: apiEvent.timestamp,
    user: apiEvent.user ? {
      name: apiEvent.user.name,
      avatar: apiEvent.user.avatar ?? undefined,
    } : undefined,
    metadata: apiEvent.metadata ? {
      projectId: apiEvent.metadata.projectId ?? undefined,
      projectName: apiEvent.metadata.projectName ?? undefined,
      testId: apiEvent.metadata.testId ?? undefined,
      testName: apiEvent.metadata.testName ?? undefined,
      duration: apiEvent.metadata.duration ?? undefined,
      link: apiEvent.metadata.link ?? undefined,
    } : undefined,
  };
}

// Map database activity_logs to our ActivityEvent format (kept for realtime subscriptions)
function mapActivityLogToEvent(log: {
  id: string;
  project_id: string;
  session_id: string;
  activity_type: string;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  screenshot_url: string | null;
  duration_ms: number | null;
  created_at: string;
}, projectName?: string): ActivityEvent {
  // Map activity_type and event_type to our event types
  let type: ActivityEventType = 'test_started';

  switch (log.activity_type) {
    case 'test_run':
      if (log.event_type === 'started') type = 'test_started';
      else if (log.event_type === 'completed') {
        type = (log.metadata as { success?: boolean })?.success ? 'test_passed' : 'test_failed';
      }
      break;
    case 'discovery':
      type = log.event_type === 'completed' ? 'discovery_completed' : 'discovery_started';
      break;
    case 'visual_test':
      type = log.event_type === 'completed' ? 'visual_test_completed' : 'visual_test_started';
      break;
    case 'quality_audit':
      type = log.event_type === 'completed' ? 'quality_audit_completed' : 'quality_audit_started';
      break;
  }

  return {
    id: log.id,
    type,
    title: log.title,
    description: log.description || '',
    timestamp: log.created_at,
    user: { name: 'System' },
    metadata: {
      projectId: log.project_id,
      projectName: projectName,
      duration: log.duration_ms || undefined,
      link: getActivityLink(log.activity_type),
    },
  };
}

function getActivityLink(activityType: string): string {
  switch (activityType) {
    case 'test_run':
      return '/tests';
    case 'discovery':
      return '/discovery';
    case 'visual_test':
      return '/visual';
    case 'quality_audit':
      return '/quality';
    default:
      return '/';
  }
}

/**
 * Fetch activity feed from the backend API.
 * Aggregates data from activity_logs, test_runs, discovery_sessions,
 * healing_patterns, and schedule_runs.
 */
export function useActivityFeed(limit = 50) {
  const { data: projects = [] } = useProjects();
  const projectIds = projects.map(p => p.id);

  return useQuery({
    queryKey: ['activity-feed', projectIds, limit],
    queryFn: async (): Promise<ActivityEvent[]> => {
      if (projectIds.length === 0) return [];

      const response = await activityApi.getFeed({
        projectIds,
        limit,
      });

      // Transform API response to legacy format
      return response.activities.map(transformApiEventToLegacy);
    },
    enabled: projectIds.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Real-time activity stream using Supabase subscriptions.
 * Note: This still uses Supabase realtime for immediate updates,
 * but invalidates the API-based feed on changes.
 */
export function useRealtimeActivity() {
  const supabase = getSupabaseClient();
  const { data: projects = [] } = useProjects();
  const projectIds = projects.map(p => p.id);
  const projectsMap = Object.fromEntries(projects.map(p => [p.id, p.name]));
  const queryClient = useQueryClient();

  const [newActivities, setNewActivities] = useState<ActivityEvent[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (projectIds.length === 0) return;

    // Subscribe to activity_logs table for real-time updates
    const channel = supabase
      .channel('activity-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
        },
        (payload) => {
          const log = payload.new as {
            id: string;
            project_id: string;
            session_id: string;
            activity_type: string;
            event_type: string;
            title: string;
            description: string | null;
            metadata: Record<string, unknown> | null;
            screenshot_url: string | null;
            duration_ms: number | null;
            created_at: string;
          };

          if (projectIds.includes(log.project_id)) {
            const event = mapActivityLogToEvent(log, projectsMap[log.project_id]);
            setNewActivities(prev => [event, ...prev].slice(0, 10));
            queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_runs',
        },
        () => {
          // Invalidate activity feed on test run changes
          queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [supabase, projectIds, projectsMap, queryClient]);

  return {
    newActivities,
    clearNewActivities: useCallback(() => setNewActivities([]), []),
  };
}

/**
 * Activity statistics for dashboard widgets.
 * Uses the dedicated stats endpoint for efficiency.
 */
export function useActivityStats() {
  const { data: projects = [] } = useProjects();
  const projectIds = projects.map(p => p.id);

  const { data: statsData } = useQuery({
    queryKey: ['activity-stats', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) {
        return { lastHour: 0, testRuns: 0, healsApplied: 0, failures: 0 };
      }

      const response = await activityApi.getStats({ projectIds });

      return {
        lastHour: response.lastHour,
        testRuns: response.testRuns,
        healsApplied: response.healsApplied,
        failures: response.failures,
      };
    },
    enabled: projectIds.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Return default stats if query hasn't loaded yet
  return statsData ?? {
    lastHour: 0,
    testRuns: 0,
    healsApplied: 0,
    failures: 0,
  };
}
