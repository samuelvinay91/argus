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
  // Platform-specific costs
  vultr_cost?: number;
  railway_cost?: number;
  cloudflare_cost?: number;
  ai_cost?: number;
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
  cost_trend: number; // Percentage change vs last period
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

  const isLoading = costReport.isLoading || snapshot.isLoading;
  const error = costReport.error || snapshot.error;

  let data: CostOverviewData | null = null;

  if (costReport.data && snapshot.data) {
    data = {
      currentMonthCost: costReport.data.total_cost,
      projectedMonthCost: costReport.data.projected_monthly,
      totalNodes: snapshot.data.total_nodes,
      totalPods: snapshot.data.total_pods,
      // Platform-specific costs
      vultrCost: costReport.data.vultr_cost,
      railwayCost: costReport.data.railway_cost,
      cloudflareCost: costReport.data.cloudflare_cost,
      aiCost: costReport.data.ai_cost,
    };
  }

  return {
    data,
    isLoading,
    error,
    refetch: () => {
      costReport.refetch();
      snapshot.refetch();
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
      if (response.error) {
        throw new Error(response.error || 'Failed to fetch AI usage data');
      }
      if (!response.data) {
        // Return empty state instead of mock data
        return {
          models: [],
          features: [],
          total_cost: 0,
          total_requests: 0,
          total_input_tokens: 0,
          total_output_tokens: 0,
          period,
        };
      }
      // Transform API response to LLMUsageData format
      return transformUsageResponse(response.data, period);
    },
    enabled: isLoaded && isSignedIn,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}

// Note: Mock data removed - dashboard now shows real data only
// If API fails, an empty state is returned instead of fake data

// ============================================================================
// Data Layer Health Types and Hook
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latency_ms: number | null;
  message: string | null;
  details: Record<string, unknown> | null;
  checked_at: string;
}

export interface DataLayerHealth {
  overall_status: HealthStatus;
  components: ComponentHealth[];
  healthy_count: number;
  total_count: number;
  checked_at: string;
}

/**
 * Hook to fetch data layer health status
 * Checks: Redpanda, FalkorDB, Valkey, Cognee, Selenium Grid, Prometheus, Supabase
 */
export function useDataLayerHealth() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['health', 'data-layer'],
    queryFn: async (): Promise<DataLayerHealth> => {
      const response = await fetchJson<DataLayerHealth>('/api/v1/health/data-layer');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || {
        overall_status: 'unknown',
        components: [],
        healthy_count: 0,
        total_count: 0,
        checked_at: new Date().toISOString(),
      };
    },
    enabled: isLoaded && isSignedIn,
    refetchInterval: 30000, // Refresh every 30 seconds for health checks
    retry: 1, // Only retry once for health checks
  });
}

/**
 * Hook to fetch a single component's health
 */
export function useComponentHealth(component: string) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['health', 'component', component],
    queryFn: async (): Promise<ComponentHealth> => {
      const response = await fetchJson<ComponentHealth>(`/api/v1/health/data-layer/${component}`);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || {
        name: component,
        status: 'unknown',
        latency_ms: null,
        message: 'Failed to fetch health',
        details: null,
        checked_at: new Date().toISOString(),
      };
    },
    enabled: isLoaded && isSignedIn && !!component,
    refetchInterval: 15000, // Refresh individual component every 15 seconds
  });
}

// ============================================================================
// Monitoring Stack Types and Hooks
// ============================================================================

export interface GrafanaHealthResponse {
  status: 'healthy' | 'unhealthy';
  grafana?: {
    database?: string;
    version?: string;
  };
  error?: string;
}

export interface PrometheusHealthResponse {
  status: 'healthy' | 'unhealthy';
  prometheus?: string;
  error?: string;
}

export interface AlertManagerHealthResponse {
  status: 'healthy' | 'unhealthy';
  alertmanager?: string;
  error?: string;
}

export interface PrometheusTargetsResponse {
  status: string;
  data: {
    activeTargets: Array<{
      labels: Record<string, string>;
      health: 'up' | 'down' | 'unknown';
      lastScrape: string;
      lastError: string;
    }>;
    droppedTargets: Array<{
      discoveredLabels: Record<string, string>;
    }>;
  };
}

