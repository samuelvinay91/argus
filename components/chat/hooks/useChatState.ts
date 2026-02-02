/**
 * useChatState - Main state hook for chat interface
 *
 * Combines Zustand store with AI SDK's useChat for a unified API.
 * Handles state synchronization between local store and AI SDK.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useChat, type Message } from 'ai/react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useAIPreferences } from '@/lib/hooks/use-ai-settings';
import { useChatStore, type TestingPhase, type ActiveAgent } from '@/lib/chat/chat-store';
import { toast } from '@/lib/hooks/useToast';

export interface UseChatStateOptions {
  conversationId?: string;
  initialMessages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
}

export interface ChatStateResult {
  // Messages
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  // Input
  input: string;
  setInput: (value: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;

  // Actions
  handleSubmit: (e: React.FormEvent<HTMLFormElement>, options?: { experimental_attachments?: Array<{ name: string; contentType: string; url: string }> }) => void;
  stop: () => void;
  reload: () => void;
  append: (message: { role: 'user' | 'assistant'; content: string }) => Promise<string | null | undefined>;
  setMessages: (messages: Message[]) => void;

  // Agent Activity
  activeAgents: ActiveAgent[];
  currentPhase: TestingPhase;
  phaseProgress: number;

  // Streaming
  streamingMessageId: string | null;
  partialContent: string;

  // UI State
  aiStatus: 'ready' | 'thinking' | 'typing';
  isArtifactsPanelOpen: boolean;
  isScreenshotsPanelOpen: boolean;
  setArtifactsPanelOpen: (open: boolean) => void;
  setScreenshotsPanelOpen: (open: boolean) => void;

  // Refs
  inputRef: React.RefObject<HTMLInputElement | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function useChatState(options: UseChatStateOptions = {}): ChatStateResult {
  const { conversationId, initialMessages = [], onMessagesChange } = options;

  // Refs
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastSavedCountRef = useRef(0);
  const conversationIdRef = useRef(conversationId);
  const onMessagesChangeRef = useRef(onMessagesChange);

  // Keep refs updated
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    onMessagesChangeRef.current = onMessagesChange;
  }, [onMessagesChange]);

  // Auth and preferences
  const { getToken } = useAuth();
  const { user } = useUser();
  const { data: aiPreferences } = useAIPreferences();

  // Zustand store
  const store = useChatStore();

  // Validate conversationId
  const isValidConversationId = conversationId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId);

  // AI SDK useChat
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: aiSdkSubmit,
    isLoading,
    setInput,
    stop,
    append,
    setMessages,
    reload,
  } = useChat({
    api: '/api/chat',
    id: isValidConversationId ? conversationId : undefined,
    initialMessages,
    maxSteps: 3,
    body: {
      aiConfig: aiPreferences ? {
        model: aiPreferences.defaultModel,
        provider: aiPreferences.defaultProvider,
        useBYOK: true,
      } : undefined,
      userId: user?.id,
    },
    fetch: async (url, options) => {
      const token = await getToken();
      return fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
    },
    onError: (err) => {
      console.error('Chat error:', err);
      store.setError(err.message);
      toast.error({
        title: 'Chat Error',
        description: err.message || 'An error occurred while processing your request',
      });
    },
    onFinish: (message) => {
      const currentConversationId = conversationIdRef.current;
      const currentOnMessagesChange = onMessagesChangeRef.current;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!currentConversationId || !uuidRegex.test(currentConversationId)) {
        return;
      }

      if (currentOnMessagesChange && message) {
        currentOnMessagesChange([message]);
        lastSavedCountRef.current += 1;
      }

      // Clear streaming state
      store.clearStreaming();
      store.clearActiveAgents();
    },
  });

  // Sync loading state to store
  useEffect(() => {
    store.setLoading(isLoading);
  }, [isLoading]);

  // Sync messages to store
  useEffect(() => {
    store.setMessages(messages);
  }, [messages]);

  // Determine AI status
  const aiStatus = useMemo(() => {
    if (!isLoading) return 'ready' as const;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.content) {
      return 'typing' as const;
    }
    return 'thinking' as const;
  }, [isLoading, messages]);

  // Update store AI status
  useEffect(() => {
    store.setAIStatus(aiStatus);
  }, [aiStatus]);

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Enhanced submit with persistence
  const handleSubmit = useCallback((
    e: React.FormEvent<HTMLFormElement>,
    submitOptions?: { experimental_attachments?: Array<{ name: string; contentType: string; url: string }> }
  ) => {
    e.preventDefault();
    const userInput = input.trim();
    if (!userInput) return;

    const currentConversationId = conversationIdRef.current;
    const currentOnMessagesChange = onMessagesChangeRef.current;

    // Submit to AI SDK
    aiSdkSubmit(e, submitOptions);

    // Persist user message immediately
    if (currentOnMessagesChange && currentConversationId) {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userInput,
        createdAt: new Date(),
      };

      setTimeout(() => {
        currentOnMessagesChange([...messages, userMessage]);
      }, 100);
    }
  }, [aiSdkSubmit, input, messages]);

  return {
    // Messages
    messages,
    isLoading,
    error: store.error,

    // Input
    input,
    setInput,
    handleInputChange,

    // Actions
    handleSubmit,
    stop,
    reload,
    append,
    setMessages,

    // Agent Activity (from store)
    activeAgents: store.activeAgents,
    currentPhase: store.currentPhase,
    phaseProgress: store.phaseProgress,

    // Streaming (from store)
    streamingMessageId: store.streamingMessageId,
    partialContent: store.partialContent,

    // UI State
    aiStatus,
    isArtifactsPanelOpen: store.isArtifactsPanelOpen,
    isScreenshotsPanelOpen: store.isScreenshotsPanelOpen,
    setArtifactsPanelOpen: store.setArtifactsPanelOpen,
    setScreenshotsPanelOpen: store.setScreenshotsPanelOpen,

    // Refs
    inputRef,
    scrollRef,
  };
}

export default useChatState;
