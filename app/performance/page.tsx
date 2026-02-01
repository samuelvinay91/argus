'use client';

import { useState, useMemo } from 'react';
import { safeFormatDistanceToNow } from '@/lib/utils';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Play,
  Gauge,
  Clock,
  MousePointer,
  Move,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Info,
  Smartphone,
  Monitor,
  Lightbulb,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { useProjects } from '@/lib/hooks/use-projects';
import {
  usePerformanceMetrics,
  useRunPerformanceTest,
  getLCPGrade,
  getFIDGrade,
  getCLSGrade,
  getGradeLetter,
  getGradeColor,
  type PerformanceIssue,
} from '@/lib/hooks/use-performance';
import { Badge } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { NoProjectsEmptyState } from '@/components/ui/empty-state';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Core Web Vital Gauge Component
function VitalGauge({
  label,
  value,
  unit,
  grade,
  thresholds,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  unit: string;
  grade: 'good' | 'needs_work' | 'poor';
  thresholds: { good: string; needsWork: string };
  icon: React.ElementType;
}) {
  const gradeColors = {
    good: 'text-success border-success bg-success/10',
    needs_work: 'text-warning border-warning bg-warning/10',
    poor: 'text-error border-error bg-error/10',
  };

  const gradeLabels = {
    good: 'Good',
    needs_work: 'Needs Improvement',
    poor: 'Poor',
  };

  const displayValue = value !== null
    ? unit === 's' ? (value / 1000).toFixed(2) : value.toFixed(unit === '' ? 3 : 0)
    : '-';

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="font-medium text-sm">{label}</span>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-bold">{displayValue}</span>
        <span className="text-muted-foreground">{unit}</span>
      </div>
      <div className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border', gradeColors[grade])}>
        {gradeLabels[grade]}
      </div>
      <div className="mt-3 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span>Good: {thresholds.good}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-warning" />
          <span>Needs work: {thresholds.needsWork}</span>
        </div>
      </div>
    </div>
  );
}

// Performance Score Card
function PerformanceScoreCard({
  score,
  title,
  subtitle,
}: {
  score: number | null;
  title: string;
  subtitle?: string;
}) {
  const letter = getGradeLetter(score);
  const color = getGradeColor(score);

  return (
    <div className="p-4 rounded-lg border bg-card text-center">
      <div className={cn('text-5xl font-bold mb-2', color)}>{letter}</div>
      <div className="text-2xl font-semibold mb-1">{score ?? '-'}</div>
      <div className="text-sm font-medium">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
    </div>
  );
}

// Trend Indicator
function TrendIndicator({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null) return <Minus className="h-4 w-4 text-muted-foreground" />;

  const diff = current - previous;
  const percentChange = previous !== 0 ? ((diff / previous) * 100).toFixed(1) : '0';

  if (Math.abs(diff) < 0.01) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }

  // For performance scores, higher is better
  // For metrics like LCP, lower is better
  return diff > 0 ? (
    <div className="flex items-center gap-1 text-error">
      <TrendingUp className="h-4 w-4" />
      <span className="text-xs">+{percentChange}%</span>
    </div>
  ) : (
    <div className="flex items-center gap-1 text-success">
      <TrendingDown className="h-4 w-4" />
      <span className="text-xs">{percentChange}%</span>
    </div>
  );
}

