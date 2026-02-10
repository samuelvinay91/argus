/**
 * Chat Workspace - Redesigned Chat Interface for Skopaq
 *
 * A modern, adaptive chat interface with:
 * - Glassmorphic design system
 * - Adaptive split layouts (focused/split/multi)
 * - AI-driven panel spawning
 * - Rich contextual panels
 * - Floating panels with persistence
 * - Smart suggestions
 *
 * Usage:
 * ```tsx
 * import { ChatWorkspace } from '@/components/chat-workspace';
 *
 * <ChatWorkspace
 *   conversationId="..."
 *   initialMessages={[]}
 *   onMessagesChange={(messages) => saveMessages(messages)}
 * />
 * ```
 */

// =============================================================================
// MAIN ORCHESTRATOR
// =============================================================================

export { ChatWorkspace, type ChatWorkspaceProps } from './ChatWorkspace';

// =============================================================================
// GLASS DESIGN SYSTEM
// =============================================================================

export {
  GlassCard,
  glassCardVariants,
  type GlassCardProps,
  GlassOverlay,
  type GlassOverlayProps,
  GlowEffect,
  glowColors,
  type GlowEffectProps,
} from './glass';

// =============================================================================
// LAYOUT COMPONENTS
// =============================================================================

export {
  WorkspaceLayout,
  type LayoutState,
  type WorkspaceLayoutProps,
  PanelContainer,
  type PanelItem,
  type PanelContainerProps,
  FloatingPanel,
  type FloatingPanelProps,
  ResizeDivider,
  type ResizeDividerProps,
} from './layout';

// =============================================================================
// CHAT COMPONENTS
// =============================================================================

export {
  ChatThread,
  type ChatThreadProps,
  UserMessage,
  type UserMessageProps,
  AIMessage,
  type AIMessageProps,
  type AIStatus,
  type MessageAction,
  type ToolCall,
  StreamingMessage,
  type StreamingMessageProps,
  ThinkingIndicator,
  type ThinkingIndicatorProps,
  type ThinkingStep,
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
} from './chat';

// =============================================================================
// INPUT COMPONENTS
// =============================================================================

export {
  CommandStrip,
  type CommandStripProps,
  type Suggestion,
  ContextualChips,
  CONTEXT_CHIPS,
  type ContextualChipsProps,
  type Chip,
  type ChipContext,
  SlashCommandMenu,
  COMMANDS,
  CATEGORY_INFO,
  type SlashCommandMenuProps,
  type SlashCommand,
  type CommandCategory,
  ModelBadge,
  DEFAULT_MODELS,
  type ModelBadgeProps,
  type Model,
} from './input';

// =============================================================================
// PANEL COMPONENTS
// =============================================================================

export {
  TestResultsPanel,
  TestResultsSkeleton,
  type TestResultsPanelProps,
  type TestRun,
  type TestItem,
  QualityReportPanel,
  QualityReportSkeleton,
  type QualityReportPanelProps,
  type QualityMetrics,
  VisualDiffPanel,
  VisualDiffSkeleton,
  type VisualDiffPanelProps,
  type VisualComparison,
  type ViewMode,
  CodeViewerPanel,
  CodeViewerSkeleton,
  type CodeViewerPanelProps,
  PipelinePanel,
  PipelineSkeleton,
  type PipelinePanelProps,
  type Pipeline,
  type Stage,
  type StageStatus,
  BrowserPreviewPanel,
  BrowserPreviewSkeleton,
  type BrowserPreviewPanelProps,
  type ElementHighlight,
  PanelRegistry,
  PanelSkeletonRegistry,
  PanelMetadata,
  DynamicPanel,
  isValidPanelType,
  getPanelMetadata,
  getAvailablePanelTypes,
  type PanelType,
  type PanelConfig,
  type PanelProps,
  type DynamicPanelProps,
} from './panels';

// =============================================================================
// HISTORY COMPONENTS
// =============================================================================

export {
  HistoryDrawer,
  type HistoryDrawerProps,
  RecentPills,
  type RecentPillsProps,
  SearchHistory,
  type SearchHistoryProps,
  ConversationItem,
  type ConversationItemProps,
  type Conversation,
} from './history';

// =============================================================================
// HOOKS
// =============================================================================

export {
  useAdaptiveLayout,
  type LayoutState as HookLayoutState,
  type PanelType as HookPanelType,
  type Panel,
  type AdaptiveLayoutState,
  type UseAdaptiveLayoutOptions,
  type UseAdaptiveLayoutResult,
  usePanelOrchestrator,
  type ToolCall as OrchestratorToolCall,
  type ToolInvocation,
  type UsePanelOrchestratorOptions,
  type UsePanelOrchestratorResult,
  useContextualSuggestions,
  type SuggestionContext,
  type Suggestion as ContextualSuggestion,
  type UseContextualSuggestionsOptions,
  type UseContextualSuggestionsResult,
  useFloatingPanels,
  type Position,
  type Size,
  type FloatingPanelState,
  type FloatingPanelsState,
  type UseFloatingPanelsOptions,
  type UseFloatingPanelsResult,
} from './hooks';
