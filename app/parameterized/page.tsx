'use client';

import { useState, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { type ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import {
  Play,
  Plus,
  Trash2,
  Edit,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  FileJson,
  FileSpreadsheet,
  Globe,
  Variable,
  Server,
  Layers,
  ArrowRight,
  MoreHorizontal,
  Copy,
  History,
  Eye,
  RefreshCw,
  Shuffle,
  Pause,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, StatusDot, Badge } from '@/components/ui/data-table';
import { useProjects } from '@/lib/hooks/use-projects';
import { useParameterizedTests, useParameterizedResults, useDeleteParameterizedTest } from '@/lib/hooks/use-parameterized';
import { CreateParameterizedTestModal } from '@/components/parameterized/CreateParameterizedTestModal';
import { ExecutionPreview } from '@/components/parameterized/ExecutionPreview';
import { ResultsView } from '@/components/parameterized/ResultsView';
import { cn } from '@/lib/utils';
import type { ParameterizedTest, ParameterizedResult } from '@/lib/hooks/use-parameterized';
import { NoProjectsEmptyState } from '@/components/ui/empty-state';

// Data source type icons
const DataSourceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  inline: FileJson,
  csv: FileSpreadsheet,
  json: FileJson,
  env: Variable,
  api: Globe,
  database: Database,
  spreadsheet: FileSpreadsheet,
};

// Iteration mode icons and labels
const IterationModes: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  sequential: { icon: ArrowRight, label: 'Sequential', color: 'text-blue-500' },
  parallel: { icon: Layers, label: 'Parallel', color: 'text-purple-500' },
  random: { icon: Shuffle, label: 'Random', color: 'text-orange-500' },
};

