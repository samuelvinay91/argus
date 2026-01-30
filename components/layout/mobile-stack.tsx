'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * MobileStack - Vertical stacking layout with smart spacing
 *
 * Provides consistent vertical spacing with optional:
 * - Dividers between items
 * - Collapsible sections on mobile
 * - Responsive spacing
 */

export interface MobileStackProps {
  children: React.ReactNode;
  /** Spacing between items */
  spacing?: 'tight' | 'normal' | 'loose';
  /** Add dividers between items */
  dividers?: boolean;
  /** Additional className */
  className?: string;
  /** HTML element to render */
  as?: 'div' | 'ul' | 'section' | 'article';
}

const spacingClasses = {
  tight: 'space-y-2 sm:space-y-3',
  normal: 'space-y-3 sm:space-y-4',
  loose: 'space-y-4 sm:space-y-6',
} as const;

export function MobileStack({
  children,
  spacing = 'normal',
  dividers = false,
  className,
  as: Component = 'div',
}: MobileStackProps) {
  const childArray = React.Children.toArray(children).filter(Boolean);

  if (!dividers) {
    return (
      <Component className={cn(spacingClasses[spacing], className)}>
        {children}
      </Component>
    );
  }

  // With dividers, we need to wrap each child
  return (
    <Component className={cn('divide-y divide-border', className)}>
      {childArray.map((child, index) => (
        <div
          key={index}
          className={cn(
            index > 0 && spacing === 'tight' && 'pt-2 sm:pt-3',
            index > 0 && spacing === 'normal' && 'pt-3 sm:pt-4',
            index > 0 && spacing === 'loose' && 'pt-4 sm:pt-6',
            index < childArray.length - 1 && spacing === 'tight' && 'pb-2 sm:pb-3',
            index < childArray.length - 1 && spacing === 'normal' && 'pb-3 sm:pb-4',
            index < childArray.length - 1 && spacing === 'loose' && 'pb-4 sm:pb-6'
          )}
        >
          {child}
        </div>
      ))}
    </Component>
  );
}

/**
 * StackItem - Optional wrapper for stack items with additional features
 */
export interface StackItemProps {
  children: React.ReactNode;
  /** Optional label for the item */
  label?: string;
  /** Optional description below the label */
  description?: string;
  /** Right-side action or value */
  trailing?: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Additional className */
  className?: string;
  /** Whether this is a pressable item */
  pressable?: boolean;
}

export function StackItem({
  children,
  label,
  description,
  trailing,
  onClick,
  className,
  pressable = false,
}: StackItemProps) {
  const isInteractive = onClick || pressable;

  const content = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        {label && (
          <div className="text-sm font-medium text-foreground">{label}</div>
        )}
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {description}
          </div>
        )}
        {children && <div className="mt-2">{children}</div>}
      </div>
      {trailing && <div className="flex-shrink-0">{trailing}</div>}
    </div>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full text-left',
          'touch-target',
          'rounded-lg -mx-2 px-2 py-2',
          'hover:bg-muted/50 active:bg-muted',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

/**
 * CompactList - Optimized for mobile lists (settings, menus, etc.)
 */
export interface CompactListProps {
  children: React.ReactNode;
  /** Optional title above the list */
  title?: string;
  /** Additional className */
  className?: string;
}

export function CompactList({ children, title, className }: CompactListProps) {
  return (
    <div className={className}>
      {title && (
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
          {title}
        </h3>
      )}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <MobileStack spacing="tight" dividers>
          {children}
        </MobileStack>
      </div>
    </div>
  );
}
