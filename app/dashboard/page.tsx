'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  TestTube,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { PageContainer, PageHeader } from '@/components/layout';
import { ResponsiveGrid } from '@/components/layout/responsive-grid';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { Button } from '@/components/ui/button';
import {
  TestHealthChart,
  TestHealthChartSkeleton,
  ActiveExecutionsWidget,
  ActiveExecutionsWidgetSkeleton,
  RecentRunsTable,
  RecentRunsTableSkeleton,
  TeamActivityFeed,
  TeamActivityFeedSkeleton,
  QuickActions,
  QuickActionsSkeleton,
} from '@/components/dashboard';
import { DashboardHero, DashboardHeroSkeleton } from '@/components/dashboard/DashboardHero';
import type { ActivityItem, TestHealthDataPoint } from '@/components/dashboard';
import { useProjects } from '@/lib/hooks/use-projects';
import { useReportsStats, useRecentRuns } from '@/lib/hooks/use-reports';
import { useTests, useTestRuns, useTestRunSubscription, useRunTest } from '@/lib/hooks/use-tests';
import { useIsMobile } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import type { TestRunListItem } from '@/lib/api-client';
import type { LegacyTest } from '@/lib/hooks/use-tests';

function formatDuration(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export default function DashboardPage() {
  const { user } = useUser();
  const isMobile = useIsMobile();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(7);

  // Data fetching
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const currentProjectId = selectedProjectId || projects[0]?.id;
  const currentProject = projects.find((p) => p.id === currentProjectId);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useReportsStats(
    currentProjectId || null,
    selectedPeriod
  );
  const { data: recentRuns = [], isLoading: runsLoading } = useRecentRuns(
    currentProjectId || null,
    20
  );
  const { data: tests = [], isLoading: testsLoading } = useTests(currentProjectId || null);
  const { data: allTestRuns = [] } = useTestRuns(currentProjectId || null, 50);

  // Real-time subscription for test runs
  useTestRunSubscription(currentProjectId || null);

  // Run test mutation
  const runTestMutation = useRunTest();
  const isRunningTests = runTestMutation.isPending;

  // Auto-select first project
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const isLoading = projectsLoading || statsLoading || runsLoading || testsLoading;

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalTests = tests.length;
    const passRate = stats?.avgPassRate ?? 0;
    const avgDuration = stats?.avgDuration ?? 0;

    // Calculate flaky tests (tests that have both passed and failed in recent runs)
    const testResults = new Map<string, { passed: number; failed: number }>();
    recentRuns.forEach((run: TestRunListItem) => {
      if (run.passedTests > 0 || run.failedTests > 0) {
        const key = run.name || 'default';
        const current = testResults.get(key) || { passed: 0, failed: 0 };
        current.passed += run.passedTests;
        current.failed += run.failedTests;
        testResults.set(key, current);
      }
    });

    let flakyCount = 0;
    testResults.forEach((result) => {
      if (result.passed > 0 && result.failed > 0) {
        flakyCount++;
      }
    });

    return {
      totalTests,
      passRate,
      avgDuration,
      flakyTests: flakyCount,
    };
  }, [tests, stats, recentRuns]);

  // Prepare chart data
  const chartData: TestHealthDataPoint[] = useMemo(() => {
    if (!stats?.dailyStats) return [];
    return stats.dailyStats.map((day) => ({
      date: day.date,
      day: day.day,
      passed: day.passed,
      failed: day.failed,
      skipped: 0,
    }));
  }, [stats?.dailyStats]);

  // Generate activity feed from recent runs
  const activityItems: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    recentRuns.slice(0, 10).forEach((run: TestRunListItem) => {
      if (run.status === 'passed') {
        items.push({
          id: `${run.id}-passed`,
          type: 'test_passed',
          title: `Test run "${run.name || 'Test Run'}" passed`,
          description: `${run.passedTests} tests passed in ${formatDuration(run.durationMs || 0)}`,
          timestamp: run.completedAt || run.createdAt,
        });
      } else if (run.status === 'failed') {
        items.push({
          id: `${run.id}-failed`,
          type: 'test_failed',
          title: `Test run "${run.name || 'Test Run'}" failed`,
          description: `${run.failedTests} of ${run.totalTests} tests failed`,
          timestamp: run.completedAt || run.createdAt,
        });
      } else if (run.status === 'running') {
        items.push({
          id: `${run.id}-running`,
          type: 'test_run',
          title: `Test run "${run.name || 'Test Run'}" started`,
          description: `Running ${run.totalTests} tests`,
          timestamp: run.createdAt,
        });
      }
    });

    return items.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [recentRuns]);

  // Handle running all tests
  const handleRunAllTests = async () => {
    if (!currentProjectId || !currentProject || tests.length === 0) return;

    try {
      await runTestMutation.mutateAsync({
        projectId: currentProjectId,
        appUrl: currentProject.app_url,
        tests: tests as LegacyTest[],
        browser: 'chromium',
      });
      refetchStats();
    } catch (error) {
      console.error('Failed to run tests:', error);
    }
  };

  // No projects state
  if (!projectsLoading && projects.length === 0) {
    return (
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <PageContainer className="flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <TestTube className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2">
              Welcome to Skopaq
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mb-6">
              Get started by creating your first project to begin testing.
            </p>
            <Button asChild className="w-full sm:w-auto">
              <a href="/projects">Create Project</a>
            </Button>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <PageContainer>
        <div className="space-y-4 sm:space-y-6">
          {/* Dashboard Hero - Full width, responsive */}
          {isLoading ? (
            <DashboardHeroSkeleton />
          ) : (
            <DashboardHero
              userName={user?.firstName || user?.fullName || 'there'}
              qualityScore={Math.round(metrics.passRate)}
              trend={
                stats?.dailyStats && stats.dailyStats.length > 1
                  ? (stats.dailyStats[stats.dailyStats.length - 1]?.passed || 0) >=
                    (stats.dailyStats[0]?.passed || 0)
                    ? 'up'
                    : 'down'
                  : 'stable'
              }
              todayInsight={
                metrics.flakyTests > 0
                  ? `You have ${metrics.flakyTests} flaky tests that need attention. Consider reviewing them to improve test reliability.`
                  : metrics.passRate >= 90
                  ? 'Your test suite is performing excellently! Keep up the great work.'
                  : 'Focus on improving failing tests to boost your quality score.'
              }
              stats={{
                testsToday: recentRuns.filter(
                  (r) => new Date(r.createdAt).toDateString() === new Date().toDateString()
                ).length,
                passRate: Math.round(metrics.passRate),
                avgDuration: formatDuration((metrics.avgDuration || 0) * 1000),
                healedTests: 0,
              }}
            />
          )}

          {/* Project Selector Bar - Mobile optimized */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-card border">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={currentProjectId || ''}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className={cn(
                    'h-10 sm:h-9 w-full sm:w-auto rounded-md border bg-background px-3 pr-8 text-sm appearance-none cursor-pointer',
                    'focus:outline-none focus:ring-2 focus:ring-ring',
                    'touch-target'
                  )}
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              <span className="text-sm text-muted-foreground truncate hidden sm:inline">
                {currentProject ? currentProject.name : 'Select a project'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStats()}
              disabled={isLoading}
              className="h-10 sm:h-9 touch-target"
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {/* Main Grid - Stacks on mobile */}
          <ResponsiveGrid
            cols={{ xs: 1, lg: 3 }}
            gap="md"
            className="items-start"
          >
            {/* Left Column - Chart & Recent Runs (takes 2 cols on desktop) */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Test Health Chart */}
              <CollapsibleSection
                title="Test Health"
                mobileCollapsed={false}
                defaultOpen={true}
                className="rounded-xl border bg-card overflow-hidden"
                contentClassName="p-0"
              >
                {isLoading ? (
                  <div className="p-4">
                    <TestHealthChartSkeleton />
                  </div>
                ) : (
                  <TestHealthChart
                    data={chartData}
                    selectedPeriod={selectedPeriod}
                    onPeriodChange={setSelectedPeriod}
                    isLoading={statsLoading}
                  />
                )}
              </CollapsibleSection>

              {/* Recent Runs - Collapsible on mobile */}
              <CollapsibleSection
                title="Recent Runs"
                count={recentRuns.length}
                mobileCollapsed={true}
                defaultOpen={true}
                className="rounded-xl border bg-card overflow-hidden"
                contentClassName="p-0"
              >
                {isLoading ? (
                  <div className="p-4">
                    <RecentRunsTableSkeleton />
                  </div>
                ) : (
                  <RecentRunsTable
                    runs={recentRuns}
                    isLoading={runsLoading}
                    limit={isMobile ? 5 : 8}
                  />
                )}
              </CollapsibleSection>
            </div>

            {/* Right Column - Active Executions & Activity */}
            <div className="space-y-4 sm:space-y-6">
              {/* Active Executions */}
              <CollapsibleSection
                title="Active Executions"
                mobileCollapsed={true}
                defaultOpen={true}
                className="rounded-xl border bg-card overflow-hidden"
                contentClassName="p-0"
              >
                {isLoading ? (
                  <div className="p-4">
                    <ActiveExecutionsWidgetSkeleton />
                  </div>
                ) : (
                  <ActiveExecutionsWidget
                    executions={allTestRuns}
                    isLoading={runsLoading}
                  />
                )}
              </CollapsibleSection>

              {/* Team Activity - Collapsible on mobile */}
              <CollapsibleSection
                title="Recent Activity"
                count={activityItems.length}
                mobileCollapsed={true}
                defaultOpen={true}
                className="rounded-xl border bg-card overflow-hidden"
                contentClassName="p-0"
              >
                {isLoading ? (
                  <div className="p-4">
                    <TeamActivityFeedSkeleton />
                  </div>
                ) : (
                  <TeamActivityFeed
                    activities={activityItems}
                    isLoading={runsLoading}
                  />
                )}
              </CollapsibleSection>
            </div>
          </ResponsiveGrid>

          {/* Quick Actions - Full width */}
          {isLoading ? (
            <QuickActionsSkeleton />
          ) : (
            <QuickActions
              projectId={currentProjectId}
              onRunAllTests={handleRunAllTests}
              isRunning={isRunningTests}
            />
          )}
        </div>
      </PageContainer>
    </div>
  );
}
