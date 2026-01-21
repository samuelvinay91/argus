'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/types';
import { WORKER_URL } from '@/lib/config/api-endpoints';
import { useFeatureFlags } from '@/lib/feature-flags';
import { parameterizedApi } from '@/lib/api-client';

// ============================================
// TYPES
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
// PARAMETERIZED TESTS
// ============================================

export function useParameterizedTests(projectId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['parameterized-tests', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await (supabase.from('parameterized_tests') as any)
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ParameterizedTest[];
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: [],
  });
}

export function useParameterizedTest(testId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['parameterized-test', testId],
    queryFn: async () => {
      if (!testId) return null;

      const { data, error } = await (supabase.from('parameterized_tests') as any)
        .select('*')
        .eq('id', testId)
        .single();

      if (error) throw error;
      return data as ParameterizedTest;
    },
    enabled: !!testId,
  });
}

export function useCreateParameterizedTest() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const flags = useFeatureFlags();

  return useMutation({
    mutationFn: async (test: InsertParameterizedTest) => {
      if (flags.useBackendApi('parameterized')) {
        // NEW: Use backend API
        return parameterizedApi.createTest({
          projectId: test.project_id,
          name: test.name,
          description: test.description || undefined,
          baseSteps: test.steps as unknown[],
          parameters: test.parameter_schema as Record<string, unknown>,
        }) as Promise<ParameterizedTest>;
      }

      // LEGACY: Direct Supabase
      const { data, error } = await (supabase.from('parameterized_tests') as any)
        .insert(test)
        .select()
        .single();

      if (error) throw error;
      return data as ParameterizedTest;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parameterized-tests', data.project_id] });
    },
  });
}

export function useUpdateParameterizedTest() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const flags = useFeatureFlags();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & UpdateParameterizedTest) => {
      if (flags.useBackendApi('parameterized')) {
        // NEW: Use backend API
        return parameterizedApi.updateTest(id, updates) as Promise<ParameterizedTest>;
      }

      // LEGACY: Direct Supabase
      const { data, error } = await (supabase.from('parameterized_tests') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ParameterizedTest;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parameterized-tests', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['parameterized-test', data.id] });
    },
  });
}

export function useDeleteParameterizedTest() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const flags = useFeatureFlags();

  return useMutation({
    mutationFn: async ({ testId, projectId }: { testId: string; projectId: string }) => {
      if (flags.useBackendApi('parameterized')) {
        // NEW: Use backend API (soft delete)
        await parameterizedApi.deleteTest(testId);
        return projectId;
      }

      // LEGACY: Direct Supabase
      // Soft delete by setting is_active to false
      const { error } = await (supabase.from('parameterized_tests') as any)
        .update({ is_active: false })
        .eq('id', testId);

      if (error) throw error;
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
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['parameter-sets', testId],
    queryFn: async () => {
      if (!testId) return [];

      const { data, error } = await (supabase.from('parameter_sets') as any)
        .select('*')
        .eq('parameterized_test_id', testId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as ParameterSet[];
    },
    enabled: !!testId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: [],
  });
}

export function useCreateParameterSet() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const flags = useFeatureFlags();

  return useMutation({
    mutationFn: async (paramSet: InsertParameterSet) => {
      if (flags.useBackendApi('parameterized')) {
        // NEW: Use backend API
        return parameterizedApi.createParamSet(
          paramSet.parameterized_test_id,
          paramSet
        ) as Promise<ParameterSet>;
      }

      // LEGACY: Direct Supabase
      const { data, error } = await (supabase.from('parameter_sets') as any)
        .insert(paramSet)
        .select()
        .single();

      if (error) throw error;
      return data as ParameterSet;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parameter-sets', data.parameterized_test_id] });
    },
  });
}

export function useUpdateParameterSet() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const flags = useFeatureFlags();

  return useMutation({
    mutationFn: async ({ id, testId, ...updates }: { id: string; testId: string } & UpdateParameterSet) => {
      if (flags.useBackendApi('parameterized')) {
        // NEW: Use backend API
        const result = await parameterizedApi.updateParamSet(id, updates) as ParameterSet;
        return { ...result, testId } as ParameterSet & { testId: string };
      }

      // LEGACY: Direct Supabase
      const { data, error } = await (supabase.from('parameter_sets') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, testId } as ParameterSet & { testId: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parameter-sets', data.testId] });
    },
  });
}

export function useDeleteParameterSet() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const flags = useFeatureFlags();

  return useMutation({
    mutationFn: async ({ id, testId }: { id: string; testId: string }) => {
      if (flags.useBackendApi('parameterized')) {
        // NEW: Use backend API
        await parameterizedApi.deleteParamSet(id);
        return testId;
      }

      // LEGACY: Direct Supabase
      const { error } = await (supabase.from('parameter_sets') as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return testId;
    },
    onSuccess: (testId) => {
      queryClient.invalidateQueries({ queryKey: ['parameter-sets', testId] });
    },
  });
}

export function useBulkCreateParameterSets() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ testId, paramSets }: { testId: string; paramSets: Omit<InsertParameterSet, 'parameterized_test_id'>[] }) => {
      const insertData = paramSets.map((ps, index) => ({
        ...ps,
        parameterized_test_id: testId,
        order_index: ps.order_index ?? index,
      }));

      const { data, error } = await (supabase.from('parameter_sets') as any)
        .insert(insertData)
        .select();

      if (error) throw error;
      return data as ParameterSet[];
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
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['parameterized-results', projectId, limit],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await (supabase.from('parameterized_results') as any)
        .select(`
          *,
          parameterized_tests!inner(project_id)
        `)
        .eq('parameterized_tests.project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ParameterizedResult[];
    },
    enabled: !!projectId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}

