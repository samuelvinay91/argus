/**
 * MessageList - Virtualized scrolling message list
 *
 * Uses @tanstack/react-virtual for efficient rendering of large conversations.
 * Supports infinite scroll for loading older messages.
 */

'use client';

import { memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useChatContext } from '../core/ChatProvider';
import { useMessageVirtualization } from '../hooks/useMessageVirtualization';
import { MessageItem } from './MessageItem';
import { EmptyState } from './EmptyState';
import { TypingIndicator } from './TypingIndicator';
import { Loader2 } from 'lucide-react';

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
};

// =============================================================================
// LOADING INDICATOR
// =============================================================================

interface LoadingMoreProps {
  isLoading: boolean;
}

const LoadingMore = memo(function LoadingMore({ isLoading }: LoadingMoreProps) {
  if (!isLoading) return null;

  return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      <span className="ml-2 text-sm text-muted-foreground">Loading more messages...</span>
    </div>
  );
});

// =============================================================================
// MESSAGE LIST
// =============================================================================

export interface MessageListProps {
  className?: string;
  onAction?: (action: string, data: unknown) => void;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}

export const MessageList = memo(function MessageList({
  className,
  onAction,
  emptyStateTitle = "Hey Skopaq",
  emptyStateDescription = "Your autonomous quality companion. Describe what you want to test in plain English.",
}: MessageListProps) {
  const { messages, isLoading, aiStatus, streamingMessageId } = useChatContext();

  // Virtual scrolling
  const {
    parentRef,
    virtualItems,
    totalHeight,
    scrollToBottom,
    measureItem,
    isAtBottom,
  } = useMessageVirtualization({
    messages,
    streamingMessageId,
  });

  // Check if we should show typing indicator
  const showTypingIndicator = useMemo(() => {
    return isLoading &&
      messages.length > 0 &&
      messages[messages.length - 1]?.role === 'user';
  }, [isLoading, messages]);

  // Check if currently streaming a message
  const isAnyMessageStreaming = useMemo(() => {
    return isLoading && messages[messages.length - 1]?.role === 'assistant';
  }, [isLoading, messages]);

  // Render empty state
  if (messages.length === 0) {
    return (
      <div
        ref={parentRef as React.RefObject<HTMLDivElement>}
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden min-w-0',
          'space-y-3 sm:space-y-4 p-2 sm:p-4 scroll-smooth',
          className
        )}
      >
        <EmptyState
          title={emptyStateTitle}
          description={emptyStateDescription}
        />
      </div>
    );
  }

  return (
    <div
      ref={parentRef as React.RefObject<HTMLDivElement>}
      className={cn(
        'flex-1 overflow-y-auto overflow-x-hidden min-w-0',
        'p-2 sm:p-4 scroll-smooth',
        className
      )}
    >
      {/* Virtual container */}
      <div
        style={{
          height: `${totalHeight}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="sync">
            {virtualItems.map(({ message, virtualItem, isLast, isStreaming }) => (
              <motion.div
                key={message.id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout={!isAnyMessageStreaming}
                ref={(el) => {
                  if (el) measureItem(virtualItem.index, el);
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="mb-3 sm:mb-4"
              >
                <MessageItem
                  message={message}
                  isStreaming={isStreaming}
                  isLast={isLast}
                  onAction={onAction}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Typing indicator */}
      {showTypingIndicator && (
        <TypingIndicator />
      )}

      {/* Scroll to bottom button (when not at bottom) */}
      {!isAtBottom && messages.length > 5 && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          onClick={scrollToBottom}
          className={cn(
            'fixed bottom-24 right-8 z-40',
            'flex items-center gap-2 px-3 py-2 rounded-full',
            'bg-primary text-primary-foreground shadow-lg',
            'hover:bg-primary/90 transition-colors'
          )}
        >
          <span className="text-sm">Scroll to bottom</span>
        </motion.button>
      )}
    </div>
  );
});

// =============================================================================
// NON-VIRTUALIZED VERSION (for smaller message lists)
// =============================================================================

export interface SimpleMessageListProps {
  className?: string;
  onAction?: (action: string, data: unknown) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

export const SimpleMessageList = memo(function SimpleMessageList({
  className,
  onAction,
  scrollRef,
}: SimpleMessageListProps) {
  const { messages, isLoading, streamingMessageId } = useChatContext();

  const showTypingIndicator = useMemo(() => {
    return isLoading &&
      messages.length > 0 &&
      messages[messages.length - 1]?.role === 'user';
  }, [isLoading, messages]);

  const isAnyMessageStreaming = useMemo(() => {
    return isLoading && messages[messages.length - 1]?.role === 'assistant';
  }, [isLoading, messages]);

  if (messages.length === 0) {
    return (
      <div
        ref={scrollRef}
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden min-w-0',
          'space-y-3 sm:space-y-4 p-2 sm:p-4 scroll-smooth',
          className
        )}
      >
        <EmptyState />
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex-1 overflow-y-auto overflow-x-hidden min-w-0',
        'space-y-3 sm:space-y-4 p-2 sm:p-4 scroll-smooth',
        className
      )}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="sync">
          {messages.map((message, index) => {
            const isLast = index === messages.length - 1;
            const isStreaming = message.id === streamingMessageId;

            return (
              <motion.div
                key={message.id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout={!isAnyMessageStreaming}
                className="mb-3 sm:mb-4"
              >
                <MessageItem
                  message={message}
                  isStreaming={isStreaming}
                  isLast={isLast}
                  onAction={onAction}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {showTypingIndicator && <TypingIndicator />}
    </div>
  );
});

export default MessageList;
