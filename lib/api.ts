/**
 * Organization-Scoped API Client for Argus Backend
 *
 * This module extends the authenticated API client to include
 * organization context in all API requests via the X-Organization-ID header.
 */

import { authenticatedFetch, AuthenticatedFetchOptions } from './auth-api';

// Storage key for organization ID
const ORG_ID_STORAGE_KEY = 'argus_current_organization_id';

/**
 * Get the current organization ID from localStorage
 *
 * @returns Organization ID string or null if not set
 */
export function getCurrentOrganizationId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(ORG_ID_STORAGE_KEY);
}

/**
 * Set the current organization ID in localStorage
 *
 * @param orgId - Organization ID to set
 */
export function setCurrentOrganizationId(orgId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(ORG_ID_STORAGE_KEY, orgId);
}

/**
 * Clear the current organization ID from localStorage
 */
export function clearCurrentOrganizationId(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(ORG_ID_STORAGE_KEY);
}

/**
 * Extended fetch options with organization context
 */
export interface OrganizationScopedFetchOptions extends AuthenticatedFetchOptions {
  organizationId?: string;
  skipOrganizationHeader?: boolean;
}

/**
 * Make an organization-scoped authenticated request to the Argus backend
 *
 * Automatically includes X-Organization-ID header from:
 * 1. Explicitly provided organizationId option
 * 2. localStorage (if not skipped)
 *
 * @param endpoint - API endpoint (e.g., '/api/v1/projects')
 * @param options - Fetch options including optional organizationId
 * @returns Response from the backend
 */
export async function organizationScopedFetch(
  endpoint: string,
  options: OrganizationScopedFetchOptions = {}
): Promise<Response> {
  const {
    organizationId,
    skipOrganizationHeader = false,
    headers = {},
    ...restOptions
  } = options;

  // Build headers with organization context
  const requestHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  // Add organization header if not skipped
  if (!skipOrganizationHeader) {
    const orgId = organizationId || getCurrentOrganizationId();
    if (orgId) {
      requestHeaders['X-Organization-ID'] = orgId;
    }
  }

  return authenticatedFetch(endpoint, {
    ...restOptions,
    headers: requestHeaders,
  });
}

/**
 * Create an organization-scoped API client with a session token
 *
 * @param getToken - Function to get the current auth token (from Clerk)
 * @param defaultOrganizationId - Optional default organization ID to use
 * @returns API client with organization-scoped methods
 */
export function createOrganizationScopedClient(
  getToken: () => Promise<string | null>,
  defaultOrganizationId?: string
) {
  const makeRequest = async (
    method: string,
    endpoint: string,
    body?: unknown,
    options: Omit<OrganizationScopedFetchOptions, 'method' | 'body'> = {}
  ) => {
    const token = await getToken();
    const orgId = options.organizationId || defaultOrganizationId || getCurrentOrganizationId();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (orgId && !options.skipOrganizationHeader) {
      headers['X-Organization-ID'] = orgId;
    }

    return authenticatedFetch(endpoint, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      token: token || undefined,
      headers,
    });
  };

  return {
    /**
     * Make a GET request with organization context
     */
    get: (endpoint: string, options?: Omit<OrganizationScopedFetchOptions, 'method'>) =>
      makeRequest('GET', endpoint, undefined, options),

    /**
     * Make a POST request with organization context
     */
    post: (endpoint: string, body?: unknown, options?: Omit<OrganizationScopedFetchOptions, 'method' | 'body'>) =>
      makeRequest('POST', endpoint, body, options),

    /**
     * Make a PUT request with organization context
     */
    put: (endpoint: string, body?: unknown, options?: Omit<OrganizationScopedFetchOptions, 'method' | 'body'>) =>
      makeRequest('PUT', endpoint, body, options),

    /**
     * Make a PATCH request with organization context
     */
    patch: (endpoint: string, body?: unknown, options?: Omit<OrganizationScopedFetchOptions, 'method' | 'body'>) =>
      makeRequest('PATCH', endpoint, body, options),

    /**
     * Make a DELETE request with organization context
     */
    delete: (endpoint: string, options?: Omit<OrganizationScopedFetchOptions, 'method'>) =>
      makeRequest('DELETE', endpoint, undefined, options),

    /**
     * Set the current organization for subsequent requests
     */
    setOrganization: (orgId: string) => {
      setCurrentOrganizationId(orgId);
    },

    /**
     * Get the current organization ID
     */
    getOrganization: () => getCurrentOrganizationId(),

    /**
     * Clear the current organization context
     */
    clearOrganization: () => {
      clearCurrentOrganizationId();
    },
  };
}

/**
 * Hook-compatible function to create organization-scoped fetch for server components
 *
 * @param token - JWT token from Clerk auth()
 * @param organizationId - Organization ID from session or context
 * @returns Fetch function with organization scoping
 */
export function serverOrganizationScopedFetch(
  token: string | null,
  organizationId?: string
) {
  return (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (organizationId) {
      headers['X-Organization-ID'] = organizationId;
    }

    return authenticatedFetch(endpoint, {
      ...options,
      token: token || undefined,
      headers,
    });
  };
}

/**
 * Utility function to switch organizations
 *
 * Updates localStorage and optionally makes an API call to update user profile
 *
 * @param orgId - Organization ID to switch to
 * @param getToken - Function to get auth token (optional, for API call)
 */
export async function switchOrganization(
  orgId: string,
  getToken?: () => Promise<string | null>
): Promise<void> {
  // Update localStorage
  setCurrentOrganizationId(orgId);

  // Optionally update server-side default organization
  if (getToken) {
    try {
      const token = await getToken();
      if (token) {
        await authenticatedFetch(`/api/v1/users/me/organizations/${orgId}/switch`, {
          method: 'POST',
          token,
        });
      }
    } catch (error) {
      console.error('Failed to update server-side organization preference:', error);
      // Continue anyway - localStorage is updated
    }
  }
}