// Issue Card
function IssueCard({ issue }: { issue: PerformanceIssue }) {
  const severityColors = {
    critical: 'border-error bg-error/5',
    high: 'border-warning bg-warning/5',
    medium: 'border-info bg-info/5',
    low: 'border-muted bg-muted/5',
  };

  const severityIcons = {
    critical: AlertTriangle,
    high: AlertTriangle,
    medium: Info,
    low: Info,
  };

  const SeverityIcon = severityIcons[issue.severity];

  return (
    <div className={cn('p-4 rounded-lg border', severityColors[issue.severity])}>
      <div className="flex items-start gap-3">
        <SeverityIcon className={cn(
          'h-5 w-5 mt-0.5',
          issue.severity === 'critical' ? 'text-error' :
          issue.severity === 'high' ? 'text-warning' :
          'text-info'
        )} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{issue.title}</span>
            <Badge variant={
              issue.severity === 'critical' ? 'error' :
              issue.severity === 'high' ? 'warning' :
              'info'
            }>
              {issue.severity}
            </Badge>
            {issue.savings_ms && issue.savings_ms > 0 && (
              <span className="text-xs text-success">
                Save {issue.savings_ms}ms
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">{issue.description}</p>
          {issue.fix_suggestion && (
            <div className="flex items-start gap-2 text-sm text-primary">
              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{issue.fix_suggestion}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Custom Tooltip for Charts
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-foreground mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-medium">
                {entry.name === 'CLS' ? entry.value.toFixed(3) : `${entry.value.toFixed(0)}ms`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export default function PerformancePage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [testUrl, setTestUrl] = useState('');
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');

  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const currentProject = selectedProjectId || projects[0]?.id;
  const currentProjectData = projects.find((p) => p.id === currentProject);

  const { latestTest, trends, allTests, averages, isLoading: metricsLoading } = usePerformanceMetrics(currentProject || null);
  const runTest = useRunPerformanceTest();

  const effectiveUrl = testUrl || currentProjectData?.app_url || 'https://example.com';

  const handleRunTest = async () => {
    if (!currentProject) return;
    try {
      await runTest.mutateAsync({
        projectId: currentProject,
        url: effectiveUrl,
        device,
      });
    } catch (error) {
      console.error('Failed to run performance test:', error);
    }
  };

  const isRunning = runTest.isPending;
  const isLoading = projectsLoading || metricsLoading;

  // Get previous test for trend comparison
  const previousTest = allTests.length > 1 ? allTests[1] : null;

  // Transform trends for chart - scale CLS for visibility
  const chartData = useMemo(() => {
    return trends.map(t => ({
      ...t,
      cls_scaled: t.cls * 1000, // Scale CLS for chart visibility
    }));
  }, [trends]);

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
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Performance</h1>
          </div>

          <select
            value={currentProject || ''}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>

          {latestTest && (
            <div className="text-sm text-muted-foreground">
              Last test: {safeFormatDistanceToNow(latestTest.created_at, { addSuffix: true })}
            </div>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-2 p-1 rounded-lg border bg-muted/30">
            <button
              onClick={() => setDevice('mobile')}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors',
                device === 'mobile' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Smartphone className="h-4 w-4" />
              Mobile
            </button>
            <button
              onClick={() => setDevice('desktop')}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors',
                device === 'desktop' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Monitor className="h-4 w-4" />
              Desktop
            </button>
          </div>

          <Input
            value={effectiveUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="URL to test"
            className="w-64 h-9"
          />

          <Button size="sm" onClick={handleRunTest} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Test
              </>
            )}
          </Button>
        </header>

        <div className="p-6 space-y-6">
          {/* Performance Score Overview */}
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2 p-6 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Performance Score</h2>
                  <p className="text-sm text-muted-foreground">Overall Lighthouse score</p>
                </div>
                {previousTest && (
                  <TrendIndicator
                    current={latestTest?.performance_score ?? null}
                    previous={previousTest?.performance_score ?? null}
                  />
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className={cn('text-7xl font-bold', getGradeColor(latestTest?.performance_score ?? null))}>
                  {getGradeLetter(latestTest?.performance_score ?? null)}
                </div>
                <div>
                  <div className="text-4xl font-bold">{latestTest?.performance_score ?? '-'}</div>
                  <div className="text-muted-foreground">out of 100</div>
                  {latestTest?.summary && (
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                      {latestTest.summary}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <PerformanceScoreCard
              score={latestTest?.accessibility_score ?? null}
              title="Accessibility"
            />
            <PerformanceScoreCard
              score={latestTest?.best_practices_score ?? null}
              title="Best Practices"
            />
            <PerformanceScoreCard
              score={latestTest?.seo_score ?? null}
              title="SEO"
            />
          </div>

          {/* Core Web Vitals */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Core Web Vitals</h3>
                <p className="text-sm text-muted-foreground">Key metrics that affect user experience</p>
              </div>
              <a
                href="https://web.dev/vitals/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Learn more
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <VitalGauge
                label="LCP (Largest Contentful Paint)"
                value={latestTest?.lcp_ms ?? null}
                unit="s"
                grade={getLCPGrade(latestTest?.lcp_ms ?? null)}
                thresholds={{ good: '< 2.5s', needsWork: '2.5s - 4s' }}
                icon={Clock}
              />
              <VitalGauge
                label="FID (First Input Delay)"
                value={latestTest?.fid_ms ?? null}
                unit="ms"
                grade={getFIDGrade(latestTest?.fid_ms ?? null)}
                thresholds={{ good: '< 100ms', needsWork: '100ms - 300ms' }}
                icon={MousePointer}
              />
              <VitalGauge
                label="CLS (Cumulative Layout Shift)"
                value={latestTest?.cls ?? null}
                unit=""
                grade={getCLSGrade(latestTest?.cls ?? null)}
                thresholds={{ good: '< 0.1', needsWork: '0.1 - 0.25' }}
                icon={Move}
              />
            </div>
          </div>

          {/* Additional Metrics */}
          {latestTest && (
            <div className="grid grid-cols-6 gap-4">
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-sm text-muted-foreground mb-1">TTFB</div>
                <div className="text-xl font-bold">
                  {latestTest.ttfb_ms ? `${latestTest.ttfb_ms}ms` : '-'}
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-sm text-muted-foreground mb-1">FCP</div>
                <div className="text-xl font-bold">
                  {latestTest.fcp_ms ? `${(latestTest.fcp_ms / 1000).toFixed(2)}s` : '-'}
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-sm text-muted-foreground mb-1">Speed Index</div>
                <div className="text-xl font-bold">
                  {latestTest.speed_index ? `${(latestTest.speed_index / 1000).toFixed(2)}s` : '-'}
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-sm text-muted-foreground mb-1">TTI</div>
                <div className="text-xl font-bold">
                  {latestTest.tti_ms ? `${(latestTest.tti_ms / 1000).toFixed(2)}s` : '-'}
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-sm text-muted-foreground mb-1">TBT</div>
                <div className="text-xl font-bold">
                  {latestTest.tbt_ms ? `${latestTest.tbt_ms}ms` : '-'}
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-sm text-muted-foreground mb-1">Load Time</div>
                <div className="text-xl font-bold">
                  {latestTest.load_time_ms ? `${(latestTest.load_time_ms / 1000).toFixed(2)}s` : '-'}
                </div>
              </div>
            </div>
          )}

          {/* Core Web Vitals Trend Chart */}
          {trends.length > 0 && (
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Core Web Vitals Trend</h3>
                  <p className="text-sm text-muted-foreground">Performance over time (last 30 days)</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRunTest}
                  disabled={isRunning}
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', isRunning && 'animate-spin')} />
                  Refresh
                </Button>
              </div>

              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="lcp_ms"
                      name="LCP (ms)"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="fid_ms"
                      name="FID (ms)"
                      stroke="hsl(var(--warning))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="cls_scaled"
                      name="CLS (x1000)"
                      stroke="hsl(var(--info))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {latestTest?.recommendations && latestTest.recommendations.length > 0 && (
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Recommendations</h3>
              </div>
              <ul className="space-y-2">
                {latestTest.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Performance Issues */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-warning" />
              <h3 className="font-semibold">
                Performance Issues ({latestTest?.issues?.length || 0})
              </h3>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : latestTest?.issues && latestTest.issues.length > 0 ? (
              <div className="space-y-3">
                {latestTest.issues.map((issue, index) => (
                  <IssueCard key={index} issue={issue} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {latestTest ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="h-8 w-8 text-success" />
                    <span>No performance issues found!</span>
                  </div>
                ) : (
                  'Run a performance test to identify optimization opportunities.'
                )}
              </div>
            )}
          </div>

          {/* Recent Tests History */}
          {allTests.length > 0 && (
            <div className="p-4 rounded-lg border bg-card">
              <h3 className="font-semibold mb-4">Recent Tests</h3>
              <div className="space-y-2">
                {allTests.slice(0, 5).map((test) => (
                  <div key={test.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg',
                        getGradeColor(test.performance_score)
                      )}>
                        {getGradeLetter(test.performance_score)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{test.url}</div>
                        <div className="text-xs text-muted-foreground">
                          {safeFormatDistanceToNow(test.created_at, { addSuffix: true })}
                          {' - '}
                          {test.device === 'mobile' ? 'Mobile' : 'Desktop'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-muted-foreground text-xs">LCP</div>
                        <div className={cn(
                          'font-medium',
                          getLCPGrade(test.lcp_ms) === 'good' ? 'text-success' :
                          getLCPGrade(test.lcp_ms) === 'needs_work' ? 'text-warning' : 'text-error'
                        )}>
                          {test.lcp_ms ? `${(test.lcp_ms / 1000).toFixed(2)}s` : '-'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground text-xs">FID</div>
                        <div className={cn(
                          'font-medium',
                          getFIDGrade(test.fid_ms) === 'good' ? 'text-success' :
                          getFIDGrade(test.fid_ms) === 'needs_work' ? 'text-warning' : 'text-error'
                        )}>
                          {test.fid_ms ? `${test.fid_ms}ms` : '-'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground text-xs">CLS</div>
                        <div className={cn(
                          'font-medium',
                          getCLSGrade(test.cls) === 'good' ? 'text-success' :
                          getCLSGrade(test.cls) === 'needs_work' ? 'text-warning' : 'text-error'
                        )}>
                          {test.cls?.toFixed(3) ?? '-'}
                        </div>
                      </div>
                      <Badge variant={
                        test.status === 'completed' ? 'success' :
                        test.status === 'running' ? 'warning' :
                        test.status === 'failed' ? 'error' : 'default'
                      }>
                        {test.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
