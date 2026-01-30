'use client';

import { useState, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { type ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import {
  Play,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Activity,
  Radio,
  Users,
  ChevronDown,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { PageContainer } from '@/components/layout';
import { StatBar, type StatItem } from '@/components/ui/stat-bar';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { SwipeableDrawer, DrawerContent } from '@/components/ui/swipeable-drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DataTable, StatusDot, Badge } from '@/components/ui/data-table';
import { LiveExecutionModal } from '@/components/tests/live-execution-modal';
import { RealtimeActivityFeed } from '@/components/activity/realtime-activity-feed';
import {
  useTests,
  useTestRuns,
  useCreateTest,
  useDeleteTest,
  useRunSingleTest,
  useTestRunSubscription,
} from '@/lib/hooks/use-tests';
import { useProjects, useCreateProject } from '@/lib/hooks/use-projects';
import { useRealtimeTests } from '@/hooks/use-realtime-tests';
import { useProjectPresence } from '@/hooks/use-presence';
import { useIsMobile, useIsDesktop } from '@/hooks/use-media-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Test, TestRun } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';

export default function TestsPage() {
  const { user } = useUser();
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();
  const [showNewTest, setShowNewTest] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [newTestSteps, setNewTestSteps] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectUrl, setNewProjectUrl] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [appUrl, setAppUrl] = useState('https://example.com');

  // Live execution modal state
  const [executionModalOpen, setExecutionModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);

  const supabase = getSupabaseClient();

  // Data fetching
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const currentProject = selectedProjectId || projects[0]?.id;
  const { data: tests = [], isLoading: testsLoading } = useTests(currentProject || null);
  const { data: recentRuns = [], isLoading: runsLoading } = useTestRuns(currentProject || null, 10);

  // Realtime subscriptions
  const { runningTests, isSubscribed: isRealtimeSubscribed } = useRealtimeTests({
    projectId: currentProject || undefined,
    enabled: !!currentProject,
  });

  // Presence tracking
  const { onlineUsers, isConnected: isPresenceConnected } = useProjectPresence(currentProject);

  // Mutations
  const createProject = useCreateProject();
  const createTest = useCreateTest();
  const deleteTest = useDeleteTest();
  const runTest = useRunSingleTest();

  // Real-time subscription (legacy, kept for compatibility)
  useTestRunSubscription(currentProject || null);

  // Stats with realtime data
  const stats = useMemo(() => {
    const passedRuns = recentRuns.filter((r) => r.status === 'passed').length;
    const failedRuns = recentRuns.filter((r) => r.status === 'failed').length;
    const passRate = recentRuns.length > 0 ? (passedRuns / recentRuns.length) * 100 : 0;
    const avgDuration = recentRuns.length > 0
      ? recentRuns.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / recentRuns.length / 1000
      : 0;

    return {
      totalTests: tests.length,
      passRate: passRate.toFixed(1),
      avgDuration: avgDuration.toFixed(1),
      recentRuns: recentRuns.length,
      runningCount: runningTests.length,
    };
  }, [tests, recentRuns, runningTests]);

  // Stats for StatBar component
  const statItems: StatItem[] = useMemo(() => [
    {
      label: 'Tests',
      value: stats.totalTests,
      icon: <Activity className="h-4 w-4" />,
    },
    {
      label: 'Pass Rate',
      value: `${stats.passRate}%`,
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: Number(stats.passRate) >= 80 ? 'success' : Number(stats.passRate) >= 50 ? 'warning' : 'error',
    },
    {
      label: 'Avg Duration',
      value: `${stats.avgDuration}s`,
      icon: <Clock className="h-4 w-4" />,
    },
    ...(stats.runningCount > 0 ? [{
      label: 'Running',
      value: stats.runningCount,
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      color: 'info' as const,
    }] : []),
  ], [stats]);

  // Handle create project
  const handleCreateProject = async () => {
    if (!newProjectName || !newProjectUrl) return;
    try {
      const project = await createProject.mutateAsync({
        name: newProjectName,
        slug: newProjectName.toLowerCase().replace(/\s+/g, '-'),
        app_url: newProjectUrl,
      });
      setSelectedProjectId(project.id);
      setAppUrl(newProjectUrl);
      setNewProjectName('');
      setNewProjectUrl('');
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  // Handle create test
  const handleCreateTest = async () => {
    if (!newTestName || !newTestSteps || !currentProject) return;
    const steps = newTestSteps
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((instruction) => ({ instruction }));

    try {
      await createTest.mutateAsync({
        project_id: currentProject,
        name: newTestName,
        description: `${steps.length} step test`,
        steps,
        created_by: user?.id || null,
      });
      setShowNewTest(false);
      setNewTestName('');
      setNewTestSteps('');
    } catch (error) {
      console.error('Failed to create test:', error);
    }
  };

  // Handle run test - opens live execution modal
  const handleRunTest = (test: Test) => {
    setSelectedTest(test);
    setExecutionModalOpen(true);
  };

  // Handle test execution complete - save results to Supabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleExecutionComplete = async (success: boolean, stepResults: any[]) => {
    if (!currentProject || !selectedTest) return;

    try {
      // Create test run record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: testRun, error: runError } = await (supabase.from('test_runs') as any)
        .insert({
          project_id: currentProject,
          app_url: appUrl,
          name: selectedTest.name,
          status: success ? 'passed' : 'failed',
          total_tests: 1,
          passed_tests: success ? 1 : 0,
          failed_tests: success ? 0 : 1,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (runError) throw runError;

      // Create test result record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('test_results') as any).insert({
        test_run_id: testRun.id,
        test_id: selectedTest.id,
        name: selectedTest.name,
        status: success ? 'passed' : 'failed',
        steps_total: stepResults.length,
        steps_completed: stepResults.filter(s => s.success).length,
        step_results: stepResults,
        completed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to save test results:', error);
    }
  };

  // Handle delete test
  const handleDeleteTest = async (testId: string) => {
    if (!currentProject) return;
    try {
      await deleteTest.mutateAsync({ testId, projectId: currentProject });
    } catch (error) {
      console.error('Failed to delete test:', error);
    }
  };

  // Table columns - simplified for mobile
  const columns: ColumnDef<Test>[] = [
    {
      accessorKey: 'name',
      header: 'Test Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">
              {Array.isArray(row.original.steps) ? row.original.steps.length : 0} steps
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => {
        const priority = row.original.priority;
        const variants: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
          critical: 'error',
          high: 'warning',
          medium: 'info',
          low: 'default',
        };
        return <Badge variant={variants[priority] || 'default'}>{priority}</Badge>;
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm" suppressHydrationWarning>
          {formatDistanceToNow(new Date(row.original.created_at), { addSuffix: true })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="h-9 px-3 touch-target"
            onClick={(e) => {
              e.stopPropagation();
              handleRunTest(row.original);
            }}
          >
            <Play className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Run</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive touch-target"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTest(row.original.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Mobile test card component
  const MobileTestCard = ({ test }: { test: Test }) => (
    <div className="p-4 rounded-xl border bg-card">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{test.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>{Array.isArray(test.steps) ? test.steps.length : 0} steps</span>
            <span>•</span>
            <Badge variant={test.priority === 'critical' ? 'error' : test.priority === 'high' ? 'warning' : 'default'} className="text-xs">
              {test.priority}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1" suppressHydrationWarning>
            Created {formatDistanceToNow(new Date(test.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Button
          className="flex-1 h-10 touch-target"
          onClick={() => handleRunTest(test)}
        >
          <Play className="h-4 w-4 mr-2" />
          Run Test
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 touch-target text-muted-foreground hover:text-destructive"
          onClick={() => handleDeleteTest(test.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // No project state
  if (!projectsLoading && projects.length === 0) {
    return (
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <PageContainer className="flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2">
              Create your first project
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mb-6">
              Projects represent the applications you want to test. Add a project to get started.
            </p>
            <div className="space-y-4">
              <Input
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="h-11 touch-target"
              />
              <Input
                placeholder="Application URL (e.g., https://myapp.com)"
                value={newProjectUrl}
                onChange={(e) => setNewProjectUrl(e.target.value)}
                className="h-11 touch-target"
              />
              <Button
                className="w-full h-11 touch-target"
                onClick={handleCreateProject}
                disabled={createProject.isPending || !newProjectName || !newProjectUrl}
              >
                {createProject.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Project
              </Button>
            </div>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <PageContainer padding={false}>
        {/* Mobile-optimized Header */}
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
          {/* Top row - Project selector and status */}
          <div className="px-4 py-3 flex items-center gap-3">
            {/* Project Selector */}
            <div className="relative flex-1 sm:flex-initial sm:min-w-[180px]">
              <select
                value={currentProject || ''}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  const project = projects.find((p) => p.id === e.target.value);
                  if (project) setAppUrl(project.app_url);
                }}
                className={cn(
                  'h-10 w-full rounded-md border bg-background px-3 pr-8 text-sm appearance-none cursor-pointer',
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

            {/* Status indicators */}
            <div className="flex items-center gap-2">
              <div className={cn(
                'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
                isRealtimeSubscribed ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
              )}>
                <Radio className="h-3 w-3" />
                <span className="hidden sm:inline">{isRealtimeSubscribed ? 'Live' : 'Offline'}</span>
              </div>

              {onlineUsers.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-info/10 text-info">
                  <Users className="h-3 w-3" />
                  <span>{onlineUsers.length}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <Button
              size="sm"
              variant={showActivityFeed ? 'default' : 'outline'}
              onClick={() => setShowActivityFeed(!showActivityFeed)}
              className="h-10 w-10 sm:w-auto sm:px-3 touch-target"
            >
              <Activity className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Activity</span>
            </Button>

            <Button size="sm" onClick={() => setShowNewTest(true)} className="h-10 touch-target">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Test</span>
            </Button>
          </div>

          {/* Stats Bar - horizontally scrollable on mobile */}
          <div className="px-4 pb-3">
            <StatBar stats={statItems} variant="compact" />
          </div>

          {/* App URL and Run All - only on larger screens or when expanded */}
          <div className="px-4 pb-3 flex items-center gap-3">
            <Input
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              placeholder="App URL"
              className="flex-1 h-10 touch-target text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (tests.length > 0 && currentProject) {
                  for (const test of tests) {
                    await handleRunTest(test);
                  }
                }
              }}
              disabled={runTest.isPending || tests.length === 0}
              className="h-10 touch-target whitespace-nowrap"
            >
              {runTest.isPending ? (
                <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">Run All</span>
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-4 space-y-4">
          {/* New Test Form */}
          {showNewTest && (
            <div className="p-4 rounded-xl border bg-card animate-fade-up">
              <h3 className="font-medium mb-4">Create New Test</h3>
              <div className="space-y-4">
                <Input
                  placeholder="Test name (e.g., User Login Flow)"
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  className="h-11 touch-target"
                />
                <Textarea
                  placeholder="Enter test steps, one per line:&#10;Navigate to login page&#10;Enter username&#10;Enter password&#10;Click Sign In"
                  value={newTestSteps}
                  onChange={(e) => setNewTestSteps(e.target.value)}
                  rows={5}
                  className="min-h-[120px]"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewTest(false)}
                    className="flex-1 sm:flex-none h-10 touch-target"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateTest}
                    disabled={createTest.isPending || !newTestName || !newTestSteps}
                    className="flex-1 sm:flex-none h-10 touch-target"
                  >
                    {createTest.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Create Test
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Running Tests Banner */}
          {runningTests.length > 0 && (
            <div className="p-4 rounded-xl border border-info/30 bg-info/5 animate-pulse">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-info animate-spin flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-info">
                    {runningTests.length} test{runningTests.length > 1 ? 's' : ''} running
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {runningTests.map(t => t.name || 'Test').join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Runs - Collapsible on mobile */}
          {recentRuns.length > 0 && (
            <CollapsibleSection
              title="Recent Runs"
              count={recentRuns.length}
              mobileCollapsed={true}
              defaultOpen={true}
            >
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {recentRuns.slice(0, isMobile ? 4 : 8).map((run) => (
                  <div
                    key={run.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border min-w-[160px] sm:min-w-[180px] flex-shrink-0',
                      run.status === 'passed' && 'border-success/30 bg-success/5',
                      run.status === 'failed' && 'border-error/30 bg-error/5',
                      run.status === 'running' && 'border-info/30 bg-info/5 animate-pulse'
                    )}
                  >
                    <StatusDot status={run.status} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{run.name || 'Test Run'}</div>
                      <div className="text-xs text-muted-foreground" suppressHydrationWarning>
                        {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    {run.status === 'running' ? (
                      <Loader2 className="h-4 w-4 text-info animate-spin flex-shrink-0" />
                    ) : run.duration_ms ? (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {(run.duration_ms / 1000).toFixed(1)}s
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Tests - Cards on mobile, Table on desktop */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              All Tests ({tests.length})
            </h3>

            {isMobile ? (
              // Mobile: Card layout
              <div className="space-y-3">
                {testsLoading ? (
                  // Loading skeletons
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-xl border bg-card animate-pulse">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : tests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No tests yet. Create your first test to get started.</p>
                  </div>
                ) : (
                  tests.map((test) => (
                    <MobileTestCard key={test.id} test={test} />
                  ))
                )}
              </div>
            ) : (
              // Desktop: Table layout
              <DataTable
                columns={columns}
                data={tests}
                searchKey="name"
                searchPlaceholder="Search tests..."
                isLoading={testsLoading}
                emptyMessage="No tests yet. Create your first test to get started."
              />
            )}
          </div>
        </div>

        {/* Activity Feed - Drawer on mobile, Sidebar on desktop */}
        {isMobile ? (
          <SwipeableDrawer
            open={showActivityFeed}
            onClose={() => setShowActivityFeed(false)}
            position="right"
            width="full"
            title="Activity Feed"
          >
            <DrawerContent>
              <RealtimeActivityFeed
                projectId={currentProject}
                maxItems={20}
              />
            </DrawerContent>
          </SwipeableDrawer>
        ) : (
          showActivityFeed && (
            <div className="fixed right-0 top-0 bottom-0 w-80 border-l bg-card/95 backdrop-blur-sm p-4 pt-20 animate-in slide-in-from-right z-40">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Activity Feed</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowActivityFeed(false)}
                >
                  Close
                </Button>
              </div>
              <RealtimeActivityFeed
                projectId={currentProject}
                maxItems={20}
              />
            </div>
          )
        )}
      </PageContainer>

      {/* Live Execution Modal */}
      <LiveExecutionModal
        test={selectedTest}
        appUrl={appUrl}
        open={executionModalOpen}
        onClose={() => {
          setExecutionModalOpen(false);
          setSelectedTest(null);
        }}
        onComplete={handleExecutionComplete}
      />
    </div>
  );
}
