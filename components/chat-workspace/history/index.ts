/**
 * History Components for Chat Workspace
 *
 * Components for managing conversation history:
 * - HistoryDrawer: Glassmorphic slide-out drawer for browsing history
 * - RecentPills: Quick access pills for recent conversations
 * - SearchHistory: Search input for filtering conversations
 * - ConversationItem: Individual conversation list item
 */

export { HistoryDrawer, type HistoryDrawerProps } from './HistoryDrawer';
export { RecentPills, type RecentPillsProps } from './RecentPills';
export { SearchHistory, type SearchHistoryProps } from './SearchHistory';
export {
  ConversationItem,
  type ConversationItemProps,
  type Conversation,
} from './ConversationItem';
