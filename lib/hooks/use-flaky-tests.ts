'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useProjects } from './use-projects';
import type { Json } from '@/lib/supabase/types';

// Types for flaky tests
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

// Fetch flaky tests by analyzing test results
export function useFlakyTests() {
  const supabase = getSupabaseClient();
  const { data: projects = [] } = useProjects();
  const projectIds = projects.map(p => p.id);

  return useQuery({
    queryKey: ['flaky-tests', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];

      // Get recent test results (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get test results grouped by test
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: results, error } = await (supabase.from('test_results') as any)
        .select(`
          id,
          test_id,
          name,
          status,
          duration_ms,
          error_message,
          created_at,
          test_runs!inner (
            project_id
          )
        `)
        .in('test_runs.project_id', projectIds)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .in('status', ['passed', 'failed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get tests info
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tests, error: testsError } = await (supabase.from('tests') as any)
        .select('id, name, description, tags, project_id')
        .in('project_id', projectIds);

      if (testsError) throw testsError;

      // Get healing patterns for root causes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: healingPatterns } = await (supabase.from('healing_patterns') as any)
        .select('test_id, error_type, error_pattern, fix_pattern, confidence, success_count')
        .in('project_id', projectIds);

      // Create a map of tests
      const testsMap: Record<string, { name: string; description: string | null; tags: string[]; projectId: string }> = {};
      (tests || []).forEach((t: { id: string; name: string; description: string | null; tags: string[]; project_id: string }) => {
        testsMap[t.id] = { name: t.name, description: t.description, tags: t.tags, projectId: t.project_id };
      });

      // Create a map of healing patterns by test
      const healingMap: Record<string, { type: string; description: string; confidence: number }[]> = {};
      (healingPatterns || []).forEach((p: { test_id: string; error_type: string; error_pattern: string; confidence: number }) => {
        if (!p.test_id) return;
        if (!healingMap[p.test_id]) healingMap[p.test_id] = [];
        healingMap[p.test_id].push({
          type: p.error_type || 'selector',
          description: p.error_pattern || 'Unknown pattern',
          confidence: p.confidence || 0.5,
        });
      });

      // Group results by test
      const testResults: Record<string, {
        name: string;
        projectId: string;
        results: { status: string; duration: number; date: string; errorMessage: string | null }[];
      }> = {};

      (results || []).forEach((r: {
        test_id: string | null;
        name: string;
        status: string;
        duration_ms: number | null;
        error_message: string | null;
        created_at: string;
        test_runs: { project_id: string };
      }) => {
        const key = r.test_id || r.name;
        if (!testResults[key]) {
          testResults[key] = {
            name: r.test_id && testsMap[r.test_id] ? testsMap[r.test_id].name : r.name,
            projectId: r.test_runs.project_id,
            results: [],
          };
        }
        testResults[key].results.push({
          status: r.status,
          duration: r.duration_ms || 0,
          date: r.created_at,
          errorMessage: r.error_message,
        });
      });

      // Calculate flakiness for each test
      const flakyTests: FlakyTest[] = [];

      Object.entries(testResults).forEach(([testId, data]) => {
        const passCount = data.results.filter(r => r.status === 'passed').length;
        const failCount = data.results.filter(r => r.status === 'failed').length;
        const totalRuns = passCount + failCount;

        // A test is considered flaky if it has both passes and fails
        if (passCount === 0 || failCount === 0 || totalRuns < 3) return;

        const flakinessScore = failCount / totalRuns;
        const avgDuration = data.results.reduce((sum, r) => sum + r.duration, 0) / totalRuns;

        // Calculate trend based on recent results
        const recentResults = data.results.slice(0, 10).map(r => r.status === 'passed');
        const firstHalfFailures = recentResults.slice(5).filter(r => !r).length;
        const secondHalfFailures = recentResults.slice(0, 5).filter(r => !r).length;

        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        if (secondHalfFailures > firstHalfFailures + 1) trend = 'increasing';
        else if (firstHalfFailures > secondHalfFailures + 1) trend = 'decreasing';

        // Get project name
        const project = projects.find(p => p.id === data.projectId);

        // Infer root causes from error messages
        const rootCauses: FlakyTest['rootCauses'] = [];
        const failedResults = data.results.filter(r => r.status === 'failed');

        if (healingMap[testId]) {
          rootCauses.push(...healingMap[testId].map(h => ({
            type: h.type as FlakyTest['rootCauses'][0]['type'],
            description: h.description,
            confidence: h.confidence,
          })));
        } else if (failedResults.length > 0) {
          // Infer from error messages
          const errorMessages = failedResults.map(r => r.errorMessage || '').filter(Boolean);
          const hasTimeoutError = errorMessages.some(m => m.toLowerCase().includes('timeout'));
          const hasNetworkError = errorMessages.some(m => m.toLowerCase().includes('network') || m.toLowerCase().includes('fetch'));
          const hasSelectorError = errorMessages.some(m => m.toLowerCase().includes('element') || m.toLowerCase().includes('selector'));

          if (hasTimeoutError) {
            rootCauses.push({ type: 'timing', description: 'Timeout during test execution', confidence: 0.7 });
          }
          if (hasNetworkError) {
            rootCauses.push({ type: 'network', description: 'Network-related failures', confidence: 0.7 });
          }
          if (hasSelectorError) {
            rootCauses.push({ type: 'selector', description: 'Element selection issues', confidence: 0.7 });
          }
          if (rootCauses.length === 0) {
            rootCauses.push({ type: 'state', description: 'Unknown state-related issues', confidence: 0.5 });
          }
        }

        // Generate suggested fix based on root causes
        let suggestedFix: string | null = null;
        if (rootCauses.length > 0) {
          const primaryCause = rootCauses[0];
          switch (primaryCause.type) {
            case 'timing':
              suggestedFix = 'Add explicit waits or increase timeout values for flaky operations';
              break;
            case 'network':
              suggestedFix = 'Implement retry logic for network requests or use mocking';
              break;
            case 'selector':
              suggestedFix = 'Use more stable selectors like data-testid attributes';
              break;
            case 'data':
              suggestedFix = 'Isolate test data with fixtures to ensure consistency';
              break;
            case 'external':
              suggestedFix = 'Mock external dependencies to reduce variability';
              break;
            default:
              suggestedFix = 'Investigate test stability and add appropriate waits';
          }
        }

        flakyTests.push({
          id: testId,
          name: data.name,
          path: testsMap[testId]?.description || `tests/${testId}.spec.ts`,
          flakinessScore,
          totalRuns,
          passCount,
          failCount,
          lastRun: data.results[0]?.date || new Date().toISOString(),
          trend,
          isQuarantined: testsMap[testId]?.tags?.includes('quarantined') || false,
          rootCauses,
          recentResults,
          avgDuration,
          suggestedFix,
          projectId: data.projectId,
          projectName: project?.name || 'Unknown Project',
        });
      });

      // Sort by flakiness score (most flaky first)
      return flakyTests.sort((a, b) => b.flakinessScore - a.flakinessScore);
    },
    enabled: projectIds.length > 0,
  });
}

