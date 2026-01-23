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
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
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
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Test, TestRun } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';

export default function TestsPage() {
  const { user } = useUser();
  const [showNewTest, setShowNewTest] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
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
      setShowNewProject(false);
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

  // Table columns
  const columns: ColumnDef<Test>[] = [
    {
      accessorKey: 'name',
      header: 'Test Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">{row.original.name}</div>
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
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => (
        <span className="text-muted-foreground capitalize">{row.original.source}</span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-muted-foreground" suppressHydrationWarning>
          {formatDistanceToNow(new Date(row.original.created_at), { addSuffix: true })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="h-8 px-3"
            onClick={(e) => {
              e.stopPropagation();
              handleRunTest(row.original);
            }}
          >
            <Play className="h-4 w-4 mr-1" />
            Run Test
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
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

  // No project state
  if (!projectsLoading && projects.length === 0) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight mb-2">Create your first project</h2>
            <p className="text-muted-foreground mb-6">
              Projects represent the applications you want to test. Add a project to get started.
            </p>
            <div className="space-y-4">
              <Input
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
              <Input
                placeholder="Application URL (e.g., https://myapp.com)"
                value={newProjectUrl}
                onChange={(e) => setNewProjectUrl(e.target.value)}
              />
              <Button
                className="w-full"
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
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
            {/* Project Selector */}
            <select
              value={currentProject || ''}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                const project = projects.find((p) => p.id === e.target.value);
                if (project) setAppUrl(project.app_url);
              }}
              className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            {/* Stats Pills */}
            <div className="flex items-center gap-3 ml-4">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{stats.totalTests}</span>
                <span className="text-muted-foreground">tests</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="font-medium">{stats.passRate}%</span>
                <span className="text-muted-foreground">pass rate</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{stats.avgDuration}s</span>
                <span className="text-muted-foreground">avg</span>
              </div>
              {/* Running tests indicator */}
              {stats.runningCount > 0 && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                    <span className="font-medium text-blue-500">{stats.runningCount}</span>
                    <span className="text-muted-foreground">running</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex-1" />

            {/* Realtime Status Indicator */}
            <div className="flex items-center gap-2">
              <div className={cn(
                'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
                isRealtimeSubscribed ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
              )}>
                <Radio className="h-3 w-3" />
                {isRealtimeSubscribed ? 'Live' : 'Offline'}
              </div>

              {/* Online users indicator */}
              {onlineUsers.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">
                  <Users className="h-3 w-3" />
                  {onlineUsers.length} online
                </div>
              )}
            </div>

            {/* Activity Feed Toggle */}
            <Button
              size="sm"
              variant={showActivityFeed ? 'default' : 'outline'}
              onClick={() => setShowActivityFeed(!showActivityFeed)}
              className="h-9"
            >
              <Activity className="h-4 w-4 mr-1" />
              Activity
            </Button>

            {/* App URL */}
            <Input
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              placeholder="App URL to test (e.g., https://example.com)"
              className="w-72 h-9"
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
            >
              {runTest.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run All
            </Button>

            <Button size="sm" onClick={() => setShowNewTest(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Test
            </Button>
        </header>

        <div className="flex">
          {/* Main Content */}
          <div className={cn('flex-1 p-6', showActivityFeed && 'pr-0')}>
            {/* New Test Form */}
            {showNewTest && (
              <div className="mb-6 p-4 rounded-lg border bg-card animate-fade-up">
                <h3 className="font-medium mb-4">Create New Test</h3>
                <div className="space-y-4">
                  <Input
                    placeholder="Test name (e.g., User Login Flow)"
                    value={newTestName}
                    onChange={(e) => setNewTestName(e.target.value)}
                  />
                  <Textarea
                    placeholder="Enter test steps, one per line:&#10;Navigate to login page&#10;Enter username&#10;Enter password&#10;Click Sign In&#10;Verify dashboard is visible"
                    value={newTestSteps}
                    onChange={(e) => setNewTestSteps(e.target.value)}
                    rows={5}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowNewTest(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateTest}
                      disabled={createTest.isPending || !newTestName || !newTestSteps}
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
              <div className="mb-6 p-4 rounded-lg border border-blue-500/30 bg-blue-500/5 animate-pulse">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  <div>
                    <p className="font-medium text-blue-500">
                      {runningTests.length} test{runningTests.length > 1 ? 's' : ''} running
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {runningTests.map(t => t.name || 'Test').join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Runs */}
            {recentRuns.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Runs</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {recentRuns.slice(0, 8).map((run) => (
                    <div
                      key={run.id}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border min-w-[180px] transition-all',
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
                        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                      ) : run.duration_ms ? (
                        <span className="text-xs text-muted-foreground">
                          {(run.duration_ms / 1000).toFixed(1)}s
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tests Table */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">All Tests</h3>
              <DataTable
                columns={columns}
                data={tests}
                searchKey="name"
                searchPlaceholder="Search tests..."
                isLoading={testsLoading}
                emptyMessage="No tests yet. Create your first test to get started."
              />
            </div>
          </div>

          {/* Activity Feed Sidebar */}
          {showActivityFeed && (
            <div className="w-80 border-l bg-card/50 p-4 animate-in slide-in-from-right">
              <RealtimeActivityFeed
                projectId={currentProject}
                maxItems={20}
              />
            </div>
          )}
        </div>
      </main>

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
