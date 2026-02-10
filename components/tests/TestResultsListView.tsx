'use client';

import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  SkipForward,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TestResult } from '@/lib/supabase/types';

export interface TestResultsListViewProps {
  results: TestResult[];
  onResultClick?: (result: TestResult) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
type SortField = 'name' | 'status' | 'duration_ms' | 'steps' | 'created_at';
type SortDirection = 'asc' | 'desc';

const statusConfig: Record<TestStatus, { icon: React.ComponentType<{ className?: string; size?: number }>; color: string; label: string; order: number }> = {
  failed: {
    icon: XCircle,
    color: 'text-red-500',
    label: 'Failed',
    order: 1,
  },
  running: {
    icon: Loader2,
    color: 'text-blue-500',
    label: 'Running',
    order: 2,
  },
  pending: {
    icon: Clock,
    color: 'text-yellow-500',
    label: 'Pending',
    order: 3,
  },
  passed: {
    icon: CheckCircle2,
    color: 'text-green-500',
    label: 'Passed',
    order: 4,
  },
  skipped: {
    icon: SkipForward,
    color: 'text-muted-foreground',
    label: 'Skipped',
    order: 5,
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

interface SortableHeaderProps {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}

function SortableHeader({ label, field, currentSort, currentDirection, onSort, className }: SortableHeaderProps) {
  const isActive = currentSort === field;

  return (
    <th
      className={cn(
        'h-10 px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors',
        className
      )}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="ml-1">
          {isActive ? (
            currentDirection === 'asc' ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          )}
        </span>
      </div>
    </th>
  );
}

function StatusBadge({ status }: { status: TestStatus }) {
  const config = statusConfig[status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className={cn('flex items-center gap-1.5', config.color)}>
      <StatusIcon className={cn('h-4 w-4', status === 'running' && 'animate-spin')} />
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  );
}

function LoadingSkeleton({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <tr key={i} className="border-b">
          {Array.from({ length: columns }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-muted animate-pulse rounded" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function TestResultsListView({
  results,
  onResultClick,
  isLoading,
  emptyMessage = 'No test results found.',
  className,
}: TestResultsListViewProps) {
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          const statusA = statusConfig[a.status as TestStatus]?.order ?? 99;
          const statusB = statusConfig[b.status as TestStatus]?.order ?? 99;
          comparison = statusA - statusB;
          break;
        case 'duration_ms':
          const durationA = a.duration_ms ?? 0;
          const durationB = b.duration_ms ?? 0;
          comparison = durationA - durationB;
          break;
        case 'steps':
          const stepsA = a.steps_completed / (a.steps_total || 1);
          const stepsB = b.steps_completed / (b.steps_total || 1);
          comparison = stepsA - stepsB;
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [results, sortField, sortDirection]);

  return (
    <div className={cn('rounded-lg border bg-card overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <SortableHeader
                label="Name"
                field="name"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                className="min-w-[200px]"
              />
              <SortableHeader
                label="Status"
                field="status"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                className="w-[120px]"
              />
              <SortableHeader
                label="Duration"
                field="duration_ms"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                className="w-[100px]"
              />
              <SortableHeader
                label="Steps"
                field="steps"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                className="w-[100px]"
              />
              <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wider w-[100px]">
                Retries
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingSkeleton columns={5} />
            ) : sortedResults.length === 0 ? (
              <tr>
                <td colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center py-8">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedResults.map((result) => (
                <tr
                  key={result.id}
                  onClick={() => onResultClick?.(result)}
                  className={cn(
                    'border-b transition-colors last:border-0',
                    onResultClick && 'cursor-pointer hover:bg-muted/50'
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium truncate max-w-[300px]" title={result.name}>
                        {result.name}
                      </span>
                      {result.error_message && (
                        <span className="text-xs text-red-500 truncate max-w-[300px]" title={result.error_message}>
                          {result.error_message}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={result.status as TestStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(result.duration_ms)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {result.steps_total > 0 ? `${result.steps_completed}/${result.steps_total}` : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {result.retry_count > 0 ? (
                      <span className="text-sm text-amber-500">{result.retry_count}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
