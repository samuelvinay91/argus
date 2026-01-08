'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Play,
  AlertTriangle,
  GitBranch,
  User,
  Settings,
  Wrench,
  FileText,
  Zap,
  Clock,
  ExternalLink,
  Bell,
  Eye,
  Compass,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useActivityFeed,
  useRealtimeActivity,
  useActivityStats,
  type ActivityEvent,
  type ActivityEventType,
} from '@/lib/hooks/use-activity';

function getEventIcon(type: ActivityEventType) {
  switch (type) {
    case 'test_started':
      return <Play className="h-4 w-4" />;
    case 'test_passed':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'test_failed':
      return <XCircle className="h-4 w-4" />;
    case 'test_created':
    case 'test_updated':
    case 'test_deleted':
      return <FileText className="h-4 w-4" />;
    case 'project_created':
    case 'project_updated':
      return <GitBranch className="h-4 w-4" />;
    case 'healing_applied':
    case 'healing_suggested':
      return <Wrench className="h-4 w-4" />;
    case 'schedule_triggered':
      return <Clock className="h-4 w-4" />;
    case 'user_joined':
      return <User className="h-4 w-4" />;
    case 'settings_changed':
      return <Settings className="h-4 w-4" />;
    case 'integration_connected':
      return <Zap className="h-4 w-4" />;
    case 'discovery_started':
    case 'discovery_completed':
      return <Compass className="h-4 w-4" />;
    case 'visual_test_started':
    case 'visual_test_completed':
      return <Eye className="h-4 w-4" />;
    case 'quality_audit_started':
    case 'quality_audit_completed':
      return <Activity className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
}

function getEventColor(type: ActivityEventType) {
  switch (type) {
    case 'test_passed':
    case 'discovery_completed':
    case 'visual_test_completed':
    case 'quality_audit_completed':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'test_failed':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'test_started':
    case 'schedule_triggered':
    case 'discovery_started':
    case 'visual_test_started':
    case 'quality_audit_started':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'healing_applied':
    case 'healing_suggested':
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'project_created':
    case 'test_created':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'user_joined':
      return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
    case 'integration_connected':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

type EventFilter = 'all' | 'tests' | 'healing' | 'projects' | 'team';

function ActivityItem({ event }: { event: ActivityEvent }) {
  const iconColor = getEventColor(event.type);

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className={cn('p-2 rounded-lg border', iconColor)}>
        {getEventIcon(event.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-medium">{event.title}</h4>
            <p className="text-sm text-muted-foreground mt-0.5">{event.description}</p>
            {event.metadata?.projectName && (
              <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                {event.metadata.projectName}
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
            </span>
            {event.metadata?.link && (
              <Link
                href={event.metadata.link}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                View
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
        {event.user && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
              <User className="h-3 w-3 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">{event.user.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ActivityPage() {
  // Data fetching hooks
  const { data: activities = [], isLoading, error, refetch } = useActivityFeed(50);
  const { newActivities, clearNewActivities } = useRealtimeActivity();
  const activityStats = useActivityStats();

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<EventFilter>('all');
  const [isLive, setIsLive] = useState(true);

  // Combine real-time activities with fetched activities
  const allActivities = useMemo(() => {
    if (!isLive) return activities;
    const newIds = new Set(newActivities.map(a => a.id));
    const filteredExisting = activities.filter(a => !newIds.has(a.id));
    return [...newActivities, ...filteredExisting];
  }, [activities, newActivities, isLive]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return allActivities.filter((activity) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !activity.title.toLowerCase().includes(query) &&
          !activity.description.toLowerCase().includes(query) &&
          !(activity.metadata?.projectName?.toLowerCase().includes(query)) &&
          !(activity.metadata?.testName?.toLowerCase().includes(query))
        ) {
          return false;
        }
      }

      // Type filter
      if (filter !== 'all') {
        switch (filter) {
          case 'tests':
            if (!activity.type.startsWith('test_') &&
                activity.type !== 'schedule_triggered' &&
                !activity.type.startsWith('discovery_') &&
                !activity.type.startsWith('visual_test_') &&
                !activity.type.startsWith('quality_audit_')) {
              return false;
            }
            break;
          case 'healing':
            if (!activity.type.startsWith('healing_')) {
              return false;
            }
            break;
          case 'projects':
            if (!activity.type.startsWith('project_') && activity.type !== 'integration_connected') {
              return false;
            }
            break;
          case 'team':
            if (activity.type !== 'user_joined' && activity.type !== 'settings_changed') {
              return false;
            }
            break;
        }
      }

      return true;
    });
  }, [allActivities, searchQuery, filter]);

  // Stats from hook
  const stats = activityStats;

  const handleRefresh = useCallback(async () => {
    clearNewActivities();
    await refetch();
  }, [refetch, clearNewActivities]);

  const handleToggleLive = useCallback(() => {
    if (isLive) {
      clearNewActivities();
    }
    setIsLive(!isLive);
  }, [isLive, clearNewActivities]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Activity Feed
            </h1>
            <p className="text-sm text-muted-foreground">
              Real-time activity across all projects
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isLive ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleLive}
              className="gap-2"
            >
              <span className={cn('h-2 w-2 rounded-full', isLive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground')} />
              {isLive ? 'Live' : 'Paused'}
            </Button>
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
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.lastHour}</p>
                    <p className="text-sm text-muted-foreground">Events (1hr)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Play className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.testRuns}</p>
                    <p className="text-sm text-muted-foreground">Test Runs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <Wrench className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.healsApplied}</p>
                    <p className="text-sm text-muted-foreground">Heals Applied</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-red-500/10">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.failures}</p>
                    <p className="text-sm text-muted-foreground">Failures</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* New Activities Notification */}
          {newActivities.length > 0 && isLive && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
              <span className="text-sm">
                {newActivities.length} new {newActivities.length === 1 ? 'activity' : 'activities'} received
              </span>
              <Button variant="ghost" size="sm" onClick={clearNewActivities}>
                Clear
              </Button>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as EventFilter)}
                className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Activity</option>
                <option value="tests">Test Runs</option>
                <option value="healing">Self-Healing</option>
                <option value="projects">Projects</option>
                <option value="team">Team</option>
              </select>
            </div>
          </div>

          {/* Activity List */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <CardDescription>
                    Showing {filteredActivities.length} events
                  </CardDescription>
                </div>
                {isLive && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Updating live
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                  <h3 className="text-lg font-medium mb-2">Failed to load activity</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                    There was an error loading the activity feed. Please try again.
                  </p>
                  <Button onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No activity found</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    {searchQuery || filter !== 'all'
                      ? 'Try adjusting your filters to see more results.'
                      : 'Activity will appear here as you use Argus.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredActivities.map((activity) => (
                    <ActivityItem key={activity.id} event={activity} />
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
