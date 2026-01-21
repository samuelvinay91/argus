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

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

// =============================================================================
// Domain-specific API endpoints for backend migration
// =============================================================================

/**
 * Tests API endpoints
 */
export const testsApi = {
  // Test CRUD
  list: (projectId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/tests?project_id=${projectId}`, options),

  get: (testId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/tests/${testId}`, options),

  create: (test: {
    projectId: string;
    name: string;
    description?: string;
    steps?: unknown[];
    tags?: string[];
    priority?: string;
    source?: string;
  }, options?: FetchOptions) =>
    apiClient.post('/api/v1/tests', test, options),

  update: (testId: string, updates: Record<string, unknown>, options?: FetchOptions) =>
    apiClient.patch(`/api/v1/tests/${testId}`, updates, options),

  delete: (testId: string, options?: FetchOptions) =>
    apiClient.delete(`/api/v1/tests/${testId}`, options),

  bulkDelete: (testIds: string[], options?: FetchOptions) =>
    apiClient.post('/api/v1/tests/bulk-delete', { test_ids: testIds }, options),

  bulkUpdate: (testIds: string[], updates: Record<string, unknown>, options?: FetchOptions) =>
    apiClient.post('/api/v1/tests/bulk-update', { test_ids: testIds, updates }, options),

  // Test Runs
  run: (params: {
    projectId: string;
    appUrl: string;
    codebasePath?: string;
    name?: string;
    trigger?: string;
    testIds?: string[];
  }, options?: FetchOptions) =>
    apiClient.post('/api/v1/tests/run', params, options),

  getRunStatus: (jobId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/jobs/${jobId}`, options),

  // Test Results
  listRuns: (projectId: string, limit?: number, options?: FetchOptions) =>
    apiClient.get(`/api/v1/test-runs?project_id=${projectId}&limit=${limit || 20}`, options),

  getRun: (runId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/test-runs/${runId}`, options),

  getRunResults: (runId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/test-runs/${runId}/results`, options),
};

/**
 * Projects API endpoints
 */
export const projectsApi = {
  list: (options?: FetchOptions) =>
    apiClient.get('/api/v1/projects', options),

  get: (projectId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/projects/${projectId}`, options),

  create: (project: {
    name: string;
    appUrl: string;
    description?: string;
    settings?: Record<string, unknown>;
  }, options?: FetchOptions) =>
    apiClient.post('/api/v1/projects', project, options),

  update: (projectId: string, updates: Record<string, unknown>, options?: FetchOptions) =>
    apiClient.patch(`/api/v1/projects/${projectId}`, updates, options),

  delete: (projectId: string, options?: FetchOptions) =>
    apiClient.delete(`/api/v1/projects/${projectId}`, options),

  getStats: (projectId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/projects/${projectId}/stats`, options),
};

/**
 * Visual Testing API endpoints
 */
export const visualApi = {
  // Baselines
  listBaselines: (projectId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/visual/baselines?project_id=${projectId}`, options),

  createBaseline: (baseline: {
    projectId: string;
    name: string;
    pageUrl: string;
    viewport?: string;
    screenshotUrl: string;
  }, options?: FetchOptions) =>
    apiClient.post('/api/v1/visual/baselines', baseline, options),

  updateBaseline: (baselineId: string, updates: Record<string, unknown>, options?: FetchOptions) =>
    apiClient.patch(`/api/v1/visual/baselines/${baselineId}`, updates, options),

  deleteBaseline: (baselineId: string, options?: FetchOptions) =>
    apiClient.delete(`/api/v1/visual/baselines/${baselineId}`, options),

  // Comparisons
  listComparisons: (projectId: string, limit?: number, options?: FetchOptions) =>
    apiClient.get(`/api/v1/visual/comparisons?project_id=${projectId}&limit=${limit || 20}`, options),

  getComparison: (comparisonId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/visual/comparisons/${comparisonId}`, options),

  compare: (params: {
    projectId: string;
    baselineId?: string;
    currentUrl: string;
    threshold?: number;
  }, options?: FetchOptions) =>
    apiClient.post('/api/v1/visual/compare', params, options),

  approveComparison: (comparisonId: string, options?: FetchOptions) =>
    apiClient.post(`/api/v1/visual/comparisons/${comparisonId}/approve`, undefined, options),

  rejectComparison: (comparisonId: string, options?: FetchOptions) =>
    apiClient.post(`/api/v1/visual/comparisons/${comparisonId}/reject`, undefined, options),

  // Capture
  capture: (params: {
    projectId: string;
    url: string;
    viewport?: string;
    device?: string;
  }, options?: FetchOptions) =>
    apiClient.post('/api/v1/visual/capture', params, options),
};

/**
 * Quality Audits API endpoints
 */
export const qualityApi = {
  // Audits
  listAudits: (projectId: string, limit?: number, options?: FetchOptions) =>
    apiClient.get(`/api/v1/quality/audits?project_id=${projectId}&limit=${limit || 20}`, options),

  getAudit: (auditId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/quality/audits/${auditId}`, options),

  runAudit: (params: {
    projectId: string;
    url: string;
    auditTypes?: string[];
  }, options?: FetchOptions) =>
    apiClient.post('/api/v1/quality/audits', params, options),

  // Accessibility Issues
  getAccessibilityIssues: (auditId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/quality/audits/${auditId}/accessibility`, options),
};

/**
 * Global Tests API endpoints
 */
export const globalTestsApi = {
  list: (projectId: string, limit?: number, options?: FetchOptions) =>
    apiClient.get(`/api/v1/global-tests?project_id=${projectId}&limit=${limit || 20}`, options),

  get: (testId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/global-tests/${testId}`, options),

  run: (params: {
    projectId: string;
    url: string;
    regions?: string[];
  }, options?: FetchOptions) =>
    apiClient.post('/api/v1/global-tests', params, options),

  getResults: (testId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/global-tests/${testId}/results`, options),
};

/**
 * Schedules API endpoints
 */
export const schedulesApi = {
  list: (projectId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/schedules?project_id=${projectId}`, options),

  get: (scheduleId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/schedules/${scheduleId}`, options),

  create: (schedule: {
    projectId: string;
    name: string;
    scheduleType: string;
    cronExpression?: string;
    testIds?: string[];
    enabled?: boolean;
  }, options?: FetchOptions) =>
    apiClient.post('/api/v1/schedules', schedule, options),

  update: (scheduleId: string, updates: Record<string, unknown>, options?: FetchOptions) =>
    apiClient.patch(`/api/v1/schedules/${scheduleId}`, updates, options),

  delete: (scheduleId: string, options?: FetchOptions) =>
    apiClient.delete(`/api/v1/schedules/${scheduleId}`, options),

  toggle: (scheduleId: string, enabled: boolean, options?: FetchOptions) =>
    apiClient.patch(`/api/v1/schedules/${scheduleId}`, { enabled }, options),

  listHistory: (scheduleId: string, limit?: number, options?: FetchOptions) =>
    apiClient.get(`/api/v1/schedules/${scheduleId}/history?limit=${limit || 20}`, options),
};

/**
 * Notifications API endpoints
 */
export const notificationsApi = {
  listChannels: (options?: FetchOptions) =>
    apiClient.get('/api/v1/notifications/channels', options),

  createChannel: (channel: {
    name: string;
    channelType: string;
    config: Record<string, unknown>;
  }, options?: FetchOptions) =>
    apiClient.post('/api/v1/notifications/channels', channel, options),

  updateChannel: (channelId: string, updates: Record<string, unknown>, options?: FetchOptions) =>
    apiClient.patch(`/api/v1/notifications/channels/${channelId}`, updates, options),

  deleteChannel: (channelId: string, options?: FetchOptions) =>
    apiClient.delete(`/api/v1/notifications/channels/${channelId}`, options),

  testChannel: (channelId: string, options?: FetchOptions) =>
    apiClient.post(`/api/v1/notifications/channels/${channelId}/test`, undefined, options),

  listRules: (projectId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/notifications/rules?project_id=${projectId}`, options),

  createRule: (rule: {
    projectId: string;
    name: string;
    eventType: string;
    channelId: string;
    conditions?: Record<string, unknown>;
  }, options?: FetchOptions) =>
    apiClient.post('/api/v1/notifications/rules', rule, options),

  updateRule: (ruleId: string, updates: Record<string, unknown>, options?: FetchOptions) =>
    apiClient.patch(`/api/v1/notifications/rules/${ruleId}`, updates, options),

  deleteRule: (ruleId: string, options?: FetchOptions) =>
    apiClient.delete(`/api/v1/notifications/rules/${ruleId}`, options),
};

