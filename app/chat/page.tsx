'use client';

import { useRouter } from 'next/navigation';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import { Loader2, MessageSquare, Plus, Sparkles } from 'lucide-react';
import { useConversations, useCreateConversation } from '@/lib/hooks/use-chat';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/layout/sidebar';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * Chat page - Shows existing conversations with option to create new
 *
 * This page is accessed via the Chat button in the sidebar.
 * Shows a list of existing conversations and a "New Chat" button.
 */
function ChatPageContent() {
  const router = useRouter();
  const { data: conversations, isLoading: conversationsLoading } = useConversations();
  const createConversation = useCreateConversation();

  const handleNewChat = async () => {
    console.log('handleNewChat called');
    try {
      console.log('Creating conversation...');
      const conversation = await createConversation.mutateAsync({});
      console.log('Conversation created:', conversation);
      router.push(`/chat/${conversation.id}`);
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleSelectConversation = (id: string) => {
    router.push(`/chat/${id}`);
  };

  if (conversationsLoading) {
    return (
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-w-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading conversations...</p>
          </div>
        </main>
      </div>
    );
  }

  const hasConversations = conversations && conversations.length > 0;

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Chat</h1>
              <p className="text-sm text-muted-foreground mt-1">
                AI-powered conversations to help with your testing
              </p>
            </div>
            {/* Only show New Chat button in header when there are existing conversations */}
            {hasConversations && (
              <Button
                onClick={handleNewChat}
                disabled={createConversation.isPending}
                className="gap-2"
              >
                {createConversation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                New Chat
              </Button>
            )}
          </div>

          {/* Conversations list or empty state */}
          {!hasConversations ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Start your first conversation</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                Chat with AI to analyze test results, debug failures, generate test cases,
                and get insights about your testing infrastructure.
              </p>
              <Button
                onClick={handleNewChat}
                disabled={createConversation.isPending}
                size="lg"
                className="gap-2"
              >
                {createConversation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                Start New Chat
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
              {conversations.map((conversation) => {
                const updatedAt = conversation.updated_at
                  ? formatDistanceToNow(parseISO(conversation.updated_at), { addSuffix: true })
                  : 'Unknown';

                return (
                  <button
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation.id)}
                    className={cn(
                      'w-full flex items-start gap-4 p-4 rounded-lg border',
                      'hover:bg-accent hover:border-primary/20 transition-colors',
                      'text-left'
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">
                        {conversation.title || 'Untitled conversation'}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {conversation.preview || 'No messages yet'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {updatedAt}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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
