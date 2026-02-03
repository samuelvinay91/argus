/**
 * Chat Workspace Hooks
 *
 * Custom hooks for managing chat workspace state:
 * - useAdaptiveLayout: Layout state machine (focused/split/multi)
 * - usePanelOrchestrator: AI-driven panel spawning
 * - useContextualSuggestions: Smart suggestions based on conversation
 * - useFloatingPanels: Floating panel position management
 */

export {
  useAdaptiveLayout,
  type LayoutState,
  type PanelType,
  type Panel,
  type AdaptiveLayoutState,
  type UseAdaptiveLayoutOptions,
  type UseAdaptiveLayoutResult,
} from './useAdaptiveLayout';

export {
  usePanelOrchestrator,
  type ToolCall,
  type ToolInvocation,
  type UsePanelOrchestratorOptions,
  type UsePanelOrchestratorResult,
} from './usePanelOrchestrator';

export {
  useContextualSuggestions,
  type SuggestionContext,
  type Suggestion,
  type UseContextualSuggestionsOptions,
  type UseContextualSuggestionsResult,
} from './useContextualSuggestions';

export {
  useFloatingPanels,
  type Position,
  type Size,
  type FloatingPanelState,
  type FloatingPanelsState,
  type UseFloatingPanelsOptions,
  type UseFloatingPanelsResult,
} from './useFloatingPanels';
