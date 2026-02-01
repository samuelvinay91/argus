'use client';

import { useState } from 'react';
import { safeFormatDistanceToNow, safeFormat } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Filter,
  Mail,
  MessageSquare,
  Bell,
  Webhook,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface NotificationLog {
  id: string;
  channel_id: string;
  channel_name?: string;
  channel_type: string;
  rule_id?: string;
  event_type: string;
  event_id?: string;
  payload: Record<string, any>;
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'suppressed';
  response_code?: number;
  response_body?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  queued_at: string;
  sent_at?: string;
  delivered_at?: string;
  created_at: string;
}

interface NotificationLogsProps {
  logs: NotificationLog[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onRetry?: (logId: string) => void;
}

function StatusIcon({ status }: { status: NotificationLog['status'] }) {
  switch (status) {
    case 'delivered':
    case 'sent':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
    case 'bounced':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'pending':
    case 'queued':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'suppressed':
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: NotificationLog['status'] }) {
  const statusConfig: Record<NotificationLog['status'], { label: string; className: string }> = {
    delivered: { label: 'Delivered', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
    sent: { label: 'Sent', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
    failed: { label: 'Failed', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
    bounced: { label: 'Bounced', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
    pending: { label: 'Pending', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    queued: { label: 'Queued', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    suppressed: { label: 'Suppressed', className: 'bg-muted text-muted-foreground border-border' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
      config.className
    )}>
      {config.label}
    </span>
  );
}

function ChannelIcon({ type }: { type: string }) {
  switch (type) {
    case 'slack':
    case 'discord':
    case 'teams':
      return <MessageSquare className="h-3.5 w-3.5" />;
    case 'email':
      return <Mail className="h-3.5 w-3.5" />;
    case 'webhook':
      return <Webhook className="h-3.5 w-3.5" />;
    default:
      return <Bell className="h-3.5 w-3.5" />;
  }
}

function formatEventType(eventType: string): string {
  // Convert 'test.run.failed' to 'Test Run Failed'
  return eventType
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function LogRow({
  log,
  onRetry,
}: {
  log: NotificationLog;
  onRetry?: (logId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasDetails = log.error_message || log.response_body || log.payload;
  const canRetry = (log.status === 'failed' || log.status === 'bounced') &&
                   log.retry_count < log.max_retries;

  return (
    <div className="border-b last:border-0">
      {/* Main Row */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 transition-colors',
          hasDetails && 'cursor-pointer hover:bg-muted/50'
        )}
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
      >
        {/* Expand Icon */}
        <div className="w-4 flex-shrink-0">
          {hasDetails && (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          )}
        </div>

        {/* Status */}
        <StatusIcon status={log.status} />

        {/* Event Type */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">
              {formatEventType(log.event_type)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ChannelIcon type={log.channel_type} />
              <span>{log.channel_name || log.channel_type}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {safeFormatDistanceToNow(log.created_at, { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Retry Count */}
        {log.retry_count > 0 && (
          <span className="text-xs text-muted-foreground">
            {log.retry_count}/{log.max_retries} retries
          </span>
        )}

        {/* Status Badge */}
        <StatusBadge status={log.status} />

        {/* Retry Button */}
        {canRetry && onRetry && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onRetry(log.id);
            }}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && hasDetails && (
        <div className="px-4 py-3 ml-7 border-t bg-muted/30 space-y-3">
          {/* Error Message */}
          {log.error_message && (
            <div>
              <div className="text-xs font-medium text-red-500 mb-1">Error</div>
              <div className="text-xs text-muted-foreground bg-red-500/5 p-2 rounded border border-red-500/20 font-mono">
                {log.error_message}
              </div>
            </div>
          )}

          {/* Response */}
          {log.response_code && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Response Code: {log.response_code}
              </div>
              {log.response_body && (
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded font-mono max-h-24 overflow-auto">
                  {log.response_body}
                </div>
              )}
            </div>
          )}

          {/* Payload Preview */}
          {log.payload && Object.keys(log.payload).length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Payload</div>
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded font-mono max-h-32 overflow-auto">
                {JSON.stringify(log.payload, null, 2)}
              </div>
            </div>
          )}

          {/* Timing Details */}
          <div className="grid grid-cols-3 gap-4 text-xs pt-2 border-t">
            <div>
              <div className="text-muted-foreground">Queued</div>
              <div className="font-medium">
                {safeFormat(log.queued_at, 'MMM d, HH:mm:ss')}
              </div>
            </div>
            {log.sent_at && (
              <div>
                <div className="text-muted-foreground">Sent</div>
                <div className="font-medium">
                  {safeFormat(log.sent_at, 'MMM d, HH:mm:ss')}
                </div>
              </div>
            )}
            {log.delivered_at && (
              <div>
                <div className="text-muted-foreground">Delivered</div>
                <div className="font-medium">
                  {safeFormat(log.delivered_at, 'MMM d, HH:mm:ss')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function NotificationLogs({
  logs,
  isLoading,
  onRefresh,
  onRetry,
}: NotificationLogsProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed'>('all');

  const filteredLogs = logs.filter(log => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'success') return ['sent', 'delivered'].includes(log.status);
    if (filterStatus === 'failed') return ['failed', 'bounced'].includes(log.status);
    return true;
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <h4 className="text-sm font-semibold">Notification Logs</h4>
        </div>
        <div className="p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b flex items-center justify-between">
        <h4 className="text-sm font-semibold">Notification Logs</h4>
        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="h-7 text-xs rounded border bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Refresh */}
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={onRefresh}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="p-8 text-center">
          <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No notification logs</p>
          <p className="text-xs text-muted-foreground mt-1">
            {filterStatus !== 'all'
              ? 'Try changing the filter'
              : 'Notifications will appear here when sent'}
          </p>
        </div>
      ) : (
        <div className="divide-y max-h-[400px] overflow-y-auto">
          {filteredLogs.map((log) => (
            <LogRow key={log.id} log={log} onRetry={onRetry} />
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div className="p-2 border-t text-center">
          <span className="text-xs text-muted-foreground">
            Showing {filteredLogs.length} of {logs.length} logs
          </span>
        </div>
      )}
    </div>
  );
}
