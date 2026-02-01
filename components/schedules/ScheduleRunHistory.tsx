'use client';

import { useState } from 'react';
import { safeFormatDistanceToNow, safeFormat } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Timer,
  Play,
  Ban,
  Brain,
  Sparkles,
  AlertTriangle,
  Wrench,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// AI Analysis types
interface AIAnalysis {
  category?: string;
  confidence?: number;
  summary?: string;
  suggested_fix?: string;
  is_flaky?: boolean;
  root_cause?: string;
  similar_failures?: string[];
  detailed_analysis?: string;
  auto_healable?: boolean;
}

interface HealingDetails {
  healed_at?: string;
  original_selector?: string;
  new_selector?: string;
  confidence?: number;
  healing_type?: string;
}

export interface ScheduleRun {
  id: string;
  schedule_id: string;
  test_run_id?: string;
  triggered_at: string;
  started_at?: string;
  completed_at?: string;
  status: 'pending' | 'queued' | 'running' | 'passed' | 'failed' | 'cancelled' | 'timeout';
  trigger_type: 'scheduled' | 'manual' | 'webhook' | 'api';
  triggered_by?: string;
  tests_total: number;
  tests_passed: number;
  tests_failed: number;
  tests_skipped: number;
  duration_ms?: number;
  error_message?: string;
  // AI Analysis fields
  ai_analysis?: AIAnalysis | null;
  is_flaky?: boolean;
  flaky_score?: number;
  failure_category?: string;
  failure_confidence?: number;
  // Auto-healing fields
  auto_healed?: boolean;
  healing_details?: HealingDetails | null;
}

interface ScheduleRunHistoryProps {
  runs: ScheduleRun[];
  isLoading?: boolean;
  onViewReport?: (runId: string) => void;
  maxRuns?: number;
}

