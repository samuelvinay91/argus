/**
 * MessageItem - Individual message wrapper
 *
 * Handles rendering different message types (user, assistant, system)
 * with appropriate styling and actions.
 */

'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, Pencil, RotateCcw, PanelRightOpen } from 'lucide-react';
import type { Message } from 'ai/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useChatContext } from '../core/ChatProvider';
import { AIAvatar } from './AIAvatar';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';

// =============================================================================
// TYPES
// =============================================================================

export interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  isLast?: boolean;
  onAction?: (action: string, data: unknown) => void;
}

// =============================================================================
// MESSAGE ACTIONS
// =============================================================================

interface MessageActionsProps {
  message: Message;
  isUser: boolean;
  isLastAssistant: boolean;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onOpenPanel?: () => void;
  hasArtifacts?: boolean;
}

const MessageActions = memo(function MessageActions({
  isUser,
  isLastAssistant,
  onEdit,
  onRegenerate,
  onOpenPanel,
  hasArtifacts,
}: MessageActionsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 mt-1',
        'opacity-0 group-hover:opacity-100 transition-opacity',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {isUser && onEdit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          title="Edit message"
        >
          <Pencil className="w-3 h-3 mr-1" />
          Edit
        </Button>
      )}

      {isLastAssistant && onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          title="Regenerate response"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Regenerate
        </Button>
      )}

      {hasArtifacts && onOpenPanel && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenPanel}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          title="Open in panel"
        >
          <PanelRightOpen className="w-3 h-3 mr-1" />
          Panel
        </Button>
      )}
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const MessageItem = memo(function MessageItem({
  message,
  isStreaming = false,
  isLast = false,
  onAction,
}: MessageItemProps) {
  const { isLoading, reload, setMessages, messages, append, setArtifactsPanelOpen } = useChatContext();

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isLastAssistant = isLast && isAssistant && !isLoading;

  // Extract artifacts from content (code blocks)
  const artifacts = useMemo(() => {
    if (!isAssistant) return [];

    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    const extracted: Array<{ language: string; code: string }> = [];
    let match;

    while ((match = codeBlockPattern.exec(message.content)) !== null) {
      const code = match[2].trim();
      if (code.length > 50) {
        extracted.push({
          language: match[1] || 'text',
          code,
        });
      }
    }

    return extracted;
  }, [isAssistant, message.content]);

  // Handlers
  const handleStartEdit = useCallback(() => {
    setEditContent(message.content);
    setIsEditing(true);
  }, [message.content]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent('');
  }, []);

  const handleSubmitEdit = useCallback(() => {
    if (!editContent.trim()) return;

    const messageIndex = messages.findIndex(m => m.id === message.id);
    if (messageIndex === -1) return;

    // Keep only messages before this one
    const previousMessages = messages.slice(0, messageIndex);
    setMessages(previousMessages);

    // Reset edit state
    setIsEditing(false);
    setEditContent('');

    // Append new message
    setTimeout(() => {
      append({
        role: 'user',
        content: editContent.trim(),
      });
    }, 100);
  }, [editContent, messages, message.id, setMessages, append]);

  const handleRegenerate = useCallback(() => {
    if (messages.length < 2) return;

    const lastAssistantIndex = messages.length - 1;
    if (messages[lastAssistantIndex]?.role !== 'assistant') return;

    const messagesWithoutLastAssistant = messages.slice(0, lastAssistantIndex);
    setMessages(messagesWithoutLastAssistant);

    setTimeout(() => {
      reload();
    }, 100);
  }, [messages, setMessages, reload]);

  const handleOpenPanel = useCallback(() => {
    setArtifactsPanelOpen(true);
  }, [setArtifactsPanelOpen]);

  // Render user message
  if (isUser) {
    return (
      <div className={cn('flex gap-3 min-w-0 max-w-full group justify-end')}>
        <div className="flex flex-col min-w-0 max-w-[90%] sm:max-w-[85%]">
          <UserMessage
            content={message.content}
            isEditing={isEditing}
            editContent={editContent}
            onEditChange={setEditContent}
            onCancelEdit={handleCancelEdit}
            onSubmitEdit={handleSubmitEdit}
          />

          {!isEditing && !isStreaming && (
            <MessageActions
              message={message}
              isUser={true}
              isLastAssistant={false}
              onEdit={handleStartEdit}
            />
          )}
        </div>

        {!isEditing && (
          <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}
      </div>
    );
  }

  // Render assistant message
  if (isAssistant) {
    return (
      <div className={cn('flex gap-3 min-w-0 max-w-full group justify-start')}>
        <AIAvatar
          status={isStreaming ? 'typing' : 'ready'}
          size="sm"
        />

        <div className="flex flex-col min-w-0 max-w-[90%] sm:max-w-[85%]">
          <AssistantMessage
            message={message}
            isStreaming={isStreaming}
            onAction={onAction}
            artifacts={artifacts}
          />

          {!isStreaming && (
            <MessageActions
              message={message}
              isUser={false}
              isLastAssistant={isLastAssistant}
              onRegenerate={handleRegenerate}
              onOpenPanel={handleOpenPanel}
              hasArtifacts={artifacts.length > 0}
            />
          )}
        </div>
      </div>
    );
  }

  // System message (rare, but handle it)
  return (
    <div className="flex justify-center">
      <div className="text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
        {message.content}
      </div>
    </div>
  );
});

export default MessageItem;
