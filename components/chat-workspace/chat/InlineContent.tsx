/**
 * InlineContent - Rich inline content renderer
 *
 * Features:
 * - Detects content type (test results, quality score, code, etc.)
 * - Renders appropriate mini-card
 * - Click to expand to panel
 * - Multiple content type support
 */

'use client';

import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TestTube,
  BarChart3,
  Code2,
  Diff,
  GitBranch,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../glass';

// =============================================================================
// TYPES
// =============================================================================

export type InlineContentType =
  | 'test-results'
  | 'quality-score'
  | 'code'
  | 'visual-diff'
  | 'pipeline'
  | 'api-response'
  | 'coverage';

export interface TestResultsData {
  total: number;
  passed: number;
  failed: number;
  skipped?: number;
  duration?: number;
}

export interface QualityScoreData {
  score: number;
  trend?: 'up' | 'down' | 'stable';
  previousScore?: number;
  breakdown?: Record<string, number>;
}

export interface CodeData {
  language: string;
  filename?: string;
  lines?: number;
  preview?: string;
}

export interface VisualDiffData {
  baseline?: string;
  current?: string;
  diffPercentage?: number;
  status: 'match' | 'mismatch' | 'new';
}

export interface PipelineData {
  name: string;
  status: 'running' | 'passed' | 'failed' | 'pending';
  branch?: string;
  duration?: number;
}

export interface ApiResponseData {
  status: number;
  method: string;
  url: string;
  responseTime?: number;
}

export interface CoverageData {
  percentage: number;
  lines?: { covered: number; total: number };
  branches?: { covered: number; total: number };
}

export type InlineContentData =
  | TestResultsData
  | QualityScoreData
  | CodeData
  | VisualDiffData
  | PipelineData
  | ApiResponseData
  | CoverageData;

