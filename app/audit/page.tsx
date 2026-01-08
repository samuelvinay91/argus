'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ScrollText,
  Search,
  Download,
  Calendar,
  User,
  Activity,
  Shield,
  Key,
  Users,
  TestTube,
  Wrench,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const DEFAULT_ORG_ID = 'default';

interface AuditLogEntry {
  id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  description: string;
  metadata: Record<string, any>;
  ip_address: string;
  status: 'success' | 'failure' | 'pending';
  created_at: string;
}

interface AuditStats {
  total_events: number;
  events_last_24h: number;
  success_count: number;
  failure_count: number;
}

const ACTION_ICONS: Record<string, typeof Activity> = {
  member: Users,
  api_key: Key,
  project: Settings,
  test: TestTube,
  healing: Wrench,
  auth: Shield,
  organization: Users,
};

const STATUS_CONFIG = {
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  failure: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    total_events: 0,
    events_last_24h: 0,
    success_count: 0,
    failure_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);
  const pageSize = 20;

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (selectedAction) params.append('action_filter', selectedAction);
      if (selectedStatus) params.append('status_filter', selectedStatus);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(
        `${BACKEND_URL}/api/v1/audit/organizations/${DEFAULT_ORG_ID}/logs?${params}`
      );
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setTotalPages(data.total_pages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  }, [page, selectedAction, selectedStatus, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/audit/organizations/${DEFAULT_ORG_ID}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch audit stats:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchLogs(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchLogs, fetchStats]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1); // Reset to first page on search
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchLogs]);

  // Refresh when filters change
  useEffect(() => {
    setPage(1);
    fetchLogs();
  }, [selectedAction, selectedStatus, fetchLogs]);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedAction) params.append('action_filter', selectedAction);
      if (selectedStatus) params.append('status_filter', selectedStatus);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(
        `${BACKEND_URL}/api/v1/audit/organizations/${DEFAULT_ORG_ID}/export?${params}`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Fallback to client-side export if API doesn't support export
        const csv = [
          ['Time', 'User', 'Action', 'Description', 'Status', 'IP Address'].join(','),
          ...logs.map(log => [
            new Date(log.created_at).toISOString(),
            log.user_email,
            log.action,
            `"${log.description}"`,
            log.status,
            log.ip_address,
          ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('Failed to export audit logs');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading audit logs...</p>
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
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" />
              Audit Logs
            </h1>
            <p className="text-sm text-muted-foreground">
              Track all activity across your organization
            </p>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export CSV
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

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Activity className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total_events}</p>
                    <p className="text-sm text-muted-foreground">Total Events</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Calendar className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.events_last_24h}</p>
                    <p className="text-sm text-muted-foreground">Last 24 Hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.success_count}</p>
                    <p className="text-sm text-muted-foreground">Successful</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-red-500/10">
                    <XCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.failure_count}</p>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="flex gap-2">
                  {['member', 'api_key', 'test', 'healing', 'auth'].map((action) => {
                    const Icon = ACTION_ICONS[action] || Activity;
                    return (
                      <Button
                        key={action}
                        variant={selectedAction === action ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedAction(selectedAction === action ? null : action)}
                      >
                        <Icon className="h-4 w-4 mr-1" />
                        {action.replace('_', ' ')}
                      </Button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <Button
                      key={status}
                      variant={selectedStatus === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
                      className={cn(
                        selectedStatus === status && config.bg,
                        selectedStatus === status && config.color
                      )}
                    >
                      <config.icon className="h-4 w-4 mr-1" />
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Log List */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                Showing {logs.length} events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {logs.map((log) => {
                  const actionCategory = log.action.split('.')[0];
                  const Icon = ACTION_ICONS[actionCategory] || Activity;
                  const statusConfig = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending;

                  return (
                    <div key={log.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "p-2 rounded-lg",
                          statusConfig.bg
                        )}>
                          <Icon className={cn("h-4 w-4", statusConfig.color)} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{log.description}</span>
                            <span className={cn(
                              "px-2 py-0.5 text-xs rounded-full",
                              statusConfig.bg,
                              statusConfig.color
                            )}>
                              {log.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {log.user_email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatTimeAgo(log.created_at)}
                            </span>
                            {log.ip_address && log.ip_address !== '0.0.0.0' && (
                              <span className="font-mono text-xs">
                                {log.ip_address}
                              </span>
                            )}
                          </div>

                          {Object.keys(log.metadata || {}).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {Object.entries(log.metadata).slice(0, 3).map(([key, value]) => (
                                <span
                                  key={key}
                                  className="px-2 py-0.5 text-xs rounded bg-muted font-mono"
                                >
                                  {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {logs.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    <ScrollText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No audit logs found</p>
                    {(searchQuery || selectedAction || selectedStatus) && (
                      <p className="text-sm mt-2">Try adjusting your filters</p>
                    )}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
