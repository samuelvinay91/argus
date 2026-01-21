'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useFeatureFlags } from '@/lib/feature-flags';
import { insightsApi } from '@/lib/api-client';
import type { AIInsight } from '@/lib/supabase/types';

export function useAIInsights(projectId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['ai-insights', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('ai_insights') as any)
        .select('*')
        .eq('project_id', projectId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AIInsight[];
    },
    enabled: !!projectId,
  });
}

export function useResolveInsight() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const flags = useFeatureFlags();

  return useMutation({
    mutationFn: async ({
      insightId,
      projectId,
      resolvedBy,
    }: {
      insightId: string;
      projectId: string;
      resolvedBy?: string | null;
    }) => {
      if (flags.useBackendApi('insights')) {
        // NEW: Use backend API
        const insight = await insightsApi.resolve(insightId) as AIInsight;
        return { insight, projectId };
      }

      // LEGACY: Direct Supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('ai_insights') as any)
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy || null,
        })
        .eq('id', insightId)
        .select()
        .single();

      if (error) throw error;
      return { insight: data as AIInsight, projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights', projectId] });
    },
  });
}

export function useInsightStats(projectId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['insight-stats', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('ai_insights') as any)
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;

      const insights = data as AIInsight[];
      const resolved = insights.filter((i) => i.is_resolved);
      const unresolved = insights.filter((i) => !i.is_resolved);

      return {
        total: insights.length,
        resolved: resolved.length,
        unresolved: unresolved.length,
        bySeverity: {
          critical: unresolved.filter((i) => i.severity === 'critical').length,
          high: unresolved.filter((i) => i.severity === 'high').length,
          medium: unresolved.filter((i) => i.severity === 'medium').length,
          low: unresolved.filter((i) => i.severity === 'low').length,
        },
      };
    },
    enabled: !!projectId,
  });
}

// Types for failure patterns analysis
export interface FailureCluster {
  id: string;
  name: string;
  count: number;
  percentage: number;
  errorType: string;
  affectedTests: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

export interface CoverageGap {
  id: string;
  area: string;
  type: 'page' | 'flow' | 'api';
  coverage: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedTests: number;
  impact: string;
  isTested: boolean;
}

export interface FlakyTest {
  id: string;
  name: string;
  flakinessScore: number;
  passRate: number;
  failureCount: number;
  totalRuns: number;
  rootCause: string;
  suggestedFix: string;
  lastFlake: string;
}

// Hook to get failure clusters from test_results
export function useFailureClusters(projectId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['failure-clusters', projectId],
    queryFn: async () => {
      if (!projectId) return { clusters: [], totalFailures: 0 };

      // Get failed test results from the project
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: testRuns, error: runsError } = await (supabase.from('test_runs') as any)
        .select('id')
        .eq('project_id', projectId);

      if (runsError) throw runsError;
      if (!testRuns || testRuns.length === 0) return { clusters: [], totalFailures: 0 };

      const runIds = testRuns.map((r: { id: string }) => r.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: results, error } = await (supabase.from('test_results') as any)
        .select('*')
        .in('test_run_id', runIds)
        .eq('status', 'failed');

      if (error) throw error;
      if (!results || results.length === 0) return { clusters: [], totalFailures: 0 };

      // Categorize failures by error type
      const errorCategories: Record<string, { count: number; testIds: Set<string> }> = {
        timeout: { count: 0, testIds: new Set() },
        element: { count: 0, testIds: new Set() },
        network: { count: 0, testIds: new Set() },
        assertion: { count: 0, testIds: new Set() },
        auth: { count: 0, testIds: new Set() },
        other: { count: 0, testIds: new Set() },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results.forEach((result: any) => {
        const errorMessage = (result.error_message || '').toLowerCase();
        let category = 'other';

        if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
          category = 'timeout';
        } else if (errorMessage.includes('element') || errorMessage.includes('selector') || errorMessage.includes('not found')) {
          category = 'element';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
          category = 'network';
        } else if (errorMessage.includes('assert') || errorMessage.includes('expect') || errorMessage.includes('should')) {
          category = 'assertion';
        } else if (errorMessage.includes('auth') || errorMessage.includes('login') || errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
          category = 'auth';
        }

        errorCategories[category].count++;
        if (result.test_id) {
          errorCategories[category].testIds.add(result.test_id);
        }
      });

      const totalFailures = results.length;
      const colorMap: Record<string, string> = {
        timeout: 'bg-red-500',
        element: 'bg-orange-500',
        network: 'bg-yellow-500',
        assertion: 'bg-blue-500',
        auth: 'bg-purple-500',
        other: 'bg-gray-500',
      };

      const nameMap: Record<string, string> = {
        timeout: 'Timeout Errors',
        element: 'Element Not Found',
        network: 'Network Failures',
        assertion: 'Assertion Failures',
        auth: 'Authentication Issues',
        other: 'Other Errors',
      };

      const clusters: FailureCluster[] = Object.entries(errorCategories)
        .filter(([, data]) => data.count > 0)
        .map(([type, data], index) => ({
          id: String(index + 1),
          name: nameMap[type],
          count: data.count,
          percentage: Math.round((data.count / totalFailures) * 100),
          errorType: type,
          affectedTests: data.testIds.size,
          trend: 'stable' as const, // Would need historical data to calculate trend
          color: colorMap[type],
        }))
        .sort((a, b) => b.count - a.count);

      return { clusters, totalFailures };
    },
    enabled: !!projectId,
  });
}

