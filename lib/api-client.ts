'use client';

/**
 * Global Authenticated API Client
 *
 * This module provides a centralized way to make authenticated API calls
 * without needing to modify every hook individually.
 *
 * Usage:
 * 1. Wrap your app with <ApiClientProvider> (already done in layout)
 * 2. All fetch calls through this module automatically include auth
 */

// Backend URL configuration
// Use empty string for relative URLs (proxied through Next.js rewrites)
const getBackendUrl = () => {
  // Check if explicitly set (including empty string for proxy)
  const envUrl = process.env.NEXT_PUBLIC_ARGUS_BACKEND_URL;
  if (envUrl !== undefined) {
    return envUrl; // Empty string = use relative URLs for proxy
  }
  // In browser on non-localhost, use production URL
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://argus-brain-production.up.railway.app';
  }
  // Default: use relative URLs so Next.js proxy works
  return '';
};

export const BACKEND_URL = getBackendUrl();

// Global token getter - set by ApiClientProvider
let globalGetToken: (() => Promise<string | null>) | null = null;
let authInitialized = false;

/**
 * Set the global token getter function
 * Called by ApiClientProvider on mount
 */
export function setGlobalTokenGetter(getToken: () => Promise<string | null>) {
  globalGetToken = getToken;
  authInitialized = true;
}

/**
 * Clear the global token getter (on unmount/logout)
 */
export function clearGlobalTokenGetter() {
  globalGetToken = null;
  // Don't reset authInitialized - it's only reset on page reload
}

/**
 * Check if auth has been initialized
 */
export function isAuthInitialized(): boolean {
  return authInitialized;
}

/**
 * Get the current auth token
 * Waits for auth to be initialized to avoid race conditions
 */
export async function getAuthToken(): Promise<string | null> {
  // Wait for auth to be initialized (with timeout)
  if (!globalGetToken) {
    // Give the auth provider time to initialize (up to 2 seconds)
    const maxWaitMs = 2000;
    const checkIntervalMs = 50;
    let waitedMs = 0;

    while (!globalGetToken && waitedMs < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
      waitedMs += checkIntervalMs;
    }

    if (!globalGetToken) {
      // Only warn after we've waited and still no token getter
      if (process.env.NODE_ENV === 'development') {
        console.warn('[api-client] Auth not initialized after waiting - requests will be unauthenticated');
      }
      return null;
    }
  }
  return globalGetToken();
}

/**
 * Authenticated fetch wrapper
 * Automatically adds Authorization header if token is available
 */
export async function authenticatedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const token = await getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers || {}),
  };

  // If URL doesn't start with http, prepend backend URL
  const fullUrl = url.startsWith('http') ? url : `${BACKEND_URL}${url}`;

  return fetch(fullUrl, {
    ...options,
    headers,
  });
}

/**
 * Authenticated JSON fetch - returns parsed JSON
 * Includes retry logic for 401 errors (token may need refresh)
 */
export async function fetchJson<T>(
  url: string,
  options?: RequestInit,
  retryCount = 0
): Promise<T> {
  const response = await authenticatedFetch(url, options);

  if (!response.ok) {
    // On 401, try once more after a short delay (token might refresh)
    if (response.status === 401 && retryCount === 0) {
      console.log('[api-client] Got 401, retrying after token refresh...');
      await new Promise(resolve => setTimeout(resolve, 500));
      return fetchJson(url, options, retryCount + 1);
    }

    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * API Client with typed methods for common operations
 */
export const apiClient = {
  get: <T>(url: string, options?: RequestInit) =>
    fetchJson<T>(url, { ...options, method: 'GET' }),

  post: <T>(url: string, body?: unknown, options?: RequestInit) =>
    fetchJson<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(url: string, body?: unknown, options?: RequestInit) =>
    fetchJson<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(url: string, body?: unknown, options?: RequestInit) =>
    fetchJson<T>(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(url: string, options?: RequestInit) =>
    fetchJson<T>(url, { ...options, method: 'DELETE' }),
};

/**
 * Discovery API endpoints
 */
export const discoveryApi = {
  startSession: (params: {
    projectId: string;
    appUrl: string;
    mode?: string;
    strategy?: string;
    maxPages?: number;
    maxDepth?: number;
  }) => apiClient.post<{ id: string }>('/api/v1/discovery/sessions', params),

  getSession: (sessionId: string) =>
    apiClient.get<{ id: string; status: string }>(`/api/v1/discovery/sessions/${sessionId}`),

  pauseSession: (sessionId: string) =>
    apiClient.post(`/api/v1/discovery/sessions/${sessionId}/pause`),

  resumeSession: (sessionId: string) =>
    apiClient.post(`/api/v1/discovery/sessions/${sessionId}/resume`),

  cancelSession: (sessionId: string) =>
    apiClient.post(`/api/v1/discovery/sessions/${sessionId}/cancel`),

  getPages: (sessionId: string) =>
    apiClient.get(`/api/v1/discovery/sessions/${sessionId}/pages`),

  getFlows: (sessionId: string) =>
    apiClient.get(`/api/v1/discovery/sessions/${sessionId}/flows`),

  validateFlow: (flowId: string) =>
    apiClient.post(`/api/v1/discovery/flows/${flowId}/validate`),

  generateTest: (flowId: string) =>
    apiClient.post(`/api/v1/discovery/flows/${flowId}/generate-test`),
};

/**
 * Chat API endpoints
 */
export const chatApi = {
  getHistory: (threadId: string) =>
    apiClient.get(`/api/v1/chat/history/${threadId}`),

  cancel: (threadId: string) =>
    apiClient.delete(`/api/v1/chat/cancel/${threadId}`),
};

/**
 * Artifacts API endpoints
 */
export const artifactsApi = {
  get: (artifactId: string) =>
    apiClient.get(`/api/v1/artifacts/${artifactId}`),

  resolve: (artifactRefs: string[]) =>
    apiClient.post('/api/v1/artifacts/resolve', { artifact_refs: artifactRefs }),
};
