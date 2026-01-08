'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Settings,
  Play,
  Compass,
  Eye,
  Shield,
  TestTube,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Loader2,
  Globe,
  BarChart3,
  Trash2,
  Edit,
  Save,
  X,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LiveSessionViewer } from '@/components/shared/live-session-viewer';
import { useProject, useUpdateProject, useDeleteProject } from '@/lib/hooks/use-projects';
import { useTests, useTestRuns } from '@/lib/hooks/use-tests';
import { useDiscoverySessions, useDiscoveredPages } from '@/lib/hooks/use-discovery';
import { useVisualBaselines, useVisualComparisons } from '@/lib/hooks/use-visual';
import { useQualityAudits } from '@/lib/hooks/use-quality';
import { useActiveSessions, useActivityStream, type ActivityLog, type LiveSession } from '@/lib/hooks/use-live-session';
import { cn } from '@/lib/utils';

type TabId = 'overview' | 'tests' | 'discovery' | 'visual' | 'quality' | 'activity' | 'settings';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'tests', label: 'Tests', icon: TestTube },
  { id: 'discovery', label: 'Discovery', icon: Compass },
  { id: 'visual', label: 'Visual', icon: Eye },
  { id: 'quality', label: 'Quality', icon: Shield },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const { data: project, isLoading } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Project not found</h2>
            <p className="text-muted-foreground mb-4">
              The project you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button onClick={() => router.push('/projects')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
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
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="px-6 py-4">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/projects')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-semibold">{project.name}</h1>
                <a
                  href={project.app_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  {project.app_url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab projectId={projectId} appUrl={project.app_url} />}
          {activeTab === 'tests' && <TestsTab projectId={projectId} />}
          {activeTab === 'discovery' && <DiscoveryTab projectId={projectId} />}
          {activeTab === 'visual' && <VisualTab projectId={projectId} />}
          {activeTab === 'quality' && <QualityTab projectId={projectId} />}
          {activeTab === 'activity' && <ActivityTab projectId={projectId} />}
          {activeTab === 'settings' && <SettingsTab project={project} />}
        </div>
      </main>
    </div>
  );
}

