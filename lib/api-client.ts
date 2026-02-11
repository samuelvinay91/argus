'use client';

/**
 * Global Authenticated API Client
 *
 * This module provides a centralized way to make authenticated API calls
 * without needing to modify every hook individually.
 *
 * Features:
 * - Automatic auth token injection
 * - Global 10-second timeout
 * - AbortController support for cancellation
 * - Exponential backoff retry (max 1 retry)
 * - In-flight GET request deduplication
 *
 * Usage:
 * 1. Wrap your app with <ApiClientProvider> (already done in layout)
 * 2. All fetch calls through this module automatically include auth
 */

// Configuration constants
const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds
const MAX_RETRIES = 1;
const INITIAL_RETRY_DELAY_MS = 300;

// In-flight GET request deduplication map
const inflightRequests = new Map<string, Promise<unknown>>();

/**
 * Case Conversion Utilities
 *
 * NOTE: These functions are ONLY needed for Supabase Realtime subscriptions.
 *
 * For HTTP API calls to the Python backend, NO conversion is needed!
 * The backend CamelCaseMiddleware automatically:
 * - Converts incoming requests from camelCase → snake_case
 * - Converts outgoing responses from snake_case → camelCase
 *
 * When to use these functions:
 * - Supabase Realtime subscriptions (payload.new, payload.old)
 * - Direct Supabase queries (not going through backend API)
 *
 * When NOT to use:
 * - Any HTTP API call to /api/v1/* endpoints
 * - fetchJson, fetchStream, or authenticatedFetch calls
 */

/**
 * Convert camelCase to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case to camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Recursively convert object keys from camelCase to snake_case
 * USE ONLY for Supabase Realtime, NOT for HTTP API calls
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

/**
 * Recursively convert object keys from snake_case to camelCase
 * USE ONLY for Supabase Realtime, NOT for HTTP API calls
 */
export function convertKeysToCamelCase(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamelCase);
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = snakeToCamel(key);
      converted[camelKey] = convertKeysToCamelCase(value);
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
const AUTH_SYNC_KEY = 'skopaq_auth_sync';

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

  // Deduplicate concurrent identical GET requests
  if (method === 'GET' && retryCount === 0) {
    const existing = inflightRequests.get(url) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = fetchJsonInternal<T>(url, options, 0);
    inflightRequests.set(url, promise);
    return promise.finally(() => inflightRequests.delete(url));
  }

  return fetchJsonInternal<T>(url, options, retryCount);
}

