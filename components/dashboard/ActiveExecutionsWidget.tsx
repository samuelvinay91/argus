'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Play, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TestRun } from '@/lib/supabase/types';

interface ActiveExecutionsWidgetProps {
  executions: TestRun[];
  isLoading?: boolean;
}

export function ActiveExecutionsWidget({
  executions,
  isLoading = false,
}: ActiveExecutionsWidgetProps) {
  const router = useRouter();
  const activeExecutions = executions.filter(
    (e) => e.status === 'running' || e.status === 'pending'
  );

  // Handle navigation with explicit router.push to avoid React 18 transition delays
  const handleNavigation = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    router.push(href);
  };

  const getProgress = (execution: TestRun): number => {
    if (execution.total_tests === 0) return 0;
    const completed = execution.passed_tests + execution.failed_tests + execution.skipped_tests;
    return Math.round((completed / execution.total_tests) * 100);
  };

  const getElapsedTime = (execution: TestRun): string => {
    if (!execution.started_at) return 'Starting...';
    return formatDistanceToNow(new Date(execution.started_at), { addSuffix: false });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              Active Executions
            </CardTitle>
            <CardDescription>
              {activeExecutions.length} {activeExecutions.length === 1 ? 'test' : 'tests'} running
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/tests" onClick={(e) => handleNavigation(e, '/tests')}>
              View All
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="p-3 rounded-lg border bg-muted/30 animate-pulse">
                <div className="h-4 w-32 bg-muted rounded mb-2" />
                <div className="h-2 w-full bg-muted rounded mb-2" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : activeExecutions.length === 0 ? (
          <div className="py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Play className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">No active executions</p>
            <p className="text-xs text-muted-foreground">
              Run a test to see live progress here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeExecutions.map((execution) => {
              const progress = getProgress(execution);
              const isPending = execution.status === 'pending';

              return (
                <Link
                  key={execution.id}
                  href={`/tests/${execution.id}`}
                  onClick={(e) => handleNavigation(e, `/tests/${execution.id}`)}
                  className="block p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isPending ? (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin text-info" />
                      )}
                      <span className="font-medium truncate">
                        {execution.name || 'Test Run'}
                      </span>
                    </div>
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      isPending ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info'
                    )}>
                      {isPending ? 'Pending' : 'Running'}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        isPending ? 'bg-warning/50' : 'bg-info'
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {execution.passed_tests + execution.failed_tests} / {execution.total_tests} tests
                    </span>
                    <span>{getElapsedTime(execution)}</span>
                  </div>

                  {/* Test counts */}
                  {!isPending && (execution.passed_tests > 0 || execution.failed_tests > 0) && (
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      {execution.passed_tests > 0 && (
                        <span className="text-success flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-success" />
                          {execution.passed_tests} passed
                        </span>
                      )}
                      {execution.failed_tests > 0 && (
                        <span className="text-error flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-error" />
                          {execution.failed_tests} failed
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ActiveExecutionsWidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-5 w-36 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-9 w-20 bg-muted animate-pulse rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="p-3 rounded-lg border">
              <div className="h-4 w-32 bg-muted animate-pulse rounded mb-2" />
              <div className="h-2 w-full bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
