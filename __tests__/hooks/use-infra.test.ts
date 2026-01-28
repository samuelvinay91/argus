/**
 * Tests for lib/hooks/use-infra.ts
 *
 * Tests infrastructure-related React Query hooks including:
 * - useInfraRecommendations
 * - useInfraCostReport
 * - useInfraSnapshot
 * - useInfraSavings
 * - useApplyRecommendation
 * - useInfraCostOverview
 * - useInfraCostBreakdown
 * - useLLMCostTracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useAuth: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    getToken: vi.fn().mockResolvedValue('mock-token'),
  })),
}));

// Mock useAuthApi hook
const mockFetchJson = vi.fn();
vi.mock('@/lib/hooks/use-auth-api', () => ({
  useAuthApi: vi.fn(() => ({
    fetchJson: mockFetchJson,
    isLoaded: true,
    isSignedIn: true,
  })),
}));

// Create a stable mock for organizationScopedFetch
const mockOrganizationScopedFetch = vi.fn();

vi.mock('@/lib/api', () => ({
  organizationScopedFetch: mockOrganizationScopedFetch,
}));

describe('use-infra', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  // Mock response data
  const mockRecommendationsResponse = {
    recommendations: [
      {
        id: 'rec-1',
        title: 'Scale down Chrome nodes',
        description: 'Reduce Chrome nodes from 5 to 3 based on usage patterns',
        impact: 'high',
        savings: 150.0,
        risk: 'low',
        category: 'scaling',
      },
      {
        id: 'rec-2',
        title: 'Use spot instances',
        description: 'Switch to spot instances for non-critical workloads',
        impact: 'medium',
        savings: 80.0,
        risk: 'medium',
        category: 'cost',
      },
    ],
    total_potential_savings: 230.0,
  };

  const mockCostReportResponse = {
    period_start: '2024-01-01T00:00:00Z',
    period_end: '2024-01-31T00:00:00Z',
    total_cost: 450.0,
    breakdown: {
      compute: 200.0,
      network: 100.0,
      storage: 50.0,
      ai_inference: 75.0,
      embeddings: 25.0,
    },
    daily_costs: [
      { date: '2024-01-01', cost: 15.0 },
      { date: '2024-01-02', cost: 14.5 },
    ],
    projected_monthly: 480.0,
    comparison_to_browserstack: 1200.0,
    savings_achieved: 750.0,
    savings_percentage: 62.5,
  };

  const mockInfraSnapshotResponse = {
    selenium: {
      status: 'healthy',
      queue_size: 5,
      session_count: 10,
    },
    chrome_nodes: {
      active: 3,
      available: 5,
      utilization: 0.6,
    },
    firefox_nodes: {
      active: 1,
      available: 2,
      utilization: 0.5,
    },
    edge_nodes: {
      active: 0,
      available: 1,
      utilization: 0.0,
    },
    total_pods: 12,
    total_nodes: 8,
    cluster_cpu_utilization: 0.45,
    cluster_memory_utilization: 0.55,
    timestamp: '2024-01-15T12:00:00Z',
  };

  const mockSavingsSummaryResponse = {
    total_monthly_savings: 750.0,
    recommendations_applied: 5,
    current_monthly_cost: 450.0,
    browserstack_equivalent: 1200.0,
    savings_vs_browserstack: 750.0,
    savings_percentage: 62.5,
  };

  const mockApplyRecommendationResponse = {
    success: true,
    action_applied: { action: 'scale_down', nodes: 2 },
    status: 'completed',
  };

  const mockLLMUsageResponse = {
    models: [
      {
        name: 'deepseek/deepseek-chat-v3',
        provider: 'openrouter',
        input_tokens: 15000000,
        output_tokens: 4000000,
        cost: 3.22,
        requests: 2200,
      },
    ],
    features: [
      { name: 'Test Generation', cost: 5.5, percentage: 17, requests: 1200 },
    ],
    total_cost: 32.57,
    total_requests: 25730,
    total_input_tokens: 65000000,
    total_output_tokens: 12300000,
    period: '30d',
  };

  // Helper to create a successful Response
  const createMockResponse = (data: unknown) => ({
    ok: true,
    json: vi.fn().mockResolvedValue(data),
  });

  // Helper to create a failed Response
  const createErrorResponse = () => ({
    ok: false,
    json: vi.fn().mockResolvedValue({ error: 'Failed' }),
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    mockOrganizationScopedFetch.mockReset();
    mockFetchJson.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  describe('useInfraRecommendations', () => {
    it('should fetch infrastructure recommendations', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(
        createMockResponse(mockRecommendationsResponse)
      );

      const { useInfraRecommendations } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraRecommendations(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockOrganizationScopedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/infra/recommendations')
      );
      expect(result.current.data?.recommendations).toHaveLength(2);
      expect(result.current.data?.total_potential_savings).toBe(230.0);
    });

    it('should handle fetch error', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(createErrorResponse());

      const { useInfraRecommendations } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraRecommendations(), { wrapper });

      // Wait for the specific error message to be set
      await waitFor(() => {
        expect(result.current.error?.message).toBe('Failed to fetch recommendations');
      });
    });
  });

  describe('useInfraCostReport', () => {
    it('should fetch cost report with default days', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(
        createMockResponse(mockCostReportResponse)
      );

      const { useInfraCostReport } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraCostReport(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockOrganizationScopedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/infra/cost-report?days=7')
      );
      expect(result.current.data?.total_cost).toBe(450.0);
    });

    it('should fetch cost report with custom days', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(
        createMockResponse(mockCostReportResponse)
      );

      const { useInfraCostReport } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraCostReport(30), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockOrganizationScopedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/infra/cost-report?days=30')
      );
    });

    it('should handle fetch error', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(createErrorResponse());

      const { useInfraCostReport } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraCostReport(), { wrapper });

      // Wait for the specific error message to be set
      await waitFor(() => {
        expect(result.current.error?.message).toBe('Failed to fetch cost report');
      });
    });
  });

  describe('useInfraSnapshot', () => {
    it('should fetch infrastructure snapshot', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(
        createMockResponse(mockInfraSnapshotResponse)
      );

      const { useInfraSnapshot } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraSnapshot(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockOrganizationScopedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/infra/snapshot')
      );
      expect(result.current.data?.total_pods).toBe(12);
      expect(result.current.data?.total_nodes).toBe(8);
    });

    it('should handle fetch error', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(createErrorResponse());

      const { useInfraSnapshot } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraSnapshot(), { wrapper });

      // Wait for the specific error message to be set
      await waitFor(() => {
        expect(result.current.error?.message).toBe('Failed to fetch infrastructure snapshot');
      });
    });
  });

  describe('useInfraSavings', () => {
    it('should fetch savings summary', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(
        createMockResponse(mockSavingsSummaryResponse)
      );

      const { useInfraSavings } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraSavings(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockOrganizationScopedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/infra/savings-summary')
      );
      expect(result.current.data?.total_monthly_savings).toBe(750.0);
      expect(result.current.data?.savings_percentage).toBe(62.5);
    });

    it('should handle fetch error', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(createErrorResponse());

      const { useInfraSavings } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraSavings(), { wrapper });

      // Wait for the specific error message to be set
      await waitFor(() => {
        expect(result.current.error?.message).toBe('Failed to fetch savings summary');
      });
    });
  });

  describe('useApplyRecommendation', () => {
    it('should apply a recommendation successfully', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(
        createMockResponse(mockApplyRecommendationResponse)
      );

      const { useApplyRecommendation } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useApplyRecommendation(), { wrapper });

      await act(async () => {
        const response = await result.current.mutateAsync({ id: 'rec-1', auto: false });
        expect(response.success).toBe(true);
      });

      expect(mockOrganizationScopedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/infra/recommendations/rec-1/apply'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auto: false }),
        })
      );
    });

    it('should apply a recommendation with auto flag', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(
        createMockResponse(mockApplyRecommendationResponse)
      );

      const { useApplyRecommendation } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useApplyRecommendation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: 'rec-1', auto: true });
      });

      expect(mockOrganizationScopedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/infra/recommendations/rec-1/apply'),
        expect.objectContaining({
          body: JSON.stringify({ auto: true }),
        })
      );
    });

    it('should invalidate related queries on success', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(
        createMockResponse(mockApplyRecommendationResponse)
      );

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { useApplyRecommendation } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useApplyRecommendation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: 'rec-1' });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['infra', 'recommendations'],
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['infra', 'savings'],
      });
    });

    it('should handle apply error', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(createErrorResponse());

      const { useApplyRecommendation } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useApplyRecommendation(), { wrapper });

      await expect(
        result.current.mutateAsync({ id: 'rec-1' })
      ).rejects.toThrow('Failed to apply recommendation');
    });
  });

  describe('useInfraCostOverview', () => {
    it('should combine cost report, snapshot, and savings data', async () => {
      // Setup mock to return different responses based on URL
      mockOrganizationScopedFetch.mockImplementation((url: string) => {
        if (url.includes('cost-report')) {
          return Promise.resolve(createMockResponse(mockCostReportResponse));
        }
        if (url.includes('snapshot')) {
          return Promise.resolve(createMockResponse(mockInfraSnapshotResponse));
        }
        if (url.includes('savings-summary')) {
          return Promise.resolve(createMockResponse(mockSavingsSummaryResponse));
        }
        return Promise.resolve(createErrorResponse());
      });

      const { useInfraCostOverview } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraCostOverview(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual({
        currentMonthCost: 450.0,
        projectedMonthCost: 480.0,
        browserStackEquivalent: 1200.0,
        savingsPercentage: 62.5,
        totalNodes: 8,
        totalPods: 12,
      });
    });

    it('should return loading state while fetching', async () => {
      // Never resolve the mock
      mockOrganizationScopedFetch.mockImplementation(() => new Promise(() => {}));

      const { useInfraCostOverview } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraCostOverview(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
    });

    it('should return error if any query fails', async () => {
      mockOrganizationScopedFetch.mockImplementation((url: string) => {
        if (url.includes('cost-report')) {
          return Promise.resolve(createErrorResponse());
        }
        if (url.includes('snapshot')) {
          return Promise.resolve(createMockResponse(mockInfraSnapshotResponse));
        }
        if (url.includes('savings-summary')) {
          return Promise.resolve(createMockResponse(mockSavingsSummaryResponse));
        }
        return Promise.resolve(createErrorResponse());
      });

      const { useInfraCostOverview } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraCostOverview(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should use custom days parameter', async () => {
      mockOrganizationScopedFetch.mockImplementation((url: string) => {
        if (url.includes('cost-report')) {
          return Promise.resolve(createMockResponse(mockCostReportResponse));
        }
        if (url.includes('snapshot')) {
          return Promise.resolve(createMockResponse(mockInfraSnapshotResponse));
        }
        if (url.includes('savings-summary')) {
          return Promise.resolve(createMockResponse(mockSavingsSummaryResponse));
        }
        return Promise.resolve(createErrorResponse());
      });

      const { useInfraCostOverview } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraCostOverview(90), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockOrganizationScopedFetch).toHaveBeenCalledWith(
        expect.stringContaining('days=90')
      );
    });

    it('should provide refetch function that refetches all queries', async () => {
      mockOrganizationScopedFetch.mockImplementation((url: string) => {
        if (url.includes('cost-report')) {
          return Promise.resolve(createMockResponse(mockCostReportResponse));
        }
        if (url.includes('snapshot')) {
          return Promise.resolve(createMockResponse(mockInfraSnapshotResponse));
        }
        if (url.includes('savings-summary')) {
          return Promise.resolve(createMockResponse(mockSavingsSummaryResponse));
        }
        return Promise.resolve(createErrorResponse());
      });

      const { useInfraCostOverview } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraCostOverview(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Reset call count
      mockOrganizationScopedFetch.mockClear();

      // Call refetch
      await act(async () => {
        result.current.refetch();
      });

      // Should have called all three endpoints again
      await waitFor(() => {
        expect(mockOrganizationScopedFetch).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('useInfraCostBreakdown', () => {
    it('should map cost report breakdown to component format', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(
        createMockResponse(mockCostReportResponse)
      );

      const { useInfraCostBreakdown } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraCostBreakdown(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual({
        compute: 200.0,
        network: 100.0,
        storage: 50.0,
        ai_inference: 75.0,
        embeddings: 25.0,
      });
    });

    it('should return null data when cost report has no breakdown', async () => {
      const responseWithoutBreakdown = {
        ...mockCostReportResponse,
        breakdown: undefined,
      };
      mockOrganizationScopedFetch.mockResolvedValue(
        createMockResponse(responseWithoutBreakdown)
      );

      const { useInfraCostBreakdown } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraCostBreakdown(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });

    it('should handle missing breakdown fields with defaults', async () => {
      const partialBreakdown = {
        ...mockCostReportResponse,
        breakdown: {
          compute: 200.0,
          // Other fields missing
        },
      };
      mockOrganizationScopedFetch.mockResolvedValue(
        createMockResponse(partialBreakdown)
      );

      const { useInfraCostBreakdown } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraCostBreakdown(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual({
        compute: 200.0,
        network: 0,
        storage: 0,
        ai_inference: 0,
        embeddings: 0,
      });
    });

    it('should use custom days parameter', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(
        createMockResponse(mockCostReportResponse)
      );

      const { useInfraCostBreakdown } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraCostBreakdown(7), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockOrganizationScopedFetch).toHaveBeenCalledWith(
        expect.stringContaining('days=7')
      );
    });

    it('should handle fetch error', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(createErrorResponse());

      const { useInfraCostBreakdown } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useInfraCostBreakdown(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });
  });

  describe('useLLMCostTracking', () => {
    it('should fetch LLM cost data', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(
        createMockResponse(mockLLMUsageResponse)
      );

      const { useLLMCostTracking } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useLLMCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockOrganizationScopedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/users/me/ai-usage?days=30')
      );
      // When API returns data, we get transformed response
      expect(result.current.data).toBeDefined();
    });

    it('should use custom period parameter', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(
        createMockResponse(mockLLMUsageResponse)
      );

      const { useLLMCostTracking } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useLLMCostTracking('7d'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockOrganizationScopedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/users/me/ai-usage?days=7')
      );
    });

    it('should return mock data when API endpoint fails', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(createErrorResponse());

      const { useLLMCostTracking } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useLLMCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should return mock data (fallback behavior in the hook)
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.period).toBe('30d');
      expect(result.current.data?.models).toBeDefined();
    });

    it('should return mock data with correct period when API fails', async () => {
      mockOrganizationScopedFetch.mockResolvedValue(createErrorResponse());

      const { useLLMCostTracking } = await import('@/lib/hooks/use-infra');

      const { result } = renderHook(() => useLLMCostTracking('7d'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock data should reflect the requested period
      expect(result.current.data?.period).toBe('7d');
    });
  });
});
