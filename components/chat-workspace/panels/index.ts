/**
 * Contextual Panel Components for Chat Workspace
 *
 * These panels display rich, contextual information alongside chat conversations.
 * Each panel is designed with the glass design system for visual consistency.
 *
 * Available Panels:
 * - TestResultsPanel: Live test execution with progress and failure details
 * - QualityReportPanel: Quality metrics with score gauge and recommendations
 * - VisualDiffPanel: Screenshot comparison with multiple view modes
 * - CodeViewerPanel: Syntax-highlighted code with line highlighting
 * - PipelinePanel: CI/CD pipeline status with stage diagram
 * - BrowserPreviewPanel: Live browser state with element highlights
 */

// Core Panel Components
export {
  TestResultsPanel,
  TestResultsSkeleton,
  type TestResultsPanelProps,
  type TestRun,
  type TestItem,
} from './TestResultsPanel';

export {
  QualityReportPanel,
  QualityReportSkeleton,
  type QualityReportPanelProps,
  type QualityMetrics,
} from './QualityReportPanel';

export {
  VisualDiffPanel,
  VisualDiffSkeleton,
  type VisualDiffPanelProps,
  type VisualComparison,
  type ViewMode,
} from './VisualDiffPanel';

export {
  CodeViewerPanel,
  CodeViewerSkeleton,
  type CodeViewerPanelProps,
} from './CodeViewerPanel';

export {
  PipelinePanel,
  PipelineSkeleton,
  type PipelinePanelProps,
  type Pipeline,
  type Stage,
  type StageStatus,
} from './PipelinePanel';

export {
  BrowserPreviewPanel,
  BrowserPreviewSkeleton,
  type BrowserPreviewPanelProps,
  type ElementHighlight,
} from './BrowserPreviewPanel';

// Panel Registry & Utilities
export {
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
} from './PanelRegistry';
