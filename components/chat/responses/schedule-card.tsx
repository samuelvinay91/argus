'use client';

import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Calendar,
  Check,
  Edit,
  Pause,
  Trash2,
  Bell,
  Globe,
  Play,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScheduleCardProps {
  data: {
    schedule_id: string;
    name: string;
    cron_expression: string;
    cron_readable?: string;
    next_run_at?: string;
    timezone?: string;
    app_url?: string;
    test_id?: string;
    enabled?: boolean;
    _actions?: string[];
  };
  onAction?: (action: string, data: unknown) => void;
}

// Format date for display
function formatNextRun(isoDate: string | undefined): string {
  if (!isoDate) return 'Not scheduled';

  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Less than 1 hour';
  if (diffHours < 24) return `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `In ${diffDays} days`;

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const ScheduleCard = memo(function ScheduleCard({
  data,
  onAction,
}: ScheduleCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const {
    schedule_id,
    name,
    cron_expression,
    cron_readable,
    next_run_at,
    timezone = 'UTC',
    app_url,
    enabled = true,
  } = data;

  const nextRunFormatted = formatNextRun(next_run_at);
  const isUpcoming = next_run_at && new Date(next_run_at).getTime() - Date.now() < 3600000; // Within 1 hour

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        'rounded-lg border-2 overflow-hidden transition-colors',
        enabled
          ? 'border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-cyan-500/5'
          : 'border-muted bg-muted/30'
      )}
    >
      {/* Header */}
      <div className={cn(
        'px-4 py-3 border-b flex items-center justify-between',
        enabled ? 'border-blue-500/20 bg-blue-500/5' : 'border-muted bg-muted/20'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            enabled ? 'bg-blue-500/20' : 'bg-muted'
          )}>
            <Clock className={cn('h-5 w-5', enabled ? 'text-blue-500' : 'text-muted-foreground')} />
          </div>
          <div>
            <h4 className="font-semibold text-sm flex items-center gap-2">
              {name}
              {!enabled && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  PAUSED
                </span>
              )}
            </h4>
            <p className="text-xs text-muted-foreground font-mono">
              {cron_readable || cron_expression}
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {enabled && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-green-500"
            />
          )}
          <span className={cn(
            'text-xs font-medium',
            enabled ? 'text-green-500' : 'text-muted-foreground'
          )}>
            {enabled ? 'Active' : 'Paused'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-3">
        {/* Next Run */}
        <div className={cn(
          'flex items-center justify-between p-3 rounded-lg',
          isUpcoming
            ? 'bg-amber-500/10 border border-amber-500/30'
            : 'bg-muted/50'
        )}>
          <div className="flex items-center gap-2">
            <Calendar className={cn(
              'h-4 w-4',
              isUpcoming ? 'text-amber-500' : 'text-muted-foreground'
            )} />
            <span className="text-xs font-medium">Next Run</span>
          </div>
          <span className={cn(
            'text-sm font-semibold',
            isUpcoming ? 'text-amber-500' : 'text-foreground'
          )}>
            {nextRunFormatted}
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            <span>Timezone: {timezone}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Bell className="h-3.5 w-3.5" />
            <span>Notify on failure</span>
          </div>
        </div>

        {/* App URL */}
        {app_url && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">URL:</span>{' '}
            <a
              href={app_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {app_url.length > 50 ? `${app_url.substring(0, 50)}...` : app_url}
            </a>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className={cn(
        'px-4 py-3 border-t flex items-center gap-2',
        enabled ? 'border-blue-500/20 bg-blue-500/5' : 'border-muted bg-muted/20'
      )}>
        {enabled ? (
          <>
            <Button
              onClick={() => onAction?.('run_now', data)}
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Run Now
            </Button>
            <Button
              onClick={() => onAction?.('pause_schedule', data)}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </Button>
          </>
        ) : (
          <Button
            onClick={() => onAction?.('resume_schedule', data)}
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            Resume
          </Button>
        )}
        <Button
          onClick={() => onAction?.('edit_schedule', data)}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
        >
          <Edit className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          onClick={() => onAction?.('delete_schedule', data)}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10 ml-auto"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
});

// Schedule List Card - for displaying multiple schedules
interface ScheduleListCardProps {
  data: {
    schedules: Array<{
      id: string;
      name: string;
      cron_expression: string;
      enabled: boolean;
      next_run_at?: string;
      last_run_at?: string;
    }>;
    total: number;
  };
  onAction?: (action: string, data: unknown) => void;
}

export const ScheduleListCard = memo(function ScheduleListCard({
  data,
  onAction,
}: ScheduleListCardProps) {
  const { schedules, total } = data;

  if (schedules.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-muted p-6 text-center">
        <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <h4 className="font-medium text-sm">No Schedules Found</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Create a schedule to run tests automatically
        </p>
        <Button
          onClick={() => onAction?.('create_schedule', {})}
          size="sm"
          className="mt-3"
        >
          Create Schedule
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Scheduled Tests</h4>
          <span className="text-xs text-muted-foreground">({total})</span>
        </div>
        <Button
          onClick={() => onAction?.('create_schedule', {})}
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
        >
          + New
        </Button>
      </div>

      {/* Schedule List */}
      <div className="divide-y">
        {schedules.map((schedule) => {
          const nextRun = formatNextRun(schedule.next_run_at);

          return (
            <div
              key={schedule.id}
              className="px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    schedule.enabled ? 'bg-green-500' : 'bg-muted-foreground'
                  )} />
                  <div>
                    <h5 className="font-medium text-sm">{schedule.name}</h5>
                    <p className="text-xs text-muted-foreground font-mono">
                      {schedule.cron_expression}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">{nextRun}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {schedule.enabled ? 'Active' : 'Paused'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {total > schedules.length && (
        <div className="px-4 py-2 border-t bg-muted/20">
          <button
            onClick={() => onAction?.('view_all_schedules', {})}
            className="text-xs text-primary hover:underline"
          >
            View all {total} schedules
          </button>
        </div>
      )}
    </motion.div>
  );
});

export default ScheduleCard;
