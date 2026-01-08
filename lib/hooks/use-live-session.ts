'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';

export interface ActivityLog {
  id: string;
  project_id: string;
  session_id: string;
  activity_type: 'discovery' | 'visual_test' | 'test_run' | 'quality_audit' | 'global_test';
  event_type: 'started' | 'step' | 'screenshot' | 'thinking' | 'action' | 'error' | 'completed' | 'cancelled';
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  screenshot_url?: string;
  duration_ms?: number;
  created_at: string;
}

export interface LiveSession {
  id: string;
  project_id: string;
  session_type: 'discovery' | 'visual_test' | 'test_run' | 'quality_audit' | 'global_test';
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  current_step?: string;
  total_steps: number;
  completed_steps: number;
  last_screenshot_url?: string;
  started_at: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
}

// Hook to get active sessions for a project
export function useActiveSessions(projectId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['live-sessions', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await (supabase.from('live_sessions') as any)
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data as LiveSession[];
    },
    enabled: !!projectId,
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

// Hook to get activity logs for a session with real-time updates
export function useActivityStream(sessionId: string | null) {
  const supabase = getSupabaseClient();
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  // Initial fetch
  useEffect(() => {
    if (!sessionId) {
      setActivities([]);
      return;
    }

    const fetchActivities = async () => {
      const { data, error } = await (supabase.from('activity_logs') as any)
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setActivities(data);
      }
    };

    fetchActivities();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`activity-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: any) => {
          setActivities((prev) => [...prev, payload.new as ActivityLog]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  return activities;
}

// Hook to create a new live session
export function useCreateLiveSession() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      sessionType,
      totalSteps = 0,
      metadata = {},
    }: {
      projectId: string;
      sessionType: LiveSession['session_type'];
      totalSteps?: number;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await (supabase.from('live_sessions') as any)
        .insert({
          project_id: projectId,
          session_type: sessionType,
          status: 'active',
          total_steps: totalSteps,
          completed_steps: 0,
          metadata,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LiveSession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['live-sessions', data.project_id] });
    },
  });
}

// Hook to update a live session
export function useUpdateLiveSession() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      updates,
    }: {
      sessionId: string;
      updates: Partial<Pick<LiveSession, 'status' | 'current_step' | 'completed_steps' | 'last_screenshot_url' | 'completed_at' | 'metadata'>>;
    }) => {
      const { data, error } = await (supabase.from('live_sessions') as any)
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as LiveSession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['live-sessions', data.project_id] });
    },
  });
}

// Hook to log an activity
export function useLogActivity() {
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      sessionId,
      activityType,
      eventType,
      title,
      description,
      metadata,
      screenshotUrl,
      durationMs,
    }: {
      projectId: string;
      sessionId: string;
      activityType: ActivityLog['activity_type'];
      eventType: ActivityLog['event_type'];
      title: string;
      description?: string;
      metadata?: Record<string, unknown>;
      screenshotUrl?: string;
      durationMs?: number;
    }) => {
      const { data, error } = await (supabase.from('activity_logs') as any)
        .insert({
          project_id: projectId,
          session_id: sessionId,
          activity_type: activityType,
          event_type: eventType,
          title,
          description,
          metadata,
          screenshot_url: screenshotUrl,
          duration_ms: durationMs,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ActivityLog;
    },
  });
}

// Combined hook for managing a live session with activity logging
export function useLiveSessionManager(projectId: string | null) {
  const createSession = useCreateLiveSession();
  const updateSession = useUpdateLiveSession();
  const logActivity = useLogActivity();
  const [currentSession, setCurrentSession] = useState<LiveSession | null>(null);

  const startSession = useCallback(async (
    sessionType: LiveSession['session_type'],
    totalSteps: number = 0
  ) => {
    if (!projectId) return null;

    const session = await createSession.mutateAsync({
      projectId,
      sessionType,
      totalSteps,
    });

    setCurrentSession(session);

    // Log start event
    await logActivity.mutateAsync({
      projectId,
      sessionId: session.id,
      activityType: sessionType,
      eventType: 'started',
      title: `${sessionType.replace('_', ' ')} started`,
    });

    return session;
  }, [projectId, createSession, logActivity]);

  const logStep = useCallback(async (
    title: string,
    description?: string,
    screenshotUrl?: string
  ) => {
    if (!projectId || !currentSession) return;

    await logActivity.mutateAsync({
      projectId,
      sessionId: currentSession.id,
      activityType: currentSession.session_type,
      eventType: 'step',
      title,
      description,
      screenshotUrl,
    });

    // Update session progress
    await updateSession.mutateAsync({
      sessionId: currentSession.id,
      updates: {
        completed_steps: (currentSession.completed_steps || 0) + 1,
        current_step: title,
        last_screenshot_url: screenshotUrl || currentSession.last_screenshot_url,
      },
    });
  }, [projectId, currentSession, logActivity, updateSession]);

  const logThinking = useCallback(async (thought: string) => {
    if (!projectId || !currentSession) return;

    await logActivity.mutateAsync({
      projectId,
      sessionId: currentSession.id,
      activityType: currentSession.session_type,
      eventType: 'thinking',
      title: 'AI Thinking',
      description: thought,
    });
  }, [projectId, currentSession, logActivity]);

  const logError = useCallback(async (error: string) => {
    if (!projectId || !currentSession) return;

    await logActivity.mutateAsync({
      projectId,
      sessionId: currentSession.id,
      activityType: currentSession.session_type,
      eventType: 'error',
      title: 'Error',
      description: error,
    });
  }, [projectId, currentSession, logActivity]);

  const completeSession = useCallback(async (success: boolean) => {
    if (!projectId || !currentSession) return;

    const status = success ? 'completed' : 'failed';

    await logActivity.mutateAsync({
      projectId,
      sessionId: currentSession.id,
      activityType: currentSession.session_type,
      eventType: 'completed',
      title: success ? 'Completed successfully' : 'Failed',
    });

    await updateSession.mutateAsync({
      sessionId: currentSession.id,
      updates: {
        status,
        completed_at: new Date().toISOString(),
      },
    });

    setCurrentSession(null);
  }, [projectId, currentSession, logActivity, updateSession]);

  return {
    currentSession,
    startSession,
    logStep,
    logThinking,
    logError,
    completeSession,
    isLoading: createSession.isPending || updateSession.isPending,
  };
}
