'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { BACKEND_URL } from '@/lib/config/api-endpoints';

// Types for performance metrics
export interface CoreWebVitals {
  lcp_ms: number;       // Largest Contentful Paint
  fid_ms: number;       // First Input Delay
  cls: number;          // Cumulative Layout Shift
  inp_ms?: number;      // Interaction to Next Paint
}

export interface PerformanceMetrics {
  id: string;
  project_id: string;
  url: string;
  device: 'mobile' | 'desktop';
  status: 'pending' | 'running' | 'completed' | 'failed';

  // Core Web Vitals
  lcp_ms: number | null;
  fid_ms: number | null;
  cls: number | null;
  inp_ms: number | null;

  // Additional timing metrics
  ttfb_ms: number | null;
  fcp_ms: number | null;
  speed_index: number | null;
  tti_ms: number | null;
  tbt_ms: number | null;

  // Resource metrics
  total_requests: number | null;
  total_transfer_size_kb: number | null;
  js_execution_time_ms: number | null;
  dom_content_loaded_ms: number | null;
  load_time_ms: number | null;

  // Scores (0-100)
  performance_score: number | null;
  accessibility_score: number | null;
  best_practices_score: number | null;
  seo_score: number | null;

  // Overall grade
  overall_grade: 'excellent' | 'good' | 'needs_work' | 'poor' | null;

  // Recommendations
  recommendations: string[];
  issues: PerformanceIssue[];
  summary: string | null;

  started_at: string | null;
  completed_at: string | null;
  triggered_by: string | null;
  created_at: string;
}

export interface PerformanceIssue {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  savings_ms?: number;
  savings_kb?: number;
  fix_suggestion?: string;
}

export interface PerformanceTrend {
  date: string;
  lcp_ms: number;
  fid_ms: number;
  cls: number;
  performance_score: number;
}

// Grade helper functions
export function getLCPGrade(lcp_ms: number | null): 'good' | 'needs_work' | 'poor' {
  if (lcp_ms === null) return 'poor';
  if (lcp_ms <= 2500) return 'good';
  if (lcp_ms <= 4000) return 'needs_work';
  return 'poor';
}

export function getFIDGrade(fid_ms: number | null): 'good' | 'needs_work' | 'poor' {
  if (fid_ms === null) return 'poor';
  if (fid_ms <= 100) return 'good';
  if (fid_ms <= 300) return 'needs_work';
  return 'poor';
}

export function getCLSGrade(cls: number | null): 'good' | 'needs_work' | 'poor' {
  if (cls === null) return 'poor';
  if (cls <= 0.1) return 'good';
  if (cls <= 0.25) return 'needs_work';
  return 'poor';
}

export function getOverallGradeColor(grade: string | null): string {
  switch (grade) {
    case 'excellent': return 'text-success';
    case 'good': return 'text-success';
    case 'needs_work': return 'text-warning';
    case 'poor': return 'text-error';
    default: return 'text-muted-foreground';
  }
}

export function getGradeLetter(score: number | null): string {
  if (score === null) return '-';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function getGradeColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 90) return 'text-success';
  if (score >= 70) return 'text-warning';
  return 'text-error';
}

// Fetch performance tests for a project
export function usePerformanceTests(projectId: string | null, limit = 10) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['performance-tests', projectId, limit],
    queryFn: async () => {
      if (!projectId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('performance_tests') as any)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as PerformanceMetrics[];
    },
    enabled: !!projectId,
  });
}

// Fetch latest performance test
export function useLatestPerformanceTest(projectId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['latest-performance-test', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('performance_tests') as any)
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      return data[0] as PerformanceMetrics;
    },
    enabled: !!projectId,
  });
}

// Fetch performance trends over time
export function usePerformanceTrends(projectId: string | null, days = 30) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['performance-trends', projectId, days],
    queryFn: async () => {
      if (!projectId) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('performance_tests') as any)
        .select('created_at, lcp_ms, fid_ms, cls, performance_score')
        .eq('project_id', projectId)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform to trend format
      return (data || []).map((item: PerformanceMetrics) => ({
        date: new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        lcp_ms: item.lcp_ms || 0,
        fid_ms: item.fid_ms || 0,
        cls: item.cls || 0,
        performance_score: item.performance_score || 0,
      })) as PerformanceTrend[];
    },
    enabled: !!projectId,
  });
}

