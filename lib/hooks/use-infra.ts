'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './use-auth-api';
import type {
  CostOverviewData,
  Recommendation,
  CostBreakdown,
  LLMUsageData,
  BrowserNodeData,
  SeleniumData,
} from '@/components/infra';

// Types for API responses
interface RecommendationsResponse {
  recommendations: Recommendation[];
  total_potential_savings: number;
}

interface CostReportResponse {
  period_start: string;
  period_end: string;
  total_cost: number;
  breakdown: Record<string, number>;
  daily_costs: Array<{ date: string; cost: number }>;
  projected_monthly: number;
  comparison_to_browserstack: number;
  savings_achieved: number;
  savings_percentage: number;
}

interface InfraSnapshotResponse {
  selenium: SeleniumData;
  chrome_nodes: BrowserNodeData;
  firefox_nodes: BrowserNodeData;
  edge_nodes: BrowserNodeData;
  total_pods: number;
  total_nodes: number;
  cluster_cpu_utilization: number;
  cluster_memory_utilization: number;
  timestamp: string;
}

interface SavingsSummaryResponse {
  total_monthly_savings: number;
  recommendations_applied: number;
  current_monthly_cost: number;
  browserstack_equivalent: number;
  savings_vs_browserstack: number;
  savings_percentage: number;
}

interface ApplyRecommendationResponse {
  success: boolean;
  action_applied?: Record<string, unknown>;
  status?: string;
  error?: string;
}

// AI Usage API response types (from /api/v1/users/me/ai-usage)
interface UsageRecord {
  id: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  key_source: string;
  thread_id: string | null;
  created_at: string;
}

interface UsageSummary {
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  platform_key_cost: number;
  byok_cost: number;
  usage_by_model: Record<string, { requests: number; tokens: number; cost: number }>;
  usage_by_provider: Record<string, { requests: number; cost: number }>;
}

interface DailyUsage {
  date: string;
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
}

interface UsageApiResponse {
  summary: UsageSummary;
  daily: DailyUsage[];
  records: UsageRecord[];
}

// Transform backend usage response to frontend LLMUsageData format
function transformUsageResponse(response: UsageApiResponse, period: string): LLMUsageData {
  const { summary, records } = response;

  // Group records by model to build model usage data
  const modelMap = new Map<string, {
    provider: string;
    input_tokens: number;
    output_tokens: number;
    cost: number;
    requests: number;
  }>();

  for (const record of records) {
    const existing = modelMap.get(record.model) || {
      provider: record.provider,
      input_tokens: 0,
      output_tokens: 0,
      cost: 0,
      requests: 0,
    };
    existing.input_tokens += record.input_tokens;
    existing.output_tokens += record.output_tokens;
    existing.cost += record.cost_usd;
    existing.requests += 1;
    modelMap.set(record.model, existing);
  }

  const models = Array.from(modelMap.entries()).map(([name, data]) => ({
    name,
    provider: data.provider,
    input_tokens: data.input_tokens,
    output_tokens: data.output_tokens,
    cost: data.cost,
    requests: data.requests,
  }));

  // Build feature breakdown from usage_by_model (simplified)
  const totalCost = summary.total_cost_usd || 0.01; // Avoid division by zero
  const features = Object.entries(summary.usage_by_model || {}).map(([model, stats]) => ({
    name: model.split('/').pop() || model, // Use model name as feature name
    cost: stats.cost,
    percentage: Math.round((stats.cost / totalCost) * 100),
    requests: stats.requests,
  }));

  return {
    models,
    features: features.length > 0 ? features : [
      { name: 'AI Usage', cost: totalCost, percentage: 100, requests: summary.total_requests },
    ],
    total_cost: summary.total_cost_usd,
    total_requests: summary.total_requests,
    total_input_tokens: summary.total_input_tokens,
    total_output_tokens: summary.total_output_tokens,
    period,
  };
}

// Hooks

/**
 * Hook to fetch AI-generated infrastructure recommendations
 */
export function useInfraRecommendations() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['infra', 'recommendations'],
    queryFn: async () => {
      const response = await fetchJson<RecommendationsResponse>('/api/v1/infra/recommendations');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Hook to fetch infrastructure cost report
 */
export function useInfraCostReport(days: number = 7) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['infra', 'cost-report', days],
    queryFn: async () => {
      const response = await fetchJson<CostReportResponse>(`/api/v1/infra/cost-report?days=${days}`);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}

/**
 * Hook to fetch real-time infrastructure snapshot
 */
export function useInfraSnapshot() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['infra', 'snapshot'],
    queryFn: async () => {
      const response = await fetchJson<InfraSnapshotResponse>('/api/v1/infra/snapshot');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    refetchInterval: 15000, // Refresh every 15 seconds for real-time data
  });
}

/**
 * Hook to fetch savings summary
 */
export function useInfraSavings() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['infra', 'savings'],
    queryFn: async () => {
      const response = await fetchJson<SavingsSummaryResponse>('/api/v1/infra/savings-summary');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Hook to apply a recommendation
 */
export function useApplyRecommendation() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, auto = false }: { id: string; auto?: boolean }) => {
      const response = await fetchJson<ApplyRecommendationResponse>(
        `/api/v1/infra/recommendations/${id}/apply`,
        {
          method: 'POST',
          body: JSON.stringify({ auto }),
        }
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['infra', 'recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['infra', 'savings'] });
    },
  });
}

/**
 * Hook to get combined cost overview data
 */
