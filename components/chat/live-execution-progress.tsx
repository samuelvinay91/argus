'use client';

import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Brain,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  MousePointer2,
  Type,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  RefreshCw,
  ImageIcon,
  Compass,
  TestTube,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useActivityStream,
  useActiveSessions,
  type ActivityLog,
  type LiveSession,
  type ConnectionStatus,
} from '@/lib/hooks/use-live-session';

interface LiveExecutionProgressProps {
  projectId: string | null;
  onSessionClick?: (session: LiveSession) => void;
  className?: string;
}

// Get icon for activity type
function getActivityIcon(activityType: string) {
  switch (activityType) {
    case 'discovery':
      return Compass;
    case 'visual_test':
      return Eye;
    case 'test_run':
      return TestTube;
    case 'quality_audit':
      return Shield;
    default:
      return Activity;
  }
}

// Get icon for event type
function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'started':
      return Activity;
    case 'step':
      return CheckCircle2;
    case 'thinking':
      return Brain;
    case 'action':
      return MousePointer2;
    case 'screenshot':
      return ImageIcon;
    case 'error':
      return XCircle;
    case 'completed':
      return CheckCircle2;
    default:
      return Activity;
  }
}

// Get color for event type
function getEventColor(eventType: string) {
  switch (eventType) {
    case 'started':
      return 'text-info';
    case 'step':
      return 'text-success';
    case 'thinking':
      return 'text-primary';
    case 'action':
      return 'text-blue-500';
    case 'screenshot':
      return 'text-muted-foreground';
    case 'error':
      return 'text-error';
    case 'completed':
      return 'text-success';
    default:
      return 'text-muted-foreground';
  }
}

// Connection status badge
function ConnectionBadge({
  status,
  onReconnect,
}: {
  status: ConnectionStatus;
  onReconnect?: () => void;
}) {
  type ConfigType = {
    icon: typeof Wifi;
    color: string;
    bg: string;
    label: string;
    animate?: boolean;
  };

  const configs: Record<ConnectionStatus, ConfigType> = {
    connected: { icon: Wifi, color: 'text-success', bg: 'bg-success/10', label: 'Live' },
    connecting: { icon: Loader2, color: 'text-info', bg: 'bg-info/10', label: 'Connecting', animate: true },
    reconnecting: { icon: RefreshCw, color: 'text-warning', bg: 'bg-warning/10', label: 'Reconnecting', animate: true },
    error: { icon: WifiOff, color: 'text-error', bg: 'bg-error/10', label: 'Disconnected' },
    disconnected: { icon: WifiOff, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Offline' },
  };

  const config = configs[status] || configs.disconnected;
  const Icon = config.icon;

  return (
    <button
      onClick={status === 'error' || status === 'disconnected' ? onReconnect : undefined}
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
        config.bg,
        (status === 'error' || status === 'disconnected') && onReconnect && 'hover:opacity-80 cursor-pointer'
      )}
    >
      <Icon className={cn('h-3 w-3', config.color, config.animate && 'animate-spin')} />
      <span className={config.color}>{config.label}</span>
    </button>
  );
}

// Single activity item
const ActivityItem = memo(function ActivityItem({ activity }: { activity: ActivityLog }) {
  const Icon = getEventIcon(activity.event_type);
  const color = getEventColor(activity.event_type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 py-1.5"
    >
      <Icon className={cn('h-3.5 w-3.5 mt-0.5 flex-shrink-0', color)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{activity.title}</p>
        {activity.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {activity.description}
          </p>
        )}
      </div>
    </motion.div>
  );
});

