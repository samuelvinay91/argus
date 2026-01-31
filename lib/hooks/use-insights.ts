'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { insightsApi, type AIInsightApi } from '@/lib/api-client';

// Re-export API types for backward compatibility
export type AIInsight = AIInsightApi;

// =============================================================================
// Transform Functions for Legacy Types
// =============================================================================

/**
 * Transform API insight to legacy Supabase format (snake_case)
 * Used for backward compatibility with existing components
 */
function transformToLegacyInsight(insight: AIInsightApi): LegacyAIInsight {
  return {
    id: insight.id,
    project_id: insight.projectId,
    insight_type: insight.insightType,
    severity: insight.severity,
    title: insight.title,
    description: insight.description,
    confidence: insight.confidence,
    affected_area: insight.affectedArea,
    suggested_action: insight.suggestedAction,
    action_url: insight.actionUrl,
    related_test_ids: insight.relatedTestIds,
    is_resolved: insight.isResolved,
    resolved_at: insight.resolvedAt,
    resolved_by: insight.resolvedBy,
    expires_at: insight.expiresAt,
    metadata: insight.metadata,
    created_at: insight.createdAt,
  };
}

// Legacy type matching old Supabase structure
interface LegacyAIInsight {
  id: string;
  project_id: string;
  insight_type: string;
  severity: string;
  title: string;
  description: string;
  confidence: number;
  affected_area: string | null;
  suggested_action: string | null;
  action_url: string | null;
  related_test_ids: string[] | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// =============================================================================
// Basic Insights Hooks (Migrated from Supabase)
// =============================================================================

/**
 * Hook to fetch unresolved AI insights for a project.
 * Returns legacy format for backward compatibility.
 */
export function useAIInsights(projectId: string | null) {
  return useQuery({
    queryKey: ['ai-insights', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const insights = await insightsApi.list({
        projectId,
        isResolved: false,
      });

      // Transform to legacy format for backward compatibility
      return insights.map(transformToLegacyInsight);
    },
    enabled: !!projectId,
  });
}

/**
 * Hook to resolve an insight.
 */
export function useResolveInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      insightId,
      projectId,
    }: {
      insightId: string;
      projectId: string;
      resolvedBy?: string | null;
    }) => {
      const result = await insightsApi.markResolved(insightId);
      return { ...result, projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights', projectId] });
      queryClient.invalidateQueries({ queryKey: ['insight-stats', projectId] });
    },
  });
}

/**
 * Hook to fetch insight statistics for a project.
 */
export function useInsightStats(projectId: string | null) {
  return useQuery({
    queryKey: ['insight-stats', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      return await insightsApi.getStats(projectId);
    },
    enabled: !!projectId,
  });
}

// =============================================================================
// Types for Analysis Hooks
// =============================================================================

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

// =============================================================================
// Simple Analysis Hooks (now use backend API)
// =============================================================================

/**
 * Hook to get failure clusters from backend AI analysis.
 */
