import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/types';

// Type for LangGraph checkpoint (not in generated types)
interface LangGraphCheckpoint {
  thread_id: string;
  checkpoint_id: string;
  parent_checkpoint_id: string | null;
  type: string;
  checkpoint: Json;
  metadata: Json;
  created_at: string;
}

// ============================================
// Types
// ============================================

export type ExecutionStatus =
  | 'idle'
  | 'analyzing'
  | 'planning'
  | 'executing'
  | 'healing'
  | 'reporting'
  | 'completed'
  | 'failed';

export interface GraphExecution {
  id: string;
  thread_id: string;
  project_id: string | null;
  project_name?: string;
  status: ExecutionStatus;
  current_agent: string | null;
  current_step: number;
  total_steps: number;
  passed_steps: number;
  failed_steps: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface ExecutionDetail extends GraphExecution {
  checkpoints: CheckpointSummary[];
  logs: ExecutionLog[];
  agents: AgentExecution[];
}

export interface CheckpointSummary {
  checkpoint_id: string;
  created_at: string;
  type: string;
  metadata: Json;
}

export interface ExecutionLog {
  id: string;
  timestamp: string;
  agent: string;
  level: 'info' | 'success' | 'error' | 'thinking' | 'warning';
  message: string;
  metadata?: Json;
}

export interface AgentExecution {
  agent_type: string;
  status: 'idle' | 'active' | 'completed' | 'error';
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
}

export interface OrchestratorStats {
  total_executions: number;
  active_executions: number;
  completed_last_24h: number;
  failed_last_24h: number;
  success_rate: number;
  avg_duration_ms: number;
}

// ============================================
// Helper functions
// ============================================

function mapCheckpointToExecution(checkpoint: any): GraphExecution {
  const metadata = checkpoint.metadata || {};
  const state = checkpoint.checkpoint || {};

  // Parse state from checkpoint to determine status
  let status: ExecutionStatus = 'idle';
  if (state.orchestrator_state) {
    status = state.orchestrator_state as ExecutionStatus;
  } else if (metadata.status) {
    status = metadata.status as ExecutionStatus;
  }

  const isActive = ['analyzing', 'planning', 'executing', 'healing', 'reporting'].includes(status);
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  return {
    id: checkpoint.checkpoint_id,
    thread_id: checkpoint.thread_id,
    project_id: metadata.project_id || null,
    project_name: metadata.project_name,
    status,
    current_agent: state.current_agent || metadata.current_agent || null,
    current_step: state.current_step || metadata.current_step || 0,
    total_steps: state.total_steps || metadata.total_steps || 0,
    passed_steps: state.passed_steps || metadata.passed_steps || 0,
    failed_steps: state.failed_steps || metadata.failed_steps || 0,
    started_at: metadata.started_at || checkpoint.created_at,
    completed_at: (isCompleted || isFailed) ? checkpoint.created_at : null,
    duration_ms: metadata.duration_ms || null,
    error_message: state.error_message || metadata.error_message || null,
    metadata: metadata,
    created_at: checkpoint.created_at,
    updated_at: checkpoint.created_at,
  };
}

function calculateStats(executions: GraphExecution[]): OrchestratorStats {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const activeStatuses: ExecutionStatus[] = ['analyzing', 'planning', 'executing', 'healing', 'reporting'];
  const activeExecutions = executions.filter(e => activeStatuses.includes(e.status));

  const recentExecutions = executions.filter(
    e => new Date(e.created_at) >= twentyFourHoursAgo
  );

  const completedRecent = recentExecutions.filter(e => e.status === 'completed');
  const failedRecent = recentExecutions.filter(e => e.status === 'failed');

  const completedWithDuration = executions.filter(
    e => e.status === 'completed' && e.duration_ms !== null
  );

  const avgDuration = completedWithDuration.length > 0
    ? completedWithDuration.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / completedWithDuration.length
    : 0;

  const finishedRecent = completedRecent.length + failedRecent.length;
  const successRate = finishedRecent > 0
    ? (completedRecent.length / finishedRecent) * 100
    : 0;

  return {
    total_executions: executions.length,
    active_executions: activeExecutions.length,
    completed_last_24h: completedRecent.length,
    failed_last_24h: failedRecent.length,
    success_rate: Math.round(successRate * 10) / 10,
    avg_duration_ms: Math.round(avgDuration),
  };
}

// ============================================
// Hooks
// ============================================

/**
 * Fetch active graph executions
 */
export function useActiveExecutions() {
  const { isLoaded, isSignedIn } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['orchestrator-active-executions'],
    queryFn: async () => {
      // Get the most recent checkpoint for each thread
      // where the status indicates active execution
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: checkpoints, error } = await (supabase.from('langgraph_checkpoints') as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100) as { data: LangGraphCheckpoint[] | null; error: Error | null };

      if (error) {
        console.error('Error fetching checkpoints:', error);
        throw new Error('Failed to fetch active executions');
      }

      if (!checkpoints || checkpoints.length === 0) {
        return [];
      }

      // Group by thread_id and get the most recent for each
      const latestByThread = new Map<string, LangGraphCheckpoint>();
      for (const checkpoint of checkpoints) {
        if (!latestByThread.has(checkpoint.thread_id)) {
          latestByThread.set(checkpoint.thread_id, checkpoint);
        }
      }

      // Map to execution format and filter active ones
      const executions = Array.from(latestByThread.values())
        .map(mapCheckpointToExecution)
        .filter(e => ['analyzing', 'planning', 'executing', 'healing', 'reporting'].includes(e.status));

      return executions;
    },
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 5 * 1000, // Refetch every 5 seconds for active executions
    enabled: isLoaded && isSignedIn,
  });
}

