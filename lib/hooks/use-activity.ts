'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useProjects } from './use-projects';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Activity event types
export type ActivityEventType =
  | 'test_started'
  | 'test_passed'
  | 'test_failed'
  | 'test_created'
  | 'test_updated'
  | 'test_deleted'
  | 'project_created'
  | 'project_updated'
  | 'healing_applied'
  | 'healing_suggested'
  | 'schedule_triggered'
  | 'user_joined'
  | 'settings_changed'
  | 'integration_connected'
  | 'discovery_started'
  | 'discovery_completed'
  | 'visual_test_started'
  | 'visual_test_completed'
  | 'quality_audit_started'
  | 'quality_audit_completed';

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

// Map database activity_logs to our ActivityEvent format
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

// Fetch activity from various sources
export function useActivityFeed(limit = 50) {
  const supabase = getSupabaseClient();
  const { data: projects = [] } = useProjects();
  const projectIds = projects.map(p => p.id);
  const projectsMap = Object.fromEntries(projects.map(p => [p.id, p.name]));

  return useQuery({
    queryKey: ['activity-feed', projectIds, limit],
    queryFn: async () => {
      if (projectIds.length === 0) return [];

      const activities: ActivityEvent[] = [];

      // 1. Get activity_logs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: activityLogs } = await (supabase.from('activity_logs') as any)
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (activityLogs) {
        activities.push(
          ...activityLogs.map((log: {
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
          }) => mapActivityLogToEvent(log, projectsMap[log.project_id]))
        );
      }

      // 2. Get recent test runs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: testRuns } = await (supabase.from('test_runs') as any)
        .select('id, project_id, name, status, trigger, total_tests, passed_tests, failed_tests, duration_ms, created_at, started_at, completed_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (testRuns) {
        testRuns.forEach((run: {
          id: string;
          project_id: string;
          name: string | null;
          status: string;
          trigger: string;
          total_tests: number;
          passed_tests: number;
          failed_tests: number;
          duration_ms: number | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
        }) => {
          let type: ActivityEventType = 'test_started';
          let title = 'Test run started';
          let description = `${run.name || 'Test run'} started`;

          if (run.status === 'passed') {
            type = 'test_passed';
            title = 'Test run completed successfully';
            description = `${run.name || 'Test run'} passed all ${run.total_tests} tests`;
          } else if (run.status === 'failed') {
            type = 'test_failed';
            title = 'Test run failed';
            description = `${run.name || 'Test run'} failed: ${run.failed_tests}/${run.total_tests} tests failed`;
          } else if (run.status === 'running') {
            type = 'test_started';
            title = 'Test run in progress';
            description = `${run.name || 'Test run'} is currently running`;
          }

          activities.push({
            id: `run-${run.id}`,
            type,
            title,
            description,
            timestamp: run.completed_at || run.started_at || run.created_at,
            user: { name: run.trigger === 'scheduled' ? 'Scheduler' : 'System' },
            metadata: {
              projectId: run.project_id,
              projectName: projectsMap[run.project_id],
              duration: run.duration_ms || undefined,
              link: '/tests',
            },
          });
        });
      }

      // 3. Get recent discoveries
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: discoveries } = await (supabase.from('discovery_sessions') as any)
        .select('id, project_id, status, pages_found, flows_found, created_at, completed_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(10);

      if (discoveries) {
        discoveries.forEach((disc: {
          id: string;
          project_id: string;
          status: string;
          pages_found: number;
          flows_found: number;
          created_at: string;
          completed_at: string | null;
        }) => {
          const isComplete = disc.status === 'completed';
          activities.push({
            id: `disc-${disc.id}`,
            type: isComplete ? 'discovery_completed' : 'discovery_started',
            title: isComplete ? 'Discovery completed' : 'Discovery started',
            description: isComplete
              ? `Found ${disc.pages_found} pages and ${disc.flows_found} flows`
              : 'AI discovery session started',
            timestamp: disc.completed_at || disc.created_at,
            user: { name: 'Argus AI' },
            metadata: {
              projectId: disc.project_id,
              projectName: projectsMap[disc.project_id],
              link: '/discovery',
            },
          });
        });
      }

      // 4. Get recent healing events
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: healings } = await (supabase.from('healing_patterns') as any)
        .select('id, project_id, error_type, original_selector, healed_selector, confidence, success_count, created_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(10);

      if (healings) {
        healings.forEach((heal: {
          id: string;
          project_id: string;
          error_type: string | null;
          original_selector: string | null;
          healed_selector: string | null;
          confidence: number | null;
          success_count: number;
          created_at: string;
        }) => {
          const isApplied = heal.success_count > 0;
          activities.push({
            id: `heal-${heal.id}`,
            type: isApplied ? 'healing_applied' : 'healing_suggested',
            title: isApplied ? 'Self-healing fix applied' : 'Healing suggestion available',
            description: heal.original_selector && heal.healed_selector
              ? `Updated selector: ${heal.original_selector.substring(0, 30)}... -> ${heal.healed_selector.substring(0, 30)}...`
              : 'Fix identified for test issue',
            timestamp: heal.created_at,
            user: { name: 'Argus AI' },
            metadata: {
              projectId: heal.project_id,
              projectName: projectsMap[heal.project_id],
              link: '/healing',
            },
          });
        });
      }

      // 5. Get recent schedule runs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: scheduleRuns } = await (supabase.from('schedule_runs') as any)
        .select(`
          id,
          schedule_id,
          status,
          trigger_type,
          tests_total,
          tests_failed,
          triggered_at,
          test_schedules (
            name,
            project_id
          )
        `)
        .order('triggered_at', { ascending: false })
        .limit(10);

      if (scheduleRuns) {
        scheduleRuns.forEach((run: {
          id: string;
          schedule_id: string;
          status: string;
          trigger_type: string;
          tests_total: number;
          tests_failed: number;
          triggered_at: string;
          test_schedules: { name: string; project_id: string } | null;
        }) => {
          if (!run.test_schedules) return;

          activities.push({
            id: `sched-${run.id}`,
            type: 'schedule_triggered',
            title: 'Scheduled run triggered',
            description: `${run.test_schedules.name} ${run.trigger_type === 'manual' ? 'manually triggered' : 'started'} (${run.tests_total} tests)`,
            timestamp: run.triggered_at,
            user: { name: run.trigger_type === 'manual' ? 'User' : 'Scheduler' },
            metadata: {
              projectId: run.test_schedules.project_id,
              projectName: projectsMap[run.test_schedules.project_id],
              link: '/schedules',
            },
          });
        });
      }

      // Sort all activities by timestamp and return top limit
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    },
    enabled: projectIds.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Real-time activity stream using Supabase subscriptions
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

// Activity stats
export function useActivityStats() {
  const { data: activities = [] } = useActivityFeed(100);

  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  const stats = {
    lastHour: activities.filter(a => new Date(a.timestamp).getTime() > oneHourAgo).length,
    testRuns: activities.filter(a => a.type === 'test_passed' || a.type === 'test_failed').length,
    healsApplied: activities.filter(a => a.type === 'healing_applied').length,
    failures: activities.filter(a => a.type === 'test_failed').length,
  };

  return stats;
}
