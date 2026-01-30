'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Search, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { DataTable } from './data-table';
import { useIsMobile } from '@/hooks/use-media-query';
import { Card } from './card';

/**
 * ResponsiveTable - Cards on mobile, DataTable on desktop
 *
 * Automatically switches between a mobile-friendly card list
 * and a full desktop DataTable based on screen size.
 */

export interface ResponsiveTableProps<TData> {
  /** Table data */
  data: TData[];
  /** Column definitions for desktop DataTable */
  columns: ColumnDef<TData, unknown>[];
  /** Render function for mobile card view */
  mobileCard: (item: TData, index: number) => React.ReactNode;
  /** Breakpoint to switch at (default: 'md' = 768px) */
  breakpoint?: 'sm' | 'md';
  /** Key to search/filter by */
  searchKey?: string;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Row click handler */
  onRowClick?: (item: TData) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Additional className */
  className?: string;
  /** Get unique key for each item (for React keys) */
  getItemKey?: (item: TData, index: number) => string | number;
}

export function ResponsiveTable<TData>({
  data,
  columns,
  mobileCard,
  breakpoint = 'md',
  searchKey,
  searchPlaceholder = 'Search...',
  onRowClick,
  isLoading,
  emptyMessage = 'No results found.',
  className,
  getItemKey,
}: ResponsiveTableProps<TData>) {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = React.useState('');

  // Filter data based on search query (simple implementation)
  const filteredData = React.useMemo(() => {
    if (!searchQuery || !searchKey) return data;

    const query = searchQuery.toLowerCase();
    return data.filter((item) => {
      const value = (item as Record<string, unknown>)[searchKey];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(query);
      }
      return String(value).toLowerCase().includes(query);
    });
  }, [data, searchQuery, searchKey]);

  // Desktop: use DataTable
  if (!isMobile) {
    return (
      <DataTable
        data={data}
        columns={columns}
        searchKey={searchKey}
        searchPlaceholder={searchPlaceholder}
        onRowClick={onRowClick}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        className={className}
      />
    );
  }

  // Mobile: card list
  return (
    <div className={cn('space-y-4', className)}>
      {/* Search */}
      {searchKey && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-background"
          />
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {emptyMessage}
        </div>
      )}

      {/* Card list */}
      {!isLoading && filteredData.length > 0 && (
        <div className="space-y-3">
          {filteredData.map((item, index) => {
            const key = getItemKey ? getItemKey(item, index) : index;
            const card = mobileCard(item, index);

            if (onRowClick) {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onRowClick(item)}
                  className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                >
                  {card}
                </button>
              );
            }

            return <div key={key}>{card}</div>;
          })}
        </div>
      )}
    </div>
  );
}

/**
 * MobileCard - Pre-styled card for mobile table rows
 */
export interface MobileCardProps {
  /** Primary content (usually title) */
  title: React.ReactNode;
  /** Secondary content (subtitle/description) */
  subtitle?: React.ReactNode;
  /** Left side icon or avatar */
  leading?: React.ReactNode;
  /** Right side content (status, actions, chevron) */
  trailing?: React.ReactNode;
  /** Additional metadata shown below title */
  meta?: React.ReactNode;
  /** Whether to show a chevron indicating it's clickable */
  showChevron?: boolean;
  /** Additional className */
  className?: string;
}

export function MobileCard({
  title,
  subtitle,
  leading,
  trailing,
  meta,
  showChevron = false,
  className,
}: MobileCardProps) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start gap-3">
        {/* Leading icon/avatar */}
        {leading && (
          <div className="flex-shrink-0">{leading}</div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{title}</div>
              {subtitle && (
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {subtitle}
                </div>
              )}
            </div>

            {/* Trailing content */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {trailing}
              {showChevron && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Meta information */}
          {meta && (
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              {meta}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
