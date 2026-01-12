'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Pause,
  Play,
  X,
  FileText,
  MousePointer,
  ArrowRight,
  FormInput,
  Clock,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import type { DiscoverySession, DiscoveredPage, DiscoveredFlow } from '@/lib/supabase/types';

// ============================================
// Types
// ============================================

interface DiscoveryStatus {
  sessionId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  currentPage?: string;
  pagesFound: number;
  elementsFound: number;
  flowsFound: number;
  formsFound: number;
  startedAt: string;
  estimatedTimeRemaining?: number; // seconds
  errors: string[];
}

interface DiscoveryResult {
  session: DiscoverySession;
  pages: DiscoveredPage[];
  flows: DiscoveredFlow[];
}

interface DiscoveryProgressProps {
  sessionId: string;
  onComplete?: (result: DiscoveryResult) => void;
  onError?: (error: string) => void;
}

interface ActivityLogEntry {
  id: string;
  message: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
}

// ============================================
// Helper Components
// ============================================

function StatCard({
  icon: Icon,
  value,
  label,
  animate = true,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  animate?: boolean;
}) {
  return (
    <motion.div
      className="flex flex-col items-center p-4 rounded-lg bg-muted/50 border"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Icon className="h-5 w-5 text-primary mb-2" />
      <div className="text-2xl font-bold tabular-nums">
        {animate ? (
          <AnimatedCounter value={value} duration={0.5} />
        ) : (
          value
        )}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function ActivityLogItem({ entry }: { entry: ActivityLogEntry }) {
  const iconMap = {
    info: <Compass className="h-3 w-3 text-primary" />,
    success: <CheckCircle className="h-3 w-3 text-green-500" />,
    warning: <AlertCircle className="h-3 w-3 text-yellow-500" />,
    error: <AlertCircle className="h-3 w-3 text-red-500" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-start gap-2 text-sm py-1"
    >
      <span className="mt-0.5">{iconMap[entry.type]}</span>
      <span className="text-muted-foreground flex-1">{entry.message}</span>
      <span className="text-xs text-muted-foreground/60 tabular-nums">
        {entry.timestamp.toLocaleTimeString()}
      </span>
    </motion.div>
  );
}

function ProgressBar({ progress, status }: { progress: number; status: DiscoveryStatus['status'] }) {
  const getBarColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
      case 'cancelled':
        return 'bg-red-500';
      case 'paused':
        return 'bg-yellow-500';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
      <motion.div
        className={cn('h-full rounded-full', getBarColor())}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {status === 'running' && (
          <motion.div
            className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: 'linear',
            }}
          />
        )}
      </motion.div>
    </div>
  );
}

function CompletionCelebration() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg z-10"
    >
      <motion.div
        className="text-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 0.6,
            repeat: 3,
          }}
        >
          <Sparkles className="h-8 w-8 text-green-500" />
        </motion.div>
        <h3 className="text-xl font-semibold text-green-500">Discovery Complete!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Your application has been analyzed successfully
        </p>
      </motion.div>
    </motion.div>
  );
}

