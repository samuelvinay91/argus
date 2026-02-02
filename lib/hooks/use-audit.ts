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
// Note: Properties use camelCase because API responses are converted from snake_case
export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  description: string;
  metadata: Record<string, unknown>;
  ipAddress: string;
  status: 'success' | 'failure' | 'pending';
  createdAt: string;
}

export interface AuditStats {
  totalEvents: number;
  eventsLast24h: number;
  successCount: number;
  failureCount: number;
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  totalPages: number;
  totalCount?: number;
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
    placeholderData: { logs: [], totalPages: 1 },
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
      totalEvents: 0,
      eventsLast24h: 0,
      successCount: 0,
      failureCount: 0,
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
      new Date(log.createdAt).toISOString(),
      log.userEmail,
      log.action,
      `"${log.description}"`,
      log.status,
      log.ipAddress,
    ].join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;

  return { url, filename };
}
