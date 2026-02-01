'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { safeFormatDistanceToNow } from '@/lib/utils';
import {
  Play,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  AlertCircle,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, StatusDot, Badge } from '@/components/ui/data-table';
import {
  useAPITests,
  useRunAPITest,
  useDeleteAPITest,
  type APITestCase,
  type TestType,
  type PriorityType,
} from '@/lib/hooks/use-api-tests';
import { useProjects } from '@/lib/hooks/use-projects';
import { cn } from '@/lib/utils';

// HTTP method badge colors
const methodColors: Record<string, string> = {
  GET: 'bg-green-500/10 text-green-500 border-green-500/20',
  POST: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  PUT: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  PATCH: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  DELETE: 'bg-red-500/10 text-red-500 border-red-500/20',
  HEAD: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  OPTIONS: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
};

// Test type labels
const testTypeLabels: Record<TestType, string> = {
  functional: 'Functional',
  negative: 'Negative',
  boundary: 'Boundary',
  security: 'Security',
  performance: 'Performance',
  integration: 'Integration',
};

// Priority badge variants
const priorityVariants: Record<PriorityType, 'error' | 'warning' | 'info' | 'default'> = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

export default function APITestsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [filterType, setFilterType] = useState<TestType | ''>('');
  const [showNewTestForm, setShowNewTestForm] = useState(false);

  // New test form state
  const [newTestName, setNewTestName] = useState('');
  const [newTestEndpoint, setNewTestEndpoint] = useState('');
  const [newTestMethod, setNewTestMethod] = useState('GET');
  const [newTestExpectedStatus, setNewTestExpectedStatus] = useState(200);

  // Data fetching
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const currentProject = selectedProjectId || projects[0]?.id;

  const { data: tests = [], isLoading: testsLoading } = useAPITests(currentProject || null, {
    testType: filterType || undefined,
    isActive: true,
  });

  // Mutations
  const runTests = useRunAPITest();
  const deleteTest = useDeleteAPITest();

  // Stats
  const stats = useMemo(() => {
    const passed = tests.filter(t => t.last_run_status === 'passed').length;
    const failed = tests.filter(t => t.last_run_status === 'failed').length;
    const pending = tests.filter(t => !t.last_run_status).length;
    const passRate = tests.length > 0 && (passed + failed) > 0
      ? (passed / (passed + failed)) * 100
      : 0;

    return {
      total: tests.length,
      passed,
      failed,
      pending,
      passRate: passRate.toFixed(1),
    };
  }, [tests]);

  // Handle run all tests
  const handleRunAllTests = async () => {
    if (!currentProject || !baseUrl) return;

    try {
      await runTests.mutateAsync({
        project_id: currentProject,
        base_url: baseUrl,
        auth_token: authToken || undefined,
        auth_type: authToken ? 'bearer' : 'none',
      });
    } catch (error) {
      console.error('Failed to run tests:', error);
    }
  };

  // Handle run single test
  const handleRunTest = async (test: APITestCase) => {
    if (!currentProject || !baseUrl) return;

    try {
      await runTests.mutateAsync({
        project_id: currentProject,
        test_ids: [test.id],
        base_url: baseUrl,
        auth_token: authToken || undefined,
        auth_type: authToken ? 'bearer' : 'none',
      });
    } catch (error) {
      console.error('Failed to run test:', error);
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
  const columns: ColumnDef<APITestCase>[] = [
    {
      accessorKey: 'method',
      header: 'Method',
      cell: ({ row }) => (
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold border',
            methodColors[row.original.method] || 'bg-muted text-muted-foreground'
          )}
        >
          {row.original.method}
        </span>
      ),
      size: 80,
    },
    {
      accessorKey: 'endpoint',
      header: 'Endpoint',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Link
            href={`/api-tests/${row.original.id}`}
            className="font-medium hover:text-primary transition-colors"
          >
            {row.original.name}
          </Link>
          <span className="text-xs text-muted-foreground font-mono truncate max-w-[300px]">
            {row.original.endpoint}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'test_type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground capitalize">
          {testTypeLabels[row.original.test_type] || row.original.test_type}
        </span>
      ),
    },
    {
      accessorKey: 'expected_status',
      header: 'Expected',
      cell: ({ row }) => (
        <span className="text-sm font-mono">
          {row.original.expected_status}
        </span>
      ),
      size: 80,
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => (
        <Badge variant={priorityVariants[row.original.priority] || 'default'}>
          {row.original.priority}
        </Badge>
      ),
      size: 100,
    },
    {
      accessorKey: 'last_run_status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.last_run_status;
        if (!status) {
          return <span className="text-xs text-muted-foreground">Not run</span>;
        }
        return <StatusDot status={status === 'passed' ? 'passed' : status === 'failed' ? 'failed' : 'pending'} />;
      },
      size: 80,
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground" suppressHydrationWarning>
          {safeFormatDistanceToNow(row.original.created_at, { addSuffix: true })}
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
            disabled={!baseUrl || runTests.isPending}
            onClick={(e) => {
              e.stopPropagation();
              handleRunTest(row.original);
            }}
          >
            {runTests.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Run
              </>
            )}
          </Button>
          <Link href={`/api-tests/${row.original.id}`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
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
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-w-0 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Globe className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight mb-2">Create a project first</h2>
            <p className="text-muted-foreground mb-6">
              You need to create a project before you can add API tests.
            </p>
            <Link href="/projects">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0 overflow-x-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-sm px-4 lg:px-6 py-3">
          {/* Top row - Project selector and stats */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Project Selector */}
            <select
              value={currentProject || ''}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                const project = projects.find((p) => p.id === e.target.value);
                if (project) setBaseUrl(project.app_url);
              }}
              className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[120px]"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            {/* Stats Pills */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{stats.total}</span>
                <span className="text-muted-foreground hidden lg:inline">tests</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="font-medium">{stats.passed}</span>
                <span className="text-muted-foreground hidden lg:inline">passed</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-error" />
                <span className="font-medium">{stats.failed}</span>
                <span className="text-muted-foreground hidden lg:inline">failed</span>
              </div>
              {parseFloat(stats.passRate) > 0 && (
                <>
                  <div className="h-4 w-px bg-border hidden lg:block" />
                  <div className="hidden lg:flex items-center gap-2 text-sm">
                    <span className="font-medium">{stats.passRate}%</span>
                    <span className="text-muted-foreground">pass rate</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex-1 min-w-0" />

            {/* Filter by type */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TestType | '')}
              className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Types</option>
              <option value="functional">Functional</option>
              <option value="negative">Negative</option>
              <option value="boundary">Boundary</option>
              <option value="security">Security</option>
              <option value="performance">Performance</option>
              <option value="integration">Integration</option>
            </select>

            <Button size="sm" onClick={() => setShowNewTestForm(true)}>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Test</span>
            </Button>
          </div>

          {/* Bottom row - Base URL and Run buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-3">
            {/* Base URL */}
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="Base URL (e.g., https://api.example.com)"
              className="flex-1 min-w-[200px] max-w-md h-9"
            />

            {/* Auth Token (optional) */}
            <Input
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Bearer token (optional)"
              type="password"
              className="flex-1 min-w-[150px] max-w-xs h-9"
            />

            <Button
              size="sm"
              variant="default"
              onClick={handleRunAllTests}
              disabled={runTests.isPending || tests.length === 0 || !baseUrl}
            >
              {runTests.isPending ? (
                <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">Run All</span>
            </Button>
          </div>

          {/* Warning if no base URL */}
          {!baseUrl && tests.length > 0 && (
            <div className="flex items-center gap-2 mt-2 text-xs text-amber-500">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Enter a base URL to run tests</span>
            </div>
          )}
        </header>

        <div className="flex min-w-0">
          {/* Main Content */}
          <div className="flex-1 min-w-0 p-4 lg:p-6 overflow-x-hidden">
            {/* New Test Form */}
            {showNewTestForm && (
              <div className="mb-6 p-4 rounded-lg border bg-card animate-fade-up">
                <h3 className="font-medium mb-4">Create New API Test</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Test name"
                    value={newTestName}
                    onChange={(e) => setNewTestName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <select
                      value={newTestMethod}
                      onChange={(e) => setNewTestMethod(e.target.value)}
                      className="h-10 rounded-md border bg-background px-3 text-sm w-24"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                    <Input
                      placeholder="Endpoint (e.g., /api/users)"
                      value={newTestEndpoint}
                      onChange={(e) => setNewTestEndpoint(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <Input
                    type="number"
                    placeholder="Expected status code"
                    value={newTestExpectedStatus}
                    onChange={(e) => setNewTestExpectedStatus(parseInt(e.target.value) || 200)}
                  />
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <Button variant="outline" onClick={() => setShowNewTestForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!newTestName || !newTestEndpoint || !currentProject}
                    onClick={async () => {
                      // This would call createAPITest mutation
                      // For now, just close the form
                      setShowNewTestForm(false);
                      setNewTestName('');
                      setNewTestEndpoint('');
                      setNewTestMethod('GET');
                      setNewTestExpectedStatus(200);
                    }}
                  >
                    Create Test
                  </Button>
                </div>
              </div>
            )}

            {/* Run Results Banner */}
            {runTests.isSuccess && runTests.data && (
              <div
                className={cn(
                  'mb-6 p-4 rounded-lg border',
                  runTests.data.success
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-red-500/30 bg-red-500/5'
                )}
              >
                <div className="flex items-center gap-3">
                  {runTests.data.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className={cn('font-medium', runTests.data.success ? 'text-green-500' : 'text-red-500')}>
                      Test run {runTests.data.success ? 'passed' : 'failed'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {runTests.data.passed} passed, {runTests.data.failed} failed, {runTests.data.errors} errors
                      {' '} in {(runTests.data.total_duration_ms / 1000).toFixed(1)}s
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tests Table */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">API Tests</h3>
              <DataTable
                columns={columns}
                data={tests}
                searchKey="name"
                searchPlaceholder="Search tests..."
                isLoading={testsLoading}
                emptyMessage="No API tests yet. Create your first test to get started."
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