function StatusIcon({ status }: { status: ScheduleRun['status'] }) {
  switch (status) {
    case 'passed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'pending':
    case 'queued':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'cancelled':
      return <Ban className="h-4 w-4 text-muted-foreground" />;
    case 'timeout':
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: ScheduleRun['status'] }) {
  const statusConfig: Record<ScheduleRun['status'], { label: string; className: string }> = {
    passed: { label: 'Passed', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
    failed: { label: 'Failed', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
    running: { label: 'Running', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    pending: { label: 'Pending', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    queued: { label: 'Queued', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-border' },
    timeout: { label: 'Timeout', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
      config.className
    )}>
      {config.label}
    </span>
  );
}

function TriggerBadge({ type }: { type: ScheduleRun['trigger_type'] }) {
  const config: Record<ScheduleRun['trigger_type'], { label: string; className: string }> = {
    scheduled: { label: 'Scheduled', className: 'bg-primary/10 text-primary' },
    manual: { label: 'Manual', className: 'bg-purple-500/10 text-purple-500' },
    webhook: { label: 'Webhook', className: 'bg-blue-500/10 text-blue-500' },
    api: { label: 'API', className: 'bg-orange-500/10 text-orange-500' },
  };

  const triggerConfig = config[type] || config.scheduled;

  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
      triggerConfig.className
    )}>
      {triggerConfig.label}
    </span>
  );
}

// AI Analysis Badges
function FlakyBadge({ score }: { score: number }) {
  const severity = score > 0.5 ? 'high' : score > 0.3 ? 'medium' : 'low';
  const config = {
    high: { label: 'Flaky', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20', desc: 'Frequently inconsistent' },
    medium: { label: 'Possibly Flaky', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', desc: 'Occasionally fails' },
    low: { label: 'Unstable', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20', desc: 'Some instability' },
  };
  const badgeConfig = config[severity];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border cursor-help',
        badgeConfig.className
      )}
      title={`Flaky Score: ${(score * 100).toFixed(0)}% — ${badgeConfig.desc}`}
    >
      <AlertTriangle className="h-3 w-3" />
      {badgeConfig.label}
    </span>
  );
}

function FailureCategoryBadge({ category, confidence }: { category: string; confidence?: number }) {
  // Normalize category to lowercase for matching
  const normalizedCategory = category.toLowerCase().replace(/_/g, '_');

  const categoryConfig: Record<string, { label: string; className: string; icon: typeof AlertCircle }> = {
    // New categories from API spec
    timing_issue: { label: 'Timing Issue', className: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20', icon: Clock },
    element_not_found: { label: 'Element Not Found', className: 'bg-red-500/10 text-red-500 border border-red-500/20', icon: Target },
    network_error: { label: 'Network Error', className: 'bg-orange-500/10 text-orange-500 border border-orange-500/20', icon: AlertCircle },
    assertion_failed: { label: 'Assertion Failed', className: 'bg-purple-500/10 text-purple-500 border border-purple-500/20', icon: XCircle },
    // Legacy categories for backwards compatibility
    network: { label: 'Network', className: 'bg-orange-500/10 text-orange-500 border border-orange-500/20', icon: AlertCircle },
    timeout: { label: 'Timeout', className: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20', icon: Clock },
    assertion: { label: 'Assertion', className: 'bg-purple-500/10 text-purple-500 border border-purple-500/20', icon: XCircle },
    authentication: { label: 'Auth', className: 'bg-amber-500/10 text-amber-500 border border-amber-500/20', icon: AlertCircle },
    data_dependency: { label: 'Data Issue', className: 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20', icon: AlertCircle },
    environment: { label: 'Environment', className: 'bg-green-500/10 text-green-500 border border-green-500/20', icon: AlertCircle },
    unknown: { label: 'Unknown', className: 'bg-muted text-muted-foreground border border-border', icon: AlertCircle },
  };

  const config = categoryConfig[normalizedCategory] || categoryConfig.unknown;
  const Icon = config.icon;
  const displayCategory = category.replace(/_/g, ' ');
  const tooltipText = confidence
    ? `${displayCategory} (${(confidence * 100).toFixed(0)}% confidence)`
    : displayCategory;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium cursor-help',
        config.className
      )}
      title={tooltipText}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function AutoHealedBadge({ details }: { details?: HealingDetails | null }) {
  const tooltipParts = ['This test was automatically fixed'];
  if (details?.healing_type) tooltipParts.push(`Type: ${details.healing_type}`);
  if (details?.confidence) tooltipParts.push(`Confidence: ${(details.confidence * 100).toFixed(0)}%`);

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-help"
      title={tooltipParts.join(' — ')}
    >
      <Wrench className="h-3 w-3" />
      Auto-Healed
    </span>
  );
}

function AutoHealableBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20 cursor-help"
      title="This failure can be automatically fixed by the self-healing system"
    >
      <Sparkles className="h-3 w-3" />
      Auto-Healable
    </span>
  );
}

