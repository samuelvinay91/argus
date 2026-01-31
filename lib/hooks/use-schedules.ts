'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProjects } from './use-projects';
import {
  schedulesApi,
  testsApi,
  BACKEND_URL,
  getAuthToken,
  type Schedule,
  type ScheduleRun as ApiScheduleRun,
} from '@/lib/api-client';
import type { Json } from '@/lib/supabase/types';

// ============================================================================
// Legacy Types (for backward compatibility with existing components)
// ============================================================================

/**
 * Legacy TestSchedule type - matches the original Supabase schema format
 * Existing components expect snake_case fields
 */
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

// AI Analysis types
export interface AIAnalysis {
  category?: string;
  confidence?: number;
  summary?: string;
  suggested_fix?: string;
  is_flaky?: boolean;
  root_cause?: string;
  similar_failures?: string[];
  detailed_analysis?: string;
  auto_healable?: boolean;
}

export interface HealingDetails {
  healed_at?: string;
  original_selector?: string;
  new_selector?: string;
  confidence?: number;
  healing_type?: string;
}

/**
 * Legacy ScheduleRun type - matches the original Supabase schema format
 */
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
  // AI Analysis fields
  ai_analysis?: AIAnalysis | null;
  is_flaky?: boolean;
  flaky_score?: number;
  failure_category?: string | null;
  failure_confidence?: number | null;
  // Auto-healing fields
  auto_healed?: boolean;
  healing_details?: HealingDetails | null;
}

/**
 * Legacy ScheduleFormData type - used by schedule creation/update forms
 */
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

// ============================================================================
// Transform Functions (API camelCase -> Legacy snake_case)
// ============================================================================

/**
 * Transform API Schedule response to legacy TestSchedule format
 * The API returns camelCase, but existing components expect snake_case
 */
function transformScheduleToLegacy(schedule: Schedule): TestSchedule {
  return {
    id: schedule.id,
    project_id: schedule.projectId,
    organization_id: null, // API doesn't expose this separately
    name: schedule.name,
    description: schedule.description,
    cron_expression: schedule.cronExpression,
    timezone: 'UTC', // Backend uses UTC by default
    enabled: schedule.enabled,
    is_recurring: true, // All schedules are recurring
    test_ids: schedule.testIds || [],
    test_filter: {},
    next_run_at: schedule.nextRunAt,
    last_run_at: schedule.lastRunAt,
    run_count: schedule.runCount,
    failure_count: schedule.failureCount,
    success_rate: schedule.runCount > 0
      ? (schedule.successCount / schedule.runCount) * 100
      : 0,
    notification_config: {
      on_failure: schedule.notifyOnFailure,
      on_success: false,
      channels: Object.keys(schedule.notificationChannels || {}).filter(
        k => schedule.notificationChannels[k]
      ),
    },
    max_parallel_tests: 1, // Default value
    timeout_ms: schedule.timeoutMinutes * 60 * 1000,
    retry_failed_tests: schedule.retryCount > 0,
    retry_count: schedule.retryCount,
    environment: 'production', // Default value
    browser: 'chrome', // Default value
    app_url_override: schedule.appUrl,
    created_by: schedule.createdBy,
    created_at: schedule.createdAt,
    updated_at: schedule.updatedAt,
  };
}

/**
 * Transform API ScheduleRun response to legacy ScheduleRun format
 */
function transformScheduleRunToLegacy(run: ApiScheduleRun): ScheduleRun {
  // Map status - API may return 'success'/'failure' but legacy expects 'passed'/'failed'
  let status: ScheduleRun['status'] = run.status as ScheduleRun['status'];
  if (run.status === 'success') status = 'passed';
  if (run.status === 'failure') status = 'failed';

  return {
    id: run.id,
    schedule_id: run.scheduleId,
    test_run_id: null,
    triggered_at: run.startedAt,
    started_at: run.startedAt,
    completed_at: run.completedAt,
    status,
    trigger_type: run.triggerType,
    triggered_by: run.triggeredBy,
    tests_total: run.testResults?.total ?? 0,
    tests_passed: run.testResults?.passed ?? 0,
    tests_failed: run.testResults?.failed ?? 0,
    tests_skipped: run.testResults?.skipped ?? 0,
    duration_ms: run.durationSeconds ? run.durationSeconds * 1000 : null,
    error_message: run.errorMessage,
    error_details: {},
    logs: [],
    metadata: {},
    created_at: run.startedAt,
    // AI Analysis fields
    ai_analysis: run.aiAnalysis ? {
      category: run.aiAnalysis.category,
      confidence: run.aiAnalysis.confidence,
      summary: run.aiAnalysis.summary,
      suggested_fix: run.aiAnalysis.suggestedFix,
      is_flaky: run.aiAnalysis.isFlaky,
      root_cause: run.aiAnalysis.rootCause,
      similar_failures: run.aiAnalysis.similarFailures,
      detailed_analysis: run.aiAnalysis.detailedAnalysis,
      auto_healable: run.aiAnalysis.autoHealable,
    } : null,
    is_flaky: run.isFlaky ?? false,
    flaky_score: run.flakyScore ?? 0,
    failure_category: run.failureCategory,
    failure_confidence: run.failureConfidence,
    // Auto-healing fields
    auto_healed: run.autoHealed ?? false,
    healing_details: run.healingDetails ? {
      healed_at: run.healingDetails.healedAt,
      original_selector: run.healingDetails.originalSelector,
      new_selector: run.healingDetails.newSelector,
      confidence: run.healingDetails.confidence,
      healing_type: run.healingDetails.healingType,
    } : null,
  };
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch all schedules for current projects via backend API
 */
export function useSchedules() {
  const { data: projects = [] } = useProjects();
  const projectIds = projects.map(p => p.id);

  return useQuery({
    queryKey: ['schedules', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];

      // Fetch schedules from backend API
      const response = await schedulesApi.list();
      return response.schedules.map(transformScheduleToLegacy);
    },
    enabled: projectIds.length > 0,
  });
}