export default function ParameterizedTestsPage() {
  const { user } = useUser();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTest, setEditingTest] = useState<ParameterizedTest | null>(null);
  const [showExecutionPreview, setShowExecutionPreview] = useState(false);
  const [selectedTestForExecution, setSelectedTestForExecution] = useState<ParameterizedTest | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [selectedTestForResults, setSelectedTestForResults] = useState<ParameterizedTest | null>(null);

  // Data fetching
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const currentProject = selectedProjectId || projects[0]?.id;
  const { data: parameterizedTests = [], isLoading: testsLoading } = useParameterizedTests(currentProject || null);
  const { data: recentResults = [], isLoading: resultsLoading } = useParameterizedResults(currentProject || null, 10);

  // Mutations
  const deleteTest = useDeleteParameterizedTest();

  // Stats
  const stats = useMemo(() => {
    const activeTests = parameterizedTests.filter(t => t.is_active).length;
    const totalParameters = parameterizedTests.reduce((sum, t) => {
      const paramCount = typeof t.parameter_schema === 'object'
        ? Object.keys(t.parameter_schema || {}).length
        : 0;
      return sum + paramCount;
    }, 0);
    const passedRuns = recentResults.filter(r => r.status === 'passed').length;
    const passRate = recentResults.length > 0 ? (passedRuns / recentResults.length) * 100 : 0;
    const avgIterations = recentResults.length > 0
      ? recentResults.reduce((sum, r) => sum + (r.total_iterations || 0), 0) / recentResults.length
      : 0;

    return {
      totalTests: parameterizedTests.length,
      activeTests,
      totalParameters,
      passRate: passRate.toFixed(1),
      avgIterations: avgIterations.toFixed(0),
      recentRuns: recentResults.length,
    };
  }, [parameterizedTests, recentResults]);

  // Handle run test - opens execution preview
  const handleRunTest = (test: ParameterizedTest) => {
    setSelectedTestForExecution(test);
    setShowExecutionPreview(true);
  };

  // Handle view results
  const handleViewResults = (test: ParameterizedTest) => {
    setSelectedTestForResults(test);
    setShowResults(true);
  };

  // Handle edit test
  const handleEditTest = (test: ParameterizedTest) => {
    setEditingTest(test);
    setShowCreateModal(true);
  };

  // Handle delete test
  const handleDeleteTest = async (testId: string) => {
    if (!currentProject) return;
    if (!confirm('Are you sure you want to delete this parameterized test?')) return;
    try {
      await deleteTest.mutateAsync({ testId, projectId: currentProject });
    } catch (error) {
      console.error('Failed to delete test:', error);
    }
  };

  // Handle clone test
  const handleCloneTest = (test: ParameterizedTest) => {
    setEditingTest({
      ...test,
      id: '',
      name: `${test.name} (Copy)`,
    });
    setShowCreateModal(true);
  };

  // Get data source icon component
  const getDataSourceIcon = (type: string) => {
    return DataSourceIcons[type] || FileJson;
  };

  // Table columns
  const columns: ColumnDef<ParameterizedTest>[] = [
    {
      accessorKey: 'name',
      header: 'Test Name',
      cell: ({ row }) => {
        const DataSourceIcon = getDataSourceIcon(row.original.data_source_type);
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DataSourceIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">{row.original.name}</div>
              <div className="text-xs text-muted-foreground">
                {row.original.description || 'No description'}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'data_source_type',
      header: 'Data Source',
      cell: ({ row }) => {
        const type = row.original.data_source_type;
        const variants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline'> = {
          inline: 'info',
          csv: 'success',
          json: 'warning',
          env: 'outline',
          api: 'error',
          database: 'default',
          spreadsheet: 'success',
        };
        return (
          <Badge variant={variants[type] || 'default'}>
            {type.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'iteration_mode',
      header: 'Iteration Mode',
      cell: ({ row }) => {
        const mode = row.original.iteration_mode || 'sequential';
        const modeConfig = IterationModes[mode] || IterationModes.sequential;
        const ModeIcon = modeConfig.icon;
        return (
          <div className="flex items-center gap-2">
            <ModeIcon className={cn('h-4 w-4', modeConfig.color)} />
            <span className="text-sm">{modeConfig.label}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'parameter_schema',
      header: 'Parameters',
      cell: ({ row }) => {
        const schema = row.original.parameter_schema || {};
        const count = typeof schema === 'object' ? Object.keys(schema).length : 0;
        return (
          <span className="text-muted-foreground">
            {count} {count === 1 ? 'parameter' : 'parameters'}
          </span>
        );
      },
    },
    {
      accessorKey: 'last_run_status',
      header: 'Last Run',
      cell: ({ row }) => {
        const status = row.original.last_run_status;
        const lastRunAt = row.original.last_run_at;
        if (!status) {
          return <span className="text-muted-foreground">Never run</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <StatusDot status={status} />
            <span className="text-sm capitalize">{status}</span>
            {lastRunAt && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(lastRunAt), { addSuffix: true })}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => {
        const priority = row.original.priority || 'medium';
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
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
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
            Run
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              handleViewResults(row.original);
            }}
            title="View Results"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              handleEditTest(row.original);
            }}
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              handleCloneTest(row.original);
            }}
            title="Clone"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTest(row.original.id);
            }}
            title="Delete"
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
          <NoProjectsEmptyState onCreateProject={() => window.location.href = '/projects'} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
            {/* Project Selector */}
            <select
              value={currentProject || ''}
              onChange={(e) => setSelectedProjectId(e.target.value)}
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
                <Database className="h-4 w-4 text-muted-foreground" />
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
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{stats.avgIterations}</span>
                <span className="text-muted-foreground">avg iterations</span>
              </div>
            </div>

            <div className="flex-1" />

            <Button size="sm" onClick={() => {
              setEditingTest(null);
              setShowCreateModal(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Parameterized Test
            </Button>
        </header>

        <div className="p-6">
          {/* Recent Results */}
          {recentResults.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Runs</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {recentResults.slice(0, 8).map((result) => (
                  <div
                    key={result.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border min-w-[220px] cursor-pointer hover:bg-muted/50',
                      result.status === 'passed' && 'border-success/30 bg-success/5',
                      result.status === 'failed' && 'border-error/30 bg-error/5',
                      result.status === 'running' && 'border-info/30 bg-info/5'
                    )}
                    onClick={() => {
                      const test = parameterizedTests.find(t => t.id === result.parameterized_test_id);
                      if (test) {
                        setSelectedTestForResults(test);
                        setShowResults(true);
                      }
                    }}
                  >
                    <StatusDot status={result.status} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {result.total_iterations} iterations
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        {result.passed}
                        <XCircle className="h-3 w-3 text-error ml-1" />
                        {result.failed}
                      </div>
                    </div>
                    {result.duration_ms && (
                      <span className="text-xs text-muted-foreground">
                        {(result.duration_ms / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tests Table */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Parameterized Tests</h3>
            <DataTable
              columns={columns}
              data={parameterizedTests}
              searchKey="name"
              searchPlaceholder="Search parameterized tests..."
              isLoading={testsLoading}
              emptyMessage="No parameterized tests yet. Create your first data-driven test to get started."
            />
          </div>
        </div>
      </main>

      {/* Create/Edit Modal */}
      <CreateParameterizedTestModal
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) setEditingTest(null);
        }}
        projectId={currentProject || ''}
        editingTest={editingTest}
      />

      {/* Execution Preview Modal */}
      {selectedTestForExecution && (
        <ExecutionPreview
          open={showExecutionPreview}
          onOpenChange={(open) => {
            setShowExecutionPreview(open);
            if (!open) setSelectedTestForExecution(null);
          }}
          test={selectedTestForExecution}
          projectId={currentProject || ''}
        />
      )}

      {/* Results View Modal */}
      {selectedTestForResults && (
        <ResultsView
          open={showResults}
          onOpenChange={(open) => {
            setShowResults(open);
            if (!open) setSelectedTestForResults(null);
          }}
          test={selectedTestForResults}
          projectId={currentProject || ''}
        />
      )}
    </div>
  );
}
