/**
 * Tests for lib/hooks/use-audit.ts
 *
 * Tests audit log hooks including:
 * - useAuditLogs
 * - useAuditStats
 * - exportAuditLogs
 * - exportLogsToCSV
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock apiClient and authenticatedFetch
const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

const mockAuthenticatedFetch = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: mockApiClient,
  authenticatedFetch: mockAuthenticatedFetch,
}));

// Mock URL.createObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:http://localhost/mock-blob-url');
const mockRevokeObjectURL = vi.fn();

describe('use-audit', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  const mockAuditLogs = [
    {
      id: 'log-1',
      user_id: 'user-123',
      user_email: 'admin@example.com',
      user_role: 'admin',
      action: 'project.created',
      resource_type: 'project',
      resource_id: 'proj-456',
      description: 'Created project "My Project"',
      metadata: { project_name: 'My Project' },
      ip_address: '192.168.1.1',
      status: 'success' as const,
      created_at: '2024-01-15T10:30:00Z',
    },
    {
      id: 'log-2',
      user_id: 'user-123',
      user_email: 'admin@example.com',
      user_role: 'admin',
      action: 'test.deleted',
      resource_type: 'test',
      resource_id: 'test-789',
      description: 'Deleted test "Login Test"',
      metadata: { test_name: 'Login Test' },
      ip_address: '192.168.1.1',
      status: 'success' as const,
      created_at: '2024-01-15T11:00:00Z',
    },
    {
      id: 'log-3',
      user_id: 'user-456',
      user_email: 'user@example.com',
      user_role: 'member',
      action: 'api_key.rotated',
      resource_type: 'api_key',
      resource_id: 'key-123',
      description: 'Rotated API key',
      metadata: {},
      ip_address: '10.0.0.1',
      status: 'failure' as const,
      created_at: '2024-01-15T12:00:00Z',
    },
  ];

  const mockAuditLogsResponse = {
    logs: mockAuditLogs,
    total_pages: 3,
    total_count: 50,
  };

  const mockAuditStats = {
    total_events: 150,
    events_last_24h: 12,
    success_count: 140,
    failure_count: 10,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset all mocks
    vi.clearAllMocks();

    // Setup URL mock
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  describe('useAuditLogs', () => {
    it('should fetch audit logs for an organization', async () => {
      mockApiClient.get.mockResolvedValue(mockAuditLogsResponse);

      const { useAuditLogs } = await import('@/lib/hooks/use-audit');

      const { result } = renderHook(() => useAuditLogs('org-123'), { wrapper });

      // Wait for data to be populated (more reliable than just isLoading)
      await waitFor(() => {
        expect(result.current.data?.logs).toBeDefined();
        expect(result.current.data?.logs.length).toBeGreaterThan(0);
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/audit/organizations/org-123/logs?page=1&page_size=20'
      );
      expect(result.current.data?.logs).toEqual(mockAuditLogs);
      expect(result.current.data?.total_pages).toBe(3);
    });

    it('should not fetch when orgId is empty', async () => {
      const { useAuditLogs } = await import('@/lib/hooks/use-audit');

      const { result } = renderHook(() => useAuditLogs(''), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should fetch with pagination parameters', async () => {
      mockApiClient.get.mockResolvedValue(mockAuditLogsResponse);

      const { useAuditLogs } = await import('@/lib/hooks/use-audit');

      const { result } = renderHook(
        () => useAuditLogs('org-123', { page: 2, pageSize: 50 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/audit/organizations/org-123/logs?page=2&page_size=50'
      );
    });

    it('should fetch with action filter', async () => {
      mockApiClient.get.mockResolvedValue(mockAuditLogsResponse);

      const { useAuditLogs } = await import('@/lib/hooks/use-audit');

      const { result } = renderHook(
        () => useAuditLogs('org-123', { actionFilter: 'project.created' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/audit/organizations/org-123/logs?page=1&page_size=20&action_filter=project.created'
      );
    });

    it('should fetch with status filter', async () => {
      mockApiClient.get.mockResolvedValue(mockAuditLogsResponse);

      const { useAuditLogs } = await import('@/lib/hooks/use-audit');

      const { result } = renderHook(
        () => useAuditLogs('org-123', { statusFilter: 'failure' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/audit/organizations/org-123/logs?page=1&page_size=20&status_filter=failure'
      );
    });

    it('should fetch with search parameter', async () => {
      mockApiClient.get.mockResolvedValue(mockAuditLogsResponse);

      const { useAuditLogs } = await import('@/lib/hooks/use-audit');

      const { result } = renderHook(
        () => useAuditLogs('org-123', { search: 'project' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/audit/organizations/org-123/logs?page=1&page_size=20&search=project'
      );
    });

    it('should fetch with multiple filters combined', async () => {
      mockApiClient.get.mockResolvedValue(mockAuditLogsResponse);

      const { useAuditLogs } = await import('@/lib/hooks/use-audit');

      const { result } = renderHook(
        () =>
          useAuditLogs('org-123', {
            page: 2,
            pageSize: 25,
            actionFilter: 'test.deleted',
            statusFilter: 'success',
            search: 'login',
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/audit/organizations/org-123/logs?page=2&page_size=25&action_filter=test.deleted&status_filter=success&search=login'
      );
    });

    it('should use placeholderData to prevent loading flash', async () => {
      // Never resolve the API call
      mockApiClient.get.mockImplementation(() => new Promise(() => {}));

      const { useAuditLogs } = await import('@/lib/hooks/use-audit');

      const { result } = renderHook(() => useAuditLogs('org-123'), { wrapper });

      // Should have placeholder data immediately
      expect(result.current.data).toEqual({ logs: [], total_pages: 1 });
    });

    it('should handle API error gracefully', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      const { useAuditLogs } = await import('@/lib/hooks/use-audit');

      const { result } = renderHook(() => useAuditLogs('org-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should not include null filter values in query string', async () => {
      mockApiClient.get.mockResolvedValue(mockAuditLogsResponse);

      const { useAuditLogs } = await import('@/lib/hooks/use-audit');

      const { result } = renderHook(
        () =>
          useAuditLogs('org-123', {
            actionFilter: null,
            statusFilter: null,
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not include action_filter or status_filter in URL
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/audit/organizations/org-123/logs?page=1&page_size=20'
      );
    });
  });

  describe('useAuditStats', () => {
    it('should fetch audit statistics for an organization', async () => {
      mockApiClient.get.mockResolvedValue(mockAuditStats);

      const { useAuditStats } = await import('@/lib/hooks/use-audit');

      const { result } = renderHook(() => useAuditStats('org-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.data?.total_events).toBe(150);
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/audit/organizations/org-123/stats'
      );
      expect(result.current.data?.events_last_24h).toBe(12);
      expect(result.current.data?.success_count).toBe(140);
      expect(result.current.data?.failure_count).toBe(10);
    });

    it('should not fetch when orgId is empty', async () => {
      const { useAuditStats } = await import('@/lib/hooks/use-audit');

      const { result } = renderHook(() => useAuditStats(''), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should use placeholderData to prevent loading flash', async () => {
      // Never resolve the API call
      mockApiClient.get.mockImplementation(() => new Promise(() => {}));

      const { useAuditStats } = await import('@/lib/hooks/use-audit');

      const { result } = renderHook(() => useAuditStats('org-123'), { wrapper });

      // Should have default placeholder data immediately
      expect(result.current.data).toEqual({
        total_events: 0,
        events_last_24h: 0,
        success_count: 0,
        failure_count: 0,
      });
    });

    it('should handle API error gracefully', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      const { useAuditStats } = await import('@/lib/hooks/use-audit');

      const { result } = renderHook(() => useAuditStats('org-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('exportAuditLogs', () => {
    it('should export audit logs and return blob URL', async () => {
      const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
      mockAuthenticatedFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const { exportAuditLogs } = await import('@/lib/hooks/use-audit');

      const result = await exportAuditLogs('org-123');

      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        '/api/v1/audit/organizations/org-123/export?'
      );
      expect(result.url).toBe('blob:http://localhost/mock-blob-url');
      expect(result.filename).toMatch(/^audit_logs_\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('should export with filters', async () => {
      const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
      mockAuthenticatedFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const { exportAuditLogs } = await import('@/lib/hooks/use-audit');

      await exportAuditLogs('org-123', {
        actionFilter: 'project.created',
        statusFilter: 'success',
        search: 'test',
      });

      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        '/api/v1/audit/organizations/org-123/export?action_filter=project.created&status_filter=success&search=test'
      );
    });

    it('should throw error when export fails', async () => {
      mockAuthenticatedFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { exportAuditLogs } = await import('@/lib/hooks/use-audit');

      await expect(exportAuditLogs('org-123')).rejects.toThrow(
        'Failed to export audit logs'
      );
    });

    it('should handle partial filters', async () => {
      const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
      mockAuthenticatedFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const { exportAuditLogs } = await import('@/lib/hooks/use-audit');

      await exportAuditLogs('org-123', {
        actionFilter: 'user.login',
      });

      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        '/api/v1/audit/organizations/org-123/export?action_filter=user.login'
      );
    });
  });

  describe('exportLogsToCSV', () => {
    it('should generate CSV from audit logs', async () => {
      const { exportLogsToCSV } = await import('@/lib/hooks/use-audit');

      const result = exportLogsToCSV(mockAuditLogs);

      expect(result.url).toBe('blob:http://localhost/mock-blob-url');
      expect(result.filename).toMatch(/^audit_logs_\d{4}-\d{2}-\d{2}\.csv$/);
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    it('should generate correct CSV headers', async () => {
      // Capture the blob content
      let capturedBlob: Blob | null = null;
      mockCreateObjectURL.mockImplementation((blob: Blob) => {
        capturedBlob = blob;
        return 'blob:http://localhost/mock-blob-url';
      });

      const { exportLogsToCSV } = await import('@/lib/hooks/use-audit');

      exportLogsToCSV(mockAuditLogs);

      expect(capturedBlob).not.toBeNull();
      const text = await capturedBlob!.text();
      const lines = text.split('\n');

      expect(lines[0]).toBe('Time,User,Action,Description,Status,IP Address');
    });

    it('should include all log entries in CSV', async () => {
      let capturedBlob: Blob | null = null;
      mockCreateObjectURL.mockImplementation((blob: Blob) => {
        capturedBlob = blob;
        return 'blob:http://localhost/mock-blob-url';
      });

      const { exportLogsToCSV } = await import('@/lib/hooks/use-audit');

      exportLogsToCSV(mockAuditLogs);

      expect(capturedBlob).not.toBeNull();
      const text = await capturedBlob!.text();
      const lines = text.split('\n');

      // Header + 3 data rows
      expect(lines).toHaveLength(4);
      expect(lines[1]).toContain('admin@example.com');
      expect(lines[1]).toContain('project.created');
      expect(lines[2]).toContain('test.deleted');
      expect(lines[3]).toContain('api_key.rotated');
    });

    it('should handle empty logs array', async () => {
      let capturedBlob: Blob | null = null;
      mockCreateObjectURL.mockImplementation((blob: Blob) => {
        capturedBlob = blob;
        return 'blob:http://localhost/mock-blob-url';
      });

      const { exportLogsToCSV } = await import('@/lib/hooks/use-audit');

      const result = exportLogsToCSV([]);

      expect(result.url).toBe('blob:http://localhost/mock-blob-url');
      expect(capturedBlob).not.toBeNull();
      const text = await capturedBlob!.text();
      const lines = text.split('\n');

      // Only header row
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe('Time,User,Action,Description,Status,IP Address');
    });

    it('should properly quote descriptions containing commas', async () => {
      let capturedBlob: Blob | null = null;
      mockCreateObjectURL.mockImplementation((blob: Blob) => {
        capturedBlob = blob;
        return 'blob:http://localhost/mock-blob-url';
      });

      const { exportLogsToCSV } = await import('@/lib/hooks/use-audit');

      const logsWithCommas = [
        {
          ...mockAuditLogs[0],
          description: 'Created project "Test, with comma"',
        },
      ];

      exportLogsToCSV(logsWithCommas);

      expect(capturedBlob).not.toBeNull();
      const text = await capturedBlob!.text();

      // Description should be quoted
      expect(text).toContain('"Created project "Test, with comma""');
    });

    it('should format dates as ISO strings', async () => {
      let capturedBlob: Blob | null = null;
      mockCreateObjectURL.mockImplementation((blob: Blob) => {
        capturedBlob = blob;
        return 'blob:http://localhost/mock-blob-url';
      });

      const { exportLogsToCSV } = await import('@/lib/hooks/use-audit');

      exportLogsToCSV(mockAuditLogs);

      expect(capturedBlob).not.toBeNull();
      const text = await capturedBlob!.text();

      // Should contain ISO formatted date
      expect(text).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('auditKeys (query key factory)', () => {
    it('should generate unique keys for different orgIds', async () => {
      mockApiClient.get.mockResolvedValue(mockAuditLogsResponse);

      const { useAuditLogs } = await import('@/lib/hooks/use-audit');

      // First org
      renderHook(() => useAuditLogs('org-123'), { wrapper });

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      });

      // Second org - should make a new request
      renderHook(() => useAuditLogs('org-456'), { wrapper });

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      });
    });

    it('should generate unique keys for different filter combinations', async () => {
      mockApiClient.get.mockResolvedValue(mockAuditLogsResponse);

      const { useAuditLogs } = await import('@/lib/hooks/use-audit');

      // Without filter
      renderHook(() => useAuditLogs('org-123'), { wrapper });

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      });

      // With filter - should make a new request
      renderHook(() => useAuditLogs('org-123', { actionFilter: 'test' }), {
        wrapper,
      });

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      });
    });
  });
});