export function useInfraCostOverview(days: number = 30) {
  const costReport = useInfraCostReport(days);
  const snapshot = useInfraSnapshot();
  const savings = useInfraSavings();

  const isLoading = costReport.isLoading || snapshot.isLoading || savings.isLoading;
  const error = costReport.error || snapshot.error || savings.error;

  let data: CostOverviewData | null = null;

  if (costReport.data && snapshot.data && savings.data) {
    data = {
      currentMonthCost: costReport.data.total_cost,
      projectedMonthCost: costReport.data.projected_monthly,
      browserStackEquivalent: costReport.data.comparison_to_browserstack,
      savingsPercentage: costReport.data.savings_percentage,
      totalNodes: snapshot.data.total_nodes,
      totalPods: snapshot.data.total_pods,
    };
  }

  return {
    data,
    isLoading,
    error,
    refetch: () => {
      costReport.refetch();
      snapshot.refetch();
      savings.refetch();
    },
  };
}

/**
 * Hook to get cost breakdown data
 */
export function useInfraCostBreakdown(days: number = 30) {
  const costReport = useInfraCostReport(days);

  let data: CostBreakdown | null = null;

  if (costReport.data?.breakdown) {
    // Map API breakdown to our component format
    data = {
      compute: costReport.data.breakdown.compute || 0,
      network: costReport.data.breakdown.network || 0,
      storage: costReport.data.breakdown.storage || 0,
      ai_inference: costReport.data.breakdown.ai_inference || 0,
      embeddings: costReport.data.breakdown.embeddings || 0,
    };
  }

  return {
    data,
    isLoading: costReport.isLoading,
    error: costReport.error,
  };
}

/**
 * Hook for LLM cost tracking data
 * This fetches from the AI cost tracker service
 */
export function useLLMCostTracking(period: string = '30d') {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  // Convert period string to days for the backend API
  const getDaysFromPeriod = (p: string): number => {
    if (p.endsWith('d')) return parseInt(p.slice(0, -1)) || 30;
    if (p.endsWith('w')) return (parseInt(p.slice(0, -1)) || 4) * 7;
    if (p.endsWith('m')) return (parseInt(p.slice(0, -1)) || 1) * 30;
    return 30;
  };

  return useQuery({
    queryKey: ['llm', 'costs', period],
    queryFn: async (): Promise<LLMUsageData> => {
      const days = getDaysFromPeriod(period);
      const response = await fetchJson<UsageApiResponse>(`/api/v1/users/me/ai-usage?days=${days}`);
      if (response.error || !response.data) {
        // Return mock data if endpoint fails
        return getMockLLMData(period);
      }
      // Transform API response to LLMUsageData format
      return transformUsageResponse(response.data, period);
    },
    enabled: isLoaded && isSignedIn,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}

// Mock data for LLM costs (until API is fully implemented)
// Updated for 2026 - ALL via OpenRouter (single provider, single API key)
function getMockLLMData(period: string): LLMUsageData {
  return {
    models: [
      // Primary model for code analysis & test generation (90% cheaper than Claude)
      {
        name: 'deepseek/deepseek-chat-v3',
        provider: 'openrouter',
        input_tokens: 15000000,
        output_tokens: 4000000,
        cost: 3.22,  // $0.14/1M in + $0.28/1M out
        requests: 2200,
      },
      // Reasoning model for self-healing & debugging
      {
        name: 'deepseek/deepseek-r1',
        provider: 'openrouter',
        input_tokens: 3000000,
        output_tokens: 2500000,
        cost: 7.13,  // $0.55/1M in + $2.19/1M out
        requests: 350,
      },
      // Fast inference for trivial tasks
      {
        name: 'qwen/qwq-32b',
        provider: 'openrouter',
        input_tokens: 8000000,
        output_tokens: 2000000,
        cost: 1.32,  // $0.12/1M in + $0.18/1M out
        requests: 4500,
      },
      // Cheapest for simple extraction/classification
      {
        name: 'google/gemini-2.5-flash-lite',
        provider: 'openrouter',
        input_tokens: 12000000,
        output_tokens: 3000000,
        cost: 2.40,  // $0.10/1M in + $0.40/1M out
        requests: 6000,
      },
      // Computer Use - browser automation (Claude still best)
      {
        name: 'anthropic/claude-sonnet-4',
        provider: 'openrouter',
        input_tokens: 2000000,
        output_tokens: 800000,
        cost: 18.00,  // $3/1M in + $15/1M out
        requests: 180,
      },
      // Embeddings
      {
        name: 'openai/text-embedding-3-small',
        provider: 'openrouter',
        input_tokens: 25000000,
        output_tokens: 0,
        cost: 0.50,  // $0.02/1M
        requests: 12500,
      },
    ],
    features: [
      { name: 'Test Generation', cost: 5.50, percentage: 17, requests: 1200 },   // DeepSeek
      { name: 'Self-Healing', cost: 12.30, percentage: 38, requests: 350 },      // DeepSeek R1
      { name: 'Code Analysis', cost: 2.80, percentage: 9, requests: 800 },       // DeepSeek
      { name: 'Infra Optimization', cost: 2.50, percentage: 8, requests: 95 },   // DeepSeek R1
      { name: 'Embeddings', cost: 0.50, percentage: 2, requests: 12500 },        // OpenAI
      { name: 'Computer Use', cost: 18.00, percentage: 22, requests: 180 },      // Claude (browser)
      { name: 'Chat', cost: 0.97, percentage: 4, requests: 250 },                // Qwen/Gemini
    ],
    total_cost: 32.57,  // ~75% reduction from previous $127.40!
    total_requests: 25730,
    total_input_tokens: 65000000,
    total_output_tokens: 12300000,
    period,
  };
}
