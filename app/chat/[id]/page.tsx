'use client';

import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import { Sidebar } from '@/components/layout/sidebar';
import { ChatInterface } from '@/components/chat/chat-interface';
import { Button } from '@/components/ui/button';
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
  MessageSquarePlus,
  Trash2,
  Loader2,
  MessageSquare,
  Clock,
  History,
  Bot,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Message } from 'ai/react';
import type { ChatMessage, Json } from '@/lib/supabase/types';

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
                {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
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

    // Check if already stored
    const isStored = storedMessages.some(
      (m: ChatMessage) =>
        m.content === latestMessage.content &&
        m.role === latestMessage.role
    );
    if (isStored) return;

    try {
      const messageId = crypto.randomUUID();
      await addMessage.mutateAsync({
        id: messageId,
        conversation_id: currentConversationId,
        role: latestMessage.role as 'user' | 'assistant' | 'system',
        content: latestMessage.content,
        tool_invocations: latestMessage.toolInvocations as unknown as Json | null,
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
          <header className="hidden lg:flex sticky top-0 z-30 h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
            <div className="flex-1">
              <h1 className="text-xl font-semibold">Hey Argus</h1>
              <p className="text-sm text-muted-foreground">
                Your autonomous quality agents
              </p>
            </div>
          </header>

          <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-hidden">
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
          <div className="hidden lg:flex fixed bottom-4 left-[calc(16rem+1rem)] z-20 items-center gap-2 text-xs bg-background/80 backdrop-blur-sm border rounded-full px-3 py-1.5 shadow-sm">
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
