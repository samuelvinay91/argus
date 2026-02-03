/**
 * Input Components for Chat Workspace
 *
 * A collection of input-related components for the chat interface:
 * - CommandStrip: Main glassmorphic input bar with auto-resize
 * - ContextualChips: Smart suggestion chips that adapt to context
 * - SlashCommandMenu: Enhanced command palette with fuzzy search
 * - ModelBadge: Compact AI model selector
 */

// Main input component
export { CommandStrip, type CommandStripProps, type Suggestion } from './CommandStrip';

// Contextual suggestion chips
export {
  ContextualChips,
  CONTEXT_CHIPS,
  type ContextualChipsProps,
  type Chip,
  type ChipContext,
} from './ContextualChips';

// Slash command menu
export {
  SlashCommandMenu,
  COMMANDS,
  CATEGORY_INFO,
  type SlashCommandMenuProps,
  type SlashCommand,
  type CommandCategory,
} from './SlashCommandMenu';

// Model selector badge
export {
  ModelBadge,
  DEFAULT_MODELS,
  type ModelBadgeProps,
  type Model,
} from './ModelBadge';
