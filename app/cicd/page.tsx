'use client';

import { useState, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { type ColumnDef } from '@tanstack/react-table';
import { safeFormatDistanceToNow, safeFormat } from '@/lib/utils';
import {
  GitBranch,
  GitCommit,
  Play,
  Square,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Rocket,
  History,
  BarChart3,
  Target,
  Shield,
  ExternalLink,
  ChevronRight,
  Activity,
  Zap,
  Users,
  FileCode,
  RotateCcw,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { DataTable, StatusDot, Badge } from '@/components/ui/data-table';
import { useProjects } from '@/lib/hooks/use-projects';
import {
  usePipelines,
  useBuildHistory,
  useDeployments,
  useTestImpact,
  useCICDStats,
  usePipelineSubscription,
  useDeploymentSubscription,
  useRetriggerPipeline,
  useCancelPipeline,
  useRollbackDeployment,
  useRunTestImpactAnalysis,
  type Pipeline,
  type Build,
  type Deployment,
  type PipelineStatus,
} from '@/lib/hooks/use-cicd';
import { cn } from '@/lib/utils';

type TabType = 'overview' | 'pipelines' | 'builds' | 'deployments' | 'test-impact';

const statusColors: Record<PipelineStatus, string> = {
  pending: 'warning',
  running: 'info',
  success: 'success',
  failed: 'error',
  cancelled: 'default',
  skipped: 'default',
};

const statusIcons: Record<PipelineStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-warning" />,
  running: <Loader2 className="h-4 w-4 text-info animate-spin" />,
  success: <CheckCircle2 className="h-4 w-4 text-success" />,
  failed: <XCircle className="h-4 w-4 text-error" />,
  cancelled: <Square className="h-4 w-4 text-muted-foreground" />,
  skipped: <Square className="h-4 w-4 text-muted-foreground" />,
};

function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export default function CICDPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');

  // Data fetching
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const currentProject = selectedProjectId || projects[0]?.id;

  const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines(currentProject, {
    branch: selectedBranch || undefined,
    limit: 50,
  });
  const { data: builds = [], isLoading: buildsLoading } = useBuildHistory(currentProject, {
    branch: selectedBranch || undefined,
    limit: 50,
  });
  const { data: deployments = [], isLoading: deploymentsLoading } = useDeployments(currentProject, {
    environment: selectedEnvironment || undefined,
    limit: 50,
  });
  const { data: testImpact, isLoading: testImpactLoading } = useTestImpact(currentProject);
  const { data: stats, isLoading: statsLoading } = useCICDStats(currentProject);

  // Real-time subscriptions
  usePipelineSubscription(currentProject);
  useDeploymentSubscription(currentProject);

  // Mutations
  const retriggerPipeline = useRetriggerPipeline();
  const cancelPipeline = useCancelPipeline();
  const rollbackDeployment = useRollbackDeployment();
  const runTestImpactAnalysis = useRunTestImpactAnalysis();

  // Compute stats
  const dashboardStats = useMemo(() => {
    const activePipelines = pipelines.filter((p) => p.status === 'running').length;
    const recentBuilds = builds.slice(0, 10);
    const passedBuilds = recentBuilds.filter((b) => b.status === 'success').length;
    const buildPassRate = recentBuilds.length > 0 ? (passedBuilds / recentBuilds.length) * 100 : 0;

    const productionDeployments = deployments.filter((d) => d.environment === 'production');
    const latestProductionDeploy = productionDeployments[0];

    return {
      activePipelines,
      buildPassRate: buildPassRate.toFixed(1),
      totalPipelines: stats?.total_pipelines || pipelines.length,
      totalBuilds: stats?.total_builds || builds.length,
      totalDeployments: stats?.total_deployments || deployments.length,
      avgPipelineDuration: stats?.avg_pipeline_duration_ms || 0,
      avgBuildDuration: stats?.avg_build_duration_ms || 0,
      currentRiskScore: stats?.current_risk_score || latestProductionDeploy?.risk_score || 0,
      testsImpacted: testImpact?.total_tests_impacted || 0,
    };
  }, [pipelines, builds, deployments, stats, testImpact]);

  // Get unique branches from pipelines
  const branches = useMemo(() => {
    const branchSet = new Set(pipelines.map((p) => p.branch));
    return Array.from(branchSet).sort();
  }, [pipelines]);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'pipelines', label: 'Pipelines', icon: <Activity className="h-4 w-4" /> },
    { id: 'builds', label: 'Build History', icon: <History className="h-4 w-4" /> },
    { id: 'deployments', label: 'Deployments', icon: <Rocket className="h-4 w-4" /> },
    { id: 'test-impact', label: 'Test Impact', icon: <Target className="h-4 w-4" /> },
  ];

  const isLoading = !userLoaded || projectsLoading;

  // Pipeline columns
  const pipelineColumns: ColumnDef<Pipeline>[] = [
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {statusIcons[row.original.status]}
          <span className="capitalize text-sm">{row.original.status}</span>
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Pipeline',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">{row.original.name || row.original.workflow_name || 'Pipeline'}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {row.original.branch}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'commit_sha',
      header: 'Commit',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <GitCommit className="h-4 w-4 text-muted-foreground" />
          <div>
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {row.original.commit_sha.slice(0, 7)}
            </code>
            {row.original.commit_message && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {row.original.commit_message}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'trigger',
      header: 'Trigger',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.trigger}
        </Badge>
      ),
    },
    {
      accessorKey: 'duration_ms',
      header: 'Duration',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDuration(row.original.duration_ms)}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Started',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm" suppressHydrationWarning>
          {safeFormatDistanceToNow(row.original.created_at, { addSuffix: true })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.status === 'running' ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => cancelPipeline.mutate({
                pipelineId: row.original.id,
                projectId: currentProject!,
              })}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => retriggerPipeline.mutate({
                pipelineId: row.original.id,
                projectId: currentProject!,
              })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          {row.original.workflow_url && (
            <a
              href={row.original.workflow_url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 w-8 p-0 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      ),
    },
  ];

  // Build columns
  const buildColumns: ColumnDef<Build>[] = [
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {statusIcons[row.original.status]}
          <span className="capitalize text-sm">{row.original.status}</span>
        </div>
      ),
    },
    {
      accessorKey: 'build_number',
      header: 'Build',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-blue-500/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <div className="font-medium">#{row.original.build_number}</div>
            <div className="text-xs text-muted-foreground">{row.original.name}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'branch',
      header: 'Branch',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
          {row.original.branch}
        </div>
      ),
    },
    {
      accessorKey: 'tests_total',
      header: 'Tests',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-success">{row.original.tests_passed}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-error">{row.original.tests_failed}</span>
          <span className="text-muted-foreground">/</span>
          <span>{row.original.tests_total}</span>
        </div>
      ),
    },
    {
      accessorKey: 'coverage_percent',
      header: 'Coverage',
      cell: ({ row }) => (
        row.original.coverage_percent !== null ? (
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  row.original.coverage_percent >= 80 ? 'bg-success' :
                  row.original.coverage_percent >= 60 ? 'bg-warning' : 'bg-error'
                )}
                style={{ width: `${row.original.coverage_percent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {row.original.coverage_percent.toFixed(0)}%
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )
      ),
    },
    {
      accessorKey: 'duration_ms',
      header: 'Duration',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDuration(row.original.duration_ms)}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Time',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm" suppressHydrationWarning>
          {safeFormatDistanceToNow(row.original.created_at, { addSuffix: true })}
        </span>
      ),
    },
  ];

  // Deployment columns
  const deploymentColumns: ColumnDef<Deployment>[] = [
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const statusMap: Record<string, { icon: React.ReactNode; color: string }> = {
          pending: { icon: <Clock className="h-4 w-4" />, color: 'text-warning' },
          in_progress: { icon: <Loader2 className="h-4 w-4 animate-spin" />, color: 'text-info' },
          success: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-success' },
          failed: { icon: <XCircle className="h-4 w-4" />, color: 'text-error' },
          rolled_back: { icon: <RotateCcw className="h-4 w-4" />, color: 'text-warning' },
        };
        const { icon, color } = statusMap[status] || statusMap.pending;
        return (
          <div className={cn('flex items-center gap-2', color)}>
            {icon}
            <span className="capitalize text-sm">{status.replace('_', ' ')}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'environment',
      header: 'Environment',
      cell: ({ row }) => {
        const envColors: Record<string, string> = {
          production: 'error',
          staging: 'warning',
          development: 'info',
          preview: 'default',
        };
        return (
          <Badge variant={envColors[row.original.environment] as 'error' | 'warning' | 'info' | 'default' || 'default'}>
            {row.original.environment}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'version',
      header: 'Version',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.version && (
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {row.original.version}
            </code>
          )}
          {row.original.commit_sha && (
            <code className="text-xs text-muted-foreground">
              {row.original.commit_sha.slice(0, 7)}
            </code>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'risk_score',
      header: 'Risk',
      cell: ({ row }) => {
        const score = row.original.risk_score;
        if (score === null) return <span className="text-muted-foreground text-xs">-</span>;
        const color = score >= 70 ? 'text-error' : score >= 40 ? 'text-warning' : 'text-success';
        return (
          <div className={cn('flex items-center gap-1', color)}>
            <Shield className="h-3.5 w-3.5" />
            <span className="text-sm font-medium">{score}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'health_check_status',
      header: 'Health',
      cell: ({ row }) => {
        const healthColors: Record<string, { variant: 'success' | 'warning' | 'error' | 'default'; text: string }> = {
          healthy: { variant: 'success', text: 'Healthy' },
          degraded: { variant: 'warning', text: 'Degraded' },
          unhealthy: { variant: 'error', text: 'Unhealthy' },
          unknown: { variant: 'default', text: 'Unknown' },
        };
        const health = healthColors[row.original.health_check_status] || healthColors.unknown;
        return <Badge variant={health.variant}>{health.text}</Badge>;
      },
    },
    {
      accessorKey: 'deployed_by',
      header: 'Deployed By',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {row.original.deployed_by || 'System'}
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Time',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm" suppressHydrationWarning>
          {safeFormatDistanceToNow(row.original.created_at, { addSuffix: true })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.rollback_available && row.original.status === 'success' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => rollbackDeployment.mutate({
                deploymentId: row.original.id,
                projectId: currentProject!,
              })}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Rollback
            </Button>
          )}
          {row.original.deployment_url && (
            <a
              href={row.original.deployment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 w-8 p-0 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      ),
    },
  ];

  // No project state
  if (!isLoading && projects.length === 0) {
    return (
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-w-0 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Activity className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight mb-2">No projects found</h2>
            <p className="text-muted-foreground mb-6">
              Create a project first to view CI/CD pipelines and deployments.
            </p>
            <Button onClick={() => window.location.href = '/projects'}>
              Go to Projects
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />

      <main className="flex-1 lg:ml-64 min-w-0">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">CI/CD & DevOps</h1>
              <p className="text-muted-foreground">
                Monitor pipelines, builds, deployments, and deployment risk
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Project Selector */}
              <select
                value={currentProject || ''}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[140px]"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>

              {/* Branch Filter */}
              {branches.length > 0 && (
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[120px]"
                >
                  <option value="">All branches</option>
                  {branches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.activePipelines}</p>
                  <p className="text-xs text-muted-foreground">Active Pipelines</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.buildPassRate}%</p>
                  <p className="text-xs text-muted-foreground">Build Pass Rate</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.currentRiskScore}</p>
                  <p className="text-xs text-muted-foreground">Deployment Risk</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboardStats.testsImpacted}</p>
                  <p className="text-xs text-muted-foreground">Tests Impacted</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Recent Pipelines */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Recent Pipelines</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('pipelines')}
                  >
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {pipelinesLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4 rounded-lg border bg-card animate-pulse">
                        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                        <div className="h-3 bg-muted rounded w-1/4" />
                      </div>
                    ))
                  ) : pipelines.length === 0 ? (
                    <div className="p-8 rounded-lg border bg-card text-center">
                      <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No pipelines found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Connect your CI/CD provider or push code to trigger pipelines
                      </p>
                    </div>
                  ) : (
                    pipelines.slice(0, 5).map((pipeline) => (
                      <div
                        key={pipeline.id}
                        className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {statusIcons[pipeline.status]}
                            <div>
                              <p className="font-medium">{pipeline.name || pipeline.workflow_name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <GitBranch className="h-3 w-3" />
                                {pipeline.branch}
                                <span className="mx-1">-</span>
                                <GitCommit className="h-3 w-3" />
                                {pipeline.commit_sha.slice(0, 7)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <p>{formatDuration(pipeline.duration_ms)}</p>
                            <p className="text-xs" suppressHydrationWarning>
                              {safeFormatDistanceToNow(pipeline.created_at, { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Deployments */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Recent Deployments</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('deployments')}
                  >
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deploymentsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="p-4 rounded-lg border bg-card animate-pulse">
                        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                        <div className="h-3 bg-muted rounded w-1/4" />
                      </div>
                    ))
                  ) : deployments.length === 0 ? (
                    <div className="p-8 rounded-lg border bg-card text-center col-span-2">
                      <Rocket className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No deployments found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Deployments will appear here when triggered from your CI/CD pipeline
                      </p>
                    </div>
                  ) : (
                    deployments.slice(0, 4).map((deployment) => (
                      <div
                        key={deployment.id}
                        className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant={
                              deployment.environment === 'production' ? 'error' :
                              deployment.environment === 'staging' ? 'warning' : 'info'
                            }
                          >
                            {deployment.environment}
                          </Badge>
                          <Badge
                            variant={
                              deployment.status === 'success' ? 'success' :
                              deployment.status === 'failed' ? 'error' :
                              deployment.status === 'in_progress' ? 'info' : 'default'
                            }
                          >
                            {deployment.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            {deployment.version && (
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {deployment.version}
                              </code>
                            )}
                            <p className="text-xs text-muted-foreground mt-1" suppressHydrationWarning>
                              {safeFormatDistanceToNow(deployment.created_at, { addSuffix: true })}
                            </p>
                          </div>
                          {deployment.risk_score !== null && (
                            <div className={cn(
                              'flex items-center gap-1 text-sm font-medium',
                              deployment.risk_score >= 70 ? 'text-error' :
                              deployment.risk_score >= 40 ? 'text-warning' : 'text-success'
                            )}>
                              <Shield className="h-4 w-4" />
                              Risk: {deployment.risk_score}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Test Impact Summary */}
              {testImpact && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Test Impact Analysis</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('test-impact')}
                    >
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{testImpact.total_files_changed}</p>
                        <p className="text-xs text-muted-foreground">Files Changed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-warning">{testImpact.total_tests_impacted}</p>
                        <p className="text-xs text-muted-foreground">Tests Impacted</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-success">
                          {Math.round(testImpact.confidence_score * 100)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'pipelines' && (
            <div>
              <DataTable
                columns={pipelineColumns}
                data={pipelines}
                searchKey="name"
                searchPlaceholder="Search pipelines..."
                isLoading={pipelinesLoading}
                emptyMessage="No pipelines found. Connect your CI/CD provider to see pipelines."
              />
            </div>
          )}

          {activeTab === 'builds' && (
            <div>
              <DataTable
                columns={buildColumns}
                data={builds}
                searchKey="name"
                searchPlaceholder="Search builds..."
                isLoading={buildsLoading}
                emptyMessage="No builds found."
              />
            </div>
          )}

          {activeTab === 'deployments' && (
            <div>
              {/* Environment Filter */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm text-muted-foreground">Environment:</span>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  {['', 'production', 'staging', 'development', 'preview'].map((env) => (
                    <button
                      key={env}
                      onClick={() => setSelectedEnvironment(env)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
                        selectedEnvironment === env
                          ? 'bg-background shadow text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {env || 'All'}
                    </button>
                  ))}
                </div>
              </div>

              <DataTable
                columns={deploymentColumns}
                data={deployments}
                searchKey="version"
                searchPlaceholder="Search deployments..."
                isLoading={deploymentsLoading}
                emptyMessage="No deployments found."
              />
            </div>
          )}

          {activeTab === 'test-impact' && (
            <div className="space-y-6">
              {/* Header with action */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Test Impact Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Analyze which tests are affected by recent code changes
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (currentProject) {
                      runTestImpactAnalysis.mutate({
                        projectId: currentProject,
                        commitSha: 'HEAD',
                      });
                    }
                  }}
                  disabled={runTestImpactAnalysis.isPending}
                >
                  {runTestImpactAnalysis.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Analysis
                </Button>
              </div>

              {testImpactLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">Loading analysis...</p>
                </div>
              ) : testImpact ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <FileCode className="h-4 w-4" />
                        <span className="text-xs">Files Changed</span>
                      </div>
                      <p className="text-2xl font-bold">{testImpact.total_files_changed}</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Target className="h-4 w-4" />
                        <span className="text-xs">Tests Impacted</span>
                      </div>
                      <p className="text-2xl font-bold text-warning">{testImpact.total_tests_impacted}</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs">Recommended</span>
                      </div>
                      <p className="text-2xl font-bold text-success">{testImpact.recommended_tests.length}</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs">Analysis Time</span>
                      </div>
                      <p className="text-2xl font-bold">{formatDuration(testImpact.analysis_time_ms)}</p>
                    </div>
                  </div>

                  {/* Changed Files */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Changed Files</h4>
                    <div className="space-y-2">
                      {testImpact.changed_files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={
                                file.change_type === 'added' ? 'success' :
                                file.change_type === 'deleted' ? 'error' : 'warning'
                              }
                              className="text-xs capitalize"
                            >
                              {file.change_type}
                            </Badge>
                            <code className="text-sm">{file.path}</code>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-success">+{file.additions}</span>
                            <span className="text-error">-{file.deletions}</span>
                            <span className="text-muted-foreground">
                              Impact: {Math.round(file.impact_score * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Impacted Tests */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Impacted Tests</h4>
                    <div className="space-y-2">
                      {testImpact.impacted_tests.map((test, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={
                                test.priority === 'critical' ? 'error' :
                                test.priority === 'high' ? 'warning' :
                                test.priority === 'medium' ? 'info' : 'default'
                              }
                              className="text-xs capitalize"
                            >
                              {test.priority}
                            </Badge>
                            <div>
                              <p className="text-sm font-medium">{test.test_name}</p>
                              <p className="text-xs text-muted-foreground">{test.impact_reason}</p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Confidence: {Math.round(test.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 rounded-lg border bg-card text-center">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Analysis Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Run a test impact analysis to see which tests are affected by recent changes
                  </p>
                  <Button
                    onClick={() => {
                      if (currentProject) {
                        runTestImpactAnalysis.mutate({
                          projectId: currentProject,
                          commitSha: 'HEAD',
                        });
                      }
                    }}
                    disabled={runTestImpactAnalysis.isPending}
                  >
                    {runTestImpactAnalysis.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Run Analysis
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
