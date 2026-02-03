/**
 * Chat Components for Chat Workspace
 *
 * A collection of components for building the chat interface:
 * - ChatThread: Virtualized message list with auto-scroll
 * - UserMessage: User message bubble (right-aligned)
 * - AIMessage: Rich AI response card with actions
 * - StreamingMessage: Optimized streaming message display
 * - ThinkingIndicator: AI thinking/processing state
 * - InlineContent: Rich inline content renderer
 */

// Main thread component
export { ChatThread, type ChatThreadProps } from './ChatThread';
// Re-export Message type from AI SDK for convenience
export type { UIMessage } from '@ai-sdk/react';

// Message components
export { UserMessage, type UserMessageProps } from './UserMessage';
export {
  AIMessage,
  type AIMessageProps,
  type AIStatus,
  type MessageAction,
  type ToolCall,
} from './AIMessage';

// Streaming components
export { StreamingMessage, type StreamingMessageProps } from './StreamingMessage';

// Indicators
export {
  ThinkingIndicator,
  type ThinkingIndicatorProps,
  type ThinkingStep,
} from './ThinkingIndicator';

// Inline content
export {
  InlineContent,
  type InlineContentProps,
  type InlineContentType,
  type InlineContentData,
  type TestResultsData,
  type QualityScoreData,
  type CodeData,
  type VisualDiffData,
  type PipelineData,
  type ApiResponseData,
  type CoverageData,
} from './InlineContent';