/**
 * Fetch recent completed executions
 */
export function useRecentExecutions(limit: number = 20) {
  const { isLoaded, isSignedIn } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['orchestrator-recent-executions', limit],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: checkpoints, error } = await (supabase.from('langgraph_checkpoints') as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200) as { data: LangGraphCheckpoint[] | null; error: Error | null };

      if (error) {
        console.error('Error fetching checkpoints:', error);
        throw new Error('Failed to fetch recent executions');
      }

      if (!checkpoints || checkpoints.length === 0) {
        return [];
      }

      // Group by thread_id and get the most recent for each
      const latestByThread = new Map<string, LangGraphCheckpoint>();
      for (const checkpoint of checkpoints) {
        if (!latestByThread.has(checkpoint.thread_id)) {
          latestByThread.set(checkpoint.thread_id, checkpoint);
        }
      }

      // Map to execution format and filter completed/failed ones
      const executions = Array.from(latestByThread.values())
        .map(mapCheckpointToExecution)
        .filter(e => ['completed', 'failed'].includes(e.status))
        .slice(0, limit);

      return executions;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: isLoaded && isSignedIn,
  });
}

/**
 * Fetch all executions for stats calculation
 */
export function useExecutionStats() {
  const { isLoaded, isSignedIn } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['orchestrator-stats'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: checkpoints, error } = await (supabase.from('langgraph_checkpoints') as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500) as { data: LangGraphCheckpoint[] | null; error: Error | null };

      if (error) {
        console.error('Error fetching checkpoints for stats:', error);
        throw new Error('Failed to fetch execution stats');
      }

      if (!checkpoints || checkpoints.length === 0) {
        return {
          total_executions: 0,
          active_executions: 0,
          completed_last_24h: 0,
          failed_last_24h: 0,
          success_rate: 0,
          avg_duration_ms: 0,
        } as OrchestratorStats;
      }

      // Group by thread_id and get the most recent for each
      const latestByThread = new Map<string, LangGraphCheckpoint>();
      for (const checkpoint of checkpoints) {
        if (!latestByThread.has(checkpoint.thread_id)) {
          latestByThread.set(checkpoint.thread_id, checkpoint);
        }
      }

      const executions = Array.from(latestByThread.values()).map(mapCheckpointToExecution);
      return calculateStats(executions);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: isLoaded && isSignedIn,
  });
}

