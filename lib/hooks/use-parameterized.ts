'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/types';
import {
  parameterizedApi,
  type ParameterizedTestApi,
  type ParameterSetApi,
  type ParameterizedResultApi,
  type IterationResultApi,
  type CreateParameterizedTestRequest,
  type UpdateParameterizedTestRequest,
  type CreateParameterSetRequest,
  type UpdateParameterSetRequest,
} from '@/lib/api-client';

// ============================================
// LEGACY TYPES (snake_case for backward compatibility)
// ============================================

export interface ParameterizedTest {
  id: string;
  project_id: string;
  base_test_id: string | null;
  name: string;
  description: string | null;
  tags: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  data_source_type: 'inline' | 'csv' | 'json' | 'api' | 'database' | 'spreadsheet';
  data_source_config: Json;
  parameter_schema: Json;
  steps: Json;
  assertions: Json;
  setup: Json;
  teardown: Json;
  before_each: Json;
  after_each: Json;
  iteration_mode: 'sequential' | 'parallel' | 'random';
  max_parallel: number;
  timeout_per_iteration_ms: number;
  stop_on_failure: boolean;
  retry_failed_iterations: number;
  is_active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParameterSet {
  id: string;
  parameterized_test_id: string;
  name: string;
  description: string | null;
  values: Json;
  tags: string[];
  category: string | null;
  skip: boolean;
  skip_reason: string | null;
  only: boolean;
  order_index: number;
  expected_outcome: 'pass' | 'fail' | 'skip';
  expected_error: string | null;
  environment_overrides: Json;
  source: 'manual' | 'imported' | 'generated';
  source_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParameterizedResult {
  id: string;
  parameterized_test_id: string;
  test_run_id: string | null;
  schedule_run_id: string | null;
  total_iterations: number;
  passed: number;
  failed: number;
  skipped: number;
  error: number;
  duration_ms: number | null;
  avg_iteration_ms: number | null;
  min_iteration_ms: number | null;
  max_iteration_ms: number | null;
  started_at: string;
  completed_at: string | null;
  iteration_mode: string | null;
  parallel_workers: number | null;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled' | 'error';
  iteration_results: Json;
  failure_summary: Json;
  environment: string | null;
  browser: string | null;
  app_url: string | null;
  triggered_by: string | null;
  trigger_type: string | null;
  metadata: Json;
  created_at: string;
}

export interface IterationResult {
  id: string;
  parameterized_result_id: string;
  parameter_set_id: string | null;
  iteration_index: number;
  parameter_values: Json;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'error';
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  step_results: Json;
  error_message: string | null;
  error_stack: string | null;
  error_screenshot_url: string | null;
  assertions_passed: number;
  assertions_failed: number;
  assertion_details: Json;
  retry_count: number;
  is_retry: boolean;
  original_iteration_id: string | null;
  metadata: Json;
  created_at: string;
}

export type InsertParameterizedTest = Omit<ParameterizedTest, 'id' | 'created_at' | 'updated_at' | 'last_run_at' | 'last_run_status'>;
export type UpdateParameterizedTest = Partial<InsertParameterizedTest>;

export type InsertParameterSet = Omit<ParameterSet, 'id' | 'created_at' | 'updated_at'>;
export type UpdateParameterSet = Partial<InsertParameterSet>;

// ============================================
// TRANSFORM FUNCTIONS
// ============================================

function transformTestApiToLegacy(test: ParameterizedTestApi): ParameterizedTest {
  return {
    id: test.id,
    project_id: test.projectId,
    base_test_id: test.baseTestId,
    name: test.name,
    description: test.description,
    tags: test.tags,
    priority: test.priority,
    data_source_type: test.dataSourceType,
    data_source_config: test.dataSourceConfig as Json,
    parameter_schema: test.parameterSchema as Json,
    steps: test.steps as Json,
    assertions: test.assertions as Json,
    setup: test.setup as Json,
    teardown: test.teardown as Json,
    before_each: test.beforeEach as Json,
    after_each: test.afterEach as Json,
    iteration_mode: test.iterationMode,
    max_parallel: test.maxParallel,
    timeout_per_iteration_ms: test.timeoutPerIterationMs,
    stop_on_failure: test.stopOnFailure,
    retry_failed_iterations: test.retryFailedIterations,
    is_active: test.isActive,
    last_run_at: test.lastRunAt,
    last_run_status: test.lastRunStatus,
    created_by: test.createdBy,
    created_at: test.createdAt,
    updated_at: test.updatedAt,
  };
}

function transformParameterSetApiToLegacy(set: ParameterSetApi): ParameterSet {
  return {
    id: set.id,
    parameterized_test_id: set.parameterizedTestId,
    name: set.name,
    description: set.description,
    values: set.values as Json,
    tags: set.tags,
    category: set.category,
    skip: set.skip,
    skip_reason: set.skipReason,
    only: set.only,
    order_index: set.orderIndex,
    expected_outcome: set.expectedOutcome,
    expected_error: set.expectedError,
    environment_overrides: set.environmentOverrides as Json,
    source: set.source,
    source_reference: set.sourceReference,
    created_at: set.createdAt,
    updated_at: set.updatedAt,
  };
}

function transformResultApiToLegacy(result: ParameterizedResultApi): ParameterizedResult {
  return {
    id: result.id,
    parameterized_test_id: result.parameterizedTestId,
    test_run_id: result.testRunId,
    schedule_run_id: result.scheduleRunId,
    total_iterations: result.totalIterations,
    passed: result.passed,
    failed: result.failed,
    skipped: result.skipped,
    error: result.error,
    duration_ms: result.durationMs,
    avg_iteration_ms: result.avgIterationMs,
    min_iteration_ms: result.minIterationMs,
    max_iteration_ms: result.maxIterationMs,
    started_at: result.startedAt,
    completed_at: result.completedAt,
    iteration_mode: result.iterationMode,
    parallel_workers: result.parallelWorkers,
    status: result.status,
    iteration_results: result.iterationResults as Json,
    failure_summary: result.failureSummary as Json,
    environment: result.environment,
    browser: result.browser,
    app_url: result.appUrl,
    triggered_by: result.triggeredBy,
    trigger_type: result.triggerType,
    metadata: result.metadata as Json,
    created_at: result.createdAt,
  };
}

function transformIterationResultApiToLegacy(iteration: IterationResultApi): IterationResult {
  return {
    id: iteration.id,
    parameterized_result_id: iteration.parameterizedResultId,
    parameter_set_id: iteration.parameterSetId,
    iteration_index: iteration.iterationIndex,
    parameter_values: iteration.parameterValues as Json,
    status: iteration.status,
    started_at: iteration.startedAt,
    completed_at: iteration.completedAt,
    duration_ms: iteration.durationMs,
    step_results: iteration.stepResults as Json,
    error_message: iteration.errorMessage,
    error_stack: iteration.errorStack,
    error_screenshot_url: iteration.errorScreenshotUrl,
    assertions_passed: iteration.assertionsPassed,
    assertions_failed: iteration.assertionsFailed,
    assertion_details: iteration.assertionDetails as Json,
    retry_count: iteration.retryCount,
    is_retry: iteration.isRetry,
    original_iteration_id: iteration.originalIterationId,
    metadata: iteration.metadata as Json,
    created_at: iteration.createdAt,
  };
}

function transformLegacyToCreateRequest(test: InsertParameterizedTest): CreateParameterizedTestRequest {
  return {
    projectId: test.project_id,
    name: test.name,
    description: test.description,
    dataSourceType: test.data_source_type,
    dataSourceConfig: test.data_source_config as Record<string, unknown>,
    parameterSchema: test.parameter_schema as Record<string, string> | null,
    steps: test.steps as Array<Record<string, unknown>>,
    assertions: test.assertions as Array<Record<string, unknown>> | null,
    setup: test.setup as Array<Record<string, unknown>> | null,
    teardown: test.teardown as Array<Record<string, unknown>> | null,
    iterationMode: test.iteration_mode,
    maxParallel: test.max_parallel,
    timeoutPerIterationMs: test.timeout_per_iteration_ms,
  };
}

function transformLegacyToUpdateRequest(test: UpdateParameterizedTest): UpdateParameterizedTestRequest {
  const request: UpdateParameterizedTestRequest = {};
  if (test.name !== undefined) request.name = test.name;
  if (test.description !== undefined) request.description = test.description;
  if (test.data_source_type !== undefined) request.dataSourceType = test.data_source_type;
  if (test.data_source_config !== undefined) request.dataSourceConfig = test.data_source_config as Record<string, unknown>;
  if (test.parameter_schema !== undefined) request.parameterSchema = test.parameter_schema as Record<string, string> | null;
  if (test.steps !== undefined) request.steps = test.steps as Array<Record<string, unknown>>;
  if (test.assertions !== undefined) request.assertions = test.assertions as Array<Record<string, unknown>> | null;
  if (test.setup !== undefined) request.setup = test.setup as Array<Record<string, unknown>> | null;
  if (test.teardown !== undefined) request.teardown = test.teardown as Array<Record<string, unknown>> | null;
  if (test.iteration_mode !== undefined) request.iterationMode = test.iteration_mode;
  if (test.max_parallel !== undefined) request.maxParallel = test.max_parallel;
  if (test.timeout_per_iteration_ms !== undefined) request.timeoutPerIterationMs = test.timeout_per_iteration_ms;
  return request;
}

function transformLegacyParamSetToCreateRequest(set: InsertParameterSet): CreateParameterSetRequest {
  return {
    name: set.name,
    description: set.description,
    values: set.values as Record<string, unknown>,
    tags: set.tags,
    skip: set.skip,
    skipReason: set.skip_reason,
  };
}

function transformLegacyParamSetToUpdateRequest(set: UpdateParameterSet): UpdateParameterSetRequest {
  const request: UpdateParameterSetRequest = {};
  if (set.name !== undefined) request.name = set.name;
  if (set.description !== undefined) request.description = set.description;
  if (set.values !== undefined) request.values = set.values as Record<string, unknown>;
  if (set.tags !== undefined) request.tags = set.tags;
  if (set.skip !== undefined) request.skip = set.skip;
  if (set.skip_reason !== undefined) request.skipReason = set.skip_reason;
  if (set.order_index !== undefined) request.orderIndex = set.order_index;
  return request;
}

// ============================================
// PARAMETERIZED TESTS
// ============================================

export function useParameterizedTests(projectId: string | null) {
  return useQuery({
    queryKey: ['parameterized-tests', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const tests = await parameterizedApi.list({ projectId });
      // Filter for active tests and transform to legacy format
      return tests
        .filter((t) => t.isActive)
        .map(transformTestApiToLegacy);
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: [],
  });
}

export function useParameterizedTest(testId: string | null) {
  return useQuery({
    queryKey: ['parameterized-test', testId],
    queryFn: async () => {
      if (!testId) return null;

      const test = await parameterizedApi.get(testId);
      return transformTestApiToLegacy(test);
    },
    enabled: !!testId,
  });
}

export function useCreateParameterizedTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (test: InsertParameterizedTest) => {
      const request = transformLegacyToCreateRequest(test);
      const result = await parameterizedApi.create(request);
      return transformTestApiToLegacy(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parameterized-tests', data.project_id] });
    },
  });
}

export function useUpdateParameterizedTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & UpdateParameterizedTest) => {
      const request = transformLegacyToUpdateRequest(updates);
      const result = await parameterizedApi.update(id, request);
      return transformTestApiToLegacy(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parameterized-tests', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['parameterized-test', data.id] });
    },
  });
}

