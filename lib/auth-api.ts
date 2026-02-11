/**
 * Authenticated API Client for Skopaq Backend
 *
 * This module provides authenticated fetch calls to the Python backend.
 * It automatically includes the Clerk JWT token in all requests.
 */

// Backend URL configuration
// Uses Next.js rewrites to proxy /api/v1/* to production backend in local development
const getBackendUrl = () => {
  // Explicit override from environment
  const envUrl = process.env.NEXT_PUBLIC_ARGUS_BACKEND_URL;
  if (envUrl) {
    return envUrl;
  }
  // Server-side: use environment variable or production URL
  if (typeof window === 'undefined') {
    return process.env.ARGUS_BACKEND_URL || 'https://argus-brain-production.up.railway.app';
  }
  // Client-side: Production - use direct URL
  if (window.location.hostname !== 'localhost') {
    return 'https://argus-brain-production.up.railway.app';
  }
  // Local development: use relative URLs for Next.js proxy
  return '';
};
const BACKEND_URL = getBackendUrl();

export interface AuthenticatedFetchOptions extends RequestInit {
  token?: string;
  apiKey?: string;
}

/**
 * Make an authenticated request to the Skopaq backend
 *
 * @param endpoint - API endpoint (e.g., '/api/v1/tests')
 * @param options - Fetch options including optional token/apiKey
 * @returns Response from the backend
 */
export async function authenticatedFetch(
  endpoint: string,
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const { token, apiKey, headers = {}, ...fetchOptions } = options;

  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  // Add authentication header
  if (apiKey) {
    authHeaders['X-API-Key'] = apiKey;
  } else if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_URL}${endpoint}`;

  return fetch(url, {
    ...fetchOptions,
    headers: authHeaders,
  });
}

/**
 * Create an authenticated API client with a session token
 *
 * @param getToken - Function to get the current auth token (from Clerk)
 * @returns API client with authenticated methods
 */
export function createAuthenticatedClient(getToken: () => Promise<string | null>) {
  const makeRequest = async (
    method: string,
    endpoint: string,
    body?: unknown,
    options: Omit<AuthenticatedFetchOptions, 'method' | 'body'> = {}
  ) => {
    const token = await getToken();

    return authenticatedFetch(endpoint, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      token: token || undefined,
      ...options,
    });
  };

  return {
    get: (endpoint: string, options?: Omit<AuthenticatedFetchOptions, 'method'>) =>
      makeRequest('GET', endpoint, undefined, options),

    post: (endpoint: string, body?: unknown, options?: Omit<AuthenticatedFetchOptions, 'method' | 'body'>) =>
      makeRequest('POST', endpoint, body, options),

    put: (endpoint: string, body?: unknown, options?: Omit<AuthenticatedFetchOptions, 'method' | 'body'>) =>
      makeRequest('PUT', endpoint, body, options),

    patch: (endpoint: string, body?: unknown, options?: Omit<AuthenticatedFetchOptions, 'method' | 'body'>) =>
      makeRequest('PATCH', endpoint, body, options),

    delete: (endpoint: string, options?: Omit<AuthenticatedFetchOptions, 'method'>) =>
      makeRequest('DELETE', endpoint, undefined, options),
  };
}

/**
 * Hook-compatible function to create authenticated fetch for server components
 *
 * @param token - JWT token from Clerk auth()
 * @returns Fetch function with authentication
 */
export function serverAuthenticatedFetch(token: string | null) {
  return (endpoint: string, options: RequestInit = {}) => {
    return authenticatedFetch(endpoint, {
      ...options,
      token: token || undefined,
    });
  };
}
