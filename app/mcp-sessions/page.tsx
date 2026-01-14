'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Cable,
  Monitor,
  Clock,
  CheckCircle,
  AlertTriangle,
  Shield,
  Loader2,
  AlertCircle,
  X,
  LogIn,
  Trash2,
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  Terminal,
  Laptop,
  BarChart3,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthApi } from '@/lib/hooks/use-auth-api';
import { SignInButton } from '@clerk/nextjs';

// ============================================================================
// Types
// ============================================================================

interface MCPConnection {
  id: string;
  user_id: string;
  organization_id: string | null;
  client_id: string;
  client_name: string | null;
  client_type: string;
  session_id: string | null;
  device_name: string | null;
  ip_address: string | null;
  scopes: string[];
  status: string;
  last_activity_at: string;
  request_count: number;
  tools_used: string[];
  connected_at: string;
  disconnected_at: string | null;
  revoked_at: string | null;
  is_active: boolean;
  seconds_since_activity: number | null;
  connection_duration_hours: number | null;
}

interface MCPConnectionListResponse {
  connections: MCPConnection[];
  total: number;
  active_count: number;
}

interface MCPStats {
  active_connections: number;
  total_connections: number;
  total_requests: number;
  unique_users: number;
  client_types: string[];
  last_activity: string | null;
  connections_today: number;
  connections_this_week: number;
  requests_today: number;
  top_tools: { tool: string; count: number }[];
}

// ============================================================================
// Helper Components
// ============================================================================

function ConnectionStatusBadge({ status, lastActivity }: { status: string; lastActivity: number | null }) {
  const isRecent = lastActivity !== null && lastActivity < 300; // 5 minutes

  if (status === 'revoked') {
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-500">
        <WifiOff className="h-3 w-3" />
        Revoked
      </span>
    );
  }

  if (status === 'inactive') {
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
        <WifiOff className="h-3 w-3" />
        Inactive
      </span>
    );
  }

  if (isRecent) {
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-500">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        Active Now
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-500">
      <Wifi className="h-3 w-3" />
      Connected
    </span>
  );
}

function ClientIcon({ clientType, clientName }: { clientType: string; clientName: string | null }) {
  const name = (clientName || clientType).toLowerCase();

  if (name.includes('claude') || name.includes('code')) {
    return <Terminal className="h-5 w-5 text-primary" />;
  }
  if (name.includes('cursor')) {
    return <Monitor className="h-5 w-5 text-blue-500" />;
  }
  if (name.includes('vscode') || name.includes('vs code')) {
    return <Laptop className="h-5 w-5 text-sky-500" />;
  }

  return <Cable className="h-5 w-5 text-muted-foreground" />;
}

