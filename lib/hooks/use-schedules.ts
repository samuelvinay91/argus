'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useProjects } from './use-projects';
import { fetchJson, BACKEND_URL, getAuthToken } from '@/lib/api-client';
import type { Json } from '@/lib/supabase/types';

// Types for schedules based on the database schema
export interface TestSchedule {
  id: string;
  project_id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  is_recurring: boolean;
  test_ids: string[];
  test_filter: Json;
  next_run_at: string | null;
  last_run_at: string | null;
  run_count: number;
  failure_count: number;
  success_rate: number;
  notification_config: {
    on_failure: boolean;
    on_success: boolean;
    channels: string[];
  };
  max_parallel_tests: number;
  timeout_ms: number;
  retry_failed_tests: boolean;
  retry_count: number;
  environment: string;
  browser: string;
  app_url_override: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleRun {
  id: string;
  schedule_id: string;
  test_run_id: string | null;
  triggered_at: string;
  started_at: string | null;
  completed_at: string | null;
  status: 'pending' | 'queued' | 'running' | 'passed' | 'failed' | 'cancelled' | 'timeout';
  trigger_type: 'scheduled' | 'manual' | 'webhook' | 'api';
  triggered_by: string | null;
  tests_total: number;
  tests_passed: number;
  tests_failed: number;
  tests_skipped: number;
  duration_ms: number | null;
  error_message: string | null;
  error_details: Json;
  logs: Json;
  metadata: Json;
  created_at: string;
}

export interface ScheduleFormData {
  name: string;
  description?: string;
  cron_expression: string;
  timezone: string;
  test_ids: string[];
  test_filter: Json;
  notification_config: {
    on_failure: boolean;
    on_success: boolean;
    channels: string[];
  };
  environment: string;
  browser: string;
  max_parallel_tests: number;
  timeout_ms: number;
  retry_failed_tests: boolean;
  retry_count: number;
  app_url_override?: string;
}

// Fetch all schedules for current projects
export function useSchedules() {
  const supabase = getSupabaseClient();
  const { data: projects = [] } = useProjects();
  const projectIds = projects.map(p => p.id);

  return useQuery({
    queryKey: ['schedules', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('test_schedules') as any)
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TestSchedule[];
    },
    enabled: projectIds.length > 0,
  });
}

// Fetch schedule runs for a specific schedule
// Automatically polls every 2s when there are active runs
export function useScheduleRuns(scheduleId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['schedule-runs', scheduleId],
    queryFn: async () => {
      if (!scheduleId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('schedule_runs') as any)
        .select('*')
        .eq('schedule_id', scheduleId)
        .order('triggered_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as ScheduleRun[];
    },
    enabled: !!scheduleId,
    // Poll every 2 seconds when there are running or pending runs
    refetchInterval: (query) => {
      const data = query.state.data as ScheduleRun[] | undefined;
      const hasActiveRuns = data?.some(r => r.status === 'running' || r.status === 'pending' || r.status === 'queued');
      return hasActiveRuns ? 2000 : false;
    },
  });
}

// Fetch today's schedule stats
export function useScheduleStats() {
  const supabase = getSupabaseClient();
  const { data: projects = [] } = useProjects();
  const projectIds = projects.map(p => p.id);

  return useQuery({
    queryKey: ['schedule-stats', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) {
        return { runsToday: 0, failuresToday: 0 };
      }

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      // Get schedules first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: schedules, error: schedulesError } = await (supabase.from('test_schedules') as any)
        .select('id')
        .in('project_id', projectIds);

      if (schedulesError) throw schedulesError;

      const scheduleIds = (schedules || []).map((s: { id: string }) => s.id);

      if (scheduleIds.length === 0) {
        return { runsToday: 0, failuresToday: 0 };
      }

      // Get runs for today
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: runs, error: runsError } = await (supabase.from('schedule_runs') as any)
        .select('status')
        .in('schedule_id', scheduleIds)
        .gte('triggered_at', startOfDay.toISOString());

      if (runsError) throw runsError;

      const runsToday = (runs || []).length;
      const failuresToday = (runs || []).filter((r: { status: string }) => r.status === 'failed').length;

      return { runsToday, failuresToday };
    },
    enabled: projectIds.length > 0,
  });
}

// Create a new schedule
export function useCreateSchedule() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: ScheduleFormData }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: schedule, error } = await (supabase.from('test_schedules') as any)
        .insert({
          project_id: projectId,
          ...data,
          enabled: true,
        })
        .select()
        .single();

      if (error) throw error;
      return schedule as TestSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

