'use client';

import { useState } from 'react';
import { formatDistanceToNow, formatDistanceToNowStrict, format } from 'date-fns';
import {
  Calendar,
  Clock,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Timer,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface Schedule {
  id: string;
  name: string;
  description?: string;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  next_run_at?: string;
  last_run_at?: string;
  run_count: number;
  failure_count: number;
  success_rate: number;
  test_ids: string[];
  notification_config?: {
    on_failure?: boolean;
    on_success?: boolean;
    channels?: string[];
  };
  environment?: string;
  browser?: string;
  created_at: string;
}

interface ScheduleCardProps {
  schedule: Schedule;
  onEdit: (schedule: Schedule) => void;
  onDelete: (scheduleId: string) => void;
  onToggle: (scheduleId: string, enabled: boolean) => void;
  onTriggerNow: (scheduleId: string) => void;
  lastRunStatus?: 'passed' | 'failed' | 'running' | 'pending';
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// Convert cron expression to human-readable format
function cronToHuman(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Common patterns
  if (cron === '0 * * * *') return 'Every hour';
  if (cron === '*/15 * * * *') return 'Every 15 minutes';
  if (cron === '*/30 * * * *') return 'Every 30 minutes';
  if (cron === '0 0 * * *') return 'Daily at midnight';
  if (cron === '0 9 * * *') return 'Daily at 9:00 AM';
  if (cron === '0 9 * * 1-5') return 'Weekdays at 9:00 AM';
  if (cron === '0 0 * * 0') return 'Weekly on Sunday';
  if (cron === '0 0 * * 1') return 'Weekly on Monday';
  if (cron === '0 0 1 * *') return 'Monthly on the 1st';

  // Parse hour
  if (hour !== '*' && minute !== '*' && dayOfMonth === '*' && month === '*') {
    const hourNum = parseInt(hour);
    const minuteNum = parseInt(minute);
    const timeStr = `${hourNum.toString().padStart(2, '0')}:${minuteNum.toString().padStart(2, '0')}`;

    if (dayOfWeek === '*') {
      return `Daily at ${timeStr}`;
    } else if (dayOfWeek === '1-5') {
      return `Weekdays at ${timeStr}`;
    } else if (dayOfWeek === '0,6') {
      return `Weekends at ${timeStr}`;
    }
  }

  return cron;
}

// Get countdown text for next run
function getNextRunCountdown(nextRunAt: string | undefined): string {
  if (!nextRunAt) return 'Not scheduled';

  const nextRun = new Date(nextRunAt);
  const now = new Date();

  if (nextRun <= now) return 'Running soon...';

  return formatDistanceToNowStrict(nextRun, { addSuffix: true });
}

export function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
  onToggle,
  onTriggerNow,
  lastRunStatus,
  isExpanded,
  onToggleExpand,
}: ScheduleCardProps) {
  const [showActions, setShowActions] = useState(false);

  const statusColors: Record<string, string> = {
    passed: 'bg-green-500',
    failed: 'bg-red-500',
    running: 'bg-blue-500 animate-pulse',
    pending: 'bg-yellow-500',
  };

  const successRate = schedule.success_rate || 0;
  const successRateColor =
    successRate >= 90 ? 'text-green-500' :
    successRate >= 70 ? 'text-yellow-500' :
    'text-red-500';

  return (
    <Card className={cn(
      'transition-all duration-200',
      !schedule.enabled && 'opacity-60'
    )}>
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Status Indicator */}
            <div className={cn(
              'mt-1 h-3 w-3 rounded-full flex-shrink-0',
              schedule.enabled
                ? (lastRunStatus ? statusColors[lastRunStatus] : 'bg-green-500')
                : 'bg-muted-foreground'
            )} />

            {/* Name and Description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{schedule.name}</h3>
                {!schedule.enabled && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Paused
                  </span>
                )}
              </div>
              {schedule.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {schedule.description}
                </p>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          <div className="relative flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowActions(!showActions)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {showActions && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActions(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-md border bg-popover shadow-md py-1">
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                    onClick={() => {
                      onEdit(schedule);
                      setShowActions(false);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                    onClick={() => {
                      onToggle(schedule.id, !schedule.enabled);
                      setShowActions(false);
                    }}
                  >
                    {schedule.enabled ? (
                      <>
                        <Pause className="h-4 w-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Enable
                      </>
                    )}
                  </button>
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                    onClick={() => {
                      onTriggerNow(schedule.id);
                      setShowActions(false);
                    }}
                    disabled={!schedule.enabled}
                  >
                    <Play className="h-4 w-4 text-primary" />
                    Run Now
                  </button>
                  <div className="h-px bg-border my-1" />
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                    onClick={() => {
                      onDelete(schedule.id);
                      setShowActions(false);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Schedule Info Row */}
        <div className="mt-4 flex items-center gap-4 flex-wrap">
          {/* Cron Expression */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span className="font-medium">{cronToHuman(schedule.cron_expression)}</span>
          </div>

          {/* Next Run */}
          {schedule.enabled && schedule.next_run_at && (
            <div className="flex items-center gap-1.5 text-xs">
              <Timer className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-primary font-medium">
                {getNextRunCountdown(schedule.next_run_at)}
              </span>
            </div>
          )}

          {/* Timezone */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{schedule.timezone}</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Run Count */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Runs:</span>
              <span className="font-semibold">{schedule.run_count}</span>
            </div>

            {/* Success Rate */}
            <div className="flex items-center gap-1.5 text-xs">
              <TrendingUp className={cn('h-3.5 w-3.5', successRateColor)} />
              <span className={cn('font-semibold', successRateColor)}>
                {successRate.toFixed(0)}%
              </span>
            </div>

            {/* Failures */}
            {schedule.failure_count > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-red-500">
                <XCircle className="h-3.5 w-3.5" />
                <span className="font-semibold">{schedule.failure_count} failed</span>
              </div>
            )}

            {/* Last Run */}
            {schedule.last_run_at && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Last run:</span>
                <span>{formatDistanceToNow(new Date(schedule.last_run_at), { addSuffix: true })}</span>
              </div>
            )}
          </div>

          {/* Expand Button */}
          {onToggleExpand && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={onToggleExpand}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide History
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show History
                </>
              )}
            </Button>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-3 flex items-center gap-2">
          <Button
            variant={schedule.enabled ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => onTriggerNow(schedule.id)}
            disabled={!schedule.enabled}
          >
            <Play className="h-3 w-3 mr-1" />
            Trigger Now
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onToggle(schedule.id, !schedule.enabled)}
          >
            {schedule.enabled ? (
              <>
                <Pause className="h-3 w-3 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" />
                Enable
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
