'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  flakyTestsApi,
  FlakyTestApi,
  FlakyTestTrendItem,
  FlakyTestStatsResponse,
} from '@/lib/api-client';

// ============================================================================
// Legacy Types (for backward compatibility)
// ============================================================================

/**
 * Legacy FlakyTest type - matches existing component expectations.
 * Uses camelCase throughout for frontend consistency.
 */
export interface FlakyTest {
  id: string;
  name: string;
  path: string;
  flakinessScore: number;
  totalRuns: number;
  passCount: number;
  failCount: number;
  lastRun: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  isQuarantined: boolean;
  rootCauses: {
    type: 'timing' | 'network' | 'data' | 'external' | 'selector' | 'state';
    description: string;
    confidence: number;
  }[];
  recentResults: boolean[];
  avgDuration: number;
  suggestedFix: string | null;
  projectId: string;
  projectName: string;
}

export interface FlakyTestTrend {
  date: string;
  flaky: number;
  fixed: number;
}

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform API response to legacy FlakyTest format.
 * The API response already uses camelCase, so minimal transformation needed.
 */
function transformFlakyTest(apiTest: FlakyTestApi): FlakyTest {
  return {
    id: apiTest.id,
    name: apiTest.name,
    path: apiTest.path || `tests/${apiTest.id}.spec.ts`,
    flakinessScore: apiTest.flakinessScore,
    totalRuns: apiTest.totalRuns,
    passCount: apiTest.passCount,
    failCount: apiTest.failCount,
    lastRun: apiTest.lastRun || new Date().toISOString(),
    trend: apiTest.trend,
    isQuarantined: apiTest.isQuarantined,
    rootCauses: apiTest.rootCauses,
    recentResults: apiTest.recentResults,
    avgDuration: apiTest.avgDuration,
    suggestedFix: apiTest.suggestedFix,
    projectId: apiTest.projectId,
    projectName: apiTest.projectName,
  };
}

/**
 * Transform API trend response to legacy format.
 */
function transformTrendItem(item: FlakyTestTrendItem): FlakyTestTrend {
  return {
    date: item.date,
    flaky: item.flaky,
    fixed: item.fixed,
  };
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch flaky tests from the backend API.
 * Replaces direct Supabase queries with authenticated API calls.
 */
export function useFlakyTests(projectId?: string) {
  return useQuery({
    queryKey: ['flaky-tests', projectId],
    queryFn: async () => {
      const response = await flakyTestsApi.list({
        projectId,
        minScore: 0.0, // Get all flaky tests
        days: 30,
        limit: 500,
      });

      // Transform API response to legacy format
      return response.tests.map(transformFlakyTest);
    },
  });
}

/**
 * Fetch flakiness trend data from the backend API.
 */
export function useFlakinesssTrend(projectId?: string) {
  return useQuery({
    queryKey: ['flakiness-trend', projectId],
    queryFn: async (): Promise<FlakyTestTrend[]> => {
      const response = await flakyTestsApi.getTrend({
        projectId,
        weeks: 8,
      });

      return response.trend.map(transformTrendItem);
    },
  });
}

/**
 * Toggle quarantine status for a flaky test.
 */
export function useToggleQuarantine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ testId, quarantine }: { testId: string; quarantine: boolean }) => {
      const response = await flakyTestsApi.toggleQuarantine(testId, quarantine);
      return response;
    },
    onSuccess: () => {
      // Invalidate flaky tests queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['flaky-tests'] });
    },
  });
}

/**
 * Calculate flaky test stats from the backend API or derive from loaded data.
 * This hook provides aggregated statistics for dashboard widgets.
 */
export function useFlakyTestStats(projectId?: string) {
  const { data: flakyTests = [] } = useFlakyTests(projectId);

  // Calculate stats from loaded flaky tests data
  const stats = {
    total: flakyTests.length,
    high: flakyTests.filter(t => t.flakinessScore >= 0.4).length,
    medium: flakyTests.filter(t => t.flakinessScore >= 0.2 && t.flakinessScore < 0.4).length,
    low: flakyTests.filter(t => t.flakinessScore < 0.2).length,
    quarantined: flakyTests.filter(t => t.isQuarantined).length,
    avgScore: flakyTests.length > 0
      ? flakyTests.reduce((sum, t) => sum + t.flakinessScore, 0) / flakyTests.length
      : 0,
  };

  return stats;
}

/**
 * Fetch flaky test stats directly from the backend API.
 * Use this when you need stats without loading all test data.
 */
export function useFlakyTestStatsApi(projectId?: string) {
  return useQuery({
    queryKey: ['flaky-tests-stats', projectId],
    queryFn: async (): Promise<FlakyTestStatsResponse> => {
      return await flakyTestsApi.getStats({ projectId });
    },
  });
}