// Fetch flakiness trend data
export function useFlakinesssTrend() {
  const supabase = getSupabaseClient();
  const { data: projects = [] } = useProjects();
  const projectIds = projects.map(p => p.id);

  return useQuery({
    queryKey: ['flakiness-trend', projectIds],
    queryFn: async (): Promise<FlakyTestTrend[]> => {
      if (projectIds.length === 0) return [];

      // Get daily stats for the last 8 weeks
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 56);

      // Group by week
      const weeks: FlakyTestTrend[] = [];

      for (let i = 7; i >= 0; i--) {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 7);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: results, error } = await (supabase.from('test_results') as any)
          .select(`
            test_id,
            name,
            status,
            test_runs!inner (
              project_id
            )
          `)
          .in('test_runs.project_id', projectIds)
          .gte('created_at', weekStart.toISOString())
          .lt('created_at', weekEnd.toISOString())
          .in('status', ['passed', 'failed']);

        if (error) continue;

        // Count unique flaky tests (tests with both pass and fail)
        const testStats: Record<string, { passed: number; failed: number }> = {};
        (results || []).forEach((r: { test_id: string | null; name: string; status: string }) => {
          const key = r.test_id || r.name;
          if (!testStats[key]) testStats[key] = { passed: 0, failed: 0 };
          if (r.status === 'passed') testStats[key].passed++;
          else testStats[key].failed++;
        });

        let flakyCount = 0;
        let fixedCount = 0;

        Object.values(testStats).forEach(stats => {
          if (stats.passed > 0 && stats.failed > 0) {
            flakyCount++;
          } else if (stats.passed > 3 && stats.failed === 0) {
            fixedCount++;
          }
        });

        weeks.push({
          date: weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          flaky: flakyCount,
          fixed: fixedCount,
        });
      }

      return weeks;
    },
    enabled: projectIds.length > 0,
  });
}

// Quarantine/Unquarantine a test
export function useToggleQuarantine() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ testId, quarantine }: { testId: string; quarantine: boolean }) => {
      // Get current test tags
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: test, error: fetchError } = await (supabase.from('tests') as any)
        .select('tags')
        .eq('id', testId)
        .single();

      if (fetchError) throw fetchError;

      let newTags: string[] = test?.tags || [];

      if (quarantine) {
        if (!newTags.includes('quarantined')) {
          newTags = [...newTags, 'quarantined'];
        }
      } else {
        newTags = newTags.filter((t: string) => t !== 'quarantined');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('tests') as any)
        .update({ tags: newTags })
        .eq('id', testId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flaky-tests'] });
    },
  });
}

// Calculate flaky test stats
export function useFlakyTestStats() {
  const { data: flakyTests = [] } = useFlakyTests();

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
