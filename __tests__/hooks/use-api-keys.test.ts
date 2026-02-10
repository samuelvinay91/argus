/**
 * Tests for lib/hooks/use-api-keys.ts
 *
 * Tests API key management React Query hooks including:
 * - useApiKeys
 * - useCreateApiKey
 * - useRevokeApiKey
 * - useDeleteApiKey
 * - useRotateApiKey
 * - useApiKeyStats
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock useAuthApi
vi.mock('@/lib/hooks/use-auth-api', () => ({
  useAuthApi: vi.fn(() => ({
    fetchJson: vi.fn(),
    isLoaded: true,
    isSignedIn: true,
    orgId: 'org-123',
  })),
}));

import { useAuthApi } from '@/lib/hooks/use-auth-api';

describe('use-api-keys', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  const mockApiKeys = [
    {
      id: 'key-1',
      name: 'Production Key',
      key_prefix: 'skopaq_live_',
      scopes: ['read', 'write'],
      last_used_at: '2024-01-15T00:00:00Z',
      request_count: 100,
      expires_at: null,
      revoked_at: null,
      created_at: '2024-01-01T00:00:00Z',
      is_active: true,
    },
    {
      id: 'key-2',
      name: 'Test Key',
      key_prefix: 'skopaq_test_',
      scopes: ['read'],
      last_used_at: null,
      request_count: 0,
      expires_at: '2024-12-31T00:00:00Z',
      revoked_at: null,
      created_at: '2024-01-10T00:00:00Z',
      is_active: true,
    },
    {
      id: 'key-3',
      name: 'Revoked Key',
      key_prefix: 'skopaq_old_',
      scopes: ['read'],
      last_used_at: '2023-12-01T00:00:00Z',
      request_count: 50,
      expires_at: null,
      revoked_at: '2024-01-05T00:00:00Z',
      created_at: '2023-06-01T00:00:00Z',
      is_active: false,
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  describe('useApiKeys', () => {
    it('should fetch API keys when authenticated', async () => {
      const mockFetchJson = vi.fn().mockResolvedValue({
        data: mockApiKeys.filter((k) => k.is_active),
        error: null,
        status: 200,
      });

      vi.mocked(useAuthApi).mockReturnValue({
        fetchJson: mockFetchJson,
        isLoaded: true,
        isSignedIn: true,
        orgId: 'org-123',
      } as any);

      const { useApiKeys } = await import('@/lib/hooks/use-api-keys');

      const { result } = renderHook(() => useApiKeys(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchJson).toHaveBeenCalledWith(
        '/api/v1/api-keys/organizations/org-123/keys'
      );
    });

    it('should include revoked keys when requested', async () => {
      const mockFetchJson = vi.fn().mockResolvedValue({
        data: mockApiKeys,
        error: null,
        status: 200,
      });

      vi.mocked(useAuthApi).mockReturnValue({
        fetchJson: mockFetchJson,
        isLoaded: true,
        isSignedIn: true,
        orgId: 'org-123',
      } as any);

      const { useApiKeys } = await import('@/lib/hooks/use-api-keys');

      const { result } = renderHook(() => useApiKeys(true), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchJson).toHaveBeenCalledWith(
        '/api/v1/api-keys/organizations/org-123/keys?include_revoked=true'
      );
    });

    it('should not fetch when not authenticated', async () => {
      const mockFetchJson = vi.fn();

      vi.mocked(useAuthApi).mockReturnValue({
        fetchJson: mockFetchJson,
        isLoaded: true,
        isSignedIn: false,
        orgId: null,
      } as any);

      const { useApiKeys } = await import('@/lib/hooks/use-api-keys');

      renderHook(() => useApiKeys(), { wrapper });

      // Should not make any API calls
      expect(mockFetchJson).not.toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      const mockFetchJson = vi.fn().mockResolvedValue({
        data: null,
        error: 'Failed to fetch API keys',
        status: 500,
      });

      vi.mocked(useAuthApi).mockReturnValue({
        fetchJson: mockFetchJson,
        isLoaded: true,
        isSignedIn: true,
        orgId: 'org-123',
      } as any);

      const { useApiKeys } = await import('@/lib/hooks/use-api-keys');

      const { result } = renderHook(() => useApiKeys(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });
  });

  describe('useCreateApiKey', () => {
    it('should create an API key', async () => {
      const newKey = {
        id: 'new-key',
        name: 'New Key',
        key_prefix: 'skopaq_',
        key: 'skopaq_live_abc123xyz',
        scopes: ['read', 'write'],
        is_active: true,
      };

      const mockFetchJson = vi.fn().mockResolvedValue({
        data: newKey,
        error: null,
        status: 201,
      });

      vi.mocked(useAuthApi).mockReturnValue({
        fetchJson: mockFetchJson,
        isLoaded: true,
        isSignedIn: true,
        orgId: 'org-123',
      } as any);

      const { useCreateApiKey } = await import('@/lib/hooks/use-api-keys');

      const { result } = renderHook(() => useCreateApiKey(), { wrapper });

      await act(async () => {
        const created = await result.current.mutateAsync({
          name: 'New Key',
          scopes: ['read', 'write'],
          expires_in_days: 90,
        });

        expect(created.key).toBe('skopaq_live_abc123xyz');
      });

      expect(mockFetchJson).toHaveBeenCalledWith(
        '/api/v1/api-keys/organizations/org-123/keys',
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'New Key',
            scopes: ['read', 'write'],
            expires_in_days: 90,
          }),
        }
      );
    });

    it('should use default scopes when not provided', async () => {
      const mockFetchJson = vi.fn().mockResolvedValue({
        data: { id: 'new-key', key: 'skopaq_abc' },
        error: null,
        status: 201,
      });

      vi.mocked(useAuthApi).mockReturnValue({
        fetchJson: mockFetchJson,
        isLoaded: true,
        isSignedIn: true,
        orgId: 'org-123',
      } as any);

      const { useCreateApiKey } = await import('@/lib/hooks/use-api-keys');

      const { result } = renderHook(() => useCreateApiKey(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ name: 'Minimal Key' });
      });

      expect(mockFetchJson).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"scopes":["read","write"]'),
        })
      );
    });

    it('should invalidate queries on success', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const mockFetchJson = vi.fn().mockResolvedValue({
        data: { id: 'new-key', key: 'skopaq_abc' },
        error: null,
        status: 201,
      });

      vi.mocked(useAuthApi).mockReturnValue({
        fetchJson: mockFetchJson,
        isLoaded: true,
        isSignedIn: true,
        orgId: 'org-123',
      } as any);

      const { useCreateApiKey } = await import('@/lib/hooks/use-api-keys');

      const { result } = renderHook(() => useCreateApiKey(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ name: 'New Key' });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['api-keys'],
      });
    });
  });

  describe('useRevokeApiKey', () => {
    it('should revoke an API key', async () => {
      const mockFetchJson = vi.fn().mockResolvedValue({
        data: { success: true, message: 'API key revoked' },
        error: null,
        status: 200,
      });

      vi.mocked(useAuthApi).mockReturnValue({
        fetchJson: mockFetchJson,
        isLoaded: true,
        isSignedIn: true,
        orgId: 'org-123',
      } as any);

      const { useRevokeApiKey } = await import('@/lib/hooks/use-api-keys');

      const { result } = renderHook(() => useRevokeApiKey(), { wrapper });

      await act(async () => {
        const response = await result.current.mutateAsync('key-1');
        expect(response.success).toBe(true);
      });

      expect(mockFetchJson).toHaveBeenCalledWith(
        '/api/v1/api-keys/organizations/org-123/keys/key-1',
        { method: 'DELETE' }
      );
    });

    it('should handle revoke error', async () => {
      const mockFetchJson = vi.fn().mockResolvedValue({
        data: null,
        error: 'Key not found',
        status: 404,
      });

      vi.mocked(useAuthApi).mockReturnValue({
        fetchJson: mockFetchJson,
        isLoaded: true,
        isSignedIn: true,
        orgId: 'org-123',
      } as any);

      const { useRevokeApiKey } = await import('@/lib/hooks/use-api-keys');

      const { result } = renderHook(() => useRevokeApiKey(), { wrapper });

      await expect(result.current.mutateAsync('invalid-key')).rejects.toThrow(
        'Key not found'
      );
    });
  });

  describe('useDeleteApiKey', () => {
    it('should be an alias for useRevokeApiKey', async () => {
      const mockFetchJson = vi.fn().mockResolvedValue({
        data: { success: true, message: 'API key revoked' },
        error: null,
        status: 200,
      });

      vi.mocked(useAuthApi).mockReturnValue({
        fetchJson: mockFetchJson,
        isLoaded: true,
        isSignedIn: true,
        orgId: 'org-123',
      } as any);

      const { useDeleteApiKey } = await import('@/lib/hooks/use-api-keys');

      const { result } = renderHook(() => useDeleteApiKey(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('key-1');
      });

      expect(mockFetchJson).toHaveBeenCalledWith(
        '/api/v1/api-keys/organizations/org-123/keys/key-1',
        { method: 'DELETE' }
      );
    });
  });

  describe('useRotateApiKey', () => {
    it('should rotate an API key', async () => {
      const rotateResponse = {
        old_key_id: 'key-1',
        new_key: {
          id: 'key-new',
          name: 'Production Key',
          key: 'skopaq_live_new123',
          key_prefix: 'skopaq_live_',
          scopes: ['read', 'write'],
          is_active: true,
        },
        message: 'Key rotated successfully',
      };

      const mockFetchJson = vi.fn().mockResolvedValue({
        data: rotateResponse,
        error: null,
        status: 200,
      });

      vi.mocked(useAuthApi).mockReturnValue({
        fetchJson: mockFetchJson,
        isLoaded: true,
        isSignedIn: true,
        orgId: 'org-123',
      } as any);

      const { useRotateApiKey } = await import('@/lib/hooks/use-api-keys');

      const { result } = renderHook(() => useRotateApiKey(), { wrapper });

      await act(async () => {
        const response = await result.current.mutateAsync('key-1');
        expect(response.new_key.key).toBe('skopaq_live_new123');
        expect(response.old_key_id).toBe('key-1');
      });

      expect(mockFetchJson).toHaveBeenCalledWith(
        '/api/v1/api-keys/organizations/org-123/keys/key-1/rotate',
        { method: 'POST' }
      );
    });

    it('should invalidate queries on success', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const mockFetchJson = vi.fn().mockResolvedValue({
        data: {
          old_key_id: 'key-1',
          new_key: { id: 'key-new', key: 'skopaq_new' },
          message: 'Rotated',
        },
        error: null,
        status: 200,
      });

      vi.mocked(useAuthApi).mockReturnValue({
        fetchJson: mockFetchJson,
        isLoaded: true,
        isSignedIn: true,
        orgId: 'org-123',
      } as any);

      const { useRotateApiKey } = await import('@/lib/hooks/use-api-keys');

      const { result } = renderHook(() => useRotateApiKey(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('key-1');
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['api-keys'],
      });
    });
  });

  describe('useApiKeyStats', () => {
    it('should calculate statistics from API keys', async () => {
      const mockFetchJson = vi.fn().mockResolvedValue({
        data: mockApiKeys,
        error: null,
        status: 200,
      });

      vi.mocked(useAuthApi).mockReturnValue({
        fetchJson: mockFetchJson,
        isLoaded: true,
        isSignedIn: true,
        orgId: 'org-123',
      } as any);

      const { useApiKeyStats } = await import('@/lib/hooks/use-api-keys');

      const { result } = renderHook(() => useApiKeyStats(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.total).toBe(3);
      expect(result.current.active).toBe(2);
      expect(result.current.revoked).toBe(1);
      expect(result.current.totalRequests).toBe(150); // 100 + 0 + 50
    });

    it('should find the most recent last_used_at', async () => {
      const mockFetchJson = vi.fn().mockResolvedValue({
        data: mockApiKeys,
        error: null,
        status: 200,
      });

      vi.mocked(useAuthApi).mockReturnValue({
        fetchJson: mockFetchJson,
        isLoaded: true,
        isSignedIn: true,
        orgId: 'org-123',
      } as any);

      const { useApiKeyStats } = await import('@/lib/hooks/use-api-keys');

      const { result } = renderHook(() => useApiKeyStats(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.lastUsed).toBe('2024-01-15T00:00:00Z');
    });

    it('should return zeros when no keys exist', async () => {
      const mockFetchJson = vi.fn().mockResolvedValue({
        data: [],
        error: null,
        status: 200,
      });

      vi.mocked(useAuthApi).mockReturnValue({
        fetchJson: mockFetchJson,
        isLoaded: true,
        isSignedIn: true,
        orgId: 'org-123',
      } as any);

      const { useApiKeyStats } = await import('@/lib/hooks/use-api-keys');

      const { result } = renderHook(() => useApiKeyStats(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.total).toBe(0);
      expect(result.current.active).toBe(0);
      expect(result.current.totalRequests).toBe(0);
      expect(result.current.lastUsed).toBe(null);
    });
  });
});
