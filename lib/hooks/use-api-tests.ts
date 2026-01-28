'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BACKEND_URL } from '@/lib/config/api-endpoints';

// ============================================
// Types
// ============================================

export type AuthType = 'none' | 'bearer' | 'basic' | 'api_key' | 'oauth2';
export type TestType = 'functional' | 'negative' | 'boundary' | 'security' | 'performance' | 'integration';
export type TestStatus = 'passed' | 'failed' | 'error' | 'skipped' | 'timeout';
export type PriorityType = 'critical' | 'high' | 'medium' | 'low';

export interface APITestCase {
  id: string;
  project_id: string;
  endpoint_id: string | null;
  name: string;
  description: string | null;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  query_params: Record<string, string>;
  path_params: Record<string, string>;
  body: Record<string, unknown> | null;
  auth_type: AuthType;
  expected_status: number;
  expected_body_schema: Record<string, unknown> | null;
  max_latency_ms: number;
  test_type: TestType;
  tags: string[];
  priority: PriorityType;
  source: string;
  is_active: boolean;
  last_run_status: TestStatus | null;
  created_at: string;
  updated_at: string | null;
}

export interface APITestResult {
  id: string;
  test_case_id: string;
  test_run_id: string | null;
  status: TestStatus;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  request_url: string;
  request_method: string;
  request_headers: Record<string, string>;
  request_body: Record<string, unknown> | null;
  response_status: number | null;
  response_headers: Record<string, string>;
  response_body: unknown;
  response_time_ms: number | null;
  status_code_valid: boolean | null;
  schema_valid: boolean | null;
  schema_errors: string[];
  error_message: string | null;
  environment: string;
  created_at: string;
}

export interface TestResultSummary {
  test_id: string;
  test_name: string;
  status: TestStatus;
  duration_ms: number;
  response_status: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  schema_valid: boolean | null;
}

export interface RunTestsResponse {
  success: boolean;
  run_id: string;
  total_tests: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  total_duration_ms: number;
  results: TestResultSummary[];
}

export interface CreateTestCaseParams {
  project_id: string;
  endpoint_id?: string;
  name: string;
  description?: string;
  endpoint: string;
  method: string;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  path_params?: Record<string, string>;
  body?: Record<string, unknown>;
  auth_type?: AuthType;
  expected_status?: number;
  expected_body_schema?: Record<string, unknown>;
  max_latency_ms?: number;
  test_type?: TestType;
  tags?: string[];
  priority?: PriorityType;
}

export interface RunTestsParams {
  project_id: string;
  test_ids?: string[];
  base_url: string;
  auth_token?: string;
  auth_type?: AuthType;
  auth_config?: Record<string, string>;
  environment?: string;
  parallel?: boolean;
  stop_on_failure?: boolean;
  timeout_ms?: number;
}

// ============================================
// API Client Functions
// ============================================

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to list API test cases for a project
 */
export function useAPITests(
  projectId: string | null,
  options?: {
    testType?: TestType;
    status?: TestStatus;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }
) {
  return useQuery({
    queryKey: ['api-tests', projectId, options],
    queryFn: async () => {
      if (!projectId) return [];

      const params = new URLSearchParams();
      if (options?.testType) params.append('test_type', options.testType);
      if (options?.status) params.append('status', options.status);
      if (options?.isActive !== undefined) params.append('is_active', String(options.isActive));
      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.offset) params.append('offset', String(options.offset));

      const queryString = params.toString();
      const url = `${BACKEND_URL}/api/v1/api-tests/${projectId}/test-cases${queryString ? `?${queryString}` : ''}`;

      return fetchWithAuth(url) as Promise<APITestCase[]>;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: [],
  });
}

/**
 * Hook to get a single API test case
 */
export function useAPITest(projectId: string | null, testId: string | null) {
  return useQuery({
    queryKey: ['api-test', projectId, testId],
    queryFn: async () => {
      if (!projectId || !testId) return null;

      const tests = await fetchWithAuth(
        `${BACKEND_URL}/api/v1/api-tests/${projectId}/test-cases`
      ) as APITestCase[];

      return tests.find(t => t.id === testId) || null;
    },
    enabled: !!projectId && !!testId,
  });
}

/**
 * Hook to get API test results for a project
 */
export function useAPITestResults(
  projectId: string | null,
  options?: {
    testCaseId?: string;
    status?: TestStatus;
    limit?: number;
    offset?: number;
  }
) {
  return useQuery({
    queryKey: ['api-test-results', projectId, options],
    queryFn: async () => {
      if (!projectId) return [];

      const params = new URLSearchParams();
      if (options?.testCaseId) params.append('test_case_id', options.testCaseId);
      if (options?.status) params.append('status', options.status);
      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.offset) params.append('offset', String(options.offset));

      const queryString = params.toString();
      const url = `${BACKEND_URL}/api/v1/api-tests/${projectId}/results${queryString ? `?${queryString}` : ''}`;

      return fetchWithAuth(url) as Promise<APITestResult[]>;
    },
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: [],
  });
}

/**
 * Hook to run API tests
 */
export function useRunAPITest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RunTestsParams) => {
      return fetchWithAuth(`${BACKEND_URL}/api/v1/api-tests/run`, {
        method: 'POST',
        body: JSON.stringify(params),
      }) as Promise<RunTestsResponse>;
    },
    onSuccess: (_, variables) => {
      // Invalidate test results and test cases (for last_run_status updates)
      queryClient.invalidateQueries({ queryKey: ['api-test-results', variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['api-tests', variables.project_id] });
    },
  });
}

/**
 * Hook to run a single API test
 */
export function useRunSingleAPITest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { projectId: string; testId: string; baseUrl: string; authToken?: string }) => {
      return fetchWithAuth(`${BACKEND_URL}/api/v1/api-tests/run`, {
        method: 'POST',
        body: JSON.stringify({
          project_id: params.projectId,
          test_ids: [params.testId],
          base_url: params.baseUrl,
          auth_token: params.authToken,
          auth_type: params.authToken ? 'bearer' : 'none',
        }),
      }) as Promise<RunTestsResponse>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['api-test-results', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['api-tests', variables.projectId] });
    },
  });
}

/**
 * Hook to create a new API test case
 */
export function useCreateAPITest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateTestCaseParams) => {
      return fetchWithAuth(`${BACKEND_URL}/api/v1/api-tests/test-cases`, {
        method: 'POST',
        body: JSON.stringify(params),
      }) as Promise<APITestCase>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['api-tests', variables.project_id] });
    },
  });
}

/**
 * Hook to update an API test case
 */
export function useUpdateAPITest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ testId, ...updates }: { testId: string } & Partial<APITestCase>) => {
      return fetchWithAuth(`${BACKEND_URL}/api/v1/api-tests/test-cases/${testId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }) as Promise<APITestCase>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-tests', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['api-test', data.project_id, data.id] });
    },
  });
}

/**
 * Hook to delete an API test case
 */
export function useDeleteAPITest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ testId, projectId }: { testId: string; projectId: string }) => {
      await fetchWithAuth(`${BACKEND_URL}/api/v1/api-tests/test-cases/${testId}`, {
        method: 'DELETE',
      });
      return { testId, projectId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['api-tests', variables.projectId] });
    },
  });
}