export interface InlineContentProps {
  /** Type of content to render */
  type: InlineContentType;
  /** Data for the content */
  data: InlineContentData;
  /** Callback when expand is triggered */
  onExpand: () => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getStatusColor(status: string): string {
  switch (status) {
    case 'passed':
    case 'match':
      return 'text-green-500';
    case 'failed':
    case 'mismatch':
      return 'text-red-500';
    case 'running':
      return 'text-blue-500';
    case 'pending':
    case 'new':
      return 'text-amber-500';
    default:
      return 'text-muted-foreground';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'passed':
    case 'match':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'failed':
    case 'mismatch':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'running':
      return <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Sparkles className="w-4 h-4 text-blue-500" /></motion.div>;
    case 'pending':
    case 'new':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    default:
      return null;
  }
}

// =============================================================================
// TEST RESULTS CARD
// =============================================================================

interface TestResultsCardProps {
  data: TestResultsData;
  onExpand: () => void;
}

const TestResultsCard = memo(function TestResultsCard({ data, onExpand }: TestResultsCardProps) {
  const passRate = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;
  const hasFailed = data.failed > 0;

  return (
    <GlassCard
      variant="subtle"
      padding="sm"
      hoverable
      onClick={onExpand}
      className={cn('cursor-pointer group', hasFailed && 'border-red-500/30')}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            hasFailed ? 'bg-red-500/10' : 'bg-green-500/10'
          )}
        >
          <TestTube className={cn('w-5 h-5', hasFailed ? 'text-red-500' : 'text-green-500')} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Test Results</span>
            <span className={cn('text-xs', hasFailed ? 'text-red-500' : 'text-green-500')}>
              {passRate}% passed
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="text-green-500">{data.passed} passed</span>
            {data.failed > 0 && <span className="text-red-500">{data.failed} failed</span>}
            {data.skipped && data.skipped > 0 && (
              <span className="text-amber-500">{data.skipped} skipped</span>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </GlassCard>
  );
});

// =============================================================================
// QUALITY SCORE CARD
// =============================================================================

interface QualityScoreCardProps {
  data: QualityScoreData;
  onExpand: () => void;
}

const QualityScoreCard = memo(function QualityScoreCard({ data, onExpand }: QualityScoreCardProps) {
  const scoreColor =
    data.score >= 80 ? 'text-green-500' : data.score >= 60 ? 'text-amber-500' : 'text-red-500';

  return (
    <GlassCard variant="subtle" padding="sm" hoverable onClick={onExpand} className="cursor-pointer group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Quality Score</span>
            <span className={cn('text-lg font-bold', scoreColor)}>{data.score}</span>
            {data.trend && (
              <span className={cn('flex items-center', data.trend === 'up' ? 'text-green-500' : data.trend === 'down' ? 'text-red-500' : 'text-muted-foreground')}>
                {data.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {data.trend === 'down' && <TrendingDown className="w-3 h-3" />}
              </span>
            )}
          </div>
          {data.previousScore !== undefined && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Previous: {data.previousScore}
            </div>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </GlassCard>
  );
});

// =============================================================================
// CODE CARD
// =============================================================================

interface CodeCardProps {
  data: CodeData;
  onExpand: () => void;
}

const CodeCard = memo(function CodeCard({ data, onExpand }: CodeCardProps) {
  return (
    <GlassCard variant="subtle" padding="sm" hoverable onClick={onExpand} className="cursor-pointer group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
          <Code2 className="w-5 h-5 text-violet-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{data.filename || 'Code Snippet'}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground font-mono">
              {data.language}
            </span>
          </div>
          {data.preview && (
            <div className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
              {data.preview}
            </div>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </GlassCard>
  );
});

// =============================================================================
// VISUAL DIFF CARD
// =============================================================================

interface VisualDiffCardProps {
  data: VisualDiffData;
  onExpand: () => void;
}

const VisualDiffCard = memo(function VisualDiffCard({ data, onExpand }: VisualDiffCardProps) {
  return (
    <GlassCard
      variant="subtle"
      padding="sm"
      hoverable
      onClick={onExpand}
      className={cn('cursor-pointer group', data.status === 'mismatch' && 'border-red-500/30')}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            data.status === 'match'
              ? 'bg-green-500/10'
              : data.status === 'mismatch'
                ? 'bg-red-500/10'
                : 'bg-amber-500/10'
          )}
        >
          <Diff
            className={cn(
              'w-5 h-5',
              data.status === 'match'
                ? 'text-green-500'
                : data.status === 'mismatch'
                  ? 'text-red-500'
                  : 'text-amber-500'
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Visual Comparison</span>
            {getStatusIcon(data.status)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {data.status === 'match' && 'No visual changes detected'}
            {data.status === 'mismatch' &&
              `${data.diffPercentage?.toFixed(1) || '?'}% difference`}
            {data.status === 'new' && 'New baseline captured'}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </GlassCard>
  );
});

// =============================================================================
// PIPELINE CARD
// =============================================================================

interface PipelineCardProps {
  data: PipelineData;
  onExpand: () => void;
}

const PipelineCard = memo(function PipelineCard({ data, onExpand }: PipelineCardProps) {
  return (
    <GlassCard
      variant="subtle"
      padding="sm"
      hoverable
      onClick={onExpand}
      className={cn('cursor-pointer group', data.status === 'failed' && 'border-red-500/30')}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            data.status === 'passed'
              ? 'bg-green-500/10'
              : data.status === 'failed'
                ? 'bg-red-500/10'
                : data.status === 'running'
                  ? 'bg-blue-500/10'
                  : 'bg-amber-500/10'
          )}
        >
          <GitBranch className={cn('w-5 h-5', getStatusColor(data.status))} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{data.name}</span>
            {getStatusIcon(data.status)}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            {data.branch && <span>{data.branch}</span>}
            {data.duration !== undefined && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {Math.round(data.duration / 1000)}s
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </GlassCard>
  );
});

// =============================================================================
// COVERAGE CARD
// =============================================================================

interface CoverageCardProps {
  data: CoverageData;
  onExpand: () => void;
}

const CoverageCard = memo(function CoverageCard({ data, onExpand }: CoverageCardProps) {
  const coverageColor =
    data.percentage >= 80
      ? 'text-green-500'
      : data.percentage >= 60
        ? 'text-amber-500'
        : 'text-red-500';

  return (
    <GlassCard variant="subtle" padding="sm" hoverable onClick={onExpand} className="cursor-pointer group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-cyan-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Code Coverage</span>
            <span className={cn('text-lg font-bold', coverageColor)}>{data.percentage}%</span>
          </div>
          {data.lines && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {data.lines.covered}/{data.lines.total} lines covered
            </div>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </GlassCard>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const InlineContent = memo(function InlineContent({
  type,
  data,
  onExpand,
  className,
}: InlineContentProps) {
  const handleExpand = useCallback(() => {
    onExpand();
  }, [onExpand]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('my-2', className)}
    >
      {type === 'test-results' && (
        <TestResultsCard data={data as TestResultsData} onExpand={handleExpand} />
      )}
      {type === 'quality-score' && (
        <QualityScoreCard data={data as QualityScoreData} onExpand={handleExpand} />
      )}
      {type === 'code' && <CodeCard data={data as CodeData} onExpand={handleExpand} />}
      {type === 'visual-diff' && (
        <VisualDiffCard data={data as VisualDiffData} onExpand={handleExpand} />
      )}
      {type === 'pipeline' && <PipelineCard data={data as PipelineData} onExpand={handleExpand} />}
      {type === 'coverage' && <CoverageCard data={data as CoverageData} onExpand={handleExpand} />}
    </motion.div>
  );
});

export default InlineContent;
