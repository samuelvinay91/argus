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
const getBackendUrl = () => {
  if (process.env.NEXT_PUBLIC_ARGUS_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_ARGUS_BACKEND_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://argus-brain-production.up.railway.app';
  }
  return 'http://localhost:8000';
};

export const BACKEND_URL = getBackendUrl();

// Global token getter - set by ApiClientProvider
let globalGetToken: (() => Promise<string | null>) | null = null;

/**
 * Set the global token getter function
 * Called by ApiClientProvider on mount
 */
export function setGlobalTokenGetter(getToken: () => Promise<string | null>) {
  globalGetToken = getToken;
}

/**
 * Clear the global token getter (on unmount/logout)
 */
export function clearGlobalTokenGetter() {
  globalGetToken = null;
}

/**
 * Get the current auth token
 */
export async function getAuthToken(): Promise<string | null> {
  if (!globalGetToken) {
    console.warn('[api-client] No token getter available - requests will be unauthenticated');
    return null;
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
 */
export async function fetchJson<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await authenticatedFetch(url, options);

  if (!response.ok) {
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
