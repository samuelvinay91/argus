/**
 * useStreamingProtocol - Hook for handling SSE streaming events
 *
 * Integrates with the streaming protocol parser and dispatches
 * events to the chat store and agent activity handlers.
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useChatStore } from '@/lib/chat/chat-store';
import { useAgentActivity } from './useAgentActivity';
import {
  parseStreamEvent,
  createStreamProcessor,
  type ParsedStreamEvent,
  type TextDeltaData,
  type AgentStartData,
  type AgentProgressData,
  type AgentCompleteData,
  type PhaseTransitionData,
  type ToolCallData,
  type ToolResultData,
  type ScreenshotData,
  type ErrorData,
  type RawStreamEvent,
} from '@/lib/chat/streaming-protocol';

// =============================================================================
// TYPES
// =============================================================================

export interface StreamingProtocolOptions {
  /** Callback when text content is received */
  onTextDelta?: (data: TextDeltaData) => void;
  /** Callback when screenshot is captured */
  onScreenshot?: (data: ScreenshotData) => void;
  /** Callback for errors */
  onError?: (data: ErrorData) => void;
  /** Callback when stream completes */
  onComplete?: () => void;
}

export interface StreamingProtocolResult {
  /** Process a raw SSE event */
  processEvent: (event: RawStreamEvent) => void;
  /** Process a parsed event directly */
  handleEvent: (event: ParsedStreamEvent) => void;
  /** Current streaming message ID */
  streamingMessageId: string | null;
  /** Partial content accumulated so far */
  partialContent: string;
  /** Whether actively streaming */
  isStreaming: boolean;
  /** Reset streaming state */
  reset: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useStreamingProtocol(
  options: StreamingProtocolOptions = {}
): StreamingProtocolResult {
  const { onTextDelta, onScreenshot, onError, onComplete } = options;

  // Store access
  const {
    streamingMessageId,
    partialContent,
    setStreamingMessageId,
    appendPartialContent,
    addToolInvocation,
    updateToolInvocation,
    addStreamingEvent,
    clearStreaming,
    setError,
  } = useChatStore();

  // Agent activity handlers
  const {
    handleAgentStart,
    handleAgentProgress,
    handleAgentComplete,
    handlePhaseTransition,
  } = useAgentActivity();

  // Track streaming state
  const isStreamingRef = useRef(false);

  // Event processor
  const handleEvent = useCallback((event: ParsedStreamEvent) => {
    // Log event for debugging
    addStreamingEvent({ type: event.type, data: event.data });

    switch (event.type) {
      case 'text_delta': {
        const data = event.data as TextDeltaData;
        appendPartialContent(data.delta);
        if (data.messageId && !streamingMessageId) {
          setStreamingMessageId(data.messageId);
        }
        onTextDelta?.(data);
        break;
      }

      case 'agent_start': {
        const data = event.data as AgentStartData;
        handleAgentStart(data);
        isStreamingRef.current = true;
        break;
      }

      case 'agent_progress': {
        const data = event.data as AgentProgressData;
        handleAgentProgress(data);
        break;
      }

      case 'agent_complete': {
        const data = event.data as AgentCompleteData;
        handleAgentComplete(data);
        break;
      }

      case 'phase_transition': {
        const data = event.data as PhaseTransitionData;
        handlePhaseTransition(data);

        // Check for completion
        if (data.to === 'idle' || data.to === 'complete') {
          isStreamingRef.current = false;
          onComplete?.();
        }
        break;
      }

      case 'tool_call': {
        const data = event.data as ToolCallData;
        addToolInvocation({
          id: data.id,
          toolName: data.toolName,
          args: data.args,
          state: 'call',
        });
        break;
      }

      case 'tool_result': {
        const data = event.data as ToolResultData;
        updateToolInvocation(data.id, {
          state: 'result',
          result: data.result,
        });
        break;
      }

      case 'screenshot': {
        const data = event.data as ScreenshotData;
        onScreenshot?.(data);
        break;
      }

      case 'error': {
        const data = event.data as ErrorData;
        setError(data.message);
        onError?.(data);
        isStreamingRef.current = false;
        break;
      }
    }
  }, [
    addStreamingEvent,
    appendPartialContent,
    streamingMessageId,
    setStreamingMessageId,
    handleAgentStart,
    handleAgentProgress,
    handleAgentComplete,
    handlePhaseTransition,
    addToolInvocation,
    updateToolInvocation,
    setError,
    onTextDelta,
    onScreenshot,
    onError,
    onComplete,
  ]);

  // Process raw SSE event
  const processEvent = useCallback((rawEvent: RawStreamEvent) => {
    const parsed = parseStreamEvent(rawEvent);
    if (parsed) {
      handleEvent(parsed);
    }
  }, [handleEvent]);

  // Reset streaming state
  const reset = useCallback(() => {
    clearStreaming();
    isStreamingRef.current = false;
  }, [clearStreaming]);

  return {
    processEvent,
    handleEvent,
    streamingMessageId,
    partialContent,
    isStreaming: isStreamingRef.current,
    reset,
  };
}

// =============================================================================
// SSE STREAM HOOK
// =============================================================================

export interface UseSSEStreamOptions {
  url: string;
  headers?: Record<string, string>;
  enabled?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for connecting to an SSE stream
 */
export function useSSEStream(options: UseSSEStreamOptions) {
  const {
    url,
    headers,
    enabled = true,
    onOpen,
    onClose,
    onError,
  } = options;

  const { handleEvent } = useStreamingProtocol();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || !url) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let buffer = '';

    const connect = async () => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
            ...headers,
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        onOpen?.();

        const decoder = new TextDecoder();
        let currentEvent: RawStreamEvent = { data: '' };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line === '') {
              if (currentEvent.data) {
                const parsed = parseStreamEvent(currentEvent);
                if (parsed) {
                  handleEvent(parsed);
                }
              }
              currentEvent = { data: '' };
            } else if (line.startsWith('data:')) {
              const data = line.slice(5).trimStart();
              currentEvent.data = currentEvent.data
                ? currentEvent.data + '\n' + data
                : data;
            } else if (line.startsWith('event:')) {
              currentEvent.event = line.slice(6).trimStart();
            } else if (line.startsWith('id:')) {
              currentEvent.id = line.slice(3).trimStart();
            }
          }
        }

        onClose?.();
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          onError?.(error as Error);
        }
        onClose?.();
      }
    };

    connect();

    return () => {
      abortController.abort();
    };
  }, [url, headers, enabled, handleEvent, onOpen, onClose, onError]);

  const disconnect = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return { disconnect };
}

export default useStreamingProtocol;
