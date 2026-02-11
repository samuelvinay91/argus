'use client';

/**
 * Tests and Test Runs Hooks - Migrated to Backend API
 *
 * This module uses the FastAPI backend for all CRUD operations,
 * while keeping Supabase Realtime for live subscriptions only.
 *
 * Migration: RAP-312 Phase 1 - Tests & Runs Domain
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/types';
import {
  testsApi,
  testRunsApi,
  BACKEND_URL,
  type Test,
  type TestListItem,
  type TestRun,
  type TestRunListItem,
  type TestResult,
  type TestRunWithResults,
  type CreateTestRequest,
  type UpdateTestRequest,
  type CreateTestRunRequest,
  type TestRunComparisonResponse,
} from '@/lib/api-client';

// Re-export types for backward compatibility
export type {
  Test,
  TestListItem,
  TestRun,
  TestRunListItem,
  TestResult,
  TestRunWithResults,
};

// ============================================
// TESTS
// ============================================

export function useTests(projectId: string | null) {
  return useQuery({
    queryKey: ['tests', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await testsApi.list({
        projectId,
        isActive: true,
        limit: 500,
      });

      // Transform to legacy Supabase format for backward compatibility
      return response.tests.map((test) => ({
        id: test.id,
        project_id: test.projectId,
        name: test.name,
        description: test.description,
        steps: [] as Array<{ action: string; target?: string; value?: string; description?: string }>,
        tags: test.tags,
        priority: test.priority,
        is_active: test.isActive,
        source: test.source,
        created_by: null as string | null,
        created_at: test.createdAt,
        updated_at: test.createdAt, // Use created_at as fallback
      }));
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    placeholderData: [],
  });
}

export function useCreateTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (test: CreateTestRequest) => {
      const response = await testsApi.create(test);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tests', data.projectId] });
    },
  });
}

export function useUpdateTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId, ...updates }: { id: string; projectId: string } & UpdateTestRequest) => {
      const response = await testsApi.update(id, updates);
      return { ...response, projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tests', data.projectId] });
    },
  });
}

export function useDeleteTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ testId, projectId }: { testId: string; projectId: string }) => {
      // Soft delete by setting is_active to false via API
      await testsApi.update(testId, { isActive: false });
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ['tests', projectId] });
    },
  });
}

// ============================================
// TEST RUNS
// ============================================

export function useTestRuns(projectId: string | null, limit = 50) {
  return useQuery({
    queryKey: ['test-runs', projectId, limit],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await testRunsApi.list({
        projectId,
        limit,
      });

      // Transform to legacy Supabase format for backward compatibility
      return response.runs.map((run) => ({
        id: run.id,
        project_id: run.projectId,
        name: run.name,
        trigger: (run.trigger || 'manual') as 'manual' | 'scheduled' | 'webhook' | 'ci',
        status: run.status as 'pending' | 'running' | 'passed' | 'failed' | 'cancelled',
        app_url: '',
        environment: '', // Components expect string, not null
        browser: '' as string,
        total_tests: run.totalTests,
        passed_tests: run.passedTests,
        failed_tests: run.failedTests,
        skipped_tests: 0,
        duration_ms: run.durationMs,
        started_at: run.createdAt, // Use createdAt as fallback
        completed_at: run.completedAt,
        triggered_by: '' as string,
        ci_metadata: null as Json,
        created_at: run.createdAt,
      }));
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    placeholderData: [],
  });
}

export function useTestRun(runId: string | null) {
  return useQuery({
    queryKey: ['test-run', runId],
    queryFn: async () => {
      if (!runId) return null;

      const response = await testRunsApi.get(runId, false);

      // Transform to legacy Supabase format for backward compatibility
      return {
        id: response.id,
        project_id: response.projectId,
        name: response.name,
        trigger: (response.trigger || 'manual') as 'manual' | 'scheduled' | 'webhook' | 'ci',
        status: response.status as 'pending' | 'running' | 'passed' | 'failed' | 'cancelled',
        app_url: response.appUrl || '',
        environment: '', // Components expect string, not null
        browser: response.browser || '',
        total_tests: response.totalTests,
        passed_tests: response.passedTests,
        failed_tests: response.failedTests,
        skipped_tests: response.skippedTests,
        duration_ms: response.durationMs,
        started_at: response.startedAt || response.createdAt,
        completed_at: response.completedAt,
        triggered_by: response.createdBy || '',
        ci_metadata: null as Json,
        created_at: response.createdAt,
      };
    },
    enabled: !!runId,
  });
}

export function useTestResults(runId: string | null) {
  return useQuery({
    queryKey: ['test-results', runId],
    queryFn: async () => {
      if (!runId) return [];

      const results = await testRunsApi.getResults(runId);

      // Transform to legacy Supabase format for backward compatibility
      return results.map((r) => ({
        id: r.id,
        test_run_id: r.testRunId,
        test_id: r.testId,
        name: r.name,
        status: (r.status || 'pending') as 'pending' | 'running' | 'passed' | 'failed' | 'skipped',
        duration_ms: r.durationMs,
        error_message: r.errorMessage,
        error_screenshot: r.errorScreenshot,
        error_stack: null as string | null,
        step_results: (r.stepResults || null) as Json,
        steps_total: r.stepsTotal ?? 0,
        steps_completed: r.stepsCompleted ?? 0, // Components expect number, not null
        retry_count: 0,
        started_at: r.createdAt, // Use createdAt as fallback
        completed_at: r.completedAt,
        created_at: r.createdAt,
      }));
    },
    enabled: !!runId,
  });
}

// Real-time subscription for test runs (keep Supabase for subscriptions)
export function useTestRunSubscription(projectId: string | null) {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`test-runs-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_runs',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['test-runs', projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient, supabase]);
}

// ============================================
// RUN TEST
// ============================================

export interface LegacyTest {
  id: string;
  name: string;
  steps: Array<string | { instruction?: string; action?: string }>;
}

export interface LegacyTestRun {
  id: string;
  project_id: string;
  status: string;
  passed_tests: number;
  failed_tests: number;
  total_tests?: number;
  duration_ms?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
}

interface LegacyTestResult {
  id: string;
  test_run_id: string;
  test_id: string | null;
  name: string;
  status: string;
  duration_ms: number | null;
  steps_total: number | null;
  steps_completed: number | null;
  error_message: string | null;
  step_results: Array<Record<string, unknown>> | null;
  completed_at: string | null;
}

export function useRunTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      appUrl,
      tests,
      browser = 'chromium',
    }: {
      projectId: string;
      appUrl: string;
      tests: LegacyTest[];
      browser?: string;
    }) => {
      // 1. Create test run via API
      const testRun = await testRunsApi.create({
        projectId,
        appUrl,
        browser,
        trigger: 'manual',
        totalTests: tests.length,
      });

      // Update to running status
      await testRunsApi.update(testRun.id, {
        status: 'running',
      });

      // 2. Execute tests via Worker (keep direct worker call for execution)
      const results: LegacyTestResult[] = [];
      let passedCount = 0;
      let failedCount = 0;

      for (const test of tests) {
        const steps = Array.isArray(test.steps)
          ? test.steps.map((s) => {
              if (typeof s === 'string') return s;
              return s.instruction || s.action || '';
            }).filter(Boolean)
          : [];

        try {
          const response = await fetch(`${BACKEND_URL}/api/v1/browser/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: appUrl,
              steps,
              browser,
              screenshot: true,
            }),
          });

          const workerResult = await response.json();
          const passed = workerResult.success;

          // 3. Save result via API
          const result = await testRunsApi.addResult(testRun.id, {
            testId: test.id,
            name: test.name,
            status: passed ? 'passed' : 'failed',
            durationMs: workerResult.duration || 0,
            stepsTotal: steps.length,
            stepsCompleted: passed ? steps.length : 0,
            errorMessage: workerResult.error || null,
            stepResults: workerResult.steps || [],
          });

          results.push({
            id: result.id,
            test_run_id: result.testRunId,
            test_id: result.testId,
            name: result.name,
            status: result.status,
            duration_ms: result.durationMs,
            steps_total: result.stepsTotal,
            steps_completed: result.stepsCompleted,
            error_message: result.errorMessage,
            step_results: result.stepResults,
            completed_at: result.completedAt,
          });

          if (passed) passedCount++;
          else failedCount++;
        } catch (error) {
          // Record failed test
          const result = await testRunsApi.addResult(testRun.id, {
            testId: test.id,
            name: test.name,
            status: 'failed',
            stepsTotal: steps.length,
            errorMessage: String(error),
          });

          results.push({
            id: result.id,
            test_run_id: result.testRunId,
            test_id: result.testId,
            name: result.name,
            status: result.status,
            duration_ms: result.durationMs,
            steps_total: result.stepsTotal,
            steps_completed: result.stepsCompleted,
            error_message: result.errorMessage,
            step_results: result.stepResults,
            completed_at: result.completedAt,
          });
          failedCount++;
        }
      }

      // 4. Update test run with final status via API
      const startedAt = testRun.startedAt ? new Date(testRun.startedAt).getTime() : Date.now();
      const finalRun = await testRunsApi.update(testRun.id, {
        status: failedCount === 0 ? 'passed' : 'failed',
        passedTests: passedCount,
        failedTests: failedCount,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
      });

      return {
        testRun: {
          id: finalRun.id,
          project_id: finalRun.projectId,
          status: finalRun.status,
          passed_tests: finalRun.passedTests,
          failed_tests: finalRun.failedTests,
          total_tests: finalRun.totalTests,
          duration_ms: finalRun.durationMs,
          started_at: finalRun.startedAt,
          completed_at: finalRun.completedAt,
        } as LegacyTestRun,
        results,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-runs'] });
      queryClient.invalidateQueries({ queryKey: ['test-run', data.testRun.id] });
    },
  });
}

// ============================================
// TEST RUN HISTORY
// ============================================

export function useTestRunHistory(projectId: string | null, currentRunId: string | null, limit = 10) {
  return useQuery({
    queryKey: ['test-run-history', projectId, currentRunId, limit],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await testRunsApi.list({
        projectId,
        limit: limit + 1, // Fetch one extra in case current run is in results
      });

      // Filter out current run and limit to requested count
      const runs = response.runs
        .filter((run) => run.id !== currentRunId)
        .slice(0, limit);

      // Transform to legacy Supabase format for backward compatibility
      return runs.map((run) => ({
        id: run.id,
        project_id: run.projectId,
        name: run.name,
        trigger: (run.trigger || 'manual') as 'manual' | 'scheduled' | 'webhook' | 'ci',
        status: run.status as 'pending' | 'running' | 'passed' | 'failed' | 'cancelled',
        app_url: '',
        environment: '', // Components expect string, not null
        browser: '' as string,
        total_tests: run.totalTests,
        passed_tests: run.passedTests,
        failed_tests: run.failedTests,
        skipped_tests: 0,
        duration_ms: run.durationMs,
        started_at: run.createdAt, // Use createdAt as fallback
        completed_at: run.completedAt,
        triggered_by: '' as string,
        ci_metadata: null as Json,
        created_at: run.createdAt,
      }));
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    placeholderData: [],
  });
}

export function useRunSingleTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      appUrl,
      test,
      browser = 'chromium',
    }: {
      projectId: string;
      appUrl: string;
      test: LegacyTest;
      browser?: string;
    }) => {
      const steps = Array.isArray(test.steps)
        ? test.steps.map((s) => {
            if (typeof s === 'string') return s;
            return s.instruction || s.action || '';
          }).filter(Boolean)
        : [];

      // Create test run via API
      const testRun = await testRunsApi.create({
        projectId,
        name: test.name,
        appUrl,
        browser,
        trigger: 'manual',
        totalTests: 1,
      });

      // Update to running
      await testRunsApi.update(testRun.id, { status: 'running' });

      // Execute via Worker
      const response = await fetch(`${BACKEND_URL}/api/v1/browser/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: appUrl,
          steps,
          browser,
          screenshot: true,
        }),
      });

      const workerResult = await response.json();
      const passed = workerResult.success;

      // Save result via API
      await testRunsApi.addResult(testRun.id, {
        testId: test.id,
        name: test.name,
        status: passed ? 'passed' : 'failed',
        durationMs: workerResult.duration || 0,
        stepsTotal: steps.length,
        stepsCompleted: passed ? steps.length : 0,
        errorMessage: workerResult.error || null,
      });

      // Update run status via API
      const startedAt = testRun.startedAt ? new Date(testRun.startedAt).getTime() : Date.now();
      const finalRun = await testRunsApi.update(testRun.id, {
        status: passed ? 'passed' : 'failed',
        passedTests: passed ? 1 : 0,
        failedTests: passed ? 0 : 1,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
      });

      return {
        id: finalRun.id,
        project_id: finalRun.projectId,
        status: finalRun.status,
        passed_tests: finalRun.passedTests,
        failed_tests: finalRun.failedTests,
      } as LegacyTestRun;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-runs'] });
    },
  });
}

// ============================================
// TEST RUN COMPARISON
// ============================================

export interface TestRunComparisonData {
  currentRun: LegacyTestRun | null;
  previousRun: LegacyTestRun | null;
  deltas: {
    passedDelta: number | null;
    failedDelta: number | null;
    durationDelta: number | null;
    passRateDelta: number | null;
  };
  hasPreviousRun: boolean;
}

export function useTestRunComparison(projectId: string | null): {
  data: TestRunComparisonData | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  return useQuery({
    queryKey: ['test-run-comparison', projectId],
    queryFn: async (): Promise<TestRunComparisonData> => {
      if (!projectId) {
        return {
          currentRun: null,
          previousRun: null,
          deltas: {
            passedDelta: null,
            failedDelta: null,
            durationDelta: null,
            passRateDelta: null,
          },
          hasPreviousRun: false,
        };
      }

      const response = await testRunsApi.getComparison(projectId);

      const toLegacyRun = (run: TestRunListItem | null): LegacyTestRun | null => {
        if (!run) return null;
        return {
          id: run.id,
          project_id: run.projectId,
          status: run.status,
          passed_tests: run.passedTests,
          failed_tests: run.failedTests,
          total_tests: run.totalTests,
          duration_ms: run.durationMs,
          started_at: null,
          completed_at: run.completedAt,
        };
      };

      return {
        currentRun: toLegacyRun(response.currentRun),
        previousRun: toLegacyRun(response.previousRun),
        deltas: {
          passedDelta: response.deltas.passedDelta,
          failedDelta: response.deltas.failedDelta,
          durationDelta: response.deltas.durationDelta,
          passRateDelta: response.deltas.passRateDelta,
        },
        hasPreviousRun: response.hasPreviousRun,
      };
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================
// RERUN TEST
// ============================================

export function useRerunTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      testRunId,
      projectId,
      appUrl,
      browser = 'chromium',
    }: {
      testRunId: string;
      projectId: string;
      appUrl: string;
      browser?: string;
    }) => {
      // 1. Fetch original test results via API
      const originalResults = await testRunsApi.getResults(testRunId);

      // 2. Create new test run via API
      const newTestRun = await testRunsApi.create({
        projectId,
        appUrl,
        browser,
        trigger: 'manual',
        totalTests: originalResults.length,
      });

      await testRunsApi.update(newTestRun.id, { status: 'running' });

      // 3. Rerun each test
      let passedCount = 0;
      let failedCount = 0;

      for (const originalResult of originalResults) {
        // Get test details if test_id exists
        let steps: string[] = [];
        if (originalResult.testId) {
          try {
            const testData = await testsApi.get(originalResult.testId);
            if (testData?.steps) {
              steps = testData.steps.map((s) => {
                if (typeof s === 'string') return s;
                return s.description || s.action || '';
              }).filter(Boolean);
            }
          } catch {
            // Test may have been deleted
          }
        }

        // If no steps from test, try to extract from original step_results
        if (steps.length === 0 && originalResult.stepResults) {
          steps = originalResult.stepResults.map((sr) =>
            (sr.instruction as string) || (sr.step as string) || ''
          ).filter(Boolean);
        }

        try {
          const response = await fetch(`${BACKEND_URL}/api/v1/browser/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: appUrl,
              steps,
              browser,
              screenshot: true,
            }),
          });

          const workerResult = await response.json();
          const passed = workerResult.success;

          // Save result via API
          await testRunsApi.addResult(newTestRun.id, {
            testId: originalResult.testId,
            name: originalResult.name,
            status: passed ? 'passed' : 'failed',
            durationMs: workerResult.duration || 0,
            stepsTotal: steps.length,
            stepsCompleted: passed ? steps.length : 0,
            errorMessage: workerResult.error || null,
            stepResults: workerResult.steps || [],
          });

          if (passed) passedCount++;
          else failedCount++;
        } catch (error) {
          // Record failed test
          await testRunsApi.addResult(newTestRun.id, {
            testId: originalResult.testId,
            name: originalResult.name,
            status: 'failed',
            stepsTotal: steps.length,
            errorMessage: String(error),
          });
          failedCount++;
        }
      }

      // 4. Update test run with final status via API
      const startedAt = newTestRun.startedAt ? new Date(newTestRun.startedAt).getTime() : Date.now();
      const finalRun = await testRunsApi.update(newTestRun.id, {
        status: failedCount === 0 ? 'passed' : 'failed',
        passedTests: passedCount,
        failedTests: failedCount,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
      });

      return {
        id: finalRun.id,
        project_id: finalRun.projectId,
        status: finalRun.status,
        passed_tests: finalRun.passedTests,
        failed_tests: finalRun.failedTests,
      } as LegacyTestRun;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-runs'] });
      queryClient.invalidateQueries({ queryKey: ['test-runs', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['test-run', data.id] });
    },
  });
}