// Overview Tab
function OverviewTab({ projectId, appUrl }: { projectId: string; appUrl: string }) {
  const router = useRouter();
  const { data: tests = [] } = useTests(projectId);
  const { data: testRuns = [] } = useTestRuns(projectId, 10);
  const { data: baselines = [] } = useVisualBaselines(projectId);

  const stats = useMemo(() => {
    const passedRuns = testRuns.filter((r) => r.status === 'passed').length;
    const passRate = testRuns.length > 0 ? (passedRuns / testRuns.length) * 100 : 0;
    return {
      tests: tests.length,
      passRate: passRate.toFixed(0),
      baselines: baselines.length,
      recentRuns: testRuns.length,
    };
  }, [tests, testRuns, baselines]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={TestTube}
          label="Tests"
          value={stats.tests.toString()}
          trend={null}
        />
        <StatCard
          icon={CheckCircle2}
          label="Pass Rate"
          value={`${stats.passRate}%`}
          trend={Number(stats.passRate) >= 90 ? 'up' : Number(stats.passRate) >= 70 ? 'neutral' : 'down'}
        />
        <StatCard
          icon={Eye}
          label="Visual Baselines"
          value={stats.baselines.toString()}
          trend={null}
        />
        <StatCard
          icon={Activity}
          label="Recent Runs"
          value={stats.recentRuns.toString()}
          trend={null}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="border rounded-lg p-5">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => router.push('/tests')}
            >
              <Play className="h-5 w-5" />
              <span>Run Tests</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => router.push('/discovery')}
            >
              <Compass className="h-5 w-5" />
              <span>Start Discovery</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => router.push('/visual')}
            >
              <Eye className="h-5 w-5" />
              <span>Visual Test</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => router.push('/quality')}
            >
              <Shield className="h-5 w-5" />
              <span>Quality Audit</span>
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="border rounded-lg p-5">
          <h3 className="font-semibold mb-4">Recent Test Runs</h3>
          {testRuns.length > 0 ? (
            <div className="space-y-3">
              {testRuns.slice(0, 5).map((run) => (
                <div
                  key={run.id}
                  className="flex items-center gap-3 p-2 rounded-md bg-muted/30"
                >
                  {run.status === 'passed' ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : run.status === 'failed' ? (
                    <XCircle className="h-4 w-4 text-error" />
                  ) : (
                    <Clock className="h-4 w-4 text-warning" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{run.name || 'Test Run'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={cn(
                    'text-xs font-medium capitalize px-2 py-1 rounded',
                    run.status === 'passed' && 'bg-success/10 text-success',
                    run.status === 'failed' && 'bg-error/10 text-error',
                    run.status === 'running' && 'bg-info/10 text-info'
                  )}>
                    {run.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No test runs yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  trend: 'up' | 'down' | 'neutral' | null;
}) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

// Tests Tab
function TestsTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data: tests = [], isLoading } = useTests(projectId);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Tests ({tests.length})</h3>
        <Button size="sm" onClick={() => router.push('/tests')}>
          <TestTube className="h-4 w-4 mr-2" />
          Manage Tests
        </Button>
      </div>
      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </div>
      ) : tests.length > 0 ? (
        <div className="space-y-2">
          {tests.map((test) => (
            <div key={test.id} className="border rounded-lg p-4 flex items-center gap-4">
              <TestTube className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">{test.name}</p>
                <p className="text-sm text-muted-foreground">
                  {Array.isArray(test.steps) ? test.steps.length : 0} steps
                </p>
              </div>
              <span className={cn(
                'text-xs px-2 py-1 rounded capitalize',
                test.priority === 'critical' && 'bg-error/10 text-error',
                test.priority === 'high' && 'bg-warning/10 text-warning',
                test.priority === 'medium' && 'bg-info/10 text-info',
                test.priority === 'low' && 'bg-muted text-muted-foreground'
              )}>
                {test.priority}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <TestTube className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No tests created yet</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => router.push('/tests')}
          >
            Create your first test
          </Button>
        </div>
      )}
    </div>
  );
}

// Discovery Tab
function DiscoveryTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data: sessions = [], isLoading } = useDiscoverySessions(projectId);
  const { data: pages = [] } = useDiscoveredPages(projectId);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Discovery Sessions ({sessions.length})</h3>
        <Button size="sm" onClick={() => router.push('/discovery')}>
          <Compass className="h-4 w-4 mr-2" />
          Start Discovery
        </Button>
      </div>
      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </div>
      ) : sessions.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-2xl font-bold">{pages.length}</p>
              <p className="text-sm text-muted-foreground">Pages Discovered</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-2xl font-bold">{sessions.length}</p>
              <p className="text-sm text-muted-foreground">Sessions Run</p>
            </div>
          </div>
          {sessions.slice(0, 5).map((session) => (
            <div key={session.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className={cn(
                  'text-xs px-2 py-1 rounded capitalize',
                  session.status === 'completed' && 'bg-success/10 text-success',
                  session.status === 'failed' && 'bg-error/10 text-error',
                  session.status === 'running' && 'bg-info/10 text-info'
                )}>
                  {session.status}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm mt-2">
                Found {session.pages_found || 0} pages, {session.flows_found || 0} flows
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Compass className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No discoveries yet</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => router.push('/discovery')}
          >
            Start your first discovery
          </Button>
        </div>
      )}
    </div>
  );
}

// Visual Tab
function VisualTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data: baselines = [], isLoading } = useVisualBaselines(projectId);
  const { data: comparisons = [] } = useVisualComparisons(projectId, 10);

  const mismatches = comparisons.filter((c) => c.status === 'mismatch').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Visual Testing</h3>
        <Button size="sm" onClick={() => router.push('/visual')}>
          <Eye className="h-4 w-4 mr-2" />
          Run Visual Test
        </Button>
      </div>
      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </div>
      ) : baselines.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-2xl font-bold">{baselines.length}</p>
              <p className="text-sm text-muted-foreground">Baselines</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-2xl font-bold">{comparisons.length}</p>
              <p className="text-sm text-muted-foreground">Comparisons</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-2xl font-bold text-error">{mismatches}</p>
              <p className="text-sm text-muted-foreground">Mismatches</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No visual baselines yet</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => router.push('/visual')}
          >
            Create your first baseline
          </Button>
        </div>
      )}
    </div>
  );
}

