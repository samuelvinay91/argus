'use client';

import { useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  LayoutDashboard,
  RefreshCw,
  Server,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useGrafanaHealth,
  usePrometheusHealth,
  useAlertManagerHealth,
  usePrometheusTargets,
  usePrometheusAlerts,
  useAlertManagerAlerts,
  useGrafanaDashboards,
  type GrafanaHealthResponse,
  type PrometheusHealthResponse,
  type AlertManagerHealthResponse,
} from '@/lib/hooks/use-infra';

type HealthStatus = 'healthy' | 'unhealthy' | 'loading' | 'error';

const statusConfig: Record<
  HealthStatus,
  { color: string; bgColor: string; icon: React.ReactNode; label: string }
> = {
  healthy: {
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Healthy',
  },
  unhealthy: {
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    icon: <AlertCircle className="h-4 w-4" />,
    label: 'Unhealthy',
  },
  loading: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    icon: <RefreshCw className="h-4 w-4 animate-spin" />,
    label: 'Checking...',
  },
  error: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    icon: <HelpCircle className="h-4 w-4" />,
    label: 'Error',
  },
};

interface ServiceCardProps {
  title: string;
  icon: React.ReactNode;
  status: HealthStatus;
  message?: string;
  details?: React.ReactNode;
  actions?: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
}