// Single session card
function SessionCard({
  session,
  onClick,
}: {
  session: LiveSession;
  onClick?: () => void;
}) {
  const { activities, connectionStatus, reconnect } = useActivityStream(session.id);
  const [isExpanded, setIsExpanded] = useState(true);

  const progress = session.total_steps > 0
    ? Math.round((session.completed_steps / session.total_steps) * 100)
    : activities.length > 0 ? Math.min(activities.length * 10, 95) : 5;

  const ActivityIcon = getActivityIcon(session.session_type);
  const latestActivity = activities[activities.length - 1];
  const recentActivities = activities.slice(-5);

  const sessionTypeLabels: Record<string, string> = {
    discovery: 'Discovery',
    visual_test: 'Visual Test',
    test_run: 'Test Run',
    quality_audit: 'Quality Audit',
    global_test: 'Global Test',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card border rounded-lg overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <ActivityIcon className="h-4 w-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-success rounded-full animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {sessionTypeLabels[session.session_type]}
            </p>
            <p className="text-xs text-muted-foreground">
              {session.current_step || 'Starting...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionBadge status={connectionStatus} onReconnect={reconnect} />
          <span className="text-xs font-medium text-primary">{progress}%</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-2 space-y-1 max-h-40 overflow-y-auto">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))
              ) : (
                <div className="flex items-center gap-2 py-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Starting session...</span>
                </div>
              )}
            </div>

            {/* Thinking indicator */}
            {latestActivity?.event_type === 'thinking' && (
              <div className="px-3 pb-3">
                <div className="flex items-start gap-2 p-2 bg-primary/5 rounded-md">
                  <Brain className="h-4 w-4 text-primary mt-0.5 animate-pulse" />
                  <p className="text-xs text-muted-foreground italic line-clamp-2">
                    {latestActivity.description}
                  </p>
                </div>
              </div>
            )}

            {/* View details button */}
            {onClick && (
              <div className="px-3 pb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Full Session
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Main component - shows all active sessions for a project
export function LiveExecutionProgress({
  projectId,
  onSessionClick,
  className,
}: LiveExecutionProgressProps) {
  const { data: activeSessions = [], isLoading } = useActiveSessions(projectId);

  // Filter to only active sessions
  const runningSessionsArray = activeSessions.filter(
    (s: LiveSession) => s.status === 'active'
  );

  if (!projectId || runningSessionsArray.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="h-3.5 w-3.5" />
        <span>{runningSessionsArray.length} active session{runningSessionsArray.length !== 1 ? 's' : ''}</span>
      </div>

      <AnimatePresence mode="popLayout">
        {runningSessionsArray.map((session: LiveSession) => (
          <SessionCard
            key={session.id}
            session={session}
            onClick={onSessionClick ? () => onSessionClick(session) : undefined}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Elapsed time display component
function ElapsedTime({ startTime }: { startTime: Date | null }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    const updateElapsed = () => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  if (!startTime) return null;

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}
    </span>
  );
}

// Step dot indicator component
function StepDots({
  total,
  current,
  status,
}: {
  total: number;
  current: number;
  status: 'running' | 'completed' | 'failed';
}) {
  // Limit visible dots to avoid overflow
  const maxDots = 8;
  const visibleDots = Math.min(total, maxDots);
  const showEllipsis = total > maxDots;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: visibleDots }).map((_, index) => {
        const stepIndex = index + 1;
        const isCompleted = stepIndex < current;
        const isCurrent = stepIndex === current;
        const isFailed = status === 'failed' && isCurrent;

        return (
          <motion.div
            key={index}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{
              scale: isCurrent ? 1.2 : 1,
              opacity: 1,
            }}
            className={cn(
              'w-1.5 h-1.5 rounded-full transition-colors',
              isCompleted && 'bg-success',
              isCurrent && !isFailed && 'bg-primary',
              isCurrent && isFailed && 'bg-error',
              !isCompleted && !isCurrent && 'bg-muted-foreground/30'
            )}
          >
            {isCurrent && status === 'running' && (
              <motion.div
                className="w-full h-full rounded-full bg-primary"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </motion.div>
        );
      })}
      {showEllipsis && (
        <span className="text-[10px] text-muted-foreground ml-0.5">+{total - maxDots}</span>
      )}
    </div>
  );
}

// Compact version for inline display in chat messages
export function CompactExecutionProgress({
  sessionId,
  className,
}: {
  sessionId: string;
  className?: string;
}) {
  const { activities, connectionStatus, isConnected } = useActivityStream(sessionId);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Track start time from first activity
  useEffect(() => {
    if (activities.length > 0 && !startTime) {
      setStartTime(new Date(activities[0].created_at));
    }
  }, [activities, startTime]);

  // Check if session completed
  useEffect(() => {
    const completedActivity = activities.find(
      (a) => a.event_type === 'completed' || a.event_type === 'error'
    );
    if (completedActivity) {
      setIsComplete(true);
    }
  }, [activities]);

  // Calculate steps - count 'step' type activities
  const stepActivities = activities.filter((a) => a.event_type === 'step');
  const totalSteps = Math.max(stepActivities.length, 5); // Minimum 5 steps for better UX
  const completedSteps = stepActivities.length;
  const currentStep = isComplete ? completedSteps : completedSteps + 1;

  const latestActivity = activities[activities.length - 1];

  // Calculate progress based on activities
  const progress = isComplete
    ? 100
    : Math.min(Math.max(activities.length * 8, 5), 95);

  const isSuccess = latestActivity?.event_type === 'completed';

  // Determine current status
  const status: 'running' | 'completed' | 'failed' = isComplete
    ? isSuccess
      ? 'completed'
      : 'failed'
    : 'running';

  // Get status label
  const getStatusLabel = () => {
    if (isComplete) {
      return isSuccess ? 'Completed' : 'Failed';
    }
    if (latestActivity?.event_type === 'thinking') {
      return 'Analyzing...';
    }
    if (latestActivity?.event_type === 'action') {
      return 'Executing...';
    }
    if (latestActivity?.event_type === 'screenshot') {
      return 'Capturing...';
    }
    return latestActivity?.title || 'Processing...';
  };

  // Get current action description
  const getCurrentAction = () => {
    if (isComplete) {
      return isSuccess
        ? `All ${completedSteps} step${completedSteps !== 1 ? 's' : ''} completed successfully`
        : latestActivity?.description || 'Test execution failed';
    }
    return latestActivity?.description || latestActivity?.title || 'Starting execution...';
  };

  return (
    <div className={cn('bg-muted/30 rounded-lg overflow-hidden', className)}>
      {/* Header section */}
      <div className="p-3 space-y-2">
        {/* Top row: Status and progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Status icon with animation */}
            <AnimatePresence mode="wait">
              {isComplete ? (
                isSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="error"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <XCircle className="h-4 w-4 text-error" />
                  </motion.div>
                )
              ) : (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status label */}
            <motion.span
              key={getStatusLabel()}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-medium"
            >
              {getStatusLabel()}
            </motion.span>
          </div>

          {/* Right side: Step counter and elapsed time */}
          <div className="flex items-center gap-3">
            {/* Step counter */}
            <motion.span
              className={cn(
                'text-xs font-medium px-1.5 py-0.5 rounded',
                isComplete
                  ? isSuccess
                    ? 'bg-success/10 text-success'
                    : 'bg-error/10 text-error'
                  : 'bg-primary/10 text-primary'
              )}
            >
              {isComplete ? `${completedSteps}/${completedSteps}` : `${currentStep}/${totalSteps}`}
            </motion.span>

            {/* Elapsed time */}
            <ElapsedTime startTime={startTime} />
          </div>
        </div>

        {/* Progress bar with gradient */}
        <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
          {/* Background shimmer for running state */}
          {!isComplete && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          )}
          {/* Progress fill */}
          <motion.div
            className={cn(
              'h-full rounded-full relative',
              isComplete
                ? isSuccess
                  ? 'bg-gradient-to-r from-success/80 to-success'
                  : 'bg-gradient-to-r from-error/80 to-error'
                : 'bg-gradient-to-r from-primary/80 to-primary'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        {/* Step dots */}
        {totalSteps <= 12 && (
          <div className="flex items-center justify-between">
            <StepDots total={totalSteps} current={currentStep} status={status} />
            <span className="text-[10px] text-muted-foreground">{progress}%</span>
          </div>
        )}
      </div>

      {/* Current action description */}
      <AnimatePresence mode="wait">
        <motion.div
          key={getCurrentAction()}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'px-3 pb-3 pt-0',
            isComplete && !isSuccess && 'bg-error/5'
          )}
        >
          <p className={cn(
            'text-xs line-clamp-2',
            isComplete
              ? isSuccess
                ? 'text-success/80'
                : 'text-error/80'
              : 'text-muted-foreground'
          )}>
            {getCurrentAction()}
          </p>

          {/* Show thinking indicator when AI is analyzing */}
          {!isComplete && latestActivity?.event_type === 'thinking' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 mt-1.5"
            >
              <Brain className="h-3 w-3 text-primary animate-pulse" />
              <span className="text-[10px] text-primary italic">
                {latestActivity.description?.slice(0, 50)}
                {(latestActivity.description?.length || 0) > 50 && '...'}
              </span>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Recent activity feed (compact, last 3) */}
      {!isComplete && activities.length > 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-t border-border/50 px-3 py-2 bg-muted/20"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">Recent activity</span>
          </div>
          <div className="space-y-1">
            {activities.slice(-3).map((activity, idx) => {
              const Icon = getEventIcon(activity.event_type);
              const color = getEventColor(activity.event_type);
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-1.5 text-[10px]"
                >
                  <Icon className={cn('h-2.5 w-2.5', color)} />
                  <span className="text-muted-foreground truncate">
                    {activity.title}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default LiveExecutionProgress;