export function useDeleteParameterizedTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ testId, projectId }: { testId: string; projectId: string }) => {
      // Soft delete by updating is_active to false
      await parameterizedApi.update(testId, { });
      // Note: The backend delete endpoint does hard delete, so we use update with is_active: false
      // But since the API doesn't support is_active in UpdateParameterizedTestRequest, we need to
      // call the actual delete endpoint. The frontend will handle cache invalidation.
      await parameterizedApi.delete(testId);
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ['parameterized-tests', projectId] });
    },
  });
}

// ============================================
// PARAMETER SETS
// ============================================

export function useParameterSets(testId: string | null) {
  return useQuery({
    queryKey: ['parameter-sets', testId],
    queryFn: async () => {
      if (!testId) return [];

      const sets = await parameterizedApi.listParameterSets(testId);
      return sets.map(transformParameterSetApiToLegacy);
    },
    enabled: !!testId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: [],
  });
}

export function useCreateParameterSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paramSet: InsertParameterSet) => {
      const request = transformLegacyParamSetToCreateRequest(paramSet);
      const result = await parameterizedApi.createParameterSet(
        paramSet.parameterized_test_id,
        request
      );
      return transformParameterSetApiToLegacy(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parameter-sets', data.parameterized_test_id] });
    },
  });
}