function ServiceCard({
  title,
  icon,
  status,
  message,
  details,
  actions,
  isExpanded,
  onToggle,
}: ServiceCardProps) {
  const config = statusConfig[status];

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">{icon}</span>
          <span className="font-semibold">{title}</span>
          <Badge variant="outline" className={cn('text-xs', config.color, config.bgColor)}>
            <span className="mr-1">{config.icon}</span>
            {config.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {message && <span className="text-sm text-muted-foreground hidden sm:inline">{message}</span>}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
          <div className="pt-4 space-y-4">
            {message && <p className="text-sm text-muted-foreground sm:hidden">{message}</p>}
            {details}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function getHealthStatus(
  data: GrafanaHealthResponse | PrometheusHealthResponse | AlertManagerHealthResponse | undefined,
  isLoading: boolean,
  isError: boolean
): HealthStatus {
  if (isLoading) return 'loading';
  if (isError) return 'error';
  if (!data) return 'error';
  return data.status === 'healthy' ? 'healthy' : 'unhealthy';
}

export function MonitoringPanel() {
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

  // Health checks
  const grafanaHealth = useGrafanaHealth();
  const prometheusHealth = usePrometheusHealth();
  const alertManagerHealth = useAlertManagerHealth();

  // Additional data
  const prometheusTargets = usePrometheusTargets();
  const prometheusAlerts = usePrometheusAlerts();
  const alertManagerAlerts = useAlertManagerAlerts();
  const grafanaDashboards = useGrafanaDashboards();

  const toggleService = (service: string) => {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(service)) {
        next.delete(service);
      } else {
        next.add(service);
      }
      return next;
    });
  };

  const handleRefreshAll = () => {
    grafanaHealth.refetch();
    prometheusHealth.refetch();
    alertManagerHealth.refetch();
    prometheusTargets.refetch();
    prometheusAlerts.refetch();
    alertManagerAlerts.refetch();
    grafanaDashboards.refetch();
  };

  // Calculate summary stats
  const targetsUp = prometheusTargets.data?.data?.activeTargets?.filter((t) => t.health === 'up').length || 0;
  const targetsTotal = prometheusTargets.data?.data?.activeTargets?.length || 0;
  const firingAlerts = prometheusAlerts.data?.data?.alerts?.filter((a) => a.state === 'firing').length || 0;
  const activeAlertManagerAlerts = alertManagerAlerts.data?.alerts?.filter((a) => a.status?.state === 'active').length || 0;
  const dashboardsCount = grafanaDashboards.data?.dashboards?.length || 0;

  const isLoading = grafanaHealth.isLoading || prometheusHealth.isLoading || alertManagerHealth.isLoading;

  // Calculate overall health
  const healthyCount = [
    grafanaHealth.data?.status === 'healthy',
    prometheusHealth.data?.status === 'healthy',
    alertManagerHealth.data?.status === 'healthy',
  ].filter(Boolean).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-info" />
              Monitoring Stack
            </CardTitle>
            <CardDescription>Grafana, Prometheus, and AlertManager status</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{healthyCount}/3 healthy</span>
            <Button variant="ghost" size="icon" onClick={handleRefreshAll} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-info">{dashboardsCount}</p>
            <p className="text-xs text-muted-foreground">Dashboards</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className={cn('text-2xl font-bold', targetsUp === targetsTotal ? 'text-success' : 'text-warning')}>
              {targetsUp}/{targetsTotal}
            </p>
            <p className="text-xs text-muted-foreground">Targets Up</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className={cn('text-2xl font-bold', firingAlerts === 0 ? 'text-success' : 'text-error')}>
              {firingAlerts}
            </p>
            <p className="text-xs text-muted-foreground">Firing Alerts</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className={cn('text-2xl font-bold', activeAlertManagerAlerts === 0 ? 'text-success' : 'text-warning')}>
              {activeAlertManagerAlerts}
            </p>
            <p className="text-xs text-muted-foreground">Active Alerts</p>
          </div>
        </div>

        {/* Services List */}
        <div className="space-y-3">
          {/* Grafana */}
          <ServiceCard
            title="Grafana"
            icon={<LayoutDashboard className="h-4 w-4" />}
            status={getHealthStatus(grafanaHealth.data, grafanaHealth.isLoading, grafanaHealth.isError)}
            message={grafanaHealth.data?.grafana?.version ? `v${grafanaHealth.data.grafana.version}` : undefined}
            isExpanded={expandedServices.has('grafana')}
            onToggle={() => toggleService('grafana')}
            details={
              <div className="space-y-3">
                {grafanaDashboards.data?.dashboards && grafanaDashboards.data.dashboards.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Available Dashboards:</p>
                    <div className="flex flex-wrap gap-2">
                      {grafanaDashboards.data.dashboards.slice(0, 5).map((dashboard) => (
                        <Badge key={dashboard.uid} variant="secondary" className="text-xs">
                          {dashboard.title}
                        </Badge>
                      ))}
                      {grafanaDashboards.data.dashboards.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{grafanaDashboards.data.dashboards.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                {grafanaHealth.data?.error && (
                  <p className="text-sm text-red-500">{grafanaHealth.data.error}</p>
                )}
              </div>
            }
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://grafana-internal.skopaq.ai', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open Grafana
              </Button>
            }
          />

          {/* Prometheus */}
          <ServiceCard
            title="Prometheus"
            icon={<Server className="h-4 w-4" />}
            status={getHealthStatus(prometheusHealth.data, prometheusHealth.isLoading, prometheusHealth.isError)}
            message={`${targetsUp}/${targetsTotal} targets`}
            isExpanded={expandedServices.has('prometheus')}
            onToggle={() => toggleService('prometheus')}
            details={
              <div className="space-y-3">
                {prometheusTargets.data?.data?.activeTargets && prometheusTargets.data.data.activeTargets.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Scrape Targets:</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {prometheusTargets.data.data.activeTargets.slice(0, 10).map((target, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-1 rounded bg-background">
                          <span className="truncate max-w-[200px]">{target.labels?.job || 'unknown'}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              target.health === 'up' ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'
                            )}
                          >
                            {target.health}
                          </Badge>
                        </div>
                      ))}
                      {prometheusTargets.data.data.activeTargets.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center pt-1">
                          +{prometheusTargets.data.data.activeTargets.length - 10} more targets
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {firingAlerts > 0 && prometheusAlerts.data?.data?.alerts && (
                  <div>
                    <p className="text-sm font-medium mb-2 text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Firing Alerts:
                    </p>
                    <div className="space-y-1">
                      {prometheusAlerts.data.data.alerts
                        .filter((a) => a.state === 'firing')
                        .slice(0, 5)
                        .map((alert, idx) => (
                          <div key={idx} className="text-xs p-2 rounded bg-red-500/10 border border-red-500/20">
                            <span className="font-medium">{alert.labels?.alertname || 'Unknown'}</span>
                            {alert.annotations?.summary && (
                              <p className="text-muted-foreground mt-1 truncate">{alert.annotations.summary}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                {prometheusHealth.data?.error && (
                  <p className="text-sm text-red-500">{prometheusHealth.data.error}</p>
                )}
              </div>
            }
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://prometheus-internal.skopaq.ai', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open Prometheus
              </Button>
            }
          />

          {/* AlertManager */}
          <ServiceCard
            title="AlertManager"
            icon={<Bell className="h-4 w-4" />}
            status={getHealthStatus(alertManagerHealth.data, alertManagerHealth.isLoading, alertManagerHealth.isError)}
            message={`${activeAlertManagerAlerts} active`}
            isExpanded={expandedServices.has('alertmanager')}
            onToggle={() => toggleService('alertmanager')}
            details={
              <div className="space-y-3">
                {alertManagerAlerts.data?.alerts && alertManagerAlerts.data.alerts.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium mb-2">Active Alerts:</p>
                    <div className="space-y-1">
                      {alertManagerAlerts.data.alerts
                        .filter((a) => a.status?.state === 'active')
                        .slice(0, 5)
                        .map((alert, idx) => (
                          <div key={idx} className="text-xs p-2 rounded bg-warning/10 border border-warning/20">
                            <span className="font-medium">{alert.labels?.alertname || 'Unknown'}</span>
                            {alert.annotations?.summary && (
                              <p className="text-muted-foreground mt-1 truncate">{alert.annotations.summary}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active alerts</p>
                )}
                {alertManagerHealth.data?.error && (
                  <p className="text-sm text-red-500">{alertManagerHealth.data.error}</p>
                )}
              </div>
            }
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://alertmanager-internal.skopaq.ai', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open AlertManager
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function MonitoringPanelSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/50 text-center">
              <Skeleton className="h-8 w-12 mx-auto mb-2" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>

        {/* Services Skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
