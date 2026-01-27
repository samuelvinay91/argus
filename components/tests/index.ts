// Test-related Components
// Components for displaying and managing test results, screenshots, and execution

// Dialog components
export { SaveTestDialog } from './save-test-dialog';
export type { SaveTestDialogProps } from './save-test-dialog';

export { LiveExecutionModal } from './live-execution-modal';
export type { LiveExecutionModalProps } from './live-execution-modal';

// Screenshot components
export { ScreenshotGallery } from './ScreenshotGallery';
export type { Screenshot, ScreenshotGalleryProps } from './ScreenshotGallery';

export { ScreenshotLightbox } from './ScreenshotLightbox';
export type { ScreenshotLightboxProps } from './ScreenshotLightbox';

// Header and navigation
export { TestRunHeader } from './TestRunHeader';
export type { TestRunHeaderProps } from './TestRunHeader';

// Test result display components
export { TestResultCard } from './TestResultCard';
export type { TestResultCardProps } from './TestResultCard';

export { TestResultsGridView } from './TestResultsGridView';
export type { TestResultsGridViewProps } from './TestResultsGridView';

export { TestResultsListView } from './TestResultsListView';
export type { TestResultsListViewProps } from './TestResultsListView';

// View mode components
export { ViewModeToggle, useViewModePreference } from './ViewModeToggle';
export type { ViewMode, ViewModeToggleProps } from './ViewModeToggle';

// Timeline visualization
export { TestExecutionTimeline } from './TestExecutionTimeline';
export type { TestNode, TestStatus, TestExecutionTimelineProps } from './TestExecutionTimeline';

// Action components
export { TestRunActions } from './TestRunActions';
export type { TestRunActionsProps } from './TestRunActions';

// AI insights
export { AIInsightsPanel } from './AIInsightsPanel';
export type {
  AIInsightsPanelProps,
  InsightSeverity,
  InsightType,
  TestInsight,
} from './AIInsightsPanel';

// CI/CD context
export { CIContextPanel, CIContextBadges } from './CIContextPanel';
export type { CIContextPanelProps, CIContextBadgesProps } from './CIContextPanel';

// History sidebar
export { RunHistorySidebar } from './RunHistorySidebar';
export type { RunHistorySidebarProps } from './RunHistorySidebar';
