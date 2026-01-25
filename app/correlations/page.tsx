'use client';

import { useState, useMemo } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  AlertTriangle,
  GitCommit,
  GitPullRequest,
  Rocket,
  Bug,
  AlertCircle,
  Search,
  Activity,
  TrendingUp,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
  Lightbulb,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Zap,
  Network,
  Link2,
  Sparkles,
  RefreshCcw,
} from 'lucide-react';
import { useProjects } from '@/lib/hooks/use-projects';
import {
  useCorrelationTimeline,
  useCorrelationStats,
  useCorrelationInsights,
  useCorrelationEvent,
  useRootCauseAnalysis,
  useCommitImpact,
  useNLQuery,
  useAcknowledgeInsight,
  useResolveInsight,
  useDismissInsight,
  type SDLCEvent,
  type SDLCEventType,
  type CorrelationInsight,
  type InsightStatus,
} from '@/lib/hooks/use-correlations';
import { cn } from '@/lib/utils';
import { NoProjectsEmptyState } from '@/components/ui/empty-state';

// ============================================================================
// Event Type Helpers
// ============================================================================

const eventTypeConfig: Record<SDLCEventType, { icon: typeof GitCommit; color: string; label: string }> = {
  requirement: { icon: MessageSquare, color: 'text-blue-500 bg-blue-500/10', label: 'Requirement' },
  pr: { icon: GitPullRequest, color: 'text-purple-500 bg-purple-500/10', label: 'Pull Request' },
  commit: { icon: GitCommit, color: 'text-green-500 bg-green-500/10', label: 'Commit' },
  build: { icon: Zap, color: 'text-yellow-500 bg-yellow-500/10', label: 'Build' },
  test_run: { icon: CheckCircle2, color: 'text-cyan-500 bg-cyan-500/10', label: 'Test Run' },
  deploy: { icon: Rocket, color: 'text-indigo-500 bg-indigo-500/10', label: 'Deploy' },
  error: { icon: Bug, color: 'text-red-500 bg-red-500/10', label: 'Error' },
  incident: { icon: AlertCircle, color: 'text-orange-500 bg-orange-500/10', label: 'Incident' },
  feature_flag: { icon: Activity, color: 'text-pink-500 bg-pink-500/10', label: 'Feature Flag' },
  session: { icon: Activity, color: 'text-gray-500 bg-gray-500/10', label: 'Session' },
};

function getEventIcon(eventType: SDLCEventType) {
  const config = eventTypeConfig[eventType] || eventTypeConfig.commit;
  const Icon = config.icon;
  return <Icon className={cn('h-4 w-4', config.color.split(' ')[0])} />;
}

// ============================================================================
// Event Card Component
// ============================================================================

function EventCard({
  event,
  onClick,
}: {
  event: SDLCEvent;
  onClick: () => void;
}) {
  const config = eventTypeConfig[event.event_type] || eventTypeConfig.commit;
  const Icon = config.icon;

  return (
    <div
      className="group flex items-start gap-4 p-4 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-accent/50 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className={cn('flex-shrink-0 p-2 rounded-lg', config.color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs">
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {event.source_platform}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(event.occurred_at), { addSuffix: true })}
          </span>
        </div>
        <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
          {event.title || event.external_id}
        </h4>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          {event.commit_sha && (
            <span className="font-mono">{event.commit_sha.slice(0, 7)}</span>
          )}
          {event.pr_number && <span>PR #{event.pr_number}</span>}
          {event.jira_key && <span>{event.jira_key}</span>}
          {event.deploy_id && <span>Deploy {event.deploy_id.slice(0, 8)}</span>}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </div>
  );
}

// ============================================================================
// Timeline Component
// ============================================================================

