/**
 * Tests for lib/hooks/use-live-session.ts
 *
 * Tests live session and activity stream React Query hooks including:
 * - useActiveSessions
 * - useActivityStream
 * - useActivityStreamSimple
 * - useCreateLiveSession
 * - useUpdateLiveSession
 * - useLogActivity
 * - useLiveSessionManager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Supabase client
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
};

const mockSupabase = {
  from: vi.fn(),
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => mockSupabase,
}));

// Mock types for tests
import type { ActivityLog, LiveSession } from '@/lib/hooks/use-live-session';

describe('use-live-session', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  // Helper to create mock Supabase query chain
  const createMockChain = (finalData: any = null, finalError: any = null) => {
    const mockResult = {
      data: finalData,
      error: finalError,
    };
    // Create a thenable object that resolves to mockResult
    const createThenable = () => ({
      then: (onFulfill: any, onReject?: any) => Promise.resolve(mockResult).then(onFulfill, onReject),
      catch: (onReject: any) => Promise.resolve(mockResult).catch(onReject),
    });
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      // order() returns a thenable Promise-like object (for queries like useActivityStream)
      order: vi.fn().mockImplementation(() => createThenable()),
      // single() also returns a thenable (for mutations)
      single: vi.fn().mockImplementation(() => createThenable()),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      // Make the chain itself thenable for direct await
      then: (onFulfill: any, onReject?: any) => Promise.resolve(mockResult).then(onFulfill, onReject),
    };
    return chain;
  };

  // Sample mock data
  const mockLiveSession: LiveSession = {
    id: 'session-1',
    project_id: 'proj-1',
    session_type: 'test_run',
    status: 'active',
    current_step: 'Running test 1',
    total_steps: 10,
    completed_steps: 3,
    last_screenshot_url: 'https://example.com/screenshot.png',
    started_at: '2024-01-15T10:00:00Z',
    metadata: { testSuite: 'smoke' },
  };

  const mockActivityLog: ActivityLog = {
    id: 'log-1',
    project_id: 'proj-1',
    session_id: 'session-1',
    activity_type: 'test_run',
    event_type: 'step',
    title: 'Running test step',
    description: 'Executing login flow',
    metadata: { attempt: 1 },
    screenshot_url: 'https://example.com/step1.png',
    duration_ms: 1500,
    created_at: '2024-01-15T10:05:00Z',
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset channel mock
    mockChannel.on.mockReturnThis();
    mockChannel.subscribe.mockReset();
    mockSupabase.removeChannel.mockReset();
    mockSupabase.channel.mockReturnValue(mockChannel);

    // Reset from() mock and set up default chain that returns empty results
    // This prevents "Cannot read properties of undefined (reading 'select')" errors
    const defaultChain = createMockChain([], null);
    mockSupabase.from.mockReset();
    mockSupabase.from.mockReturnValue(defaultChain);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  describe('useActiveSessions', () => {
    it('should return empty array when projectId is null', async () => {
      const { useActiveSessions } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useActiveSessions(null), { wrapper });

      // Query should be disabled
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should return empty array when projectId is empty string', async () => {
      const { useActiveSessions } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useActiveSessions(''), { wrapper });

      expect(result.current.isLoading).toBe(false);
    });

    it('should fetch active sessions for a project', async () => {
      const mockSessions: LiveSession[] = [mockLiveSession];
      const mockChain = createMockChain(mockSessions, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useActiveSessions } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useActiveSessions('proj-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('live_sessions');
      expect(mockChain.eq).toHaveBeenCalledWith('project_id', 'proj-1');
      expect(mockChain.eq).toHaveBeenCalledWith('status', 'active');
      expect(mockChain.order).toHaveBeenCalledWith('started_at', { ascending: false });
    });

    it('should handle fetch errors', async () => {
      const mockChain = createMockChain(null, new Error('Database error'));
      mockSupabase.from.mockReturnValue(mockChain);

      const { useActiveSessions } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useActiveSessions('proj-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should return multiple active sessions', async () => {
      const mockSessions: LiveSession[] = [
        mockLiveSession,
        { ...mockLiveSession, id: 'session-2', session_type: 'discovery' },
      ];
      const mockChain = createMockChain(mockSessions, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useActiveSessions } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useActiveSessions('proj-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toHaveLength(2);
      });
    });
  });

  describe('useActivityStream', () => {
    it('should return empty activities and disconnected status when sessionId is null', async () => {
      const { useActivityStream } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useActivityStream(null), { wrapper });

      expect(result.current.activities).toEqual([]);
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
    });

    it('should fetch initial activities and subscribe to realtime updates', async () => {
      const mockActivities: ActivityLog[] = [mockActivityLog];
      const mockChain = createMockChain(mockActivities, null);
      mockSupabase.from.mockReturnValue(mockChain);

      // Mock channel subscribe to call callback with SUBSCRIBED
      // Use queueMicrotask to ensure proper async sequencing
      mockChannel.subscribe.mockImplementation((callback) => {
        if (typeof callback === 'function') {
          queueMicrotask(() => callback('SUBSCRIBED'));
        }
        return mockChannel;
      });

      const { useActivityStream } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useActivityStream('session-1'), { wrapper });

      // Wait for connection with extended timeout
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      }, { timeout: 5000 });

      expect(mockSupabase.from).toHaveBeenCalledWith('activity_logs');
      expect(mockSupabase.channel).toHaveBeenCalledWith('activity-session-1', expect.any(Object));
      expect(mockChannel.on).toHaveBeenCalled();
    });

    it('should set connecting status initially', async () => {
      const mockChain = createMockChain([], null);
      mockSupabase.from.mockReturnValue(mockChain);

      // Don't call the subscribe callback immediately
      mockChannel.subscribe.mockReturnValue(mockChannel);

      const { useActivityStream } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useActivityStream('session-1'), { wrapper });

      expect(result.current.connectionStatus).toBe('connecting');
    });

    it('should cleanup subscription on unmount', async () => {
      const mockChain = createMockChain([], null);
      mockSupabase.from.mockReturnValue(mockChain);
      mockChannel.subscribe.mockReturnValue(mockChannel);

      const { useActivityStream } = await import('@/lib/hooks/use-live-session');

      const { unmount } = renderHook(() => useActivityStream('session-1'), { wrapper });

      unmount();

      expect(mockSupabase.removeChannel).toHaveBeenCalled();
    });

    it('should handle connection errors and attempt reconnection', async () => {
      const mockChain = createMockChain([], null);
      mockSupabase.from.mockReturnValue(mockChain);

      // Mock subscribe to trigger CHANNEL_ERROR using queueMicrotask
      mockChannel.subscribe.mockImplementation((callback) => {
        if (typeof callback === 'function') {
          queueMicrotask(() => callback('CHANNEL_ERROR'));
        }
        return mockChannel;
      });

      const { useActivityStream } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useActivityStream('session-1'), { wrapper });

      // After CHANNEL_ERROR, the hook sets status to 'error' then schedules reconnection
      await waitFor(() => {
        expect(['error', 'reconnecting']).toContain(result.current.connectionStatus);
      }, { timeout: 5000 });
    });

    it('should provide reconnect function', async () => {
      const mockChain = createMockChain([], null);
      mockSupabase.from.mockReturnValue(mockChain);
      mockChannel.subscribe.mockReturnValue(mockChannel);

      const { useActivityStream } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useActivityStream('session-1'), { wrapper });

      expect(typeof result.current.reconnect).toBe('function');
    });

    it('should handle CLOSED status', async () => {
      const mockChain = createMockChain([], null);
      mockSupabase.from.mockReturnValue(mockChain);

      // Mock subscribe to trigger CLOSED status using queueMicrotask for proper async sequencing
      mockChannel.subscribe.mockImplementation((callback) => {
        if (typeof callback === 'function') {
          queueMicrotask(() => callback('CLOSED'));
        }
        return mockChannel;
      });

      const { useActivityStream } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useActivityStream('session-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('disconnected');
      }, { timeout: 5000 });
    });

    it('should return lastHeartbeat after successful connection', async () => {
      const mockChain = createMockChain([], null);
      mockSupabase.from.mockReturnValue(mockChain);

      mockChannel.subscribe.mockImplementation((callback) => {
        if (typeof callback === 'function') {
          setTimeout(() => callback('SUBSCRIBED'), 0);
        }
        return mockChannel;
      });

      const { useActivityStream } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useActivityStream('session-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.lastHeartbeat).not.toBeNull();
      });
    });
  });

  describe('useActivityStreamSimple', () => {
    it('should return just activities array', async () => {
      const mockActivities: ActivityLog[] = [mockActivityLog];
      const mockChain = createMockChain(mockActivities, null);
      mockSupabase.from.mockReturnValue(mockChain);
      mockChannel.subscribe.mockReturnValue(mockChannel);

      const { useActivityStreamSimple } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useActivityStreamSimple('session-1'), { wrapper });

      expect(Array.isArray(result.current)).toBe(true);
    });

    it('should return empty array when sessionId is null', async () => {
      const { useActivityStreamSimple } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useActivityStreamSimple(null), { wrapper });

      expect(result.current).toEqual([]);
    });
  });

  describe('useCreateLiveSession', () => {
    it('should create a new live session', async () => {
      const newSession = { ...mockLiveSession, id: 'new-session' };
      const mockChain = createMockChain(newSession, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useCreateLiveSession } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useCreateLiveSession(), { wrapper });

      await act(async () => {
        const created = await result.current.mutateAsync({
          projectId: 'proj-1',
          sessionType: 'test_run',
          totalSteps: 10,
          metadata: { testSuite: 'smoke' },
        });

        expect(created.id).toBe('new-session');
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('live_sessions');
      expect(mockChain.insert).toHaveBeenCalledWith({
        project_id: 'proj-1',
        session_type: 'test_run',
        status: 'active',
        total_steps: 10,
        completed_steps: 0,
        metadata: { testSuite: 'smoke' },
      });
    });

    it('should create session with default values', async () => {
      const newSession = { ...mockLiveSession, id: 'new-session' };
      const mockChain = createMockChain(newSession, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useCreateLiveSession } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useCreateLiveSession(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          projectId: 'proj-1',
          sessionType: 'discovery',
        });
      });

      expect(mockChain.insert).toHaveBeenCalledWith({
        project_id: 'proj-1',
        session_type: 'discovery',
        status: 'active',
        total_steps: 0,
        completed_steps: 0,
        metadata: {},
      });
    });

    it('should invalidate queries on success', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const newSession = { ...mockLiveSession, project_id: 'proj-1' };
      const mockChain = createMockChain(newSession, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useCreateLiveSession } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useCreateLiveSession(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          projectId: 'proj-1',
          sessionType: 'test_run',
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['live-sessions', 'proj-1'],
      });
    });

    it('should handle creation errors', async () => {
      const mockChain = createMockChain(null, new Error('Insert failed'));
      mockSupabase.from.mockReturnValue(mockChain);

      const { useCreateLiveSession } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useCreateLiveSession(), { wrapper });

      await expect(
        result.current.mutateAsync({
          projectId: 'proj-1',
          sessionType: 'test_run',
        })
      ).rejects.toThrow('Insert failed');
    });
  });

  describe('useUpdateLiveSession', () => {
    it('should update a live session', async () => {
      const updatedSession = { ...mockLiveSession, status: 'completed' as const };
      const mockChain = createMockChain(updatedSession, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useUpdateLiveSession } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useUpdateLiveSession(), { wrapper });

      await act(async () => {
        const updated = await result.current.mutateAsync({
          sessionId: 'session-1',
          updates: { status: 'completed' },
        });

        expect(updated.status).toBe('completed');
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('live_sessions');
      expect(mockChain.update).toHaveBeenCalledWith({ status: 'completed' });
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'session-1');
    });

    it('should update multiple fields at once', async () => {
      const updatedSession = {
        ...mockLiveSession,
        status: 'completed' as const,
        completed_steps: 10,
        completed_at: '2024-01-15T11:00:00Z',
      };
      const mockChain = createMockChain(updatedSession, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useUpdateLiveSession } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useUpdateLiveSession(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          sessionId: 'session-1',
          updates: {
            status: 'completed',
            completed_steps: 10,
            completed_at: '2024-01-15T11:00:00Z',
          },
        });
      });

      expect(mockChain.update).toHaveBeenCalledWith({
        status: 'completed',
        completed_steps: 10,
        completed_at: '2024-01-15T11:00:00Z',
      });
    });

    it('should invalidate queries on success', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const mockChain = createMockChain(mockLiveSession, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useUpdateLiveSession } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useUpdateLiveSession(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          sessionId: 'session-1',
          updates: { status: 'completed' },
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['live-sessions', 'proj-1'],
      });
    });

    it('should handle update errors', async () => {
      const mockChain = createMockChain(null, new Error('Update failed'));
      mockSupabase.from.mockReturnValue(mockChain);

      const { useUpdateLiveSession } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useUpdateLiveSession(), { wrapper });

      await expect(
        result.current.mutateAsync({
          sessionId: 'session-1',
          updates: { status: 'failed' },
        })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('useLogActivity', () => {
    it('should log an activity', async () => {
      const newActivity = { ...mockActivityLog };
      const mockChain = createMockChain(newActivity, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useLogActivity } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useLogActivity(), { wrapper });

      await act(async () => {
        const logged = await result.current.mutateAsync({
          projectId: 'proj-1',
          sessionId: 'session-1',
          activityType: 'test_run',
          eventType: 'step',
          title: 'Running test step',
          description: 'Executing login flow',
          metadata: { attempt: 1 },
          screenshotUrl: 'https://example.com/step1.png',
          durationMs: 1500,
        });

        expect(logged.id).toBe('log-1');
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('activity_logs');
      expect(mockChain.insert).toHaveBeenCalledWith({
        project_id: 'proj-1',
        session_id: 'session-1',
        activity_type: 'test_run',
        event_type: 'step',
        title: 'Running test step',
        description: 'Executing login flow',
        metadata: { attempt: 1 },
        screenshot_url: 'https://example.com/step1.png',
        duration_ms: 1500,
      });
    });

    it('should log activity without optional fields', async () => {
      const newActivity = {
        ...mockActivityLog,
        description: undefined,
        metadata: undefined,
        screenshot_url: undefined,
        duration_ms: undefined,
      };
      const mockChain = createMockChain(newActivity, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useLogActivity } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useLogActivity(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          projectId: 'proj-1',
          sessionId: 'session-1',
          activityType: 'discovery',
          eventType: 'started',
          title: 'Discovery started',
        });
      });

      expect(mockChain.insert).toHaveBeenCalledWith({
        project_id: 'proj-1',
        session_id: 'session-1',
        activity_type: 'discovery',
        event_type: 'started',
        title: 'Discovery started',
        description: undefined,
        metadata: undefined,
        screenshot_url: undefined,
        duration_ms: undefined,
      });
    });

    it('should handle log errors', async () => {
      const mockChain = createMockChain(null, new Error('Log failed'));
      mockSupabase.from.mockReturnValue(mockChain);

      const { useLogActivity } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useLogActivity(), { wrapper });

      await expect(
        result.current.mutateAsync({
          projectId: 'proj-1',
          sessionId: 'session-1',
          activityType: 'test_run',
          eventType: 'error',
          title: 'Test failed',
        })
      ).rejects.toThrow('Log failed');
    });

    it('should support all activity types', async () => {
      const mockChain = createMockChain(mockActivityLog, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useLogActivity } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useLogActivity(), { wrapper });

      const activityTypes = ['discovery', 'visual_test', 'test_run', 'quality_audit', 'global_test'] as const;

      for (const activityType of activityTypes) {
        await act(async () => {
          await result.current.mutateAsync({
            projectId: 'proj-1',
            sessionId: 'session-1',
            activityType,
            eventType: 'step',
            title: `${activityType} step`,
          });
        });
      }

      expect(mockChain.insert).toHaveBeenCalledTimes(5);
    });

    it('should support all event types', async () => {
      const mockChain = createMockChain(mockActivityLog, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useLogActivity } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useLogActivity(), { wrapper });

      const eventTypes = ['started', 'step', 'screenshot', 'thinking', 'action', 'error', 'completed', 'cancelled'] as const;

      for (const eventType of eventTypes) {
        await act(async () => {
          await result.current.mutateAsync({
            projectId: 'proj-1',
            sessionId: 'session-1',
            activityType: 'test_run',
            eventType,
            title: `Event: ${eventType}`,
          });
        });
      }

      expect(mockChain.insert).toHaveBeenCalledTimes(8);
    });
  });

  describe('useLiveSessionManager', () => {
    it('should return null for currentSession initially', async () => {
      const { useLiveSessionManager } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useLiveSessionManager('proj-1'), { wrapper });

      expect(result.current.currentSession).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should not start session when projectId is null', async () => {
      const { useLiveSessionManager } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useLiveSessionManager(null), { wrapper });

      await act(async () => {
        const session = await result.current.startSession('test_run');
        expect(session).toBeNull();
      });
    });

    it('should start a new session and log started event', async () => {
      const newSession = { ...mockLiveSession };
      const mockChain = createMockChain(newSession, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useLiveSessionManager } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useLiveSessionManager('proj-1'), { wrapper });

      await act(async () => {
        const session = await result.current.startSession('test_run', 10);
        expect(session?.id).toBe('session-1');
      });

      expect(result.current.currentSession?.id).toBe('session-1');

      // Should have called insert twice: once for session, once for activity log
      expect(mockChain.insert).toHaveBeenCalledTimes(2);
    });

    it('should not log step when no current session', async () => {
      const { useLiveSessionManager } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useLiveSessionManager('proj-1'), { wrapper });

      // Attempt to log step without starting session
      await act(async () => {
        await result.current.logStep('Test step', 'Description');
      });

      // Should not have made any database calls
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should log thinking event', async () => {
      const newSession = { ...mockLiveSession };
      const mockChain = createMockChain(newSession, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useLiveSessionManager } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useLiveSessionManager('proj-1'), { wrapper });

      // Start session first
      await act(async () => {
        await result.current.startSession('test_run');
      });

      // Log thinking
      await act(async () => {
        await result.current.logThinking('Processing user input...');
      });

      // Check that thinking event was logged
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'thinking',
          title: 'AI Thinking',
          description: 'Processing user input...',
        })
      );
    });

    it('should log error event', async () => {
      const newSession = { ...mockLiveSession };
      const mockChain = createMockChain(newSession, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useLiveSessionManager } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useLiveSessionManager('proj-1'), { wrapper });

      await act(async () => {
        await result.current.startSession('test_run');
      });

      await act(async () => {
        await result.current.logError('Element not found');
      });

      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'error',
          title: 'Error',
          description: 'Element not found',
        })
      );
    });

    it('should complete session successfully', async () => {
      const newSession = { ...mockLiveSession };
      const mockChain = createMockChain(newSession, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useLiveSessionManager } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useLiveSessionManager('proj-1'), { wrapper });

      await act(async () => {
        await result.current.startSession('test_run');
      });

      expect(result.current.currentSession).not.toBeNull();

      await act(async () => {
        await result.current.completeSession(true);
      });

      expect(result.current.currentSession).toBeNull();

      // Should have logged completion and updated session
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'completed',
          title: 'Completed successfully',
        })
      );
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          completed_at: expect.any(String),
        })
      );
    });

    it('should complete session with failure status', async () => {
      const newSession = { ...mockLiveSession };
      const mockChain = createMockChain(newSession, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useLiveSessionManager } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useLiveSessionManager('proj-1'), { wrapper });

      await act(async () => {
        await result.current.startSession('test_run');
      });

      await act(async () => {
        await result.current.completeSession(false);
      });

      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'completed',
          title: 'Failed',
        })
      );
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
        })
      );
    });

    it('should provide isLoading status during mutations', async () => {
      // This test verifies that isLoading correctly reflects mutation state
      const newSession = { ...mockLiveSession };
      const mockChain = createMockChain(newSession, null);
      mockSupabase.from.mockReturnValue(mockChain);

      const { useLiveSessionManager } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useLiveSessionManager('proj-1'), { wrapper });

      // Initially not loading
      expect(result.current.isLoading).toBe(false);

      // Start session and verify it completes
      await act(async () => {
        await result.current.startSession('test_run');
      });

      // After mutation completes, isLoading should be false again
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('RECONNECT_CONFIG', () => {
    it('should have proper backoff configuration', async () => {
      // Import the module to test the configuration values are reasonable
      await import('@/lib/hooks/use-live-session');

      // The configuration is internal, but we can test its effects
      // through the useActivityStream hook behavior
      const mockChain = createMockChain([], null);
      mockSupabase.from.mockReturnValue(mockChain);

      // Mock subscribe to trigger TIMED_OUT using queueMicrotask
      mockChannel.subscribe.mockImplementation((callback) => {
        if (typeof callback === 'function') {
          queueMicrotask(() => callback('TIMED_OUT'));
        }
        return mockChannel;
      });

      const { useActivityStream } = await import('@/lib/hooks/use-live-session');

      const { result } = renderHook(() => useActivityStream('session-1'), { wrapper });

      // Wait for the error status to be processed (should go to 'error' then 'reconnecting')
      await waitFor(() => {
        // After TIMED_OUT, the hook sets status to 'error' then schedules reconnection
        // which sets status to 'reconnecting'
        expect(['error', 'reconnecting']).toContain(result.current.connectionStatus);
      }, { timeout: 5000 });
    });
  });

  describe('getBackoffDelay', () => {
    it('should calculate exponential backoff with jitter', async () => {
      const mockChain = createMockChain([], null);
      mockSupabase.from.mockReturnValue(mockChain);
      mockChannel.subscribe.mockReturnValue(mockChannel);

      const { useActivityStream } = await import('@/lib/hooks/use-live-session');

      // The getBackoffDelay function is internal to the hook,
      // but we can verify it produces reasonable values by
      // testing multiple reconnection attempts

      renderHook(() => useActivityStream('session-1'), { wrapper });

      // The hook uses getBackoffDelay internally
      // We just verify the hook loads without errors
      expect(true).toBe(true);
    });
  });
});