function SkeletonLoader() {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-muted animate-pulse" />
          <div className="h-6 w-40 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 rounded bg-muted animate-pulse" />
          <div className="h-9 w-20 rounded bg-muted animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress bar skeleton */}
        <div className="space-y-2">
          <div className="h-3 w-full rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-36 rounded bg-muted animate-pulse" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center p-4 rounded-lg bg-muted/50 border">
              <div className="h-5 w-5 rounded bg-muted animate-pulse mb-2" />
              <div className="h-8 w-12 rounded bg-muted animate-pulse mb-1" />
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>

        {/* Activity log skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-5 w-full rounded bg-muted animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Component
// ============================================

function DiscoveryProgress({
  sessionId,
  onComplete,
  onError,
}: DiscoveryProgressProps) {
  const [status, setStatus] = useState<DiscoveryStatus | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const activityIdRef = useRef(0);

  const addActivityLog = useCallback((message: string, type: ActivityLogEntry['type'] = 'info') => {
    const entry: ActivityLogEntry = {
      id: `activity-${++activityIdRef.current}`,
      message,
      timestamp: new Date(),
      type,
    };
    setActivityLog((prev) => [entry, ...prev].slice(0, 10)); // Keep last 10 entries
  }, []);

  const formatTimeRemaining = (seconds: number | undefined): string => {
    if (!seconds || seconds <= 0) return '';
    if (seconds < 60) return `~${Math.round(seconds)} seconds remaining`;
    const minutes = Math.floor(seconds / 60);
    return `~${minutes} minute${minutes === 1 ? '' : 's'} remaining`;
  };

  // Connect to SSE endpoint
  useEffect(() => {
    const connectSSE = () => {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Use backend API URL for SSE streaming, fallback to relative path for Next.js API proxy
      const backendUrl = process.env.NEXT_PUBLIC_ARGUS_BACKEND_URL || '';
      const sseUrl = backendUrl
        ? `${backendUrl}/api/v1/discovery/sessions/${sessionId}/stream`
        : `/api/v1/discovery/sessions/${sessionId}/stream`;

      const eventSource = new EventSource(sseUrl);

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsLoading(false);
        setConnectionError(null);
        retryCountRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle different event types
          if (data.type === 'status') {
            setStatus(data.payload);

            // Add activity based on status changes
            if (data.payload.currentPage) {
              addActivityLog(`Crawling: ${data.payload.currentPage}`, 'info');
            }
          } else if (data.type === 'page_found') {
            addActivityLog(`Found page: ${data.payload.url}`, 'success');
          } else if (data.type === 'flow_found') {
            addActivityLog(`Identified flow: ${data.payload.name}`, 'success');
          } else if (data.type === 'form_found') {
            addActivityLog(`Detected form on ${data.payload.page}`, 'info');
          } else if (data.type === 'element_found') {
            // Batch element updates to avoid spam
            if (data.payload.count % 10 === 0) {
              addActivityLog(`Discovered ${data.payload.count} elements`, 'info');
            }
          } else if (data.type === 'error') {
            addActivityLog(data.payload.message, 'error');
          } else if (data.type === 'complete') {
            setStatus((prev) => prev ? { ...prev, status: 'completed', progress: 100 } : null);
            setShowCelebration(true);
            if (onComplete && data.payload.result) {
              onComplete(data.payload.result);
            }
            setTimeout(() => setShowCelebration(false), 3000);
          }
        } catch (err) {
          console.error('Failed to parse SSE event:', err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();

        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          setConnectionError(`Connection lost. Retrying... (${retryCountRef.current}/${maxRetries})`);
          setTimeout(connectSSE, 2000 * retryCountRef.current);
        } else {
          setConnectionError('Failed to connect to discovery stream. Please try again.');
          setIsLoading(false);
          onError?.('Failed to connect to discovery stream');
        }
      };
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [sessionId, onComplete, onError, addActivityLog]);

  // Fallback: Poll for status if SSE not available (for demo/testing)
  useEffect(() => {
    if (!status && !connectionError) {
      // Set initial demo status after loading
      const timer = setTimeout(() => {
        if (isLoading) {
          setStatus({
            sessionId,
            status: 'running',
            progress: 0,
            pagesFound: 0,
            elementsFound: 0,
            flowsFound: 0,
            formsFound: 0,
            startedAt: new Date().toISOString(),
            errors: [],
          });
          setIsLoading(false);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [sessionId, status, connectionError, isLoading]);

  // Helper to get the API base URL (backend or Next.js proxy)
  const getApiUrl = (endpoint: string) => {
    const backendUrl = process.env.NEXT_PUBLIC_ARGUS_BACKEND_URL || '';
    return backendUrl
      ? `${backendUrl}/api/v1/discovery${endpoint}`
      : `/api/v1/discovery${endpoint}`;
  };

  const handlePause = async () => {
    try {
      await fetch(getApiUrl(`/sessions/${sessionId}/pause`), {
        method: 'POST',
      });
      setStatus((prev) => prev ? { ...prev, status: 'paused' } : null);
      addActivityLog('Discovery paused', 'warning');
    } catch (error) {
      addActivityLog('Failed to pause discovery', 'error');
    }
  };

  const handleResume = async () => {
    try {
      await fetch(getApiUrl(`/sessions/${sessionId}/resume`), {
        method: 'POST',
      });
      setStatus((prev) => prev ? { ...prev, status: 'running' } : null);
      addActivityLog('Discovery resumed', 'info');
    } catch (error) {
      addActivityLog('Failed to resume discovery', 'error');
    }
  };

  const handleCancel = async () => {
    try {
      await fetch(getApiUrl(`/sessions/${sessionId}/cancel`), {
        method: 'POST',
      });
      setStatus((prev) => prev ? { ...prev, status: 'cancelled' } : null);
      addActivityLog('Discovery cancelled', 'warning');
    } catch (error) {
      addActivityLog('Failed to cancel discovery', 'error');
    }
  };

  // Loading state
  if (isLoading) {
    return <SkeletonLoader />;
  }

  // Error state
  if (connectionError && !status) {
    return (
      <Card className="border-red-500/50">
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Connection Error</h3>
          <p className="text-muted-foreground mb-4">{connectionError}</p>
          <Button onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No status yet
  if (!status) {
    return <SkeletonLoader />;
  }

  const isPaused = status.status === 'paused';
  const isRunning = status.status === 'running';
  const isCompleted = status.status === 'completed';
  const isFailed = status.status === 'failed';
  const isCancelled = status.status === 'cancelled';
  const isActive = isRunning || isPaused;

  return (
    <Card className="relative overflow-hidden">
      <AnimatePresence>
        {showCelebration && <CompletionCelebration />}
      </AnimatePresence>

      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <motion.div
            animate={isRunning ? { rotate: 360 } : {}}
            transition={{ duration: 2, repeat: isRunning ? Infinity : 0, ease: 'linear' }}
          >
            <Compass className={cn(
              'h-5 w-5',
              isCompleted && 'text-green-500',
              isFailed && 'text-red-500',
              isRunning && 'text-primary'
            )} />
          </motion.div>
          <span>
            {isCompleted ? 'Discovery Complete' :
             isFailed ? 'Discovery Failed' :
             isCancelled ? 'Discovery Cancelled' :
             isPaused ? 'Discovery Paused' :
             'Discovery in Progress'}
          </span>
          {isRunning && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-1" />
          )}
        </CardTitle>

        {isActive && (
          <div className="flex gap-2">
            {isPaused ? (
              <Button variant="outline" size="sm" onClick={handleResume}>
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handlePause}>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium tabular-nums">{Math.round(status.progress)}%</span>
          </div>
          <ProgressBar progress={status.progress} status={status.status} />

          {status.currentPage && isRunning && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-muted-foreground"
            >
              Currently crawling: <span className="text-foreground">{status.currentPage}</span>
            </motion.p>
          )}

          {status.estimatedTimeRemaining && isActive && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeRemaining(status.estimatedTimeRemaining)}
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={FileText}
            value={status.pagesFound}
            label="Pages"
          />
          <StatCard
            icon={MousePointer}
            value={status.elementsFound}
            label="Elements"
          />
          <StatCard
            icon={ArrowRight}
            value={status.flowsFound}
            label="Flows"
          />
          <StatCard
            icon={FormInput}
            value={status.formsFound}
            label="Forms"
          />
        </div>

        {/* Errors */}
        {status.errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Errors ({status.errors.length})
            </h4>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {status.errors.map((error, index) => (
                <p key={index} className="text-sm text-red-400 bg-red-500/10 px-2 py-1 rounded">
                  {error}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Activity Log */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Recent Activity</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {activityLog.length > 0 ? (
                activityLog.map((entry) => (
                  <ActivityLogItem key={entry.id} entry={entry} />
                ))
              ) : (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-muted-foreground/60 py-2"
                >
                  Waiting for activity...
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Connection warning */}
        {connectionError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-2 text-sm text-yellow-500 bg-yellow-500/10 px-3 py-2 rounded"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {connectionError}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export { DiscoveryProgress, type DiscoveryStatus, type DiscoveryProgressProps };
