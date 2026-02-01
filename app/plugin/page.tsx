'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { SignInButton } from '@clerk/nextjs';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { safeFormatDistanceToNow, safeFormat } from '@/lib/utils';
import {
  usePluginEvents,
  usePluginSessions,
  usePluginUsageSummary,
} from '@/lib/hooks/use-plugin-events';
import {
  Puzzle,
  Clock,
  Activity,
  Search,
  Loader2,
  LogIn,
  RefreshCw,
  Terminal,
  Sparkles,
  Bot,
  Webhook,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  GitBranch,
  Command,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Event type icons and colors
const eventTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  command: { icon: Terminal, color: 'text-blue-500', label: 'Command' },
  skill: { icon: Sparkles, color: 'text-purple-500', label: 'Skill' },
  agent: { icon: Bot, color: 'text-green-500', label: 'Agent' },
  hook: { icon: Webhook, color: 'text-orange-500', label: 'Hook' },
  mcp_tool: { icon: Zap, color: 'text-cyan-500', label: 'MCP Tool' },
  error: { icon: AlertCircle, color: 'text-red-500', label: 'Error' },
  session_start: { icon: Activity, color: 'text-emerald-500', label: 'Session Start' },
  session_end: { icon: Activity, color: 'text-gray-500', label: 'Session End' },
};

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ElementType; className: string }> = {
    started: { icon: Loader2, className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' },
    completed: { icon: CheckCircle, className: 'bg-green-500/10 text-green-600 border-green-500/30' },
    failed: { icon: XCircle, className: 'bg-red-500/10 text-red-600 border-red-500/30' },
    cancelled: { icon: XCircle, className: 'bg-gray-500/10 text-gray-600 border-gray-500/30' },
  };

  const { icon: Icon, className } = config[status] || config.started;

  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <Icon className={cn('h-3 w-3', status === 'started' && 'animate-spin')} />
      {status}
    </Badge>
  );
}

// Stats card component
function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs mt-1',
            trend.positive ? 'text-green-600' : 'text-red-600'
          )}>
            <TrendingUp className={cn('h-3 w-3', !trend.positive && 'rotate-180')} />
            {trend.value}% from last week
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Event row component
function EventRow({ event }: { event: any }) {
  const config = eventTypeConfig[event.event_type] || eventTypeConfig.command;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0">
      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center bg-muted', config.color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{event.event_name}</span>
          <Badge variant="secondary" className="text-[10px]">{config.label}</Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {safeFormatDistanceToNow(event.started_at, { addSuffix: true })}
          </span>
          {event.duration_ms && (
            <span>{event.duration_ms}ms</span>
          )}
          {event.git_branch && (
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {event.git_branch}
            </span>
          )}
        </div>
      </div>
      <StatusBadge status={event.status} />
    </div>
  );
}

