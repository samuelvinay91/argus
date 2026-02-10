/**
 * Tests for lib/api.ts (Organization-Scoped API Client)
 *
 * Tests organization-scoped API functions including:
 * - getCurrentOrganizationId
 * - setCurrentOrganizationId
 * - clearCurrentOrganizationId
 * - organizationScopedFetch
 * - createOrganizationScopedClient
 * - serverOrganizationScopedFetch
 * - switchOrganization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCurrentOrganizationId,
  setCurrentOrganizationId,
  clearCurrentOrganizationId,
  organizationScopedFetch,
  createOrganizationScopedClient,
  serverOrganizationScopedFetch,
  switchOrganization,
} from '@/lib/api';

describe('api (Organization-Scoped)', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    // Mock localStorage using global mock from vitest.setup.ts
    mockLocalStorage = {};
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCurrentOrganizationId', () => {
    it('should return null when no organization is set', () => {
      const result = getCurrentOrganizationId();
      expect(result).toBeNull();
    });

    it('should return organization ID from localStorage', () => {
      mockLocalStorage['skopaq_current_organization_id'] = 'org-123';

      const result = getCurrentOrganizationId();

      expect(result).toBe('org-123');
    });
  });

  describe('setCurrentOrganizationId', () => {
    it('should store organization ID in localStorage', () => {
      setCurrentOrganizationId('org-456');

      expect(mockLocalStorage['skopaq_current_organization_id']).toBe('org-456');
    });

    it('should overwrite existing organization ID', () => {
      mockLocalStorage['skopaq_current_organization_id'] = 'old-org';

      setCurrentOrganizationId('new-org');

      expect(mockLocalStorage['skopaq_current_organization_id']).toBe('new-org');
    });
  });

  describe('clearCurrentOrganizationId', () => {
    it('should remove organization ID from localStorage', () => {
      mockLocalStorage['skopaq_current_organization_id'] = 'org-to-remove';

      clearCurrentOrganizationId();

      expect(mockLocalStorage['skopaq_current_organization_id']).toBeUndefined();
    });

    it('should not throw when no organization ID exists', () => {
      expect(() => clearCurrentOrganizationId()).not.toThrow();
    });
  });

  describe('organizationScopedFetch', () => {
    it('should add X-Organization-ID header from localStorage', async () => {
      mockLocalStorage['skopaq_current_organization_id'] = 'org-from-storage';
      mockFetch.mockResolvedValue(new Response('{}'));

      await organizationScopedFetch('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Organization-ID': 'org-from-storage',
          }),
        })
      );
    });

    it('should use explicitly provided organizationId', async () => {
      mockLocalStorage['skopaq_current_organization_id'] = 'stored-org';
      mockFetch.mockResolvedValue(new Response('{}'));

      await organizationScopedFetch('/api/test', { organizationId: 'explicit-org' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Organization-ID': 'explicit-org',
          }),
        })
      );
    });

    it('should skip organization header when skipOrganizationHeader is true', async () => {
      mockLocalStorage['skopaq_current_organization_id'] = 'org-to-skip';
      mockFetch.mockResolvedValue(new Response('{}'));

      await organizationScopedFetch('/api/test', { skipOrganizationHeader: true });

      const calledHeaders = mockFetch.mock.calls[0][1].headers;
      expect(calledHeaders['X-Organization-ID']).toBeUndefined();
    });

    it('should not add header when no organization ID available', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      await organizationScopedFetch('/api/test');

      const calledHeaders = mockFetch.mock.calls[0][1].headers;
      expect(calledHeaders['X-Organization-ID']).toBeUndefined();
    });

    it('should merge custom headers', async () => {
      mockLocalStorage['skopaq_current_organization_id'] = 'org-123';
      mockFetch.mockResolvedValue(new Response('{}'));

      await organizationScopedFetch('/api/test', {
        headers: { 'X-Custom': 'custom-value' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Organization-ID': 'org-123',
            'X-Custom': 'custom-value',
          }),
        })
      );
    });
  });

  describe('createOrganizationScopedClient', () => {
    it('should create client with get method', async () => {
      const mockGetToken = vi.fn().mockResolvedValue('token');
      mockFetch.mockResolvedValue(new Response('{}'));

      const client = createOrganizationScopedClient(mockGetToken);
      await client.get('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should create client with post method', async () => {
      const mockGetToken = vi.fn().mockResolvedValue('token');
      mockFetch.mockResolvedValue(new Response('{}'));

      const client = createOrganizationScopedClient(mockGetToken);
      await client.post('/api/test', { data: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: 'test' }),
        })
      );
    });

    it('should create client with put method', async () => {
      const mockGetToken = vi.fn().mockResolvedValue('token');
      mockFetch.mockResolvedValue(new Response('{}'));

      const client = createOrganizationScopedClient(mockGetToken);
      await client.put('/api/test', { data: 'updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('should create client with patch method', async () => {
      const mockGetToken = vi.fn().mockResolvedValue('token');
      mockFetch.mockResolvedValue(new Response('{}'));

      const client = createOrganizationScopedClient(mockGetToken);
      await client.patch('/api/test', { data: 'patched' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    it('should create client with delete method', async () => {
      const mockGetToken = vi.fn().mockResolvedValue('token');
      mockFetch.mockResolvedValue(new Response('{}'));

      const client = createOrganizationScopedClient(mockGetToken);
      await client.delete('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should use default organization ID', async () => {
      const mockGetToken = vi.fn().mockResolvedValue('token');
      mockFetch.mockResolvedValue(new Response('{}'));

      const client = createOrganizationScopedClient(mockGetToken, 'default-org');
      await client.get('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Organization-ID': 'default-org',
          }),
        })
      );
    });

    it('setOrganization should update localStorage', () => {
      const mockGetToken = vi.fn().mockResolvedValue('token');
      const client = createOrganizationScopedClient(mockGetToken);

      client.setOrganization('new-org-id');

      expect(mockLocalStorage['skopaq_current_organization_id']).toBe('new-org-id');
    });

    it('getOrganization should return current org', () => {
      const mockGetToken = vi.fn().mockResolvedValue('token');
      mockLocalStorage['skopaq_current_organization_id'] = 'current-org';

      const client = createOrganizationScopedClient(mockGetToken);

      expect(client.getOrganization()).toBe('current-org');
    });

    it('clearOrganization should remove org from localStorage', () => {
      const mockGetToken = vi.fn().mockResolvedValue('token');
      mockLocalStorage['skopaq_current_organization_id'] = 'org-to-clear';

      const client = createOrganizationScopedClient(mockGetToken);
      client.clearOrganization();

      expect(mockLocalStorage['skopaq_current_organization_id']).toBeUndefined();
    });
  });

  describe('serverOrganizationScopedFetch', () => {
    it('should return fetch function with organization header', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      const fetchFn = serverOrganizationScopedFetch('server-token', 'server-org');
      await fetchFn('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Organization-ID': 'server-org',
            Authorization: 'Bearer server-token',
          }),
        })
      );
    });

    it('should not add organization header when not provided', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      const fetchFn = serverOrganizationScopedFetch('server-token');
      await fetchFn('/api/test');

      const calledHeaders = mockFetch.mock.calls[0][1].headers;
      expect(calledHeaders['X-Organization-ID']).toBeUndefined();
    });

    it('should merge custom options', async () => {
      mockFetch.mockResolvedValue(new Response('{}'));

      const fetchFn = serverOrganizationScopedFetch('token', 'org');
      await fetchFn('/api/test', { method: 'POST' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('switchOrganization', () => {
    it('should update localStorage', async () => {
      await switchOrganization('new-org');

      expect(mockLocalStorage['skopaq_current_organization_id']).toBe('new-org');
    });

    it('should call server API when getToken provided', async () => {
      const mockGetToken = vi.fn().mockResolvedValue('token');
      mockFetch.mockResolvedValue(new Response('{}'));

      await switchOrganization('new-org', mockGetToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/users/me/organizations/new-org/switch'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should not call server API when getToken not provided', async () => {
      await switchOrganization('new-org');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should still update localStorage even when server call fails', async () => {
      const mockGetToken = vi.fn().mockResolvedValue('token');
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Should not throw
      await switchOrganization('new-org', mockGetToken);

      expect(mockLocalStorage['skopaq_current_organization_id']).toBe('new-org');
    });

    it('should handle null token from getToken', async () => {
      const mockGetToken = vi.fn().mockResolvedValue(null);

      await switchOrganization('new-org', mockGetToken);

      // Should not make API call when token is null
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockLocalStorage['skopaq_current_organization_id']).toBe('new-org');
    });
  });
});
