/**
 * Chat Module - Public Exports
 *
 * This is the main entry point for the next-gen modular chat interface.
 *
 * Usage:
 *   import { ChatInterface, ChatProvider, useChatContext } from '@/components/chat';
 *
 * For specific components:
 *   import { MessageList, AgentActivityPanel } from '@/components/chat';
 */

// =============================================================================
// MAIN INTERFACE
// =============================================================================

export { ChatInterface, type ChatInterfaceProps } from './chat-interface-new';

// Legacy export (original interface - will be deprecated)
// export { ChatInterface as ChatInterfaceLegacy } from './chat-interface';

// =============================================================================
// CORE COMPONENTS
// =============================================================================

export {
  ChatProvider,
  useChatContext,
  ChatContainer,
  ChatHeader,
  ChatInput,
} from './core';

// =============================================================================
// MESSAGE COMPONENTS
// =============================================================================

export {
  MessageList,
  MessageItem,
  UserMessage,
  AssistantMessage,
  AIAvatar,
  TypingIndicator,
  EmptyState,
  type MessageListProps,
  type MessageItemProps,
  type UserMessageProps,
  type AssistantMessageProps,
  type AIAvatarProps,
} from './messages';

// =============================================================================
// AGENT VISIBILITY
// =============================================================================

export {
  AgentActivityPanel,
  AgentActivityInline,
  AgentActivityFloating,
  AgentActivitySidebar,
  AgentBadge,
  PhaseProgressBar,
  ConfidenceIndicator,
  ConfidenceBadge,
  type AgentActivityPanelProps,
  type AgentBadgeProps,
  type PhaseProgressBarProps,
  type ConfidenceIndicatorProps,
  type ConfidenceBadgeProps,
} from './agents';

// =============================================================================
// CONTENT RENDERERS
// =============================================================================

export {
  LaTeXRenderer,
  LaTeXInline,
  LaTeXDisplay,
  TextWithLaTeX,
  hasLaTeX,
  MarkdownRenderer,
  ToolCallDisplay,
  ResultDisplay,
  ScreenshotGallery,
  type LaTeXRendererProps,
  type LaTeXInlineProps,
  type TextWithLaTeXProps,
  type MarkdownRendererProps,
  type ToolCallDisplayProps,
  type ResultDisplayProps,
  type ScreenshotGalleryProps,
} from './renderers';

// =============================================================================
// INPUT COMPONENTS
// =============================================================================

export {
  MentionMenu,
  MentionBadge,
  useMentionTrigger,
  type MentionMenuProps,
  type MentionBadgeProps,
  type MentionTriggerResult,
} from './input';

// =============================================================================
// SETTINGS COMPONENTS
// =============================================================================

export {
  ChatSettingsPanel,
} from './settings';

// =============================================================================
// HOOKS
// =============================================================================

export {
  useChatState,
  useMessageVirtualization,
  useAgentActivity,
  useStreamingProtocol,
  useMessagePagination,
} from './hooks';

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

export {
  useChatStore,
  type ChatState,
  type ActiveAgent,
  type ToolInvocationState,
  type TestingPhase,
  type AgentStatus,
  type AIStatus,
} from '@/lib/chat/chat-store';

// =============================================================================
// AGENT CONFIGURATION
// =============================================================================

export {
  AGENT_CONFIG,
  getAgentConfig,
  searchAgents,
  getAgentsByCapability,
  getAgentsByCategory,
  type AgentType,
  type AgentUIConfig,
  type AgentCategory,
} from '@/lib/chat/agent-config';

// =============================================================================
// STREAMING PROTOCOL
// =============================================================================

export {
  parseSSELine,
  parseEventData,
  parseStreamEvent,
  createStreamProcessor,
  createStreamConnection,
  type RawStreamEvent,
  type ParsedStreamEvent,
  type StreamEventData,
  type TextDeltaData,
  type AgentStartData,
  type AgentProgressData,
  type PhaseTransitionData,
  type ToolCallData,
  type ScreenshotData,
  type StreamProcessor,
  type StreamConnectionOptions,
} from '@/lib/chat/streaming-protocol';