/**
 * Fetch schedule runs for a specific schedule via backend API
 * Automatically polls every 2s when there are active runs
 */
export function useScheduleRuns(scheduleId: string | null) {
  return useQuery({
    queryKey: ['schedule-runs', scheduleId],
    queryFn: async () => {
      if (!scheduleId) return [];

      const runs = await schedulesApi.getRuns(scheduleId);
      return runs.map(transformScheduleRunToLegacy);
    },
    enabled: !!scheduleId,
    // Poll every 2 seconds when there are running or pending runs
    refetchInterval: (query) => {
      const data = query.state.data as ScheduleRun[] | undefined;
      const hasActiveRuns = data?.some(
        r => r.status === 'running' || r.status === 'pending' || r.status === 'queued'
      );
      return hasActiveRuns ? 2000 : false;
    },
  });
}

/**
 * Fetch today's schedule stats via backend API
 */
export function useScheduleStats() {
  const { data: projects = [] } = useProjects();
  const projectIds = projects.map(p => p.id);

  return useQuery({
    queryKey: ['schedule-stats', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) {
        return { runsToday: 0, failuresToday: 0 };
      }

      // Get all schedules
      const schedulesResponse = await schedulesApi.list();
      const scheduleIds = schedulesResponse.schedules.map(s => s.id);

      if (scheduleIds.length === 0) {
        return { runsToday: 0, failuresToday: 0 };
      }

      // Get runs for today from all schedules
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startOfDayIso = startOfDay.toISOString();

      let runsToday = 0;
      let failuresToday = 0;

      // Fetch runs for each schedule and aggregate
      // Note: In a production scenario, the backend should have an aggregated endpoint
      await Promise.all(
        scheduleIds.map(async (scheduleId) => {
          try {
            const runs = await schedulesApi.getRuns(scheduleId, { limit: 100 });
            const todayRuns = runs.filter(r => r.startedAt >= startOfDayIso);
            runsToday += todayRuns.length;
            failuresToday += todayRuns.filter(r =>
              r.status === 'failed' || r.status === 'failure'
            ).length;
          } catch {
            // Ignore errors for individual schedules
          }
        })
      );

      return { runsToday, failuresToday };
    },
    enabled: projectIds.length > 0,
  });
}

/**
 * Create a new schedule via backend API
 */
export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      data
    }: {
      projectId: string;
      data: ScheduleFormData
    }) => {
      // Convert legacy snake_case form data to API camelCase format
      const schedule = await schedulesApi.create({
        projectId,
        name: data.name,
        cronExpression: data.cron_expression,
        testIds: data.test_ids,
        appUrl: data.app_url_override || '',
        enabled: true,
        notifyOnFailure: data.notification_config.on_failure,
        notificationChannels: data.notification_config.channels.reduce(
          (acc, ch) => ({ ...acc, [ch]: true }),
          {} as Record<string, boolean>
        ),
        description: data.description,
        timeoutMinutes: Math.floor(data.timeout_ms / 60000),
        retryCount: data.retry_count,
      });

      return transformScheduleToLegacy(schedule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

/**
 * Update a schedule via backend API
 */
export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: string;
      data: Partial<ScheduleFormData>
    }) => {
      // Convert legacy snake_case form data to API camelCase format
      const updateData: Parameters<typeof schedulesApi.update>[1] = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.cron_expression !== undefined) updateData.cronExpression = data.cron_expression;
      if (data.test_ids !== undefined) updateData.testIds = data.test_ids;
      if (data.app_url_override !== undefined) updateData.appUrl = data.app_url_override;
      if (data.notification_config !== undefined) {
        updateData.notifyOnFailure = data.notification_config.on_failure;
        updateData.notificationChannels = data.notification_config.channels.reduce(
          (acc, ch) => ({ ...acc, [ch]: true }),
          {} as Record<string, boolean>
        );
      }
      if (data.timeout_ms !== undefined) updateData.timeoutMinutes = Math.floor(data.timeout_ms / 60000);
      if (data.retry_count !== undefined) updateData.retryCount = data.retry_count;

      const schedule = await schedulesApi.update(id, updateData);
      return transformScheduleToLegacy(schedule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

/**
 * Toggle schedule enabled state via backend API
 */
export function useToggleSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const schedule = await schedulesApi.update(id, { enabled });
      return transformScheduleToLegacy(schedule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

/**
 * Delete a schedule via backend API
 */
export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await schedulesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

/**
 * Trigger a schedule manually via backend API
 */
export function useTriggerSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const response = await schedulesApi.trigger(scheduleId);
      return {
        success: response.success,
        message: response.message,
        run_id: response.runId,
        schedule_id: response.scheduleId,
        started_at: response.startedAt,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-runs', data.schedule_id] });
      queryClient.invalidateQueries({ queryKey: ['schedule-stats'] });
    },
  });
}

/**
 * Fetch tests for schedule selection via backend API
 */
export function useTestsForSchedule(projectId: string | null) {
  return useQuery({
    queryKey: ['tests-for-schedule', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await testsApi.list({ projectId, isActive: true });
      return response.tests.map(t => ({
        id: t.id,
        name: t.name,
        tags: t.tags,
      }));
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// SSE Streaming Types and Hook
// ============================================================================

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

/**
 * Hook to subscribe to schedule run events via SSE
 */
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
      const url = new URL(
        `${baseUrl}/api/v1/schedules/${scheduleId}/runs/${runId}/stream`,
        window.location.origin
      );
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
