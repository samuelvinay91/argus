'use client';

import React from 'react';
import Link from 'next/link';
import { safeFormatDistanceToNow, safeFormat } from '@/lib/utils';
import {
  ArrowLeft,
  ChevronRight,
  Play,
  Clock,
  Calendar,
  Webhook,
  GitBranch,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  Ban,
  Timer,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TestRun, Project } from '@/lib/supabase/types';
import type { ConnectionStatus } from '@/lib/hooks/useTestRunRealtime';

// CI Metadata interface for branch info
interface CIMetadata {
  branch?: string;
  commit?: string;
  pr_number?: number;
  pr_title?: string;
  repository?: string;
  workflow_name?: string;
  triggered_by_user?: string;
  [key: string]: unknown;
}

export interface TestRunHeaderProps {
  /** The test run data */
  testRun: TestRun;
  /** The project this test run belongs to */
  project: Project | null;
  /** Real-time connection status */
  connectionStatus?: ConnectionStatus;
  /** Callback to reconnect */
  onReconnect?: () => void;
  /** Optional className for the header */
  className?: string;
}

/**
 * Enhanced header component for test run detail pages.
 * Displays breadcrumb navigation, status badge, trigger info, branch, timestamp, and user.
 */
export function TestRunHeader({
  testRun,
  project,
  connectionStatus,
  onReconnect,
  className,
}: TestRunHeaderProps) {
  const ciMetadata = testRun.ci_metadata as CIMetadata | null;
  const branchName = ciMetadata?.branch;
  const triggeredByUser = ciMetadata?.triggered_by_user || testRun.triggered_by;

  return (
    <header className={cn('sticky top-0 z-30 border-b bg-background/80 backdrop-blur-sm', className)}>
      <div className="px-6 py-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Link href="/" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          {project ? (
            <>
              <Link
                href={`/projects/${project.id}`}
                className="hover:text-foreground transition-colors"
              >
                {project.name}
              </Link>
              <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            <>
              <span>Project</span>
              <ChevronRight className="h-4 w-4" />
            </>
          )}
          <span className="text-foreground font-medium">Test Run</span>
        </nav>

        {/* Title Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Button variant="ghost" size="sm" asChild>
              <Link href={project ? `/projects/${project.id}` : '/tests'}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>

            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold truncate">
                  {testRun.name || 'Test Run'}
                </h1>
                <StatusBadge status={testRun.status} />
              </div>

              {/* Metadata Row */}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                {/* Trigger Badge */}
                <TriggerBadge trigger={testRun.trigger} />

                {/* Branch Name (if from CI) */}
                {branchName && (
                  <div className="flex items-center gap-1.5">
                    <GitBranch className="h-4 w-4" />
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {branchName}
                    </code>
                  </div>
                )}

                {/* Timestamp */}
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span
                    title={testRun.started_at ? safeFormat(testRun.started_at, 'PPpp') : undefined}
                    suppressHydrationWarning
                  >
                    {testRun.started_at
                      ? safeFormatDistanceToNow(testRun.started_at, { addSuffix: true })
                      : 'Not started'}
                  </span>
                </div>

                {/* Duration */}
                {testRun.duration_ms && (
                  <div className="flex items-center gap-1.5">
                    <Timer className="h-4 w-4" />
                    <span>{formatDuration(testRun.duration_ms)}</span>
                  </div>
                )}

                {/* Triggered By User */}
                {triggeredByUser && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    <span>{triggeredByUser}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Connection Status Indicator */}
          {connectionStatus && (
            <ConnectionIndicator
              status={connectionStatus}
              onReconnect={onReconnect}
            />
          )}
        </div>
      </div>
    </header>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: TestRun['status'] }) {
  const config: Record<TestRun['status'], {
    icon: React.ComponentType<{ className?: string; size?: number }>;
    label: string;
    className: string;
    iconClassName?: string;
  }> = {
    pending: {
      icon: Clock,
      label: 'Pending',
      className: 'bg-muted text-muted-foreground',
    },
    running: {
      icon: Loader2,
      label: 'Running',
      className: 'bg-blue-500/10 text-blue-500',
      iconClassName: 'animate-spin',
    },
    passed: {
      icon: CheckCircle2,
      label: 'Passed',
      className: 'bg-success/10 text-success',
    },
    failed: {
      icon: XCircle,
      label: 'Failed',
      className: 'bg-error/10 text-error',
    },
    cancelled: {
      icon: Ban,
      label: 'Cancelled',
      className: 'bg-muted text-muted-foreground',
    },
  };

  const statusConfig = config[status] || config.pending;
  const { icon: Icon, label, className, iconClassName } = statusConfig;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
        className
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', iconClassName)} />
      {label}
    </span>
  );
}

// Trigger Badge Component
function TriggerBadge({ trigger }: { trigger: TestRun['trigger'] }) {
  const config = {
    manual: {
      icon: Play,
      label: 'Manual',
      className: 'bg-violet-500/10 text-violet-500',
    },
    scheduled: {
      icon: Calendar,
      label: 'Scheduled',
      className: 'bg-amber-500/10 text-amber-500',
    },
    webhook: {
      icon: Webhook,
      label: 'Webhook',
      className: 'bg-cyan-500/10 text-cyan-500',
    },
    ci: {
      icon: GitBranch,
      label: 'CI/CD',
      className: 'bg-green-500/10 text-green-500',
    },
  };

  const { icon: Icon, label, className } = config[trigger] || config.manual;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

// Connection Status Indicator
function ConnectionIndicator({
  status,
  onReconnect,
}: {
  status: ConnectionStatus;
  onReconnect?: () => void;
}) {
  const config: Record<ConnectionStatus, {
    icon: React.ComponentType<{ className?: string; size?: number }>;
    label: string;
    className: string;
    iconClassName?: string;
  }> = {
    connecting: {
      icon: Wifi,
      label: 'Connecting...',
      className: 'text-amber-500',
      iconClassName: 'animate-pulse',
    },
    connected: {
      icon: Wifi,
      label: 'Live',
      className: 'text-success',
    },
    disconnected: {
      icon: WifiOff,
      label: 'Offline',
      className: 'text-muted-foreground',
    },
    error: {
      icon: WifiOff,
      label: 'Connection Error',
      className: 'text-error',
    },
  };

  const statusConfig = config[status];
  const { icon: Icon, label, className, iconClassName } = statusConfig;

  if (status === 'error' && onReconnect) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onReconnect}
        className="border-error/50 text-error hover:bg-error/10"
      >
        <WifiOff className="h-4 w-4 mr-2" />
        Reconnect
      </Button>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5 text-sm', className)}>
      <Icon className={cn('h-4 w-4', iconClassName)} />
      <span>{label}</span>
      {status === 'connected' && (
        <span className="relative flex h-2 w-2 ml-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
        </span>
      )}
    </div>
  );
}

// Helper function to format duration
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export default TestRunHeader;
