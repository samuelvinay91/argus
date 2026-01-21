'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useProjects } from './use-projects';
import type { Json } from '@/lib/supabase/types';
import { useFeatureFlags } from '@/lib/feature-flags';
import { schedulesApi } from '@/lib/api-client';

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
  const flags = useFeatureFlags();

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: ScheduleFormData }) => {
      if (flags.useBackendApi('schedules')) {
        // NEW: Use backend API
        return schedulesApi.create({
          projectId,
          name: data.name,
          scheduleType: 'cron',
          cronExpression: data.cron_expression,
          testIds: data.test_ids,
          enabled: true,
        }) as Promise<TestSchedule>;
      }

      // LEGACY: Direct Supabase
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
  const flags = useFeatureFlags();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ScheduleFormData> }) => {
      if (flags.useBackendApi('schedules')) {
        // NEW: Use backend API
        return schedulesApi.update(id, data) as Promise<TestSchedule>;
      }

      // LEGACY: Direct Supabase
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
  const flags = useFeatureFlags();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      if (flags.useBackendApi('schedules')) {
        // NEW: Use backend API
        return schedulesApi.toggle(id, enabled) as Promise<TestSchedule>;
      }

      // LEGACY: Direct Supabase
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
  const flags = useFeatureFlags();

  return useMutation({
    mutationFn: async (id: string) => {
      if (flags.useBackendApi('schedules')) {
        // NEW: Use backend API
        await schedulesApi.delete(id);
        return;
      }

      // LEGACY: Direct Supabase
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

// Trigger a schedule manually (creates a schedule run)
export function useTriggerSchedule() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: run, error } = await (supabase.from('schedule_runs') as any)
        .insert({
          schedule_id: scheduleId,
          trigger_type: 'manual',
          status: 'queued',
        })
        .select()
        .single();

      if (error) throw error;
      return run as ScheduleRun;
    },
    onSuccess: (_, scheduleId) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-runs', scheduleId] });
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
