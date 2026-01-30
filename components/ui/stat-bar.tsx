'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * StatBar - Horizontal scrolling stats for mobile
 *
 * Displays a row of stat items that:
 * - Scroll horizontally on mobile
 * - Wrap to multiple lines on desktop
 * - Support trends and icons
 */

export interface StatItem {
  /** Stat label */
  label: string;
  /** Stat value */
  value: string | number;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Optional trend indicator */
  trend?: 'up' | 'down' | 'neutral';
  /** Optional trend value (e.g., "+5%") */
  trendValue?: string;
  /** Color variant */
  color?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export interface StatBarProps {
  /** Array of stats to display */
  stats: StatItem[];
  /** Visual variant */
  variant?: 'pills' | 'compact' | 'cards';
  /** Additional className */
  className?: string;
}

const colorClasses = {
  default: {
    bg: 'bg-muted/50',
    text: 'text-foreground',
    trend: 'text-muted-foreground',
  },
  success: {
    bg: 'bg-success/10',
    text: 'text-success',
    trend: 'text-success',
  },
  warning: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    trend: 'text-warning',
  },
  error: {
    bg: 'bg-error/10',
    text: 'text-error',
    trend: 'text-error',
  },
  info: {
    bg: 'bg-info/10',
    text: 'text-info',
    trend: 'text-info',
  },
} as const;

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'neutral' }) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-3 w-3" />;
    case 'down':
      return <TrendingDown className="h-3 w-3" />;
    default:
      return <Minus className="h-3 w-3" />;
  }
}

export function StatBar({ stats, variant = 'pills', className }: StatBarProps) {
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 overflow-x-auto pb-2 -mb-2 scrollbar-hide',
          'sm:flex-wrap sm:overflow-visible sm:pb-0 sm:mb-0',
          className
        )}
      >
        {stats.map((stat, index) => {
          const colors = colorClasses[stat.color || 'default'];
          return (
            <React.Fragment key={stat.label}>
              {index > 0 && (
                <div className="h-4 w-px bg-border flex-shrink-0 hidden sm:block" />
              )}
              <div className="flex items-center gap-2 flex-shrink-0">
                {stat.icon && (
                  <span className={cn('h-4 w-4', colors.text)}>{stat.icon}</span>
                )}
                <span className={cn('font-medium text-sm', colors.text)}>
                  {stat.value}
                </span>
                <span className="text-xs text-muted-foreground hidden lg:inline">
                  {stat.label}
                </span>
                {stat.trend && (
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-xs',
                      stat.trend === 'up' && 'text-success',
                      stat.trend === 'down' && 'text-error',
                      stat.trend === 'neutral' && 'text-muted-foreground'
                    )}
                  >
                    <TrendIcon trend={stat.trend} />
                    {stat.trendValue}
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div
        className={cn(
          'flex gap-3 overflow-x-auto pb-2 -mb-2 scrollbar-hide',
          'sm:grid sm:grid-cols-2 md:grid-cols-4 sm:overflow-visible sm:pb-0 sm:mb-0',
          className
        )}
      >
        {stats.map((stat) => {
          const colors = colorClasses[stat.color || 'default'];
          return (
            <div
              key={stat.label}
              className={cn(
                'flex-shrink-0 min-w-[140px] sm:min-w-0',
                'rounded-lg border bg-card p-3',
                'space-y-1'
              )}
            >
              <div className="flex items-center gap-2">
                {stat.icon && (
                  <span className={cn('h-4 w-4', colors.text)}>{stat.icon}</span>
                )}
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn('text-xl font-bold', colors.text)}>
                  {stat.value}
                </span>
                {stat.trend && stat.trendValue && (
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-xs',
                      stat.trend === 'up' && 'text-success',
                      stat.trend === 'down' && 'text-error',
                      stat.trend === 'neutral' && 'text-muted-foreground'
                    )}
                  >
                    <TrendIcon trend={stat.trend} />
                    {stat.trendValue}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Default: pills variant
  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-hide',
        'sm:flex-wrap sm:overflow-visible sm:pb-0 sm:mb-0',
        className
      )}
    >
      {stats.map((stat) => {
        const colors = colorClasses[stat.color || 'default'];
        return (
          <div
            key={stat.label}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full flex-shrink-0',
              colors.bg
            )}
          >
            {stat.icon && (
              <span className={cn('h-4 w-4', colors.text)}>{stat.icon}</span>
            )}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {stat.label}:
            </span>
            <span className={cn('text-sm font-medium whitespace-nowrap', colors.text)}>
              {stat.value}
            </span>
            {stat.trend && (
              <span
                className={cn(
                  'flex items-center gap-0.5',
                  stat.trend === 'up' && 'text-success',
                  stat.trend === 'down' && 'text-error',
                  stat.trend === 'neutral' && 'text-muted-foreground'
                )}
              >
                <TrendIcon trend={stat.trend} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
