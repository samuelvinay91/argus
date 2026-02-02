/**
 * ResultDisplay - Smart result renderer for tool outputs
 *
 * Dispatches to appropriate card component based on result structure.
 */

'use client';

import { memo, useMemo } from 'react';
import {
  QualityReportCard,
  ScheduleCard,
  ScheduleListCard,
  ReportSummaryCard,
  InfraStatusCard,
  TestListCard,
  TestRunsCard,
  WebSearchCard,
  CodeSearchCard,
  VisualComparisonCard,
  TestExportCard,
  ExportFormatsCard,
  KnowledgeGraphCard,
} from '../responses';
import { ScreenshotGallery } from './ScreenshotGallery';

// =============================================================================
// TYPES
// =============================================================================

export interface ResultDisplayProps {
  result: unknown;
  onAction?: (action: string, data: unknown) => void;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function hasProperty<K extends string>(obj: object, key: K): obj is Record<K, unknown> {
  return key in obj;
}

// =============================================================================
// RESULT TYPE DETECTION
// =============================================================================

function detectResultType(data: unknown): string | null {
  if (!isObject(data)) return null;

  // Use simple 'in' checks to avoid type narrowing issues
  const obj = data as Record<string, unknown>;

  // Quality report
  if ('accessibility' in obj && 'performance' in obj) {
    return 'quality_report';
  }

  // Schedule
  if ('schedule_id' in obj && 'cron_expression' in obj) {
    return 'schedule';
  }

  // Schedule list
  if ('schedules' in obj && Array.isArray(obj.schedules)) {
    return 'schedule_list';
  }

  // Report summary
  if ('period' in obj && 'total_runs' in obj) {
    return 'report_summary';
  }

  // Infra status
  if ('browser_pool' in obj || 'components' in obj) {
    return 'infra_status';
  }

  // Test list
  if ('tests' in obj && Array.isArray(obj.tests)) {
    return 'test_list';
  }

  // Test runs
  if ('runs' in obj && Array.isArray(obj.runs)) {
    return 'test_runs';
  }

  // Web search
  if ('answer' in obj && 'results' in obj) {
    return 'web_search';
  }

  // Code search
  if ('matches' in obj && Array.isArray(obj.matches)) {
    return 'code_search';
  }

  // Visual comparison
  if ('baseline' in obj && 'current' in obj) {
    return 'visual_comparison';
  }

  // Test export
  if ('export_format' in obj && 'code' in obj) {
    return 'test_export';
  }

  // Export formats
  if ('formats' in obj && Array.isArray(obj.formats)) {
    return 'export_formats';
  }

  // Knowledge graph
  if ('nodes' in obj && 'edges' in obj) {
    return 'knowledge_graph';
  }

  // Test with steps (generic test result)
  if ('steps' in obj && Array.isArray(obj.steps)) {
    return 'test_result';
  }

  return null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ResultDisplay = memo(function ResultDisplay({
  result,
  onAction,
}: ResultDisplayProps) {
  const { resultType, data, screenshots, artifactRefs } = useMemo(() => {
    if (!isObject(result)) {
      return { resultType: null, data: result, screenshots: [], artifactRefs: [] };
    }

    const type = detectResultType(result);
    const screenshotArray: string[] = [];
    const refs: Array<{ artifact_id: string; type: string; storage: string; url?: string }> = [];

    // Extract screenshots
    if (hasProperty(result, 'screenshot') && typeof result.screenshot === 'string') {
      screenshotArray.push(result.screenshot);
    }
    if (hasProperty(result, 'screenshots') && Array.isArray(result.screenshots)) {
      screenshotArray.push(...result.screenshots.filter((s): s is string => typeof s === 'string'));
    }

    // Extract artifact refs
    if (hasProperty(result, 'artifact_refs') && Array.isArray(result.artifact_refs)) {
      refs.push(...result.artifact_refs as typeof refs);
    }

    return { resultType: type, data: result, screenshots: screenshotArray, artifactRefs: refs };
  }, [result]);

  // Render based on result type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedData = data as any;

  switch (resultType) {
    case 'quality_report':
      return <QualityReportCard data={typedData} />;

    case 'schedule':
      return <ScheduleCard data={typedData} />;

    case 'schedule_list':
      return <ScheduleListCard data={typedData} />;

    case 'report_summary':
      return <ReportSummaryCard data={typedData} />;

    case 'infra_status':
      return <InfraStatusCard data={typedData} />;

    case 'test_list':
      return <TestListCard data={typedData} onAction={onAction} />;

    case 'test_runs':
      return <TestRunsCard data={typedData} />;

    case 'web_search':
      return <WebSearchCard data={typedData} onAction={onAction} />;

    case 'code_search':
      return <CodeSearchCard data={typedData} onAction={onAction} />;

    case 'visual_comparison':
      return <VisualComparisonCard data={typedData} />;

    case 'test_export':
      return <TestExportCard data={typedData} />;

    case 'export_formats':
      return <ExportFormatsCard data={typedData} onAction={onAction} />;

    case 'knowledge_graph':
      return <KnowledgeGraphCard data={typedData} />;

    case 'test_result':
      return (
        <div className="space-y-2">
          <TestStepsDisplay data={typedData} />
          {screenshots.length > 0 && (
            <ScreenshotGallery
              screenshots={screenshots}
              label="Test Screenshots"
              artifactRefs={artifactRefs}
            />
          )}
        </div>
      );

    default:
      // Default JSON display with screenshots
      return (
        <div className="min-w-0 max-w-full overflow-hidden">
          <pre className="text-xs bg-background rounded p-2 overflow-x-auto max-h-40 max-w-full whitespace-pre-wrap break-all">
            {JSON.stringify(result, null, 2)}
          </pre>
          {screenshots.length > 0 && (
            <ScreenshotGallery screenshots={screenshots} artifactRefs={artifactRefs} />
          )}
        </div>
      );
  }
});

// =============================================================================
// TEST STEPS DISPLAY
// =============================================================================

interface TestStepsDisplayProps {
  data: Record<string, unknown>;
}

const TestStepsDisplay = memo(function TestStepsDisplay({ data }: TestStepsDisplayProps) {
  const steps = data.steps as Array<{
    action?: string;
    success?: boolean;
    error?: string;
    screenshot?: string;
  }>;

  return (
    <div className="space-y-1">
      {steps.map((step, index) => (
        <div
          key={index}
          className={`flex items-start gap-2 text-xs p-1.5 rounded ${
            step.success ? 'bg-green-500/10' : 'bg-red-500/10'
          }`}
        >
          <span className={step.success ? 'text-green-500' : 'text-red-500'}>
            {step.success ? '✓' : '✗'}
          </span>
          <span className="flex-1">{step.action || `Step ${index + 1}`}</span>
          {step.error && (
            <span className="text-red-400 text-[10px] truncate max-w-[150px]">
              {step.error}
            </span>
          )}
        </div>
      ))}
    </div>
  );
});

export default ResultDisplay;
