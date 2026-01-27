'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { TestRun, TestResult } from '@/lib/supabase/types';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseTestRunRealtimeOptions {
  /** Whether to automatically reconnect on error */
  autoReconnect?: boolean;
  /** Callback when test run updates */
  onTestRunUpdate?: (testRun: TestRun) => void;
  /** Callback when a test result is added or updated */
  onTestResultUpdate?: (testResult: TestResult) => void;
}

interface UseTestRunRealtimeReturn {
  /** Current connection status */
  connectionStatus: ConnectionStatus;
  /** Whether the connection is active */
  isConnected: boolean;
  /** Manually reconnect to realtime */
  reconnect: () => void;
  /** Disconnect from realtime */
  disconnect: () => void;
  /** Last update timestamp */
  lastUpdate: Date | null;
}

/**
 * Hook for subscribing to real-time updates for a specific test run.
 * Subscribes to both test_runs table (for status updates) and test_results table (for result updates).
 *
 * @param testRunId - The ID of the test run to subscribe to
 * @param options - Optional configuration for the subscription
 * @returns Connection status and control functions
 *
 * @example
 * ```tsx
 * const { connectionStatus, isConnected, reconnect } = useTestRunRealtime(testRunId, {
 *   onTestRunUpdate: (run) => console.log('Run updated:', run.status),
 *   onTestResultUpdate: (result) => console.log('Result added:', result.name),
 * });
 * ```
 */
export function useTestRunRealtime(
  testRunId: string | null,
  options: UseTestRunRealtimeOptions = {}
): UseTestRunRealtimeReturn {
  const { autoReconnect = true, onTestRunUpdate, onTestResultUpdate } = options;

  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Handle test run changes
  const handleTestRunChange = useCallback(
    (payload: RealtimePostgresChangesPayload<TestRun>) => {
      setLastUpdate(new Date());

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['test-run', testRunId] });

      // Call the callback if provided
      if (onTestRunUpdate && payload.new) {
        onTestRunUpdate(payload.new as TestRun);
      }
    },
    [queryClient, testRunId, onTestRunUpdate]
  );

  // Handle test result changes
  const handleTestResultChange = useCallback(
    (payload: RealtimePostgresChangesPayload<TestResult>) => {
      setLastUpdate(new Date());

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['test-results', testRunId] });

      // Call the callback if provided
      if (onTestResultUpdate && payload.new) {
        onTestResultUpdate(payload.new as TestResult);
      }
    },
    [queryClient, testRunId, onTestResultUpdate]
  );

  // Connect to realtime
  const connect = useCallback(() => {
    if (!testRunId) return;

    setConnectionStatus('connecting');

    const newChannel = supabase
      .channel(`test-run-${testRunId}`)
      // Subscribe to test_runs table for this specific run
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_runs',
          filter: `id=eq.${testRunId}`,
        },
        handleTestRunChange
      )
      // Subscribe to test_results table for results belonging to this run
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_results',
          filter: `test_run_id=eq.${testRunId}`,
        },
        handleTestResultChange
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error');
          if (autoReconnect) {
            // Attempt to reconnect after a delay
            setTimeout(() => {
              disconnect();
              connect();
            }, 5000);
          }
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    setChannel(newChannel);
  }, [testRunId, supabase, handleTestRunChange, handleTestResultChange, autoReconnect]);

  // Disconnect from realtime
  const disconnect = useCallback(() => {
    if (channel) {
      supabase.removeChannel(channel);
      setChannel(null);
      setConnectionStatus('disconnected');
    }
  }, [channel, supabase]);

  // Reconnect function
  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);

  // Effect to manage subscription lifecycle
  useEffect(() => {
    if (testRunId) {
      connect();
    }

    return () => {
      disconnect();
    };
    // We intentionally only re-run when testRunId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testRunId]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    reconnect,
    disconnect,
    lastUpdate,
  };
}

/**
 * Hook for subscribing to real-time updates for all test runs in a project.
 * Useful for dashboard views that show a list of test runs.
 *
 * @param projectId - The ID of the project to subscribe to
 * @returns Connection status and control functions
 */
export function useProjectTestRunsRealtime(projectId: string | null): UseTestRunRealtimeReturn {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Connect to realtime
  const connect = useCallback(() => {
    if (!projectId) return;

    setConnectionStatus('connecting');

    const newChannel = supabase
      .channel(`project-test-runs-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_runs',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          setLastUpdate(new Date());
          // Invalidate all test run queries for this project
          queryClient.invalidateQueries({ queryKey: ['test-runs', projectId] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error');
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    setChannel(newChannel);
  }, [projectId, supabase, queryClient]);

  // Disconnect from realtime
  const disconnect = useCallback(() => {
    if (channel) {
      supabase.removeChannel(channel);
      setChannel(null);
      setConnectionStatus('disconnected');
    }
  }, [channel, supabase]);

  // Reconnect function
  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);

  // Effect to manage subscription lifecycle
  useEffect(() => {
    if (projectId) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    reconnect,
    disconnect,
    lastUpdate,
  };
}
