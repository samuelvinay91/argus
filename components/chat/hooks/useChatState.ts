/**
 * useChatState - Main state hook for chat interface
 *
 * Combines Zustand store with AI SDK's useChat for a unified API.
 * Handles state synchronization between local store and AI SDK.
 *
 * Updated for AI SDK v6 with transport-based configuration.
 */

'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useAuth, useUser } from '@clerk/nextjs';
import { useAIPreferences } from '@/lib/hooks/use-ai-settings';
import { useChatStore, type TestingPhase, type ActiveAgent } from '@/lib/chat/chat-store';
import { toast } from '@/lib/hooks/useToast';

export interface UseChatStateOptions {
  conversationId?: string;
  initialMessages?: UIMessage[];
  onMessagesChange?: (messages: UIMessage[]) => void;
}

export interface ChatStateResult {
  // Messages
  messages: UIMessage[];
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
  setMessages: (messages: UIMessage[]) => void;

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

  // Local input state (v6 doesn't manage input)
  const [input, setInput] = useState('');

  // Input change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

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

  // Create transport (v6 pattern) with debug logging
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
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
      console.group('[Transport] Fetch Request');
      console.log('URL:', url);
      console.log('Method:', options?.method);
      console.log('Body preview:', options?.body ? JSON.stringify(JSON.parse(options.body as string), null, 2).substring(0, 500) : 'none');
      console.groupEnd();

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      console.group('[Transport] Fetch Response');
      console.log('Status:', response.status, response.statusText);
      console.log('Content-Type:', response.headers.get('content-type'));
      console.log('OK:', response.ok);
      console.groupEnd();

      // If not ok, log the error body
      if (!response.ok) {
        const errorText = await response.clone().text();
        console.error('[Transport] Error response body:', errorText);
      }

      return response;
    },
  }), [aiPreferences, user?.id, getToken]);

  // AI SDK v6 useChat with comprehensive logging
  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
    regenerate,
  } = useChat({
    transport,
    id: isValidConversationId ? conversationId : undefined,
    messages: initialMessages, // v6 uses 'messages' not 'initialMessages'
    onError: (err) => {
      console.error('[useChat] onError triggered:', err);
      console.error('[useChat] Error name:', err.name);
      console.error('[useChat] Error message:', err.message);
      console.error('[useChat] Error stack:', err.stack);
      store.setError(err.message);
      toast.error({
        title: 'Chat Error',
        description: err.message || 'An error occurred while processing your request',
      });
    },
    // v6 onFinish receives an object with { message, messages, ... }
    onFinish: ({ message: finishedMessage }) => {
      console.group('[useChat] onFinish triggered');
      console.log('Finished message:', finishedMessage);
      console.log('Message id:', finishedMessage?.id);
      console.log('Message role:', finishedMessage?.role);
      console.log('Message parts:', finishedMessage?.parts);
      console.groupEnd();

      const currentConversationId = conversationIdRef.current;
      const currentOnMessagesChange = onMessagesChangeRef.current;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!currentConversationId || !uuidRegex.test(currentConversationId)) {
        console.log('[useChat] onFinish - skipping save (invalid conversationId)');
        return;
      }

      if (currentOnMessagesChange && finishedMessage) {
        currentOnMessagesChange([finishedMessage]);
        lastSavedCountRef.current += 1;
      }

      // Clear streaming state
      store.clearStreaming();
      store.clearActiveAgents();
    },
  });

  // Derive isLoading from status (v6 pattern)
  const isLoading = status === 'streaming' || status === 'submitted';

  // Log status changes for debugging streaming lifecycle
  useEffect(() => {
    console.log('[useChatState] Status changed:', status);
    if (status === 'error') {
      console.error('[useChatState] Status is error - check onError callback');
    }
  }, [status]);

  // Structured logging for AI SDK message flow
  useEffect(() => {
    console.group('[useChatState] AI SDK State Update');
    console.log('status:', status);
    console.log('isLoading:', isLoading);
    console.log('messages count:', messages.length);
    if (messages.length > 0) {
      messages.forEach((msg, i) => {
        const textParts = msg.parts?.filter(
          (part): part is { type: 'text'; text: string } => part.type === 'text'
        ) || [];
        const textPreview = textParts.map(p => p.text).join('').substring(0, 100);
        console.log(`[${i}] ${msg.role}:`, {
          id: msg.id,
          partsCount: msg.parts?.length ?? 0,
          partsTypes: msg.parts?.map(p => p.type),
          textPreview: textPreview || '(no text)',
        });
      });
    }
    console.groupEnd();
  }, [messages, status, isLoading]);

  // Sync loading state to store
  useEffect(() => {
    store.setLoading(isLoading);
  }, [isLoading]);

  // Sync messages to store
  useEffect(() => {
    store.setMessages(messages);
  }, [messages]);

  // Determine AI status - updated for AI SDK v6 parts-based messages
  const aiStatus = useMemo(() => {
    if (!isLoading) return 'ready' as const;
    const lastMessage = messages[messages.length - 1];
    // Check if last message has any text parts (content in v6)
    const hasContent = lastMessage?.parts?.some(
      (part) => part.type === 'text' && (part as { text?: string }).text
    );
    if (lastMessage?.role === 'assistant' && hasContent) {
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

  // Custom append function using sendMessage (v6 replacement)
  const append = useCallback(async (message: { role: 'user' | 'assistant'; content: string }) => {
    if (message.role === 'user') {
      await sendMessage({ text: message.content });
    }
    return null;
  }, [sendMessage]);

  // Alias regenerate as reload for backwards compatibility
  const reload = regenerate;

  // Enhanced submit with persistence
  const handleSubmit = useCallback(async (
    e: React.FormEvent<HTMLFormElement>,
    _submitOptions?: { experimental_attachments?: Array<{ name: string; contentType: string; url: string }> }
  ) => {
    e.preventDefault();
    const userInput = input.trim();
    if (!userInput) return;

    const currentConversationId = conversationIdRef.current;
    const currentOnMessagesChange = onMessagesChangeRef.current;

    // Clear input immediately
    setInput('');

    // Submit to AI SDK v6 using sendMessage
    await sendMessage({ text: userInput });

    // Persist user message immediately - AI SDK v6 uses parts array
    if (currentOnMessagesChange && currentConversationId) {
      const userMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        parts: [{ type: 'text', text: userInput }],
      };

      setTimeout(() => {
        currentOnMessagesChange([...messages, userMessage]);
      }, 100);
    }
  }, [sendMessage, input, messages]);

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
