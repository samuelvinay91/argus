'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  performanceApi,
  PerformanceTestApi,
  PerformanceTrendPointApi,
  PerformanceIssueApi,
} from '@/lib/api-client';

// ============================================================================
// Legacy Types (for backward compatibility)
// ============================================================================

// Types for performance metrics (legacy snake_case format)
export interface CoreWebVitals {
  lcp_ms: number;       // Largest Contentful Paint
  fid_ms: number;       // First Input Delay
  cls: number;          // Cumulative Layout Shift
  inp_ms?: number;      // Interaction to Next Paint
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

export interface PerformanceTrend {
  date: string;
  lcp_ms: number;
  fid_ms: number;
  cls: number;
  performance_score: number;
}

// ============================================================================
// Transform Functions (API camelCase -> Legacy snake_case)
// ============================================================================

/**
 * Transform API issue to legacy format
 */
function transformIssue(issue: PerformanceIssueApi): PerformanceIssue {
  return {
    category: issue.category,
    severity: issue.severity,
    title: issue.title,
    description: issue.description,
    savings_ms: issue.savingsMs ?? undefined,
    savings_kb: issue.savingsKb ?? undefined,
    fix_suggestion: issue.fixSuggestion ?? undefined,
  };
}

/**
 * Transform API response to legacy format
 */
function transformToLegacy(test: PerformanceTestApi): PerformanceMetrics {
  return {
    id: test.id,
    project_id: test.projectId,
    url: test.url,
    device: test.device,
    status: test.status,
    lcp_ms: test.lcpMs,
    fid_ms: test.fidMs,
    cls: test.cls,
    inp_ms: test.inpMs,
    ttfb_ms: test.ttfbMs,
    fcp_ms: test.fcpMs,
    speed_index: test.speedIndex,
    tti_ms: test.ttiMs,
    tbt_ms: test.tbtMs,
    total_requests: test.totalRequests,
    total_transfer_size_kb: test.totalTransferSizeKb,
    js_execution_time_ms: test.jsExecutionTimeMs,
    dom_content_loaded_ms: test.domContentLoadedMs,
    load_time_ms: test.loadTimeMs,
    performance_score: test.performanceScore,
    accessibility_score: test.accessibilityScore,
    best_practices_score: test.bestPracticesScore,
    seo_score: test.seoScore,
    overall_grade: test.overallGrade,
    recommendations: test.recommendations,
    issues: test.issues.map(transformIssue),
    summary: test.summary,
    started_at: test.startedAt,
    completed_at: test.completedAt,
    triggered_by: test.triggeredBy,
    created_at: test.createdAt,
  };
}

/**
 * Transform API trend point to legacy format
 */
function transformTrend(trend: PerformanceTrendPointApi): PerformanceTrend {
  return {
    date: trend.date,
    lcp_ms: trend.lcpMs,
    fid_ms: trend.fidMs,
    cls: trend.cls,
    performance_score: trend.performanceScore,
  };
}

// ============================================================================
// Grade Helper Functions
// ============================================================================

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

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch performance tests for a project
 */
export function usePerformanceTests(projectId: string | null, limit = 10) {
  return useQuery({
    queryKey: ['performance-tests', projectId, limit],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await performanceApi.list({
        projectId,
        limit,
      });

      return response.tests.map(transformToLegacy);
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch latest performance test
 */
export function useLatestPerformanceTest(projectId: string | null) {
  return useQuery({
    queryKey: ['latest-performance-test', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const response = await performanceApi.getLatest(projectId);

      if (!response) return null;

      return transformToLegacy(response);
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch performance trends over time
 */
export function usePerformanceTrends(projectId: string | null, days = 30) {
  return useQuery({
    queryKey: ['performance-trends', projectId, days],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await performanceApi.getTrends({
        projectId,
        days,
      });

      return response.trends.map(transformTrend);
    },
    enabled: !!projectId,
  });
}

/**
 * Run a performance test
 */
export function useRunPerformanceTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      url,
      device = 'mobile',
    }: {
      projectId: string;
      url: string;
      device?: 'mobile' | 'desktop';
      triggeredBy?: string | null;
    }) => {
      const response = await performanceApi.run({
        projectId,
        url,
        device,
      });

      return transformToLegacy(response);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['performance-tests', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['latest-performance-test', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['performance-trends', data.project_id] });
    },
  });
}

/**
 * Get performance metrics summary for a project
 *
 * This is a convenience hook that combines multiple queries into a single result.
 * For better performance, prefer using usePerformanceSummary() which uses a single API call.
 */
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

/**
 * Get performance summary using a single API call (more efficient)
 */
export function usePerformanceSummary(projectId: string | null, limit = 50) {
  return useQuery({
    queryKey: ['performance-summary', projectId, limit],
    queryFn: async () => {
      if (!projectId) return null;

      const response = await performanceApi.getSummary({
        projectId,
        limit,
      });

      return {
        latestTest: response.latestTest ? transformToLegacy(response.latestTest) : null,
        trends: response.trends.map(transformTrend),
        averages: response.averages ? {
          avgLCP: response.averages.avgLcp,
          avgFID: response.averages.avgFid,
          avgCLS: response.averages.avgCls,
          avgScore: response.averages.avgScore,
        } : null,
        totalTests: response.totalTests,
      };
    },
    enabled: !!projectId,
  });
}
