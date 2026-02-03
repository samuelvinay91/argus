/**
 * ChatInterface - Next-Gen Modular Chat Interface
 *
 * This is the refactored chat interface that uses modular components
 * for improved maintainability, performance, and extensibility.
 *
 * Key features:
 * - Virtual scrolling for 1000+ messages
 * - Agent visibility panel
 * - @agent mentions
 * - LaTeX rendering
 * - Streaming protocol support
 * - Message pagination
 */

'use client';

import { memo, useState, useCallback } from 'react';
import type { UIMessage } from '@ai-sdk/react';
import { AnimatePresence } from 'framer-motion';

// Core components
import {
  ChatProvider,
  useChatContext,
  ChatContainer,
  ChatHeader,
  ChatInput,
} from './core';

// Message components
import {
  MessageList,
  EmptyState,
} from './messages';

// Agent visibility
import { AgentActivityPanel } from './agents';

// Existing components (preserved from original)
import {
  SessionScreenshotsPanel,
  ScreenshotsPanelToggle,
} from './session-screenshots-panel';
import { SaveTestDialog, type SaveTestDialogProps } from '@/components/tests/save-test-dialog';
import { ArtifactsPanel, Artifact } from './artifacts-panel';

// =============================================================================
// TYPES
// =============================================================================

export interface ChatInterfaceProps {
  conversationId?: string;
  initialMessages?: UIMessage[];
  onMessagesChange?: (messages: UIMessage[]) => void;
}

// =============================================================================
// INNER CHAT COMPONENT (uses context)
// =============================================================================

const ChatInterfaceInner = memo(function ChatInterfaceInner() {
  const {
    messages,
    isLoading,
    streamingMessageId,
    currentPhase,
  } = useChatContext();

  // Derive isStreaming from streamingMessageId
  const isStreaming = streamingMessageId !== null;

  // Panel state
  const [isScreenshotsPanelOpen, setIsScreenshotsPanelOpen] = useState(false);
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(false);
  const [isArtifactsPanelOpen, setIsArtifactsPanelOpen] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);

  // Save test dialog state
  const [saveTestDialogOpen, setSaveTestDialogOpen] = useState(false);
  const [saveTestData, setSaveTestData] = useState<SaveTestDialogProps['testData']>(null);

  // Panel toggles
  const toggleScreenshotsPanel = useCallback(() => {
    setIsScreenshotsPanelOpen((prev) => !prev);
    if (!isScreenshotsPanelOpen) {
      setIsArtifactsPanelOpen(false);
    }
  }, [isScreenshotsPanelOpen]);

  const toggleAgentPanel = useCallback(() => {
    setIsAgentPanelOpen((prev) => !prev);
  }, []);

  // Artifact handlers
  const handleArtifactSelect = useCallback((artifact: Artifact) => {
    setSelectedArtifact(artifact);
    setIsArtifactsPanelOpen(true);
    setIsScreenshotsPanelOpen(false);
  }, []);

  const handleCloseArtifactsPanel = useCallback(() => {
    setIsArtifactsPanelOpen(false);
    setSelectedArtifact(null);
  }, []);

  const handleEditArtifactInChat = useCallback((content: string) => {
    // Send edit request to chat
    console.log('Edit artifact content:', content);
  }, []);

  const handleRegenerateArtifact = useCallback(() => {
    // Regenerate artifact
    console.log('Regenerate artifact');
  }, []);

  return (
    <ChatContainer>
      {/* Header */}
      <ChatHeader />

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-4">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <MessageList />
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t bg-background p-4">
        <ChatInput />
      </div>

      {/* Side Panels */}
      <AnimatePresence>
        {isScreenshotsPanelOpen && !isArtifactsPanelOpen && (
          <SessionScreenshotsPanel
            messages={messages}
            isOpen={true}
            onClose={() => setIsScreenshotsPanelOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isArtifactsPanelOpen && selectedArtifact && (
          <ArtifactsPanel
            artifact={selectedArtifact}
            isOpen={true}
            onClose={handleCloseArtifactsPanel}
            onEdit={handleEditArtifactInChat}
            onRegenerate={handleRegenerateArtifact}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAgentPanelOpen && (
          <AgentActivityPanel
            position="sidebar"
            isOpen={true}
            onClose={() => setIsAgentPanelOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Save Test Dialog */}
      <SaveTestDialog
        open={saveTestDialogOpen}
        onOpenChange={setSaveTestDialogOpen}
        testData={saveTestData}
        onSaved={(testId) => {
          console.log('Test saved with ID:', testId);
          setSaveTestData(null);
        }}
      />
    </ChatContainer>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ChatInterface = memo(function ChatInterface({
  conversationId,
  initialMessages = [],
  onMessagesChange,
}: ChatInterfaceProps) {
  return (
    <ChatProvider
      conversationId={conversationId}
      initialMessages={initialMessages}
      onMessagesChange={onMessagesChange}
    >
      <ChatInterfaceInner />
    </ChatProvider>
  );
});

// =============================================================================
// LEGACY EXPORT (for backwards compatibility)
// =============================================================================

export default ChatInterface;
