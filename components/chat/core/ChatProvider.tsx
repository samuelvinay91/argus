/**
 * ChatProvider - Context provider for chat state
 *
 * Wraps the chat interface with necessary providers and initializes
 * the chat state for a conversation.
 */

'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Message } from 'ai/react';
import { useChatState, type ChatStateResult } from '../hooks/useChatState';

// =============================================================================
// CONTEXT
// =============================================================================

const ChatContext = createContext<ChatStateResult | null>(null);

// =============================================================================
// PROVIDER PROPS
// =============================================================================

export interface ChatProviderProps {
  children: ReactNode;
  conversationId?: string;
  initialMessages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
}

// =============================================================================
// PROVIDER
// =============================================================================

export function ChatProvider({
  children,
  conversationId,
  initialMessages = [],
  onMessagesChange,
}: ChatProviderProps) {
  const chatState = useChatState({
    conversationId,
    initialMessages,
    onMessagesChange,
  });

  return (
    <ChatContext.Provider value={chatState}>
      {children}
    </ChatContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Access chat state from context
 */
export function useChatContext(): ChatStateResult {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}

// =============================================================================
// OPTIONAL CONTEXT HOOK
// =============================================================================

/**
 * Access chat state from context, returns null if not in provider
 */
export function useChatContextOptional(): ChatStateResult | null {
  return useContext(ChatContext);
}

export default ChatProvider;
