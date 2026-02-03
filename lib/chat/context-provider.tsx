'use client';

/**
 * Chat Context Provider
 *
 * Exposes chat state to other components across the application.
 * This enables features like:
 * - Showing recent test activity in the sidebar
 * - Displaying chat state in the header
 * - Cross-component awareness of what's happening in chat
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
  useMemo,
} from 'react';
import type { UIMessage } from '@ai-sdk/react';

// Types for chat state
export interface ChatSession {
  id: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

export interface TestRunSummary {
  id: string;
  status: 'running' | 'passed' | 'failed';
  testName?: string;
  startedAt: Date;
  progress?: number;
}

export interface InfraStatus {
  healthy: boolean;
  availablePods: number;
  activeSessions: number;
  lastChecked: Date;
}

export interface ChatContextValue {
  // Current conversation
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;

  // Messages from current session
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;

  // Active test runs
  activeTestRuns: TestRunSummary[];
  addTestRun: (run: TestRunSummary) => void;
  updateTestRun: (id: string, update: Partial<TestRunSummary>) => void;
  removeTestRun: (id: string) => void;

  // Infrastructure status (cached)
  infraStatus: InfraStatus | null;
  setInfraStatus: (status: InfraStatus | null) => void;

  // Recent sessions
  recentSessions: ChatSession[];
  addSession: (session: ChatSession) => void;

  // UI State
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;

  // Quick actions
  sendMessage: (content: string) => void;
  onSendMessage?: (content: string) => void;
  setOnSendMessage: (handler: ((content: string) => void) | undefined) => void;
}

// Create context with undefined default
const ChatContext = createContext<ChatContextValue | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  recentSessions: 'argus_recent_sessions',
  sidebarCollapsed: 'argus_sidebar_collapsed',
};

// Provider props
interface ChatContextProviderProps {
  children: ReactNode;
}

export function ChatContextProvider({ children }: ChatContextProviderProps) {
  // Session state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);

  // Test runs
  const [activeTestRuns, setActiveTestRuns] = useState<TestRunSummary[]>([]);

  // Infrastructure
  const [infraStatus, setInfraStatus] = useState<InfraStatus | null>(null);

  // Recent sessions
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);

  // UI state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Send message handler (to be set by ChatInterface)
  const [onSendMessage, setOnSendMessage] = useState<((content: string) => void) | undefined>();

  // Load initial state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load recent sessions
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.recentSessions);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentSessions(parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        })));
      }
    } catch {
      // Ignore parse errors
    }

    // Load sidebar state
    try {
      const collapsed = localStorage.getItem(STORAGE_KEYS.sidebarCollapsed);
      if (collapsed !== null) {
        setIsSidebarCollapsed(collapsed === 'true');
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Persist recent sessions
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.recentSessions, JSON.stringify(recentSessions.slice(0, 20)));
    } catch {
      // Ignore storage errors
    }
  }, [recentSessions]);

  // Persist sidebar state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, String(isSidebarCollapsed));
    } catch {
      // Ignore errors
    }
  }, [isSidebarCollapsed]);

  // Test run management
  const addTestRun = useCallback((run: TestRunSummary) => {
    setActiveTestRuns(prev => [...prev, run]);
  }, []);

  const updateTestRun = useCallback((id: string, update: Partial<TestRunSummary>) => {
    setActiveTestRuns(prev =>
      prev.map(run => (run.id === id ? { ...run, ...update } : run))
    );
  }, []);

  const removeTestRun = useCallback((id: string) => {
    setActiveTestRuns(prev => prev.filter(run => run.id !== id));
  }, []);

  // Session management
  const addSession = useCallback((session: ChatSession) => {
    setRecentSessions(prev => {
      // Remove if exists (will re-add at top)
      const filtered = prev.filter(s => s.id !== session.id);
      return [session, ...filtered].slice(0, 20);
    });
  }, []);

  // Send message (calls the handler set by ChatInterface)
  const sendMessage = useCallback((content: string) => {
    if (onSendMessage) {
      onSendMessage(content);
    } else {
      console.warn('ChatContextProvider: No sendMessage handler registered');
    }
  }, [onSendMessage]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<ChatContextValue>(() => ({
    currentSessionId,
    setCurrentSessionId,
    messages,
    setMessages,
    activeTestRuns,
    addTestRun,
    updateTestRun,
    removeTestRun,
    infraStatus,
    setInfraStatus,
    recentSessions,
    addSession,
    isChatOpen,
    setIsChatOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    sendMessage,
    onSendMessage,
    setOnSendMessage,
  }), [
    currentSessionId,
    messages,
    activeTestRuns,
    addTestRun,
    updateTestRun,
    removeTestRun,
    infraStatus,
    recentSessions,
    addSession,
    isChatOpen,
    isSidebarCollapsed,
    sendMessage,
    onSendMessage,
  ]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

// Hook to use chat context
export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatContextProvider');
  }
  return context;
}

// Optional hook that doesn't throw if outside provider
export function useChatContextOptional(): ChatContextValue | null {
  return useContext(ChatContext) ?? null;
}

// Utility hooks for specific slices of state
export function useActiveTestRuns() {
  const { activeTestRuns, addTestRun, updateTestRun, removeTestRun } = useChatContext();
  return { activeTestRuns, addTestRun, updateTestRun, removeTestRun };
}

export function useInfraStatus() {
  const { infraStatus, setInfraStatus } = useChatContext();
  return { infraStatus, setInfraStatus };
}

export function useRecentSessions() {
  const { recentSessions, addSession } = useChatContext();
  return { recentSessions, addSession };
}

export function useChatUI() {
  const { isChatOpen, setIsChatOpen, isSidebarCollapsed, setIsSidebarCollapsed } = useChatContext();
  return { isChatOpen, setIsChatOpen, isSidebarCollapsed, setIsSidebarCollapsed };
}

export default ChatContextProvider;
