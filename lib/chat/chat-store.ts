/**
 * Chat Store - Centralized state management for the chat interface
 *
 * Uses Zustand for lightweight, performant state management with:
 * - Conversation state and message handling
 * - Agent activity tracking for the 30+ AI agents
 * - Streaming state for real-time updates
 * - Message pagination for large conversations
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { Message } from 'ai/react';

// =============================================================================
// TYPES
// =============================================================================

/** Current phase in the testing lifecycle */
export type TestingPhase =
  | 'idle'
  | 'analysis'
  | 'planning'
  | 'execution'
  | 'healing'
  | 'reporting';

/** Agent execution status */
export type AgentStatus = 'thinking' | 'executing' | 'complete' | 'error';

/** Active agent information for visibility panel */
export interface ActiveAgent {
  id: string;
  type: string; // e.g., 'code_analyzer', 'self_healer', 'visual_ai'
  name: string;
  status: AgentStatus;
  progress: number; // 0-100
  currentTool: string | null;
  startedAt: Date;
  confidence?: number; // 0-100 for result confidence
  message?: string; // Current status message
}

/** Tool invocation state during streaming */
export interface ToolInvocationState {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  state: 'call' | 'result';
  result?: unknown;
}

/** Streaming event types from SSE */
export type StreamingEventType =
  | 'text_delta'
  | 'agent_start'
  | 'agent_progress'
  | 'agent_complete'
  | 'phase_transition'
  | 'tool_call'
  | 'tool_result'
  | 'screenshot'
  | 'error';

/** Streaming event payload */
export interface StreamingEvent {
  type: StreamingEventType;
  timestamp: Date;
  data: unknown;
}

/** AI status for avatar animation */
export type AIStatus = 'ready' | 'thinking' | 'typing';

// =============================================================================
// STORE STATE
// =============================================================================

export interface ChatState {
  // === Conversation State ===
  conversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  // === Agent Activity (NEW) ===
  activeAgents: ActiveAgent[];
  currentPhase: TestingPhase;
  phaseProgress: number; // 0-100 for phase progress bar

  // === Streaming State ===
  streamingMessageId: string | null;
  partialContent: string;
  toolInvocations: ToolInvocationState[];
  streamingEvents: StreamingEvent[];

  // === Pagination (NEW) ===
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  oldestMessageId: string | null;
  pageSize: number;

  // === UI State ===
  aiStatus: AIStatus;
  inputValue: string;
  isArtifactsPanelOpen: boolean;
  isScreenshotsPanelOpen: boolean;
  selectedArtifactId: string | null;

  // === Actions ===
  // Conversation
  setConversationId: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;

  // Loading
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Agent Activity
  addActiveAgent: (agent: Omit<ActiveAgent, 'startedAt'>) => void;
  updateAgentStatus: (agentId: string, updates: Partial<ActiveAgent>) => void;
  removeActiveAgent: (agentId: string) => void;
  clearActiveAgents: () => void;
  setCurrentPhase: (phase: TestingPhase) => void;
  setPhaseProgress: (progress: number) => void;

  // Streaming
  setStreamingMessageId: (id: string | null) => void;
  appendPartialContent: (content: string) => void;
  setPartialContent: (content: string) => void;
  addToolInvocation: (invocation: ToolInvocationState) => void;
  updateToolInvocation: (id: string, updates: Partial<ToolInvocationState>) => void;
  addStreamingEvent: (event: Omit<StreamingEvent, 'timestamp'>) => void;
  clearStreaming: () => void;

