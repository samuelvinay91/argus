'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  globalTestsApi,
  GlobalTestApi,
  GlobalTestResultApi,
} from '@/lib/api-client';
import type { GlobalTest, GlobalTestResult } from '@/lib/supabase/types';

// ============================================================================
// Transform Functions (API -> Legacy format for backward compatibility)
// ============================================================================

/**
 * Transform API GlobalTestResult (camelCase) to legacy Supabase format (snake_case)
 */
function transformResultToLegacy(result: GlobalTestResultApi): GlobalTestResult {
  return {
    id: result.id,
    global_test_id: result.globalTestId,
    region_code: result.regionCode,
    city: result.city,
    status: result.status,
    latency_ms: result.latencyMs,
    ttfb_ms: result.ttfbMs,
    page_load_ms: result.pageLoadMs,
    error_message: result.errorMessage,
    created_at: result.createdAt,
  };
}

/**
 * Transform API GlobalTest (camelCase) to legacy Supabase format (snake_case)
 */
function transformTestToLegacy(test: GlobalTestApi): GlobalTest {
  return {
    id: test.id,
    project_id: test.projectId,
    url: test.url,
    status: test.status,
    avg_latency_ms: test.avgLatencyMs,
    avg_ttfb_ms: test.avgTtfbMs,
    success_rate: test.successRate,
    slow_regions: test.slowRegions,
    failed_regions: test.failedRegions,
    started_at: test.startedAt,
    completed_at: test.completedAt,
    triggered_by: test.triggeredBy,
    created_at: test.createdAt,
  };
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch global tests for a project
 */
export function useGlobalTests(projectId: string | null, limit = 10) {
  return useQuery({
    queryKey: ['global-tests', projectId, limit],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await globalTestsApi.list({ projectId, limit });
      // Transform to legacy format for backward compatibility
      return response.tests.map(transformTestToLegacy);
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch the latest completed global test with its results
 */
export function useLatestGlobalTest(projectId: string | null) {
  return useQuery({
    queryKey: ['latest-global-test', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      // Fetch all tests and find the latest completed one
      const response = await globalTestsApi.list({ projectId, limit: 10 });

      // Find the latest completed test
      const completedTests = response.tests.filter(t => t.status === 'completed');
      if (completedTests.length === 0) return null;

      // Tests are already sorted by created_at desc, so first one is latest
      const latestTest = completedTests[0];

      // Fetch the full test with results
      const testWithResults = await globalTestsApi.get(latestTest.id);

      return {
        test: transformTestToLegacy(testWithResults),
        results: testWithResults.results?.map(transformResultToLegacy) ?? [],
      };
    },
    enabled: !!projectId,
  });
}

/**
 * Start a new global test
 */
export function useStartGlobalTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      url,
      // triggeredBy is not needed - backend uses the authenticated user
    }: {
      projectId: string;
      url: string;
      triggeredBy?: string | null;
    }) => {
      // Start the test via API
      const startedTest = await globalTestsApi.start({ projectId, url });

      // The backend runs the test asynchronously, so we need to poll for completion
      // We'll poll for up to 60 seconds
      const maxWaitMs = 60000;
      const pollIntervalMs = 1000;
      let elapsed = 0;

      while (elapsed < maxWaitMs) {
        // Wait before polling
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        elapsed += pollIntervalMs;

        // Fetch current status
        const currentTest = await globalTestsApi.get(startedTest.id);

        if (currentTest.status === 'completed' || currentTest.status === 'failed') {
          return {
            test: transformTestToLegacy(currentTest),
            results: currentTest.results?.map(transformResultToLegacy) ?? [],
          };
        }
      }

      // Timeout - return whatever we have
      const finalTest = await globalTestsApi.get(startedTest.id);
      return {
        test: transformTestToLegacy(finalTest),
        results: finalTest.results?.map(transformResultToLegacy) ?? [],
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['global-tests', data.test.project_id] });
      queryClient.invalidateQueries({ queryKey: ['latest-global-test', data.test.project_id] });
    },
  });
}
