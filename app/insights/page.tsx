'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Brain,
  Loader2,
  AlertTriangle,
  Lightbulb,
  Target,
  TrendingUp,
  Check,
  Sparkles,
  BarChart3,
  RefreshCcw,
  Layers,
  AlertCircle,
  Clock,
  Zap,
  XCircle,
  CheckCircle2,
  PieChart,
  Link2,
  ArrowRight,
  Shield,
  Database,
  Server,
  Gauge,
  FileText,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { useProjects } from '@/lib/hooks/use-projects';
import {
  useAIInsights,
  useResolveInsight,
  useInsightStats,
  useFailureClusters,
  useCoverageGaps,
  useFlakyTests,
  useGenerateAIInsights,
  useAIFailureClusters,
  useAICoverageGaps,
  useAIResolveInsight,
} from '@/lib/hooks/use-insights';
import {
  useCrossDomainCorrelations,
  useProactiveAlerts,
  useExecutiveSummary,
  type CrossDomainCorrelation,
  type ProactiveAlert,
} from '@/lib/hooks/use-intelligence';
import { Badge } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import { NoProjectsEmptyState } from '@/components/ui/empty-state';

export default function InsightsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'insights' | 'patterns' | 'coverage' | 'flaky' | 'intelligence'>('insights');

  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const currentProject = selectedProjectId || projects[0]?.id;

  const { data: insights = [], isLoading: insightsLoading } = useAIInsights(currentProject || null);
  const { data: stats } = useInsightStats(currentProject || null);
  const resolveInsight = useResolveInsight();

  // AI-powered generation mutation
  const generateInsights = useGenerateAIInsights();
  const aiResolveInsight = useAIResolveInsight();

  // Real data hooks (SQL-based fallback)
  const { data: failureData, isLoading: failuresLoading } = useFailureClusters(currentProject || null);
  const { data: coverageData, isLoading: coverageLoading } = useCoverageGaps(currentProject || null);
  const { data: flakyData, isLoading: flakyLoading } = useFlakyTests(currentProject || null);

  // AI-powered data hooks (Claude-based analysis)
  const { data: aiFailureData, isLoading: aiFailuresLoading } = useAIFailureClusters(currentProject || null);
  const { data: aiCoverageData, isLoading: aiCoverageLoading } = useAICoverageGaps(currentProject || null);

  // Cross-domain intelligence hooks
  const { data: correlationsData, isLoading: correlationsLoading } = useCrossDomainCorrelations(currentProject || null);
  const { data: alertsData, isLoading: alertsLoading } = useProactiveAlerts(currentProject || null);
  const { data: executiveSummary, isLoading: summaryLoading } = useExecutiveSummary(currentProject || null);

  // State for showing AI vs simple analysis
  const [useAIAnalysis, setUseAIAnalysis] = useState(true);

  const failureClusters = failureData?.clusters || [];
  const totalFailures = failureData?.totalFailures || 0;
  const coverageGaps = coverageData?.gaps || [];
  const coverageStats = coverageData?.stats || { critical: 0, high: 0, totalSuggested: 0, overallCoverage: 100 };
  const flakyTests = flakyData?.flakyTests || [];
  const flakyStats = flakyData?.stats || { count: 0, totalFailures: 0, autoFixed: 0 };

  const isLoading = projectsLoading || insightsLoading;

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'prediction': return TrendingUp;
      case 'anomaly': return AlertTriangle;
      case 'suggestion': return Lightbulb;
      default: return Target;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down': return <TrendingUp className="h-4 w-4 text-green-500 rotate-180" />;
      default: return <span className="h-4 w-4 text-muted-foreground">-</span>;
    }
  };

  if (!projectsLoading && projects.length === 0) {
    return (
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-w-0 flex items-center justify-center">
          <NoProjectsEmptyState />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-sm">
          <div className="flex h-16 items-center gap-4 px-6">
            <select
              value={currentProject || ''}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-3 ml-4">
              {stats && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-error" />
                    <span className="font-medium">{stats.bySeverity.critical}</span>
                    <span className="text-muted-foreground">critical</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{stats.unresolved}</span>
                    <span className="text-muted-foreground">active</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={useAIAnalysis ? 'default' : 'outline'}
                onClick={() => setUseAIAnalysis(!useAIAnalysis)}
              >
                <Brain className="h-4 w-4 mr-2" />
                {useAIAnalysis ? 'AI Analysis' : 'Simple Analysis'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => currentProject && generateInsights.mutate({ projectId: currentProject })}
                disabled={!currentProject || generateInsights.isPending}
              >
                {generateInsights.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {generateInsights.isPending ? 'Analyzing...' : 'Generate Insights'}
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-4 px-6 border-t">
            <button
              onClick={() => setActiveTab('insights')}
              className={cn(
                'py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'insights'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="flex items-center gap-1">
                <Brain className="h-4 w-4" />
                AI Insights
              </span>
            </button>
            <button
              onClick={() => setActiveTab('patterns')}
              className={cn(
                'py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'patterns'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                Failure Patterns
              </span>
            </button>
            <button
              onClick={() => setActiveTab('coverage')}
              className={cn(
                'py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'coverage'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="flex items-center gap-1">
                <Layers className="h-4 w-4" />
                Coverage Gaps
              </span>
            </button>
            <button
              onClick={() => setActiveTab('flaky')}
              className={cn(
                'py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'flaky'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="flex items-center gap-1">
                <RefreshCcw className="h-4 w-4" />
                Flaky Tests
              </span>
            </button>
            <button
              onClick={() => setActiveTab('intelligence')}
              className={cn(
                'py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'intelligence'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="flex items-center gap-1">
                <Link2 className="h-4 w-4" />
                Cross-Domain Intelligence
                {(correlationsData?.total_count || 0) > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                    {correlationsData?.total_count}
                  </span>
                )}
              </span>
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-2xl font-bold">{stats?.unresolved || 0}</div>
              <div className="text-sm text-muted-foreground">Active Insights</div>
            </div>
            <div className="p-4 rounded-lg border bg-card border-error/20 bg-error/5">
              <div className="text-2xl font-bold text-error">{stats?.bySeverity.critical || 0}</div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </div>
            <div className="p-4 rounded-lg border bg-card border-warning/20 bg-warning/5">
              <div className="text-2xl font-bold text-warning">{stats?.bySeverity.high || 0}</div>
              <div className="text-sm text-muted-foreground">High Priority</div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="text-2xl font-bold text-success">{stats?.resolved || 0}</div>
              <div className="text-sm text-muted-foreground">Resolved</div>
            </div>
          </div>

          {/* AI Insights Tab */}
          {activeTab === 'insights' && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Active Insights</h3>
              <div className="space-y-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : insights.length > 0 ? (
                  insights.map((insight) => {
                    const Icon = getInsightIcon(insight.insight_type);
                    return (
                      <div
                        key={insight.id}
                        className={cn(
                          'p-4 rounded-lg border',
                          insight.severity === 'critical' && 'border-error/30 bg-error/5',
                          insight.severity === 'high' && 'border-warning/30 bg-warning/5'
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            'p-2 rounded-lg',
                            insight.severity === 'critical' ? 'bg-error/10' : 'bg-primary/10'
                          )}>
                            <Icon className={cn(
                              'h-5 w-5',
                              insight.severity === 'critical' ? 'text-error' : 'text-primary'
                            )} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{insight.title}</span>
                              <Badge variant={insight.severity === 'critical' ? 'error' : insight.severity === 'high' ? 'warning' : 'info'}>
                                {insight.severity}
                              </Badge>
                              <Badge variant="outline">{insight.insight_type}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                            {insight.suggested_action && (
                              <p className="text-sm text-primary">{insight.suggested_action}</p>
                            )}
                            <div className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(insight.created_at), { addSuffix: true })}
                              {insight.confidence && ` | ${(insight.confidence * 100).toFixed(0)}% confidence`}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => currentProject && resolveInsight.mutate({
                              insightId: insight.id,
                              projectId: currentProject,
                            })}
                            disabled={resolveInsight.isPending}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Resolve
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No active insights. Your tests are running smoothly!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Failure Patterns Tab */}
          {activeTab === 'patterns' && (
            <div className="space-y-6">
              {failuresLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : failureClusters.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No failure patterns detected yet.</p>
                  <p className="text-sm">Run some tests to see failure analysis.</p>
                </div>
              ) : (
                <>
                  {/* Failure Clustering Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-primary" />
                        Failure Pattern Distribution
                      </CardTitle>
                      <CardDescription>
                        Common failure patterns detected across your test suite
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        {/* Visual Chart */}
                        <div className="flex items-center justify-center">
                          <div className="relative w-48 h-48">
                            {/* Dynamic pie chart using conic gradients */}
                            <div
                              className="w-full h-full rounded-full"
                              style={{
                                background: (() => {
                                  const colorHexMap: Record<string, string> = {
                                    'bg-red-500': '#ef4444',
                                    'bg-orange-500': '#f97316',
                                    'bg-yellow-500': '#eab308',
                                    'bg-blue-500': '#3b82f6',
                                    'bg-purple-500': '#8b5cf6',
                                    'bg-gray-500': '#6b7280',
                                  };
                                  let currentPercent = 0;
                                  const gradientStops = failureClusters.map((cluster) => {
                                    const start = currentPercent;
                                    currentPercent += cluster.percentage;
                                    return `${colorHexMap[cluster.color] || '#6b7280'} ${start}% ${currentPercent}%`;
                                  });
                                  return `conic-gradient(${gradientStops.join(', ')})`;
                                })()
                              }}
                            />
                            <div className="absolute inset-4 rounded-full bg-card flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-3xl font-bold">{totalFailures}</div>
                                <div className="text-xs text-muted-foreground">Total Failures</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="space-y-3">
                          {failureClusters.map((cluster) => (
                            <div key={cluster.id} className="flex items-center gap-3">
                              <div className={cn('w-3 h-3 rounded-full', cluster.color)} />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{cluster.name}</span>
                                  <span className="text-sm text-muted-foreground">{cluster.percentage}%</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{cluster.count} occurrences</span>
                                  <span>|</span>
                                  <span>{cluster.affectedTests} tests</span>
                                  {getTrendIcon(cluster.trend)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pattern Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Pattern Analysis</CardTitle>
                      <CardDescription>Detailed breakdown of each failure pattern</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {failureClusters.map((cluster) => (
                          <div key={cluster.id} className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className={cn('w-2 h-8 rounded-full', cluster.color)} />
                                <div>
                                  <div className="font-medium">{cluster.name}</div>
                                  <div className="text-sm text-muted-foreground">{cluster.count} occurrences in {cluster.affectedTests} tests</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getTrendIcon(cluster.trend)}
                                <Button size="sm" variant="outline">View Tests</Button>
                              </div>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all', cluster.color)}
                                style={{ width: `${cluster.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Coverage Gaps Tab */}
          {activeTab === 'coverage' && (
            <div className="space-y-6">
              {coverageLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Coverage Overview */}
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-red-500/10">
                            <AlertCircle className="h-6 w-6 text-red-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{coverageStats.critical}</p>
                            <p className="text-sm text-muted-foreground">Critical Gaps</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-orange-500/10">
                            <AlertTriangle className="h-6 w-6 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{coverageStats.high}</p>
                            <p className="text-sm text-muted-foreground">High Priority</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-primary/10">
                            <Layers className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{coverageStats.totalSuggested}</p>
                            <p className="text-sm text-muted-foreground">Tests Suggested</p>
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
                            <p className="text-2xl font-bold">{coverageStats.overallCoverage}%</p>
                            <p className="text-sm text-muted-foreground">Overall Coverage</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Coverage Gaps List */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        Identified Coverage Gaps
                      </CardTitle>
                      <CardDescription>
                        Areas of your application that need more test coverage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {coverageGaps.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No coverage gaps found!</p>
                          <p className="text-sm">Run a discovery session to identify areas that need testing.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {coverageGaps.map((gap) => (
                            <div
                              key={gap.id}
                              className={cn(
                                'p-4 rounded-lg border',
                                gap.priority === 'critical' && 'border-red-500/30 bg-red-500/5',
                                gap.priority === 'high' && 'border-orange-500/30 bg-orange-500/5'
                              )}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <code className="px-2 py-0.5 rounded bg-muted text-sm font-mono">{gap.area}</code>
                                    <Badge variant={
                                      gap.priority === 'critical' ? 'error' :
                                      gap.priority === 'high' ? 'warning' :
                                      gap.priority === 'medium' ? 'info' : 'default'
                                    }>
                                      {gap.priority}
                                    </Badge>
                                    <Badge variant="outline">{gap.type}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-2">{gap.impact}</p>
                                  <div className="flex items-center gap-4 mt-3">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-muted-foreground">Current Coverage</span>
                                        <span className={cn(
                                          gap.coverage < 30 ? 'text-red-500' :
                                          gap.coverage < 50 ? 'text-orange-500' :
                                          gap.coverage < 70 ? 'text-yellow-500' : 'text-green-500'
                                        )}>{gap.coverage}%</span>
                                      </div>
                                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                          className={cn(
                                            'h-full rounded-full transition-all',
                                            gap.coverage < 30 ? 'bg-red-500' :
                                            gap.coverage < 50 ? 'bg-orange-500' :
                                            gap.coverage < 70 ? 'bg-yellow-500' : 'bg-green-500'
                                          )}
                                          style={{ width: `${gap.coverage}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <div className="text-right mr-4">
                                    <div className="text-lg font-bold">{gap.suggestedTests}</div>
                                    <div className="text-xs text-muted-foreground">tests needed</div>
                                  </div>
                                  <Button size="sm">
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Generate
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Flaky Tests Tab */}
          {activeTab === 'flaky' && (
            <div className="space-y-6">
              {flakyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Flaky Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-red-500/10">
                            <RefreshCcw className="h-6 w-6 text-red-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{flakyStats.count}</p>
                            <p className="text-sm text-muted-foreground">Flaky Tests</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-orange-500/10">
                            <XCircle className="h-6 w-6 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{flakyStats.totalFailures}</p>
                            <p className="text-sm text-muted-foreground">Flaky Failures</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-yellow-500/10">
                            <Clock className="h-6 w-6 text-yellow-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">-</p>
                            <p className="text-sm text-muted-foreground">Time Wasted</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-green-500/10">
                            <Zap className="h-6 w-6 text-green-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{flakyStats.autoFixed}</p>
                            <p className="text-sm text-muted-foreground">Auto-Fixed</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Flaky Tests List */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <RefreshCcw className="h-5 w-5 text-primary" />
                        Flaky Test Analysis
                      </CardTitle>
                      <CardDescription>
                        Tests with inconsistent results and their root causes
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {flakyTests.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <RefreshCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No flaky tests detected!</p>
                          <p className="text-sm">Run more tests to identify inconsistent behavior.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {flakyTests.map((test) => (
                            <div key={test.id} className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{test.name}</span>
                                    <Badge variant={
                                      test.flakinessScore > 70 ? 'error' :
                                      test.flakinessScore > 50 ? 'warning' : 'info'
                                    }>
                                      {test.flakinessScore}% flaky
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span>{test.passRate}% pass rate</span>
                                    <span>|</span>
                                    <span>{test.failureCount}/{test.totalRuns} failures</span>
                                    <span>|</span>
                                    <span>Last flake: {test.lastFlake}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="outline">Quarantine</Button>
                                  <Button size="sm">
                                    <Zap className="h-4 w-4 mr-2" />
                                    Auto-Fix
                                  </Button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 mt-4 p-3 rounded-lg bg-muted/50">
                                <div>
                                  <div className="flex items-center gap-2 text-sm font-medium text-red-500 mb-1">
                                    <AlertCircle className="h-4 w-4" />
                                    Root Cause
                                  </div>
                                  <p className="text-sm text-muted-foreground">{test.rootCause}</p>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 text-sm font-medium text-green-500 mb-1">
                                    <Lightbulb className="h-4 w-4" />
                                    Suggested Fix
                                  </div>
                                  <p className="text-sm text-muted-foreground">{test.suggestedFix}</p>
                                </div>
                              </div>

                              {/* Flakiness indicator bar */}
                              <div className="mt-4">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-muted-foreground">Flakiness Score</span>
                                  <span className={cn(
                                    test.flakinessScore > 70 ? 'text-red-500' :
                                    test.flakinessScore > 50 ? 'text-orange-500' : 'text-yellow-500'
                                  )}>{test.flakinessScore}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-all',
                                      test.flakinessScore > 70 ? 'bg-red-500' :
                                      test.flakinessScore > 50 ? 'bg-orange-500' : 'bg-yellow-500'
                                    )}
                                    style={{ width: `${test.flakinessScore}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Cross-Domain Intelligence Tab */}
          {activeTab === 'intelligence' && (
            <div className="space-y-6">
              {correlationsLoading || alertsLoading || summaryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Executive Summary Card */}
                  {executiveSummary && (
                    <Card className={cn(
                      'border-l-4',
                      executiveSummary.overall_health === 'excellent' && 'border-l-green-500',
                      executiveSummary.overall_health === 'good' && 'border-l-green-400',
                      executiveSummary.overall_health === 'fair' && 'border-l-yellow-500',
                      executiveSummary.overall_health === 'poor' && 'border-l-orange-500',
                      executiveSummary.overall_health === 'critical' && 'border-l-red-500'
                    )}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          Executive Summary
                          <Badge variant={
                            executiveSummary.overall_health === 'excellent' || executiveSummary.overall_health === 'good' ? 'success' :
                            executiveSummary.overall_health === 'fair' ? 'warning' : 'error'
                          }>
                            {executiveSummary.overall_health.charAt(0).toUpperCase() + executiveSummary.overall_health.slice(1)} Health
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {executiveSummary.period.days}-day analysis from {new Date(executiveSummary.period.start).toLocaleDateString()} to {new Date(executiveSummary.period.end).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-4 mb-6">
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className="text-2xl font-bold">{executiveSummary.key_metrics.total_tests_run.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">Tests Run</div>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className={cn(
                              'text-2xl font-bold',
                              executiveSummary.key_metrics.pass_rate >= 90 ? 'text-green-500' :
                              executiveSummary.key_metrics.pass_rate >= 70 ? 'text-yellow-500' : 'text-red-500'
                            )}>
                              {executiveSummary.key_metrics.pass_rate.toFixed(1)}%
                            </div>
                            <div className="text-sm text-muted-foreground">Pass Rate</div>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className="text-2xl font-bold">{executiveSummary.cross_domain_summary.total_correlations}</div>
                            <div className="text-sm text-muted-foreground">Cross-Domain Issues</div>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className={cn(
                              'text-2xl font-bold',
                              executiveSummary.key_metrics.critical_issues === 0 ? 'text-green-500' : 'text-red-500'
                            )}>
                              {executiveSummary.key_metrics.critical_issues}
                            </div>
                            <div className="text-sm text-muted-foreground">Critical Alerts</div>
                          </div>
                        </div>

                        {/* Top Issues */}
                        {executiveSummary.top_issues.length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-sm font-medium mb-3">Top Issues</h4>
                            <div className="space-y-2">
                              {executiveSummary.top_issues.slice(0, 3).map((issue, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                  <Badge variant={
                                    issue.severity === 'critical' ? 'error' :
                                    issue.severity === 'high' ? 'warning' : 'info'
                                  }>
                                    {issue.severity}
                                  </Badge>
                                  <span className="flex-1 text-sm">{issue.title}</span>
                                  <span className="text-xs text-muted-foreground">{issue.impact}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommendations */}
                        {executiveSummary.recommendations.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-3">Recommendations</h4>
                            <div className="space-y-2">
                              {executiveSummary.recommendations.map((rec, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-primary/5">
                                  <div className={cn(
                                    'px-2 py-0.5 text-xs font-medium rounded',
                                    rec.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                                    rec.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                                    'bg-blue-500/10 text-blue-500'
                                  )}>
                                    {rec.priority}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm">{rec.action}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{rec.expected_impact}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Correlation Chains */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-primary" />
                        Cross-Domain Correlation Chains
                      </CardTitle>
                      <CardDescription>
                        Causal relationships between failures across different test domains
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!correlationsData?.correlations || correlationsData.correlations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No cross-domain correlations detected.</p>
                          <p className="text-sm">Run more tests across different domains to enable correlation analysis.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Domain Breakdown */}
                          <div className="grid grid-cols-6 gap-2 mb-4">
                            {Object.entries(correlationsData.domain_breakdown).map(([domain, count]) => (
                              <div key={domain} className="p-2 rounded-lg bg-muted/50 text-center">
                                <div className="mb-1">
                                  {domain === 'api' && <Server className="h-4 w-4 mx-auto text-blue-500" />}
                                  {domain === 'ui' && <Layers className="h-4 w-4 mx-auto text-purple-500" />}
                                  {domain === 'db' && <Database className="h-4 w-4 mx-auto text-green-500" />}
                                  {domain === 'infra' && <Server className="h-4 w-4 mx-auto text-orange-500" />}
                                  {domain === 'performance' && <Gauge className="h-4 w-4 mx-auto text-yellow-500" />}
                                  {domain === 'security' && <Shield className="h-4 w-4 mx-auto text-red-500" />}
                                </div>
                                <div className="text-sm font-medium">{count}</div>
                                <div className="text-xs text-muted-foreground capitalize">{domain}</div>
                              </div>
                            ))}
                          </div>

                          {/* Correlation Cards */}
                          {correlationsData.correlations.map((correlation) => (
                            <div
                              key={correlation.id}
                              className={cn(
                                'p-4 rounded-lg border',
                                correlation.severity === 'critical' && 'border-red-500/30 bg-red-500/5',
                                correlation.severity === 'high' && 'border-orange-500/30 bg-orange-500/5'
                              )}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{correlation.title}</span>
                                    <Badge variant={
                                      correlation.severity === 'critical' ? 'error' :
                                      correlation.severity === 'high' ? 'warning' : 'info'
                                    }>
                                      {correlation.severity}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {(correlation.confidence * 100).toFixed(0)}% confidence
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{correlation.summary}</p>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold">{correlation.affected_test_count}</div>
                                  <div className="text-xs text-muted-foreground">tests affected</div>
                                </div>
                              </div>

                              {/* Chain Visualization */}
                              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 overflow-x-auto">
                                {correlation.chain_steps.map((step, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <div className={cn(
                                      'flex-shrink-0 p-2 rounded-lg',
                                      step.domain === 'api' && 'bg-blue-500/10',
                                      step.domain === 'ui' && 'bg-purple-500/10',
                                      step.domain === 'db' && 'bg-green-500/10',
                                      step.domain === 'infra' && 'bg-orange-500/10',
                                      step.domain === 'performance' && 'bg-yellow-500/10',
                                      step.domain === 'security' && 'bg-red-500/10'
                                    )}>
                                      <div className="flex items-center gap-2">
                                        {step.domain === 'api' && <Server className="h-4 w-4 text-blue-500" />}
                                        {step.domain === 'ui' && <Layers className="h-4 w-4 text-purple-500" />}
                                        {step.domain === 'db' && <Database className="h-4 w-4 text-green-500" />}
                                        {step.domain === 'infra' && <Server className="h-4 w-4 text-orange-500" />}
                                        {step.domain === 'performance' && <Gauge className="h-4 w-4 text-yellow-500" />}
                                        {step.domain === 'security' && <Shield className="h-4 w-4 text-red-500" />}
                                        <span className="text-xs font-medium capitalize">{step.domain}</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate">
                                        {step.description}
                                      </div>
                                    </div>
                                    {idx < correlation.chain_steps.length - 1 && (
                                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Suggested Fixes */}
                              {correlation.suggested_fixes.length > 0 && (
                                <div className="mt-3">
                                  <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2">
                                    <Lightbulb className="h-3 w-3" />
                                    Suggested Fixes
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {correlation.suggested_fixes.slice(0, 3).map((fix, idx) => (
                                      <span key={idx} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                                        {fix}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Top Chain Patterns */}
                          {correlationsData.top_chain_patterns.length > 0 && (
                            <div className="p-4 rounded-lg bg-muted/30">
                              <h4 className="text-sm font-medium mb-3">Most Common Patterns</h4>
                              <div className="space-y-2">
                                {correlationsData.top_chain_patterns.map((pattern, idx) => (
                                  <div key={idx} className="flex items-center justify-between">
                                    <code className="text-xs px-2 py-1 rounded bg-muted">{pattern.pattern}</code>
                                    <div className="flex items-center gap-4">
                                      <span className="text-sm">{pattern.count} occurrences</span>
                                      <span className="text-xs text-muted-foreground">
                                        avg impact: {pattern.avg_impact_score.toFixed(1)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Proactive Alerts */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        Proactive Alerts
                        {alertsData?.critical_count ? (
                          <Badge variant="error">{alertsData.critical_count} critical</Badge>
                        ) : null}
                      </CardTitle>
                      <CardDescription>
                        Predicted issues based on trend analysis before they cause failures
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!alertsData?.alerts || alertsData.alerts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                          <p>No concerning trends detected.</p>
                          <p className="text-sm">Your test suite health appears stable.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {alertsData.alerts.map((alert) => (
                            <div
                              key={alert.id}
                              className={cn(
                                'p-4 rounded-lg border',
                                alert.severity === 'critical' && 'border-red-500/30 bg-red-500/5',
                                alert.severity === 'high' && 'border-orange-500/30 bg-orange-500/5',
                                alert.severity === 'medium' && 'border-yellow-500/30 bg-yellow-500/5'
                              )}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {alert.alert_type === 'trend' && <TrendingUp className="h-5 w-5 text-orange-500" />}
                                  {alert.alert_type === 'anomaly' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                                  {alert.alert_type === 'prediction' && <Lightbulb className="h-5 w-5 text-blue-500" />}
                                  {alert.alert_type === 'threshold' && <AlertCircle className="h-5 w-5 text-red-500" />}
                                  <span className="font-medium">{alert.title}</span>
                                  <Badge variant={
                                    alert.severity === 'critical' ? 'error' :
                                    alert.severity === 'high' ? 'warning' : 'info'
                                  }>
                                    {alert.severity}
                                  </Badge>
                                  <Badge variant="outline" className="capitalize">{alert.domain.replace('_', ' ')}</Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {(alert.confidence * 100).toFixed(0)}% confidence
                                </span>
                              </div>

                              <p className="text-sm text-muted-foreground mb-3">{alert.description}</p>

                              <div className="flex items-center gap-4 mb-3">
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span>Time to impact: <strong>{alert.time_to_impact}</strong></span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {alert.predicted_impact}
                                </div>
                              </div>

                              {/* Trend Data Visualization (if available) */}
                              {alert.trend_data.length > 0 && (
                                <div className="p-3 rounded-lg bg-muted/50 mb-3">
                                  <div className="flex items-end gap-1 h-12">
                                    {alert.trend_data.slice(-10).map((point, idx) => (
                                      <div
                                        key={idx}
                                        className={cn(
                                          'flex-1 rounded-t',
                                          point.threshold && point.value > point.threshold ? 'bg-red-500' : 'bg-primary/50'
                                        )}
                                        style={{ height: `${Math.min(100, (point.value / (Math.max(...alert.trend_data.map(p => p.value)) || 1)) * 100)}%` }}
                                        title={`${point.date}: ${point.value.toFixed(1)}`}
                                      />
                                    ))}
                                  </div>
                                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>{alert.trend_data[0]?.date}</span>
                                    <span>{alert.trend_data[alert.trend_data.length - 1]?.date}</span>
                                  </div>
                                </div>
                              )}

                              {/* Recommended Actions */}
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-2">Recommended Actions</div>
                                <div className="space-y-1">
                                  {alert.recommended_actions.slice(0, 3).map((action, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                      <ChevronRight className="h-3 w-3 text-primary" />
                                      {action}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Alert Summary */}
                          <div className="p-4 rounded-lg bg-muted/30">
                            <div className="text-sm text-muted-foreground">{alertsData.analysis_summary}</div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