// Hook to get coverage gaps by comparing discovered pages/flows with tests
export function useCoverageGaps(projectId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['coverage-gaps', projectId],
    queryFn: async () => {
      if (!projectId) return { gaps: [], stats: { critical: 0, high: 0, totalSuggested: 0, overallCoverage: 0 } };

      // Get discovery sessions for the project
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sessions, error: sessionsError } = await (supabase.from('discovery_sessions') as any)
        .select('id')
        .eq('project_id', projectId);

      if (sessionsError) throw sessionsError;

      // Get discovered pages
      let discoveredPages: Array<{ id: string; url: string; title: string | null }> = [];
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map((s: { id: string }) => s.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: pages, error: pagesError } = await (supabase.from('discovered_pages') as any)
          .select('id, url, title')
          .in('session_id', sessionIds);
        if (pagesError) throw pagesError;
        discoveredPages = pages || [];
      }

      // Get discovered flows
      let discoveredFlows: Array<{ id: string; name: string; description: string | null }> = [];
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map((s: { id: string }) => s.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: flows, error: flowsError } = await (supabase.from('discovered_flows') as any)
          .select('id, name, description')
          .in('session_id', sessionIds);
        if (flowsError) throw flowsError;
        discoveredFlows = flows || [];
      }

      // Get existing tests
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tests, error: testsError } = await (supabase.from('tests') as any)
        .select('id, name, target_url')
        .eq('project_id', projectId);
      if (testsError) throw testsError;

      const existingTests = tests || [];
      const testUrls = existingTests.map((t: { target_url?: string }) => t.target_url?.toLowerCase() || '');
      const testNames = existingTests.map((t: { name: string }) => t.name.toLowerCase());

      // Analyze coverage gaps for pages
      const pageGaps: CoverageGap[] = discoveredPages.map((page, index) => {
        const pageUrl = page.url.toLowerCase();
        const isTested = testUrls.some((url: string) => url.includes(pageUrl) || pageUrl.includes(url));
        const coverage = isTested ? 100 : 0;

        // Determine priority based on URL patterns
        let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        if (pageUrl.includes('checkout') || pageUrl.includes('payment') || pageUrl.includes('cart')) {
          priority = 'critical';
        } else if (pageUrl.includes('auth') || pageUrl.includes('login') || pageUrl.includes('signup') || pageUrl.includes('profile')) {
          priority = 'high';
        } else if (pageUrl.includes('settings') || pageUrl.includes('admin')) {
          priority = 'high';
        }

        return {
          id: `page-${index}`,
          area: page.url,
          type: 'page' as const,
          coverage,
          priority,
          suggestedTests: isTested ? 0 : (priority === 'critical' ? 5 : priority === 'high' ? 3 : 2),
          impact: priority === 'critical' ? 'High revenue/security impact' : priority === 'high' ? 'Important user flow' : 'Standard functionality',
          isTested,
        };
      });

      // Analyze coverage gaps for flows
      const flowGaps: CoverageGap[] = discoveredFlows.map((flow, index) => {
        const flowName = flow.name.toLowerCase();
        const isTested = testNames.some((name: string) => name.includes(flowName) || flowName.includes(name));
        const coverage = isTested ? 100 : 0;

        let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        if (flowName.includes('checkout') || flowName.includes('payment') || flowName.includes('purchase')) {
          priority = 'critical';
        } else if (flowName.includes('auth') || flowName.includes('login') || flowName.includes('register') || flowName.includes('password')) {
          priority = 'high';
        }

        return {
          id: `flow-${index}`,
          area: flow.name,
          type: 'flow' as const,
          coverage,
          priority,
          suggestedTests: isTested ? 0 : (priority === 'critical' ? 4 : priority === 'high' ? 3 : 2),
          impact: flow.description || (priority === 'critical' ? 'Critical user journey' : 'User flow'),
          isTested,
        };
      });

      // Combine and filter to show only gaps (not fully covered)
      const allGaps = [...pageGaps, ...flowGaps].filter(gap => !gap.isTested);

      // Sort by priority
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      allGaps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      // Calculate stats
      const totalItems = discoveredPages.length + discoveredFlows.length;
      const coveredItems = pageGaps.filter(g => g.isTested).length + flowGaps.filter(g => g.isTested).length;
      const overallCoverage = totalItems > 0 ? Math.round((coveredItems / totalItems) * 100) : 100;

      return {
        gaps: allGaps,
        stats: {
          critical: allGaps.filter(g => g.priority === 'critical').length,
          high: allGaps.filter(g => g.priority === 'high').length,
          totalSuggested: allGaps.reduce((sum, g) => sum + g.suggestedTests, 0),
          overallCoverage,
        },
      };
    },
    enabled: !!projectId,
  });
}

