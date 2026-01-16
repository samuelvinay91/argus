'use client';

import * as React from 'react';
import { Chrome, Compass, Globe, Cpu, HardDrive, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface BrowserNodeData {
  browser_type: string;
  replicas_current: number;
  replicas_desired: number;
  replicas_min: number;
  replicas_max: number;
  cpu_utilization: number;
  memory_utilization: number;
  sessions_active: number;
}

export interface SeleniumData {
  sessions_queued: number;
  sessions_active: number;
  sessions_total: number;
  nodes_available: number;
  nodes_total: number;
  avg_session_duration_seconds: number;
  queue_wait_time_seconds: number;
}

interface BrowserNodesStatusProps {
  selenium: SeleniumData | null;
  chromeNodes: BrowserNodeData | null;
  firefoxNodes: BrowserNodeData | null;
  edgeNodes: BrowserNodeData | null;
  isLoading?: boolean;
}

const browserIcons: Record<string, React.ReactNode> = {
  chrome: <Chrome className="h-5 w-5" />,
  firefox: <Compass className="h-5 w-5" />,
  edge: <Globe className="h-5 w-5" />,
};

const browserColors: Record<string, string> = {
  chrome: 'text-yellow-500',
  firefox: 'text-orange-500',
  edge: 'text-blue-500',
};

function UtilizationBar({ value, label, variant = 'default' }: {
  value: number;
  label: string;
  variant?: 'default' | 'warning' | 'error';
}) {
  const getColor = () => {
    if (variant === 'error' || value > 90) return 'bg-error';
    if (variant === 'warning' || value > 70) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getColor())}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

function BrowserNodeCard({ data }: { data: BrowserNodeData }) {
  const isScaling = data.replicas_current !== data.replicas_desired;

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={browserColors[data.browser_type]}>
            {browserIcons[data.browser_type]}
          </span>
          <span className="font-semibold capitalize">{data.browser_type}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isScaling ? 'secondary' : 'outline'} className="text-xs">
            {data.replicas_current}/{data.replicas_max} pods
          </Badge>
          {isScaling && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              Scaling...
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <UtilizationBar
          value={data.cpu_utilization}
          label="CPU"
          variant={data.cpu_utilization > 80 ? 'warning' : 'default'}
        />
        <UtilizationBar
          value={data.memory_utilization}
          label="Memory"
          variant={data.memory_utilization > 80 ? 'warning' : 'default'}
        />
      </div>

      <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
        <span>Sessions: {data.sessions_active}</span>
        <span>Min: {data.replicas_min} / Max: {data.replicas_max}</span>
      </div>
    </div>
  );
}

export function BrowserNodesStatus({
  selenium,
  chromeNodes,
  firefoxNodes,
  edgeNodes,
  isLoading = false,
}: BrowserNodesStatusProps) {
  if (isLoading) {
    return <BrowserNodesStatusSkeleton />;
  }

  if (!selenium) {
    return null;
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    return `${(seconds / 60).toFixed(1)}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-info" />
          Browser Pool Status
        </CardTitle>
        <CardDescription>
          Real-time Selenium Grid and browser node metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selenium Grid Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-info">{selenium.sessions_active}</p>
            <p className="text-xs text-muted-foreground">Active Sessions</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className={cn(
              'text-2xl font-bold',
              selenium.sessions_queued > 0 ? 'text-warning' : 'text-success'
            )}>
              {selenium.sessions_queued}
            </p>
            <p className="text-xs text-muted-foreground">Queued</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">
              {selenium.nodes_available}/{selenium.nodes_total}
            </p>
            <p className="text-xs text-muted-foreground">Nodes Available</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">
              {formatDuration(selenium.avg_session_duration_seconds)}
            </p>
            <p className="text-xs text-muted-foreground">Avg Duration</p>
          </div>
        </div>

        {/* Queue Wait Time Warning */}
        {selenium.queue_wait_time_seconds > 30 && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
            ⚠️ Queue wait time is {formatDuration(selenium.queue_wait_time_seconds)}. Consider scaling up browser nodes.
          </div>
        )}

        {/* Browser Nodes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {chromeNodes && <BrowserNodeCard data={chromeNodes} />}
          {firefoxNodes && <BrowserNodeCard data={firefoxNodes} />}
          {edgeNodes && <BrowserNodeCard data={edgeNodes} />}
        </div>
      </CardContent>
    </Card>
  );
}

export function BrowserNodesStatusSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-72 bg-muted animate-pulse rounded mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="h-8 w-16 bg-muted animate-pulse rounded mx-auto mb-2" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded mx-auto" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg border bg-muted/30 h-40" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