/**
 * Insights API endpoints
 */
export const insightsApi = {
  list: (projectId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/insights?project_id=${projectId}`, options),

  get: (insightId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/insights/${insightId}`, options),

  resolve: (insightId: string, options?: FetchOptions) =>
    apiClient.post(`/api/v1/insights/${insightId}/resolve`, undefined, options),

  dismiss: (insightId: string, options?: FetchOptions) =>
    apiClient.post(`/api/v1/insights/${insightId}/dismiss`, undefined, options),
};

/**
 * Parameterized Tests API endpoints
 */
export const parameterizedApi = {
  listTests: (projectId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/parameterized/tests?project_id=${projectId}`, options),

  getTest: (testId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/parameterized/tests/${testId}`, options),

  createTest: (test: {
    projectId: string;
    name: string;
    description?: string;
    baseSteps: unknown[];
    parameters: Record<string, unknown>;
  }, options?: FetchOptions) =>
    apiClient.post('/api/v1/parameterized/tests', test, options),

  updateTest: (testId: string, updates: Record<string, unknown>, options?: FetchOptions) =>
    apiClient.patch(`/api/v1/parameterized/tests/${testId}`, updates, options),

  deleteTest: (testId: string, options?: FetchOptions) =>
    apiClient.delete(`/api/v1/parameterized/tests/${testId}`, options),

  // Parameter Sets
  listParamSets: (testId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/parameterized/tests/${testId}/param-sets`, options),

  createParamSet: (testId: string, paramSet: Record<string, unknown>, options?: FetchOptions) =>
    apiClient.post(`/api/v1/parameterized/tests/${testId}/param-sets`, paramSet, options),

  updateParamSet: (paramSetId: string, updates: Record<string, unknown>, options?: FetchOptions) =>
    apiClient.patch(`/api/v1/parameterized/param-sets/${paramSetId}`, updates, options),

  deleteParamSet: (paramSetId: string, options?: FetchOptions) =>
    apiClient.delete(`/api/v1/parameterized/param-sets/${paramSetId}`, options),

  // Runs
  run: (testId: string, paramSetIds?: string[], options?: FetchOptions) =>
    apiClient.post(`/api/v1/parameterized/tests/${testId}/run`, { param_set_ids: paramSetIds }, options),

  getRun: (runId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/parameterized/runs/${runId}`, options),
};

/**
 * Activity/Live Session API endpoints
 */
export const activityApi = {
  listSessions: (projectId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/activity/sessions?project_id=${projectId}`, options),

  getSession: (sessionId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/activity/sessions/${sessionId}`, options),

  getLogs: (sessionId: string, options?: FetchOptions) =>
    apiClient.get(`/api/v1/activity/sessions/${sessionId}/logs`, options),
};
