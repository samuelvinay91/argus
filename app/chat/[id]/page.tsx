'use client';

import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import { Sidebar } from '@/components/layout/sidebar';
// Import the new modular ChatInterface
import { ChatInterface } from '@/components/chat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useAddMessage,
  useConversationMessages
} from '@/lib/hooks/use-chat';
import {
  useAIPreferences,
  useAIBudget,
} from '@/lib/hooks/use-ai-settings';
import {
  MessageSquarePlus,
  Trash2,
  Loader2,
  MessageSquare,
  Clock,
  History,
  Bot,
  AlertCircle,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { safeFormatDistanceToNow } from '@/lib/utils';
import type { Message } from 'ai/react';
import type { ChatMessage } from '@/lib/supabase/types';

// UUID validation helper
function isValidUUID(str: string | null | undefined): str is string {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Conversation list component
function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  onDelete,
  isLoading,
}: {
  conversations: Array<{ id: string; title: string | null; preview: string | null; updated_at: string }>;
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={cn(
            'w-full text-left p-3 rounded-lg transition-colors group',
            'hover:bg-muted',
            activeConversationId === conv.id && 'bg-muted'
          )}
        >
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {conv.title || 'New conversation'}
              </div>
              {conv.preview && (
                <div className="text-xs text-muted-foreground truncate">
                  {conv.preview}
                </div>
              )}
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {safeFormatDistanceToNow(conv.updated_at, { addSuffix: true })}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={(e) => onDelete(conv.id, e)}
            >
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        </button>
      ))}
    </div>
  );
}

