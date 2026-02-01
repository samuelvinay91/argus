'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { safeFormatDistanceToNow } from '@/lib/utils';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Brain,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Play,
  AlertTriangle,
  Clock,
  ExternalLink,
  Activity,
  Zap,
  TrendingUp,
  BarChart3,
  ArrowRight,
  Radio,
  Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useActiveExecutions,
  useRecentExecutions,
  useExecutionStats,
  type GraphExecution,
  type ExecutionStatus,
} from '@/lib/hooks/use-orchestrator';

// ============================================
// Helper functions
// ============================================

function getStatusIcon(status: ExecutionStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'failed':
      return <XCircle className="h-4 w-4" />;
    case 'idle':
      return <Pause className="h-4 w-4" />;
    case 'analyzing':
    case 'planning':
    case 'executing':
    case 'healing':
    case 'reporting':
      return <Loader2 className="h-4 w-4 animate-spin" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
}

function getStatusColor(status: ExecutionStatus) {
  switch (status) {
    case 'completed':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'failed':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'idle':
      return 'bg-muted text-muted-foreground border-border';
    case 'analyzing':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'planning':
      return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
    case 'executing':
      return 'bg-violet-500/10 text-violet-500 border-violet-500/20';
    case 'healing':
      return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    case 'reporting':
      return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function getStatusLabel(status: ExecutionStatus) {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'idle':
      return 'Idle';
    case 'analyzing':
      return 'Analyzing';
    case 'planning':
      return 'Planning';
    case 'executing':
      return 'Executing';
    case 'healing':
      return 'Self-Healing';
    case 'reporting':
      return 'Reporting';
    default:
      return status;
  }
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// ============================================
// Components
// ============================================

function ExecutionCard({ execution }: { execution: GraphExecution }) {
  const statusColor = getStatusColor(execution.status);
  const isActive = ['analyzing', 'planning', 'executing', 'healing', 'reporting'].includes(execution.status);

  return (
    <Link
      href={`/orchestrator/${execution.thread_id}`}
      className="block"
    >
      <div className={cn(
        'p-4 rounded-lg border bg-card hover:bg-muted/50 transition-all',
        isActive && 'ring-1 ring-violet-500/30'
      )}>
        <div className="flex items-start gap-4">
          <div className={cn('p-2 rounded-lg border', statusColor)}>
            {getStatusIcon(execution.status)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  {execution.project_name || 'Orchestrator Session'}
                  {isActive && (
                    <span className="flex items-center gap-1 text-xs text-violet-500">
                      <Radio className="h-3 w-3 animate-pulse" />
                      Live
                    </span>
                  )}
                </h4>
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                  {execution.thread_id}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium capitalize',
                  statusColor
                )}>
                  {getStatusLabel(execution.status)}
                </span>
                <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                  {safeFormatDistanceToNow(execution.created_at, { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Progress bar for active executions */}
            {isActive && execution.total_steps > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Step {execution.current_step} of {execution.total_steps}</span>
                  <span>{execution.current_agent || 'Processing...'}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${(execution.current_step / execution.total_steps) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Stats for completed executions */}
            {execution.status === 'completed' && (
              <div className="flex items-center gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1 text-green-500">
                  <CheckCircle2 className="h-3 w-3" />
                  {execution.passed_steps} passed
                </span>
                {execution.failed_steps > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <XCircle className="h-3 w-3" />
                    {execution.failed_steps} failed
                  </span>
                )}
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDuration(execution.duration_ms)}
                </span>
              </div>
            )}

            {/* Error message for failed executions */}
            {execution.status === 'failed' && execution.error_message && (
              <div className="mt-3 p-2 rounded bg-red-500/5 border border-red-500/20">
                <p className="text-xs text-red-500 truncate">
                  {execution.error_message}
                </p>
              </div>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ type }: { type: 'active' | 'recent' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Brain className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">
        {type === 'active' ? 'No Active Executions' : 'No Recent Executions'}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md">
        {type === 'active'
          ? 'Start a test run or discovery session to see orchestrator executions here.'
          : 'Completed and failed executions will appear here once you run some tests.'}
      </p>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function OrchestratorPage() {
  // Data fetching hooks
  const { data: activeExecutions = [], isLoading: isLoadingActive, refetch: refetchActive } = useActiveExecutions();
  const { data: recentExecutions = [], isLoading: isLoadingRecent, refetch: refetchRecent } = useRecentExecutions(20);
  const { data: stats, isLoading: isLoadingStats } = useExecutionStats();

  // UI state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter executions by search
  const filteredActive = useMemo(() => {
    if (!searchQuery) return activeExecutions;
    const query = searchQuery.toLowerCase();
    return activeExecutions.filter(
      e => e.thread_id.toLowerCase().includes(query) ||
           e.project_name?.toLowerCase().includes(query) ||
           e.current_agent?.toLowerCase().includes(query)
    );
  }, [activeExecutions, searchQuery]);

  const filteredRecent = useMemo(() => {
    if (!searchQuery) return recentExecutions;
    const query = searchQuery.toLowerCase();
    return recentExecutions.filter(
      e => e.thread_id.toLowerCase().includes(query) ||
           e.project_name?.toLowerCase().includes(query)
    );
  }, [recentExecutions, searchQuery]);

  const isLoading = isLoadingActive || isLoadingRecent || isLoadingStats;

  const handleRefresh = () => {
    refetchActive();
    refetchRecent();
  };

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 text-violet-500" />
              Orchestrator Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor and manage LangGraph executions
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeExecutions.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 text-violet-500 text-sm">
                <Radio className="h-3 w-3 animate-pulse" />
                {activeExecutions.length} active
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-violet-500/10">
                    <Activity className="h-6 w-6 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {isLoadingStats ? '-' : stats?.total_executions || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Executions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {isLoadingStats ? '-' : `${stats?.success_rate || 0}%`}
                    </p>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Clock className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {isLoadingStats ? '-' : formatDuration(stats?.avg_duration_ms || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Avg Duration</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-amber-500/10">
                    <TrendingUp className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {isLoadingStats ? '-' : stats?.completed_last_24h || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Last 24h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search executions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Active Executions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-violet-500" />
                    Active Executions
                  </CardTitle>
                  <CardDescription>
                    Currently running orchestrator sessions
                  </CardDescription>
                </div>
                {filteredActive.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Auto-updating
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingActive ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredActive.length === 0 ? (
                <EmptyState type="active" />
              ) : (
                <div className="space-y-3">
                  {filteredActive.map((execution) => (
                    <ExecutionCard key={execution.id} execution={execution} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Completions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Recent Completions
                  </CardTitle>
                  <CardDescription>
                    Completed and failed executions
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingRecent ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredRecent.length === 0 ? (
                <EmptyState type="recent" />
              ) : (
                <div className="space-y-3">
                  {filteredRecent.map((execution) => (
                    <ExecutionCard key={execution.id} execution={execution} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
