'use client';

/**
 * Global Authenticated API Client
 *
 * This module provides a centralized way to make authenticated API calls
 * without needing to modify every hook individually.
 *
 * Features:
 * - Automatic auth token injection
 * - Global 30-second timeout
 * - AbortController support for cancellation
 * - Exponential backoff retry (max 2 retries)
 *
 * Usage:
 * 1. Wrap your app with <ApiClientProvider> (already done in layout)
 * 2. All fetch calls through this module automatically include auth
 */

// Configuration constants
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY_MS = 500;

/**
 * Convert camelCase to snake_case
 * Frontend uses camelCase (JS convention), backend uses snake_case (Python convention)
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Recursively convert object keys from camelCase to snake_case
 * Handles nested objects and arrays
 * Exported for use in other modules (e.g., useAuthApi)
 */
export function convertKeysToSnakeCase(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnakeCase);
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = camelToSnake(key);
      converted[snakeKey] = convertKeysToSnakeCase(value);
    }
    return converted;
  }

  return obj;
}

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

// Global organization ID getter - set by ApiClientProvider
// Returns the backend UUID format, NOT Clerk's org_xxx format
let globalGetOrgId: (() => string | null) | null = null;

// Cross-tab sync storage key
const AUTH_SYNC_KEY = 'argus_auth_sync';

// Callbacks for cross-tab auth state changes
type AuthChangeCallback = (event: 'logout' | 'login' | 'org_change') => void;
const authChangeCallbacks: Set<AuthChangeCallback> = new Set();

/**
 * Register a callback to be notified when auth state changes in another tab.
 * Returns an unsubscribe function.
 */
export function onAuthChange(callback: AuthChangeCallback): () => void {
  authChangeCallbacks.add(callback);
  return () => authChangeCallbacks.delete(callback);
}

/**
 * Notify other tabs of auth state changes.
 * Uses localStorage events which fire in other tabs (not the current one).
 */
export function notifyAuthChange(event: 'logout' | 'login' | 'org_change'): void {
  if (typeof window === 'undefined') return;

  try {
    // Write to localStorage to trigger storage event in other tabs
    // Include timestamp to ensure the value changes (triggers event)
    localStorage.setItem(AUTH_SYNC_KEY, JSON.stringify({
      event,
      timestamp: Date.now(),
    }));
  } catch (error) {
    // localStorage might be unavailable (private browsing, quota exceeded)
    console.warn('[api-client] Failed to notify auth change:', error);
  }
}

/**
 * Initialize cross-tab auth synchronization.
 * Call this once when the app initializes (e.g., in ApiClientProvider).
 */
let crossTabSyncInitialized = false;
export function initCrossTabAuthSync(): () => void {
  if (typeof window === 'undefined' || crossTabSyncInitialized) {
    return () => {};
  }

  crossTabSyncInitialized = true;

  const handleStorageEvent = (event: StorageEvent) => {
    // Handle auth sync events
    if (event.key === AUTH_SYNC_KEY && event.newValue) {
      try {
        const data = JSON.parse(event.newValue);
        const authEvent = data.event as 'logout' | 'login' | 'org_change';

        // Notify all registered callbacks
        authChangeCallbacks.forEach(callback => {
          try {
            callback(authEvent);
          } catch (error) {
            console.error('[api-client] Auth change callback error:', error);
          }
        });

        // Handle logout specifically - clear local state
        if (authEvent === 'logout') {
          clearGlobalTokenGetter();
          clearGlobalOrgIdGetter();
        }
      } catch (error) {
        console.warn('[api-client] Failed to parse auth sync event:', error);
      }
    }
  };

  window.addEventListener('storage', handleStorageEvent);

  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageEvent);
    crossTabSyncInitialized = false;
  };
}

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
 * @param notifyOtherTabs - If true, notify other tabs of the logout (default: false to avoid loops)
 */