async function fetchJsonInternal<T>(
  url: string,
  options: FetchOptions | undefined,
  retryCount: number
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
        return fetchJsonInternal(url, options, retryCount + 1);
      }

      // Check if error is retryable
      if (isRetryableError(null, response.status) && retryCount < maxRetries) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
        console.log(`[api-client] Got ${response.status}, retrying in ${delay}ms...`);
        await sleep(delay);
        return fetchJsonInternal(url, options, retryCount + 1);
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

    // Backend CamelCaseMiddleware returns camelCase responses automatically
    return await response.json() as T;
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
      return fetchJsonInternal(url, options, retryCount + 1);
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
      // Backend CamelCaseMiddleware converts camelCase → snake_case automatically
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(url: string, body?: unknown, options?: FetchOptions) =>
    fetchJson<T>(url, {
      ...options,
      method: 'PUT',
      // Backend CamelCaseMiddleware converts camelCase → snake_case automatically
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(url: string, body?: unknown, options?: FetchOptions) =>
    fetchJson<T>(url, {
      ...options,
      method: 'PATCH',
      // Backend CamelCaseMiddleware converts camelCase → snake_case automatically
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(url: string, options?: FetchOptions) =>
    fetchJson<T>(url, { ...options, method: 'DELETE' }),
};

// ============================================================================
// Discovery API Types
// ============================================================================

export interface DiscoverySession {
  id: string;
  projectId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed';
  progressPercentage: number;
  pagesFound: number;
  flowsFound: number;
  elementsFound: number;
  formsFound: number;
  errorsCount: number;
  startedAt: string;
  completedAt: string | null;
  appUrl: string;
  mode: string;
  strategy: string;
  maxPages: number;
  maxDepth: number;
  currentUrl: string | null;
  currentDepth: number;
  estimatedTimeRemaining: number | null;
  coverageScore: number | null;
  executionContext: string | null;
  videoArtifactId: string | null;
  recordingUrl: string | null;
}

export interface DiscoveredPage {
  id: string;
  sessionId: string;
  url: string;
  title: string;
  description: string;
  pageType: string;
  screenshotUrl: string | null;
  elementsCount: number;
  formsCount: number;
  linksCount: number;
  discoveredAt: string;
  loadTimeMs: number | null;
  aiAnalysis: Record<string, unknown> | null;
}

export interface DiscoveredFlow {
  id: string;
  sessionId: string;
  name: string;
  description: string;
  category: string;
  priority: string;
  startUrl: string;
  steps: Array<Record<string, unknown>>;
  pagesInvolved: string[];
  estimatedDuration: number | null;
  complexityScore: number | null;
  testGenerated: boolean;
  validated: boolean;
  validationResult: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface DiscoverySessionsListResponse {
  sessions: DiscoverySession[];
  total: number;
}

export interface DiscoveryPattern {
  id: string;
  patternType: string;
  patternName: string;
  patternSignature: string;
  patternData: Record<string, unknown>;
  timesSeen: number;
  testSuccessRate: number | null;
  selfHealSuccessRate: number | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface DiscoveryPatternsListResponse {
  patterns: DiscoveryPattern[];
  total: number;
}

export interface DiscoveryHistoryItem {
  id: string;
  projectId: string;
  status: string;
  pagesFound: number;
  flowsFound: number;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  coverageScore: number | null;
}

export interface DiscoveryComparisonResponse {
  session1Id: string;
  session2Id: string;
  newPages: string[];
  removedPages: string[];
  changedPages: Array<Record<string, unknown>>;
  newFlows: string[];
  removedFlows: string[];
  coverageChange: number;
  summary: string;
}

export interface StartDiscoveryRequest {
  projectId: string;
  appUrl: string;
  mode?: string;
  strategy?: string;
  maxPages?: number;
  maxDepth?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  focusAreas?: string[];
  captureScreenshots?: boolean;
  useVisionAi?: boolean;
  authConfig?: {
    type: string;
    credentials: Record<string, unknown>;
    loginUrl?: string;
    loginSteps?: Array<Record<string, unknown>>;
  };
  customHeaders?: Record<string, string>;
  timeoutSeconds?: number;
  executionContext?: 'dashboard' | 'api' | 'mcp';
  recordSession?: boolean;
}

export interface UpdateFlowRequest {
  name?: string;
  description?: string;
  priority?: string;
  steps?: Array<Record<string, unknown>>;
  category?: string;
}

/**
 * Discovery API endpoints
 */
export const discoveryApi = {
  // Session Management
  listSessions: (params?: {
    projectId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('project_id', params.projectId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return apiClient.get<DiscoverySessionsListResponse>(
      `/api/v1/discovery/sessions${query ? `?${query}` : ''}`,
      options
    );
  },

  startSession: (params: StartDiscoveryRequest, options?: FetchOptions) =>
    apiClient.post<DiscoverySession>('/api/v1/discovery/sessions', params, options),

  getSession: (sessionId: string, options?: FetchOptions) =>
    apiClient.get<DiscoverySession>(`/api/v1/discovery/sessions/${sessionId}`, options),

  deleteSession: (sessionId: string, options?: FetchOptions) =>
    apiClient.delete<{ success: boolean; message: string }>(
      `/api/v1/discovery/sessions/${sessionId}`,
      options
    ),

  pauseSession: (sessionId: string, options?: FetchOptions) =>
    apiClient.post<{ success: boolean; sessionId: string; status: string; message: string }>(
      `/api/v1/discovery/sessions/${sessionId}/pause`,
      undefined,
      options
    ),

  resumeSession: (sessionId: string, options?: FetchOptions) =>
    apiClient.post<{ success: boolean; sessionId: string; status: string; message: string }>(
      `/api/v1/discovery/sessions/${sessionId}/resume`,
      undefined,
      options
    ),

  cancelSession: (sessionId: string, options?: FetchOptions) =>
    apiClient.post<{ success: boolean; sessionId: string; status: string; message: string }>(
      `/api/v1/discovery/sessions/${sessionId}/cancel`,
      undefined,
      options
    ),

  // Pages
  getPages: (sessionId: string, options?: FetchOptions) =>
    apiClient.get<DiscoveredPage[]>(`/api/v1/discovery/sessions/${sessionId}/pages`, options),

  getPage: (sessionId: string, pageId: string, options?: FetchOptions) =>
    apiClient.get<DiscoveredPage>(
      `/api/v1/discovery/sessions/${sessionId}/pages/${pageId}`,
      options
    ),

  // Flows
  getFlows: (sessionId: string, options?: FetchOptions) =>
    apiClient.get<DiscoveredFlow[]>(`/api/v1/discovery/sessions/${sessionId}/flows`, options),

  updateFlow: (flowId: string, data: UpdateFlowRequest, options?: FetchOptions) =>
    apiClient.put<DiscoveredFlow>(`/api/v1/discovery/flows/${flowId}`, data, options),

  validateFlow: (flowId: string, params?: {
    timeoutSeconds?: number;
    captureVideo?: boolean;
    stopOnError?: boolean;
  }, options?: FetchOptions) =>
    apiClient.post<{
      success: boolean;
      flowId: string;
      validationResult: Record<string, unknown>;
      videUrl?: string;
    }>(`/api/v1/discovery/flows/${flowId}/validate`, params, options),

  generateTest: (flowId: string, params?: {
    framework?: string;
    language?: string;
    includeAssertions?: boolean;
    includeScreenshots?: boolean;
    parameterize?: boolean;
  }, options?: FetchOptions) =>
    apiClient.post<{
      success: boolean;
      flowId: string;
      testId?: string;
      testCode?: string;
    }>(`/api/v1/discovery/flows/${flowId}/generate-test`, params, options),

  // Patterns
  listPatterns: (params?: {
    patternType?: string;
    limit?: number;
    offset?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.patternType) searchParams.set('pattern_type', params.patternType);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return apiClient.get<DiscoveryPatternsListResponse>(
      `/api/v1/discovery/patterns${query ? `?${query}` : ''}`,
      options
    );
  },

  getSessionPatterns: (sessionId: string, options?: FetchOptions) =>
    apiClient.get<DiscoveryPatternsListResponse>(
      `/api/v1/discovery/sessions/${sessionId}/patterns`,
      options
    ),

  // History & Comparison
  getProjectHistory: (projectId: string, params?: {
    limit?: number;
    offset?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return apiClient.get<DiscoveryHistoryItem[]>(
      `/api/v1/discovery/projects/${projectId}/history${query ? `?${query}` : ''}`,
      options
    );
  },

  compareSessionst: (projectId: string, session1Id: string, session2Id: string, options?: FetchOptions) =>
    apiClient.get<DiscoveryComparisonResponse>(
      `/api/v1/discovery/projects/${projectId}/compare?session_1_id=${session1Id}&session_2_id=${session2Id}`,
      options
    ),
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
  // Steps can use either 'action' or 'instruction' field - both are accepted
  steps?: Array<{
    action?: string;
    instruction?: string;
    target?: string;
    value?: string;
    description?: string;
  }>;
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

// ============================================================================
// Projects API Types
// ============================================================================

export interface ProjectListItem {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  appUrl: string | null;
  isActive: boolean;
  testCount: number;
  lastRunAt: string | null;
  createdAt: string;
}

export interface Project extends ProjectListItem {
  codebasePath: string | null;
  repositoryUrl: string | null;
  settings: Record<string, unknown> | null;
  updatedAt: string | null;
}

export interface CreateProjectRequest {
  name: string;
  description?: string | null;
  appUrl?: string | null;
  codebasePath?: string | null;
  repositoryUrl?: string | null;
  settings?: Record<string, unknown> | null;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string | null;
  appUrl?: string | null;
  codebasePath?: string | null;
  repositoryUrl?: string | null;
  settings?: Record<string, unknown> | null;
  isActive?: boolean;
}

/**
 * Projects API endpoints
 */
export const projectsApi = {
  list: (params?: {
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.isActive !== undefined) searchParams.set('is_active', String(params.isActive));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return apiClient.get<ProjectListItem[]>(`/api/v1/projects${query ? `?${query}` : ''}`, options);
  },

  get: (projectId: string, options?: FetchOptions) =>
    apiClient.get<Project>(`/api/v1/projects/${projectId}`, options),

  create: (data: CreateProjectRequest, options?: FetchOptions) =>
    apiClient.post<Project>('/api/v1/projects', data, options),

  update: (projectId: string, data: UpdateProjectRequest, options?: FetchOptions) =>
    apiClient.patch<Project>(`/api/v1/projects/${projectId}`, data, options),

  delete: (projectId: string, options?: FetchOptions) =>
    apiClient.delete<{ success: boolean; message: string }>(`/api/v1/projects/${projectId}`, options),
};

// ============================================================================
// Schedules API Types
// ============================================================================

export type ScheduleStatus = 'active' | 'paused' | 'running' | 'error';
export type ScheduleRunStatus = 'pending' | 'queued' | 'running' | 'passed' | 'failed' | 'success' | 'failure' | 'cancelled' | 'timeout';
export type ScheduleTriggerType = 'scheduled' | 'manual' | 'webhook' | 'api';

export interface Schedule {
  id: string;
  projectId: string;
  name: string;
  cronExpression: string;
  cronReadable: string;
  testIds: string[] | null;
  appUrl: string;
  enabled: boolean;
  status: ScheduleStatus;
  notifyOnFailure: boolean;
  notificationChannels: Record<string, boolean>;
  description: string | null;
  timeoutMinutes: number;
  retryCount: number;
  environmentVariables: Record<string, string> | null;
  tags: string[] | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: ScheduleRunStatus | null;
  runCount: number;
  successCount: number;
  failureCount: number;
  avgDurationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  // AI Configuration
  autoHealEnabled: boolean;
  autoHealConfidenceThreshold: number;
  quarantineFlakyTests: boolean;
  flakyThreshold: number;
}

export interface SchedulesListResponse {
  schedules: Schedule[];
  total: number;
  page: number;
  perPage: number;
}

export interface ScheduleRun {
  id: string;
  scheduleId: string;
  status: ScheduleRunStatus;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  triggerType: ScheduleTriggerType;
  triggeredBy: string | null;
  testResults: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  } | null;
  errorMessage: string | null;
  retryAttempt: number;
  logsUrl: string | null;
  // AI Analysis
  aiAnalysis: {
    category?: string;
    confidence?: number;
    summary?: string;
    suggestedFix?: string;
    isFlaky?: boolean;
    rootCause?: string;
    similarFailures?: string[];
    detailedAnalysis?: string;
    autoHealable?: boolean;
  } | null;
  isFlaky: boolean;
  flakyScore: number;
  failureCategory: string | null;
  failureConfidence: number | null;
  // Auto-healing
  autoHealed: boolean;
  healingDetails: {
    healedAt?: string;
    originalSelector?: string;
    newSelector?: string;
    confidence?: number;
    healingType?: string;
  } | null;
}

export interface CreateScheduleRequest {
  projectId: string;
  name: string;
  cronExpression: string;
  testIds?: string[] | null;
  appUrl: string;
  enabled?: boolean;
  notifyOnFailure?: boolean;
  notificationChannels?: Record<string, boolean>;
  description?: string | null;
  timeoutMinutes?: number;
  retryCount?: number;
  environmentVariables?: Record<string, string> | null;
  tags?: string[] | null;
  // AI Configuration
  autoHealEnabled?: boolean;
  autoHealConfidenceThreshold?: number;
  quarantineFlakyTests?: boolean;
  flakyThreshold?: number;
}

export interface UpdateScheduleRequest {
  name?: string;
  cronExpression?: string;
  testIds?: string[] | null;
  appUrl?: string;
  enabled?: boolean;
  notifyOnFailure?: boolean;
  notificationChannels?: Record<string, boolean>;
  description?: string | null;
  timeoutMinutes?: number;
  retryCount?: number;
  environmentVariables?: Record<string, string> | null;
  tags?: string[] | null;
  // AI Configuration
  autoHealEnabled?: boolean;
  autoHealConfidenceThreshold?: number;
  quarantineFlakyTests?: boolean;
  flakyThreshold?: number;
}

export interface TriggerScheduleResponse {
  success: boolean;
  message: string;
  runId: string;
  scheduleId: string;
  startedAt: string;
}

export interface FlakyTest {
  testId: string;
  testName: string;
  flakyScore: number;
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  failureRate: number;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  isQuarantined: boolean;
  failureCategories: string[];
  recommendedAction: string | null;
}

export interface ScheduleAiStats {
  totalRuns: number;
  autoHealedCount: number;
  flakyTestsDetected: number;
  failureCategories: Record<string, number>;
  healingSuccessRate: number | null;
  averageFlakyScore: number | null;
  aiAnalysisEnabled: boolean;
  quarantineEnabled: boolean;
  flakyThreshold: number;
  autoHealConfidenceThreshold: number;
}

export interface CronValidationResponse {
  valid: boolean;
  error: string | null;
  readable: string | null;
  nextRuns: string[];
}

export interface SchedulePreset {
  name: string;
  cron: string;
  description: string;
}

/**
 * Schedules API endpoints
 */
export const schedulesApi = {
  list: (params?: {
    projectId?: string;
    enabled?: boolean;
    tags?: string;
    page?: number;
    perPage?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('project_id', params.projectId);
    if (params?.enabled !== undefined) searchParams.set('enabled', String(params.enabled));
    if (params?.tags) searchParams.set('tags', params.tags);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.perPage) searchParams.set('per_page', String(params.perPage));
    const query = searchParams.toString();
    return apiClient.get<SchedulesListResponse>(`/api/v1/schedules${query ? `?${query}` : ''}`, options);
  },

  get: (scheduleId: string, options?: FetchOptions) =>
    apiClient.get<Schedule>(`/api/v1/schedules/${scheduleId}`, options),

  create: (data: CreateScheduleRequest, options?: FetchOptions) =>
    apiClient.post<Schedule>('/api/v1/schedules', data, options),

  update: (scheduleId: string, data: UpdateScheduleRequest, options?: FetchOptions) =>
    apiClient.patch<Schedule>(`/api/v1/schedules/${scheduleId}`, data, options),

  delete: (scheduleId: string, options?: FetchOptions) =>
    apiClient.delete<{ success: boolean; message: string; scheduleId: string }>(
      `/api/v1/schedules/${scheduleId}`,
      options
    ),

  trigger: (scheduleId: string, options?: FetchOptions) =>
    apiClient.post<TriggerScheduleResponse>(
      `/api/v1/schedules/${scheduleId}/trigger`,
      undefined,
      options
    ),

  // Schedule Runs
  getRuns: (scheduleId: string, params?: {
    status?: ScheduleRunStatus;
    limit?: number;
    offset?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return apiClient.get<ScheduleRun[]>(
      `/api/v1/schedules/${scheduleId}/runs${query ? `?${query}` : ''}`,
      options
    );
  },

  getRun: (scheduleId: string, runId: string, options?: FetchOptions) =>
    apiClient.get<ScheduleRun>(`/api/v1/schedules/${scheduleId}/runs/${runId}`, options),

  cancelRun: (scheduleId: string, runId: string, options?: FetchOptions) =>
    apiClient.post<{ success: boolean; message: string; runId: string }>(
      `/api/v1/schedules/${scheduleId}/runs/${runId}/cancel`,
      undefined,
      options
    ),

  // AI Features
  getFlakyTests: (scheduleId: string, params?: {
    minRuns?: number;
    minFlakyScore?: number;
    includeQuarantined?: boolean;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.minRuns) searchParams.set('min_runs', String(params.minRuns));
    if (params?.minFlakyScore !== undefined) searchParams.set('min_flaky_score', String(params.minFlakyScore));
    if (params?.includeQuarantined !== undefined) searchParams.set('include_quarantined', String(params.includeQuarantined));
    const query = searchParams.toString();
    return apiClient.get<FlakyTest[]>(
      `/api/v1/schedules/${scheduleId}/flaky-tests${query ? `?${query}` : ''}`,
      options
    );
  },

  getAiStats: (scheduleId: string, options?: FetchOptions) =>
    apiClient.get<ScheduleAiStats>(`/api/v1/schedules/${scheduleId}/ai-stats`, options),

  // Utilities
  validateCron: (cronExpression: string, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    searchParams.set('cron_expression', cronExpression);
    return apiClient.post<CronValidationResponse>(
      `/api/v1/schedules/validate-cron?${searchParams.toString()}`,
      undefined,
      options
    );
  },

  getPresets: (options?: FetchOptions) =>
    apiClient.get<{ presets: SchedulePreset[] }>('/api/v1/schedules/presets', options),

  cleanupStaleRuns: (maxRunningMinutes?: number, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (maxRunningMinutes) searchParams.set('max_running_minutes', String(maxRunningMinutes));
    const query = searchParams.toString();
    return apiClient.post<{
      success: boolean;
      message: string;
      runsCleaned: number;
      maxRunningMinutes: number;
    }>(
      `/api/v1/schedules/cleanup-stale-runs${query ? `?${query}` : ''}`,
      undefined,
      options
    );
  },
};

// ============================================================================
// Visual AI API Types
// ============================================================================

export interface VisualViewportConfig {
  name?: string;
  width: number;
  height: number;
}

// API response types (camelCase for frontend)
export interface VisualSnapshot {
  id: string;
  url: string;
  screenshotUrl: string | null;
  viewport: { width: number; height: number };
  browser: string;
  capturedAt: string;
  metadata: Record<string, unknown> | null;
}

export interface VisualBaselineApi {
  id: string;
  name: string;
  url: string;
  projectId: string;
  screenshotUrl: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface VisualComparisonApi {
  id: string;
  baselineId: string;
  currentId: string;
  match: boolean;
  matchPercentage: number;
  hasRegressions: boolean;
  differences: Array<{
    id: string;
    type: string;
    severity: string;
    description: string;
    location?: string;
    element?: string;
    expected?: string;
    actual?: string;
    isRegression?: boolean;
  }>;
  summary: string;
  aiAnalysis: Record<string, unknown> | null;
  costUsd: number;
  comparedAt: string;
}

export interface VisualBaselinesListResponse {
  baselines: VisualBaselineApi[];
  total: number;
}

export interface VisualComparisonsListResponse {
  comparisons: VisualComparisonApi[];
  total: number;
}

export interface VisualCaptureRequest {
  url: string;
  viewport?: VisualViewportConfig;
  browser?: 'chromium' | 'firefox' | 'webkit';
  waitFor?: string;
  waitTimeout?: number;
  fullPage?: boolean;
  projectId?: string;
  name?: string;
}

export interface VisualCompareRequest {
  baselineId: string;
  currentUrl: string;
  context?: string;
  gitDiff?: string;
  prDescription?: string;
  ignoreRegions?: string[];
  sensitivity?: 'low' | 'medium' | 'high';
  viewport?: VisualViewportConfig;
  browser?: 'chromium' | 'firefox' | 'webkit';
}

export interface ResponsiveCaptureRequest {
  url: string;
  viewports?: VisualViewportConfig[];
  projectId?: string;
  name?: string;
}

export interface ResponsiveCaptureResponse {
  success: boolean;
  url: string;
  results: Array<{
    id?: string;
    viewport: VisualViewportConfig;
    success: boolean;
    screenshotUrl?: string;
    error?: string;
  }>;
  capturedAt: string;
}

export interface ResponsiveCompareRequest {
  url: string;
  viewports: Array<{
    name?: string;
    width: number;
    height: number;
    screenshotUrl: string;
  }>;
  projectId: string;
  threshold?: number;
}

export interface ResponsiveCompareResponse {
  url: string;
  results: Array<{
    viewport: string;
    width: number;
    height: number;
    status: 'match' | 'mismatch' | 'new' | 'error';
    matchPercentage: number | null;
    baselineUrl: string | null;
    currentUrl: string;
    diffUrl: string | null;
    error?: string;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    newBaselines: number;
  };
}

export interface BrowserMatrixRequest {
  url: string;
  browsers?: string[];
  viewport?: VisualViewportConfig;
  projectId?: string;
  name?: string;
}

export interface BrowserCaptureResponse {
  success: boolean;
  url: string;
  results: Array<{
    id?: string;
    browser: string;
    success: boolean;
    screenshotUrl?: string;
    error?: string;
  }>;
  capturedAt: string;
}

export interface BrowserCompareResponse {
  success: boolean;
  url: string;
  referenceBrowser: string;
  results: Array<{
    browser: string;
    isReference: boolean;
    referenceBrowser?: string;
    match?: boolean;
    matchPercentage?: number;
    differences?: Array<{
      type: string;
      severity: string;
      description: string;
      location?: string;
    }>;
    error?: string;
  }>;
  comparedAt: string;
}

export interface VisualApprovalRequest {
  changeIds?: string[];
  notes?: string;
  updateBaseline?: boolean;
}

export interface VisualRejectionRequest {
  notes: string;
  createIssue?: boolean;
}

export interface AIExplainResponse {
  summary: string;
  changesExplained: Array<{
    change: string;
    likelyCause: string;
    intentionalLikelihood: 'high' | 'medium' | 'low';
    riskLevel: 'high' | 'medium' | 'low';
  }>;
  recommendations: string[];
  overallAssessment: string;
}

export interface VisualAccessibilityIssue {
  criterion: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  location: string;
  recommendation: string;
}

export interface VisualAccessibilityResult {
  overallScore: number;
  levelCompliance: 'A' | 'AA' | 'AAA' | 'None';
  issues: VisualAccessibilityIssue[];
  passedCriteria: string[];
  summary: string;
}

/**
 * Visual AI API endpoints
 */
export const visualApi = {
  // Capture endpoints
  capture: (data: VisualCaptureRequest, options?: FetchOptions) =>
    apiClient.post<VisualSnapshot>('/api/v1/visual/capture', data, { ...options, timeout: 90000 }),

  captureResponsive: (data: ResponsiveCaptureRequest, options?: FetchOptions) =>
    apiClient.post<ResponsiveCaptureResponse>('/api/v1/visual/responsive/capture', data, { ...options, timeout: 120000 }),

  captureBrowsers: (data: BrowserMatrixRequest, options?: FetchOptions) =>
    apiClient.post<BrowserCaptureResponse>('/api/v1/visual/browsers/capture', data, { ...options, timeout: 120000 }),

  // Comparison endpoints
  compare: (data: VisualCompareRequest, options?: FetchOptions) =>
    apiClient.post<VisualComparisonApi>('/api/v1/visual/compare', data, options),

  compareResponsive: (data: ResponsiveCompareRequest, options?: FetchOptions) =>
    apiClient.post<ResponsiveCompareResponse>('/api/v1/visual/responsive/compare', data, { ...options, timeout: 60000 }),

  compareBrowsers: (data: BrowserMatrixRequest, options?: FetchOptions) =>
    apiClient.post<BrowserCompareResponse>('/api/v1/visual/browsers/compare', data, { ...options, timeout: 120000 }),

  // Analysis endpoints
  analyze: (snapshotId: string, expectedElements?: string[], context?: string, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    searchParams.set('snapshot_id', snapshotId);
    if (expectedElements) {
      expectedElements.forEach(e => searchParams.append('expected_elements', e));
    }
    if (context) searchParams.set('context', context);
    return apiClient.post<{ success: boolean; snapshotId: string; analysis: Record<string, unknown>; analyzedAt: string }>(
      `/api/v1/visual/analyze?${searchParams.toString()}`,
      undefined,
      options
    );
  },

  analyzeAccessibility: (snapshotId: string, wcagLevel: 'A' | 'AA' | 'AAA' = 'AA', options?: FetchOptions) =>
    apiClient.post<{
      success: boolean;
      snapshotId: string;
      wcagLevel: string;
      accessibility: VisualAccessibilityResult;
      analyzedAt: string;
    }>(`/api/v1/visual/accessibility/analyze?snapshot_id=${encodeURIComponent(snapshotId)}&wcag_level=${wcagLevel}`, undefined, options),

  // AI explanation
  explain: (comparisonId: string, options?: FetchOptions) =>
    apiClient.post<{
      success: boolean;
      comparisonId: string;
      explanation: AIExplainResponse;
      generatedAt: string;
    }>(`/api/v1/visual/ai/explain?comparison_id=${comparisonId}`, undefined, options),

  // Baseline management
  listBaselines: (projectId: string, limit = 50, options?: FetchOptions) =>
    apiClient.get<VisualBaselinesListResponse>(`/api/v1/visual/baselines?project_id=${projectId}&limit=${limit}`, options),

  getBaseline: (baselineId: string, options?: FetchOptions) =>
    apiClient.get<{ baseline: VisualBaselineApi }>(`/api/v1/visual/baselines/${baselineId}`, options),

  getBaselineHistory: (baselineId: string, limit = 20, options?: FetchOptions) =>
    apiClient.get<{
      baseline: VisualBaselineApi;
      history: Array<{
        baselineId: string;
        version: number;
        screenshotPath: string;
        metadata: Record<string, unknown>;
        createdAt: string;
      }>;
      totalVersions: number;
    }>(`/api/v1/visual/baselines/${baselineId}/history?limit=${limit}`, options),

  createBaseline: (url: string, name: string, projectId: string, viewport?: VisualViewportConfig, browser?: string, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    searchParams.set('url', url);
    searchParams.set('name', name);
    searchParams.set('project_id', projectId);
    if (browser) searchParams.set('browser', browser);
    return apiClient.post<VisualBaselineApi>(
      `/api/v1/visual/baselines?${searchParams.toString()}`,
      viewport ? { viewport } : undefined,
      options
    );
  },

  // Comparison management
  listComparisons: (params?: { projectId?: string; status?: string; limit?: number }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('project_id', params.projectId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return apiClient.get<VisualComparisonsListResponse>(`/api/v1/visual/comparisons${query ? `?${query}` : ''}`, options);
  },

  getComparison: (comparisonId: string, options?: FetchOptions) =>
    apiClient.get<{ comparison: VisualComparisonApi }>(`/api/v1/visual/comparisons/${comparisonId}`, options),

  approveComparison: (comparisonId: string, data?: VisualApprovalRequest, options?: FetchOptions) =>
    apiClient.post<{
      success: boolean;
      comparisonId: string;
      approvedChanges: string[];
      baselineUpdated: boolean;
      reviewedAt: string;
    }>(`/api/v1/visual/comparisons/${comparisonId}/approve`, data, options),

  rejectComparison: (comparisonId: string, data: VisualRejectionRequest, options?: FetchOptions) =>
    apiClient.post<{
      success: boolean;
      comparisonId: string;
      status: string;
      notes: string;
      issueUrl: string | null;
      reviewedAt: string;
    }>(`/api/v1/visual/comparisons/${comparisonId}/reject`, data, options),

  // Snapshot
  getSnapshot: (snapshotId: string, options?: FetchOptions) =>
    apiClient.get<{ snapshot: VisualSnapshot }>(`/api/v1/visual/snapshots/${snapshotId}`, options),
};

// ============================================================================
// Conversations API Types
// ============================================================================

export interface Conversation {
  id: string;
  projectId: string | null;
  userId: string;
  title: string | null;
  preview: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationsListResponse {
  conversations: Conversation[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateConversationRequest {
  projectId?: string | null;
  title?: string | null;
}

export interface UpdateConversationRequest {
  title?: string | null;
  preview?: string | null;
}

export interface ChatMessageApi {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolInvocations: Record<string, unknown> | null;
  createdAt: string;
}

export interface MessagesListResponse {
  messages: ChatMessageApi[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateMessageRequest {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolInvocations?: Record<string, unknown> | null;
}

/**
 * Conversations API endpoints
 */
export const conversationsApi = {
  list: (params?: {
    projectId?: string;
    limit?: number;
    offset?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('project_id', params.projectId);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return apiClient.get<ConversationsListResponse>(
      `/api/v1/conversations${query ? `?${query}` : ''}`,
      options
    );
  },

  get: (conversationId: string, options?: FetchOptions) =>
    apiClient.get<Conversation>(`/api/v1/conversations/${conversationId}`, options),

  create: (data: CreateConversationRequest, options?: FetchOptions) =>
    apiClient.post<Conversation>('/api/v1/conversations', data, options),

  update: (conversationId: string, data: UpdateConversationRequest, options?: FetchOptions) =>
    apiClient.patch<Conversation>(`/api/v1/conversations/${conversationId}`, data, options),

  delete: (conversationId: string, options?: FetchOptions) =>
    apiClient.delete<{ success: boolean; message: string }>(
      `/api/v1/conversations/${conversationId}`,
      options
    ),

  // Messages
  getMessages: (conversationId: string, params?: {
    limit?: number;
    offset?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return apiClient.get<MessagesListResponse>(
      `/api/v1/conversations/${conversationId}/messages${query ? `?${query}` : ''}`,
      options
    );
  },

  addMessage: (conversationId: string, data: CreateMessageRequest, options?: FetchOptions) =>
    apiClient.post<ChatMessageApi>(
      `/api/v1/conversations/${conversationId}/messages`,
      data,
      options
    ),
};

// ============================================================================
// Accessibility API Types
// ============================================================================

export type AccessibilitySeverity = 'critical' | 'serious' | 'moderate' | 'minor';
export type AuditStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * API response type for accessibility issue (snake_case from backend)
 */
export interface AccessibilityIssueApi {
  id: string;
  audit_id: string;
  rule: string;
  severity: AccessibilitySeverity;
  element_selector: string | null;
  description: string;
  suggested_fix: string | null;
  wcag_criteria: string[] | null;
  created_at: string;
}

/**
 * API response type for quality audit (snake_case from backend)
 */
export interface QualityAuditApi {
  id: string;
  project_id: string;
  url: string;
  status: AuditStatus;
  accessibility_score: number | null;
  performance_score: number | null;
  best_practices_score: number | null;
  seo_score: number | null;
  lcp_ms: number | null;
  fid_ms: number | null;
  cls: number | null;
  ttfb_ms: number | null;
  fcp_ms: number | null;
  tti_ms: number | null;
  started_at: string | null;
  completed_at: string | null;
  triggered_by: string | null;
  created_at: string;
}

export interface AccessibilityAuditApiResponse {
  audit: QualityAuditApi;
  issues: AccessibilityIssueApi[];
}

export interface AuditHistoryResponse {
  audits: QualityAuditApi[];
  total: number;
}

export interface AccessibilityIssuesResponse {
  issues: AccessibilityIssueApi[];
}

export interface RunAuditRequest {
  projectId: string;
  url: string;
  wcagLevel?: 'A' | 'AA' | 'AAA';
  includeBestPractices?: boolean;
  triggeredBy?: string | null;
}

export interface RunAuditApiResponse {
  success: boolean;
  message: string;
  audit_id: string | null;
  status: string;
}

export interface CreateIssuesBatchRequest {
  auditId: string;
  issues: Array<{
    rule: string;
    severity: AccessibilitySeverity;
    element_selector?: string | null;
    description: string;
    suggested_fix?: string | null;
    wcag_criteria?: string[] | null;
  }>;
}

/**
 * Accessibility API endpoints
 */
export const accessibilityApi = {
  // Get latest completed audit for a project
  getLatestAudit: (projectId: string, options?: FetchOptions) =>
    apiClient.get<AccessibilityAuditApiResponse | null>(
      `/api/v1/accessibility/audit/latest?project_id=${encodeURIComponent(projectId)}`,
      options
    ),

  // Get a specific audit by ID
  getAudit: (auditId: string, options?: FetchOptions) =>
    apiClient.get<AccessibilityAuditApiResponse>(
      `/api/v1/accessibility/audit/${auditId}`,
      options
    ),

  // Get audit history for a project
  getAuditHistory: (projectId: string, params?: {
    limit?: number;
    offset?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    searchParams.set('project_id', projectId);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    return apiClient.get<AuditHistoryResponse>(
      `/api/v1/accessibility/audits/history?${searchParams.toString()}`,
      options
    );
  },

  // Get issues for a specific audit
  getIssues: (auditId: string, severity?: AccessibilitySeverity, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    searchParams.set('audit_id', auditId);
    if (severity) searchParams.set('severity', severity);
    return apiClient.get<AccessibilityIssuesResponse>(
      `/api/v1/accessibility/issues?${searchParams.toString()}`,
      options
    );
  },

  // Run a new accessibility audit
  runAudit: (data: RunAuditRequest, options?: FetchOptions) =>
    apiClient.post<RunAuditApiResponse>(
      '/api/v1/accessibility/audit',
      data,
      { ...options, timeout: 90000 }
    ),

  // Update audit status/score
  updateAudit: (auditId: string, params: {
    status?: string;
    accessibilityScore?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status', params.status);
    if (params.accessibilityScore !== undefined) {
      searchParams.set('accessibility_score', String(params.accessibilityScore));
    }
    return apiClient.patch<{ success: boolean; message: string }>(
      `/api/v1/accessibility/audit/${auditId}?${searchParams.toString()}`,
      undefined,
      options
    );
  },

  // Create issues in batch
  createIssuesBatch: (auditId: string, issues: CreateIssuesBatchRequest['issues'], options?: FetchOptions) =>
    apiClient.post<{ success: boolean; created: number }>(
      `/api/v1/accessibility/issues/batch?audit_id=${encodeURIComponent(auditId)}`,
      issues,
      options
    ),
};

// ============================================================================
// Global Tests API Types
// ============================================================================

export type GlobalTestStatus = 'pending' | 'running' | 'completed' | 'failed';
export type RegionStatus = 'success' | 'error' | 'slow' | 'timeout';

export interface GlobalTestResultApi {
  id: string;
  globalTestId: string;
  regionCode: string;
  city: string;
  status: RegionStatus;
  latencyMs: number | null;
  ttfbMs: number | null;
  pageLoadMs: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface GlobalTestApi {
  id: string;
  projectId: string;
  url: string;
  status: GlobalTestStatus;
  avgLatencyMs: number | null;
  avgTtfbMs: number | null;
  successRate: number | null;
  slowRegions: number;
  failedRegions: number;
  startedAt: string | null;
  completedAt: string | null;
  triggeredBy: string | null;
  createdAt: string;
  results: GlobalTestResultApi[] | null;
}

export interface GlobalTestListResponse {
  tests: GlobalTestApi[];
  total: number;
  limit: number;
  offset: number;
}

export interface StartGlobalTestRequest {
  projectId: string;
  url: string;
}

/**
 * Global Tests API endpoints
 */
export const globalTestsApi = {
  list: (params: {
    projectId: string;
    limit?: number;
    offset?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    searchParams.set('project_id', params.projectId);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return apiClient.get<GlobalTestListResponse>(`/api/v1/global-tests?${query}`, options);
  },

  get: (testId: string, options?: FetchOptions) =>
    apiClient.get<GlobalTestApi>(`/api/v1/global-tests/${testId}`, options),

  start: (data: StartGlobalTestRequest, options?: FetchOptions) =>
    apiClient.post<GlobalTestApi>('/api/v1/global-tests/start', data, options),

  /**
   * Returns the SSE stream URL for a global test.
   * Use with EventSource for real-time updates.
   */
  getStreamUrl: (testId: string) =>
    `${BACKEND_URL}/api/v1/global-tests/${testId}/stream`,
};

// ============================================================================
// Reports API Types
// ============================================================================

export type ReportType = 'test_execution' | 'coverage' | 'trend' | 'quality' | 'custom';
export type ReportFormat = 'json' | 'html' | 'pdf' | 'markdown' | 'junit';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface ReportSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  passRate: number;
  durationMs?: number | null;
  coveragePercentage?: number | null;
}

export interface ReportMetrics {
  avgDurationMs?: number | null;
  flakyTests: number;
  newFailures: number;
  regressions: number;
  improvements: number;
}

export interface Report {
  id: string;
  organizationId: string;
  projectId: string;
  testRunId: string | null;
  name: string;
  description: string | null;
  reportType: string;
  status: string;
  format: string;
  summary: Record<string, unknown>;
  content: Record<string, unknown>;
  metrics: Record<string, unknown>;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  durationMs: number | null;
  coveragePercentage: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  fileUrl: string | null;
  fileSizeBytes: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string | null;
  generatedAt: string | null;
  expiresAt: string | null;
}

export interface ReportListItem {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  reportType: string;
  status: string;
  format: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  coveragePercentage: number | null;
  createdAt: string;
  generatedAt: string | null;
}

export interface ReportsListResponse {
  reports: ReportListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateReportRequest {
  projectId: string;
  name: string;
  description?: string | null;
  reportType?: ReportType;
  format?: ReportFormat;
  testRunId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  includeDetails?: boolean;
}

export interface UpdateReportRequest {
  name?: string | null;
  description?: string | null;
}

/**
 * Reports API endpoints
 */
export const reportsApi = {
  list: (params?: {
    projectId?: string;
    reportType?: ReportType;
    status?: ReportStatus;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('project_id', params.projectId);
    if (params?.reportType) searchParams.set('report_type', params.reportType);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.dateFrom) searchParams.set('date_from', params.dateFrom);
    if (params?.dateTo) searchParams.set('date_to', params.dateTo);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return apiClient.get<ReportsListResponse>(`/api/v1/reports${query ? `?${query}` : ''}`, options);
  },

  get: (reportId: string, options?: FetchOptions) =>
    apiClient.get<Report>(`/api/v1/reports/${reportId}`, options),

  create: (data: CreateReportRequest, options?: FetchOptions) =>
    apiClient.post<Report>('/api/v1/reports', data, options),

  update: (reportId: string, data: UpdateReportRequest, options?: FetchOptions) =>
    apiClient.patch<Report>(`/api/v1/reports/${reportId}`, data, options),

  delete: (reportId: string, options?: FetchOptions) =>
    apiClient.delete<{ success: boolean; message: string }>(`/api/v1/reports/${reportId}`, options),

  download: (reportId: string, format?: ReportFormat, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (format) searchParams.set('format', format);
    const query = searchParams.toString();
    // Returns a streaming response - use authenticatedFetch directly
    return authenticatedFetch(`/api/v1/reports/${reportId}/download${query ? `?${query}` : ''}`, options);
  },

  // Convenience: List reports for a specific project
  listByProject: (projectId: string, params?: {
    reportType?: ReportType;
    status?: ReportStatus;
    limit?: number;
    offset?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.reportType) searchParams.set('report_type', params.reportType);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return apiClient.get<ReportsListResponse>(
      `/api/v1/projects/${projectId}/reports${query ? `?${query}` : ''}`,
      options
    );
  },

  // Convenience: Generate report from test run
  generateFromTestRun: (testRunId: string, params?: {
    name?: string;
    format?: ReportFormat;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.name) searchParams.set('name', params.name);
    if (params?.format) searchParams.set('format', params.format);
    const query = searchParams.toString();
    return apiClient.post<Report>(
      `/api/v1/test-runs/${testRunId}/report${query ? `?${query}` : ''}`,
      undefined,
      options
    );
  },
};

// ============================================================================
// Notifications API Types
// ============================================================================

export type NotificationChannelType = 'slack' | 'email' | 'webhook' | 'discord' | 'teams' | 'pagerduty' | 'opsgenie';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationLogStatus = 'pending' | 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'suppressed';
export type EmailFrequency = 'instant' | 'hourly' | 'daily' | 'weekly';

export interface NotificationChannelApi {
  id: string;
  organizationId: string;
  projectId: string | null;
  name: string;
  channelType: NotificationChannelType;
  config: Record<string, unknown>;
  enabled: boolean;
  verified: boolean;
  rateLimitPerHour: number;
  lastSentAt: string | null;
  sentToday: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRuleApi {
  id: string;
  channelId: string;
  name: string | null;
  eventType: string;
  conditions: Record<string, unknown>;
  messageTemplate: string | null;
  priority: NotificationPriority;
  cooldownMinutes: number;
  enabled: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLogApi {
  id: string;
  channelId: string;
  ruleId: string | null;
  eventType: string;
  status: NotificationLogStatus;
  responseCode: number | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
  // Joined fields from channel
  channelName?: string;
  channelType?: string;
}

export interface UserNotificationApi {
  id: string;
  userId: string;
  organizationId: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  priority: NotificationPriority;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}

export interface UserNotificationListResponse {
  notifications: UserNotificationApi[];
  total: number;
  unreadCount: number;
  hasMore: boolean;
}

export interface UnreadCountResponse {
  unreadCount: number;
  byPriority: Record<string, number>;
}

export interface NotificationPreferencesApi {
  userId: string;
  emailEnabled: boolean;
  emailFrequency: EmailFrequency;
  emailTypes: string[];
  inAppEnabled: boolean;
  inAppTypes: string[];
  slackEnabled: boolean;
  slackChannel: string | null;
  slackTypes: string[];
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateChannelRequest {
  organizationId: string;
  projectId?: string | null;
  name: string;
  channelType: NotificationChannelType;
  config: Record<string, unknown>;
  enabled?: boolean;
  rateLimitPerHour?: number;
}

export interface UpdateChannelRequest {
  name?: string;
  config?: Record<string, unknown>;
  enabled?: boolean;
  rateLimitPerHour?: number;
}

export interface CreateRuleRequest {
  channelId: string;
  name?: string;
  eventType: string;
  conditions?: Record<string, unknown>;
  messageTemplate?: string;
  priority?: NotificationPriority;
  cooldownMinutes?: number;
  enabled?: boolean;
}

export interface UpdatePreferencesRequest {
  emailEnabled?: boolean;
  emailFrequency?: EmailFrequency;
  emailTypes?: string[];
  inAppEnabled?: boolean;
  inAppTypes?: string[];
  slackEnabled?: boolean;
  slackChannel?: string | null;
  slackTypes?: string[];
  quietHoursEnabled?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

export interface NotificationApiResponse {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Notifications API endpoints
 */
export const notificationsApi = {
  // ===== Notification Channels =====
  listChannels: (params?: {
    organizationId?: string;
    projectId?: string;
    channelType?: string;
    enabled?: boolean;
    limit?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.organizationId) searchParams.set('organization_id', params.organizationId);
    if (params?.projectId) searchParams.set('project_id', params.projectId);
    if (params?.channelType) searchParams.set('channel_type', params.channelType);
    if (params?.enabled !== undefined) searchParams.set('enabled', String(params.enabled));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return apiClient.get<NotificationChannelApi[]>(`/api/v1/notifications/channels${query ? `?${query}` : ''}`, options);
  },

  getChannel: (channelId: string, options?: FetchOptions) =>
    apiClient.get<NotificationChannelApi>(`/api/v1/notifications/channels/${channelId}`, options),

  createChannel: (data: CreateChannelRequest, options?: FetchOptions) =>
    apiClient.post<NotificationChannelApi>('/api/v1/notifications/channels', data, options),

  updateChannel: (channelId: string, data: UpdateChannelRequest, options?: FetchOptions) =>
    apiClient.patch<NotificationChannelApi>(`/api/v1/notifications/channels/${channelId}`, data, options),

  deleteChannel: (channelId: string, options?: FetchOptions) =>
    apiClient.delete<{ success: boolean; message: string; channelId: string }>(
      `/api/v1/notifications/channels/${channelId}`,
      options
    ),

  testChannel: (channelId: string, options?: FetchOptions) =>
    apiClient.post<NotificationApiResponse>(
      `/api/v1/notifications/channels/${channelId}/test`,
      undefined,
      options
    ),

  // ===== Notification Rules =====
  listRules: (params?: {
    channelId?: string;
    eventType?: string;
    limit?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.channelId) searchParams.set('channel_id', params.channelId);
    if (params?.eventType) searchParams.set('event_type', params.eventType);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return apiClient.get<NotificationRuleApi[]>(`/api/v1/notifications/rules${query ? `?${query}` : ''}`, options);
  },

  getRule: (ruleId: string, options?: FetchOptions) =>
    apiClient.get<NotificationRuleApi>(`/api/v1/notifications/rules/${ruleId}`, options),

  createRule: (data: CreateRuleRequest, options?: FetchOptions) =>
    apiClient.post<NotificationRuleApi>('/api/v1/notifications/rules', data, options),

  updateRule: (ruleId: string, data: CreateRuleRequest, options?: FetchOptions) =>
    apiClient.patch<NotificationRuleApi>(`/api/v1/notifications/rules/${ruleId}`, data, options),

  deleteRule: (ruleId: string, options?: FetchOptions) =>
    apiClient.delete<{ success: boolean; message: string; ruleId: string }>(
      `/api/v1/notifications/rules/${ruleId}`,
      options
    ),

  // ===== Notification Logs =====
  listLogs: (params?: {
    channelId?: string;
    status?: string;
    limit?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.channelId) searchParams.set('channel_id', params.channelId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return apiClient.get<NotificationLogApi[]>(`/api/v1/notifications/logs${query ? `?${query}` : ''}`, options);
  },

  // ===== User Notifications =====
  listUserNotifications: (params?: {
    read?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.read !== undefined) searchParams.set('read', String(params.read));
    if (params?.type) searchParams.set('type', params.type);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return apiClient.get<UserNotificationListResponse>(`/api/v1/notifications${query ? `?${query}` : ''}`, options);
  },

  getUnreadCount: (options?: FetchOptions) =>
    apiClient.get<UnreadCountResponse>('/api/v1/notifications/unread-count', options),

  markAsRead: (notificationId: string, options?: FetchOptions) =>
    apiClient.put<NotificationApiResponse>(`/api/v1/notifications/${notificationId}/read`, undefined, options),

  markAllAsRead: (options?: FetchOptions) =>
    apiClient.put<NotificationApiResponse>('/api/v1/notifications/mark-all-read', undefined, options),

  // ===== Notification Preferences =====
  getPreferences: (options?: FetchOptions) =>
    apiClient.get<NotificationPreferencesApi>('/api/v1/notifications/preferences', options),

  updatePreferences: (data: UpdatePreferencesRequest, options?: FetchOptions) =>
    apiClient.put<NotificationPreferencesApi>('/api/v1/notifications/preferences', data, options),

  // ===== Event Types =====
  listEventTypes: (options?: FetchOptions) =>
    apiClient.get<{ eventTypes: Array<{ type: string; description: string }> }>(
      '/api/v1/notifications/event-types',
      options
    ),
};

// ============================================================================
// Activity API Types
// ============================================================================

export type ActivityEventType =
  | 'test_started'
  | 'test_passed'
  | 'test_failed'
  | 'test_created'
  | 'test_updated'
  | 'test_deleted'
  | 'project_created'
  | 'project_updated'
  | 'healing_applied'
  | 'healing_suggested'
  | 'schedule_triggered'
  | 'user_joined'
  | 'settings_changed'
  | 'integration_connected'
  | 'discovery_started'
  | 'discovery_completed'
  | 'visual_test_started'
  | 'visual_test_completed'
  | 'quality_audit_started'
  | 'quality_audit_completed';

export interface ActivityUserApi {
  name: string;
  avatar: string | null;
}

export interface ActivityMetadataApi {
  projectId: string | null;
  projectName: string | null;
  testId: string | null;
  testName: string | null;
  duration: number | null;
  link: string | null;
}

export interface ActivityEventApi {
  id: string;
  type: ActivityEventType;
  title: string;
  description: string;
  timestamp: string;
  user: ActivityUserApi | null;
  metadata: ActivityMetadataApi | null;
}

export interface ActivityFeedResponse {
  activities: ActivityEventApi[];
  total: number;
}

export interface ActivityStatsResponse {
  lastHour: number;
  testRuns: number;
  healsApplied: number;
  failures: number;
}

/**
 * Activity API endpoints
 */
export const activityApi = {
  /**
   * Get aggregated activity feed from multiple sources.
   * Aggregates data from activity_logs, test_runs, discovery_sessions,
   * healing_patterns, and schedule_runs.
   */
  getFeed: (params: {
    projectIds: string[];
    limit?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    searchParams.set('project_ids', params.projectIds.join(','));
    if (params.limit) searchParams.set('limit', String(params.limit));
    return apiClient.get<ActivityFeedResponse>(
      `/api/v1/activity/feed?${searchParams.toString()}`,
      options
    );
  },

  /**
   * Get activity statistics for dashboard widgets.
   */
  getStats: (params: {
    projectIds: string[];
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    searchParams.set('project_ids', params.projectIds.join(','));
    return apiClient.get<ActivityStatsResponse>(
      `/api/v1/activity/stats?${searchParams.toString()}`,
      options
    );
  },
};

// ============================================================================
// Flaky Tests API Types
// ============================================================================

export interface FlakyTestRootCause {
  type: 'timing' | 'network' | 'data' | 'external' | 'selector' | 'state';
  description: string;
  confidence: number;
}

export interface FlakyTestApi {
  id: string;
  name: string;
  path: string | null;
  flakinessScore: number;
  totalRuns: number;
  passCount: number;
  failCount: number;
  lastRun: string | null;
  trend: 'increasing' | 'decreasing' | 'stable';
  isQuarantined: boolean;
  rootCauses: FlakyTestRootCause[];
  recentResults: boolean[];
  avgDuration: number;
  suggestedFix: string | null;
  projectId: string;
  projectName: string;
}

export interface FlakyTestsListResponse {
  tests: FlakyTestApi[];
  total: number;
}

export interface FlakyTestTrendItem {
  date: string;
  flaky: number;
  fixed: number;
}

export interface FlakyTestTrendResponse {
  trend: FlakyTestTrendItem[];
}

export interface FlakyTestStatsResponse {
  total: number;
  high: number;
  medium: number;
  low: number;
  quarantined: number;
  avgScore: number;
}

export interface ToggleQuarantineResponse {
  success: boolean;
  testId: string;
  isQuarantined: boolean;
}

/**
 * Flaky Tests API endpoints
 */
export const flakyTestsApi = {
  /**
   * List flaky tests with analysis data.
   */
  list: (params?: {
    projectId?: string;
    minScore?: number;
    days?: number;
    limit?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('project_id', params.projectId);
    if (params?.minScore !== undefined) searchParams.set('min_score', String(params.minScore));
    if (params?.days) searchParams.set('days', String(params.days));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return apiClient.get<FlakyTestsListResponse>(
      `/api/v1/flaky-tests${query ? `?${query}` : ''}`,
      options
    );
  },

  /**
   * Get flakiness trend data over time.
   */
  getTrend: (params?: {
    projectId?: string;
    weeks?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('project_id', params.projectId);
    if (params?.weeks) searchParams.set('weeks', String(params.weeks));
    const query = searchParams.toString();
    return apiClient.get<FlakyTestTrendResponse>(
      `/api/v1/flaky-tests/trend${query ? `?${query}` : ''}`,
      options
    );
  },

  /**
   * Get aggregated flaky test statistics.
   */
  getStats: (params?: {
    projectId?: string;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('project_id', params.projectId);
    const query = searchParams.toString();
    return apiClient.get<FlakyTestStatsResponse>(
      `/api/v1/flaky-tests/stats${query ? `?${query}` : ''}`,
      options
    );
  },

  /**
   * Toggle quarantine status for a flaky test.
   */
  toggleQuarantine: (testId: string, quarantine: boolean, options?: FetchOptions) =>
    apiClient.post<ToggleQuarantineResponse>(
      `/api/v1/flaky-tests/${testId}/quarantine`,
      { quarantine },
      options
    ),
};

// ============================================================================
// Performance API Types
// ============================================================================

export type PerformanceDeviceType = 'mobile' | 'desktop';
export type PerformanceStatusType = 'pending' | 'running' | 'completed' | 'failed';
export type PerformanceGradeType = 'excellent' | 'good' | 'needs_work' | 'poor';
export type PerformanceIssueSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface PerformanceIssueApi {
  category: string;
  severity: PerformanceIssueSeverity;
  title: string;
  description: string;
  savingsMs: number | null;
  savingsKb: number | null;
  fixSuggestion: string | null;
}

export interface PerformanceTestApi {
  id: string;
  projectId: string;
  url: string;
  device: PerformanceDeviceType;
  status: PerformanceStatusType;

  // Core Web Vitals
  lcpMs: number | null;
  fidMs: number | null;
  cls: number | null;
  inpMs: number | null;

  // Additional timing metrics
  ttfbMs: number | null;
  fcpMs: number | null;
  speedIndex: number | null;
  ttiMs: number | null;
  tbtMs: number | null;

  // Resource metrics
  totalRequests: number | null;
  totalTransferSizeKb: number | null;
  jsExecutionTimeMs: number | null;
  domContentLoadedMs: number | null;
  loadTimeMs: number | null;

  // Scores (0-100)
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;

  // Overall grade
  overallGrade: PerformanceGradeType | null;

  // AI Analysis
  recommendations: string[];
  issues: PerformanceIssueApi[];
  summary: string | null;

  // Metadata
  startedAt: string | null;
  completedAt: string | null;
  triggeredBy: string | null;
  createdAt: string;
}

export interface PerformanceTestListResponse {
  tests: PerformanceTestApi[];
  total: number;
  limit: number;
  offset: number;
}

export interface PerformanceTrendPointApi {
  date: string;
  lcpMs: number;
  fidMs: number;
  cls: number;
  performanceScore: number;
}

export interface PerformanceTrendsResponse {
  trends: PerformanceTrendPointApi[];
  days: number;
}

export interface PerformanceAveragesApi {
  avgLcp: number;
  avgFid: number;
  avgCls: number;
  avgScore: number;
}

export interface PerformanceSummaryResponse {
  latestTest: PerformanceTestApi | null;
  trends: PerformanceTrendPointApi[];
  averages: PerformanceAveragesApi | null;
  totalTests: number;
}

export interface RunPerformanceTestRequest {
  projectId: string;
  url: string;
  device?: PerformanceDeviceType;
}

/**
 * Performance API endpoints
 */
export const performanceApi = {
  // List performance tests with optional filters
  list: (params?: {
    projectId?: string;
    status?: PerformanceStatusType;
    device?: PerformanceDeviceType;
    limit?: number;
    offset?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('project_id', params.projectId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.device) searchParams.set('device', params.device);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return apiClient.get<PerformanceTestListResponse>(
      `/api/v1/performance/tests${query ? `?${query}` : ''}`,
      options
    );
  },

  // Get a single performance test by ID
  get: (testId: string, options?: FetchOptions) =>
    apiClient.get<PerformanceTestApi>(`/api/v1/performance/tests/${testId}`, options),

  // Get the latest completed performance test for a project
  getLatest: (projectId: string, options?: FetchOptions) =>
    apiClient.get<PerformanceTestApi | null>(
      `/api/v1/performance/tests/latest?project_id=${projectId}`,
      options
    ),

  // Get performance trends over time
  getTrends: (params: {
    projectId: string;
    days?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    searchParams.set('project_id', params.projectId);
    if (params.days) searchParams.set('days', String(params.days));
    return apiClient.get<PerformanceTrendsResponse>(
      `/api/v1/performance/trends?${searchParams.toString()}`,
      options
    );
  },

  // Get performance summary (latest, trends, averages in one call)
  getSummary: (params: {
    projectId: string;
    limit?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    searchParams.set('project_id', params.projectId);
    if (params.limit) searchParams.set('limit', String(params.limit));
    return apiClient.get<PerformanceSummaryResponse>(
      `/api/v1/performance/summary?${searchParams.toString()}`,
      options
    );
  },

  // Run a new performance test
  run: (data: RunPerformanceTestRequest, options?: FetchOptions) =>
    apiClient.post<PerformanceTestApi>('/api/v1/performance/tests', data, options),

  // Delete a performance test
  delete: (testId: string, options?: FetchOptions) =>
    apiClient.delete<{ success: boolean; message: string }>(
      `/api/v1/performance/tests/${testId}`,
      options
    ),
};

// ============================================================================
// Insights API Types
// ============================================================================

export type InsightTypeApi = 'prediction' | 'anomaly' | 'suggestion' | 'understanding';
export type InsightSeverityApi = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface AIInsightApi {
  id: string;
  projectId: string;
  insightType: InsightTypeApi;
  severity: InsightSeverityApi;
  title: string;
  description: string;
  confidence: number;
  affectedArea: string | null;
  suggestedAction: string | null;
  actionUrl: string | null;
  relatedTestIds: string[] | null;
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  expiresAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface InsightStatsApi {
  total: number;
  resolved: number;
  unresolved: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface FailureClusterApi {
  id: string;
  name: string;
  description: string;
  count: number;
  percentage: number;
  errorType: string;
  rootCauseAnalysis: string;
  affectedTests: string[];
  affectedTestCount: number;
  suggestedFix: string;
  severity: string;
  trend: 'up' | 'down' | 'stable';
  sampleErrors: Array<{ testName: string; errorMessage: string }>;
}

export interface FailureClusterResponseApi {
  clusters: FailureClusterApi[];
  totalFailures: number;
  analysisSummary: string;
  generatedAt: string;
}

export interface CoverageGapApi {
  id: string;
  area: string;
  areaType: 'page' | 'flow' | 'api' | 'component';
  currentCoverage: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskAnalysis: string;
  impactDescription: string;
  suggestedTests: Array<{ name: string; priority: string }>;
  suggestedTestCount: number;
  priorityScore: number;
  relatedFailures: string[];
}

export interface CoverageGapResponseApi {
  gaps: CoverageGapApi[];
  overallCoverage: number;
  criticalGaps: number;
  highGaps: number;
  totalSuggestedTests: number;
  analysisSummary: string;
  generatedAt: string;
}

export interface ResolutionSuggestionApi {
  summary: string;
  rootCause: string;
  steps: Array<{ step: number; action: string; details: string }>;
  codeChanges?: Array<{ file: string; change: string; reason: string }>;
  testImprovements: string[];
  preventionMeasures: string[];
  estimatedEffort: string;
  confidence: number;
}

export interface InsightResolutionResponseApi {
  insightId: string;
  resolution: ResolutionSuggestionApi;
  generatedAt: string;
}

export interface GenerateInsightsResponseApi {
  insights: AIInsightApi[];
  totalGenerated: number;
  analysisDurationMs: number;
  generatedAt: string;
}

export interface ClusterFailuresRequest {
  projectId: string;
  days?: number;
  minClusterSize?: number;
}

export interface CoverageGapsRequest {
  projectId: string;
  includeApiGaps?: boolean;
  includeUiGaps?: boolean;
  includeFlowGaps?: boolean;
}

export interface GenerateInsightsRequest {
  projectId: string;
  insightTypes?: string[];
  forceRefresh?: boolean;
}

export interface ResolveInsightRequest {
  context?: string;
}

export interface MarkResolvedResponse {
  success: boolean;
  insightId: string;
  isResolved: boolean;
}

/**
 * Transform snake_case backend response to camelCase frontend type
 */
function transformInsight(data: Record<string, unknown>): AIInsightApi {
  return {
    id: data.id as string,
    projectId: (data.project_id ?? data.projectId) as string,
    insightType: (data.insight_type ?? data.insightType) as InsightTypeApi,
    severity: data.severity as InsightSeverityApi,
    title: data.title as string,
    description: data.description as string,
    confidence: data.confidence as number,
    affectedArea: (data.affected_area ?? data.affectedArea) as string | null,
    suggestedAction: (data.suggested_action ?? data.suggestedAction) as string | null,
    actionUrl: (data.action_url ?? data.actionUrl) as string | null,
    relatedTestIds: (data.related_test_ids ?? data.relatedTestIds) as string[] | null,
    isResolved: (data.is_resolved ?? data.isResolved) as boolean,
    resolvedAt: (data.resolved_at ?? data.resolvedAt) as string | null,
    resolvedBy: (data.resolved_by ?? data.resolvedBy) as string | null,
    expiresAt: (data.expires_at ?? data.expiresAt) as string | null,
    metadata: (data.metadata ?? {}) as Record<string, unknown>,
    createdAt: (data.created_at ?? data.createdAt) as string,
  };
}

function transformFailureCluster(data: Record<string, unknown>): FailureClusterApi {
  return {
    id: data.id as string,
    name: data.name as string,
    description: data.description as string,
    count: data.count as number,
    percentage: data.percentage as number,
    errorType: (data.error_type ?? data.errorType) as string,
    rootCauseAnalysis: (data.root_cause_analysis ?? data.rootCauseAnalysis) as string,
    affectedTests: (data.affected_tests ?? data.affectedTests) as string[],
    affectedTestCount: (data.affected_test_count ?? data.affectedTestCount) as number,
    suggestedFix: (data.suggested_fix ?? data.suggestedFix) as string,
    severity: data.severity as string,
    trend: data.trend as 'up' | 'down' | 'stable',
    sampleErrors: ((data.sample_errors ?? data.sampleErrors) as Array<Record<string, unknown>> || []).map(e => ({
      testName: (e.test_name ?? e.testName) as string,
      errorMessage: (e.error_message ?? e.errorMessage) as string,
    })),
  };
}

function transformCoverageGap(data: Record<string, unknown>): CoverageGapApi {
  return {
    id: data.id as string,
    area: data.area as string,
    areaType: (data.area_type ?? data.areaType) as 'page' | 'flow' | 'api' | 'component',
    currentCoverage: (data.current_coverage ?? data.currentCoverage) as number,
    riskLevel: (data.risk_level ?? data.riskLevel) as 'critical' | 'high' | 'medium' | 'low',
    riskAnalysis: (data.risk_analysis ?? data.riskAnalysis) as string,
    impactDescription: (data.impact_description ?? data.impactDescription) as string,
    suggestedTests: ((data.suggested_tests ?? data.suggestedTests) as Array<Record<string, unknown>> || []).map(t => ({
      name: t.name as string,
      priority: t.priority as string,
    })),
    suggestedTestCount: (data.suggested_test_count ?? data.suggestedTestCount) as number,
    priorityScore: (data.priority_score ?? data.priorityScore) as number,
    relatedFailures: (data.related_failures ?? data.relatedFailures) as string[],
  };
}

function transformResolution(data: Record<string, unknown>): ResolutionSuggestionApi {
  return {
    summary: data.summary as string,
    rootCause: (data.root_cause ?? data.rootCause) as string,
    steps: data.steps as Array<{ step: number; action: string; details: string }>,
    codeChanges: (data.code_changes ?? data.codeChanges) as Array<{ file: string; change: string; reason: string }> | undefined,
    testImprovements: (data.test_improvements ?? data.testImprovements) as string[],
    preventionMeasures: (data.prevention_measures ?? data.preventionMeasures) as string[],
    estimatedEffort: (data.estimated_effort ?? data.estimatedEffort) as string,
    confidence: data.confidence as number,
  };
}

/**
 * Insights API endpoints
 */
export const insightsApi = {
  /**
   * List AI insights for a project
   */
  list: async (params: {
    projectId: string;
    insightType?: string;
    severity?: string;
    isResolved?: boolean;
    limit?: number;
  }, options?: FetchOptions): Promise<AIInsightApi[]> => {
    const searchParams = new URLSearchParams();
    searchParams.set('project_id', params.projectId);
    if (params.insightType) searchParams.set('insight_type', params.insightType);
    if (params.severity) searchParams.set('severity', params.severity);
    if (params.isResolved !== undefined) searchParams.set('is_resolved', String(params.isResolved));
    if (params.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    const data = await apiClient.get<Array<Record<string, unknown>>>(
      `/api/v1/insights?${query}`,
      options
    );
    return data.map(transformInsight);
  },

  /**
   * Get insight statistics for a project
   */
  getStats: async (projectId: string, options?: FetchOptions): Promise<InsightStatsApi> => {
    // Fetch all insights and compute stats client-side
    // (Backend doesn't have a dedicated stats endpoint)
    const insights = await insightsApi.list({ projectId, limit: 200 }, options);

    const resolved = insights.filter(i => i.isResolved);
    const unresolved = insights.filter(i => !i.isResolved);

    return {
      total: insights.length,
      resolved: resolved.length,
      unresolved: unresolved.length,
      bySeverity: {
        critical: unresolved.filter(i => i.severity === 'critical').length,
        high: unresolved.filter(i => i.severity === 'high').length,
        medium: unresolved.filter(i => i.severity === 'medium').length,
        low: unresolved.filter(i => i.severity === 'low').length,
      },
    };
  },

  /**
   * Mark an insight as resolved
   */
  markResolved: (insightId: string, options?: FetchOptions): Promise<MarkResolvedResponse> =>
    apiClient.patch<MarkResolvedResponse>(`/api/v1/insights/${insightId}/resolve`, undefined, options),

  /**
   * AI-powered semantic failure clustering
   */
  clusterFailures: async (params: ClusterFailuresRequest, options?: FetchOptions): Promise<FailureClusterResponseApi> => {
    const data = await apiClient.post<Record<string, unknown>>(
      '/api/v1/insights/cluster',
      params,
      options
    );
    return {
      clusters: ((data.clusters ?? []) as Array<Record<string, unknown>>).map(transformFailureCluster),
      totalFailures: (data.total_failures ?? data.totalFailures) as number,
      analysisSummary: (data.analysis_summary ?? data.analysisSummary) as string,
      generatedAt: (data.generated_at ?? data.generatedAt) as string,
    };
  },

  /**
   * AI-powered coverage gap detection
   */
  findCoverageGaps: async (params: CoverageGapsRequest, options?: FetchOptions): Promise<CoverageGapResponseApi> => {
    const data = await apiClient.post<Record<string, unknown>>(
      '/api/v1/insights/coverage-gaps',
      params,
      options
    );
    return {
      gaps: ((data.gaps ?? []) as Array<Record<string, unknown>>).map(transformCoverageGap),
      overallCoverage: (data.overall_coverage ?? data.overallCoverage) as number,
      criticalGaps: (data.critical_gaps ?? data.criticalGaps) as number,
      highGaps: (data.high_gaps ?? data.highGaps) as number,
      totalSuggestedTests: (data.total_suggested_tests ?? data.totalSuggestedTests) as number,
      analysisSummary: (data.analysis_summary ?? data.analysisSummary) as string,
      generatedAt: (data.generated_at ?? data.generatedAt) as string,
    };
  },

  /**
   * AI-powered resolution suggestion for an insight
   */
  getResolution: async (
    insightId: string,
    params?: ResolveInsightRequest,
    options?: FetchOptions
  ): Promise<InsightResolutionResponseApi> => {
    const data = await apiClient.post<Record<string, unknown>>(
      `/api/v1/insights/${insightId}/resolve`,
      params,
      options
    );
    return {
      insightId: (data.insight_id ?? data.insightId) as string,
      resolution: transformResolution((data.resolution ?? {}) as Record<string, unknown>),
      generatedAt: (data.generated_at ?? data.generatedAt) as string,
    };
  },

  /**
   * Generate new AI-powered insights for a project
   */
  generate: async (params: GenerateInsightsRequest, options?: FetchOptions): Promise<GenerateInsightsResponseApi> => {
    const data = await apiClient.post<Record<string, unknown>>(
      '/api/v1/insights/generate',
      params,
      options
    );
    return {
      insights: ((data.insights ?? []) as Array<Record<string, unknown>>).map(transformInsight),
      totalGenerated: (data.total_generated ?? data.totalGenerated) as number,
      analysisDurationMs: (data.analysis_duration_ms ?? data.analysisDurationMs) as number,
      generatedAt: (data.generated_at ?? data.generatedAt) as string,
    };
  },
};


// ============================================================================
// CI/CD API Types
// ============================================================================

export type CicdPipelineStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'skipped';
export type CicdPipelineProvider = 'github' | 'gitlab' | 'jenkins' | 'circleci' | 'bitbucket' | 'azure';
export type CicdDeploymentEnvironment = 'development' | 'staging' | 'production' | 'preview';
export type CicdDeploymentStatus = 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back';
export type CicdHealthCheckStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
export type CicdRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type CicdTestPriority = 'critical' | 'high' | 'medium' | 'low';

export interface CicdPipelineStage {
  id: string;
  name: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  durationSeconds: number | null;
  jobs: Array<{
    id: string;
    name: string;
    status: string;
    conclusion: string | null;
    steps?: Array<Record<string, unknown>>;
  }>;
}

export interface CicdPipeline {
  id: string;
  projectId: string;
  workflowId: string | null;
  workflowName: string | null;
  runNumber: number | null;
  branch: string | null;
  commitSha: string | null;
  commitMessage: string | null;
  status: string;
  conclusion: string | null;
  event: string | null;
  actor: string | null;
  htmlUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  stages: CicdPipelineStage[];
}

export interface CicdPipelineListResponse {
  pipelines: CicdPipeline[];
  total: number;
}

export interface CicdBuild {
  id: string;
  projectId: string;
  pipelineId: string | null;
  provider: string;
  buildNumber: number;
  name: string;
  branch: string;
  status: string;
  commitSha: string;
  commitMessage: string | null;
  commitAuthor: string | null;
  testsTotal: number;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
  coveragePercent: number | null;
  artifactUrls: string[];
  logsUrl: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CicdBuildListResponse {
  builds: CicdBuild[];
  total: number;
}

export interface CicdRiskFactor {
  category: string;
  severity: string;
  description: string;
  score: number;
}

export interface CicdDeployment {
  id: string;
  projectId: string;
  buildId: string | null;
  environment: string;
  status: string;
  version: string | null;
  commitSha: string | null;
  deployedBy: string | null;
  deploymentUrl: string | null;
  previewUrl: string | null;
  riskScore: number | null;
  riskFactors: CicdRiskFactor[];
  healthCheckStatus: string;
  rollbackAvailable: boolean;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CicdDeploymentListResponse {
  deployments: CicdDeployment[];
  total: number;
}

export interface CicdRollbackResponse {
  success: boolean;
  message: string;
  deployment: CicdDeployment;
}

export interface CicdRetriggerResponse {
  success: boolean;
  message: string;
  pipeline: CicdPipeline | null;
}

export interface CicdCancelResponse {
  success: boolean;
  message: string;
  pipeline: CicdPipeline | null;
}

export interface CicdStats {
  totalPipelines: number;
  pipelinesLast24h: number;
  successRate: number;
  avgPipelineDurationMs: number;
  totalBuilds: number;
  buildsLast24h: number;
  buildSuccessRate: number;
  avgBuildDurationMs: number;
  totalDeployments: number;
  deploymentsLast24h: number;
  deploymentSuccessRate: number;
  avgDeploymentDurationMs: number;
  currentRiskScore: number;
  testsImpactedByRecentChanges: number;
}

export interface CicdChangedFile {
  path: string;
  changeType: string;
  additions: number;
  deletions: number;
  impactScore: number;
}

export interface CicdImpactedTest {
  testId: string;
  testName: string;
  impactReason: string;
  confidence: number;
  priority: CicdTestPriority;
}

export interface CicdTestImpactAnalysis {
  id: string;
  projectId: string;
  commitSha: string;
  branch: string;
  baseSha: string | null;
  changedFiles: CicdChangedFile[];
  impactedTests: CicdImpactedTest[];
  totalFilesChanged: number;
  totalTestsImpacted: number;
  recommendedTests: string[];
  skipCandidates: string[];
  confidenceScore: number;
  analysisTimeMs: number;
  createdAt: string;
}

export interface CicdTestImpactAnalyzeRequest {
  projectId: string;
  commitSha: string;
  baseSha?: string | null;
  branch?: string;
  changedFiles?: Array<{
    path: string;
    changeType?: string;
    additions?: number;
    deletions?: number;
    impactScore?: number;
  }>;
}

export interface CicdDeploymentRiskResponse {
  projectId: string;
  commitSha: string | null;
  riskScore: number;
  riskLevel: CicdRiskLevel;
  factors: Record<string, unknown>;
  recommendations: string[];
  testsToRun: number;
  estimatedTestTimeMs: number;
  calculatedAt: string;
}

/**
 * CI/CD API endpoints
 */
export const cicdApi = {
  // Pipelines
  listPipelines: (params: {
    projectId: string;
    branch?: string;
    status?: string;
    limit?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    searchParams.set('project_id', params.projectId);
    if (params.branch) searchParams.set('branch', params.branch);
    if (params.status) searchParams.set('status', params.status);
    if (params.limit) searchParams.set('limit', String(params.limit));
    return apiClient.get<CicdPipelineListResponse>(
      `/api/v1/cicd/pipelines?${searchParams.toString()}`,
      options
    );
  },

  getPipeline: (pipelineId: string, projectId: string, options?: FetchOptions) =>
    apiClient.get<CicdPipeline>(
      `/api/v1/cicd/pipelines/${pipelineId}?project_id=${encodeURIComponent(projectId)}`,
      options
    ),

  retriggerPipeline: (pipelineId: string, projectId: string, options?: FetchOptions) =>
    apiClient.post<CicdRetriggerResponse>(
      `/api/v1/cicd/pipelines/${pipelineId}/retrigger?project_id=${encodeURIComponent(projectId)}`,
      undefined,
      options
    ),

  cancelPipeline: (pipelineId: string, projectId: string, options?: FetchOptions) =>
    apiClient.post<CicdCancelResponse>(
      `/api/v1/cicd/pipelines/${pipelineId}/cancel?project_id=${encodeURIComponent(projectId)}`,
      undefined,
      options
    ),

  // Builds
  listBuilds: (params: {
    projectId: string;
    branch?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    searchParams.set('project_id', params.projectId);
    if (params.branch) searchParams.set('branch', params.branch);
    if (params.status) searchParams.set('status', params.status);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));
    return apiClient.get<CicdBuildListResponse>(
      `/api/v1/cicd/builds?${searchParams.toString()}`,
      options
    );
  },

  getBuild: (buildId: string, options?: FetchOptions) =>
    apiClient.get<CicdBuild>(`/api/v1/cicd/builds/${buildId}`, options),

  // Deployments
  listDeployments: (params: {
    projectId: string;
    environment?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    searchParams.set('project_id', params.projectId);
    if (params.environment) searchParams.set('environment', params.environment);
    if (params.status) searchParams.set('status', params.status);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));
    return apiClient.get<CicdDeploymentListResponse>(
      `/api/v1/cicd/deployments?${searchParams.toString()}`,
      options
    );
  },

  getDeployment: (deploymentId: string, options?: FetchOptions) =>
    apiClient.get<CicdDeployment>(`/api/v1/cicd/deployments/${deploymentId}`, options),

  rollbackDeployment: (deploymentId: string, options?: FetchOptions) =>
    apiClient.post<CicdRollbackResponse>(
      `/api/v1/cicd/deployments/${deploymentId}/rollback`,
      undefined,
      options
    ),

  // Stats
  getStats: (projectId: string, options?: FetchOptions) =>
    apiClient.get<CicdStats>(
      `/api/v1/cicd/stats?project_id=${encodeURIComponent(projectId)}`,
      options
    ),

  // Test Impact Analysis
  getTestImpact: (params: {
    projectId: string;
    commitSha?: string;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    searchParams.set('project_id', params.projectId);
    if (params.commitSha) searchParams.set('commit_sha', params.commitSha);
    return apiClient.get<CicdTestImpactAnalysis | null>(
      `/api/v1/cicd/test-impact?${searchParams.toString()}`,
      options
    );
  },

  analyzeTestImpact: (data: CicdTestImpactAnalyzeRequest, options?: FetchOptions) =>
    apiClient.post<CicdTestImpactAnalysis>(
      '/api/v1/cicd/test-impact/analyze',
      data,
      options
    ),

  // Deployment Risk
  getDeploymentRisk: (params: {
    projectId: string;
    commitSha?: string;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    searchParams.set('project_id', params.projectId);
    if (params.commitSha) searchParams.set('commit_sha', params.commitSha);
    return apiClient.get<CicdDeploymentRiskResponse>(
      `/api/v1/cicd/deployment-risk?${searchParams.toString()}`,
      options
    );
  },
};

// ============================================================================
// Parameterized Tests API Types
// ============================================================================

export type ParameterizedDataSourceType = 'inline' | 'csv' | 'json' | 'api' | 'database' | 'spreadsheet';
export type ParameterizedIterationMode = 'sequential' | 'parallel' | 'random';
export type ParameterizedPriority = 'critical' | 'high' | 'medium' | 'low';
export type ParameterizedResultStatus = 'pending' | 'running' | 'passed' | 'failed' | 'cancelled' | 'error';
export type ParameterizedIterationStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'error';
export type ParameterSetExpectedOutcome = 'pass' | 'fail' | 'skip';
export type ParameterSetSource = 'manual' | 'imported' | 'generated';

export interface ParameterizedTestApi {
  id: string;
  projectId: string;
  baseTestId: string | null;
  name: string;
  description: string | null;
  tags: string[];
  priority: ParameterizedPriority;
  dataSourceType: ParameterizedDataSourceType;
  dataSourceConfig: Record<string, unknown>;
  parameterSchema: Record<string, unknown>;
  steps: Array<Record<string, unknown>>;
  assertions: Array<Record<string, unknown>>;
  setup: Array<Record<string, unknown>>;
  teardown: Array<Record<string, unknown>>;
  beforeEach: Array<Record<string, unknown>>;
  afterEach: Array<Record<string, unknown>>;
  iterationMode: ParameterizedIterationMode;
  maxParallel: number;
  timeoutPerIterationMs: number;
  stopOnFailure: boolean;
  retryFailedIterations: number;
  isActive: boolean;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParameterSetApi {
  id: string;
  parameterizedTestId: string;
  name: string;
  description: string | null;
  values: Record<string, unknown>;
  tags: string[];
  category: string | null;
  skip: boolean;
  skipReason: string | null;
  only: boolean;
  orderIndex: number;
  expectedOutcome: ParameterSetExpectedOutcome;
  expectedError: string | null;
  environmentOverrides: Record<string, unknown>;
  source: ParameterSetSource;
  sourceReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParameterizedResultApi {
  id: string;
  parameterizedTestId: string;
  testRunId: string | null;
  scheduleRunId: string | null;
  totalIterations: number;
  passed: number;
  failed: number;
  skipped: number;
  error: number;
  durationMs: number | null;
  avgIterationMs: number | null;
  minIterationMs: number | null;
  maxIterationMs: number | null;
  startedAt: string;
  completedAt: string | null;
  iterationMode: string | null;
  parallelWorkers: number | null;
  status: ParameterizedResultStatus;
  iterationResults: Array<Record<string, unknown>>;
  failureSummary: Record<string, unknown>;
  environment: string | null;
  browser: string | null;
  appUrl: string | null;
  triggeredBy: string | null;
  triggerType: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface IterationResultApi {
  id: string;
  parameterizedResultId: string;
  parameterSetId: string | null;
  iterationIndex: number;
  parameterValues: Record<string, unknown>;
  status: ParameterizedIterationStatus;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  stepResults: Array<Record<string, unknown>>;
  errorMessage: string | null;
  errorStack: string | null;
  errorScreenshotUrl: string | null;
  assertionsPassed: number;
  assertionsFailed: number;
  assertionDetails: Array<Record<string, unknown>>;
  retryCount: number;
  isRetry: boolean;
  originalIterationId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreateParameterizedTestRequest {
  projectId: string;
  name: string;
  description?: string | null;
  dataSourceType: ParameterizedDataSourceType;
  dataSourceConfig: Record<string, unknown>;
  parameterSchema?: Record<string, string> | null;
  steps: Array<Record<string, unknown>>;
  assertions?: Array<Record<string, unknown>> | null;
  setup?: Array<Record<string, unknown>> | null;
  teardown?: Array<Record<string, unknown>> | null;
  iterationMode?: ParameterizedIterationMode;
  maxParallel?: number;
  timeoutPerIterationMs?: number;
}

export interface UpdateParameterizedTestRequest {
  name?: string;
  description?: string | null;
  dataSourceType?: ParameterizedDataSourceType;
  dataSourceConfig?: Record<string, unknown>;
  parameterSchema?: Record<string, string> | null;
  steps?: Array<Record<string, unknown>>;
  assertions?: Array<Record<string, unknown>> | null;
  setup?: Array<Record<string, unknown>> | null;
  teardown?: Array<Record<string, unknown>> | null;
  iterationMode?: ParameterizedIterationMode;
  maxParallel?: number;
  timeoutPerIterationMs?: number;
}

export interface CreateParameterSetRequest {
  name: string;
  description?: string | null;
  values: Record<string, unknown>;
  tags?: string[];
  skip?: boolean;
  skipReason?: string | null;
}

export interface UpdateParameterSetRequest {
  name?: string;
  description?: string | null;
  values?: Record<string, unknown>;
  tags?: string[];
  skip?: boolean;
  skipReason?: string | null;
  orderIndex?: number;
}

export interface ExecuteParameterizedTestRequest {
  testId: string;
  parameterSets?: Array<Record<string, unknown>> | null;
  selectedSetIds?: string[] | null;
  appUrl: string;
  browser?: string;
  environment?: string;
  iterationMode?: ParameterizedIterationMode;
  maxParallel?: number;
  timeoutPerIterationMs?: number;
  stopOnFailure?: boolean;
  retryFailedIterations?: number;
  triggeredBy?: string | null;
  triggerType?: string;
}

export interface ExecuteParameterizedTestResponse {
  success: boolean;
  resultId: string;
  testId: string;
  testName: string;
  totalIterations: number;
  passed: number;
  failed: number;
  skipped: number;
  error: number;
  status: string;
  durationMs: number;
  avgIterationMs: number | null;
  minIterationMs: number | null;
  maxIterationMs: number | null;
  iterationResults: Array<Record<string, unknown>>;
  failureSummary: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * Parameterized Tests API endpoints
 */
export const parameterizedApi = {
  // List parameterized tests for a project
  list: (params?: {
    projectId?: string;
    limit?: number;
  }, options?: FetchOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('project_id', params.projectId);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return apiClient.get<ParameterizedTestApi[]>(
      `/api/v1/parameterized/tests${query ? `?${query}` : ''}`,
      options
    );
  },

  // Get a single parameterized test by ID
  get: (testId: string, options?: FetchOptions) =>
    apiClient.get<ParameterizedTestApi>(`/api/v1/parameterized/tests/${testId}`, options),

  // Create a new parameterized test
  create: (data: CreateParameterizedTestRequest, options?: FetchOptions) =>
    apiClient.post<ParameterizedTestApi>('/api/v1/parameterized/tests', data, options),

  // Update a parameterized test
  update: (testId: string, data: UpdateParameterizedTestRequest, options?: FetchOptions) =>
    apiClient.patch<ParameterizedTestApi>(`/api/v1/parameterized/tests/${testId}`, data, options),

  // Delete a parameterized test
  delete: (testId: string, options?: FetchOptions) =>
    apiClient.delete<void>(`/api/v1/parameterized/tests/${testId}`, options),

  // Parameter Sets
  listParameterSets: (testId: string, options?: FetchOptions) =>
    apiClient.get<ParameterSetApi[]>(`/api/v1/parameterized/tests/${testId}/parameter-sets`, options),

  createParameterSet: (testId: string, data: CreateParameterSetRequest, options?: FetchOptions) =>
    apiClient.post<ParameterSetApi>(`/api/v1/parameterized/tests/${testId}/parameter-sets`, data, options),

  updateParameterSet: (testId: string, setId: string, data: UpdateParameterSetRequest, options?: FetchOptions) =>
    apiClient.patch<ParameterSetApi>(`/api/v1/parameterized/tests/${testId}/parameter-sets/${setId}`, data, options),

  deleteParameterSet: (testId: string, setId: string, options?: FetchOptions) =>
    apiClient.delete<void>(`/api/v1/parameterized/tests/${testId}/parameter-sets/${setId}`, options),

  deleteAllParameterSets: (testId: string, options?: FetchOptions) =>
    apiClient.delete<void>(`/api/v1/parameterized/tests/${testId}/parameter-sets`, options),

  // Execution Results
  listResults: (testId: string, limit = 20, options?: FetchOptions) =>
    apiClient.get<ParameterizedResultApi[]>(
      `/api/v1/parameterized/tests/${testId}/results?limit=${limit}`,
      options
    ),

  getResult: (resultId: string, options?: FetchOptions) =>
    apiClient.get<ParameterizedResultApi>(`/api/v1/parameterized/results/${resultId}`, options),

  // Iteration Results
  listIterationResults: (resultId: string, options?: FetchOptions) =>
    apiClient.get<IterationResultApi[]>(`/api/v1/parameterized/results/${resultId}/iterations`, options),

  // Execute test
  execute: (data: ExecuteParameterizedTestRequest, options?: FetchOptions) =>
    apiClient.post<ExecuteParameterizedTestResponse>(
      '/api/v1/parameterized/execute',
      data,
      { ...options, timeout: 300000 } // 5 minute timeout for test execution
    ),

  // Utility endpoints
  expand: (data: {
    test: {
      name: string;
      dataSource?: {
        type: string;
        data?: Array<Record<string, unknown>>;
        path?: string;
        mapping?: Record<string, string>;
        filter?: string;
        limit?: number;
        delimiter?: string;
      };
      parameterSets?: Array<Record<string, unknown>>;
      iterationMode?: string;
      steps: Array<{ action: string; target?: string; value?: string; timeout?: number; description?: string }>;
      assertions?: Array<{ type: string; target?: string; expected?: string; description?: string }>;
      setup?: Array<{ action: string; target?: string; value?: string; timeout?: number }>;
      teardown?: Array<{ action: string; target?: string; value?: string; timeout?: number }>;
      timeout?: number;
    };
    dataSourceOverride?: Record<string, unknown>;
    limit?: number;
  }, options?: FetchOptions) =>
    apiClient.post<{
      success: boolean;
      testName: string;
      totalExpanded: number;
      expandedTests: Array<{
        index: number;
        name: string;
        description: string | null;
        parameterSetName: string;
        parameterValues: Record<string, unknown>;
        steps: Array<Record<string, unknown>>;
        assertions: Array<Record<string, unknown>>;
        setup: Array<Record<string, unknown>>;
        teardown: Array<Record<string, unknown>>;
      }>;
      iterationMode: string;
      warnings: string[];
      error: string | null;
    }>('/api/v1/parameterized/expand', data, options),

  validate: (data: {
    test: {
      name: string;
      dataSource?: Record<string, unknown>;
      parameterSets?: Array<Record<string, unknown>>;
      steps: Array<Record<string, unknown>>;
      assertions?: Array<Record<string, unknown>>;
    };
  }, options?: FetchOptions) =>
    apiClient.post<{
      valid: boolean;
      requiredParameters: string[];
      providedParameters: string[];
      missingParameters: string[];
      unusedParameters: string[];
      errors: Array<{ parameter: string; message: string }>;
      warnings: Array<{ parameter: string; message: string }>;
    }>('/api/v1/parameterized/validate', data, options),

  importData: (data: {
    content: string;
    format: 'csv' | 'json';
    mapping?: Record<string, string>;
    filter?: string;
    delimiter?: string;
  }, options?: FetchOptions) =>
    apiClient.post<{
      success: boolean;
      parameterSetsCount: number;
      parameterSets: Array<Record<string, unknown>>;
      detectedFields: string[];
      sampleValues: Record<string, unknown>;
      warnings: string[];
      error: string | null;
    }>('/api/v1/parameterized/import-data', data, options),

  listDataSources: (options?: FetchOptions) =>
    apiClient.get<{
      success: boolean;
      dataSources: Array<{
        type: string;
        description: string;
        requiredFields: string[];
        optionalFields: string[];
        example: Record<string, unknown>;
      }>;
      supportedFilters: string[];
    }>('/api/v1/parameterized/data-sources', options),

  listIterationModes: (options?: FetchOptions) =>
    apiClient.get<{
      success: boolean;
      iterationModes: Array<{
        mode: string;
        description: string;
        useCase: string;
      }>;
    }>('/api/v1/parameterized/iteration-modes', options),
};
