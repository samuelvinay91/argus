'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Circle,
  ChevronDown,
  Clock,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import type { TestResult, Json } from '@/lib/supabase/types';

// Step result type based on the step_results JSON structure
interface StepResultItem {
  name?: string;
  instruction?: string;
  action?: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending' | 'running';
  duration_ms?: number;
  error?: string;
  error_message?: string;
}

export interface TestResultCardProps {
  result: TestResult;
  className?: string;
  defaultExpanded?: boolean;
}

// Format duration from milliseconds to human readable
function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

// Get status icon component
function StatusIcon({
  status,
  className
}: {
  status: string;
  className?: string;
}) {
  const iconClass = cn('h-4 w-4', className);

  switch (status) {
    case 'passed':
      return <CheckCircle2 className={cn(iconClass, 'text-success')} />;
    case 'failed':
      return <XCircle className={cn(iconClass, 'text-error')} />;
    case 'running':
      return <Loader2 className={cn(iconClass, 'text-info animate-spin')} />;
    case 'pending':
      return <Circle className={cn(iconClass, 'text-warning')} />;
    case 'skipped':
      return <Circle className={cn(iconClass, 'text-muted-foreground')} />;
    default:
      return <Circle className={cn(iconClass, 'text-muted-foreground')} />;
  }
}

// Get badge variant based on status
function getStatusBadgeVariant(status: string): 'success' | 'error' | 'warning' | 'info' | 'default' {
  switch (status) {
    case 'passed':
      return 'success';
    case 'failed':
      return 'error';
    case 'running':
      return 'info';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
}

// Parse step results from JSON
function parseStepResults(stepResults: Json): StepResultItem[] {
  if (!stepResults) return [];
  if (!Array.isArray(stepResults)) return [];

  return stepResults.map((step) => {
    if (typeof step !== 'object' || step === null) {
      return { status: 'pending' as const };
    }

    const s = step as Record<string, unknown>;
    return {
      name: (s.name || s.instruction || s.action || 'Step') as string,
      instruction: s.instruction as string | undefined,
      action: s.action as string | undefined,
      status: (s.status as StepResultItem['status']) || 'pending',
      duration_ms: s.duration_ms as number | undefined,
      error: (s.error || s.error_message) as string | undefined,
      error_message: s.error_message as string | undefined,
    };
  });
}

export function TestResultCard({
  result,
  className,
  defaultExpanded = false
}: TestResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const stepResults = parseStepResults(result.step_results);
  const hasSteps = stepResults.length > 0;

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Collapsed Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-3 p-4 text-left',
          'hover:bg-muted/50 transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
        )}
        aria-expanded={isExpanded}
        aria-controls={`step-details-${result.id}`}
      >
        {/* Status Icon */}
        <StatusIcon status={result.status} className="h-5 w-5 shrink-0" />

        {/* Test Name */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{result.name}</h3>
          {result.error_message && !isExpanded && (
            <p className="text-xs text-error truncate mt-0.5">
              {result.error_message}
            </p>
          )}
        </div>

        {/* Status Badge */}
        <Badge
          variant={getStatusBadgeVariant(result.status)}
          className="shrink-0"
        >
          {result.status}
        </Badge>

        {/* Duration */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Clock className="h-3 w-3" />
          <span>{formatDuration(result.duration_ms)}</span>
        </div>

        {/* Expand Button */}
        {hasSteps && (
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        )}
      </button>

      {/* Expanded Content - Step Details */}
      <div
        id={`step-details-${result.id}`}
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="border-t bg-muted/20">
          {/* Error Message (if any) */}
          {result.error_message && (
            <div className="px-4 py-3 bg-error/5 border-b border-error/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-error shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-error">Error</p>
                  <p className="text-xs text-error/80 mt-0.5 break-words">
                    {result.error_message}
                  </p>
                  {result.error_stack && (
                    <pre className="text-[10px] text-error/60 mt-2 overflow-x-auto whitespace-pre-wrap font-mono">
                      {result.error_stack}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step List */}
          {hasSteps ? (
            <div className="divide-y divide-border">
              {stepResults.map((step, index) => {
                const stepName = step.name || step.instruction || step.action || `Step ${index + 1}`;
                const isFailed = step.status === 'failed';

                return (
                  <div
                    key={index}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3',
                      isFailed && 'bg-error/5'
                    )}
                  >
                    {/* Step Number and Status */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground w-5 text-right">
                        {index + 1}.
                      </span>
                      <StatusIcon status={step.status} />
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm',
                        isFailed && 'text-error font-medium'
                      )}>
                        {stepName}
                      </p>

                      {/* Step Error */}
                      {step.error && (
                        <p className="text-xs text-error/80 mt-1 break-words">
                          {step.error}
                        </p>
                      )}
                    </div>

                    {/* Step Duration */}
                    {step.duration_ms !== undefined && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDuration(step.duration_ms)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-muted-foreground text-sm">
              No step details available
            </div>
          )}

          {/* Summary Footer */}
          <div className="px-4 py-3 bg-muted/30 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {result.steps_completed} of {result.steps_total} steps completed
            </span>
            {result.retry_count > 0 && (
              <span>Retried {result.retry_count} time{result.retry_count > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default TestResultCard;