function formatDuration(hours: number | null): string {
  if (hours === null) return 'Unknown';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

function formatTimeAgo(seconds: number | null): string {
  if (seconds === null) return 'Unknown';
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

// ============================================================================
// Main Component
// ============================================================================

export default function MCPSessionsPage() {
  const { fetchJson, isLoaded, isSignedIn, orgId } = useAuthApi();

  const [connections, setConnections] = useState<MCPConnection[]>([]);
  const [stats, setStats] = useState<MCPStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConnections = useCallback(async () => {
    if (!isSignedIn) return;

    try {
      const endpoint = orgId
        ? `/api/v1/mcp/connections?org_id=${orgId}`
        : '/api/v1/mcp/connections';

      const response = await fetchJson<MCPConnectionListResponse>(endpoint);

      if (response.data) {
        setConnections(response.data.connections || []);
        setError(null);
      } else if (response.error) {
        console.error('Failed to fetch MCP connections:', response.error);
        if (response.status !== 401) {
          setError(response.error);
        }
      }
    } catch (err) {
      console.error('Failed to fetch MCP connections:', err);
    }
  }, [fetchJson, orgId, isSignedIn]);

  const fetchStats = useCallback(async () => {
    if (!isSignedIn) return;

    try {
      const endpoint = orgId
        ? `/api/v1/mcp/stats?org_id=${orgId}`
        : '/api/v1/mcp/stats';

      const response = await fetchJson<MCPStats>(endpoint);

      if (response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch MCP stats:', err);
    }
  }, [fetchJson, orgId, isSignedIn]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchConnections(), fetchStats()]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!isLoaded) return;

    const loadData = async () => {
      setLoading(true);
      if (isSignedIn) {
        await Promise.all([fetchConnections(), fetchStats()]);
      }
      setLoading(false);
    };
    loadData();
  }, [fetchConnections, fetchStats, isLoaded, isSignedIn]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!isSignedIn) return;

    const interval = setInterval(() => {
      fetchConnections();
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchConnections, fetchStats, isSignedIn]);

  const activeConnections = connections.filter(c => c.is_active);
  const inactiveConnections = connections.filter(c => !c.is_active);

  const handleRevokeConnection = async (connectionId: string) => {
    setActionLoading(connectionId);
    setError(null);

    try {
      const response = await fetchJson<{ status: string }>(
        `/api/v1/mcp/connections/${connectionId}`,
        {
          method: 'DELETE',
          body: JSON.stringify({ reason: 'Revoked from dashboard' }),
        }
      );

      if (response.status === 200 || response.data) {
        setConnections(connections.map(c =>
          c.id === connectionId
            ? { ...c, is_active: false, status: 'revoked', revoked_at: new Date().toISOString() }
            : c
        ));
        // Refresh stats
        fetchStats();
      } else {
        setError(response.error || 'Failed to revoke connection');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setActionLoading(null);
    }
  };

  // Loading state
  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading MCP sessions...</p>
          </div>
        </main>
      </div>
    );
  }

  // Sign-in required
  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Cable className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                You need to sign in to manage MCP sessions
              </CardDescription>
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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Cable className="h-5 w-5 text-primary" />
              MCP Sessions
            </h1>
            <p className="text-sm text-muted-foreground">
              Connected IDE clients and MCP integrations
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </header>

        <div className="p-6 space-y-6">
          {/* Error Alert */}
          {error && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                  <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Wifi className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.active_connections}</p>
                      <p className="text-sm text-muted-foreground">Active Now</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Activity className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total_requests.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total Requests</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <Zap className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.connections_today}</p>
                      <p className="text-sm text-muted-foreground">Today</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <BarChart3 className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.connections_this_week}</p>
                      <p className="text-sm text-muted-foreground">This Week</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top Tools */}
          {stats && stats.top_tools.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Most Used Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {stats.top_tools.slice(0, 10).map((tool) => (
                    <span
                      key={tool.tool}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm"
                    >
                      <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{tool.tool}</span>
                      <span className="text-muted-foreground">({tool.count})</span>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Connections */}
          <Card>
            <CardHeader>
              <CardTitle>Active Connections</CardTitle>
              <CardDescription>
                {activeConnections.length} active MCP {activeConnections.length === 1 ? 'session' : 'sessions'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeConnections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Cable className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active MCP connections</p>
                  <p className="text-sm mt-2">
                    Connect Claude Code, Cursor, or another MCP client to get started
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {activeConnections.map((connection) => (
                    <div key={connection.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <ClientIcon
                              clientType={connection.client_type}
                              clientName={connection.client_name}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {connection.client_name || connection.client_type}
                              </span>
                              <ConnectionStatusBadge
                                status={connection.status}
                                lastActivity={connection.seconds_since_activity}
                              />
                            </div>
                            {connection.device_name && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {connection.device_name}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {connection.scopes.map((scope) => (
                                <span
                                  key={scope}
                                  className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
                                >
                                  {scope}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {formatTimeAgo(connection.seconds_since_activity)}
                              </span>
                              <span>{connection.request_count.toLocaleString()} requests</span>
                              <span>
                                Connected {formatDuration(connection.connection_duration_hours)}
                              </span>
                              {connection.ip_address && (
                                <span className="text-xs font-mono">{connection.ip_address}</span>
                              )}
                            </div>
                            {connection.tools_used.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {connection.tools_used.slice(0, 5).map((tool) => (
                                  <span
                                    key={tool}
                                    className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground"
                                  >
                                    {tool}
                                  </span>
                                ))}
                                {connection.tools_used.length > 5 && (
                                  <span className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground">
                                    +{connection.tools_used.length - 5} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:bg-red-500/10"
                          onClick={() => handleRevokeConnection(connection.id)}
                          disabled={actionLoading === connection.id}
                        >
                          {actionLoading === connection.id ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                          )}
                          Revoke
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inactive/Revoked Connections */}
          {inactiveConnections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground">Past Connections</CardTitle>
                <CardDescription>
                  {inactiveConnections.length} inactive or revoked {inactiveConnections.length === 1 ? 'session' : 'sessions'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {inactiveConnections.slice(0, 10).map((connection) => (
                    <div key={connection.id} className="py-4 first:pt-0 last:pb-0 opacity-60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ClientIcon
                            clientType={connection.client_type}
                            clientName={connection.client_name}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {connection.client_name || connection.client_type}
                              </span>
                              <ConnectionStatusBadge
                                status={connection.status}
                                lastActivity={null}
                              />
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {connection.request_count.toLocaleString()} requests
                              {connection.revoked_at && (
                                <> &middot; Revoked {new Date(connection.revoked_at).toLocaleDateString()}</>
                              )}
                              {connection.disconnected_at && !connection.revoked_at && (
                                <> &middot; Disconnected {new Date(connection.disconnected_at).toLocaleDateString()}</>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                About MCP Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>MCP (Model Context Protocol) enables AI assistants like Claude Code to interact with Argus</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Sessions are automatically created when you authenticate with an MCP client</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Revoke sessions to immediately disconnect a client and require re-authentication</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>If you don&apos;t recognize a connection, revoke it immediately for security</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
