/**
 * AssistantMessage - AI assistant message bubble
 *
 * Renders assistant messages with:
 * - Markdown content
 * - Tool invocations
 * - Streaming cursor
 * - Artifact triggers
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Message } from 'ai/react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '../renderers/MarkdownRenderer';
import { ToolCallDisplay } from '../renderers/ToolCallDisplay';
import { ArtifactTrigger } from '../artifacts-panel';

// =============================================================================
// TYPES
// =============================================================================

export interface AssistantMessageProps {
  message: Message;
  isStreaming?: boolean;
  onAction?: (action: string, data: unknown) => void;
  artifacts?: Array<{ language: string; code: string }>;
  className?: string;
}

// =============================================================================
// STREAMING CURSOR
// =============================================================================

const StreamingCursor = memo(function StreamingCursor() {
  return (
    <motion.span
      className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle"
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
    />
  );
});

// =============================================================================
// MESSAGE BUBBLE
// =============================================================================

interface MessageBubbleProps {
  children: React.ReactNode;
  className?: string;
}

const MessageBubble = memo(function MessageBubble({
  children,
  className,
}: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'max-w-[90%] sm:max-w-[85%] min-w-0 relative overflow-hidden rounded-lg',
        className
      )}
    >
      {/* Glass effect background */}
      <div className="absolute inset-0 bg-gradient-to-br from-card/80 via-card/90 to-card/80 backdrop-blur-sm border border-white/10 rounded-lg" />

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 rounded-lg" />

      {/* Content */}
      <div className="relative p-2 sm:p-3 min-w-0 overflow-hidden break-words">
        {children}
      </div>
    </motion.div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AssistantMessage = memo(function AssistantMessage({
  message,
  isStreaming = false,
  onAction,
  artifacts = [],
  className,
}: AssistantMessageProps) {
  // Check for tool invocations
  const hasToolInvocations = message.toolInvocations && message.toolInvocations.length > 0;
  const isToolsStillStreaming = isStreaming && hasToolInvocations &&
    !message.toolInvocations?.some(t => t.state === 'result');

  return (
    <MessageBubble className={className}>
      {/* Text content */}
      {message.content && (
        <div className="min-w-0 max-w-full overflow-hidden">
          <MarkdownRenderer content={message.content} />
          {(isStreaming && !hasToolInvocations) && <StreamingCursor />}
          {isToolsStillStreaming && <StreamingCursor />}
        </div>
      )}

      {/* Tool invocations */}
      {hasToolInvocations && (
        <div className={cn('min-w-0 max-w-full overflow-hidden', message.content && 'mt-3')}>
          {message.toolInvocations!.map((tool, index) => (
            <ToolCallDisplay
              key={`${tool.toolName}-${index}`}
              toolName={tool.toolName}
              args={tool.args as Record<string, unknown>}
              result={tool.state === 'result' ? tool.result : undefined}
              isLoading={tool.state === 'call'}
              onAction={onAction}
            />
          ))}
        </div>
      )}

      {/* Artifact triggers */}
      {artifacts.length > 0 && !isStreaming && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          <p className="text-xs text-muted-foreground mb-2">Open in panel:</p>
          {artifacts.slice(0, 3).map((artifact, index) => (
            <ArtifactTrigger
              key={`artifact-${index}`}
              artifact={{
                id: `artifact-${index}`,
                type: 'code',
                title: `Code Block ${index + 1}`,
                content: artifact.code,
                language: artifact.language,
                createdAt: new Date(),
                editable: true,
              }}
              onClick={() => {
                // TODO: Integrate with artifact panel
                console.log('Open artifact:', artifact);
              }}
              className="w-full"
            />
          ))}
        </div>
      )}
    </MessageBubble>
  );
});

export default AssistantMessage;
