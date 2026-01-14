'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { Sidebar } from '@/components/layout/sidebar';
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
} from '@/lib/hooks/use-chat';
import {
  MessageSquarePlus,
  Trash2,
  Loader2,
  MessageSquare,
  Clock,
  History,
  Bot,
  Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Conversation list component
function ConversationList({
  conversations,
  onSelect,
  onDelete,
  isLoading,
}: {
  conversations: Array<{ id: string; title: string | null; preview: string | null; updated_at: string }>;
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
            'hover:bg-muted'
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
  const router = useRouter();
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

  const { data: conversations = [], isLoading: conversationsLoading } = useConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();

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
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleSelectConversation = (id: string) => {
    setMobileHistoryOpen(false);
    router.push(`/chat/${id}`);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64 flex flex-col lg:flex-row">
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
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  <ConversationList
                    conversations={conversations}
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
              onSelect={handleSelectConversation}
              onDelete={handleDeleteConversation}
              isLoading={conversationsLoading}
            />
          </div>
        </div>

        {/* Main Content - Welcome Screen */}
        <div className="flex-1 flex flex-col min-h-0">
          <header className="hidden lg:flex sticky top-0 z-30 h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
            <div className="flex-1">
              <h1 className="text-xl font-semibold">AI Testing Assistant</h1>
              <p className="text-sm text-muted-foreground">
                Create and run tests using natural language
              </p>
            </div>
          </header>

          {/* Welcome/Empty State */}
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Welcome to Argus</h2>
                <p className="text-muted-foreground">
                  Your AI-powered E2E testing assistant. Create, run, and manage tests using natural language.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleNewConversation}
                  size="lg"
                  className="w-full"
                  disabled={createConversation.isPending}
                >
                  {createConversation.isPending ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <MessageSquarePlus className="h-5 w-5 mr-2" />
                  )}
                  Start New Conversation
                </Button>

                {conversations.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    or select a conversation from the sidebar
                  </p>
                )}
              </div>

              {/* Quick Tips */}
              <div className="pt-6 border-t">
                <p className="text-xs text-muted-foreground mb-3">Try asking:</p>
                <div className="space-y-2 text-sm text-left">
                  <div className="p-2 rounded bg-muted/50">
                    "Run a login test on example.com"
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    "Discover all interactive elements on my page"
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    "Extract product data from demo.vercel.store"
                  </div>
                </div>
              </div>
            </div>
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
