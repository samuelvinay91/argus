'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { useCreateConversation } from '@/lib/hooks/use-chat';

/**
 * Chat page - Creates a new conversation and redirects to it
 *
 * This page is accessed via the Chat button in the sidebar.
 * It automatically creates a new conversation and navigates to /chat/{id}.
 */
function ChatPageContent() {
  const router = useRouter();
  const createConversation = useCreateConversation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function createAndRedirect() {
      try {
        const conversation = await createConversation.mutateAsync({});
        if (mounted) {
          router.replace(`/chat/${conversation.id}`);
        }
      } catch (err) {
        console.error('Failed to create conversation:', err);
        if (mounted) {
          setError('Failed to create conversation. Please try again.');
        }
      }
    }

    createAndRedirect();

    return () => {
      mounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-primary hover:underline"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Starting new conversation...</p>
      </div>
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