// Confidence Progress Bar Component
function ConfidenceBar({ confidence, label }: { confidence: number; label?: string }) {
  const percentage = Math.round(confidence * 100);
  const colorClass = confidence >= 0.8 ? 'bg-green-500' : confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{percentage}%</span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// AI Analysis Section Component
function AIAnalysisSection({ run }: { run: ScheduleRun }) {
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const hasAIAnalysis = run.ai_analysis || run.failure_category || run.is_flaky;

  if (!hasAIAnalysis) return null;

  return (
    <div className="mt-3 border-t pt-3">
      {/* Header with badges */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-primary">AI Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          {run.ai_analysis?.auto_healable && <AutoHealableBadge />}
          {run.auto_healed && <AutoHealedBadge details={run.healing_details} />}
        </div>
      </div>

      {/* Confidence Bar */}
      {run.ai_analysis?.confidence && (
        <div className="mb-3">
          <ConfidenceBar confidence={run.ai_analysis.confidence} label="Analysis Confidence" />
        </div>
      )}

      {/* Summary - prominent display */}
      {run.ai_analysis?.summary && (
        <div className="mb-3">
          <div className="text-xs bg-muted/50 p-3 rounded-lg border border-border">
            <p className="text-sm font-medium">{run.ai_analysis.summary}</p>
          </div>
        </div>
      )}

      {/* Root Cause */}
      {run.ai_analysis?.root_cause && (
        <div className="mb-3">
          <div className="text-xs font-medium text-red-500 mb-1">Root Cause</div>
          <div className="text-xs bg-red-500/5 p-2 rounded border border-red-500/20">
            {run.ai_analysis.root_cause}
          </div>
        </div>
      )}

      {/* Suggested Fix - callout style */}
      {run.ai_analysis?.suggested_fix && (
        <div className="mb-3">
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-500 mb-1">
            <Sparkles className="h-3 w-3" />
            Suggested Fix
          </div>
          <div className="text-xs bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/20">
            <code className="text-emerald-700 dark:text-emerald-300 block whitespace-pre-wrap font-mono text-xs">
              {run.ai_analysis.suggested_fix}
            </code>
          </div>
        </div>
      )}

      {/* Detailed Analysis - expandable */}
      {run.ai_analysis?.detailed_analysis && (
        <div className="mb-3">
          <button
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-1"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetailedAnalysis(!showDetailedAnalysis);
            }}
          >
            {showDetailedAnalysis ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Detailed Analysis
          </button>
          {showDetailedAnalysis && (
            <div className="text-xs bg-muted/30 p-2 rounded border border-border mt-1 whitespace-pre-wrap">
              {run.ai_analysis.detailed_analysis}
            </div>
          )}
        </div>
      )}

      {/* Similar Failures */}
      {run.ai_analysis?.similar_failures && run.ai_analysis.similar_failures.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Similar Past Failures
          </div>
          <ul className="text-xs text-muted-foreground list-disc list-inside">
            {run.ai_analysis.similar_failures.slice(0, 3).map((failure, i) => (
              <li key={i} className="truncate">{failure}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Auto-Healing Details */}
      {run.auto_healed && run.healing_details && (
        <div className="mb-3">
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-500 mb-1">
            <Wrench className="h-3 w-3" />
            Auto-Healing Applied
          </div>
          <div className="text-xs bg-emerald-500/5 p-2 rounded border border-emerald-500/20 space-y-1">
            {run.healing_details.healing_type && (
              <p><span className="text-muted-foreground">Type:</span> {run.healing_details.healing_type}</p>
            )}
            {run.healing_details.original_selector && (
              <p><span className="text-muted-foreground">Original:</span> <code className="bg-muted px-1 rounded">{run.healing_details.original_selector}</code></p>
            )}
            {run.healing_details.new_selector && (
              <p><span className="text-muted-foreground">Fixed:</span> <code className="bg-emerald-500/10 px-1 rounded">{run.healing_details.new_selector}</code></p>
            )}
          </div>
        </div>
      )}

      {/* Flaky Details */}
      {run.is_flaky && run.flaky_score && run.flaky_score > 0 && (
        <div className="flex items-center gap-2 p-2 bg-orange-500/5 rounded border border-orange-500/20">
          <TrendingUp className="h-4 w-4 text-orange-500" />
          <div className="text-xs">
            <span className="font-medium text-orange-500">Flaky Test Detected</span>
            <span className="text-muted-foreground ml-2">
              Score: {(run.flaky_score * 100).toFixed(0)}% — This test has inconsistent pass/fail patterns
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

function RunRow({
  run,
  onViewReport,
}: {
  run: ScheduleRun;
  onViewReport?: (runId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasDetails = run.error_message || run.tests_total > 0 || run.ai_analysis || run.is_flaky || run.failure_category;
  const hasAIInsights = !!(run.ai_analysis || run.is_flaky || run.failure_category || run.auto_healed);

  return (
    <div className="border-b last:border-0">
      {/* Main Row */}
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 transition-colors',
          hasDetails && 'cursor-pointer hover:bg-muted/50'
        )}
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
      >
        {/* Expand Icon */}
        <div className="w-4 flex-shrink-0">
          {hasDetails && (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          )}
        </div>

        {/* Status */}
        <StatusIcon status={run.status} />

        {/* Time */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">
              {safeFormat(run.triggered_at, 'MMM d, HH:mm')}
            </span>
            <TriggerBadge type={run.trigger_type} />
            {/* AI Badges */}
            {run.is_flaky && run.flaky_score && run.flaky_score > 0.1 && (
              <FlakyBadge score={run.flaky_score} />
            )}
            {run.failure_category && (
              <FailureCategoryBadge
                category={run.failure_category}
                confidence={run.failure_confidence}
              />
            )}
            {run.ai_analysis?.auto_healable && !run.auto_healed && (
              <AutoHealableBadge />
            )}
            {run.auto_healed && (
              <AutoHealedBadge details={run.healing_details} />
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {safeFormatDistanceToNow(run.triggered_at, { addSuffix: true })}
            {hasAIInsights && (
              <span className="ml-2 text-primary">
                <Brain className="h-3 w-3 inline-block mr-0.5" />
                AI insights available
              </span>
            )}
          </div>
        </div>

        {/* Test Results */}
        {run.tests_total > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-green-500 font-medium">{run.tests_passed} passed</span>
            {run.tests_failed > 0 && (
              <span className="text-red-500 font-medium">{run.tests_failed} failed</span>
            )}
            {run.tests_skipped > 0 && (
              <span className="text-muted-foreground">{run.tests_skipped} skipped</span>
            )}
          </div>
        )}

        {/* Duration */}
        {run.duration_ms && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Timer className="h-3 w-3" />
            {formatDuration(run.duration_ms)}
          </div>
        )}

        {/* Status Badge */}
        <StatusBadge status={run.status} />

        {/* View Report Button */}
        {run.test_run_id && onViewReport && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onViewReport(run.test_run_id!);
            }}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Report
          </Button>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && hasDetails && (
        <div className="px-3 py-2 ml-7 border-t bg-muted/30">
          {/* Error Message */}
          {run.error_message && (
            <div className="mb-2">
              <div className="text-xs font-medium text-red-500 mb-1">Error</div>
              <div className="text-xs text-muted-foreground bg-red-500/5 p-2 rounded border border-red-500/20">
                {run.error_message}
              </div>
            </div>
          )}

          {/* Timing Details */}
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-muted-foreground">Triggered</div>
              <div className="font-medium">
                {safeFormat(run.triggered_at, 'MMM d, yyyy HH:mm:ss')}
              </div>
            </div>
            {run.started_at && (
              <div>
                <div className="text-muted-foreground">Started</div>
                <div className="font-medium">
                  {safeFormat(run.started_at, 'MMM d, yyyy HH:mm:ss')}
                </div>
              </div>
            )}
            {run.completed_at && (
              <div>
                <div className="text-muted-foreground">Completed</div>
                <div className="font-medium">
                  {safeFormat(run.completed_at, 'MMM d, yyyy HH:mm:ss')}
                </div>
              </div>
            )}
          </div>

          {/* Triggered By */}
          {run.triggered_by && (
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">Triggered by: </span>
              <span className="font-medium">{run.triggered_by}</span>
            </div>
          )}

          {/* AI Analysis Section */}
          <AIAnalysisSection run={run} />
        </div>
      )}
    </div>
  );
}

export function ScheduleRunHistory({
  runs,
  isLoading,
  onViewReport,
  maxRuns = 10,
}: ScheduleRunHistoryProps) {
  const [showAll, setShowAll] = useState(false);

  const displayedRuns = showAll ? runs : runs.slice(0, maxRuns);
  const hasMore = runs.length > maxRuns;

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h4 className="text-sm font-semibold">Run History</h4>
        </div>
        <div className="p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading history...</p>
        </div>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h4 className="text-sm font-semibold">Run History</h4>
        </div>
        <div className="p-8 text-center">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No runs yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            This schedule has not been executed yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b flex items-center justify-between">
        <h4 className="text-sm font-semibold">Run History</h4>
        <span className="text-xs text-muted-foreground">{runs.length} runs</span>
      </div>

      <div className="divide-y">
        {displayedRuns.map((run) => (
          <RunRow key={run.id} run={run} onViewReport={onViewReport} />
        ))}
      </div>

      {hasMore && (
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Less' : `Show ${runs.length - maxRuns} More`}
          </Button>
        </div>
      )}
    </div>
  );
}
