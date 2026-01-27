'use client';

import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardWithTrendProps {
  /** Icon component to display */
  icon: React.ElementType;
  /** Label text for the stat */
  label: string;
  /** Current value to display (large number) */
  value: string;
  /** Delta from previous run (e.g., +2, -1, 0) */
  delta: number | null;
  /** Type of metric for proper coloring logic */
  metricType: 'positive-good' | 'negative-good' | 'neutral';
  /** Optional unit for the delta (e.g., '%', 'ms', 's') */
  deltaUnit?: string;
  /** Format the delta value for display */
  formatDelta?: (delta: number) => string;
  /** Whether comparison data is loading */
  isLoading?: boolean;
  /** Whether there is previous run data to compare against */
  hasPreviousRun?: boolean;
}

/**
 * Enhanced stat card that displays a current value with a trend indicator
 * showing the change from the previous run.
 *
 * Color logic:
 * - `positive-good`: Green when delta > 0, red when delta < 0 (e.g., passed tests, pass rate)
 * - `negative-good`: Green when delta < 0, red when delta > 0 (e.g., failed tests, duration)
 * - `neutral`: Always gray, no improvement/regression semantics
 */
export function StatCardWithTrend({
  icon: Icon,
  label,
  value,
  delta,
  metricType,
  deltaUnit = '',
  formatDelta,
  isLoading = false,
  hasPreviousRun = true,
}: StatCardWithTrendProps) {
  // Determine trend direction
  const getTrendDirection = (): 'up' | 'down' | 'neutral' | null => {
    if (delta === null || delta === 0) return delta === 0 ? 'neutral' : null;
    return delta > 0 ? 'up' : 'down';
  };

  // Determine if the change is an improvement based on metric type
  const isImprovement = (): boolean | null => {
    if (delta === null || delta === 0) return null;

    switch (metricType) {
      case 'positive-good':
        // Higher is better (e.g., passed tests, pass rate)
        return delta > 0;
      case 'negative-good':
        // Lower is better (e.g., failed tests, duration)
        return delta < 0;
      case 'neutral':
        return null;
      default:
        return null;
    }
  };

  const trendDirection = getTrendDirection();
  const improved = isImprovement();

  // Get the appropriate color class based on improvement status
  const getTrendColorClass = (): string => {
    if (improved === null || metricType === 'neutral') {
      return 'text-muted-foreground';
    }
    return improved ? 'text-success' : 'text-error';
  };

  // Get the trend icon
  const TrendIcon = trendDirection === 'up'
    ? ArrowUp
    : trendDirection === 'down'
      ? ArrowDown
      : Minus;

  // Format the delta value for display
  const formattedDelta = delta !== null
    ? (formatDelta ? formatDelta(delta) : `${delta > 0 ? '+' : ''}${delta}${deltaUnit}`)
    : null;

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">{value}</p>
            {/* Trend indicator */}
            {isLoading ? (
              <div className="flex items-center gap-1 text-muted-foreground">
                <div className="h-3 w-3 rounded-full bg-muted animate-pulse" />
                <span className="text-xs">...</span>
              </div>
            ) : hasPreviousRun && formattedDelta !== null ? (
              <div className={cn('flex items-center gap-0.5 text-sm', getTrendColorClass())}>
                <TrendIcon className="h-3.5 w-3.5" />
                <span className="font-medium">{formattedDelta}</span>
              </div>
            ) : !hasPreviousRun ? (
              <span className="text-xs text-muted-foreground">No previous run</span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper function to format duration deltas into human-readable strings.
 * Converts milliseconds to appropriate units (ms, s, m).
 */
export function formatDurationDelta(deltaMs: number): string {
  const absMs = Math.abs(deltaMs);
  const sign = deltaMs >= 0 ? '+' : '-';

  if (absMs < 1000) {
    return `${sign}${absMs}ms`;
  } else if (absMs < 60000) {
    const seconds = (absMs / 1000).toFixed(1);
    return `${sign}${seconds}s`;
  } else {
    const minutes = (absMs / 60000).toFixed(1);
    return `${sign}${minutes}m`;
  }
}

/**
 * Helper function to format percentage deltas.
 */
export function formatPercentageDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
}

export default StatCardWithTrend;