export function useUpdateParameterSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, testId, ...updates }: { id: string; testId: string } & UpdateParameterSet) => {
      const request = transformLegacyParamSetToUpdateRequest(updates);
      const result = await parameterizedApi.updateParameterSet(testId, id, request);
      return { ...transformParameterSetApiToLegacy(result), testId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parameter-sets', data.testId] });
    },
  });
}

export function useDeleteParameterSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, testId }: { id: string; testId: string }) => {
      await parameterizedApi.deleteParameterSet(testId, id);
      return testId;
    },
    onSuccess: (testId) => {
      queryClient.invalidateQueries({ queryKey: ['parameter-sets', testId] });
    },
  });
}

export function useBulkCreateParameterSets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ testId, paramSets }: { testId: string; paramSets: Omit<InsertParameterSet, 'parameterized_test_id'>[] }) => {
      // Create parameter sets one by one (backend doesn't have bulk endpoint yet)
      const results: ParameterSet[] = [];
      for (let i = 0; i < paramSets.length; i++) {
        const ps = paramSets[i];
        const request: CreateParameterSetRequest = {
          name: ps.name,
          description: ps.description,
          values: ps.values as Record<string, unknown>,
          tags: ps.tags,
          skip: ps.skip,
          skipReason: ps.skip_reason,
        };
        const result = await parameterizedApi.createParameterSet(testId, request);
        results.push(transformParameterSetApiToLegacy(result));
      }
      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['parameter-sets', variables.testId] });
    },
  });
}