// Hook to detect flaky tests from test_results
export function useFlakyTests(projectId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['flaky-tests', projectId],
    queryFn: async () => {
      if (!projectId) return { flakyTests: [], stats: { count: 0, totalFailures: 0, autoFixed: 0 } };

      // Get tests for the project
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tests, error: testsError } = await (supabase.from('tests') as any)
        .select('id, name')
        .eq('project_id', projectId);

      if (testsError) throw testsError;
      if (!tests || tests.length === 0) return { flakyTests: [], stats: { count: 0, totalFailures: 0, autoFixed: 0 } };

      // Get test runs for the project
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: testRuns, error: runsError } = await (supabase.from('test_runs') as any)
        .select('id')
        .eq('project_id', projectId);

      if (runsError) throw runsError;
      if (!testRuns || testRuns.length === 0) return { flakyTests: [], stats: { count: 0, totalFailures: 0, autoFixed: 0 } };

      const runIds = testRuns.map((r: { id: string }) => r.id);

      // Get all test results
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: results, error: resultsError } = await (supabase.from('test_results') as any)
        .select('test_id, status, error_message, created_at')
        .in('test_run_id', runIds)
        .order('created_at', { ascending: false });

      if (resultsError) throw resultsError;
      if (!results || results.length === 0) return { flakyTests: [], stats: { count: 0, totalFailures: 0, autoFixed: 0 } };

      // Analyze each test for flakiness
      const testAnalysis: Record<string, { passes: number; failures: number; lastFailure: string | null; errorMessages: string[] }> = {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results.forEach((result: any) => {
        if (!result.test_id) return;

        if (!testAnalysis[result.test_id]) {
          testAnalysis[result.test_id] = { passes: 0, failures: 0, lastFailure: null, errorMessages: [] };
        }

        if (result.status === 'passed') {
          testAnalysis[result.test_id].passes++;
        } else if (result.status === 'failed') {
          testAnalysis[result.test_id].failures++;
          if (!testAnalysis[result.test_id].lastFailure) {
            testAnalysis[result.test_id].lastFailure = result.created_at;
          }
          if (result.error_message) {
            testAnalysis[result.test_id].errorMessages.push(result.error_message);
          }
        }
      });

      // Identify flaky tests (tests that have both passes and failures)
      const flakyTests: FlakyTest[] = [];
      let totalFlakyFailures = 0;

      tests.forEach((test: { id: string; name: string }) => {
        const analysis = testAnalysis[test.id];
        if (!analysis) return;

        const totalRuns = analysis.passes + analysis.failures;
        if (totalRuns < 2) return; // Need at least 2 runs to detect flakiness

        // A test is flaky if it has both passes and failures
        if (analysis.passes > 0 && analysis.failures > 0) {
          const passRate = Math.round((analysis.passes / totalRuns) * 100);
          const flakinessScore = Math.round((analysis.failures / totalRuns) * 100);

          // Analyze error messages to suggest root cause and fix
          const errorMessages = analysis.errorMessages.join(' ').toLowerCase();
          let rootCause = 'Inconsistent test behavior';
          let suggestedFix = 'Review test for timing issues';

          if (errorMessages.includes('timeout')) {
            rootCause = 'Timeout or slow response times';
            suggestedFix = 'Increase timeout values or add wait conditions';
          } else if (errorMessages.includes('element') || errorMessages.includes('selector')) {
            rootCause = 'Element not found intermittently';
            suggestedFix = 'Use more stable selectors or add explicit waits';
          } else if (errorMessages.includes('race') || errorMessages.includes('async')) {
            rootCause = 'Race condition in async operations';
            suggestedFix = 'Add proper synchronization and await patterns';
          } else if (errorMessages.includes('network') || errorMessages.includes('api')) {
            rootCause = 'Network request timing issues';
            suggestedFix = 'Mock API responses or add retry logic';
          }

          const lastFlake = analysis.lastFailure
            ? formatTimeAgo(new Date(analysis.lastFailure))
            : 'Unknown';

          flakyTests.push({
            id: test.id,
            name: test.name,
            flakinessScore,
            passRate,
            failureCount: analysis.failures,
            totalRuns,
            rootCause,
            suggestedFix,
            lastFlake,
          });

          totalFlakyFailures += analysis.failures;
        }
      });

      // Sort by flakiness score
      flakyTests.sort((a, b) => b.flakinessScore - a.flakinessScore);

      return {
        flakyTests,
        stats: {
          count: flakyTests.length,
          totalFailures: totalFlakyFailures,
          autoFixed: 0, // Would need healing history to track this
        },
      };
    },
    enabled: !!projectId,
  });
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
