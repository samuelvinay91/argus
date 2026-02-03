/**
 * ChatThread - Virtualized message list container
 *
 * Uses @tanstack/react-virtual for efficient rendering of large conversations.
 * Features:
 * - Auto-scroll to bottom on new messages
 * - Scroll-to-bottom button when scrolled up
 * - Empty state when no messages
 * - Optimized for streaming performance
 */

'use client';

import { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, Bot, Sparkles } from 'lucide-react';
import type { UIMessage } from '@ai-sdk/react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../glass';

// =============================================================================
// TYPES
// =============================================================================

export interface ChatThreadProps {
  /** Array of messages to display */
  messages: UIMessage[];
  /** Whether the AI is currently loading/streaming */
  isLoading: boolean;
  /** Callback when scroll-to-bottom is triggered */
  onScrollToBottom?: () => void;
  /** Custom empty state title */
  emptyStateTitle?: string;
  /** Custom empty state description */
  emptyStateDescription?: string;
  /** Additional CSS classes */
  className?: string;
  /** Render function for each message */
  renderMessage: (message: UIMessage, index: number, isStreaming: boolean) => React.ReactNode;
  /** ID of the currently streaming message */
  streamingMessageId?: string | null;
}

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

const scrollButtonVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

// =============================================================================
// EMPTY STATE
// =============================================================================

interface EmptyStateProps {
  title: string;
  description: string;
}

const EmptyState = memo(function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center h-full px-4 py-12"
    >
      <GlassCard variant="medium" padding="lg" className="max-w-md text-center">
        {/* Avatar */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <motion.div
              className="absolute -right-1 -top-1 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-3 h-3 text-primary" />
            </motion.div>
          </div>
        </div>

        {/* Text */}
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </GlassCard>
    </motion.div>
  );
});

// =============================================================================
// SCROLL TO BOTTOM BUTTON
// =============================================================================

interface ScrollToBottomButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

const ScrollToBottomButton = memo(function ScrollToBottomButton({
  onClick,
  unreadCount = 0,
}: ScrollToBottomButtonProps) {
  return (
    <motion.button
      variants={scrollButtonVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={onClick}
      className={cn(
        'absolute bottom-4 right-4 z-20',
        'flex items-center gap-2 px-4 py-2',
        'rounded-full',
        'bg-primary text-primary-foreground',
        'shadow-lg shadow-primary/25',
        'hover:bg-primary/90 active:scale-95',
        'transition-colors duration-200'
      )}
    >
      <ArrowDown className="w-4 h-4" />
      <span className="text-sm font-medium">
        {unreadCount > 0 ? `${unreadCount} new` : 'Scroll down'}
      </span>
    </motion.button>
  );
});

// =============================================================================
// HEIGHT ESTIMATION
// =============================================================================

function estimateMessageHeight(message: UIMessage): number {
  const baseHeight = 80;
  const charHeight = 20;
  const codeBlockHeight = 150;

  // Extract text content from parts array (AI SDK v6 format)
  const textParts = message.parts?.filter(
    (part): part is { type: 'text'; text: string } => part.type === 'text'
  ) || [];
  const content = textParts.map(p => p.text).join('\n');
  const lineCount = Math.ceil(content.length / 80);
  const codeBlocks = (content.match(/```/g) || []).length / 2;

  // Count tool invocation parts (v6 format)
  const toolParts = message.parts?.filter(
    (part) => part.type === 'tool-invocation'
  ) || [];
  const toolHeight = toolParts.length * 120;

  return baseHeight + lineCount * charHeight + codeBlocks * codeBlockHeight + toolHeight;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ChatThread = memo(function ChatThread({
  messages,
  isLoading,
  onScrollToBottom,
  emptyStateTitle = 'Start a conversation',
  emptyStateDescription = 'Type a message below to begin chatting with the AI assistant.',
  className,
  renderMessage,
  streamingMessageId,
}: ChatThreadProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousMessageCount = useRef(messages.length);

  // Virtual list
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => estimateMessageHeight(messages[index]),
    overscan: 5,
    paddingStart: 16,
    paddingEnd: 16,
  });

  // Check if at bottom
  const checkIsAtBottom = useCallback(() => {
    const element = parentRef.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const threshold = 100;
    const atBottom = scrollHeight - scrollTop - clientHeight < threshold;
    setIsAtBottom(atBottom);

    if (atBottom) {
      setUnreadCount(0);
    }
  }, []);

  // Scroll handler
  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;

    element.addEventListener('scroll', checkIsAtBottom, { passive: true });
    return () => element.removeEventListener('scroll', checkIsAtBottom);
  }, [checkIsAtBottom]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > previousMessageCount.current) {
      if (isAtBottom) {
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
        });
      } else {
        setUnreadCount((prev) => prev + (messages.length - previousMessageCount.current));
      }
    }
    previousMessageCount.current = messages.length;
  }, [messages.length, isAtBottom, virtualizer]);

  // Scroll to bottom handler
  const handleScrollToBottom = useCallback(() => {
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    setUnreadCount(0);
    onScrollToBottom?.();
  }, [messages.length, virtualizer, onScrollToBottom]);

  // Virtual items
  const virtualItems = virtualizer.getVirtualItems();

  // Empty state
  if (messages.length === 0) {
    return (
      <div
        ref={parentRef}
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden min-w-0',
          'scroll-smooth',
          className
        )}
      >
        <EmptyState title={emptyStateTitle} description={emptyStateDescription} />
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn(
        'relative flex-1 overflow-y-auto overflow-x-hidden min-w-0',
        'scroll-smooth',
        className
      )}
    >
      {/* Virtual container */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <AnimatePresence mode="sync">
            {virtualItems.map((virtualItem) => {
              const message = messages[virtualItem.index];
              const isStreaming = message.id === streamingMessageId;
              const isLast = virtualItem.index === messages.length - 1;

              return (
                <motion.div
                  key={message.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  layout={!isLoading}
                  ref={virtualizer.measureElement}
                  data-index={virtualItem.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="px-4 pb-4"
                >
                  {renderMessage(message, virtualItem.index, isStreaming && isLast)}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {!isAtBottom && messages.length > 3 && (
          <ScrollToBottomButton onClick={handleScrollToBottom} unreadCount={unreadCount} />
        )}
      </AnimatePresence>
    </div>
  );
});

export default ChatThread;
