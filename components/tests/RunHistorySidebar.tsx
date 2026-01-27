'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  History,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  ArrowLeftRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge, StatusDot } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import { useTestRunHistory, useTestRun } from '@/lib/hooks/use-tests';
import type { TestRun } from '@/lib/supabase/types';

export interface RunHistorySidebarProps {
  projectId: string | null;
  currentRunId: string | null;
  onCompare?: (runId: string) => void;
  className?: string;
}

// Format relative time with more natural language
function formatRelativeTime(date: string): string {
  const distance = formatDistanceToNow(new Date(date), { addSuffix: true });
  // Transform "about X hours ago" to "X hours ago"
  return distance.replace('about ', '');
}

// Single run item in the history list
function RunHistoryItem({
  run,
  isCurrent,
  onCompare,
}: {
  run: TestRun;
  isCurrent?: boolean;
  onCompare?: (runId: string) => void;
}) {
  const totalTests = run.total_tests || 0;
  const failedTests = run.failed_tests || 0;
  const passedTests = run.passed_tests || 0;

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-all',
        isCurrent
          ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
          : 'bg-card hover:bg-muted/50 border-border'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={run.status} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">
                {run.name || `Run ${run.id.slice(0, 8)}`}
              </span>
              {isCurrent && (
                <Badge variant="info" className="text-[10px] py-0 shrink-0">
                  Current
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5" suppressHydrationWarning>
              {formatRelativeTime(run.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 mt-2 text-xs">
        <span className="text-muted-foreground">
          {totalTests} test{totalTests !== 1 ? 's' : ''}
        </span>
        {passedTests > 0 && (
          <span className="text-success">{passedTests} passed</span>
        )}
        {failedTests > 0 && (
          <span className="text-error">{failedTests} failed</span>
        )}
      </div>

      {/* Compare button - only for non-current runs */}
      {!isCurrent && onCompare && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs w-full justify-between"
            onClick={() => onCompare(run.id)}
          >
            <span className="flex items-center gap-1.5">
              <ArrowLeftRight className="h-3 w-3" />
              Compare
            </span>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Loading skeleton for history items
function HistoryItemSkeleton() {
  return (
    <div className="p-3 rounded-lg border bg-card animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-muted" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-3 w-16 bg-muted rounded mt-1" />
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        <div className="h-3 w-12 bg-muted rounded" />
        <div className="h-3 w-12 bg-muted rounded" />
      </div>
    </div>
  );
}

// Desktop sidebar content
function SidebarContent({
  currentRun,
  historyRuns,
  isLoading,
  onCompare,
  projectId,
}: {
  currentRun: TestRun | null | undefined;
  historyRuns: TestRun[];
  isLoading: boolean;
  onCompare?: (runId: string) => void;
  projectId: string | null;
}) {
  return (
    <>
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4" />
          Run History
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Compare with previous test runs
        </p>
      </div>

      {/* Current run */}
      {currentRun && (
        <div className="p-4 border-b">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Current Run
          </p>
          <RunHistoryItem run={currentRun} isCurrent />
        </div>
      )}

      {/* Previous runs */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Previous Runs
        </p>

        {isLoading ? (
          <div className="space-y-2">
            <HistoryItemSkeleton />
            <HistoryItemSkeleton />
            <HistoryItemSkeleton />
          </div>
        ) : historyRuns.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No previous runs</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Run more tests to build history
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {historyRuns.map((run) => (
              <RunHistoryItem key={run.id} run={run} onCompare={onCompare} />
            ))}
          </div>
        )}
      </div>

      {/* View all history link */}
      {projectId && historyRuns.length > 0 && (
        <div className="p-4 border-t">
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
          >
            View All History
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
    </>
  );
}

export function RunHistorySidebar({
  projectId,
  currentRunId,
  onCompare,
  className,
}: RunHistorySidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Fetch current run details
  const { data: currentRun } = useTestRun(currentRunId);

  // Fetch history runs
  const { data: historyRuns = [], isLoading } = useTestRunHistory(
    projectId,
    currentRunId,
    10
  );

  // Mobile trigger button
  const MobileTrigger = (
    <Button
      variant="outline"
      size="sm"
      className="lg:hidden fixed bottom-4 right-4 z-40 shadow-lg"
      onClick={() => setIsMobileOpen(true)}
    >
      <History className="h-4 w-4 mr-2" />
      History
      {historyRuns.length > 0 && (
        <Badge variant="default" className="ml-2">
          {historyRuns.length}
        </Badge>
      )}
    </Button>
  );

  // Desktop sidebar
  const DesktopSidebar = (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-l bg-card transition-all duration-300',
        isCollapsed ? 'w-12' : 'w-80',
        className
      )}
    >
      {isCollapsed ? (
        // Collapsed state - just show toggle button
        <div className="flex flex-col items-center py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(false)}
            className="h-8 w-8 p-0"
            title="Expand history sidebar"
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
          <div className="mt-4 flex flex-col items-center gap-1">
            <History className="h-4 w-4 text-muted-foreground" />
            {historyRuns.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {historyRuns.length}
              </span>
            )}
          </div>
        </div>
      ) : (
        // Expanded state
        <>
          {/* Collapse button */}
          <div className="absolute top-3 right-3 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(true)}
              className="h-7 w-7 p-0"
              title="Collapse history sidebar"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>

          <SidebarContent
            currentRun={currentRun}
            historyRuns={historyRuns}
            isLoading={isLoading}
            onCompare={onCompare}
            projectId={projectId}
          />
        </>
      )}
    </aside>
  );

  // Mobile sheet
  const MobileSheet = (
    <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
      <SheetTrigger asChild>{MobileTrigger}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="sr-only">
          <SheetTitle>Run History</SheetTitle>
        </SheetHeader>
        <SidebarContent
          currentRun={currentRun}
          historyRuns={historyRuns}
          isLoading={isLoading}
          onCompare={(runId) => {
            onCompare?.(runId);
            setIsMobileOpen(false);
          }}
          projectId={projectId}
        />
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      {DesktopSidebar}
      {MobileSheet}
    </>
  );
}