// Update a schedule
export function useUpdateSchedule() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ScheduleFormData> }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: schedule, error } = await (supabase.from('test_schedules') as any)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return schedule as TestSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

// Toggle schedule enabled state
export function useToggleSchedule() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: schedule, error } = await (supabase.from('test_schedules') as any)
        .update({ enabled })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return schedule as TestSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

// Delete a schedule
export function useDeleteSchedule() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('test_schedules') as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

// Trigger response from the backend API
interface TriggerResponse {
  success: boolean;
  message: string;
  run_id: string;
  schedule_id: string;
  started_at: string;
}

// Trigger a schedule manually - calls backend API to actually run tests
export function useTriggerSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      // Call the backend API to trigger the schedule
      // This will actually execute tests via Selenium Grid
      const response = await fetchJson<TriggerResponse>(
        `/api/v1/schedules/${scheduleId}/trigger`,
        { method: 'POST' }
      );
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-runs', data.schedule_id] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
    },
  });
}

// Fetch tests for schedule selection
export function useTestsForSchedule(projectId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['tests-for-schedule', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('tests') as any)
        .select('id, name, tags')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as { id: string; name: string; tags: string[] }[];
    },
    enabled: !!projectId,
  });
}

// SSE Event types for schedule run streaming
export interface ScheduleRunEvent {
  type:
    | 'run_started'
    | 'tests_fetched'
    | 'test_started'
    | 'step_started'
    | 'step_completed'
    | 'test_completed'
    | 'progress'
    | 'run_completed'
    | 'run_already_completed'
    | 'heartbeat'
    | 'timeout'
    | 'error';
  data?: {
    schedule_id?: string;
    run_id?: string;
    schedule_name?: string;
    test_id?: string;
    test_name?: string;
    test_count?: number;
    step_index?: number;
    instruction?: string;
    success?: boolean;
    duration_ms?: number;
    error?: string;
    tests_total?: number;
    tests_passed?: number;
    tests_failed?: number;
    current_test?: number;
    total_tests?: number;
    percent?: number;
    status?: string;
    message?: string;
  };
  timestamp?: string;
}

// Hook to subscribe to schedule run events via SSE
export function useScheduleRunStream(
  scheduleId: string | null,
  runId: string | null,
  options?: {
    onEvent?: (event: ScheduleRunEvent) => void;
    onComplete?: () => void;
    onError?: (error: Error) => void;
  }
) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<ScheduleRunEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const queryClient = useQueryClient();

  const connect = useCallback(async () => {
    if (!scheduleId || !runId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      // Get auth token for the connection
      const token = await getAuthToken();

      // Build URL with auth token as query param (EventSource doesn't support headers)
      const baseUrl = BACKEND_URL || '';
      const url = new URL(`${baseUrl}/api/v1/schedules/${scheduleId}/runs/${runId}/stream`, window.location.origin);
      if (token) {
        url.searchParams.set('token', token);
      }

      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const parsedEvent = JSON.parse(event.data) as ScheduleRunEvent;
          setLastEvent(parsedEvent);
          options?.onEvent?.(parsedEvent);

          // Invalidate queries on completion
          if (parsedEvent.type === 'run_completed' || parsedEvent.type === 'run_already_completed') {
            queryClient.invalidateQueries({ queryKey: ['schedule-runs', scheduleId] });
            queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
            options?.onComplete?.();
            eventSource.close();
            setIsConnected(false);
          }

          if (parsedEvent.type === 'error' || parsedEvent.type === 'timeout') {
            const err = new Error(parsedEvent.data?.message || 'Stream error');
            setError(err);
            options?.onError?.(err);
            eventSource.close();
            setIsConnected(false);
          }
        } catch (e) {
          console.error('Failed to parse SSE event:', e);
        }
      };

      eventSource.onerror = (e) => {
        console.error('SSE connection error:', e);
        setIsConnected(false);
        const err = new Error('Connection lost');
        setError(err);
        options?.onError?.(err);
        eventSource.close();
      };
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to connect');
      setError(err);
      options?.onError?.(err);
    }
  }, [scheduleId, runId, options, queryClient]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Auto-connect when IDs are provided
  useEffect(() => {
    if (scheduleId && runId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [scheduleId, runId, connect, disconnect]);

  return {
    isConnected,
    lastEvent,
    error,
    connect,
    disconnect,
  };
}
