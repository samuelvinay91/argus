'use client';

/**
 * PanelRegistry - Central registry mapping panel types to components
 *
 * This registry enables dynamic panel rendering based on panel type strings.
 * Used by the chat workspace to render contextual panels alongside conversations.
 */

import * as React from 'react';
import { memo, Suspense } from 'react';
import dynamic from 'next/dynamic';

import { TestResultsPanel, TestResultsSkeleton, type TestResultsPanelProps } from './TestResultsPanel';
import { QualityReportPanel, QualityReportSkeleton, type QualityReportPanelProps } from './QualityReportPanel';
import { VisualDiffPanel, VisualDiffSkeleton, type VisualDiffPanelProps } from './VisualDiffPanel';
import { CodeViewerPanel, CodeViewerSkeleton, type CodeViewerPanelProps } from './CodeViewerPanel';
import { PipelinePanel, PipelineSkeleton, type PipelinePanelProps } from './PipelinePanel';
import { BrowserPreviewPanel, BrowserPreviewSkeleton, type BrowserPreviewPanelProps } from './BrowserPreviewPanel';

// =============================================================================
// TYPES
// =============================================================================

export type PanelType =
  | 'test-results'
  | 'quality-report'
  | 'visual-diff'
  | 'code-viewer'
  | 'pipeline-status'
  | 'browser-preview';

export interface PanelConfig {
  type: PanelType;
  props: PanelProps;
}

export type PanelProps =
  | ({ type: 'test-results' } & Omit<TestResultsPanelProps, 'className'>)
  | ({ type: 'quality-report' } & Omit<QualityReportPanelProps, 'className'>)
  | ({ type: 'visual-diff' } & Omit<VisualDiffPanelProps, 'className'>)
  | ({ type: 'code-viewer' } & Omit<CodeViewerPanelProps, 'className'>)
  | ({ type: 'pipeline-status' } & Omit<PipelinePanelProps, 'className'>)
  | ({ type: 'browser-preview' } & Omit<BrowserPreviewPanelProps, 'className'>);

// =============================================================================
// PANEL REGISTRY
// =============================================================================

/**
 * Registry of panel components keyed by panel type
 */
export const PanelRegistry = {
  'test-results': TestResultsPanel,
  'quality-report': QualityReportPanel,
  'visual-diff': VisualDiffPanel,
  'code-viewer': CodeViewerPanel,
  'pipeline-status': PipelinePanel,
  'browser-preview': BrowserPreviewPanel,
} as const;

/**
 * Registry of loading skeletons keyed by panel type
 */
export const PanelSkeletonRegistry = {
  'test-results': TestResultsSkeleton,
  'quality-report': QualityReportSkeleton,
  'visual-diff': VisualDiffSkeleton,
  'code-viewer': CodeViewerSkeleton,
  'pipeline-status': PipelineSkeleton,
  'browser-preview': BrowserPreviewSkeleton,
} as const;

/**
 * Panel metadata for UI display
 */
export const PanelMetadata: Record<PanelType, { title: string; description: string }> = {
  'test-results': {
    title: 'Test Results',
    description: 'Live test execution progress and results',
  },
  'quality-report': {
    title: 'Quality Report',
    description: 'Quality metrics and recommendations',
  },
  'visual-diff': {
    title: 'Visual Comparison',
    description: 'Screenshot comparison and diff analysis',
  },
  'code-viewer': {
    title: 'Code Viewer',
    description: 'Syntax-highlighted code display',
  },
  'pipeline-status': {
    title: 'Pipeline Status',
    description: 'CI/CD pipeline execution status',
  },
  'browser-preview': {
    title: 'Browser Preview',
    description: 'Live browser state preview',
  },
};

// =============================================================================
// DYNAMIC PANEL RENDERER
// =============================================================================

export interface DynamicPanelProps {
  panelType: PanelType;
  panelProps: Record<string, unknown>;
  className?: string;
}

/**
 * DynamicPanel - Renders a panel based on type with automatic suspense handling
 */
export const DynamicPanel = memo(function DynamicPanel({
  panelType,
  panelProps,
  className,
}: DynamicPanelProps) {
  const Panel = PanelRegistry[panelType];
  const Skeleton = PanelSkeletonRegistry[panelType];

  if (!Panel) {
    console.warn(`Unknown panel type: ${panelType}`);
    return null;
  }

  // Cast Panel to React component type that accepts the props
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PanelComponent = Panel as React.ComponentType<any>;

  return (
    <Suspense fallback={Skeleton ? <Skeleton /> : <DefaultSkeleton />}>
      <PanelComponent {...panelProps} className={className} />
    </Suspense>
  );
});

/**
 * Default skeleton for panels without a custom skeleton
 */
const DefaultSkeleton = memo(function DefaultSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-4 w-1/3 bg-white/10 rounded" />
      <div className="h-32 bg-white/5 rounded-lg" />
      <div className="h-4 w-2/3 bg-white/10 rounded" />
    </div>
  );
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a panel type is valid
 */
export function isValidPanelType(type: string): type is PanelType {
  return type in PanelRegistry;
}

/**
 * Get panel metadata
 */
export function getPanelMetadata(type: PanelType) {
  return PanelMetadata[type];
}

/**
 * Get all available panel types
 */
export function getAvailablePanelTypes(): PanelType[] {
  return Object.keys(PanelRegistry) as PanelType[];
}