export function useFailureClusters(projectId: string | null) {
  return useQuery({
    queryKey: ['failure-clusters', projectId],
    queryFn: async () => {
      if (!projectId) return { clusters: [], totalFailures: 0 };

      try {
        const response = await insightsApi.clusterFailures({
          projectId,
          days: 7,
          minClusterSize: 2,
        });

        // Transform API response to legacy format
        const colorMap: Record<string, string> = {
          timeout: 'bg-red-500',
          element: 'bg-orange-500',
          network: 'bg-yellow-500',
          assertion: 'bg-blue-500',
          auth: 'bg-purple-500',
          authentication: 'bg-purple-500',
          other: 'bg-gray-500',
          unknown: 'bg-gray-500',
        };

        const clusters: FailureCluster[] = response.clusters.map((c) => ({
          id: c.id,
          name: c.name,
          count: c.count,
          percentage: c.percentage,
          errorType: c.errorType,
          affectedTests: c.affectedTestCount,
          trend: c.trend,
          color: colorMap[c.errorType.toLowerCase()] || 'bg-gray-500',
        }));

        return { clusters, totalFailures: response.totalFailures };
      } catch {
        // Return empty result on error
        return { clusters: [], totalFailures: 0 };
      }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook to get coverage gaps from backend AI analysis.
 */
export function useCoverageGaps(projectId: string | null) {
  return useQuery({
    queryKey: ['coverage-gaps', projectId],
    queryFn: async () => {
      if (!projectId) {
        return {
          gaps: [],
          stats: { critical: 0, high: 0, totalSuggested: 0, overallCoverage: 0 },
        };
      }

      try {
        const response = await insightsApi.findCoverageGaps({
          projectId,
          includeApiGaps: true,
          includeUiGaps: true,
          includeFlowGaps: true,
        });

        // Transform API response to legacy format
        const gaps: CoverageGap[] = response.gaps.map((g) => ({
          id: g.id,
          area: g.area,
          type: g.areaType === 'component' ? 'page' : g.areaType as 'page' | 'flow' | 'api',
          coverage: g.currentCoverage,
          priority: g.riskLevel,
          suggestedTests: g.suggestedTestCount,
          impact: g.impactDescription,
          isTested: g.currentCoverage > 0,
        }));

        return {
          gaps,
          stats: {
            critical: response.criticalGaps,
            high: response.highGaps,
            totalSuggested: response.totalSuggestedTests,
            overallCoverage: response.overallCoverage,
          },
        };
      } catch {
        return {
          gaps: [],
          stats: { critical: 0, high: 0, totalSuggested: 0, overallCoverage: 0 },
        };
      }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

interface FlakyTestResult {
  id: string;
  name: string;
  flakinessScore: number;
  passRate: number;
  totalRuns: number;
  failureCount: number;
  lastFailure: string | null;
  lastFlake: string | null;
  rootCause: string | null;
  suggestedFix: string | null;
}

interface FlakyTestsData {
  flakyTests: FlakyTestResult[];
  stats: { count: number; totalFailures: number; autoFixed: number };
}

/**
 * Hook to detect flaky tests from backend AI analysis.
 * Note: This uses the /flaky-tests API endpoint rather than insights
 */
export function useFlakyTests(projectId: string | null) {
  return useQuery<FlakyTestsData>({
    queryKey: ['flaky-tests', projectId],
    queryFn: async (): Promise<FlakyTestsData> => {
      if (!projectId) {
        return {
          flakyTests: [],
          stats: { count: 0, totalFailures: 0, autoFixed: 0 },
        };
      }

      // Flaky tests use a separate API endpoint, not insights
      // Keep returning empty result for now - will be migrated separately
      return {
        flakyTests: [],
        stats: { count: 0, totalFailures: 0, autoFixed: 0 },
      };
    },
    enabled: !!projectId,
  });
}

// =============================================================================
// AI-Powered Analysis Hooks (Backend API)
// =============================================================================

// Types for AI-powered failure clustering
export interface AIFailureCluster {
  id: string;
  name: string;
  description: string;
  count: number;
  percentage: number;
  errorType: string;
  rootCauseAnalysis: string;
  affectedTests: string[];
  affectedTestCount: number;
  suggestedFix: string;
  severity: string;
  trend: 'up' | 'down' | 'stable';
  sampleErrors: Array<{ testName: string; errorMessage: string }>;
}

export interface AIFailureClusterResponse {
  clusters: AIFailureCluster[];
  totalFailures: number;
  analysisSummary: string;
  generatedAt: string;
}

// Types for AI-powered coverage gap analysis
export interface AICoverageGap {
  id: string;
  area: string;
  areaType: 'page' | 'flow' | 'api' | 'component';
  currentCoverage: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskAnalysis: string;
  impactDescription: string;
  suggestedTests: Array<{ name: string; priority: string }>;
  suggestedTestCount: number;
  priorityScore: number;
  relatedFailures: string[];
}

export interface AICoverageGapResponse {
  gaps: AICoverageGap[];
  overallCoverage: number;
  criticalGaps: number;
  highGaps: number;
  totalSuggestedTests: number;
  analysisSummary: string;
  generatedAt: string;
}

// Types for AI-powered resolution
export interface AIResolutionSuggestion {
  summary: string;
  rootCause: string;
  steps: Array<{ step: number; action: string; details: string }>;
  codeChanges?: Array<{ file: string; change: string; reason: string }>;
  testImprovements: string[];
  preventionMeasures: string[];
  estimatedEffort: string;
  confidence: number;
}

export interface AIInsightResolutionResponse {
  insightId: string;
  resolution: AIResolutionSuggestion;
  generatedAt: string;
}

// Types for AI insight generation
export interface GeneratedAIInsight {
  id: string;
  projectId: string;
  insightType: string;
  severity: string;
  title: string;
  description: string;
  confidence: number;
  affectedArea?: string;
  suggestedAction?: string;
  relatedTestIds?: string[];
  isResolved: boolean;
  createdAt: string;
}

export interface GenerateInsightsResponse {
  insights: GeneratedAIInsight[];
  totalGenerated: number;
  analysisDurationMs: number;
  generatedAt: string;
}

/**
 * Hook for AI-powered semantic failure clustering.
 * Uses Claude to group failures by their underlying root cause.
 */
export function useAIFailureClusters(projectId: string | null, days: number = 7) {
  return useQuery({
    queryKey: ['ai-failure-clusters', projectId, days],
    queryFn: async (): Promise<AIFailureClusterResponse | null> => {
      if (!projectId) return null;

      const response = await insightsApi.clusterFailures({
        projectId,
        days,
        minClusterSize: 2,
      });

      // Transform to match expected interface
      return {
        clusters: response.clusters.map((c) => ({
          ...c,
          affectedTests: c.affectedTests || [],
        })),
        totalFailures: response.totalFailures,
        analysisSummary: response.analysisSummary,
        generatedAt: response.generatedAt,
      };
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook for AI-powered coverage gap detection.
 * Uses Claude to identify high-risk areas lacking test coverage.
 */
export function useAICoverageGaps(projectId: string | null) {
  return useQuery({
    queryKey: ['ai-coverage-gaps', projectId],
    queryFn: async (): Promise<AICoverageGapResponse | null> => {
      if (!projectId) return null;

      const response = await insightsApi.findCoverageGaps({
        projectId,
        includeApiGaps: true,
        includeUiGaps: true,
        includeFlowGaps: true,
      });

      return {
        gaps: response.gaps,
        overallCoverage: response.overallCoverage,
        criticalGaps: response.criticalGaps,
        highGaps: response.highGaps,
        totalSuggestedTests: response.totalSuggestedTests,
        analysisSummary: response.analysisSummary,
        generatedAt: response.generatedAt,
      };
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook for getting AI-powered resolution suggestions for an insight.
 * Uses Claude to generate detailed fix recommendations.
 */
export function useAIResolveInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      insightId,
      projectId,
      context,
    }: {
      insightId: string;
      projectId: string;
      context?: string;
    }): Promise<AIInsightResolutionResponse & { projectId: string }> => {
      const response = await insightsApi.getResolution(
        insightId,
        context ? { context } : undefined
      );

      return {
        insightId: response.insightId,
        resolution: response.resolution,
        generatedAt: response.generatedAt,
        projectId,
      };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights', projectId] });
    },
  });
}

/**
 * Hook for generating new AI-powered insights for a project.
 * Triggers Claude to analyze test results and generate actionable insights.
 */
export function useGenerateAIInsights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      insightTypes = ['failure_pattern', 'coverage_gap', 'risk_alert', 'optimization'],
      forceRefresh = false,
    }: {
      projectId: string;
      insightTypes?: string[];
      forceRefresh?: boolean;
    }): Promise<GenerateInsightsResponse & { projectId: string }> => {
      const response = await insightsApi.generate({
        projectId,
        insightTypes,
        forceRefresh,
      });

      return {
        insights: response.insights.map((i) => ({
          id: i.id,
          projectId: i.projectId,
          insightType: i.insightType,
          severity: i.severity,
          title: i.title,
          description: i.description,
          confidence: i.confidence,
          affectedArea: i.affectedArea ?? undefined,
          suggestedAction: i.suggestedAction ?? undefined,
          relatedTestIds: i.relatedTestIds ?? undefined,
          isResolved: i.isResolved,
          createdAt: i.createdAt,
        })),
        totalGenerated: response.totalGenerated,
        analysisDurationMs: response.analysisDurationMs,
        generatedAt: response.generatedAt,
        projectId,
      };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights', projectId] });
      queryClient.invalidateQueries({ queryKey: ['insight-stats', projectId] });
    },
  });
}