// Session row component
function SessionRow({ session }: { session: any }) {
  const isActive = !session.ended_at;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center',
              isActive ? 'bg-green-500/10' : 'bg-muted'
            )}>
              <Puzzle className={cn('h-5 w-5', isActive ? 'text-green-500' : 'text-muted-foreground')} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  Session {session.session_id.slice(0, 8)}
                </span>
                {isActive && (
                  <Badge className="bg-green-500 text-white">Active</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Started {safeFormat(session.started_at, 'MMM d, yyyy HH:mm')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Terminal className="h-4 w-4" />
              {session.commands_executed || 0}
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              {session.skills_activated || 0}
            </div>
            <div className="flex items-center gap-1">
              <Bot className="h-4 w-4" />
              {session.agents_invoked || 0}
            </div>
            {session.errors_count > 0 && (
              <div className="flex items-center gap-1 text-red-500">
                <AlertCircle className="h-4 w-4" />
                {session.errors_count}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main content component
function PluginMonitorContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [tab, setTab] = useState('overview');

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = usePluginUsageSummary(7);
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = usePluginEvents({
    eventType: eventTypeFilter !== 'all' ? eventTypeFilter : undefined,
    limit: 50,
  });
  const { data: sessions = [], isLoading: sessionsLoading, refetch: refetchSessions } = usePluginSessions(20);

  const handleRefresh = () => {
    refetchSummary();
    refetchEvents();
    refetchSessions();
  };

  // Filter events by search
  const filteredEvents = events.filter((event) =>
    event.event_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex items-center gap-2">
            <Puzzle className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Plugin Monitor</h1>
          </div>

          {summary && (
            <div className="flex items-center gap-2 ml-4">
              <Badge variant="outline" className="text-green-600 border-green-600/30">
                {sessions.filter(s => !s.ended_at).length} Active
              </Badge>
              <Badge variant="outline">
                {summary.totalEvents} Events (7d)
              </Badge>
            </div>
          )}

          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </header>

        {/* Content */}
        <div className="p-6 space-y-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              {summaryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : summary ? (
                <>
                  {/* Stats Grid */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                      title="Total Sessions"
                      value={summary.totalSessions}
                      icon={Activity}
                      description="Last 7 days"
                    />
                    <StatsCard
                      title="Commands Executed"
                      value={summary.totalCommands}
                      icon={Terminal}
                      description={summary.mostUsedCommand ? `Top: ${summary.mostUsedCommand}` : undefined}
                    />
                    <StatsCard
                      title="Skills Activated"
                      value={summary.totalSkills}
                      icon={Sparkles}
                      description={summary.mostUsedSkill ? `Top: ${summary.mostUsedSkill}` : undefined}
                    />
                    <StatsCard
                      title="Errors"
                      value={summary.totalErrors}
                      icon={AlertCircle}
                      description={summary.totalEvents > 0
                        ? `${((summary.totalErrors / summary.totalEvents) * 100).toFixed(1)}% error rate`
                        : undefined
                      }
                    />
                  </div>

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {summary.recentActivity.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Puzzle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No plugin activity yet</p>
                          <p className="text-sm mt-1">
                            Install the Argus Claude Code plugin to get started
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border/50">
                          {summary.recentActivity.slice(0, 10).map((event) => (
                            <EventRow key={event.id} event={event} />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Plugin Usage</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Commands</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{
                                  width: `${Math.min(100, (summary.totalCommands / (summary.totalEvents || 1)) * 100)}%`
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium">{summary.totalCommands}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Skills</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500 rounded-full"
                                style={{
                                  width: `${Math.min(100, (summary.totalSkills / (summary.totalEvents || 1)) * 100)}%`
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium">{summary.totalSkills}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Agents</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{
                                  width: `${Math.min(100, (summary.totalAgents / (summary.totalEvents || 1)) * 100)}%`
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium">{summary.totalAgents}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Session Stats</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Sessions</span>
                          <span className="text-sm font-medium">{summary.totalSessions}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Avg Duration</span>
                          <span className="text-sm font-medium">
                            {summary.avgSessionDuration
                              ? formatDuration(summary.avgSessionDuration)
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Events per Session</span>
                          <span className="text-sm font-medium">
                            {summary.totalSessions > 0
                              ? (summary.totalEvents / summary.totalSessions).toFixed(1)
                              : 'N/A'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <Puzzle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium mb-2">No Plugin Data Yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Install the Argus Claude Code plugin to start monitoring your AI-assisted testing workflow.
                    </p>
                    <Button className="mt-6" asChild>
                      <a href="https://github.com/samuelvinay91/argus-plugin" target="_blank" rel="noopener noreferrer">
                        View Plugin Installation
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="space-y-6 mt-6">
              {/* Filters */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="command">Commands</SelectItem>
                    <SelectItem value="skill">Skills</SelectItem>
                    <SelectItem value="agent">Agents</SelectItem>
                    <SelectItem value="hook">Hooks</SelectItem>
                    <SelectItem value="mcp_tool">MCP Tools</SelectItem>
                    <SelectItem value="error">Errors</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Events List */}
              <Card>
                <CardContent className="p-0">
                  {eventsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      {searchQuery ? (
                        <>
                          <p>No events found matching &quot;{searchQuery}&quot;</p>
                          <Button
                            variant="ghost"
                            className="mt-4"
                            onClick={() => setSearchQuery('')}
                          >
                            Clear search
                          </Button>
                        </>
                      ) : (
                        <p>No events recorded yet</p>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50 p-4">
                      {filteredEvents.map((event) => (
                        <EventRow key={event.id} event={event} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sessions Tab */}
            <TabsContent value="sessions" className="space-y-4 mt-6">
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : sessions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <Puzzle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No plugin sessions recorded yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <SessionRow key={session.id} session={session} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

export default function PluginMonitorPage() {
  const { isLoaded, isSignedIn } = useAuth();

  // Show loading state
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-w-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-w-0 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Puzzle className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Sign In Required</CardTitle>
              <p className="text-muted-foreground mt-2">
                You need to sign in to view plugin activity
              </p>
            </CardHeader>
            <CardContent className="flex justify-center">
              <SignInButton mode="modal">
                <Button size="lg">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              </SignInButton>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return <PluginMonitorContent />;
}
