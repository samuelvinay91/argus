'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
// No conversion imports needed - backend CamelCaseMiddleware handles all case conversion
import type {
  ProductionEvent,
  GeneratedTest,
  RiskScore,
  QualityIntelligenceStats,
} from '@/lib/supabase/types';

// Helper to get supabase client with any type for new tables
// This is needed because the types file has the new table definitions
// but they haven't been picked up by the Supabase client yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): any {
  return createClient();
}

// ============================================================================
// PRODUCTION EVENTS
// ============================================================================

export function useProductionEvents(projectId: string | null) {
  return useQuery({
    queryKey: ['production-events', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('production_events')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as ProductionEvent[];
    },
    enabled: !!projectId,
  });
}

export function useProductionEvent(eventId: string | null) {
  return useQuery({
    queryKey: ['production-event', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('production_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      return data as ProductionEvent;
    },
    enabled: !!eventId,
  });
}

export function useProductionEventStats(projectId: string | null) {
  return useQuery({
    queryKey: ['production-event-stats', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('production_events')
        .select('status, severity')
        .eq('project_id', projectId);

      if (error) throw error;

      const events = (data || []) as Array<{ status: string; severity: string }>;
      const stats = {
        total: events.length,
        byStatus: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
      };

      events.forEach((e) => {
        stats.byStatus[e.status] = (stats.byStatus[e.status] || 0) + 1;
        stats.bySeverity[e.severity] = (stats.bySeverity[e.severity] || 0) + 1;
      });

      return stats;
    },
    enabled: !!projectId,
  });
}

export function useUpdateProductionEventStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      status,
    }: {
      eventId: string;
      status: string;
    }) => {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('production_events')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-events'] });
      queryClient.invalidateQueries({ queryKey: ['production-event-stats'] });
    },
  });
}

// ============================================================================
// GENERATED TESTS
// ============================================================================

export function useGeneratedTests(projectId: string | null) {
  return useQuery({
    queryKey: ['generated-tests', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('generated_tests')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as GeneratedTest[];
    },
    enabled: !!projectId,
  });
}

export function useGeneratedTest(testId: string | null) {
  return useQuery({
    queryKey: ['generated-test', testId],
    queryFn: async () => {
      if (!testId) return null;
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('generated_tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (error) throw error;
      return data as GeneratedTest;
    },
    enabled: !!testId,
  });
}

export function useUpdateGeneratedTestStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      testId,
      status,
      reviewNotes,
    }: {
      testId: string;
      status: 'approved' | 'rejected' | 'modified';
      reviewNotes?: string;
    }) => {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('generated_tests')
        .update({
          status,
          review_notes: reviewNotes,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', testId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-tests'] });
      queryClient.invalidateQueries({ queryKey: ['generated-test'] });
    },
  });
}

export function useGenerateTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      eventId,
      framework = 'playwright',
      autoCreatePr = false,
      githubConfig,
    }: {
      projectId: string;
      eventId: string;
      framework?: 'playwright' | 'cypress' | 'jest';
      autoCreatePr?: boolean;
      githubConfig?: {
        owner: string;
        repo: string;
        base_branch?: string;
        test_directory?: string;
      };
    }) => {
      // Get Skopaq API URL from environment
      const apiUrl = process.env.NEXT_PUBLIC_SKOPAQ_API_URL || 'https://skopaq-api.skopaq.ai';
      const apiToken = process.env.NEXT_PUBLIC_ARGUS_API_TOKEN;

      const response = await fetch(`${apiUrl}/api/generate-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify({
          production_event_id: eventId,
          project_id: projectId,
          framework,
          auto_create_pr: autoCreatePr,
          github_config: githubConfig,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate test');
      }

      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-tests'] });
      queryClient.invalidateQueries({ queryKey: ['production-events'] });
    },
  });
}

// ============================================================================
// RISK SCORES
// ============================================================================

export function useRiskScores(projectId: string | null) {
  return useQuery({
    queryKey: ['risk-scores', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('risk_scores')
        .select('*')
        .eq('project_id', projectId)
        .order('overall_risk_score', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as RiskScore[];
    },
    enabled: !!projectId,
  });
}

export function useHighRiskComponents(projectId: string | null) {
  return useQuery({
    queryKey: ['high-risk-components', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('risk_scores')
        .select('*')
        .eq('project_id', projectId)
        .gte('overall_risk_score', 70) // High risk = 70+
        .order('overall_risk_score', { ascending: false });

      if (error) throw error;
      return (data || []) as RiskScore[];
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// QUALITY INTELLIGENCE STATS
// ============================================================================

export function useQualityIntelligenceStats(projectId: string | null) {
  return useQuery({
    queryKey: ['quality-intelligence-stats', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('quality_intelligence_stats')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return (data || null) as QualityIntelligenceStats | null;
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// RISK SCORE CALCULATION
// ============================================================================

export function useCalculateRiskScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      entityTypes = ['page', 'component'],
    }: {
      projectId: string;
      entityTypes?: string[];
    }) => {
      // Get Skopaq API URL from environment
      const apiUrl = process.env.NEXT_PUBLIC_SKOPAQ_API_URL || 'https://skopaq-api.skopaq.ai';
      const apiToken = process.env.NEXT_PUBLIC_ARGUS_API_TOKEN;

      const response = await fetch(`${apiUrl}/api/calculate-risk-scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify({
          project_id: projectId,
          entity_types: entityTypes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to calculate risk scores');
      }

      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-scores'] });
      queryClient.invalidateQueries({ queryKey: ['high-risk-components'] });
      queryClient.invalidateQueries({ queryKey: ['quality-intelligence-stats'] });
    },
  });
}

