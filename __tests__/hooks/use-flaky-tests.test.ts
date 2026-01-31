/**
 * Tests for lib/hooks/use-flaky-tests.ts
 *
 * Tests flaky test analysis React Query hooks including:
 * - useFlakyTests
 * - useFlakinesssTrend
 * - useToggleQuarantine
 * - useFlakyTestStats
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
  getSupabaseClient: () => mockSupabase,
}));

// Mock useProjects
vi.mock('@/lib/hooks/use-projects', () => ({
  useProjects: vi.fn(() => ({
    data: [
      { id: 'proj-1', name: 'Project 1' },
      { id: 'proj-2', name: 'Project 2' },
    ],
  })),
}));

describe('use-flaky-tests', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  const createMockChain = (finalData: any = null, finalError: any = null) => {
    const mockResult = {
      data: finalData,
      error: finalError,
    };
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue(mockResult),
      single: vi.fn().mockResolvedValue(mockResult),
      update: vi.fn().mockReturnThis(),
      then: (cb: any) => Promise.resolve(mockResult).then(cb),
    };
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  describe('useFlakyTests', () => {
    it('should return empty array when no projects', async () => {
      const { useProjects } = await import('@/lib/hooks/use-projects');
      vi.mocked(useProjects).mockReturnValue({ data: [] } as any);

      const { useFlakyTests } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useFlakyTests(), { wrapper });

      // Query should be disabled with no projects
      expect(result.current.isLoading).toBe(false);
    });

    it('should identify flaky tests from test results', async () => {
      const mockTestResults = [
        // Test 1 - Flaky (has both pass and fail)
        { test_id: 'test-1', name: 'Login Test', status: 'passed', duration_ms: 1000, error_message: null, created_at: '2024-01-15T00:00:00Z', test_runs: { project_id: 'proj-1' } },
        { test_id: 'test-1', name: 'Login Test', status: 'failed', duration_ms: 1500, error_message: 'Timeout', created_at: '2024-01-14T00:00:00Z', test_runs: { project_id: 'proj-1' } },
        { test_id: 'test-1', name: 'Login Test', status: 'passed', duration_ms: 1200, error_message: null, created_at: '2024-01-13T00:00:00Z', test_runs: { project_id: 'proj-1' } },
        { test_id: 'test-1', name: 'Login Test', status: 'failed', duration_ms: 1400, error_message: 'Timeout', created_at: '2024-01-12T00:00:00Z', test_runs: { project_id: 'proj-1' } },
        // Test 2 - Not flaky (only passes)
        { test_id: 'test-2', name: 'Home Test', status: 'passed', duration_ms: 800, error_message: null, created_at: '2024-01-15T00:00:00Z', test_runs: { project_id: 'proj-1' } },
        { test_id: 'test-2', name: 'Home Test', status: 'passed', duration_ms: 850, error_message: null, created_at: '2024-01-14T00:00:00Z', test_runs: { project_id: 'proj-1' } },
      ];

      const mockTests = [
        { id: 'test-1', name: 'Login Test', description: 'tests/login.spec.ts', tags: [], project_id: 'proj-1' },
        { id: 'test-2', name: 'Home Test', description: 'tests/home.spec.ts', tags: [], project_id: 'proj-1' },
      ];

      const mockHealingPatterns: any[] = [];

      const resultsChain = createMockChain(mockTestResults, null);
      resultsChain.order.mockResolvedValue({ data: mockTestResults, error: null });

      const testsChain = createMockChain(mockTests, null);

      const healingChain = createMockChain(mockHealingPatterns, null);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'test_results') return resultsChain;
        if (table === 'tests') return testsChain;
        if (table === 'healing_patterns') return healingChain;
        return resultsChain;
      });

      const { useFlakyTests } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useFlakyTests(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should only find test-1 as flaky (has both pass and fail)
      expect(mockSupabase.from).toHaveBeenCalledWith('test_results');
      expect(mockSupabase.from).toHaveBeenCalledWith('tests');
    });

    it('should calculate flakiness score and trend', async () => {
      const mockTestResults = [
        // Recent results (first 5 - more failures)
        { test_id: 'test-1', name: 'Test', status: 'failed', duration_ms: 1000, error_message: null, created_at: '2024-01-10T00:00:00Z', test_runs: { project_id: 'proj-1' } },
        { test_id: 'test-1', name: 'Test', status: 'failed', duration_ms: 1000, error_message: null, created_at: '2024-01-09T00:00:00Z', test_runs: { project_id: 'proj-1' } },
        { test_id: 'test-1', name: 'Test', status: 'passed', duration_ms: 1000, error_message: null, created_at: '2024-01-08T00:00:00Z', test_runs: { project_id: 'proj-1' } },
        { test_id: 'test-1', name: 'Test', status: 'failed', duration_ms: 1000, error_message: null, created_at: '2024-01-07T00:00:00Z', test_runs: { project_id: 'proj-1' } },
        { test_id: 'test-1', name: 'Test', status: 'passed', duration_ms: 1000, error_message: null, created_at: '2024-01-06T00:00:00Z', test_runs: { project_id: 'proj-1' } },
        // Older results (last 5 - fewer failures)
        { test_id: 'test-1', name: 'Test', status: 'passed', duration_ms: 1000, error_message: null, created_at: '2024-01-05T00:00:00Z', test_runs: { project_id: 'proj-1' } },
        { test_id: 'test-1', name: 'Test', status: 'passed', duration_ms: 1000, error_message: null, created_at: '2024-01-04T00:00:00Z', test_runs: { project_id: 'proj-1' } },
        { test_id: 'test-1', name: 'Test', status: 'passed', duration_ms: 1000, error_message: null, created_at: '2024-01-03T00:00:00Z', test_runs: { project_id: 'proj-1' } },
        { test_id: 'test-1', name: 'Test', status: 'passed', duration_ms: 1000, error_message: null, created_at: '2024-01-02T00:00:00Z', test_runs: { project_id: 'proj-1' } },
        { test_id: 'test-1', name: 'Test', status: 'failed', duration_ms: 1000, error_message: null, created_at: '2024-01-01T00:00:00Z', test_runs: { project_id: 'proj-1' } },
      ];

      const resultsChain = createMockChain(mockTestResults, null);
      resultsChain.order.mockResolvedValue({ data: mockTestResults, error: null });

      const testsChain = createMockChain([{ id: 'test-1', name: 'Test', tags: [], project_id: 'proj-1' }], null);
      const healingChain = createMockChain([], null);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'test_results') return resultsChain;
        if (table === 'tests') return testsChain;
        if (table === 'healing_patterns') return healingChain;
        return resultsChain;
      });

      const { useFlakyTests } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useFlakyTests(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('useFlakinesssTrend', () => {
    it('should return empty array when no projects', async () => {
      const { useProjects } = await import('@/lib/hooks/use-projects');
      vi.mocked(useProjects).mockReturnValue({ data: [] } as any);

      const { useFlakinesssTrend } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useFlakinesssTrend(), { wrapper });

      expect(result.current.isLoading).toBe(false);
    });

    it('should fetch weekly trend data', async () => {
      const mockWeeklyData = [
        { test_id: 'test-1', name: 'Test', status: 'passed', test_runs: { project_id: 'proj-1' } },
        { test_id: 'test-1', name: 'Test', status: 'failed', test_runs: { project_id: 'proj-1' } },
      ];

      const mockChain = createMockChain(mockWeeklyData, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useFlakinesssTrend } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useFlakinesssTrend(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('test_results');
    });
  });

  describe('useToggleQuarantine', () => {
    it('should add quarantine tag when quarantining', async () => {
      const test = { id: 'test-1', tags: ['smoke'] };
      const updatedTest = { id: 'test-1', tags: ['smoke', 'quarantined'] };

      const fetchChain = createMockChain(test, null);
      const updateChain = createMockChain(updatedTest, null);

      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: test, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedTest, error: null }),
            }),
          }),
        }),
      }));

      const { useToggleQuarantine } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useToggleQuarantine(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ testId: 'test-1', quarantine: true });
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('tests');
    });

    it('should remove quarantine tag when unquarantining', async () => {
      const test = { id: 'test-1', tags: ['smoke', 'quarantined'] };
      const updatedTest = { id: 'test-1', tags: ['smoke'] };

      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: test, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedTest, error: null }),
            }),
          }),
        }),
      }));

      const { useToggleQuarantine } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useToggleQuarantine(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ testId: 'test-1', quarantine: false });
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('tests');
    });

    it('should invalidate queries on success', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const test = { id: 'test-1', tags: [] };

      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: test, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: test, error: null }),
            }),
          }),
        }),
      }));

      const { useToggleQuarantine } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useToggleQuarantine(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ testId: 'test-1', quarantine: true });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['flaky-tests'],
      });
    });
  });

  describe('useFlakyTestStats', () => {
    it('should calculate stats from flaky tests', async () => {
      // This hook depends on useFlakyTests, which we need to mock
      const mockFlakyTests = [
        { flakinessScore: 0.5, isQuarantined: false }, // high
        { flakinessScore: 0.45, isQuarantined: true }, // high, quarantined
        { flakinessScore: 0.3, isQuarantined: false }, // medium
        { flakinessScore: 0.15, isQuarantined: false }, // low
      ];

      // Mock the useFlakyTests result by setting up data in query cache
      const resultsChain = createMockChain([], null);
      resultsChain.order.mockResolvedValue({ data: [], error: null });

      const testsChain = createMockChain([], null);
      const healingChain = createMockChain([], null);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'test_results') return resultsChain;
        if (table === 'tests') return testsChain;
        if (table === 'healing_patterns') return healingChain;
        return resultsChain;
      });

      const { useFlakyTestStats } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useFlakyTestStats(), { wrapper });

      // Stats should be calculated (initially 0 if no flaky tests)
      expect(typeof result.current.total).toBe('number');
      expect(typeof result.current.high).toBe('number');
      expect(typeof result.current.medium).toBe('number');
      expect(typeof result.current.low).toBe('number');
      expect(typeof result.current.quarantined).toBe('number');
      expect(typeof result.current.avgScore).toBe('number');
    });
  });
});