// Enhanced header for the chat area
function ChatAreaHeader() {
  const { data: preferences } = useAIPreferences();
  const { data: budget } = useAIBudget();

  // Safely extract budget values with defaults
  const dailySpent = budget?.dailySpent ?? 0;
  const dailyLimit = budget?.dailyLimit ?? 0;
  const hasBudget = budget?.hasBudget ?? false;

  const budgetPercent = dailyLimit > 0
    ? Math.min((dailySpent / dailyLimit) * 100, 100)
    : 0;

  const isNearLimit = budgetPercent >= 80;
  const isAtLimit = budgetPercent >= 100;

  return (
    <header className="hidden lg:flex sticky top-0 z-30 h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
      {/* Title Section */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary flex-shrink-0" />
          <h1 className="text-lg font-semibold truncate">Hey Argus</h1>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          Your autonomous quality companion
        </p>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-3">
        {/* Current Model Badge */}
        {preferences?.defaultModel && (
          <Badge variant="outline" className="gap-1.5 font-normal text-xs">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="hidden xl:inline">Model:</span>
            <span className="truncate max-w-[100px]">
              {preferences.defaultModel.replace('claude-', '').replace('gpt-', '')}
            </span>
          </Badge>
        )}

        {/* Budget Indicator */}
        {hasBudget && (
          <Badge
            variant="outline"
            className={cn(
              'gap-1.5 font-normal text-xs',
              isAtLimit ? 'border-destructive text-destructive' :
              isNearLimit ? 'border-orange-500 text-orange-500' :
              ''
            )}
          >
            <Wallet className="w-3 h-3" />
            <span className="hidden xl:inline">Today:</span>
            <span className="font-mono">${dailySpent.toFixed(2)}</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-mono">${dailyLimit.toFixed(2)}</span>
          </Badge>
        )}
      </div>
    </header>
  );
}

function ChatPageContent() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;

  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Ref for stable callback
  const conversationIdRef = useRef<string>(conversationId);

  const { data: conversations = [], isLoading: conversationsLoading } = useConversations();
  const { data: storedMessages = [], isLoading: messagesLoading } = useConversationMessages(
    isValidUUID(conversationId) ? conversationId : null
  );
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const addMessage = useAddMessage();

  // Keep ref in sync
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Validate conversation exists
  useEffect(() => {
    if (!conversationsLoading && conversations.length > 0) {
      const exists = conversations.some(c => c.id === conversationId);
      if (!exists && isValidUUID(conversationId)) {
        setNotFound(true);
      } else {
        setNotFound(false);
      }
    }
  }, [conversations, conversationsLoading, conversationId]);

  // Convert stored messages to AI SDK format - computed directly, not in useEffect
  // This fixes the race condition where ChatInterface mounted before messages were converted
  const initialMessages: Message[] = useMemo(() => {
    if (!storedMessages || storedMessages.length === 0 || !conversationId) {
      return [];
    }

    return storedMessages.map((msg: ChatMessage) => {
      // For messages with incomplete tool invocations (state='call'), mark them as completed
      // to prevent Claude from trying to continue old executions
      let toolInvocations = msg.tool_invocations as unknown as Message['toolInvocations'];

      // If this is an assistant message with pending tool calls, convert them to show as "interrupted"
      if (toolInvocations && Array.isArray(toolInvocations)) {
        toolInvocations = toolInvocations.map((tool: any) => {
          if (tool.state === 'call') {
            // Mark incomplete tool calls as completed with an "interrupted" result
            return {
              ...tool,
              state: 'result',
              result: {
                success: false,
                error: 'Session interrupted - this action was not completed',
                interrupted: true,
              },
            };
          }
          return tool;
        });
      }

      return {
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        createdAt: new Date(msg.created_at),
        toolInvocations,
      };
    });
  }, [storedMessages, conversationId]);

  const handleNewConversation = async () => {
    try {
      const conversation = await createConversation.mutateAsync({});
      setMobileHistoryOpen(false);
      router.push(`/chat/${conversation.id}`);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation.mutateAsync(id);
      // If deleting current conversation, go home
      if (conversationId === id) {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleSelectConversation = (id: string) => {
    setMobileHistoryOpen(false);
    router.push(`/chat/${id}`);
  };

  // Message persistence callback
  const handleMessagesChange = useCallback(async (messages: Message[]) => {
    const currentConversationId = conversationIdRef.current;

    if (!isValidUUID(currentConversationId)) {
      console.warn('Cannot save message: invalid conversation ID');
      return;
    }

    if (messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];

    // Skip saving if content is empty (can happen during streaming or tool invocations)
    const content = latestMessage.content?.trim() || '';
    if (!content) {
      console.debug('Skipping save: message has empty content (likely still streaming)');
      return;
    }

    // Check if already stored
    const isStored = storedMessages.some(
      (m: ChatMessage) =>
        m.content === content &&
        m.role === latestMessage.role
    );
    if (isStored) return;

    try {
      await addMessage.mutateAsync({
        conversation_id: currentConversationId,
        role: latestMessage.role as 'user' | 'assistant' | 'system',
        content: content,
        tool_invocations: latestMessage.toolInvocations as unknown as Record<string, unknown> | null,
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }, [storedMessages, addMessage]);

  // Invalid UUID in URL
  if (!isValidUUID(conversationId)) {
    return (
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-w-0 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-medium">Invalid conversation ID</h2>
            <Button onClick={() => router.push('/')}>Go Home</Button>
          </div>
        </main>
      </div>
    );
  }

  // Conversation not found
  if (notFound) {
    return (
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-w-0 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-medium">Conversation not found</h2>
            <p className="text-sm text-muted-foreground">
              This conversation may have been deleted.
            </p>
            <Button onClick={() => router.push('/')}>Go Home</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0 flex flex-col lg:flex-row">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3">
            <Sheet open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <History className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Chat History</SheetTitle>
                  <SheetDescription className="sr-only">View and manage your previous conversations</SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  <ConversationList
                    conversations={conversations}
                    activeConversationId={conversationId}
                    onSelect={handleSelectConversation}
                    onDelete={handleDeleteConversation}
                    isLoading={conversationsLoading}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-semibold">AI Assistant</span>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleNewConversation}
            disabled={createConversation.isPending}
            className="h-9 w-9"
          >
            {createConversation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <MessageSquarePlus className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex w-64 border-r bg-muted/30 flex-col">
          <div className="p-4 border-b">
            <Button
              onClick={handleNewConversation}
              className="w-full"
              disabled={createConversation.isPending}
            >
              {createConversation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquarePlus className="h-4 w-4 mr-2" />
              )}
              New Chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              conversations={conversations}
              activeConversationId={conversationId}
              onSelect={handleSelectConversation}
              onDelete={handleDeleteConversation}
              isLoading={conversationsLoading}
            />
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-hidden">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ChatInterface
                key={conversationId}
                conversationId={conversationId}
                initialMessages={initialMessages}
                onMessagesChange={handleMessagesChange}
              />
            )}
          </div>

          {/* Backend Status - Fixed at bottom left */}
          <div className="hidden lg:flex fixed bottom-4 left-[calc(16rem+16rem+1.5rem)] z-20 items-center gap-2 text-xs bg-background/80 backdrop-blur-sm border rounded-full px-3 py-1.5 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-muted-foreground">Backend Connected</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ChatPage() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <ChatPageContent />
      </SignedIn>
    </>
  );
}
