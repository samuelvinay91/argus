'use client';

import { cn } from '@/lib/utils';

/**
 * Base skeleton block component
 */
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      aria-hidden="true"
    />
  );
}

/**
 * Dashboard page skeleton with stats cards and chart
 */
export function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen" role="status" aria-label="Loading dashboard">
      {/* Sidebar placeholder */}
      <div className="hidden lg:block w-64 border-r bg-background" />

      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
          <Skeleton className="h-8 w-48" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-24" />
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-6 rounded-lg border bg-card">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="p-6 rounded-lg border bg-card">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>

          {/* Table */}
          <div className="p-6 rounded-lg border bg-card">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 flex-1 max-w-[200px]" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Table page skeleton (projects, tests, etc.)
 */
export function TableSkeleton() {
  return (
    <div className="flex min-h-screen" role="status" aria-label="Loading table">
      <div className="hidden lg:block w-64 border-r bg-background" />

      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
          <Skeleton className="h-8 w-32" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </header>

        <div className="p-6">
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Table header */}
          <div className="rounded-lg border">
            <div className="flex items-center gap-4 p-4 border-b bg-muted/50">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24 ml-auto" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>

            {/* Table rows */}
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 border-b last:border-0"
              >
                <Skeleton className="h-4 w-4" />
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div>
                    <Skeleton className="h-4 w-48 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </div>
      </main>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Settings page skeleton
 */
export function SettingsSkeleton() {
  return (
    <div className="flex min-h-screen" role="status" aria-label="Loading settings">
      <div className="hidden lg:block w-64 border-r bg-background" />

      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
          <div>
            <Skeleton className="h-6 w-24 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-28 ml-auto" />
        </header>

        <div className="p-6">
          <div className="flex gap-6">
            {/* Sidebar */}
            <div className="w-56 space-y-1">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="rounded-lg border p-6">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64 mb-6" />

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-8 w-28" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>

                  <div>
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Card grid skeleton (for visual testing, reports, etc.)
 */
export function CardGridSkeleton() {
  return (
    <div className="flex min-h-screen" role="status" aria-label="Loading content">
      <div className="hidden lg:block w-64 border-r bg-background" />

      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
          <Skeleton className="h-8 w-40" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-32" />
          </div>
        </header>

        <div className="p-6">
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <Skeleton className="h-40 w-full mb-4 rounded" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Detail page skeleton (single project/test view)
 */
export function DetailSkeleton() {
  return (
    <div className="flex min-h-screen" role="status" aria-label="Loading details">
      <div className="hidden lg:block w-64 border-r bg-background" />

      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-8 w-64" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Title and status */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div>
              <Skeleton className="h-7 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full ml-auto" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg border">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>

          {/* Content area */}
          <div className="rounded-lg border p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 p-4 bg-muted/30 rounded">
                  <Skeleton className="h-8 w-8" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-full max-w-md" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Organizations page skeleton
 */
export function OrganizationsSkeleton() {
  return (
    <div className="flex min-h-screen" role="status" aria-label="Loading organizations">
      <div className="hidden lg:block w-64 border-r bg-background" />

      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-40 ml-auto" />
        </header>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div>
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-full mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 flex-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
