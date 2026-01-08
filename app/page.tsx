'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { Sidebar } from '@/components/layout/sidebar';
import { ChatInterface } from '@/components/chat/chat-interface';
import { LandingPage } from '@/components/landing/landing-page';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
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
  Menu,
  Bot,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Message } from 'ai/react';
import type { ChatMessage, Json } from '@/lib/supabase/types';

// UUID validation helper
function isValidUUID(str: string | null): str is string {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Conversation list component (shared between desktop sidebar and mobile sheet)
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

function AppContent() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

  // Use ref to avoid stale closure issues in callbacks
  const activeConversationIdRef = useRef<string | null>(null);

  const { data: conversations = [], isLoading: conversationsLoading } = useConversations();
  const { data: storedMessages = [], isLoading: messagesLoading } = useConversationMessages(activeConversationId);
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const addMessage = useAddMessage();

  // Keep ref in sync with state
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Convert stored messages to AI SDK format when they load
  useEffect(() => {
    if (storedMessages.length > 0 && activeConversationId) {
      const aiMessages: Message[] = storedMessages.map((msg: ChatMessage) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        createdAt: new Date(msg.created_at),
        toolInvocations: msg.tool_invocations as unknown as Message['toolInvocations'],
      }));
      setInitialMessages(aiMessages);
    } else {
      setInitialMessages([]);
    }
  }, [storedMessages, activeConversationId]);

  const handleNewConversation = async () => {
    try {
      console.log('Creating new conversation...');
      const conversation = await createConversation.mutateAsync({});
      console.log('Conversation created successfully:', conversation.id);

      // Set the active conversation ID
      setActiveConversationId(conversation.id);
      setInitialMessages([]);
      setMobileHistoryOpen(false); // Close sheet on mobile

      // Give React Query a moment to update its cache
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('Conversation ready for messages');
    } catch (error) {
      console.error('Failed to create conversation:', error);
      alert('Failed to create conversation. Please try again.');
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation.mutateAsync(id);
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setInitialMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setMobileHistoryOpen(false); // Close sheet on mobile
  };

  // Callback to save messages when they're sent/received
  const handleMessagesChange = useCallback(async (messages: Message[]) => {
    // Use ref to get current conversation ID (avoids stale closure)
    const currentConversationId = activeConversationIdRef.current;

    // Only save if we have a valid UUID conversation ID
    if (!isValidUUID(currentConversationId)) {
      console.warn('Cannot save message: invalid or missing conversation ID', currentConversationId);
      return;
    }

    if (messages.length === 0) {
      console.warn('Cannot save message: no messages');
      return;
    }

    // Get the latest message
    const latestMessage = messages[messages.length - 1];

    // Check if this message is already stored by matching content and role
    // (can't use AI SDK's ID since we generate new UUIDs for Supabase)
    const isStored = storedMessages.some(
      (m: ChatMessage) =>
        m.content === latestMessage.content &&
        m.role === latestMessage.role
    );
    if (isStored) return;

    try {
      // Generate a proper UUID for Supabase instead of using AI SDK's short ID
      const messageId = crypto.randomUUID();

      const messageData = {
        id: messageId,
        conversation_id: currentConversationId,
        role: latestMessage.role as 'user' | 'assistant' | 'system',
        content: latestMessage.content,
        tool_invocations: latestMessage.toolInvocations as unknown as Json | null,
      };

      console.log('Saving message to conversation:', {
        conversationId: currentConversationId,
        messageId,
        role: messageData.role,
        contentPreview: messageData.content.substring(0, 50)
      });

      await addMessage.mutateAsync(messageData);
      console.log('Message saved successfully');
    } catch (error) {
      console.error('Failed to save message - Full error:', JSON.stringify(error, null, 2));
      console.error('Error object:', error);
    }
  }, [storedMessages, addMessage]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64 flex flex-col lg:flex-row">
        {/* Mobile Header - Only visible on mobile */}
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
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  <ConversationList
                    conversations={conversations}
                    activeConversationId={activeConversationId}
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

        {/* Desktop Conversation History Sidebar - Hidden on mobile */}
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
              activeConversationId={activeConversationId}
              onSelect={handleSelectConversation}
              onDelete={handleDeleteConversation}
              isLoading={conversationsLoading}
            />
          </div>
        </div>

        {/* Chat Area - Full width on mobile */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Desktop Header - Hidden on mobile */}
          <header className="hidden lg:flex sticky top-0 z-30 h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
            <div className="flex-1">
              <h1 className="text-xl font-semibold">AI Testing Assistant</h1>
              <p className="text-sm text-muted-foreground">
                Create and run tests using natural language
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="flex h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Backend Connected</span>
              </div>
            </div>
          </header>

          {/* Chat Interface - Responsive padding */}
          <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-hidden">
            {activeConversationId ? (
              messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ChatInterface
                  key={activeConversationId}
                  conversationId={activeConversationId}
                  initialMessages={initialMessages}
                  onMessagesChange={handleMessagesChange}
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full space-y-4 px-4">
                <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50" />
                <div className="text-center">
                  <h2 className="text-base sm:text-lg font-medium">No conversation selected</h2>
                  <p className="text-sm text-muted-foreground">
                    Start a new chat or select an existing conversation
                  </p>
                </div>
                <Button onClick={handleNewConversation} size="sm" className="sm:size-default">
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  Start New Chat
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <AppContent />
      </SignedIn>
    </>
  );
}