export function clearGlobalTokenGetter(notifyOtherTabs = false) {
  globalGetToken = null;
  // Don't reset authInitialized - it's only reset on page reload

  if (notifyOtherTabs) {
    notifyAuthChange('logout');
  }
}

/**
 * Set the global organization ID getter
 * Called by ApiClientProvider to inject current org from OrganizationContext
 * @param getOrgId Function that returns the current org's backend UUID
 */
export function setGlobalOrgIdGetter(getOrgId: () => string | null) {
  globalGetOrgId = getOrgId;
}

/**
 * Clear the global org ID getter (on unmount/logout)
 */
export function clearGlobalOrgIdGetter() {
  globalGetOrgId = null;
}

/**
 * Get the current organization ID for multi-tenant API requests
 * Returns backend UUID format
 */
export function getCurrentOrgId(): string | null {
  if (!globalGetOrgId) {
    return null;
  }
  return globalGetOrgId();
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
 * Create an AbortController with timeout
 * Merges external signal with internal timeout
 */
function createTimeoutController(
  externalSignal?: AbortSignal,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): { controller: AbortController; cleanup: () => void } {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  // Set up timeout
  timeoutId = setTimeout(() => {
    controller.abort(new Error(`Request timeout after ${timeoutMs}ms`));
  }, timeoutMs);

  // If external signal is provided, abort when it aborts
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', () => {
        controller.abort(externalSignal.reason);
      });
    }
  }

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return { controller, cleanup };
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown, status?: number): boolean {
  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Timeout errors are retryable
  if (error instanceof Error && error.message.includes('timeout')) {
    return true;
  }

  // Server errors (5xx) are retryable, except 501
  if (status && status >= 500 && status !== 501) {
    return true;
  }

  // Rate limit (429) is retryable
  if (status === 429) {
    return true;
  }

  return false;
}

/**
 * Sleep for exponential backoff
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface FetchOptions extends Omit<RequestInit, 'signal'> {
  /** External abort signal for cancellation */
  signal?: AbortSignal;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retries (default: 2 for GET, 0 for mutations) */
  retries?: number;
}

/**
 * Authenticated fetch wrapper
 * Automatically adds Authorization header if token is available
 * Includes timeout and AbortController support
 */