function Timeline({
  events,
  onEventClick,
  isLoading,
}: {
  events: SDLCEvent[];
  onEventClick: (event: SDLCEvent) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-lg border border-border/50">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Network className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-lg mb-1">No events found</h3>
        <p className="text-sm text-muted-foreground">
          Connect integrations to start seeing SDLC events here.
        </p>
      </div>
    );
  }

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const date = format(new Date(event.occurred_at), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, SDLCEvent[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedEvents).map(([date, dateEvents]) => (
        <div key={date}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground font-medium">
              {format(new Date(date), 'EEEE, MMMM d, yyyy')}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-3">
            {dateEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => onEventClick(event)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Insight Card Component
// ============================================================================

function InsightCard({
  insight,
  onAcknowledge,
  onResolve,
  onDismiss,
}: {
  insight: CorrelationInsight;
  onAcknowledge: () => void;
  onResolve: () => void;
  onDismiss: () => void;
}) {
  const severityColors = {
    critical: 'border-red-500/50 bg-red-500/5',
    warning: 'border-yellow-500/50 bg-yellow-500/5',
    info: 'border-blue-500/50 bg-blue-500/5',
  };

  const severityBadge = {
    critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };

  return (
    <Card className={cn('border-l-4', severityColors[insight.severity])}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <Badge variant="outline" className={severityBadge[insight.severity]}>
              {insight.severity}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {insight.insight_type}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(insight.created_at), { addSuffix: true })}
          </span>
        </div>
        <CardTitle className="text-base">{insight.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{insight.description}</p>
        {insight.recommendations.length > 0 && (
          <div className="space-y-2 mb-4">
            {insight.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <ChevronRight className="h-4 w-4 text-primary mt-0.5" />
                <span>{rec.action}</span>
              </div>
            ))}
          </div>
        )}
        {insight.status === 'active' && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onAcknowledge}>
              Acknowledge
            </Button>
            <Button size="sm" variant="outline" onClick={onResolve}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Resolve
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              <XCircle className="h-4 w-4 mr-1" />
              Dismiss
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Event Detail Modal
// ============================================================================

function EventDetailModal({
  event,
  open,
  onOpenChange,
}: {
  event: SDLCEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: eventDetails, isLoading: detailsLoading } = useCorrelationEvent(
    open && event ? event.id : null
  );
  const { data: rootCause, isLoading: rootCauseLoading } = useRootCauseAnalysis(
    open && event && ['error', 'incident'].includes(event.event_type) ? event.id : null
  );
  const { data: impact, isLoading: impactLoading } = useCommitImpact(
    open && event?.commit_sha ? event.commit_sha : null
  );

  if (!event) return null;

  const config = eventTypeConfig[event.event_type] || eventTypeConfig.commit;
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', config.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{event.title || event.external_id}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{config.label}</Badge>
                <span>{event.source_platform}</span>
                <span>-</span>
                <span>{format(new Date(event.occurred_at), 'PPpp')}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Correlation Keys */}
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Correlation Keys
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {event.commit_sha && (
                <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                  <GitCommit className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-mono">{event.commit_sha.slice(0, 10)}</span>
                </div>
              )}
              {event.pr_number && (
                <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                  <GitPullRequest className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">PR #{event.pr_number}</span>
                </div>
              )}
              {event.jira_key && (
                <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{event.jira_key}</span>
                </div>
              )}
              {event.deploy_id && (
                <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                  <Rocket className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-mono">{event.deploy_id.slice(0, 12)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Correlated Events */}
          {detailsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : eventDetails?.correlations && eventDetails.correlations.length > 0 ? (
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Network className="h-4 w-4" />
                Correlated Events ({eventDetails.correlations.length})
              </h4>
              <div className="space-y-2">
                {eventDetails.correlations.slice(0, 5).map((corr) => (
                  <div key={corr.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-sm">{corr.correlation_type}</span>
                    <Badge variant="outline">{Math.round(corr.confidence * 100)}% confidence</Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Root Cause (for errors/incidents) */}
          {['error', 'incident'].includes(event.event_type) && (
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Root Cause Analysis
              </h4>
              {rootCauseLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : rootCause ? (
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-sm">{rootCause.analysis_summary}</p>
                  {rootCause.likely_root_cause && (
                    <div className="mt-2 flex items-center gap-2">
                      {getEventIcon(rootCause.likely_root_cause.event_type)}
                      <span className="text-sm font-medium">
                        {rootCause.likely_root_cause.title || rootCause.likely_root_cause.external_id}
                      </span>
                      <Badge variant="outline">
                        {Math.round(rootCause.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No root cause data available</p>
              )}
            </div>
          )}

          {/* Impact Analysis (for commits) */}
          {event.commit_sha && (
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Commit Impact
              </h4>
              {impactLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : impact ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Risk Score:</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        impact.risk_score > 0.7 ? 'border-red-500 text-red-500' :
                        impact.risk_score > 0.4 ? 'border-yellow-500 text-yellow-500' :
                        'border-green-500 text-green-500'
                      )}
                    >
                      {Math.round(impact.risk_score * 100)}%
                    </Badge>
                  </div>
                  <ul className="space-y-1">
                    {impact.potential_impacts.map((impact, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        {impact}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No impact data available</p>
              )}
            </div>
          )}

          {/* External Link */}
          {event.external_url && (
            <Button variant="outline" className="w-full" asChild>
              <a href={event.external_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View in {event.source_platform}
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function CorrelationsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SDLCEvent | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [days, setDays] = useState(7);
  const [eventTypeFilter, setEventTypeFilter] = useState<SDLCEventType | 'all'>('all');
  const [nlQueryText, setNlQueryText] = useState('');
  const [activeTab, setActiveTab] = useState<'timeline' | 'insights'>('timeline');

  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const currentProject = selectedProjectId || projects[0]?.id;

  // Timeline data
  const timelineOptions = useMemo(() => ({
    projectId: currentProject,
    eventTypes: eventTypeFilter === 'all' ? undefined : [eventTypeFilter],
    days,
    limit: 100,
  }), [currentProject, eventTypeFilter, days]);

  const { data: timeline, isLoading: timelineLoading, refetch: refetchTimeline } = useCorrelationTimeline(timelineOptions);
  const { data: stats, isLoading: statsLoading } = useCorrelationStats(currentProject, 30);
  const { data: insights = [], isLoading: insightsLoading } = useCorrelationInsights({
    projectId: currentProject,
    status: 'active',
    limit: 10,
  });

  // NL Query
  const nlQuery = useNLQuery();

  // Insight mutations
  const acknowledgeInsight = useAcknowledgeInsight();
  const resolveInsight = useResolveInsight();
  const dismissInsight = useDismissInsight();

  const handleEventClick = (event: SDLCEvent) => {
    setSelectedEvent(event);
    setEventDetailOpen(true);
  };

  const handleNLQuery = () => {
    if (nlQueryText.trim()) {
      nlQuery.mutate({ query: nlQueryText, projectId: currentProject || undefined });
    }
  };

  const isLoading = projectsLoading || timelineLoading;

  if (projectsLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </main>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <NoProjectsEmptyState />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Network className="h-8 w-8 text-primary" />
                SDLC Correlations
              </h1>
              <p className="text-muted-foreground mt-1">
                Unified timeline of events across your entire development lifecycle
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={currentProject || ''} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetchTimeline()}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Events</p>
                    <p className="text-2xl font-bold">
                      {statsLoading ? '-' : stats?.events.total.toLocaleString() || 0}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Correlations</p>
                    <p className="text-2xl font-bold">
                      {statsLoading ? '-' : stats?.correlations.total.toLocaleString() || 0}
                    </p>
                  </div>
                  <Link2 className="h-8 w-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Insights</p>
                    <p className="text-2xl font-bold">
                      {statsLoading ? '-' : stats?.insights.status_active || 0}
                    </p>
                  </div>
                  <Lightbulb className="h-8 w-8 text-yellow-500/20" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Critical Issues</p>
                    <p className="text-2xl font-bold text-red-500">
                      {statsLoading ? '-' : stats?.insights.severity_critical || 0}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500/20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* NL Query Search */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder='Try "What deployments caused errors last week?" or "Show PRs without tests"'
                    value={nlQueryText}
                    onChange={(e) => setNlQueryText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleNLQuery()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleNLQuery} disabled={nlQuery.isPending || !nlQueryText.trim()}>
                  {nlQuery.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Ask AI
                </Button>
              </div>
              {nlQuery.data && (
                <div className="mt-4 p-4 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">
                    Interpreted as: <span className="text-muted-foreground">{nlQuery.data.interpreted_as}</span>
                  </p>
                  {nlQuery.data.insights.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {nlQuery.data.insights.map((insight, i) => (
                        <p key={i} className="text-sm flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                          {insight}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Found {nlQuery.data.events.length} matching events
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant={activeTab === 'timeline' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('timeline')}
            >
              <Clock className="h-4 w-4 mr-2" />
              Timeline
            </Button>
            <Button
              variant={activeTab === 'insights' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('insights')}
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Insights
              {insights.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {insights.length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Content */}
          {activeTab === 'timeline' ? (
            <div className="grid grid-cols-12 gap-6">
              {/* Filters Sidebar */}
              <div className="col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Time Range</label>
                      <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Last 24 hours</SelectItem>
                          <SelectItem value="7">Last 7 days</SelectItem>
                          <SelectItem value="14">Last 14 days</SelectItem>
                          <SelectItem value="30">Last 30 days</SelectItem>
                          <SelectItem value="90">Last 90 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Event Type</label>
                      <Select
                        value={eventTypeFilter}
                        onValueChange={(v) => setEventTypeFilter(v as SDLCEventType | 'all')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Events</SelectItem>
                          {Object.entries(eventTypeConfig).map(([type, config]) => (
                            <SelectItem key={type} value={type}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Event Type Breakdown */}
                    {stats?.events.by_type && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Event Distribution</p>
                        <div className="space-y-2">
                          {Object.entries(stats.events.by_type).map(([type, count]) => {
                            const config = eventTypeConfig[type as SDLCEventType];
                            if (!config) return null;
                            const Icon = config.icon;
                            return (
                              <div key={type} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <Icon className={cn('h-4 w-4', config.color.split(' ')[0])} />
                                  <span>{config.label}</span>
                                </div>
                                <span className="text-muted-foreground">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Timeline */}
              <div className="col-span-9">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Event Timeline</CardTitle>
                      <CardDescription>
                        {timeline?.total_count || 0} events in the last {days} days
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Timeline
                      events={nlQuery.data?.events || timeline?.events || []}
                      onEventClick={handleEventClick}
                      isLoading={timelineLoading || nlQuery.isPending}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            /* Insights Tab */
            <div className="space-y-4">
              {insightsLoading ? (
                [...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-40" />
                ))
              ) : insights.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Lightbulb className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium text-lg mb-1">No active insights</h3>
                    <p className="text-sm text-muted-foreground">
                      AI-generated insights will appear here when patterns are detected.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                insights.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onAcknowledge={() => acknowledgeInsight.mutate(insight.id)}
                    onResolve={() => resolveInsight.mutate({ insightId: insight.id })}
                    onDismiss={() => dismissInsight.mutate({ insightId: insight.id, reason: 'Not relevant' })}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        open={eventDetailOpen}
        onOpenChange={setEventDetailOpen}
      />
    </div>
  );
}