// Run a performance test
export function useRunPerformanceTest() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      url,
      device = 'mobile',
      triggeredBy,
    }: {
      projectId: string;
      url: string;
      device?: 'mobile' | 'desktop';
      triggeredBy?: string | null;
    }) => {
      // 1. Create performance test record with 'running' status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: test, error: testError } = await (supabase.from('performance_tests') as any)
        .insert({
          project_id: projectId,
          url,
          device,
          status: 'running',
          started_at: new Date().toISOString(),
          triggered_by: triggeredBy || null,
          recommendations: [],
          issues: [],
        })
        .select()
        .single();

      if (testError) throw testError;

      try {
        // 2. Call backend performance analyzer
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

        const response = await fetch(`${BACKEND_URL}/api/v1/performance/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            device,
            projectId,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Performance analysis failed: ${response.status}`);
        }

        const result = await response.json();

        // 3. Update test with results
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updatedTest } = await (supabase.from('performance_tests') as any)
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            // Core Web Vitals
            lcp_ms: result.metrics?.core_vitals?.lcp_ms || null,
            fid_ms: result.metrics?.core_vitals?.fid_ms || null,
            cls: result.metrics?.core_vitals?.cls || null,
            inp_ms: result.metrics?.core_vitals?.inp_ms || null,
            // Timing metrics
            ttfb_ms: result.metrics?.ttfb_ms || null,
            fcp_ms: result.metrics?.fcp_ms || null,
            speed_index: result.metrics?.speed_index || null,
            tti_ms: result.metrics?.tti_ms || null,
            tbt_ms: result.metrics?.tbt_ms || null,
            // Resource metrics
            total_requests: result.metrics?.total_requests || null,
            total_transfer_size_kb: result.metrics?.total_transfer_size_kb || null,
            js_execution_time_ms: result.metrics?.js_execution_time_ms || null,
            dom_content_loaded_ms: result.metrics?.dom_content_loaded_ms || null,
            load_time_ms: result.metrics?.load_time_ms || null,
            // Scores
            performance_score: result.metrics?.performance_score || null,
            accessibility_score: result.metrics?.accessibility_score || null,
            best_practices_score: result.metrics?.best_practices_score || null,
            seo_score: result.metrics?.seo_score || null,
            // Analysis
            overall_grade: result.overall_grade || null,
            recommendations: result.recommendations || [],
            issues: result.issues || [],
            summary: result.summary || null,
          })
          .eq('id', test.id)
          .select()
          .single();

        return updatedTest as PerformanceMetrics;
      } catch (error) {
        // Update test to failed status
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('performance_tests') as any)
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', test.id);

        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['performance-tests', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['latest-performance-test', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['performance-trends', data.project_id] });
    },
  });
}

// Get performance metrics summary for a project
export function usePerformanceMetrics(projectId: string | null) {
  const { data: latestTest, isLoading: testLoading } = useLatestPerformanceTest(projectId);
  const { data: trends, isLoading: trendsLoading } = usePerformanceTrends(projectId, 30);
  const { data: allTests, isLoading: allTestsLoading } = usePerformanceTests(projectId, 50);

  const isLoading = testLoading || trendsLoading || allTestsLoading;

  // Calculate averages from recent tests
  const averages = allTests && allTests.length > 0
    ? {
        avgLCP: allTests.reduce((sum, t) => sum + (t.lcp_ms || 0), 0) / allTests.length,
        avgFID: allTests.reduce((sum, t) => sum + (t.fid_ms || 0), 0) / allTests.length,
        avgCLS: allTests.reduce((sum, t) => sum + (t.cls || 0), 0) / allTests.length,
        avgScore: allTests.reduce((sum, t) => sum + (t.performance_score || 0), 0) / allTests.length,
      }
    : null;

  return {
    latestTest,
    trends: trends || [],
    allTests: allTests || [],
    averages,
    isLoading,
  };
}
