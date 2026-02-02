/**
 * Chat Hooks Index
 *
 * Export all custom hooks for the chat interface.
 */

export { useChatState, type UseChatStateOptions, type ChatStateResult } from './useChatState';

export {
  useMessageVirtualization,
  estimateMessageHeight,
  type UseMessageVirtualizationOptions,
  type MessageVirtualizationResult,
  type VirtualizedMessage,
} from './useMessageVirtualization';

export {
  useAgentActivity,
  useAgent,
  useIsAgentActive,
  usePrimaryAgent,
  type AgentActivityState,
  type AgentActivityActions,
  type UseAgentActivityResult,
} from './useAgentActivity';

export {
  useStreamingProtocol,
  useSSEStream,
  type StreamingProtocolOptions,
  type StreamingProtocolResult,
  type UseSSEStreamOptions,
} from './useStreamingProtocol';

export {
  useMessagePagination,
  useInfiniteScroll,
  type MessagePaginationOptions,
  type MessagePaginationResult,
  type UseInfiniteScrollOptions,
} from './useMessagePagination';
