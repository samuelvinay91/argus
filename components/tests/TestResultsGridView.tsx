'use client';

import { CheckCircle2, XCircle, Clock, Loader2, SkipForward, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TestResult } from '@/lib/supabase/types';

export interface TestResultsGridViewProps {
  results: TestResult[];
  onResultClick?: (result: TestResult) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

const statusConfig: Record<TestStatus, { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string; borderColor: string }> = {
  passed: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  running: {
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  pending: {
    icon: Clock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  skipped: {
    icon: SkipForward,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-muted',
  },
};

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function TestResultCard({ result, onClick }: { result: TestResult; onClick?: () => void }) {
  const status = result.status as TestStatus;
  const config = statusConfig[status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <Card
      className={cn(
        'p-4 transition-all cursor-pointer hover:shadow-md',
        config.borderColor,
        config.bgColor,
        'hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate" title={result.name}>
            {result.name}
          </h3>
          {result.error_message && (
            <p className="text-xs text-muted-foreground mt-1 truncate" title={result.error_message}>
              {result.error_message}
            </p>
          )}
        </div>
        <div className={cn('flex-shrink-0', config.color)}>
          <StatusIcon className={cn('h-5 w-5', status === 'running' && 'animate-spin')} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDuration(result.duration_ms)}</span>
        </div>
        {result.steps_total > 0 && (
          <div className="text-xs text-muted-foreground">
            {result.steps_completed}/{result.steps_total} steps
          </div>
        )}
        {result.retry_count > 0 && (
          <div className="flex items-center gap-1 text-xs text-amber-500">
            <AlertCircle className="h-3 w-3" />
            <span>{result.retry_count} retries</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
            </div>
            <div className="h-5 w-5 bg-muted animate-pulse rounded-full" />
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <div className="h-3 bg-muted animate-pulse rounded w-16" />
            <div className="h-3 bg-muted animate-pulse rounded w-12" />
          </div>
        </Card>
      ))}
    </>
  );
}

export function TestResultsGridView({
  results,
  onResultClick,
  isLoading,
  emptyMessage = 'No test results found.',
  className,
}: TestResultsGridViewProps) {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
        <LoadingSkeleton />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
      {results.map((result) => (
        <TestResultCard
          key={result.id}
          result={result}
          onClick={() => onResultClick?.(result)}
        />
      ))}
    </div>
  );
}
