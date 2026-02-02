/**
 * useMessagePagination - Infinite scroll for message history
 *
 * Loads older messages when scrolling to the top of the conversation.
 * Works with virtual scrolling for efficient rendering.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/lib/chat/chat-store';
import type { Message } from 'ai/react';

// =============================================================================
// TYPES
// =============================================================================

export interface MessagePaginationOptions {
  /** Conversation ID to load messages for */
  conversationId?: string;
  /** Number of messages to load per page */
  pageSize?: number;
  /** Distance from top to trigger load (pixels) */
  loadThreshold?: number;
  /** API endpoint for loading messages */
  apiEndpoint?: string;
  /** Custom fetch function with auth */
  fetchFn?: typeof fetch;
}

export interface MessagePaginationResult {
  /** Whether there are more messages to load */
  hasMore: boolean;
  /** Whether currently loading more messages */
  isLoadingMore: boolean;
  /** Load the next page of messages */
  loadMore: () => Promise<void>;
  /** Reset pagination state */
  reset: () => void;
  /** Handle scroll event for auto-loading */
  handleScroll: (event: React.UIEvent<HTMLElement>) => void;
  /** Ref for scroll container */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  /** Total messages loaded */
  totalLoaded: number;
}

// =============================================================================
// HOOK
// =============================================================================

export function useMessagePagination(
  options: MessagePaginationOptions = {}
): MessagePaginationResult {
  const {
    conversationId,
    pageSize = 50,
    loadThreshold = 200,
    apiEndpoint = '/api/conversations',
    fetchFn = fetch,
  } = options;

  // Store access
  const {
    messages,
    hasMoreMessages,
    isLoadingMore,
    oldestMessageId,
    setHasMoreMessages,
    setLoadingMore,
    prependMessages,
    setOldestMessageId,
  } = useChatStore();

  // Local state
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const isLoadingRef = useRef(false);

  // Load more messages
  const loadMore = useCallback(async () => {
    if (!conversationId || isLoadingRef.current || !hasMoreMessages) {
      return;
    }

    isLoadingRef.current = true;
    setLoadingMore(true);

    try {
      // Build URL with cursor pagination
      const url = new URL(`${apiEndpoint}/${conversationId}/messages`, window.location.origin);
      url.searchParams.set('limit', String(pageSize));
      if (oldestMessageId) {
        url.searchParams.set('before', oldestMessageId);
      }

      const response = await fetchFn(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status}`);
      }

      const data = await response.json();
      const newMessages: Message[] = data.messages || [];
      const hasMore = data.hasMore ?? (newMessages.length === pageSize);

      if (newMessages.length > 0) {
        // Remember scroll position
        const container = scrollContainerRef.current;
        const previousScrollHeight = container?.scrollHeight || 0;

        // Prepend messages
        prependMessages(newMessages);
        setTotalLoaded(prev => prev + newMessages.length);

        // Update oldest message ID for next page
        setOldestMessageId(newMessages[0].id);

        // Restore scroll position after prepend
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            const scrollDiff = newScrollHeight - previousScrollHeight;
            container.scrollTop += scrollDiff;
          }
        });
      }

      setHasMoreMessages(hasMore);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      isLoadingRef.current = false;
      setLoadingMore(false);
    }
  }, [
    conversationId,
    hasMoreMessages,
    oldestMessageId,
    pageSize,
    apiEndpoint,
    fetchFn,
    setLoadingMore,
    prependMessages,
    setOldestMessageId,
    setHasMoreMessages,
  ]);

  // Handle scroll for auto-loading
  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const { scrollTop } = event.currentTarget;

    // Check if near top
    if (scrollTop < loadThreshold && hasMoreMessages && !isLoadingRef.current) {
      loadMore();
    }
  }, [loadThreshold, hasMoreMessages, loadMore]);

  // Reset pagination state
  const reset = useCallback(() => {
    setHasMoreMessages(true);
    setLoadingMore(false);
    setOldestMessageId(null);
    setTotalLoaded(0);
    isLoadingRef.current = false;
  }, [setHasMoreMessages, setLoadingMore, setOldestMessageId]);

  // Reset when conversation changes
  useEffect(() => {
    reset();
  }, [conversationId, reset]);

  // Initial check for more messages
  useEffect(() => {
    if (conversationId && messages.length > 0 && !oldestMessageId) {
      setOldestMessageId(messages[0].id);
      // Assume there might be more if we have messages
      setHasMoreMessages(true);
    }
  }, [conversationId, messages, oldestMessageId, setOldestMessageId, setHasMoreMessages]);

  return {
    hasMore: hasMoreMessages,
    isLoadingMore,
    loadMore,
    reset,
    handleScroll,
    scrollContainerRef,
    totalLoaded,
  };
}

// =============================================================================
// INTERSECTION OBSERVER VARIANT
// =============================================================================

export interface UseInfiniteScrollOptions {
  /** Element to observe (usually the load more trigger) */
  triggerRef: React.RefObject<HTMLElement | null>;
  /** Callback when trigger is visible */
  onLoadMore: () => void;
  /** Whether loading is in progress */
  isLoading: boolean;
  /** Whether there's more data to load */
  hasMore: boolean;
  /** Root margin for intersection observer */
  rootMargin?: string;
}

/**
 * Alternative hook using Intersection Observer for infinite scroll
 */
export function useInfiniteScroll(options: UseInfiniteScrollOptions) {
  const {
    triggerRef,
    onLoadMore,
    isLoading,
    hasMore,
    rootMargin = '200px 0px',
  } = options;

  useEffect(() => {
    const element = triggerRef.current;
    if (!element || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [triggerRef, hasMore, isLoading, onLoadMore, rootMargin]);
}

// =============================================================================
// HOOKS INDEX
// =============================================================================

export default useMessagePagination;
