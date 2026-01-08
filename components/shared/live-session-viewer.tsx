'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Minimize2, Activity, Brain, CheckCircle2, XCircle, Loader2, Image as ImageIcon, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useActivityStream, type ActivityLog, type LiveSession, type ConnectionStatus } from '@/lib/hooks/use-live-session';

interface LiveSessionViewerProps {
  session: LiveSession | null;
  onClose?: () => void;
  className?: string;
  minimizable?: boolean;
}

// Connection status indicator component
function ConnectionStatusIndicator({
  status,
  onReconnect
}: {
  status: ConnectionStatus;
  onReconnect?: () => void;
}) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return { icon: Wifi, color: 'text-success', bg: 'bg-success/10', label: 'Connected' };
      case 'connecting':
        return { icon: Loader2, color: 'text-info', bg: 'bg-info/10', label: 'Connecting...', animate: true };
      case 'reconnecting':
        return { icon: RefreshCw, color: 'text-warning', bg: 'bg-warning/10', label: 'Reconnecting...', animate: true };
      case 'error':
        return { icon: WifiOff, color: 'text-error', bg: 'bg-error/10', label: 'Connection Error' };
      case 'disconnected':
      default:
        return { icon: WifiOff, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Disconnected' };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md text-xs', config.bg)}>
      <Icon className={cn('h-3 w-3', config.color, config.animate && 'animate-spin')} />
      <span className={config.color}>{config.label}</span>
      {(status === 'error' || status === 'disconnected') && onReconnect && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 ml-1"
          onClick={onReconnect}
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function LiveSessionViewer({
  session,
  onClose,
  className,
  minimizable = true,
}: LiveSessionViewerProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { activities, connectionStatus, reconnect } = useActivityStream(session?.id || null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new activities arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activities]);

  if (!session) return null;

  const progress = session.total_steps > 0
    ? Math.round((session.completed_steps / session.total_steps) * 100)
    : 0;

  const sessionTypeLabels: Record<string, string> = {
    discovery: 'Discovery',
    visual_test: 'Visual Test',
    test_run: 'Test Run',
    quality_audit: 'Quality Audit',
    global_test: 'Global Test',
  };

  // Minimized view
  if (isMinimized) {
    return (
      <div
        className={cn(
          'fixed bottom-4 right-4 z-50 bg-card border rounded-lg shadow-xl p-3 cursor-pointer hover:bg-muted/50 transition-colors',
          className
        )}
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="h-5 w-5 text-primary animate-pulse" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-success rounded-full" />
          </div>
          <div>
            <p className="text-sm font-medium">{sessionTypeLabels[session.session_type]}</p>
            <p className="text-xs text-muted-foreground">{progress}% complete</p>
          </div>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div
      className={cn(
        'bg-card border rounded-lg shadow-xl overflow-hidden',
        isFullscreen
          ? 'fixed inset-4 z-50'
          : 'fixed bottom-4 right-4 z-50 w-[500px] max-h-[600px]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="h-5 w-5 text-primary" />
            {session.status === 'active' && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-success rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-sm">
              Live Session: {sessionTypeLabels[session.session_type]}
            </h3>
            <p className="text-xs text-muted-foreground">
              {session.status === 'active' ? 'Recording...' : session.status}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionStatusIndicator status={connectionStatus} onReconnect={reconnect} />
          {minimizable && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={cn('flex', isFullscreen ? 'h-[calc(100%-60px)]' : 'h-[450px]')}>
        {/* Screenshot Panel */}
        <div className="flex-1 border-r bg-black/5 flex items-center justify-center p-4">
          {session.last_screenshot_url ? (
            <img
              src={session.last_screenshot_url}
              alt="Live screenshot"
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Waiting for screenshot...</p>
            </div>
          )}
        </div>

        {/* Activity Stream */}
        <div className="w-[200px] flex flex-col">
          <div className="px-3 py-2 border-b bg-muted/20">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Activity Stream
            </h4>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-2">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
            {activities.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin" />
                <p className="text-xs">Starting session...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-3 border-t bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Step {session.completed_steps}/{session.total_steps || '?'}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {session.current_step && (
          <p className="text-xs text-muted-foreground mt-2 truncate">
            {session.current_step}
          </p>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: ActivityLog }) {
  const getIcon = () => {
    switch (activity.event_type) {
      case 'started':
        return <Activity className="h-3 w-3 text-info" />;
      case 'step':
        return <CheckCircle2 className="h-3 w-3 text-success" />;
      case 'thinking':
        return <Brain className="h-3 w-3 text-primary animate-pulse" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-error" />;
      case 'completed':
        return <CheckCircle2 className="h-3 w-3 text-success" />;
      case 'screenshot':
        return <ImageIcon className="h-3 w-3 text-muted-foreground" />;
      default:
        return <Activity className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getBgColor = () => {
    switch (activity.event_type) {
      case 'thinking':
        return 'bg-primary/5 border-primary/20';
      case 'error':
        return 'bg-error/5 border-error/20';
      case 'completed':
        return 'bg-success/5 border-success/20';
      default:
        return 'bg-muted/30 border-transparent';
    }
  };

  return (
    <div className={cn('rounded-md border p-2 text-xs', getBgColor())}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{activity.title}</p>
          {activity.description && (
            <p className="text-muted-foreground mt-0.5 line-clamp-2">
              {activity.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Simplified inline viewer for embedding in pages
export function InlineLiveSession({
  session,
  className,
}: {
  session: LiveSession | null;
  className?: string;
}) {
  const { activities, connectionStatus, isReconnecting } = useActivityStream(session?.id || null);

  if (!session || session.status !== 'active') return null;

  const progress = session.total_steps > 0
    ? Math.round((session.completed_steps / session.total_steps) * 100)
    : 0;

  const latestActivity = activities[activities.length - 1];

  return (
    <div className={cn('bg-info/5 border border-info/20 rounded-lg p-4', className)}>
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <Loader2 className="h-5 w-5 text-info animate-spin" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">Processing...</p>
          <p className="text-xs text-muted-foreground">{session.current_step || 'Initializing'}</p>
        </div>
        <div className="flex items-center gap-2">
          {isReconnecting && (
            <span className="flex items-center gap-1 text-xs text-warning">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Reconnecting
            </span>
          )}
          <span className="text-sm font-medium text-info">{progress}%</span>
        </div>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-info transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {latestActivity && latestActivity.event_type === 'thinking' && (
        <div className="flex items-start gap-2 text-xs bg-primary/5 rounded-md p-2">
          <Brain className="h-4 w-4 text-primary mt-0.5 animate-pulse" />
          <p className="text-muted-foreground italic">
            &quot;{latestActivity.description}&quot;
          </p>
        </div>
      )}

      {connectionStatus === 'error' && (
        <div className="flex items-center gap-2 text-xs text-error mt-2 p-2 bg-error/5 rounded-md">
          <WifiOff className="h-3 w-3" />
          <span>Connection lost. Activity updates may be delayed.</span>
        </div>
      )}
    </div>
  );
}