// Quality Tab
function QualityTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data: audits = [], isLoading } = useQualityAudits(projectId, 10);

  const latestAudit = audits[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Quality Audits</h3>
        <Button size="sm" onClick={() => router.push('/quality')}>
          <Shield className="h-4 w-4 mr-2" />
          Run Audit
        </Button>
      </div>
      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </div>
      ) : latestAudit ? (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <ScoreCard label="Performance" score={latestAudit.performance_score} />
            <ScoreCard label="Accessibility" score={latestAudit.accessibility_score} />
            <ScoreCard label="Best Practices" score={latestAudit.best_practices_score} />
            <ScoreCard label="SEO" score={latestAudit.seo_score} />
          </div>
          <p className="text-sm text-muted-foreground">
            Last audit: {formatDistanceToNow(new Date(latestAudit.created_at), { addSuffix: true })}
          </p>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No audits yet</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => router.push('/quality')}
          >
            Run your first audit
          </Button>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number | null }) {
  const getColor = (s: number | null) => {
    if (s === null) return 'text-muted-foreground';
    if (s >= 90) return 'text-success';
    if (s >= 70) return 'text-warning';
    return 'text-error';
  };

  return (
    <div className="border rounded-lg p-4 text-center">
      <p className={cn('text-2xl font-bold', getColor(score))}>
        {score !== null ? score : '-'}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// Activity Tab
function ActivityTab({ projectId }: { projectId: string }) {
  const { data: activeSessions = [], isLoading } = useActiveSessions(projectId);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);

  // Auto-select the first active session
  React.useEffect(() => {
    if (activeSessions.length > 0 && !selectedSession) {
      setSelectedSession(activeSessions[0]);
    }
  }, [activeSessions, selectedSession]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            Active Sessions ({activeSessions.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={cn(
                  'border rounded-lg p-4 text-left transition-all hover:shadow-md',
                  selectedSession?.id === session.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-primary animate-pulse" />
                  <span className="font-medium capitalize">
                    {session.session_type.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Step {session.completed_steps}/{session.total_steps || '?'}
                </div>
                {session.current_step && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {session.current_step}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Logs */}
      <div>
        <h3 className="font-semibold mb-4">Recent Activity</h3>
        <RecentActivityList projectId={projectId} />
      </div>

      {/* Live Session Viewer */}
      {selectedSession && (
        <LiveSessionViewer
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}

// Recent Activity List Component
function RecentActivityList({ projectId }: { projectId: string }) {
  const supabase = require('@/lib/supabase/client').getSupabaseClient();
  const [activities, setActivities] = React.useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchActivities = async () => {
      const { data, error } = await (supabase.from('activity_logs') as any)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setActivities(data);
      }
      setIsLoading(false);
    };

    fetchActivities();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`activity-project-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `project_id=eq.${projectId}`,
        },
        (payload: any) => {
          setActivities((prev) => [payload.new as ActivityLog, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, supabase]);

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No activity yet</p>
        <p className="text-sm">Activity will appear here when you run tests, discovery, or audits</p>
      </div>
    );
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'started':
        return <Activity className="h-4 w-4 text-info" />;
      case 'step':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'thinking':
        return <Clock className="h-4 w-4 text-primary animate-pulse" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-error" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className={cn(
            'border rounded-lg p-3 flex items-start gap-3',
            activity.event_type === 'error' && 'border-error/50 bg-error/5',
            activity.event_type === 'completed' && 'border-success/50 bg-success/5'
          )}
        >
          {getEventIcon(activity.event_type)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{activity.title}</span>
              <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 bg-muted rounded">
                {activity.activity_type.replace('_', ' ')}
              </span>
            </div>
            {activity.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {activity.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Settings Tab
function SettingsTab({ project }: { project: any }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [url, setUrl] = useState(project.app_url);
  const [description, setDescription] = useState(project.description || '');

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const handleSave = async () => {
    try {
      await updateProject.mutateAsync({
        id: project.id,
        name,
        app_url: url,
        description: description || null,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone and will delete all associated tests, discoveries, and visual baselines.')) {
      await deleteProject.mutateAsync(project.id);
      router.push('/projects');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold">Project Settings</h3>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateProject.isPending}>
                {updateProject.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Project Name</label>
            {isEditing ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-muted-foreground">{project.name}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Application URL</label>
            {isEditing ? (
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-muted-foreground">{project.app_url}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            {isEditing ? (
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            ) : (
              <p className="mt-1 text-muted-foreground">
                {project.description || 'No description'}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Created</label>
            <p className="mt-1 text-muted-foreground">
              {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border border-error/50 rounded-lg p-6 mt-6">
        <h3 className="font-semibold text-error mb-2">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Deleting this project will permanently remove all tests, discoveries, visual baselines, and audit history.
        </p>
        <Button
          variant="outline"
          className="border-error text-error hover:bg-error hover:text-white"
          onClick={handleDelete}
          disabled={deleteProject.isPending}
        >
          {deleteProject.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 mr-2" />
          )}
          Delete Project
        </Button>
      </div>
    </div>
  );
}
