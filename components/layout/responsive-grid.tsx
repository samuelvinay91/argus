'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * ResponsiveGrid - Mobile-first adaptive grid layout
 *
 * Provides a grid that automatically adjusts columns based on breakpoints.
 * Uses CSS Grid for consistent gutters and alignment.
 */

type ColumnCount = 1 | 2 | 3 | 4 | 5 | 6;

export interface ResponsiveGridProps {
  children: React.ReactNode;
  /** Column counts at each breakpoint */
  cols?: {
    base?: ColumnCount;
    xs?: ColumnCount;
    sm?: ColumnCount;
    md?: ColumnCount;
    lg?: ColumnCount;
    xl?: ColumnCount;
  };
  /** Gap between grid items */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
  /** HTML element to render */
  as?: 'div' | 'ul' | 'section';
}

const colClasses: Record<ColumnCount, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

const xsColClasses: Record<ColumnCount, string> = {
  1: 'xs:grid-cols-1',
  2: 'xs:grid-cols-2',
  3: 'xs:grid-cols-3',
  4: 'xs:grid-cols-4',
  5: 'xs:grid-cols-5',
  6: 'xs:grid-cols-6',
};

const smColClasses: Record<ColumnCount, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
  6: 'sm:grid-cols-6',
};

const mdColClasses: Record<ColumnCount, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
};

const lgColClasses: Record<ColumnCount, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

const xlColClasses: Record<ColumnCount, string> = {
  1: 'xl:grid-cols-1',
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
  5: 'xl:grid-cols-5',
  6: 'xl:grid-cols-6',
};

const gapClasses = {
  none: 'gap-0',
  sm: 'gap-3',
  md: 'gap-4 sm:gap-6',
  lg: 'gap-6 sm:gap-8',
} as const;

export function ResponsiveGrid({
  children,
  cols = { base: 1, sm: 2, lg: 3 },
  gap = 'md',
  className,
  as: Component = 'div',
}: ResponsiveGridProps) {
  const gridClasses = cn(
    'grid',
    gapClasses[gap],
    cols.base && colClasses[cols.base],
    cols.xs && xsColClasses[cols.xs],
    cols.sm && smColClasses[cols.sm],
    cols.md && mdColClasses[cols.md],
    cols.lg && lgColClasses[cols.lg],
    cols.xl && xlColClasses[cols.xl],
    className
  );

  return <Component className={gridClasses}>{children}</Component>;
}

/**
 * GridItem - Optional wrapper for grid items with span support
 */
export interface GridItemProps {
  children: React.ReactNode;
  /** Column span at each breakpoint */
  span?: {
    base?: 1 | 2 | 3 | 4 | 5 | 6 | 'full';
    sm?: 1 | 2 | 3 | 4 | 5 | 6 | 'full';
    md?: 1 | 2 | 3 | 4 | 5 | 6 | 'full';
    lg?: 1 | 2 | 3 | 4 | 5 | 6 | 'full';
  };
  /** Additional className */
  className?: string;
}

const spanClasses: Record<1 | 2 | 3 | 4 | 5 | 6 | 'full', string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  full: 'col-span-full',
};

const smSpanClasses: Record<1 | 2 | 3 | 4 | 5 | 6 | 'full', string> = {
  1: 'sm:col-span-1',
  2: 'sm:col-span-2',
  3: 'sm:col-span-3',
  4: 'sm:col-span-4',
  5: 'sm:col-span-5',
  6: 'sm:col-span-6',
  full: 'sm:col-span-full',
};

const mdSpanClasses: Record<1 | 2 | 3 | 4 | 5 | 6 | 'full', string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
  5: 'md:col-span-5',
  6: 'md:col-span-6',
  full: 'md:col-span-full',
};

const lgSpanClasses: Record<1 | 2 | 3 | 4 | 5 | 6 | 'full', string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
  full: 'lg:col-span-full',
};

export function GridItem({ children, span, className }: GridItemProps) {
  const itemClasses = cn(
    span?.base && spanClasses[span.base],
    span?.sm && smSpanClasses[span.sm],
    span?.md && mdSpanClasses[span.md],
    span?.lg && lgSpanClasses[span.lg],
    className
  );

  return <div className={itemClasses}>{children}</div>;
}
