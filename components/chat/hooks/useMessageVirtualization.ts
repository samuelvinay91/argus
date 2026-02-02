/**
 * useMessageVirtualization - Virtual scrolling for message list
 *
 * Uses @tanstack/react-virtual to efficiently render large message lists.
 * Only renders visible messages + buffer, dramatically improving performance
 * for conversations with 1000+ messages.
 */

'use client';

import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useVirtualizer, type VirtualItem, type Virtualizer } from '@tanstack/react-virtual';
import type { Message } from 'ai/react';

// =============================================================================
// TYPES
// =============================================================================

export interface VirtualizedMessage {
  message: Message;
  virtualItem: VirtualItem;
  isFirst: boolean;
  isLast: boolean;
  isStreaming: boolean;
}

export interface UseMessageVirtualizationOptions {
  messages: Message[];
  streamingMessageId?: string | null;
  estimateMessageHeight?: (message: Message) => number;
  overscan?: number;
  scrollPaddingStart?: number;
  scrollPaddingEnd?: number;
}

export interface MessageVirtualizationResult {
  // Container ref for scroll container
  parentRef: React.RefObject<HTMLDivElement | null>;

  // Virtual items to render
  virtualItems: VirtualizedMessage[];

  // Total height of all items
  totalHeight: number;

  // Scroll helpers
  scrollToBottom: () => void;
  scrollToMessage: (messageId: string) => void;
  scrollToIndex: (index: number) => void;

  // Virtualizer instance for advanced control
  virtualizer: Virtualizer<HTMLDivElement, Element>;

  // Measurements
  measureItem: (index: number, element: HTMLElement | null) => void;

  // State
  isAtBottom: boolean;
}

// =============================================================================
// HEIGHT ESTIMATION
// =============================================================================

/**
 * Estimate message height based on content
 * More accurate estimates = smoother scrolling
 */
export function estimateMessageHeight(message: Message): number {
  const baseHeight = 80; // Avatar + padding
  const charHeight = 20; // ~20px per line
  const codeBlockHeight = 150; // Average code block height

  const content = message.content || '';
  const lineCount = Math.ceil(content.length / 80); // ~80 chars per line
  const codeBlocks = (content.match(/```/g) || []).length / 2;

  // Tool invocations add height
  const toolHeight = (message.toolInvocations?.length || 0) * 120;

  return baseHeight +
    (lineCount * charHeight) +
    (codeBlocks * codeBlockHeight) +
    toolHeight;
}

// =============================================================================
// HOOK
// =============================================================================

export function useMessageVirtualization(
  options: UseMessageVirtualizationOptions
): MessageVirtualizationResult {
  const {
    messages,
    streamingMessageId,
    estimateMessageHeight: customEstimate = estimateMessageHeight,
    overscan = 5,
    scrollPaddingStart = 16,
    scrollPaddingEnd = 16,
  } = options;

  const parentRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // Track if we should auto-scroll
  const shouldAutoScroll = useRef(true);

  // Virtualizer instance
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => customEstimate(messages[index]),
    overscan,
    scrollPaddingStart,
    scrollPaddingEnd,
  });

  // Check if scrolled to bottom
  const updateIsAtBottom = useCallback(() => {
    const element = parentRef.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const threshold = 100; // 100px from bottom
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  // Scroll event handler
  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;

    const handleScroll = () => {
      updateIsAtBottom();
      // Only auto-scroll if user was at bottom
      shouldAutoScroll.current = isAtBottomRef.current;
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [updateIsAtBottom]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (shouldAutoScroll.current && messages.length > 0) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
      });
    }
  }, [messages.length, virtualizer]);

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    if (messages.length === 0) return;
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    shouldAutoScroll.current = true;
  }, [messages.length, virtualizer]);

  // Scroll to specific message
  const scrollToMessage = useCallback((messageId: string) => {
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      virtualizer.scrollToIndex(index, { align: 'center' });
    }
  }, [messages, virtualizer]);

  // Scroll to index
  const scrollToIndex = useCallback((index: number) => {
    virtualizer.scrollToIndex(index, { align: 'start' });
  }, [virtualizer]);

  // Measure item for dynamic sizing
  const measureItem = useCallback((index: number, element: HTMLElement | null) => {
    if (element) {
      virtualizer.measureElement(element);
    }
  }, [virtualizer]);

  // Map virtual items to messages
  const virtualItems = useMemo((): VirtualizedMessage[] => {
    return virtualizer.getVirtualItems().map((virtualItem) => ({
      message: messages[virtualItem.index],
      virtualItem,
      isFirst: virtualItem.index === 0,
      isLast: virtualItem.index === messages.length - 1,
      isStreaming: messages[virtualItem.index].id === streamingMessageId,
    }));
  }, [virtualizer.getVirtualItems(), messages, streamingMessageId]);

  return {
    parentRef,
    virtualItems,
    totalHeight: virtualizer.getTotalSize(),
    scrollToBottom,
    scrollToMessage,
    scrollToIndex,
    virtualizer,
    measureItem,
    isAtBottom: isAtBottomRef.current,
  };
}

export default useMessageVirtualization;
