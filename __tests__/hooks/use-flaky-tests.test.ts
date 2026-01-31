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

// Mock the flakyTestsApi
const mockFlakyTestsApi = {
  list: vi.fn(),
  getTrend: vi.fn(),
  getStats: vi.fn(),
  toggleQuarantine: vi.fn(),
};

vi.mock('@/lib/api-client', () => ({
  flakyTestsApi: mockFlakyTestsApi,
}));

describe('use-flaky-tests', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

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

  describe('useFlakyTests', () => {
    it('should return empty array when API returns empty', async () => {
      mockFlakyTestsApi.list.mockResolvedValue({
        tests: [],
        total: 0,
      });

      const { useFlakyTests } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useFlakyTests(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(mockFlakyTestsApi.list).toHaveBeenCalledWith({
        projectId: undefined,
        minScore: 0.0,
        days: 30,
        limit: 500,
      });
    });

    it('should transform flaky tests from API response', async () => {
      const mockApiTests = [
        {
          id: 'test-1',
          name: 'Login Test',
          path: 'tests/login.spec.ts',
          flakinessScore: 0.5,
          totalRuns: 10,
          passCount: 5,
          failCount: 5,
          lastRun: '2024-01-15T00:00:00Z',
          trend: 'increasing' as const,
          isQuarantined: false,
          rootCauses: [{ type: 'timing' as const, description: 'Timeout', confidence: 0.7 }],
          recentResults: [true, false, true, false],
          avgDuration: 1000,
          suggestedFix: 'Add explicit waits',
          projectId: 'proj-1',
          projectName: 'Project 1',
        },
      ];

      mockFlakyTestsApi.list.mockResolvedValue({
        tests: mockApiTests,
        total: 1,
      });

      const { useFlakyTests } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useFlakyTests('proj-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]).toMatchObject({
        id: 'test-1',
        name: 'Login Test',
        flakinessScore: 0.5,
        trend: 'increasing',
      });

      expect(mockFlakyTestsApi.list).toHaveBeenCalledWith({
        projectId: 'proj-1',
        minScore: 0.0,
        days: 30,
        limit: 500,
      });
    });

    it('should handle API error', async () => {
      mockFlakyTestsApi.list.mockRejectedValue(new Error('API Error'));

      const { useFlakyTests } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useFlakyTests(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useFlakinesssTrend', () => {
    it('should return empty array when API returns empty trend', async () => {
      mockFlakyTestsApi.getTrend.mockResolvedValue({
        trend: [],
      });

      const { useFlakinesssTrend } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useFlakinesssTrend(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should transform trend data from API response', async () => {
      const mockTrend = [
        { date: 'Jan 15', flaky: 5, fixed: 2 },
        { date: 'Jan 22', flaky: 3, fixed: 4 },
      ];

      mockFlakyTestsApi.getTrend.mockResolvedValue({
        trend: mockTrend,
      });

      const { useFlakinesssTrend } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useFlakinesssTrend('proj-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockTrend);
      expect(mockFlakyTestsApi.getTrend).toHaveBeenCalledWith({
        projectId: 'proj-1',
        weeks: 8,
      });
    });
  });

  describe('useToggleQuarantine', () => {
    it('should call API with correct parameters when quarantining', async () => {
      mockFlakyTestsApi.toggleQuarantine.mockResolvedValue({
        success: true,
        testId: 'test-1',
        isQuarantined: true,
      });

      const { useToggleQuarantine } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useToggleQuarantine(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ testId: 'test-1', quarantine: true });
      });

      expect(mockFlakyTestsApi.toggleQuarantine).toHaveBeenCalledWith('test-1', true);
    });

    it('should call API with correct parameters when unquarantining', async () => {
      mockFlakyTestsApi.toggleQuarantine.mockResolvedValue({
        success: true,
        testId: 'test-1',
        isQuarantined: false,
      });

      const { useToggleQuarantine } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useToggleQuarantine(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ testId: 'test-1', quarantine: false });
      });

      expect(mockFlakyTestsApi.toggleQuarantine).toHaveBeenCalledWith('test-1', false);
    });

    it('should invalidate queries on success', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      mockFlakyTestsApi.toggleQuarantine.mockResolvedValue({
        success: true,
        testId: 'test-1',
        isQuarantined: true,
      });

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
    it('should calculate stats from loaded flaky tests', async () => {
      const mockFlakyTests = [
        {
          id: 'test-1',
          name: 'Test 1',
          path: null,
          flakinessScore: 0.5, // high
          totalRuns: 10,
          passCount: 5,
          failCount: 5,
          lastRun: '2024-01-15T00:00:00Z',
          trend: 'stable' as const,
          isQuarantined: false,
          rootCauses: [],
          recentResults: [],
          avgDuration: 1000,
          suggestedFix: null,
          projectId: 'proj-1',
          projectName: 'Project 1',
        },
        {
          id: 'test-2',
          name: 'Test 2',
          path: null,
          flakinessScore: 0.45, // high, quarantined
          totalRuns: 10,
          passCount: 5,
          failCount: 5,
          lastRun: '2024-01-15T00:00:00Z',
          trend: 'stable' as const,
          isQuarantined: true,
          rootCauses: [],
          recentResults: [],
          avgDuration: 1000,
          suggestedFix: null,
          projectId: 'proj-1',
          projectName: 'Project 1',
        },
        {
          id: 'test-3',
          name: 'Test 3',
          path: null,
          flakinessScore: 0.3, // medium
          totalRuns: 10,
          passCount: 7,
          failCount: 3,
          lastRun: '2024-01-15T00:00:00Z',
          trend: 'stable' as const,
          isQuarantined: false,
          rootCauses: [],
          recentResults: [],
          avgDuration: 1000,
          suggestedFix: null,
          projectId: 'proj-1',
          projectName: 'Project 1',
        },
        {
          id: 'test-4',
          name: 'Test 4',
          path: null,
          flakinessScore: 0.15, // low
          totalRuns: 10,
          passCount: 8,
          failCount: 2,
          lastRun: '2024-01-15T00:00:00Z',
          trend: 'stable' as const,
          isQuarantined: false,
          rootCauses: [],
          recentResults: [],
          avgDuration: 1000,
          suggestedFix: null,
          projectId: 'proj-1',
          projectName: 'Project 1',
        },
      ];

      mockFlakyTestsApi.list.mockResolvedValue({
        tests: mockFlakyTests,
        total: 4,
      });

      const { useFlakyTestStats } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useFlakyTestStats(), { wrapper });

      await waitFor(() => {
        expect(result.current.total).toBe(4);
      });

      expect(result.current.high).toBe(2); // 0.5 and 0.45
      expect(result.current.medium).toBe(1); // 0.3
      expect(result.current.low).toBe(1); // 0.15
      expect(result.current.quarantined).toBe(1);
      expect(result.current.avgScore).toBeCloseTo(0.35, 2); // (0.5+0.45+0.3+0.15)/4
    });

    it('should return zero stats when no flaky tests', async () => {
      mockFlakyTestsApi.list.mockResolvedValue({
        tests: [],
        total: 0,
      });

      const { useFlakyTestStats } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useFlakyTestStats(), { wrapper });

      await waitFor(() => {
        expect(result.current.total).toBe(0);
      });

      expect(result.current.high).toBe(0);
      expect(result.current.medium).toBe(0);
      expect(result.current.low).toBe(0);
      expect(result.current.quarantined).toBe(0);
      expect(result.current.avgScore).toBe(0);
    });
  });

  describe('useFlakyTestStatsApi', () => {
    it('should fetch stats directly from API', async () => {
      mockFlakyTestsApi.getStats.mockResolvedValue({
        total: 10,
        high: 3,
        medium: 4,
        low: 3,
        quarantined: 2,
        avgScore: 0.35,
      });

      const { useFlakyTestStatsApi } = await import('@/lib/hooks/use-flaky-tests');

      const { result } = renderHook(() => useFlakyTestStatsApi('proj-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual({
        total: 10,
        high: 3,
        medium: 4,
        low: 3,
        quarantined: 2,
        avgScore: 0.35,
      });

      expect(mockFlakyTestsApi.getStats).toHaveBeenCalledWith({
        projectId: 'proj-1',
      });
    });
  });
});