// ============================================================================
// INTEGRATIONS
// ============================================================================

export function useQualityIntegrations(projectId: string | null) {
  return useQuery({
    queryKey: ['quality-integrations', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('project_id', projectId)
        .in('type', ['sentry', 'datadog', 'newrelic', 'bugsnag', 'rollbar']);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// AI QUALITY SCORE
// ============================================================================

export interface AIQualityScore {
  success: boolean;
  project_id: string;
  overall_score: number;
  grade: string;
  grade_color: string;
  component_scores: {
    error_management: { score: number; label: string; description: string };
    test_coverage: { score: number; label: string; description: string };
    risk_mitigation: { score: number; label: string; description: string };
    automation: { score: number; label: string; description: string };
    prevention: { score: number; label: string; description: string };
  };
  metrics: {
    total_events: number;
    unresolved_events: number;
    tests_generated: number;
    tests_approved: number;
    avg_confidence: number;
    high_risk_components: number;
    incidents_prevented: number;
  };
  insights: string[];
  calculated_at: string;
}

export function useAIQualityScore(projectId: string | null) {
  return useQuery({
    queryKey: ['ai-quality-score', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const apiUrl = process.env.NEXT_PUBLIC_SKOPAQ_API_URL || 'https://skopaq-api.skopaq.ai';
      const apiToken = process.env.NEXT_PUBLIC_ARGUS_API_TOKEN;

      const response = await fetch(`${apiUrl}/api/quality-score?project_id=${projectId}`, {
        headers: {
          ...(apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch quality score');
      }

      const data = await response.json();
      return data as AIQualityScore;
    },
    enabled: !!projectId,
    refetchInterval: 60000, // Refetch every minute
  });
}

// ============================================================================
// SEMANTIC PATTERN SEARCH
// ============================================================================

export interface SimilarPattern {
  id: string;
  score: number;
  pattern_hash: string;
  category: string;
  example_message: string;
  known_solutions?: string[];
}

export function useSemanticSearch() {
  return useMutation({
    mutationFn: async ({
      errorText,
      limit = 5,
      minScore = 0.7,
    }: {
      errorText: string;
      limit?: number;
      minScore?: number;
    }) => {
      const apiUrl = process.env.NEXT_PUBLIC_SKOPAQ_API_URL || 'https://skopaq-api.skopaq.ai';
      const apiToken = process.env.NEXT_PUBLIC_ARGUS_API_TOKEN;

      const response = await fetch(`${apiUrl}/api/semantic-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify({
          error_text: errorText,
          limit,
          min_score: minScore,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search patterns');
      }

      const data = await response.json();
      return data as {
        success: boolean;
        query: string;
        patterns: SimilarPattern[];
        count: number;
        hasSolutions: boolean;
      };
    },
  });
}

// ============================================================================
// AUTONOMOUS QUALITY LOOP
// ============================================================================

export function useAutonomousLoop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      url,
      stages = ['discovery', 'visual', 'generation', 'verification', 'pr', 'learning'],
      discoveryDepth = 2,
      autoCreatePr = false,
      githubConfig,
    }: {
      projectId: string;
      url: string;
      stages?: string[];
      discoveryDepth?: number;
      autoCreatePr?: boolean;
      githubConfig?: {
        owner: string;
        repo: string;
        base_branch?: string;
        test_directory?: string;
      };
    }) => {
      const apiUrl = process.env.NEXT_PUBLIC_SKOPAQ_API_URL || 'https://skopaq-api.skopaq.ai';
      const apiToken = process.env.NEXT_PUBLIC_ARGUS_API_TOKEN;

      const response = await fetch(`${apiUrl}/api/autonomous-loop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify({
          project_id: projectId,
          url,
          stages,
          discovery_depth: discoveryDepth,
          auto_create_pr: autoCreatePr,
          github_config: githubConfig,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to run autonomous loop');
      }

      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-events'] });
      queryClient.invalidateQueries({ queryKey: ['generated-tests'] });
      queryClient.invalidateQueries({ queryKey: ['risk-scores'] });
      queryClient.invalidateQueries({ queryKey: ['ai-quality-score'] });
    },
  });
}

// ============================================================================
// PREDICTIVE QUALITY
// ============================================================================

export interface PredictedRisk {
  entity: string;
  entity_type: string;
  prediction_score: number;
  predicted_timeframe: string;
  risk_factors: string[];
  recommendations: string[];
  similar_past_failures: number;
  confidence: number;
}

export interface PredictiveQualityResponse {
  success: boolean;
  project_id: string;
  timeframe: string;
  predictions: PredictedRisk[];
  summary: {
    total_analyzed: number;
    total_predicted: number;
    high_risk: number;
    medium_risk: number;
    increasing_trends: number;
  };
  ai_summary: string | null;
  data_quality: {
    events_analyzed: number;
    risk_scores_available: number;
    patterns_learned: number;
  };
  calculated_at: string;
}

export function usePredictiveQuality(projectId: string | null, timeframe: string = '7d') {
  return useQuery({
    queryKey: ['predictive-quality', projectId, timeframe],
    queryFn: async () => {
      if (!projectId) return null;

      const apiUrl = process.env.NEXT_PUBLIC_SKOPAQ_API_URL || 'https://skopaq-api.skopaq.ai';
      const apiToken = process.env.NEXT_PUBLIC_ARGUS_API_TOKEN;

      const response = await fetch(
        `${apiUrl}/api/predictive-quality?project_id=${projectId}&timeframe=${timeframe}`,
        {
          headers: {
            ...(apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}),
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch predictions');
      }

      const data = await response.json();
      return data as PredictiveQualityResponse;
    },
    enabled: !!projectId,
    refetchInterval: 300000, // Refetch every 5 minutes
  });
}

// ============================================================================
// CROSS-DOMAIN CORRELATIONS
// ============================================================================

/**
 * A single step in a cross-domain correlation chain.
 * Shows the causal path from root cause to visible failure.
 */
export interface CorrelationChainStep {
  domain: 'api' | 'ui' | 'db' | 'infra' | 'performance' | 'security';
  event_type: string;
  description: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  metric_value?: number;
  metric_unit?: string;
  related_test_ids?: string[];
}

/**
 * A complete correlation chain showing how events across domains are connected.
 */
export interface CrossDomainCorrelation {
  id: string;
  chain_id: string;
  title: string;
  summary: string;
  root_cause_domain: 'api' | 'ui' | 'db' | 'infra' | 'performance' | 'security';
  impact_domain: 'api' | 'ui' | 'db' | 'infra' | 'performance' | 'security';
  chain_steps: CorrelationChainStep[];
  confidence: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affected_test_count: number;
  first_detected_at: string;
  last_occurred_at: string;
  occurrence_count: number;
  is_resolved: boolean;
  suggested_fixes: string[];
}

/**
 * Response from cross-domain correlations API.
 */
export interface CrossDomainCorrelationsResponse {
  correlations: CrossDomainCorrelation[];
  total_count: number;
  domain_breakdown: {
    api: number;
    ui: number;
    db: number;
    infra: number;
    performance: number;
    security: number;
  };
  top_chain_patterns: Array<{
    pattern: string;
    count: number;
    avg_impact_score: number;
  }>;
  analysis_summary: string;
  generated_at: string;
}

/**
 * Hook to fetch cross-domain correlations for a project.
 * Identifies causal chains across test domains (e.g., "API latency spike -> UI timeout -> test failure").
 */
export function useCrossDomainCorrelations(projectId: string | null, days: number = 7) {
  return useQuery({
    queryKey: ['cross-domain-correlations', projectId, days],
    queryFn: async () => {
      if (!projectId) return null;

      const supabase = getSupabase();

      // Fetch test results with their domains
      const { data: testRuns } = await supabase
        .from('test_runs')
        .select('id')
        .eq('project_id', projectId)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (!testRuns || testRuns.length === 0) {
        return {
          correlations: [],
          total_count: 0,
          domain_breakdown: { api: 0, ui: 0, db: 0, infra: 0, performance: 0, security: 0 },
          top_chain_patterns: [],
          analysis_summary: 'No test data available for correlation analysis.',
          generated_at: new Date().toISOString(),
        } as CrossDomainCorrelationsResponse;
      }

      const runIds = testRuns.map((r: { id: string }) => r.id);

      // Get test results with failures
      const { data: results } = await supabase
        .from('test_results')
        .select('*')
        .in('test_run_id', runIds)
        .order('created_at', { ascending: false });

      if (!results || results.length === 0) {
        return {
          correlations: [],
          total_count: 0,
          domain_breakdown: { api: 0, ui: 0, db: 0, infra: 0, performance: 0, security: 0 },
          top_chain_patterns: [],
          analysis_summary: 'No test results available for correlation analysis.',
          generated_at: new Date().toISOString(),
        } as CrossDomainCorrelationsResponse;
      }

      // Analyze patterns to detect cross-domain correlations
      const correlations: CrossDomainCorrelation[] = [];
      const domainCounts = { api: 0, ui: 0, db: 0, infra: 0, performance: 0, security: 0 };
      const patternCounts: Record<string, { count: number; totalImpact: number }> = {};

      // Group failures by time windows to detect correlations
      const failedResults = results.filter((r: { status: string }) => r.status === 'failed');
      const timeWindows: Record<string, Array<{ result: { id: string; error_message?: string; created_at: string; test_id?: string; duration_ms?: number }; domain: string }>> = {};

      failedResults.forEach((result: { id: string; error_message?: string; created_at: string; test_id?: string; duration_ms?: number }) => {
        const errorMsg = (result.error_message || '').toLowerCase();
        const timestamp = new Date(result.created_at);
        const windowKey = `${timestamp.toISOString().slice(0, 13)}`; // Hour-based windows

        if (!timeWindows[windowKey]) {
          timeWindows[windowKey] = [];
        }

        // Determine domain based on error patterns
        let domain = 'ui';
        if (errorMsg.includes('api') || errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('request') || errorMsg.includes('response')) {
          domain = 'api';
        } else if (errorMsg.includes('database') || errorMsg.includes('query') || errorMsg.includes('sql') || errorMsg.includes('connection pool')) {
          domain = 'db';
        } else if (errorMsg.includes('timeout') || errorMsg.includes('slow') || errorMsg.includes('latency') || errorMsg.includes('performance')) {
          domain = 'performance';
        } else if (errorMsg.includes('auth') || errorMsg.includes('permission') || errorMsg.includes('token') || errorMsg.includes('security')) {
          domain = 'security';
        } else if (errorMsg.includes('memory') || errorMsg.includes('cpu') || errorMsg.includes('disk') || errorMsg.includes('container')) {
          domain = 'infra';
        }

        domainCounts[domain as keyof typeof domainCounts]++;
        timeWindows[windowKey].push({ result, domain });
      });

      // Detect cross-domain correlations (failures in different domains within the same time window)
      Object.entries(timeWindows).forEach(([windowKey, windowResults]) => {
        const domains = Array.from(new Set(windowResults.map(wr => wr.domain)));

        if (domains.length >= 2 && windowResults.length >= 2) {
          // Found a potential cross-domain correlation
          const chainSteps: CorrelationChainStep[] = windowResults
            .sort((a, b) => new Date(a.result.created_at).getTime() - new Date(b.result.created_at).getTime())
            .map((wr) => ({
              domain: wr.domain as CorrelationChainStep['domain'],
              event_type: 'test_failure',
              description: wr.result.error_message?.slice(0, 200) || 'Unknown error',
              timestamp: wr.result.created_at,
              severity: 'high' as const,
              related_test_ids: wr.result.test_id ? [wr.result.test_id] : [],
            }));

          // Determine root cause (usually performance/infra/db issues cascade to api/ui)
          const rootCauseDomain = chainSteps[0].domain;
          const impactDomain = chainSteps[chainSteps.length - 1].domain;

          const patternKey = `${rootCauseDomain} -> ${impactDomain}`;
          if (!patternCounts[patternKey]) {
            patternCounts[patternKey] = { count: 0, totalImpact: 0 };
          }
          patternCounts[patternKey].count++;
          patternCounts[patternKey].totalImpact += windowResults.length;

          const correlation: CrossDomainCorrelation = {
            id: `corr-${windowKey}`,
            chain_id: `chain-${windowKey}`,
            title: `${capitalize(rootCauseDomain)} issue cascading to ${capitalize(impactDomain)} failures`,
            summary: `Detected ${windowResults.length} correlated failures across ${domains.length} domains within the same time window.`,
            root_cause_domain: rootCauseDomain as CrossDomainCorrelation['root_cause_domain'],
            impact_domain: impactDomain as CrossDomainCorrelation['impact_domain'],
            chain_steps: chainSteps,
            confidence: Math.min(0.9, 0.5 + (windowResults.length * 0.1)),
            severity: windowResults.length >= 5 ? 'critical' : windowResults.length >= 3 ? 'high' : 'medium',
            affected_test_count: windowResults.length,
            first_detected_at: chainSteps[0].timestamp,
            last_occurred_at: chainSteps[chainSteps.length - 1].timestamp,
            occurrence_count: 1,
            is_resolved: false,
            suggested_fixes: generateSuggestedFixes(rootCauseDomain, impactDomain),
          };

          correlations.push(correlation);
        }
      });

      // Sort by severity and recency
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      correlations.sort((a, b) => {
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.last_occurred_at).getTime() - new Date(a.last_occurred_at).getTime();
      });

      // Calculate top patterns
      const topPatterns = Object.entries(patternCounts)
        .map(([pattern, data]) => ({
          pattern,
          count: data.count,
          avg_impact_score: data.totalImpact / data.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        correlations: correlations.slice(0, 20), // Top 20 correlations
        total_count: correlations.length,
        domain_breakdown: domainCounts,
        top_chain_patterns: topPatterns,
        analysis_summary: correlations.length > 0
          ? `Found ${correlations.length} cross-domain correlations affecting ${Object.values(domainCounts).reduce((a, b) => a + b, 0)} test failures across ${days} days.`
          : 'No cross-domain correlations detected in the analysis period.',
        generated_at: new Date().toISOString(),
      } as CrossDomainCorrelationsResponse;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 300000, // Refetch every 5 minutes
  });
}

// Helper function to capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper function to generate suggested fixes based on domain correlation
function generateSuggestedFixes(rootDomain: string, impactDomain: string): string[] {
  const fixes: string[] = [];

  if (rootDomain === 'performance') {
    fixes.push('Add performance monitoring and alerts for slow responses');
    fixes.push('Implement request timeouts and circuit breakers');
    fixes.push('Consider caching frequently accessed data');
  }
  if (rootDomain === 'api') {
    fixes.push('Add API health checks and retry logic');
    fixes.push('Implement request/response logging for debugging');
    fixes.push('Consider API rate limiting to prevent cascading failures');
  }
  if (rootDomain === 'db') {
    fixes.push('Monitor database connection pool utilization');
    fixes.push('Add query timeout limits');
    fixes.push('Consider read replicas for load distribution');
  }
  if (rootDomain === 'infra') {
    fixes.push('Review resource limits and scaling policies');
    fixes.push('Add infrastructure monitoring and alerting');
    fixes.push('Implement graceful degradation patterns');
  }
  if (impactDomain === 'ui') {
    fixes.push('Add loading states and error boundaries in UI');
    fixes.push('Implement graceful error handling for backend failures');
  }

  return fixes.length > 0 ? fixes : ['Review test logs for detailed failure analysis'];
}

// ============================================================================
// PROACTIVE ALERTS
// ============================================================================

/**
 * A proactive alert predicting potential issues before they cause failures.
 */
export interface ProactiveAlert {
  id: string;
  alert_type: 'trend' | 'anomaly' | 'prediction' | 'threshold';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  domain: 'api' | 'ui' | 'db' | 'infra' | 'performance' | 'security' | 'test_health';
  confidence: number;
  predicted_impact: string;
  time_to_impact: string;
  trend_data: Array<{
    date: string;
    value: number;
    threshold?: number;
  }>;
  affected_tests: string[];
  recommended_actions: string[];
  created_at: string;
  acknowledged: boolean;
  acknowledged_at?: string;
}

/**
 * Response from proactive alerts API.
 */
export interface ProactiveAlertsResponse {
  alerts: ProactiveAlert[];
  total_count: number;
  critical_count: number;
  by_domain: Record<string, number>;
  by_type: Record<string, number>;
  analysis_summary: string;
  generated_at: string;
}

/**
 * Hook to fetch proactive alerts for a project.
 * Analyzes trends and patterns to predict issues before they cause test failures.
 */
export function useProactiveAlerts(projectId: string | null, days: number = 14) {
  return useQuery({
    queryKey: ['proactive-alerts', projectId, days],
    queryFn: async () => {
      if (!projectId) return null;

      const supabase = getSupabase();

      // Fetch recent test data for trend analysis
      const { data: testRuns } = await supabase
        .from('test_runs')
        .select('id, created_at, status, duration_ms')
        .eq('project_id', projectId)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (!testRuns || testRuns.length < 3) {
        return {
          alerts: [],
          total_count: 0,
          critical_count: 0,
          by_domain: {},
          by_type: {},
          analysis_summary: 'Insufficient data for trend analysis. Run more tests to enable proactive alerts.',
          generated_at: new Date().toISOString(),
        } as ProactiveAlertsResponse;
      }

      const runIds = testRuns.map((r: { id: string }) => r.id);

      // Get test results for detailed analysis
      const { data: results } = await supabase
        .from('test_results')
        .select('*')
        .in('test_run_id', runIds)
        .order('created_at', { ascending: true });

      const alerts: ProactiveAlert[] = [];
      const byDomain: Record<string, number> = {};
      const byType: Record<string, number> = {};

      // 1. Analyze failure rate trend
      const dailyFailureRates = analyzeDailyFailureRates(testRuns as Array<{ id: string; created_at: string; status: string }>, results || []);
      const failureTrendAlert = detectFailureTrendAlert(dailyFailureRates);
      if (failureTrendAlert) {
        alerts.push(failureTrendAlert);
        byDomain[failureTrendAlert.domain] = (byDomain[failureTrendAlert.domain] || 0) + 1;
        byType[failureTrendAlert.alert_type] = (byType[failureTrendAlert.alert_type] || 0) + 1;
      }

      // 2. Analyze test duration trends (performance degradation)
      const durationTrendAlert = detectDurationTrendAlert(testRuns as Array<{ id: string; created_at: string; duration_ms?: number }>);
      if (durationTrendAlert) {
        alerts.push(durationTrendAlert);
        byDomain[durationTrendAlert.domain] = (byDomain[durationTrendAlert.domain] || 0) + 1;
        byType[durationTrendAlert.alert_type] = (byType[durationTrendAlert.alert_type] || 0) + 1;
      }

      // 3. Detect flakiness increase
      const flakinessAlert = detectFlakinessAlert(results || []);
      if (flakinessAlert) {
        alerts.push(flakinessAlert);
        byDomain[flakinessAlert.domain] = (byDomain[flakinessAlert.domain] || 0) + 1;
        byType[flakinessAlert.alert_type] = (byType[flakinessAlert.alert_type] || 0) + 1;
      }

      // 4. Detect error pattern emergence
      const errorPatternAlerts = detectErrorPatternAlerts(results || []);
      errorPatternAlerts.forEach(alert => {
        alerts.push(alert);
        byDomain[alert.domain] = (byDomain[alert.domain] || 0) + 1;
        byType[alert.alert_type] = (byType[alert.alert_type] || 0) + 1;
      });

      // Sort by severity
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      const criticalCount = alerts.filter(a => a.severity === 'critical').length;

      return {
        alerts,
        total_count: alerts.length,
        critical_count: criticalCount,
        by_domain: byDomain,
        by_type: byType,
        analysis_summary: alerts.length > 0
          ? `Detected ${alerts.length} proactive alerts (${criticalCount} critical) based on ${days}-day trend analysis.`
          : 'No concerning trends detected. Test suite health appears stable.',
        generated_at: new Date().toISOString(),
      } as ProactiveAlertsResponse;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 300000, // Refetch every 5 minutes
  });
}

// Helper function to analyze daily failure rates
function analyzeDailyFailureRates(
  testRuns: Array<{ id: string; created_at: string; status: string }>,
  results: Array<{ test_run_id: string; status: string }>
): Array<{ date: string; rate: number; total: number }> {
  const dailyStats: Record<string, { passed: number; failed: number }> = {};

  results.forEach((result) => {
    const run = testRuns.find(r => r.id === result.test_run_id);
    if (!run) return;

    const date = run.created_at.slice(0, 10);
    if (!dailyStats[date]) {
      dailyStats[date] = { passed: 0, failed: 0 };
    }

    if (result.status === 'passed') {
      dailyStats[date].passed++;
    } else if (result.status === 'failed') {
      dailyStats[date].failed++;
    }
  });

  return Object.entries(dailyStats)
    .map(([date, stats]) => ({
      date,
      rate: stats.failed / (stats.passed + stats.failed) * 100,
      total: stats.passed + stats.failed,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Helper function to detect failure rate trend alert
function detectFailureTrendAlert(
  dailyRates: Array<{ date: string; rate: number; total: number }>
): ProactiveAlert | null {
  if (dailyRates.length < 3) return null;

  // Calculate trend using simple linear regression
  const recentRates = dailyRates.slice(-7);
  const avgRate = recentRates.reduce((sum, d) => sum + d.rate, 0) / recentRates.length;

  // Check if rate is increasing
  const firstHalf = recentRates.slice(0, Math.floor(recentRates.length / 2));
  const secondHalf = recentRates.slice(Math.floor(recentRates.length / 2));

  const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.rate, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.rate, 0) / secondHalf.length;

  const increaseRate = ((secondHalfAvg - firstHalfAvg) / (firstHalfAvg || 1)) * 100;

  if (increaseRate > 20 && avgRate > 10) {
    return {
      id: `alert-failure-trend-${Date.now()}`,
      alert_type: 'trend',
      severity: avgRate > 30 ? 'critical' : increaseRate > 50 ? 'high' : 'medium',
      title: 'Test Failure Rate Trending Upward',
      description: `Test failure rate has increased by ${increaseRate.toFixed(0)}% over the past week, now averaging ${avgRate.toFixed(1)}%.`,
      domain: 'test_health',
      confidence: Math.min(0.9, 0.5 + (increaseRate / 100)),
      predicted_impact: `If this trend continues, failure rate could exceed ${(avgRate * 1.5).toFixed(0)}% within the next week.`,
      time_to_impact: '3-7 days',
      trend_data: recentRates.map(d => ({ date: d.date, value: d.rate, threshold: 20 })),
      affected_tests: [],
      recommended_actions: [
        'Review recent code changes for potential regressions',
        'Check for infrastructure or environment issues',
        'Analyze failure patterns to identify root causes',
        'Consider running targeted test investigations',
      ],
      created_at: new Date().toISOString(),
      acknowledged: false,
    };
  }

  return null;
}

// Helper function to detect duration trend alert
function detectDurationTrendAlert(
  testRuns: Array<{ id: string; created_at: string; duration_ms?: number }>
): ProactiveAlert | null {
  const runsWithDuration = testRuns.filter(r => r.duration_ms && r.duration_ms > 0);
  if (runsWithDuration.length < 5) return null;

  // Calculate average duration trend
  const recentRuns = runsWithDuration.slice(-10);
  const firstHalf = recentRuns.slice(0, 5);
  const secondHalf = recentRuns.slice(-5);

  const firstHalfAvg = firstHalf.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / secondHalf.length;

  const increasePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

  if (increasePercent > 30) {
    return {
      id: `alert-duration-trend-${Date.now()}`,
      alert_type: 'trend',
      severity: increasePercent > 100 ? 'high' : 'medium',
      title: 'Test Suite Duration Increasing',
      description: `Test execution time has increased by ${increasePercent.toFixed(0)}% recently, from ${(firstHalfAvg / 1000).toFixed(1)}s to ${(secondHalfAvg / 1000).toFixed(1)}s average.`,
      domain: 'performance',
      confidence: Math.min(0.85, 0.5 + (increasePercent / 200)),
      predicted_impact: 'Longer test execution times can slow down CI/CD pipelines and delay deployments.',
      time_to_impact: 'Immediate',
      trend_data: recentRuns.map(r => ({
        date: r.created_at.slice(0, 10),
        value: (r.duration_ms || 0) / 1000,
      })),
      affected_tests: [],
      recommended_actions: [
        'Identify slow-running tests and optimize them',
        'Check for increased network latency or API response times',
        'Consider parallel test execution to offset duration increase',
        'Review for unnecessary waits or sleeps in tests',
      ],
      created_at: new Date().toISOString(),
      acknowledged: false,
    };
  }

  return null;
}

// Helper function to detect flakiness alert
function detectFlakinessAlert(
  results: Array<{ test_id?: string; status: string; created_at: string }>
): ProactiveAlert | null {
  // Group results by test
  const testResults: Record<string, { passed: number; failed: number }> = {};

  results.forEach(result => {
    if (!result.test_id) return;
    if (!testResults[result.test_id]) {
      testResults[result.test_id] = { passed: 0, failed: 0 };
    }
    if (result.status === 'passed') {
      testResults[result.test_id].passed++;
    } else if (result.status === 'failed') {
      testResults[result.test_id].failed++;
    }
  });

  // Count flaky tests (tests with both passes and failures)
  const flakyTests = Object.entries(testResults)
    .filter(([, stats]) => stats.passed > 0 && stats.failed > 0 && (stats.passed + stats.failed) >= 3)
    .map(([testId, stats]) => ({
      testId,
      flakinessScore: (stats.failed / (stats.passed + stats.failed)) * 100,
    }));

  if (flakyTests.length >= 3) {
    const avgFlakiness = flakyTests.reduce((sum, t) => sum + t.flakinessScore, 0) / flakyTests.length;

    return {
      id: `alert-flakiness-${Date.now()}`,
      alert_type: 'anomaly',
      severity: flakyTests.length >= 10 ? 'high' : 'medium',
      title: 'Multiple Flaky Tests Detected',
      description: `${flakyTests.length} tests are showing inconsistent behavior with an average flakiness score of ${avgFlakiness.toFixed(0)}%.`,
      domain: 'test_health',
      confidence: Math.min(0.9, 0.6 + (flakyTests.length * 0.03)),
      predicted_impact: 'Flaky tests reduce confidence in test results and can mask real issues.',
      time_to_impact: 'Ongoing',
      trend_data: [],
      affected_tests: flakyTests.slice(0, 10).map(t => t.testId),
      recommended_actions: [
        'Review flaky tests for timing-related issues',
        'Add explicit waits instead of implicit timeouts',
        'Consider isolating tests with shared state issues',
        'Implement retry strategies for legitimately flaky scenarios',
      ],
      created_at: new Date().toISOString(),
      acknowledged: false,
    };
  }

  return null;
}

// Helper function to detect error pattern alerts
function detectErrorPatternAlerts(
  results: Array<{ status: string; error_message?: string; created_at: string }>
): ProactiveAlert[] {
  const alerts: ProactiveAlert[] = [];
  const errorPatterns: Record<string, { count: number; firstSeen: string; lastSeen: string }> = {};

  // Analyze error messages for patterns
  results
    .filter(r => r.status === 'failed' && r.error_message)
    .forEach(result => {
      const errorMsg = (result.error_message || '').toLowerCase();

      // Detect specific concerning patterns
      const patterns = [
        { pattern: 'connection refused', domain: 'infra' as const },
        { pattern: 'out of memory', domain: 'infra' as const },
        { pattern: 'rate limit', domain: 'api' as const },
        { pattern: 'ssl', domain: 'security' as const },
        { pattern: 'certificate', domain: 'security' as const },
        { pattern: 'unauthorized', domain: 'security' as const },
        { pattern: 'forbidden', domain: 'security' as const },
        { pattern: 'database connection', domain: 'db' as const },
        { pattern: 'query timeout', domain: 'db' as const },
      ];

      patterns.forEach(({ pattern, domain }) => {
        if (errorMsg.includes(pattern)) {
          const key = `${pattern}|${domain}`;
          if (!errorPatterns[key]) {
            errorPatterns[key] = {
              count: 0,
              firstSeen: result.created_at,
              lastSeen: result.created_at,
            };
          }
          errorPatterns[key].count++;
          errorPatterns[key].lastSeen = result.created_at;
        }
      });
    });

  // Create alerts for emerging patterns
  Object.entries(errorPatterns).forEach(([key, data]) => {
    if (data.count >= 3) {
      const [pattern, domain] = key.split('|');

      alerts.push({
        id: `alert-pattern-${pattern.replace(/\s+/g, '-')}-${Date.now()}`,
        alert_type: 'prediction',
        severity: data.count >= 10 ? 'critical' : data.count >= 5 ? 'high' : 'medium',
        title: `Recurring "${capitalize(pattern)}" Errors`,
        description: `Detected ${data.count} occurrences of "${pattern}" errors, indicating a potential systemic issue.`,
        domain: domain as ProactiveAlert['domain'],
        confidence: Math.min(0.9, 0.5 + (data.count * 0.05)),
        predicted_impact: `This error pattern is likely to cause more failures if not addressed.`,
        time_to_impact: '1-3 days',
        trend_data: [],
        affected_tests: [],
        recommended_actions: getRecommendationsForPattern(pattern),
        created_at: new Date().toISOString(),
        acknowledged: false,
      });
    }
  });

  return alerts;
}

// Helper function to get recommendations for specific error patterns
function getRecommendationsForPattern(pattern: string): string[] {
  const recommendations: Record<string, string[]> = {
    'connection refused': [
      'Verify target service is running and accessible',
      'Check network configuration and firewall rules',
      'Review service health checks and monitoring',
    ],
    'out of memory': [
      'Increase memory allocation for test environment',
      'Check for memory leaks in application code',
      'Consider reducing test parallelism',
    ],
    'rate limit': [
      'Implement request throttling in tests',
      'Add retry logic with exponential backoff',
      'Consider using mock APIs for rate-limited endpoints',
    ],
    'ssl': [
      'Verify SSL certificate validity',
      'Check for certificate chain issues',
      'Update certificate if expired',
    ],
    'certificate': [
      'Review certificate expiration dates',
      'Ensure certificate chain is complete',
      'Check certificate configuration in environment',
    ],
    'unauthorized': [
      'Verify authentication credentials are current',
      'Check token refresh logic',
      'Review access permissions for test accounts',
    ],
    'forbidden': [
      'Review access control configuration',
      'Verify test user has necessary permissions',
      'Check for IP-based restrictions',
    ],
    'database connection': [
      'Check database server availability',
      'Review connection pool configuration',
      'Verify database credentials',
    ],
    'query timeout': [
      'Optimize slow database queries',
      'Add query indexes where needed',
      'Consider increasing timeout limits',
    ],
  };

  return recommendations[pattern] || ['Review error logs for more details', 'Consult with the development team'];
}

// ============================================================================
// EXECUTIVE SUMMARY
// ============================================================================

/**
 * Executive summary data for weekly reports.
 */
export interface ExecutiveSummary {
  period: {
    start: string;
    end: string;
    days: number;
  };
  overall_health: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  health_score: number;
  key_metrics: {
    total_tests_run: number;
    pass_rate: number;
    pass_rate_change: number;
    avg_duration_ms: number;
    duration_change_percent: number;
    coverage_percent: number;
    critical_issues: number;
  };
  top_issues: Array<{
    title: string;
    severity: string;
    impact: string;
    status: 'new' | 'ongoing' | 'improving' | 'resolved';
  }>;
  cross_domain_summary: {
    total_correlations: number;
    most_affected_domain: string;
    top_chain_pattern: string;
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    expected_impact: string;
  }>;
  generated_at: string;
}

/**
 * Hook to generate an executive summary for a project.
 * Combines cross-domain correlations, proactive alerts, and quality metrics.
 */
export function useExecutiveSummary(projectId: string | null, days: number = 7) {
  const correlationsQuery = useCrossDomainCorrelations(projectId, days);
  const alertsQuery = useProactiveAlerts(projectId, days);
  const qualityQuery = useQualityIntelligenceStats(projectId);

  return useQuery({
    queryKey: ['executive-summary', projectId, days],
    queryFn: async () => {
      if (!projectId) return null;

      const supabase = getSupabase();

      // Fetch test run stats
      const endDate = new Date();
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data: testRuns } = await supabase
        .from('test_runs')
        .select('id, status, duration_ms, created_at')
        .eq('project_id', projectId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      const runs = testRuns || [];
      const runIds = runs.map((r: { id: string }) => r.id);

      // Get test results
      const { data: results } = await supabase
        .from('test_results')
        .select('status, duration_ms')
        .in('test_run_id', runIds.length > 0 ? runIds : ['none']);

      const testResults = results || [];
      const totalTests = testResults.length;
      const passedTests = testResults.filter((r: { status: string }) => r.status === 'passed').length;
      const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
      const avgDuration = runs.reduce((sum: number, r: { duration_ms?: number }) => sum + (r.duration_ms || 0), 0) / (runs.length || 1);

      // Get correlations and alerts data
      const correlations = correlationsQuery.data;
      const alerts = alertsQuery.data;
      const quality = qualityQuery.data;

      // Calculate health score
      let healthScore = 100;
      if (passRate < 50) healthScore -= 40;
      else if (passRate < 70) healthScore -= 25;
      else if (passRate < 85) healthScore -= 15;
      else if (passRate < 95) healthScore -= 5;

      if (alerts?.critical_count) {
        healthScore -= alerts.critical_count * 10;
      }
      if (correlations?.correlations.filter(c => c.severity === 'critical').length) {
        healthScore -= 15;
      }

      healthScore = Math.max(0, Math.min(100, healthScore));

      const overallHealth: ExecutiveSummary['overall_health'] =
        healthScore >= 90 ? 'excellent' :
        healthScore >= 75 ? 'good' :
        healthScore >= 50 ? 'fair' :
        healthScore >= 25 ? 'poor' : 'critical';

      // Build top issues list
      const topIssues: ExecutiveSummary['top_issues'] = [];

      if (correlations?.correlations) {
        correlations.correlations.slice(0, 3).forEach(c => {
          topIssues.push({
            title: c.title,
            severity: c.severity,
            impact: `${c.affected_test_count} tests affected`,
            status: c.occurrence_count > 1 ? 'ongoing' : 'new',
          });
        });
      }

      if (alerts?.alerts) {
        alerts.alerts.slice(0, 2).forEach(a => {
          topIssues.push({
            title: a.title,
            severity: a.severity,
            impact: a.predicted_impact,
            status: 'new',
          });
        });
      }

      // Build recommendations
      const recommendations: ExecutiveSummary['recommendations'] = [];

      if (passRate < 80) {
        recommendations.push({
          priority: 'high',
          action: 'Investigate and fix failing tests to improve pass rate',
          expected_impact: `Could improve pass rate by up to ${(80 - passRate).toFixed(0)} percentage points`,
        });
      }

      if (correlations?.correlations && correlations.correlations.length > 0) {
        recommendations.push({
          priority: 'high',
          action: 'Address cross-domain issues to prevent cascading failures',
          expected_impact: `Could prevent ${correlations.correlations.reduce((sum, c) => sum + c.affected_test_count, 0)} test failures`,
        });
      }

      if (alerts?.alerts && alerts.alerts.some(a => a.alert_type === 'trend')) {
        recommendations.push({
          priority: 'medium',
          action: 'Review trending issues before they become critical',
          expected_impact: 'Proactive resolution reduces incident response time by 50%',
        });
      }

      return {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days,
        },
        overall_health: overallHealth,
        health_score: healthScore,
        key_metrics: {
          total_tests_run: totalTests,
          pass_rate: passRate,
          pass_rate_change: 0, // Would need historical data
          avg_duration_ms: avgDuration,
          duration_change_percent: 0, // Would need historical data
          coverage_percent: quality?.coverage_improvement_percent || 0,
          critical_issues: alerts?.critical_count || 0,
        },
        top_issues: topIssues,
        cross_domain_summary: {
          total_correlations: correlations?.total_count || 0,
          most_affected_domain: Object.entries(correlations?.domain_breakdown || {})
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none',
          top_chain_pattern: correlations?.top_chain_patterns[0]?.pattern || 'none',
        },
        recommendations,
        generated_at: new Date().toISOString(),
      } as ExecutiveSummary;
    },
    enabled: !!projectId && !correlationsQuery.isLoading && !alertsQuery.isLoading,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });
}