export async function authenticatedFetch(
  url: string,
  options?: FetchOptions
): Promise<Response> {
  const { signal, timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options || {};

  const token = await getAuthToken();
  const orgId = getCurrentOrgId();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // Include organization ID for multi-tenant API requests
    ...(orgId ? { 'X-Organization-ID': orgId } : {}),
    ...(fetchOptions.headers || {}),
  };

  // If URL doesn't start with http, prepend backend URL
  const fullUrl = url.startsWith('http') ? url : `${BACKEND_URL}${url}`;

  // Create timeout controller
  const { controller, cleanup } = createTimeoutController(signal, timeout);

  try {
    return await fetch(fullUrl, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
  } finally {
    cleanup();
  }
}

/**
 * Authenticated JSON fetch - returns parsed JSON
 * Includes retry logic with exponential backoff
 */
export async function fetchJson<T>(
  url: string,
  options?: FetchOptions,
  retryCount = 0
): Promise<T> {
  const method = options?.method || 'GET';
  const maxRetries = options?.retries ?? (method === 'GET' ? MAX_RETRIES : 0);

  try {
    const response = await authenticatedFetch(url, options);

    if (!response.ok) {
      // On 401, try once more after a short delay (token might refresh)
      if (response.status === 401 && retryCount === 0) {
        console.log('[api-client] Got 401, retrying after token refresh...');
        await sleep(INITIAL_RETRY_DELAY_MS);
        return fetchJson(url, options, retryCount + 1);
      }

      // Check if error is retryable
      if (isRetryableError(null, response.status) && retryCount < maxRetries) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
        console.log(`[api-client] Got ${response.status}, retrying in ${delay}ms...`);
        await sleep(delay);
        return fetchJson(url, options, retryCount + 1);
      }

      const error = await response.json().catch(() => ({ message: 'Request failed' }));

      // Extract error message, handling FastAPI/Pydantic validation errors
      let errorMessage = error.message;
      if (!errorMessage && error.detail) {
        if (typeof error.detail === 'string') {
          errorMessage = error.detail;
        } else if (Array.isArray(error.detail)) {
          // Pydantic validation errors: [{loc: [...], msg: "...", type: "..."}]
          errorMessage = error.detail
            .map((e: { loc?: string[]; msg?: string }) => {
              const field = e.loc?.slice(-1)[0] || 'field';
              return `${field}: ${e.msg || 'validation error'}`;
            })
            .join(', ');
        } else if (typeof error.detail === 'object' && error.detail.msg) {
          errorMessage = error.detail.msg;
        }
      }

      throw new Error(errorMessage || `Request failed with status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    // Check if this was an abort
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }

    // Check if error is retryable
    if (isRetryableError(error) && retryCount < maxRetries) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
      console.log(`[api-client] Network error, retrying in ${delay}ms...`);
      await sleep(delay);
      return fetchJson(url, options, retryCount + 1);
    }

    throw error;
  }
}

/**
 * API Client with typed methods for common operations
 * All methods support AbortSignal for cancellation
 */
export const apiClient = {
  get: <T>(url: string, options?: FetchOptions) =>
    fetchJson<T>(url, { ...options, method: 'GET' }),

  post: <T>(url: string, body?: unknown, options?: FetchOptions) =>
    fetchJson<T>(url, {
      ...options,
      method: 'POST',
      // Convert camelCase keys to snake_case for Python backend
      body: body ? JSON.stringify(convertKeysToSnakeCase(body)) : undefined,
    }),

  put: <T>(url: string, body?: unknown, options?: FetchOptions) =>
    fetchJson<T>(url, {
      ...options,
      method: 'PUT',
      // Convert camelCase keys to snake_case for Python backend
      body: body ? JSON.stringify(convertKeysToSnakeCase(body)) : undefined,
    }),

  patch: <T>(url: string, body?: unknown, options?: FetchOptions) =>
    fetchJson<T>(url, {
      ...options,
      method: 'PATCH',
      // Convert camelCase keys to snake_case for Python backend
      body: body ? JSON.stringify(convertKeysToSnakeCase(body)) : undefined,
    }),

  delete: <T>(url: string, options?: FetchOptions) =>
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
  }, options?: FetchOptions) => apiClient.post<{ id: string }>('/api/v1/discovery/sessions', params, options),

  getSession: (sessionId: string, options?: FetchOptions) =>
    apiClient.get<{ id: string; status: string }>(`/api/v1/discovery/sessions/${sessionId}`, options),

  pauseSession: (sessionId: string, options?: FetchOptions) =>
    apiClient.post(`/api/v1/discovery/sessions/${sessionId}/pause`, undefined, options),

  resumeSession: (sessionId: string, options?: FetchOptions) =>
    apiClient.post(`/api/v1/discovery/sessions/${sessionId}/resume`, undefined, options),

  cancelSession: (sessionId: string, options?: FetchOptions) =>
    apiClient.post(`/api/v1/discovery/sessions/${sessionId}/cancel`, undefined, options),

  getPages: (sessionId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/discovery/sessions/${sessionId}/pages`, options),

  getFlows: (sessionId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/discovery/sessions/${sessionId}/flows`, options),

  validateFlow: (flowId: string, options?: FetchOptions) =>
    apiClient.post(`/api/v1/discovery/flows/${flowId}/validate`, undefined, options),

  generateTest: (flowId: string, options?: FetchOptions) =>
    apiClient.post(`/api/v1/discovery/flows/${flowId}/generate-test`, undefined, options),
};

/**
 * Chat API endpoints
 */
export const chatApi = {
  getHistory: (threadId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/chat/history/${threadId}`, options),

  cancel: (threadId: string, options?: FetchOptions) =>
    apiClient.delete(`/api/v1/chat/cancel/${threadId}`, options),
};

/**
 * Artifacts API endpoints
 */
export const artifactsApi = {
  get: (artifactId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/artifacts/${artifactId}`, options),

  resolve: (artifactRefs: string[], options?: FetchOptions) =>
    apiClient.post('/api/v1/artifacts/resolve', { artifact_refs: artifactRefs }, options),
};

// ============================================================================
// Tests API Types
// ============================================================================

export interface Test {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  steps: Array<{ action: string; target?: string; value?: string; description?: string }>;
  tags: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  isActive: boolean;
  source: 'manual' | 'discovered' | 'generated' | 'imported';
  createdBy: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface TestListItem {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  tags: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  isActive: boolean;
  source: 'manual' | 'discovered' | 'generated' | 'imported';
  stepCount: number;
  createdAt: string;
}

export interface TestsListResponse {
  tests: TestListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateTestRequest {
  projectId: string;
  name: string;
  description?: string | null;
  steps?: Array<{ action: string; target?: string; value?: string; description?: string }>;
  tags?: string[];
  priority?: 'critical' | 'high' | 'medium' | 'low';
  isActive?: boolean;
  source?: 'manual' | 'discovered' | 'generated' | 'imported';
}

export interface UpdateTestRequest {
  name?: string;
  description?: string | null;
  steps?: Array<{ action: string; target?: string; value?: string; description?: string }>;
  tags?: string[];
  priority?: 'critical' | 'high' | 'medium' | 'low';
  isActive?: boolean;
}

/**
 * Tests API endpoints
 */
export const testsApi = {
  list: (params?: {
    projectId?: string;
    isActive?: boolean;
    priority?: string;
    source?: string;
    tags?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('project_id', params.projectId);
    if (params?.isActive !== undefined) searchParams.set('is_active', String(params.isActive));
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.source) searchParams.set('source', params.source);
    if (params?.tags) searchParams.set('tags', params.tags);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return apiClient.get<TestsListResponse>(`/api/v1/tests${query ? `?${query}` : ''}`, options);
  },

  get: (testId: string, options?: FetchOptions) =>
    apiClient.get<Test>(`/api/v1/tests/${testId}`, options),

  create: (data: CreateTestRequest, options?: FetchOptions) =>
    apiClient.post<Test>('/api/v1/tests', data, options),

  update: (testId: string, data: UpdateTestRequest, options?: FetchOptions) =>
    apiClient.patch<Test>(`/api/v1/tests/${testId}`, data, options),

  delete: (testId: string, options?: FetchOptions) =>
    apiClient.delete<{ success: boolean; message: string }>(`/api/v1/tests/${testId}`, options),

  bulkDelete: (testIds: string[], options?: FetchOptions) =>
    apiClient.post<{
      success: boolean;
      deleted: string[];
      failed: Array<{ id: string; error: string }>;
      deletedCount: number;
      failedCount: number;
    }>('/api/v1/tests/bulk-delete', { testIds }, options),

  bulkUpdate: (data: {
    testIds: string[];
    isActive?: boolean;
    priority?: 'critical' | 'high' | 'medium' | 'low';
    tagsAdd?: string[];
    tagsRemove?: string[];
  }, options?: FetchOptions) =>
    apiClient.post<{
      success: boolean;
      updated: string[];
      failed: Array<{ id: string; error: string }>;
      updatedCount: number;
      failedCount: number;
    }>('/api/v1/tests/bulk-update', data, options),
};

// ============================================================================
// Test Runs API Types
// ============================================================================

export type TestRunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'cancelled' | 'error';
export type TriggerType = 'manual' | 'scheduled' | 'ci' | 'webhook' | 'api';

export interface TestRunListItem {
  id: string;
  projectId: string;
  name: string | null;
  status: TestRunStatus;
  trigger: TriggerType | null;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  durationMs: number | null;
  completedAt: string | null;
  createdAt: string;
}

export interface TestRun extends TestRunListItem {
  appUrl: string | null;
  browser: string | null;
  skippedTests: number;
  startedAt: string | null;
  createdBy: string | null;
  updatedAt: string | null;
}

export interface TestResultSummary {
  id: string;
  testId: string | null;
  name: string;
  status: string;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface TestRunWithResults extends TestRun {
  results: TestResultSummary[];
}

export interface TestRunsListResponse {
  runs: TestRunListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface TestResult {
  id: string;
  testRunId: string;
  testId: string | null;
  name: string;
  status: string;
  durationMs: number | null;
  stepsTotal: number | null;
  stepsCompleted: number | null;
  errorMessage: string | null;
  errorScreenshot: string | null;
  stepResults: Array<Record<string, unknown>> | null;
  completedAt: string | null;
  createdAt: string;
}

export interface CreateTestRunRequest {
  projectId: string;
  name?: string | null;
  appUrl?: string | null;
  browser?: string | null;
  trigger?: TriggerType;
  totalTests?: number;
}

export interface UpdateTestRunRequest {
  name?: string | null;
  status?: TestRunStatus;
  passedTests?: number;
  failedTests?: number;
  skippedTests?: number;
  durationMs?: number;
  completedAt?: string;
}

export interface CreateTestResultRequest {
  testId?: string | null;
  name: string;
  status: string;
  durationMs?: number | null;
  stepsTotal?: number | null;
  stepsCompleted?: number | null;
  errorMessage?: string | null;
  errorScreenshot?: string | null;
  stepResults?: Array<Record<string, unknown>> | null;
}

export interface TestRunComparisonResponse {
  currentRun: TestRunListItem | null;
  previousRun: TestRunListItem | null;
  deltas: {
    passedDelta: number | null;
    failedDelta: number | null;
    durationDelta: number | null;
    passRateDelta: number | null;
  };
  hasPreviousRun: boolean;
}

/**
 * Test Runs API endpoints
 */
export const testRunsApi = {
  list: (params?: {
    projectId?: string;
    status?: TestRunStatus;
    trigger?: TriggerType;
    limit?: number;
    offset?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('project_id', params.projectId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.trigger) searchParams.set('trigger', params.trigger);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return apiClient.get<TestRunsListResponse>(`/api/v1/test-runs${query ? `?${query}` : ''}`, options);
  },

  get: (runId: string, includeResults = true, options?: FetchOptions) =>
    apiClient.get<TestRunWithResults>(`/api/v1/test-runs/${runId}?include_results=${includeResults}`, options),

  create: (data: CreateTestRunRequest, options?: FetchOptions) =>
    apiClient.post<TestRun>('/api/v1/test-runs', data, options),

  update: (runId: string, data: UpdateTestRunRequest, options?: FetchOptions) =>
    apiClient.patch<TestRun>(`/api/v1/test-runs/${runId}`, data, options),

  delete: (runId: string, options?: FetchOptions) =>
    apiClient.delete<{ success: boolean; message: string }>(`/api/v1/test-runs/${runId}`, options),

  getResults: (runId: string, options?: FetchOptions) =>
    apiClient.get<TestResult[]>(`/api/v1/test-runs/${runId}/results`, options),

  addResult: (runId: string, data: CreateTestResultRequest, options?: FetchOptions) =>
    apiClient.post<TestResult>(`/api/v1/test-runs/${runId}/results`, data, options),

  getComparison: (projectId: string, options?: FetchOptions) =>
    apiClient.get<TestRunComparisonResponse>(`/api/v1/test-runs/comparison/${projectId}`, options),
};