/**
 * Fetch details for a specific execution/session
 */
export function useExecutionDetail(sessionId: string | null) {
  const { isLoaded, isSignedIn } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['orchestrator-execution-detail', sessionId],
    queryFn: async () => {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      // Fetch all checkpoints for this thread
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: checkpoints, error: checkpointsError } = await (supabase.from('langgraph_checkpoints') as any)
        .select('*')
        .eq('thread_id', sessionId)
        .order('created_at', { ascending: false }) as { data: LangGraphCheckpoint[] | null; error: Error | null };

      if (checkpointsError) {
        console.error('Error fetching execution detail:', checkpointsError);
        throw new Error('Failed to fetch execution detail');
      }

      if (!checkpoints || checkpoints.length === 0) {
        throw new Error('Execution not found');
      }

      // Most recent checkpoint is the current state
      const latestCheckpoint = checkpoints[0];
      const execution = mapCheckpointToExecution(latestCheckpoint);

      // Build checkpoint summaries
      const checkpointSummaries: CheckpointSummary[] = checkpoints.map((cp: LangGraphCheckpoint) => ({
        checkpoint_id: cp.checkpoint_id,
        created_at: cp.created_at,
        type: cp.type,
        metadata: cp.metadata || {},
      }));

      // Fetch activity logs for this session
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: logs } = await (supabase.from('activity_logs') as any)
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const executionLogs: ExecutionLog[] = (logs || []).map((log: any) => ({
        id: log.id,
        timestamp: log.created_at,
        agent: log.metadata?.agent || 'orchestrator',
        level: mapEventTypeToLevel(log.event_type),
        message: log.description || log.title,
        metadata: log.metadata,
      }));

      // Extract agent executions from checkpoint state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = (latestCheckpoint.checkpoint as any) || {};
      const agentStates = state.agents || {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agents: AgentExecution[] = Object.entries(agentStates).map(([agentType, agentState]: [string, any]) => ({
        agent_type: agentType,
        status: agentState.status || 'idle',
        started_at: agentState.started_at || null,
        completed_at: agentState.completed_at || null,
        duration_ms: agentState.duration_ms || null,
      }));

      const detail: ExecutionDetail = {
        ...execution,
        checkpoints: checkpointSummaries,
        logs: executionLogs,
        agents,
      };

      return detail;
    },
    staleTime: 10 * 1000, // 10 seconds
    enabled: isLoaded && isSignedIn && !!sessionId,
  });
}

function mapEventTypeToLevel(eventType: string): ExecutionLog['level'] {
  switch (eventType) {
    case 'started':
    case 'step':
    case 'action':
      return 'info';
    case 'completed':
    case 'screenshot':
      return 'success';
    case 'error':
      return 'error';
    case 'thinking':
      return 'thinking';
    case 'cancelled':
      return 'warning';
    default:
      return 'info';
  }
}

/**
 * Real-time subscription for execution updates
 */
export function useExecutionRealtime(sessionId: string | null) {
  const supabase = createClient();
  const [isConnected, setIsConnected] = useState(false);

  const subscribe = useCallback(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`orchestrator-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'langgraph_checkpoints',
          filter: `thread_id=eq.${sessionId}`,
        },
        (payload) => {
          // Checkpoint updated - trigger refetch
          console.log('Checkpoint updated:', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          // New activity log
          console.log('Activity log:', payload);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  useEffect(() => {
    const unsubscribe = subscribe();
    return () => {
      unsubscribe?.();
    };
  }, [subscribe]);

  return { isConnected, reconnect: subscribe };
}
