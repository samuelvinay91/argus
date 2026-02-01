'use client';

import { useQuery } from '@tanstack/react-query';
import { testRunsApi, type TestRunListItem } from '@/lib/api-client';
import { isValidDate } from '@/lib/utils';

// ============================================================================
// Types for hook return values (backward compatible with legacy Supabase types)
// ============================================================================

interface DailyStat {
  day: string;
  date: string;
  passed: number;
  failed: number;
}

interface ReportsStats {
  totalRuns: number;
  avgPassRate: number;
  avgDuration: number;
  dailyStats: DailyStat[];
  recentRuns: TestRunListItem[];
  failedRuns: TestRunListItem[];
}

// ============================================================================
// Transform functions
// ============================================================================

/**
 * Calculate daily stats from test runs
 * Groups runs by day and aggregates passed/failed counts
 */
function calculateDailyStats(runs: TestRunListItem[], days: number): DailyStat[] {
  const dailyStats: DailyStat[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));

    const dayRuns = runs.filter((r) => {
      if (!isValidDate(r.createdAt)) return false;
      const runDate = new Date(r.createdAt);
      return runDate >= dayStart && runDate <= dayEnd;
    });

    dailyStats.push({
      day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
      date: dayStart.toISOString().split('T')[0],
      passed: dayRuns.reduce((sum, r) => sum + (r.passedTests || 0), 0),
      failed: dayRuns.reduce((sum, r) => sum + (r.failedTests || 0), 0),
    });
  }

  return dailyStats;
}

/**
 * Calculate aggregate stats from test runs
 */
function calculateStats(runs: TestRunListItem[], days: number): ReportsStats {
  const totalRuns = runs.length;
  const totalPassed = runs.reduce((sum, r) => sum + (r.passedTests || 0), 0);
  const totalFailed = runs.reduce((sum, r) => sum + (r.failedTests || 0), 0);
  const totalTests = totalPassed + totalFailed;
  const avgPassRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
  const avgDuration = runs.length > 0
    ? runs.reduce((sum, r) => sum + (r.durationMs || 0), 0) / runs.length / 1000
    : 0;

  const dailyStats = calculateDailyStats(runs, days);

  // Get failed runs (status is 'failed')
  const failedRuns = runs
    .filter((r) => r.status === 'failed')
    .slice(0, 5);

  return {
    totalRuns,
    avgPassRate,
    avgDuration,
    dailyStats,
    recentRuns: runs.slice(0, 10),
    failedRuns,
  };
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch and calculate reports statistics for a project
 * Fetches test runs from the last N days and calculates aggregate stats
 *
 * @param projectId - The project ID to fetch stats for
 * @param days - Number of days to look back (default: 7)
 * @returns Query result with calculated stats
 */
export function useReportsStats(projectId: string | null, days = 7) {
  return useQuery({
    queryKey: ['reports-stats', projectId, days],
    queryFn: async (): Promise<ReportsStats | null> => {
      if (!projectId) return null;

      // Fetch test runs for the project
      // Note: We fetch more than needed to ensure we have enough for the date range
      // The API returns runs sorted by created_at desc
      const response = await testRunsApi.list({
        projectId,
        limit: 100, // Fetch enough to cover the date range
      });

      const allRuns = response.runs || [];

      // Filter to only runs within the date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const runsInRange = allRuns.filter((run) => {
        if (!isValidDate(run.createdAt)) return false;
        const runDate = new Date(run.createdAt);
        return runDate >= startDate;
      });

      return calculateStats(runsInRange, days);
    },
    enabled: !!projectId,
  });
}

/**
 * Hook to fetch recent test runs for a project
 *
 * @param projectId - The project ID to fetch runs for
 * @param limit - Maximum number of runs to return (default: 20)
 * @returns Query result with recent runs
 */
export function useRecentRuns(projectId: string | null, limit = 20) {
  return useQuery({
    queryKey: ['recent-runs', projectId, limit],
    queryFn: async (): Promise<TestRunListItem[]> => {
      if (!projectId) return [];

      const response = await testRunsApi.list({
        projectId,
        limit,
      });

      return response.runs || [];
    },
    enabled: !!projectId,
  });
}
