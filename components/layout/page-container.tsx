'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useSidebar } from './sidebar';

/**
 * PageContainer - Mobile-first page wrapper
 *
 * Provides consistent layout with:
 * - Sidebar offset (desktop only)
 * - Safe area padding for notched devices
 * - Optional sticky header
 * - Optional bottom nav spacing
 * - Max-width variants for content
 */

export interface PageContainerProps {
  children: React.ReactNode;
  /** Sticky header content */
  header?: React.ReactNode;
  /** Show bottom nav spacing on mobile */
  bottomNav?: boolean;
  /** Max width constraint for content */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Additional className for the main content area */
  className?: string;
  /** Additional className for the outer container */
  containerClassName?: string;
  /** Whether to apply default page padding */
  padding?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
} as const;

export function PageContainer({
  children,
  header,
  bottomNav = true,
  maxWidth = 'full',
  className,
  containerClassName,
  padding = true,
}: PageContainerProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div
      className={cn(
        'flex-1 flex flex-col min-h-screen',
        // Mobile: no sidebar offset
        // Desktop (lg+): offset by sidebar width
        'lg:transition-[margin-left] lg:duration-200',
        isCollapsed ? 'lg:ml-16' : 'lg:ml-64',
        containerClassName
      )}
    >
      {/* Sticky Header */}
      {header && (
        <header
          className={cn(
            'sticky top-0 z-40',
            'bg-background/80 backdrop-blur-sm',
            'border-b border-border',
            'safe-area-top'
          )}
        >
          <div
            className={cn(
              'mx-auto',
              maxWidthClasses[maxWidth],
              padding && 'px-4 sm:px-6 lg:px-8'
            )}
          >
            {header}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main
        className={cn(
          'flex-1',
          padding && 'page-padding',
          // Bottom nav spacing on mobile
          bottomNav && 'pb-20 lg:pb-8',
          className
        )}
      >
        <div
          className={cn(
            'mx-auto w-full',
            maxWidthClasses[maxWidth]
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * PageHeader - Consistent header layout for pages
 */
export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle/description */
  description?: string;
  /** Right-side actions */
  actions?: React.ReactNode;
  /** Additional className */
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 py-4',
        'sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-page-title">{title}</h1>
        {description && (
          <p className="text-caption">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * PageSection - Consistent section wrapper
 */
export interface PageSectionProps {
  children: React.ReactNode;
  /** Section title */
  title?: string;
  /** Optional description */
  description?: string;
  /** Right-side actions */
  actions?: React.ReactNode;
  /** Additional className */
  className?: string;
}

export function PageSection({
  children,
  title,
  description,
  actions,
  className,
}: PageSectionProps) {
  return (
    <section className={cn('section-spacing', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h2 className="text-section-title">{title}</h2>}
            {description && (
              <p className="text-caption mt-1">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