// ============================================
// PARAMETERIZED RESULTS
// ============================================

export function useParameterizedResults(projectId: string | null, limit = 50) {
  return useQuery({
    queryKey: ['parameterized-results', projectId, limit],
    queryFn: async () => {
      if (!projectId) return [];

      // Get all parameterized tests for this project first
      const tests = await parameterizedApi.list({ projectId });

      // Then get results for each test
      const allResults: ParameterizedResult[] = [];
      for (const test of tests) {
        try {
          const results = await parameterizedApi.listResults(test.id, limit);
          allResults.push(...results.map(transformResultApiToLegacy));
        } catch {
          // Skip if results endpoint fails for a test
          continue;
        }
      }

      // Sort by created_at descending and limit
      return allResults
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}

export function useParameterizedResultsForTest(testId: string | null, limit = 20) {
  return useQuery({
    queryKey: ['parameterized-results-for-test', testId, limit],
    queryFn: async () => {
      if (!testId) return [];

      const results = await parameterizedApi.listResults(testId, limit);
      return results.map(transformResultApiToLegacy);
    },
    enabled: !!testId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}

export function useParameterizedResult(resultId: string | null) {
  return useQuery({
    queryKey: ['parameterized-result', resultId],
    queryFn: async () => {
      if (!resultId) return null;

      const result = await parameterizedApi.getResult(resultId);
      return transformResultApiToLegacy(result);
    },
    enabled: !!resultId,
  });
}

// ============================================
// ITERATION RESULTS
// ============================================

export function useIterationResults(resultId: string | null) {
  return useQuery({
    queryKey: ['iteration-results', resultId],
    queryFn: async () => {
      if (!resultId) return [];

      const iterations = await parameterizedApi.listIterationResults(resultId);
      return iterations.map(transformIterationResultApiToLegacy);
    },
    enabled: !!resultId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}

// ============================================
// RUN PARAMETERIZED TEST
// ============================================

export function useRunParameterizedTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      testId,
      projectId,
      appUrl,
      environment = 'staging',
      browser = 'chromium',
      selectedSetIds,
    }: {
      testId: string;
      projectId: string;
      appUrl: string;
      environment?: string;
      browser?: string;
      selectedSetIds?: string[];
    }) => {
      const response = await parameterizedApi.execute({
        testId,
        appUrl,
        browser,
        environment,
        selectedSetIds: selectedSetIds ?? null,
        triggerType: 'manual',
      });

      // Transform the response to legacy format
      return {
        id: response.resultId,
        parameterized_test_id: response.testId,
        test_run_id: null,
        schedule_run_id: null,
        total_iterations: response.totalIterations,
        passed: response.passed,
        failed: response.failed,
        skipped: response.skipped,
        error: response.error,
        duration_ms: response.durationMs,
        avg_iteration_ms: response.avgIterationMs,
        min_iteration_ms: response.minIterationMs,
        max_iteration_ms: response.maxIterationMs,
        started_at: response.startedAt ?? new Date().toISOString(),
        completed_at: response.completedAt,
        iteration_mode: 'sequential',
        parallel_workers: null,
        status: response.status as ParameterizedResult['status'],
        iteration_results: response.iterationResults as Json,
        failure_summary: response.failureSummary as Json,
        environment,
        browser,
        app_url: appUrl,
        triggered_by: 'manual',
        trigger_type: 'manual',
        metadata: {} as Json,
        created_at: new Date().toISOString(),
      } as ParameterizedResult;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['parameterized-results', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['parameterized-results-for-test', variables.testId] });
      queryClient.invalidateQueries({ queryKey: ['parameterized-tests', variables.projectId] });
    },
  });
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

export function useParameterizedResultSubscription(testId: string | null) {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!testId) return;

    const channel = supabase
      .channel(`parameterized-results-${testId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parameterized_results',
          filter: `parameterized_test_id=eq.${testId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['parameterized-results-for-test', testId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [testId, queryClient, supabase]);
}

export function useIterationResultSubscription(resultId: string | null) {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!resultId) return;

    const channel = supabase
      .channel(`iteration-results-${resultId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'iteration_results',
          filter: `parameterized_result_id=eq.${resultId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['iteration-results', resultId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resultId, queryClient, supabase]);
}
