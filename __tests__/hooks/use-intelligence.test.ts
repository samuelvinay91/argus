/**
 * Tests for lib/hooks/use-intelligence.ts
 *
 * Tests the Quality Intelligence React Query hooks including:
 * - useProductionEvents / useProductionEvent / useProductionEventStats
 * - useUpdateProductionEventStatus
 * - useGeneratedTests / useGeneratedTest
 * - useUpdateGeneratedTestStatus / useGenerateTest
 * - useRiskScores / useHighRiskComponents
 * - useQualityIntelligenceStats
 * - useCalculateRiskScores
 * - useQualityIntegrations
 * - useAIQualityScore
 * - useSemanticSearch
 * - useAutonomousLoop
 * - usePredictiveQuality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('use-intelligence', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  // Helper to create a chainable mock for Supabase queries
  const createMockChain = (finalData: unknown = null, finalError: unknown = null) => {
    const mockResult = {
      data: finalData,
      error: finalError,
    };
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockResult),
      update: vi.fn().mockReturnThis(),
      then: (cb: (result: typeof mockResult) => void) =>
        Promise.resolve(mockResult).then(cb),
    };
    return chain;
  };

  // Mock data
  const mockProductionEvents = [
    {
      id: 'event-1',
      project_id: 'proj-123',
      title: 'TypeError: Cannot read property',
      severity: 'error',
      status: 'new',
      source: 'sentry',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'event-2',
      project_id: 'proj-123',
      title: 'Network timeout',
      severity: 'warning',
      status: 'analyzing',
      source: 'datadog',
      created_at: '2024-01-14T10:00:00Z',
    },
  ];

  const mockGeneratedTests = [
    {
      id: 'test-1',
      project_id: 'proj-123',
      title: 'Test for TypeError',
      status: 'pending',
      code: 'test("should handle error", () => {});',
      created_at: '2024-01-15T11:00:00Z',
    },
  ];

  const mockRiskScores = [
    {
      id: 'risk-1',
      project_id: 'proj-123',
      entity: '/checkout',
      entity_type: 'page',
      overall_risk_score: 85,
      error_frequency_score: 90,
      test_coverage_score: 70,
    },
    {
      id: 'risk-2',
      project_id: 'proj-123',
      entity: '/login',
      entity_type: 'page',
      overall_risk_score: 45,
      error_frequency_score: 30,
      test_coverage_score: 60,
    },
  ];

  const mockQualityStats = {
    id: 'stats-1',
    project_id: 'proj-123',
    total_events: 100,
    unresolved_events: 25,
    tests_generated: 50,
    tests_approved: 40,
    avg_confidence: 0.85,
    updated_at: '2024-01-15T12:00:00Z',
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  // ============================================================================
  // PRODUCTION EVENTS
  // ============================================================================

  describe('useProductionEvents', () => {
    it('should return empty array when projectId is null', async () => {
      const { useProductionEvents } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useProductionEvents(null), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should fetch production events for a project', async () => {
      const mockChain = createMockChain(mockProductionEvents, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useProductionEvents } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useProductionEvents('proj-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('production_events');
      expect(mockChain.eq).toHaveBeenCalledWith('project_id', 'proj-123');
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockChain.limit).toHaveBeenCalledWith(100);
      expect(result.current.data).toEqual(mockProductionEvents);
    });

    it('should handle fetch errors', async () => {
      const mockChain = createMockChain(null, new Error('Database error'));
      mockSupabase.from.mockReturnValue(mockChain);

      const { useProductionEvents } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useProductionEvents('proj-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useProductionEvent', () => {
    it('should return null when eventId is null', async () => {
      const { useProductionEvent } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useProductionEvent(null), { wrapper });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('should fetch a single production event', async () => {
      const mockChain = createMockChain(mockProductionEvents[0], null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useProductionEvent } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useProductionEvent('event-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('production_events');
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'event-1');
      expect(mockChain.single).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockProductionEvents[0]);
    });
  });

  describe('useProductionEventStats', () => {
    it('should return null when projectId is null', async () => {
      const { useProductionEventStats } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useProductionEventStats(null), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should calculate stats from production events', async () => {
      const eventsForStats = [
        { status: 'new', severity: 'error' },
        { status: 'new', severity: 'warning' },
        { status: 'resolved', severity: 'error' },
      ];
      const mockChain = createMockChain(eventsForStats, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useProductionEventStats } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useProductionEventStats('proj-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({
        total: 3,
        byStatus: { new: 2, resolved: 1 },
        bySeverity: { error: 2, warning: 1 },
      });
    });
  });

  describe('useUpdateProductionEventStatus', () => {
    it('should update event status', async () => {
      const mockChain = createMockChain(null, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useUpdateProductionEventStatus } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useUpdateProductionEventStatus(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          eventId: 'event-1',
          status: 'resolved',
        });
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('production_events');
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'resolved',
          updated_at: expect.any(String),
        })
      );
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'event-1');
    });

    it('should invalidate related queries on success', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const mockChain = createMockChain(null, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useUpdateProductionEventStatus } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useUpdateProductionEventStatus(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          eventId: 'event-1',
          status: 'resolved',
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['production-events'],
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['production-event-stats'],
      });
    });

    it('should handle update errors', async () => {
      const mockChain = createMockChain(null, new Error('Update failed'));
      mockSupabase.from.mockReturnValue(mockChain);

      const { useUpdateProductionEventStatus } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useUpdateProductionEventStatus(), { wrapper });

      await expect(
        result.current.mutateAsync({
          eventId: 'event-1',
          status: 'resolved',
        })
      ).rejects.toThrow('Update failed');
    });
  });

  // ============================================================================
  // GENERATED TESTS
  // ============================================================================

  describe('useGeneratedTests', () => {
    it('should return empty array when projectId is null', async () => {
      const { useGeneratedTests } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useGeneratedTests(null), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should fetch generated tests for a project', async () => {
      const mockChain = createMockChain(mockGeneratedTests, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useGeneratedTests } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useGeneratedTests('proj-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('generated_tests');
      expect(result.current.data).toEqual(mockGeneratedTests);
    });
  });

  describe('useGeneratedTest', () => {
    it('should return null when testId is null', async () => {
      const { useGeneratedTest } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useGeneratedTest(null), { wrapper });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('should fetch a single generated test', async () => {
      const mockChain = createMockChain(mockGeneratedTests[0], null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useGeneratedTest } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useGeneratedTest('test-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('generated_tests');
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'test-1');
    });
  });

  describe('useUpdateGeneratedTestStatus', () => {
    it('should update test status with review notes', async () => {
      const mockChain = createMockChain(null, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useUpdateGeneratedTestStatus } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useUpdateGeneratedTestStatus(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          testId: 'test-1',
          status: 'approved',
          reviewNotes: 'Looks good!',
        });
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('generated_tests');
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          review_notes: 'Looks good!',
          reviewed_at: expect.any(String),
          updated_at: expect.any(String),
        })
      );
    });

    it('should invalidate related queries on success', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const mockChain = createMockChain(null, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useUpdateGeneratedTestStatus } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useUpdateGeneratedTestStatus(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          testId: 'test-1',
          status: 'rejected',
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['generated-tests'],
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['generated-test'],
      });
    });
  });

  describe('useGenerateTest', () => {
    it('should generate a test via API', async () => {
      // API returns snake_case, but convertKeysToCamelCase transforms it
      const mockResponse = {
        success: true,
        testId: 'new-test-123',
        code: 'test("generated test", () => {});',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { useGenerateTest } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useGenerateTest(), { wrapper });

      await act(async () => {
        const response = await result.current.mutateAsync({
          projectId: 'proj-123',
          eventId: 'event-1',
          framework: 'playwright',
        });

        expect(response).toEqual(mockResponse);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/generate-test'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"production_event_id":"event-1"'),
        })
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Generation failed' }),
      });

      const { useGenerateTest } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useGenerateTest(), { wrapper });

      await expect(
        result.current.mutateAsync({
          projectId: 'proj-123',
          eventId: 'event-1',
        })
      ).rejects.toThrow('Generation failed');
    });

    it('should include github config for PR creation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { useGenerateTest } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useGenerateTest(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          projectId: 'proj-123',
          eventId: 'event-1',
          autoCreatePr: true,
          githubConfig: {
            owner: 'my-org',
            repo: 'my-repo',
            base_branch: 'main',
          },
        });
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.auto_create_pr).toBe(true);
      expect(callBody.github_config).toEqual({
        owner: 'my-org',
        repo: 'my-repo',
        base_branch: 'main',
      });
    });
  });

  // ============================================================================
  // RISK SCORES
  // ============================================================================

  describe('useRiskScores', () => {
    it('should return empty array when projectId is null', async () => {
      const { useRiskScores } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useRiskScores(null), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should fetch risk scores ordered by score descending', async () => {
      const mockChain = createMockChain(mockRiskScores, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useRiskScores } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useRiskScores('proj-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('risk_scores');
      expect(mockChain.order).toHaveBeenCalledWith('overall_risk_score', { ascending: false });
      expect(mockChain.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('useHighRiskComponents', () => {
    it('should fetch only high risk components (score >= 70)', async () => {
      const highRiskOnly = [mockRiskScores[0]]; // Only the 85 score one
      const mockChain = createMockChain(highRiskOnly, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useHighRiskComponents } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useHighRiskComponents('proj-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockChain.gte).toHaveBeenCalledWith('overall_risk_score', 70);
    });
  });

  // ============================================================================
  // QUALITY INTELLIGENCE STATS
  // ============================================================================

  describe('useQualityIntelligenceStats', () => {
    it('should return null when projectId is null', async () => {
      const { useQualityIntelligenceStats } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useQualityIntelligenceStats(null), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should fetch quality intelligence stats', async () => {
      const mockChain = createMockChain(mockQualityStats, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useQualityIntelligenceStats } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useQualityIntelligenceStats('proj-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('quality_intelligence_stats');
      expect(result.current.data).toEqual(mockQualityStats);
    });

    it('should return null when no rows found (PGRST116)', async () => {
      const mockChain = createMockChain(null, { code: 'PGRST116' });
      mockSupabase.from.mockReturnValue(mockChain);

      const { useQualityIntelligenceStats } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useQualityIntelligenceStats('proj-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  // ============================================================================
  // CALCULATE RISK SCORES
  // ============================================================================

  describe('useCalculateRiskScores', () => {
    it('should call API to calculate risk scores', async () => {
      // API response gets converted from snake_case to camelCase
      const mockResponse = {
        success: true,
        scoresCalculated: 15,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { useCalculateRiskScores } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useCalculateRiskScores(), { wrapper });

      await act(async () => {
        const response = await result.current.mutateAsync({
          projectId: 'proj-123',
          entityTypes: ['page', 'component'],
        });

        expect(response).toEqual(mockResponse);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/calculate-risk-scores'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"project_id":"proj-123"'),
        })
      );
    });

    it('should invalidate related queries on success', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { useCalculateRiskScores } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useCalculateRiskScores(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ projectId: 'proj-123' });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['risk-scores'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['high-risk-components'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['quality-intelligence-stats'],
      });
    });
  });

  // ============================================================================
  // QUALITY INTEGRATIONS
  // ============================================================================

  describe('useQualityIntegrations', () => {
    it('should return empty array when projectId is null', async () => {
      const { useQualityIntegrations } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useQualityIntegrations(null), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should fetch integrations filtered by quality types', async () => {
      const mockIntegrations = [
        { id: 'int-1', type: 'sentry', project_id: 'proj-123' },
        { id: 'int-2', type: 'datadog', project_id: 'proj-123' },
      ];
      const mockChain = createMockChain(mockIntegrations, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useQualityIntegrations } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useQualityIntegrations('proj-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('integrations');
      expect(mockChain.in).toHaveBeenCalledWith('type', [
        'sentry',
        'datadog',
        'newrelic',
        'bugsnag',
        'rollbar',
      ]);
    });
  });

  // ============================================================================
  // AI QUALITY SCORE
  // ============================================================================

  describe('useAIQualityScore', () => {
    it('should return null when projectId is null', async () => {
      const { useAIQualityScore } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useAIQualityScore(null), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should fetch AI quality score from API', async () => {
      // API response gets converted from snake_case to camelCase
      const mockQualityScore = {
        success: true,
        projectId: 'proj-123',
        overallScore: 78,
        grade: 'B+',
        gradeColor: 'green',
        componentScores: {
          errorManagement: { score: 80, label: 'Good', description: 'Well managed' },
          testCoverage: { score: 75, label: 'Good', description: 'Adequate coverage' },
          riskMitigation: { score: 82, label: 'Good', description: 'Proactive' },
          automation: { score: 70, label: 'Fair', description: 'Room for improvement' },
          prevention: { score: 85, label: 'Excellent', description: 'Strong prevention' },
        },
        metrics: {
          totalEvents: 100,
          unresolvedEvents: 10,
          testsGenerated: 50,
          testsApproved: 45,
          avgConfidence: 0.88,
          highRiskComponents: 3,
          incidentsPrevented: 12,
        },
        insights: ['Improve test coverage for checkout flow'],
        calculatedAt: '2024-01-15T12:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockQualityScore),
      });

      const { useAIQualityScore } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useAIQualityScore('proj-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/quality-score?project_id=proj-123'),
        expect.any(Object)
      );
      expect(result.current.data).toEqual(mockQualityScore);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Score calculation failed' }),
      });

      const { useAIQualityScore } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useAIQualityScore('proj-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Score calculation failed');
    });
  });

  // ============================================================================
  // SEMANTIC SEARCH
  // ============================================================================

  describe('useSemanticSearch', () => {
    it('should search for similar patterns via API', async () => {
      // API response gets converted from snake_case to camelCase
      const mockSearchResult = {
        success: true,
        query: 'TypeError: Cannot read property',
        patterns: [
          {
            id: 'pattern-1',
            score: 0.95,
            patternHash: 'abc123',
            category: 'type_error',
            exampleMessage: 'TypeError: Cannot read property of undefined',
            knownSolutions: ['Check for null values'],
          },
        ],
        count: 1,
        hasSolutions: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResult),
      });

      const { useSemanticSearch } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useSemanticSearch(), { wrapper });

      await act(async () => {
        const response = await result.current.mutateAsync({
          errorText: 'TypeError: Cannot read property',
          limit: 5,
          minScore: 0.7,
        });

        expect(response).toEqual(mockSearchResult);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/semantic-search'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"error_text":"TypeError: Cannot read property"'),
        })
      );
    });

    it('should handle search errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Search failed' }),
      });

      const { useSemanticSearch } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useSemanticSearch(), { wrapper });

      await expect(
        result.current.mutateAsync({
          errorText: 'test error',
        })
      ).rejects.toThrow('Search failed');
    });
  });

  // ============================================================================
  // AUTONOMOUS LOOP
  // ============================================================================

  describe('useAutonomousLoop', () => {
    it('should trigger autonomous quality loop via API', async () => {
      // API response gets converted from snake_case to camelCase
      const mockResponse = {
        success: true,
        runId: 'run-123',
        stagesCompleted: ['discovery', 'visual', 'generation'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { useAutonomousLoop } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useAutonomousLoop(), { wrapper });

      await act(async () => {
        const response = await result.current.mutateAsync({
          projectId: 'proj-123',
          url: 'https://example.com',
          stages: ['discovery', 'visual'],
          discoveryDepth: 3,
        });

        expect(response).toEqual(mockResponse);
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.project_id).toBe('proj-123');
      expect(callBody.url).toBe('https://example.com');
      expect(callBody.stages).toEqual(['discovery', 'visual']);
      expect(callBody.discovery_depth).toBe(3);
    });

    it('should invalidate multiple queries on success', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { useAutonomousLoop } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useAutonomousLoop(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          projectId: 'proj-123',
          url: 'https://example.com',
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['production-events'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['generated-tests'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['risk-scores'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['ai-quality-score'] });
    });

    it('should include github config for PR creation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { useAutonomousLoop } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => useAutonomousLoop(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          projectId: 'proj-123',
          url: 'https://example.com',
          autoCreatePr: true,
          githubConfig: {
            owner: 'my-org',
            repo: 'my-repo',
          },
        });
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.auto_create_pr).toBe(true);
      expect(callBody.github_config).toEqual({
        owner: 'my-org',
        repo: 'my-repo',
      });
    });
  });

  // ============================================================================
  // PREDICTIVE QUALITY
  // ============================================================================

  describe('usePredictiveQuality', () => {
    it('should return null when projectId is null', async () => {
      const { usePredictiveQuality } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => usePredictiveQuality(null), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should fetch predictive quality analysis from API', async () => {
      // API response gets converted from snake_case to camelCase
      const mockPredictions = {
        success: true,
        projectId: 'proj-123',
        timeframe: '7d',
        predictions: [
          {
            entity: '/checkout',
            entityType: 'page',
            predictionScore: 0.85,
            predictedTimeframe: '7 days',
            riskFactors: ['High error frequency', 'Low test coverage'],
            recommendations: ['Add more tests'],
            similarPastFailures: 3,
            confidence: 0.8,
          },
        ],
        summary: {
          totalAnalyzed: 50,
          totalPredicted: 5,
          highRisk: 2,
          mediumRisk: 3,
          increasingTrends: 1,
        },
        aiSummary: 'Checkout flow needs attention',
        dataQuality: {
          eventsAnalyzed: 100,
          riskScoresAvailable: 45,
          patternsLearned: 20,
        },
        calculatedAt: '2024-01-15T12:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPredictions),
      });

      const { usePredictiveQuality } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => usePredictiveQuality('proj-123', '7d'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/predictive-quality?project_id=proj-123&timeframe=7d'),
        expect.any(Object)
      );
      expect(result.current.data).toEqual(mockPredictions);
    });

    it('should use default timeframe of 7d', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, predictions: [] }),
      });

      const { usePredictiveQuality } = await import('@/lib/hooks/use-intelligence');

      renderHook(() => usePredictiveQuality('proj-123'), { wrapper });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('timeframe=7d'),
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Prediction failed' }),
      });

      const { usePredictiveQuality } = await import('@/lib/hooks/use-intelligence');

      const { result } = renderHook(() => usePredictiveQuality('proj-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Prediction failed');
    });
  });
});