export function useParameterizedResultsForTest(testId: string | null, limit = 20) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['parameterized-results-for-test', testId, limit],
    queryFn: async () => {
      if (!testId) return [];

      const { data, error } = await (supabase.from('parameterized_results') as any)
        .select('*')
        .eq('parameterized_test_id', testId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ParameterizedResult[];
    },
    enabled: !!testId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}

export function useParameterizedResult(resultId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['parameterized-result', resultId],
    queryFn: async () => {
      if (!resultId) return null;

      const { data, error } = await (supabase.from('parameterized_results') as any)
        .select('*')
        .eq('id', resultId)
        .single();

      if (error) throw error;
      return data as ParameterizedResult;
    },
    enabled: !!resultId,
  });
}

// ============================================
// ITERATION RESULTS
// ============================================

export function useIterationResults(resultId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['iteration-results', resultId],
    queryFn: async () => {
      if (!resultId) return [];

      const { data, error } = await (supabase.from('iteration_results') as any)
        .select('*')
        .eq('parameterized_result_id', resultId)
        .order('iteration_index', { ascending: true });

      if (error) throw error;
      return data as IterationResult[];
    },
    enabled: !!resultId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}

// ============================================
// RUN PARAMETERIZED TEST
// ============================================

export function useRunParameterizedTest() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const flags = useFeatureFlags();

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
      if (flags.useBackendApi('parameterized')) {
        // NEW: Use backend API
        return parameterizedApi.run(testId, selectedSetIds) as Promise<ParameterizedResult>;
      }

      // LEGACY: Direct Supabase
      // 1. Create parameterized result record
      const { data: result, error: resultError } = await (supabase.from('parameterized_results') as any)
        .insert({
          parameterized_test_id: testId,
          total_iterations: 0,
          status: 'running',
          iteration_mode: 'sequential',
          environment,
          browser,
          app_url: appUrl,
          triggered_by: 'manual',
          trigger_type: 'manual',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (resultError) throw resultError;

      // 2. Get parameter sets
      let paramSetsQuery = (supabase.from('parameter_sets') as any)
        .select('*')
        .eq('parameterized_test_id', testId)
        .eq('skip', false)
        .order('order_index', { ascending: true });

      if (selectedSetIds && selectedSetIds.length > 0) {
        paramSetsQuery = paramSetsQuery.in('id', selectedSetIds);
      }

      const { data: paramSets, error: setsError } = await paramSetsQuery;
      if (setsError) throw setsError;

      // Update total iterations
      await (supabase.from('parameterized_results') as any)
        .update({ total_iterations: paramSets.length })
        .eq('id', result.id);

      // 3. Get test definition
      const { data: test, error: testError } = await (supabase.from('parameterized_tests') as any)
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;

      // 4. Execute each iteration
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      let errorCount = 0;

      for (let i = 0; i < paramSets.length; i++) {
        const paramSet = paramSets[i];

        // Create iteration result
        const { data: iterResult, error: iterError } = await (supabase.from('iteration_results') as any)
          .insert({
            parameterized_result_id: result.id,
            parameter_set_id: paramSet.id,
            iteration_index: i,
            parameter_values: paramSet.values,
            status: 'running',
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (iterError) {
          errorCount++;
          continue;
        }

        try {
          // Expand steps with parameter values
          const steps = Array.isArray(test.steps) ? test.steps : [];
          const expandedSteps = steps.map((step: any) => {
            let instruction = step.instruction || step.action || '';
            const values = paramSet.values as Record<string, any>;

            // Replace {{param}} placeholders
            Object.entries(values).forEach(([key, value]) => {
              instruction = instruction.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
            });

            return instruction;
          });

          // Execute via Worker
          const response = await fetch(`${WORKER_URL}/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: appUrl,
              steps: expandedSteps,
              browser,
              screenshot: true,
            }),
          });

          const workerResult = await response.json();
          const iterPassed = workerResult.success;

          // Update iteration result
          await (supabase.from('iteration_results') as any)
            .update({
              status: iterPassed ? 'passed' : 'failed',
              completed_at: new Date().toISOString(),
              duration_ms: workerResult.duration || 0,
              step_results: workerResult.steps || [],
              error_message: workerResult.error || null,
            })
            .eq('id', iterResult.id);

          if (iterPassed) passed++;
          else failed++;

        } catch (error) {
          // Update iteration as error
          await (supabase.from('iteration_results') as any)
            .update({
              status: 'error',
              completed_at: new Date().toISOString(),
              error_message: String(error),
            })
            .eq('id', iterResult.id);
          errorCount++;
        }
      }

      // 5. Update final result
      const finalStatus = errorCount > 0 ? 'error' : failed > 0 ? 'failed' : 'passed';
      const { data: finalResult, error: updateError } = await (supabase.from('parameterized_results') as any)
        .update({
          passed,
          failed,
          skipped,
          error: errorCount,
          status: finalStatus,
          completed_at: new Date().toISOString(),
        })
        .eq('id', result.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return finalResult as ParameterizedResult;
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
