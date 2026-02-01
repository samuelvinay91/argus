'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { safeFormatDistanceToNow } from '@/lib/utils';
import { CheckCircle2, XCircle, Loader2, Play, AlertTriangle, Sparkles, Calendar, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'test_started' | 'test_passed' | 'test_failed' | 'healing_applied' | 'schedule_triggered' | 'test_running';
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface RealtimeActivityFeedProps {
  projectId?: string;
  maxItems?: number;
  className?: string;
}

export function RealtimeActivityFeed({ projectId, maxItems = 20, className }: RealtimeActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to test_runs changes
    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_runs',
          filter: projectId ? `project_id=eq.${projectId}` : undefined,
        },
        (payload) => {
          const newActivity: Activity = {
            id: crypto.randomUUID(),
            type: getActivityType(payload),
            message: formatActivityMessage(payload),
            timestamp: new Date().toISOString(),
            metadata: payload.new as Record<string, unknown>,
          };

          setActivities(prev => [newActivity, ...prev].slice(0, maxItems));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'test_results',
          filter: projectId ? `project_id=eq.${projectId}` : undefined,
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = payload.new as any;
          const newActivity: Activity = {
            id: crypto.randomUUID(),
            type: data?.status === 'passed' ? 'test_passed' : 'test_failed',
            message: `Test "${data?.name || 'Unknown'}" ${data?.status === 'passed' ? 'passed' : 'failed'}`,
            timestamp: new Date().toISOString(),
            metadata: data,
          };

          setActivities(prev => [newActivity, ...prev].slice(0, maxItems));
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, maxItems]);

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'test_started':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'test_running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'test_passed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'test_failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'healing_applied':
        return <Sparkles className="h-4 w-4 text-yellow-500" />;
      case 'schedule_triggered':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      default:
        return <Zap className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityBgColor = (type: Activity['type']) => {
    switch (type) {
      case 'test_passed':
        return 'bg-green-500/5 border-green-500/20';
      case 'test_failed':
        return 'bg-red-500/5 border-red-500/20';
      case 'test_started':
      case 'test_running':
        return 'bg-blue-500/5 border-blue-500/20';
      case 'healing_applied':
        return 'bg-yellow-500/5 border-yellow-500/20';
      case 'schedule_triggered':
        return 'bg-purple-500/5 border-purple-500/20';
      default:
        return 'bg-muted/50 border-border';
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Live Activity</span>
        <span className={cn(
          'flex items-center gap-1.5 text-xs',
          isConnected ? 'text-green-500' : 'text-red-500'
        )}>
          <span className={cn(
            'h-2 w-2 rounded-full animate-pulse',
            isConnected ? 'bg-green-500' : 'bg-red-500'
          )} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No activity yet</p>
            <p className="text-xs">Run a test to see live updates</p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <div
              key={activity.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border transition-all duration-300',
                getActivityBgColor(activity.type),
                index === 0 && 'animate-in slide-in-from-top-2 fade-in-0'
              )}
            >
              <div className="mt-0.5">
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-tight">{activity.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {safeFormatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getActivityType(payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }): Activity['type'] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = payload.new as any;

  if (payload.eventType === 'INSERT') {
    return data?.status === 'running' ? 'test_running' : 'test_started';
  }

  if (payload.eventType === 'UPDATE') {
    if (data?.status === 'passed') return 'test_passed';
    if (data?.status === 'failed') return 'test_failed';
    if (data?.status === 'running') return 'test_running';
  }

  return 'test_started';
}

function formatActivityMessage(payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = payload.new as any;
  const name = data?.name || 'Test Run';

  if (payload.eventType === 'INSERT') {
    return `Started: ${name}`;
  }

  if (payload.eventType === 'UPDATE') {
    if (data?.status === 'passed') {
      const passed = data?.passed_tests || 0;
      return `Passed: ${name} (${passed} test${passed !== 1 ? 's' : ''} passed)`;
    }

    if (data?.status === 'failed') {
      const failed = data?.failed_tests || 0;
      return `Failed: ${name} (${failed} test${failed !== 1 ? 's' : ''} failed)`;
    }

    if (data?.status === 'running') {
      return `Running: ${name}`;
    }
  }

  return `Updated: ${name}`;
}

// Compact version for sidebar or small spaces
export function CompactActivityFeed({ projectId, maxItems = 5 }: { projectId?: string; maxItems?: number }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('compact-activity-feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_runs',
          filter: projectId ? `project_id=eq.${projectId}` : undefined,
        },
        (payload) => {
          const newActivity: Activity = {
            id: crypto.randomUUID(),
            type: getActivityType(payload),
            message: formatActivityMessage(payload),
            timestamp: new Date().toISOString(),
            metadata: payload.new as Record<string, unknown>,
          };

          setActivities(prev => [newActivity, ...prev].slice(0, maxItems));
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, maxItems]);

  const getStatusColor = (type: Activity['type']) => {
    switch (type) {
      case 'test_passed':
        return 'bg-green-500';
      case 'test_failed':
        return 'bg-red-500';
      case 'test_started':
      case 'test_running':
        return 'bg-blue-500';
      default:
        return 'bg-muted-foreground';
    }
  };

  if (activities.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-2">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity, index) => (
        <div
          key={activity.id}
          className={cn(
            'flex items-center gap-2 text-xs py-1',
            index === 0 && 'animate-in fade-in-0 slide-in-from-left-2'
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', getStatusColor(activity.type))} />
          <span className="truncate flex-1">{activity.message}</span>
        </div>
      ))}
    </div>
  );
}
