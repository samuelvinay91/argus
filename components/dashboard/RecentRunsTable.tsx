'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusDot, Badge } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import type { TestRun } from '@/lib/supabase/types';

interface RecentRunsTableProps {
  runs: TestRun[];
  isLoading?: boolean;
  limit?: number;
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function RecentRunsTable({
  runs,
  isLoading = false,
  limit = 10,
}: RecentRunsTableProps) {
  const router = useRouter();
  const displayedRuns = runs.slice(0, limit);

  // Handle navigation with explicit router.push to avoid React 18 transition delays
  const handleNavigation = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    router.push(href);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-error" />;
      case 'running':
        return (
          <div className="h-4 w-4 rounded-full border-2 border-info/30 border-t-info animate-spin" />
        );
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <MoreHorizontal className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
      passed: 'success',
      failed: 'error',
      running: 'info',
      pending: 'warning',
      cancelled: 'default',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-medium">Recent Test Runs</CardTitle>
          <CardDescription>Latest test execution history</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/reports" onClick={(e) => handleNavigation(e, '/reports')}>
            View All
            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-4 w-4 bg-muted animate-pulse rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-40 bg-muted animate-pulse rounded mb-1" />
                  <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-5 w-16 bg-muted animate-pulse rounded" />
                <div className="h-4 w-12 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : displayedRuns.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground mb-1">No test runs yet</p>
            <p className="text-xs text-muted-foreground">
              Run your first test to see results here
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {displayedRuns.map((run) => {
              const passRate = run.total_tests > 0
                ? Math.round((run.passed_tests / run.total_tests) * 100)
                : 0;

              return (
                <Link
                  key={run.id}
                  href={`/tests/${run.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors group"
                >
                  {getStatusIcon(run.status)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {run.name || 'Test Run'}
                      </span>
                      {run.trigger !== 'manual' && (
                        <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                          {run.trigger}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                      </span>
                      <span className="text-border">|</span>
                      <span>{run.browser}</span>
                    </div>
                  </div>

                  {/* Test counts */}
                  <div className="flex items-center gap-4 text-sm">
                    {run.status !== 'pending' && run.status !== 'running' && (
                      <>
                        <span className="text-success flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {run.passed_tests}
                        </span>
                        {run.failed_tests > 0 && (
                          <span className="text-error flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5" />
                            {run.failed_tests}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Progress bar for completed runs */}
                  {run.status !== 'pending' && run.status !== 'running' && (
                    <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-success transition-all duration-300"
                        style={{ width: `${passRate}%` }}
                      />
                    </div>
                  )}

                  {/* Duration */}
                  <div className="text-sm text-muted-foreground w-16 text-right">
                    {formatDuration(run.duration_ms)}
                  </div>

                  {/* Status badge */}
                  {getStatusBadge(run.status)}

                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              );
            })}
          </div>
        )}

        {runs.length > limit && (
          <div className="px-6 py-3 border-t">
            <Button variant="ghost" size="sm" className="w-full" asChild>
              <Link href="/reports" onClick={(e) => handleNavigation(e, '/reports')}>
                View all {runs.length} runs
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentRunsTableSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="h-5 w-36 bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-9 w-20 bg-muted animate-pulse rounded-md" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-4 w-4 bg-muted animate-pulse rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-40 bg-muted animate-pulse rounded mb-1" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-5 w-16 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
