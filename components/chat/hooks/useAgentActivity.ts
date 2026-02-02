/**
 * useAgentActivity - Track active AI agents during test execution
 *
 * Subscribes to agent events from the streaming protocol and updates
 * the Zustand store for display in the agent activity panel.
 */

'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useChatStore, type ActiveAgent, type TestingPhase, type AgentStatus } from '@/lib/chat/chat-store';
import { getAgentConfig } from '@/lib/chat/agent-config';
import type {
  AgentStartData,
  AgentProgressData,
  AgentCompleteData,
  PhaseTransitionData,
} from '@/lib/chat/streaming-protocol';

// =============================================================================
// TYPES
// =============================================================================

export interface AgentActivityState {
  /** Currently active agents */
  activeAgents: ActiveAgent[];
  /** Current testing phase */
  currentPhase: TestingPhase;
  /** Phase progress (0-100) */
  phaseProgress: number;
  /** Overall progress across all agents */
  overallProgress: number;
  /** Whether any agent is currently working */
  isProcessing: boolean;
  /** Agents grouped by status */
  agentsByStatus: Record<AgentStatus, ActiveAgent[]>;
}

export interface AgentActivityActions {
  /** Handle agent start event */
  handleAgentStart: (data: AgentStartData) => void;
  /** Handle agent progress update */
  handleAgentProgress: (data: AgentProgressData) => void;
  /** Handle agent completion */
  handleAgentComplete: (data: AgentCompleteData) => void;
  /** Handle phase transition */
  handlePhaseTransition: (data: PhaseTransitionData) => void;
  /** Clear all agent activity */
  clearActivity: () => void;
}

export type UseAgentActivityResult = AgentActivityState & AgentActivityActions;

// =============================================================================
// HOOK
// =============================================================================

export function useAgentActivity(): UseAgentActivityResult {
  const {
    activeAgents,
    currentPhase,
    phaseProgress,
    addActiveAgent,
    updateAgentStatus,
    removeActiveAgent,
    clearActiveAgents,
    setCurrentPhase,
    setPhaseProgress,
  } = useChatStore();

  // === Computed Values ===

  const overallProgress = useMemo(() => {
    if (activeAgents.length === 0) return 0;
    const total = activeAgents.reduce((sum, agent) => sum + agent.progress, 0);
    return Math.round(total / activeAgents.length);
  }, [activeAgents]);

  const isProcessing = useMemo(() => {
    return activeAgents.some(
      agent => agent.status === 'thinking' || agent.status === 'executing'
    );
  }, [activeAgents]);

  const agentsByStatus = useMemo(() => {
    const grouped: Record<AgentStatus, ActiveAgent[]> = {
      thinking: [],
      executing: [],
      complete: [],
      error: [],
    };

    for (const agent of activeAgents) {
      grouped[agent.status].push(agent);
    }

    return grouped;
  }, [activeAgents]);

  // === Event Handlers ===

  const handleAgentStart = useCallback((data: AgentStartData) => {
    const config = getAgentConfig(data.agentType);

    addActiveAgent({
      id: data.agentId,
      type: data.agentType,
      name: data.name || config.name,
      status: 'thinking',
      progress: 0,
      currentTool: null,
      message: data.message || `${config.name} is starting...`,
    });
  }, [addActiveAgent]);

  const handleAgentProgress = useCallback((data: AgentProgressData) => {
    updateAgentStatus(data.agentId, {
      progress: data.progress,
      status: data.progress > 0 ? 'executing' : 'thinking',
      currentTool: data.currentTool,
      message: data.message,
    });
  }, [updateAgentStatus]);

  const handleAgentComplete = useCallback((data: AgentCompleteData) => {
    updateAgentStatus(data.agentId, {
      status: data.status === 'complete' ? 'complete' : 'error',
      progress: 100,
      confidence: data.confidence,
      message: data.message,
      currentTool: null,
    });

    // Remove completed agents after a delay
    if (data.status === 'complete') {
      setTimeout(() => {
        removeActiveAgent(data.agentId);
      }, 3000);
    }
  }, [updateAgentStatus, removeActiveAgent]);

  const handlePhaseTransition = useCallback((data: PhaseTransitionData) => {
    const phaseMap: Record<string, TestingPhase> = {
      'idle': 'idle',
      'analysis': 'analysis',
      'planning': 'planning',
      'execution': 'execution',
      'healing': 'healing',
      'reporting': 'reporting',
      'complete': 'idle',
    };

    const newPhase = phaseMap[data.to] || 'idle';
    setCurrentPhase(newPhase);

    // Reset progress on phase change
    if (newPhase !== currentPhase) {
      setPhaseProgress(0);
    }
  }, [setCurrentPhase, setPhaseProgress, currentPhase]);

  const clearActivity = useCallback(() => {
    clearActiveAgents();
    setCurrentPhase('idle');
    setPhaseProgress(0);
  }, [clearActiveAgents, setCurrentPhase, setPhaseProgress]);

  // === Auto-cleanup stale agents ===

  useEffect(() => {
    // Clean up agents that have been active for too long (5 minutes)
    const cleanup = setInterval(() => {
      const now = Date.now();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes

      activeAgents.forEach(agent => {
        const age = now - agent.startedAt.getTime();
        if (age > staleThreshold && agent.status !== 'complete' && agent.status !== 'error') {
          updateAgentStatus(agent.id, {
            status: 'error',
            message: 'Agent timed out',
          });
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(cleanup);
  }, [activeAgents, updateAgentStatus]);

  return {
    // State
    activeAgents,
    currentPhase,
    phaseProgress,
    overallProgress,
    isProcessing,
    agentsByStatus,

    // Actions
    handleAgentStart,
    handleAgentProgress,
    handleAgentComplete,
    handlePhaseTransition,
    clearActivity,
  };
}

// =============================================================================
// HELPER HOOKS
// =============================================================================

/**
 * Get a specific agent by ID
 */
export function useAgent(agentId: string): ActiveAgent | undefined {
  const { activeAgents } = useChatStore();
  return useMemo(
    () => activeAgents.find(agent => agent.id === agentId),
    [activeAgents, agentId]
  );
}

/**
 * Check if a specific agent type is active
 */
export function useIsAgentActive(agentType: string): boolean {
  const { activeAgents } = useChatStore();
  return useMemo(
    () => activeAgents.some(agent => agent.type === agentType),
    [activeAgents, agentType]
  );
}

/**
 * Get the primary (first) active agent
 */
export function usePrimaryAgent(): ActiveAgent | undefined {
  const { activeAgents } = useChatStore();
  return activeAgents[0];
}

export default useAgentActivity;
