'use client';

/**
 * Audit Log Hooks
 *
 * Provides authenticated API calls for audit log management.
 * Uses the global apiClient for consistent auth handling.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient, authenticatedFetch } from '@/lib/api-client';

// Types
export interface AuditLogEntry {
  id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  description: string;
  metadata: Record<string, unknown>;
  ip_address: string;
  status: 'success' | 'failure' | 'pending';
  created_at: string;
}

export interface AuditStats {
  total_events: number;
  events_last_24h: number;
  success_count: number;
  failure_count: number;
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total_pages: number;
  total_count?: number;
}

export interface AuditLogsParams {
  page?: number;
  pageSize?: number;
  actionFilter?: string | null;
  statusFilter?: string | null;
  search?: string;
}

// Query keys factory
const auditKeys = {
  all: ['audit'] as const,
  logs: (orgId: string, params?: AuditLogsParams) =>
    [...auditKeys.all, 'logs', orgId, params] as const,
  stats: (orgId: string) => [...auditKeys.all, 'stats', orgId] as const,
};

/**
 * Hook to fetch audit logs with pagination and filters
 */
export function useAuditLogs(orgId: string, params: AuditLogsParams = {}) {
  const {
    page = 1,
    pageSize = 20,
    actionFilter,
    statusFilter,
    search,
  } = params;

  return useQuery({
    queryKey: auditKeys.logs(orgId, { page, pageSize, actionFilter, statusFilter, search }),
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (actionFilter) searchParams.append('action_filter', actionFilter);
      if (statusFilter) searchParams.append('status_filter', statusFilter);
      if (search) searchParams.append('search', search);

      return apiClient.get<AuditLogsResponse>(
        `/api/v1/audit/organizations/${orgId}/logs?${searchParams}`
      );
    },
    enabled: !!orgId,
    placeholderData: { logs: [], total_pages: 1 },
  });
}

/**
 * Hook to fetch audit statistics
 */
export function useAuditStats(orgId: string) {
  return useQuery({
    queryKey: auditKeys.stats(orgId),
    queryFn: async () => {
      return apiClient.get<AuditStats>(`/api/v1/audit/organizations/${orgId}/stats`);
    },
    enabled: !!orgId,
    placeholderData: {
      total_events: 0,
      events_last_24h: 0,
      success_count: 0,
      failure_count: 0,
    },
  });
}

/**
 * Export audit logs as CSV
 * Returns a blob URL for download
 */
export async function exportAuditLogs(
  orgId: string,
  params: Pick<AuditLogsParams, 'actionFilter' | 'statusFilter' | 'search'> = {}
): Promise<{ url: string; filename: string }> {
  const searchParams = new URLSearchParams();
  if (params.actionFilter) searchParams.append('action_filter', params.actionFilter);
  if (params.statusFilter) searchParams.append('status_filter', params.statusFilter);
  if (params.search) searchParams.append('search', params.search);

  const response = await authenticatedFetch(
    `/api/v1/audit/organizations/${orgId}/export?${searchParams}`
  );

  if (!response.ok) {
    throw new Error('Failed to export audit logs');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;

  return { url, filename };
}

/**
 * Client-side fallback export for when API doesn't support export
 */
export function exportLogsToCSV(logs: AuditLogEntry[]): { url: string; filename: string } {
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
  const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;

  return { url, filename };
}