export interface PrometheusAlertsResponse {
  status: string;
  data: {
    alerts: Array<{
      labels: Record<string, string>;
      annotations: Record<string, string>;
      state: 'pending' | 'firing' | 'inactive';
      activeAt: string;
      value: string;
    }>;
  };
}

export interface AlertManagerAlertsResponse {
  alerts: Array<{
    labels: Record<string, string>;
    annotations: Record<string, string>;
    startsAt: string;
    endsAt: string;
    status: {
      state: 'active' | 'suppressed' | 'unprocessed';
      silencedBy: string[];
      inhibitedBy: string[];
    };
  }>;
}

export interface GrafanaDashboard {
  uid: string;
  title: string;
  url: string;
  tags: string[];
}

export interface GrafanaDashboardsResponse {
  dashboards: GrafanaDashboard[];
}

/**
 * Hook to fetch Grafana health status
 */
export function useGrafanaHealth() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['monitoring', 'grafana', 'health'],
    queryFn: async (): Promise<GrafanaHealthResponse> => {
      const response = await fetchJson<GrafanaHealthResponse>('/api/v1/monitoring/grafana/health');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || { status: 'unhealthy', error: 'No data returned' };
    },
    enabled: isLoaded && isSignedIn,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1,
  });
}

/**
 * Hook to fetch Prometheus health status
 */
export function usePrometheusHealth() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['monitoring', 'prometheus', 'health'],
    queryFn: async (): Promise<PrometheusHealthResponse> => {
      const response = await fetchJson<PrometheusHealthResponse>('/api/v1/monitoring/prometheus/health');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || { status: 'unhealthy', error: 'No data returned' };
    },
    enabled: isLoaded && isSignedIn,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1,
  });
}

/**
 * Hook to fetch AlertManager health status
 */
export function useAlertManagerHealth() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['monitoring', 'alertmanager', 'health'],
    queryFn: async (): Promise<AlertManagerHealthResponse> => {
      const response = await fetchJson<AlertManagerHealthResponse>('/api/v1/monitoring/alertmanager/health');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || { status: 'unhealthy', error: 'No data returned' };
    },
    enabled: isLoaded && isSignedIn,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1,
  });
}

/**
 * Hook to fetch Prometheus targets (scrape endpoints)
 */
export function usePrometheusTargets() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['monitoring', 'prometheus', 'targets'],
    queryFn: async (): Promise<PrometheusTargetsResponse> => {
      const response = await fetchJson<PrometheusTargetsResponse>('/api/v1/monitoring/prometheus/targets');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || { status: 'error', data: { activeTargets: [], droppedTargets: [] } };
    },
    enabled: isLoaded && isSignedIn,
    refetchInterval: 60000, // Refresh every minute
    retry: 1,
  });
}

/**
 * Hook to fetch Prometheus alerts
 */
export function usePrometheusAlerts() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['monitoring', 'prometheus', 'alerts'],
    queryFn: async (): Promise<PrometheusAlertsResponse> => {
      const response = await fetchJson<PrometheusAlertsResponse>('/api/v1/monitoring/prometheus/alerts');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || { status: 'error', data: { alerts: [] } };
    },
    enabled: isLoaded && isSignedIn,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1,
  });
}

/**
 * Hook to fetch AlertManager alerts
 */
export function useAlertManagerAlerts() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['monitoring', 'alertmanager', 'alerts'],
    queryFn: async (): Promise<AlertManagerAlertsResponse> => {
      const response = await fetchJson<AlertManagerAlertsResponse>('/api/v1/monitoring/alertmanager/alerts');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || { alerts: [] };
    },
    enabled: isLoaded && isSignedIn,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1,
  });
}

/**
 * Hook to fetch Grafana dashboards list
 */
export function useGrafanaDashboards() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['monitoring', 'grafana', 'dashboards'],
    queryFn: async (): Promise<GrafanaDashboardsResponse> => {
      const response = await fetchJson<GrafanaDashboardsResponse>('/api/v1/monitoring/grafana/dashboards');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || { dashboards: [] };
    },
    enabled: isLoaded && isSignedIn,
    refetchInterval: 300000, // Refresh every 5 minutes (dashboards don't change often)
    retry: 1,
  });
}
