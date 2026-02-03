/**
 * Chat Workspace Layout Components
 *
 * Adaptive layout system for the Argus chat workspace redesign.
 * Supports three layout states:
 * - focused: Full-width chat
 * - split: Resizable chat + panel
 * - multi: Chat + tabbed panels
 */

export { WorkspaceLayout, type LayoutState, type WorkspaceLayoutProps } from './WorkspaceLayout';
export { PanelContainer, type PanelItem, type PanelContainerProps } from './PanelContainer';
export { FloatingPanel, type FloatingPanelProps } from './FloatingPanel';
export { ResizeDivider, type ResizeDividerProps } from './ResizeDivider';
