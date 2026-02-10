/**
 * Tests for lib/hooks/use-current-organization.ts
 *
 * Tests the organization context hook including:
 * - getCurrentOrgId
 * - setCurrentOrgId
 * - clearCurrentOrgId
 * - useCurrentOrganization
 * - useCurrentOrganizationId
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useAuth: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    getToken: vi.fn().mockResolvedValue('mock-token'),
  })),
}));

// Mock api-client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { useAuth } from '@clerk/nextjs';
import { apiClient } from '@/lib/api-client';
import {
  getCurrentOrgId,
  setCurrentOrgId,
  clearCurrentOrgId,
  useCurrentOrganization,
  useCurrentOrganizationId,
} from '@/lib/hooks/use-current-organization';

describe('use-current-organization', () => {
  let mockLocalStorage: Record<string, string>;
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          retryDelay: 0, // Instant retries for hooks with custom retry functions
        },
      },
    });

    mockLocalStorage = {};
    // Use the global localStorage mock from vitest.setup.ts
    vi.mocked(localStorage.getItem).mockImplementation(
      (key: string) => mockLocalStorage[key] || null
    );
    vi.mocked(localStorage.setItem).mockImplementation(
      (key: string, value: string) => {
        mockLocalStorage[key] = value;
      }
    );
    vi.mocked(localStorage.removeItem).mockImplementation(
      (key: string) => {
        delete mockLocalStorage[key];
      }
    );

    // Reset mocks
    vi.mocked(useAuth).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      getToken: vi.fn().mockResolvedValue('mock-token'),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  describe('getCurrentOrgId', () => {
    it('should return null when no org ID is stored', () => {
      const result = getCurrentOrgId();
      expect(result).toBeNull();
    });

    it('should return org ID from localStorage', () => {
      mockLocalStorage['skopaq_current_org_id'] = 'org-123';

      const result = getCurrentOrgId();

      expect(result).toBe('org-123');
    });
  });

  describe('setCurrentOrgId', () => {
    it('should store org ID in localStorage', () => {
      setCurrentOrgId('org-456');

      expect(mockLocalStorage['skopaq_current_org_id']).toBe('org-456');
    });
  });

  describe('clearCurrentOrgId', () => {
    it('should remove org ID from localStorage', () => {
      mockLocalStorage['skopaq_current_org_id'] = 'org-to-remove';

      clearCurrentOrgId();

      expect(mockLocalStorage['skopaq_current_org_id']).toBeUndefined();
    });
  });

  describe('useCurrentOrganizationId', () => {
    it('should return null when no org ID exists', () => {
      const { result } = renderHook(() => useCurrentOrganizationId(), {
        wrapper,
      });

      expect(result.current).toBeNull();
    });

    it('should return org ID from localStorage', () => {
      mockLocalStorage['skopaq_current_org_id'] = 'stored-org-id';

      const { result } = renderHook(() => useCurrentOrganizationId(), {
        wrapper,
      });

      expect(result.current).toBe('stored-org-id');
    });
  });

  describe('useCurrentOrganization', () => {
    it('should return loading state initially when org ID exists', async () => {
      mockLocalStorage['skopaq_current_org_id'] = 'org-123';
      vi.mocked(apiClient.get).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useCurrentOrganization(), {
        wrapper,
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.organizationId).toBe('org-123');
    });

    it('should return organization data after successful fetch', async () => {
      mockLocalStorage['skopaq_current_org_id'] = 'org-123';
      const mockOrg = {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        plan: 'pro',
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockOrg);

      const { result } = renderHook(() => useCurrentOrganization(), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.organization).toEqual(mockOrg);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return null organization when no org ID exists', () => {
      const { result } = renderHook(() => useCurrentOrganization(), {
        wrapper,
      });

      expect(result.current.organization).toBeNull();
      expect(result.current.organizationId).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should return error state on fetch failure', async () => {
      mockLocalStorage['skopaq_current_org_id'] = 'org-123';
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useCurrentOrganization(), {
        wrapper,
      });

      await waitFor(() => {
        // Error should contain the message from the rejected promise
        expect(result.current.error).toBeTruthy();
      }, { timeout: 3000 });

      expect(result.current.organization).toBeNull();
    });

    it('should clear org ID on 404 error', async () => {
      mockLocalStorage['skopaq_current_org_id'] = 'nonexistent-org';
      vi.mocked(apiClient.get).mockRejectedValue(new Error('404 Not Found'));

      const { result } = renderHook(() => useCurrentOrganization(), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.organization).toBeNull();
      });

      // LocalStorage should be cleared
      expect(mockLocalStorage['skopaq_current_org_id']).toBeUndefined();
    });

    it('should clear org ID on 403 error', async () => {
      mockLocalStorage['skopaq_current_org_id'] = 'forbidden-org';
      vi.mocked(apiClient.get).mockRejectedValue(new Error('403 Forbidden'));

      const { result } = renderHook(() => useCurrentOrganization(), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.organization).toBeNull();
      });

      expect(mockLocalStorage['skopaq_current_org_id']).toBeUndefined();
    });

    describe('switchOrganization', () => {
      it('should update localStorage with new org ID', async () => {
        mockLocalStorage['skopaq_current_org_id'] = 'old-org';
        vi.mocked(apiClient.get).mockResolvedValue({ id: 'old-org', name: 'Old' });

        // Mock window.location.reload
        const mockReload = vi.fn();
        Object.defineProperty(window, 'location', {
          value: { reload: mockReload },
          writable: true,
        });

        const { result } = renderHook(() => useCurrentOrganization(), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.organization).not.toBeNull();
        });

        act(() => {
          result.current.switchOrganization('new-org');
        });

        expect(mockLocalStorage['skopaq_current_org_id']).toBe('new-org');
      });

      it('should not reload when reload option is false', async () => {
        mockLocalStorage['skopaq_current_org_id'] = 'old-org';
        vi.mocked(apiClient.get).mockResolvedValue({ id: 'old-org', name: 'Old' });

        const mockReload = vi.fn();
        Object.defineProperty(window, 'location', {
          value: { reload: mockReload },
          writable: true,
        });

        const { result } = renderHook(() => useCurrentOrganization(), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.organization).not.toBeNull();
        });

        act(() => {
          result.current.switchOrganization('new-org', { reload: false });
        });

        expect(mockReload).not.toHaveBeenCalled();
      });

      it('should call server API when updateServer is true', async () => {
        mockLocalStorage['skopaq_current_org_id'] = 'old-org';
        vi.mocked(apiClient.get).mockResolvedValue({ id: 'old-org', name: 'Old' });
        vi.mocked(apiClient.post).mockResolvedValue({});

        const mockReload = vi.fn();
        Object.defineProperty(window, 'location', {
          value: { reload: mockReload },
          writable: true,
        });

        const { result } = renderHook(() => useCurrentOrganization(), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.organization).not.toBeNull();
        });

        act(() => {
          result.current.switchOrganization('new-org', {
            reload: false,
            updateServer: true,
          });
        });

        expect(apiClient.post).toHaveBeenCalledWith(
          '/api/v1/users/me/organizations/new-org/switch'
        );
      });
    });

    describe('isReady', () => {
      it('should be true when auth is loaded and signed in', async () => {
        vi.mocked(useAuth).mockReturnValue({
          isLoaded: true,
          isSignedIn: true,
          getToken: vi.fn(),
        } as any);

        const { result } = renderHook(() => useCurrentOrganization(), {
          wrapper,
        });

        expect(result.current.isReady).toBe(true);
      });

      it('should be false when auth is not loaded', async () => {
        vi.mocked(useAuth).mockReturnValue({
          isLoaded: false,
          isSignedIn: false,
          getToken: vi.fn(),
        } as any);

        const { result } = renderHook(() => useCurrentOrganization(), {
          wrapper,
        });

        expect(result.current.isReady).toBe(false);
      });

      it('should be false when not signed in', async () => {
        vi.mocked(useAuth).mockReturnValue({
          isLoaded: true,
          isSignedIn: false,
          getToken: vi.fn(),
        } as any);

        const { result } = renderHook(() => useCurrentOrganization(), {
          wrapper,
        });

        expect(result.current.isReady).toBe(false);
      });
    });

    describe('refetch', () => {
      it('should refetch organization data', async () => {
        mockLocalStorage['skopaq_current_org_id'] = 'org-123';
        let callCount = 0;
        vi.mocked(apiClient.get).mockImplementation(() => {
          callCount++;
          return Promise.resolve({
            id: 'org-123',
            name: `Org ${callCount}`,
            slug: 'org',
            plan: 'free',
          });
        });

        const { result } = renderHook(() => useCurrentOrganization(), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.organization?.name).toBe('Org 1');
        });

        await act(async () => {
          await result.current.refetch();
        });

        await waitFor(() => {
          expect(result.current.organization?.name).toBe('Org 2');
        });
      });
    });
  });
});