  // Pagination
  setHasMoreMessages: (hasMore: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  prependMessages: (messages: Message[]) => void;
  setOldestMessageId: (id: string | null) => void;

  // UI
  setAIStatus: (status: AIStatus) => void;
  setInputValue: (value: string) => void;
  setArtifactsPanelOpen: (open: boolean) => void;
  setScreenshotsPanelOpen: (open: boolean) => void;
  setSelectedArtifactId: (id: string | null) => void;

  // Bulk operations
  reset: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState = {
  // Conversation
  conversationId: null,
  messages: [],
  isLoading: false,
  error: null,

  // Agent Activity
  activeAgents: [],
  currentPhase: 'idle' as TestingPhase,
  phaseProgress: 0,

  // Streaming
  streamingMessageId: null,
  partialContent: '',
  toolInvocations: [],
  streamingEvents: [],

  // Pagination
  hasMoreMessages: false,
  isLoadingMore: false,
  oldestMessageId: null,
  pageSize: 50,

  // UI
  aiStatus: 'ready' as AIStatus,
  inputValue: '',
  isArtifactsPanelOpen: false,
  isScreenshotsPanelOpen: false,
  selectedArtifactId: null,
};

// =============================================================================
// STORE
// =============================================================================

export const useChatStore = create<ChatState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // === Conversation Actions ===
      setConversationId: (id) => set({ conversationId: id }),

      setMessages: (messages) =>
        set({
          messages,
          oldestMessageId: messages.length > 0 ? messages[0].id : null,
        }),

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      updateMessage: (id, updates) =>
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        })),

      removeMessage: (id) =>
        set((state) => ({
          messages: state.messages.filter((msg) => msg.id !== id),
        })),

      clearMessages: () =>
        set({
          messages: [],
          oldestMessageId: null,
          hasMoreMessages: false,
        }),

      // === Loading Actions ===
      setLoading: (loading) =>
        set({
          isLoading: loading,
          aiStatus: loading ? 'thinking' : 'ready',
        }),

      setError: (error) => set({ error }),

      // === Agent Activity Actions ===
      addActiveAgent: (agent) =>
        set((state) => ({
          activeAgents: [
            ...state.activeAgents,
            { ...agent, startedAt: new Date() },
          ],
        })),

      updateAgentStatus: (agentId, updates) =>
        set((state) => ({
          activeAgents: state.activeAgents.map((agent) =>
            agent.id === agentId ? { ...agent, ...updates } : agent
          ),
        })),

      removeActiveAgent: (agentId) =>
        set((state) => ({
          activeAgents: state.activeAgents.filter(
            (agent) => agent.id !== agentId
          ),
        })),

      clearActiveAgents: () => set({ activeAgents: [] }),

      setCurrentPhase: (phase) => set({ currentPhase: phase, phaseProgress: 0 }),

      setPhaseProgress: (progress) => set({ phaseProgress: Math.min(100, Math.max(0, progress)) }),

      // === Streaming Actions ===
      setStreamingMessageId: (id) =>
        set({
          streamingMessageId: id,
          aiStatus: id ? 'typing' : 'ready',
        }),

      appendPartialContent: (content) =>
        set((state) => ({
          partialContent: state.partialContent + content,
          aiStatus: 'typing',
        })),

      setPartialContent: (content) => set({ partialContent: content }),

      addToolInvocation: (invocation) =>
        set((state) => ({
          toolInvocations: [...state.toolInvocations, invocation],
        })),

      updateToolInvocation: (id, updates) =>
        set((state) => ({
          toolInvocations: state.toolInvocations.map((inv) =>
            inv.id === id ? { ...inv, ...updates } : inv
          ),
        })),

      addStreamingEvent: (event) =>
        set((state) => ({
          streamingEvents: [
            ...state.streamingEvents.slice(-99), // Keep last 100 events
            { ...event, timestamp: new Date() },
          ],
        })),

      clearStreaming: () =>
        set({
          streamingMessageId: null,
          partialContent: '',
          toolInvocations: [],
          aiStatus: 'ready',
        }),

      // === Pagination Actions ===
      setHasMoreMessages: (hasMore) => set({ hasMoreMessages: hasMore }),

      setLoadingMore: (loading) => set({ isLoadingMore: loading }),

      prependMessages: (messages) =>
        set((state) => ({
          messages: [...messages, ...state.messages],
          oldestMessageId: messages.length > 0 ? messages[0].id : state.oldestMessageId,
        })),

      setOldestMessageId: (id) => set({ oldestMessageId: id }),

      // === UI Actions ===
      setAIStatus: (status) => set({ aiStatus: status }),

      setInputValue: (value) => set({ inputValue: value }),

      setArtifactsPanelOpen: (open) => set({ isArtifactsPanelOpen: open }),

      setScreenshotsPanelOpen: (open) => set({ isScreenshotsPanelOpen: open }),

      setSelectedArtifactId: (id) => set({ selectedArtifactId: id }),

      // === Bulk Operations ===
      reset: () => set(initialState),
    })),
    { name: 'chat-store' }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

/** Get the latest message */
export const selectLatestMessage = (state: ChatState) =>
  state.messages[state.messages.length - 1];

/** Check if any agent is currently active */
export const selectHasActiveAgents = (state: ChatState) =>
  state.activeAgents.length > 0;

/** Get active agents by status */
export const selectAgentsByStatus = (status: AgentStatus) => (state: ChatState) =>
  state.activeAgents.filter((agent) => agent.status === status);

/** Get overall progress across all active agents */
export const selectOverallProgress = (state: ChatState) => {
  if (state.activeAgents.length === 0) return 0;
  const total = state.activeAgents.reduce((sum, agent) => sum + agent.progress, 0);
  return Math.round(total / state.activeAgents.length);
};

/** Check if the chat is in a loading/streaming state */
export const selectIsProcessing = (state: ChatState) =>
  state.isLoading || state.streamingMessageId !== null;

/** Get message count */
export const selectMessageCount = (state: ChatState) => state.messages.length;

// =============================================================================
// HOOKS HELPERS
// =============================================================================

/**
 * Subscribe to agent activity changes
 */
export const subscribeToAgentActivity = (
  callback: (agents: ActiveAgent[]) => void
) => {
  return useChatStore.subscribe(
    (state) => state.activeAgents,
    callback
  );
};

/**
 * Subscribe to phase transitions
 */
export const subscribeToPhaseTransitions = (
  callback: (phase: TestingPhase) => void
) => {
  return useChatStore.subscribe(
    (state) => state.currentPhase,
    callback
  );
};

export default useChatStore;
