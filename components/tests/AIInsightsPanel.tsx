'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Sparkles,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  Target,
  Zap,
  Eye,
  Wrench,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  XCircle,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import type { TestResult, TestRun } from '@/lib/supabase/types';

// ============================================
// Type Definitions
// ============================================

export type InsightSeverity = 'high' | 'medium' | 'low';

export type InsightType =
  | 'repeated_failure'
  | 'flaky_test'
  | 'selector_issue'
  | 'performance_regression'
  | 'timeout_pattern'
  | 'error_cluster'
  | 'coverage_gap';

export interface TestInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  affectedTests: string[];
  pattern?: string;
  occurrenceCount: number;
  recommendation: string;
  actionable: boolean;
  metadata?: Record<string, unknown>;
}

export interface AIInsightsPanelProps {
  testResults: TestResult[];
  testRuns?: TestRun[];
  className?: string;
  isLoading?: boolean;
  onViewPattern?: (insight: TestInsight) => void;
  onAutoHeal?: (insight: TestInsight) => void;
  onDismiss?: (insightId: string) => void;
  maxInsights?: number;
}

// ============================================
// Insight Analysis Functions
// ============================================

/**
 * Analyzes error messages for common patterns
 */
function parseErrorPatterns(errorMessage: string | null): {
  isSelectorIssue: boolean;
  isTimeout: boolean;
  isNotFound: boolean;
  isNetworkError: boolean;
  isAssertionError: boolean;
} {
  if (!errorMessage) {
    return {
      isSelectorIssue: false,
      isTimeout: false,
      isNotFound: false,
      isNetworkError: false,
      isAssertionError: false,
    };
  }

  const lowerError = errorMessage.toLowerCase();

  return {
    isSelectorIssue:
      lowerError.includes('selector') ||
      lowerError.includes('locator') ||
      lowerError.includes('element') ||
      lowerError.includes('xpath') ||
      lowerError.includes('css selector'),
    isTimeout:
      lowerError.includes('timeout') ||
      lowerError.includes('timed out') ||
      lowerError.includes('exceeded'),
    isNotFound:
      lowerError.includes('not found') ||
      lowerError.includes('could not find') ||
      lowerError.includes('unable to locate') ||
      lowerError.includes('no such element'),
    isNetworkError:
      lowerError.includes('network') ||
      lowerError.includes('fetch') ||
      lowerError.includes('connection') ||
      lowerError.includes('econnrefused'),
    isAssertionError:
      lowerError.includes('assertion') ||
      lowerError.includes('expect') ||
      lowerError.includes('assert') ||
      lowerError.includes('should'),
  };
}

/**
 * Groups test results by test name for failure analysis
 */
function groupResultsByTest(
  results: TestResult[]
): Map<string, TestResult[]> {
  const groups = new Map<string, TestResult[]>();

  for (const result of results) {
    const key = result.test_id || result.name;
    const existing = groups.get(key) || [];
    existing.push(result);
    groups.set(key, existing);
  }

  return groups;
}

/**
 * Detects flaky tests (tests that pass and fail inconsistently)
 */
function detectFlakyTests(
  groupedResults: Map<string, TestResult[]>
): TestInsight[] {
  const insights: TestInsight[] = [];

  groupedResults.forEach((results, testKey) => {
    if (results.length < 3) return; // Need at least 3 runs to detect flakiness

    const passCount = results.filter((r) => r.status === 'passed').length;
    const failCount = results.filter((r) => r.status === 'failed').length;

    // Flaky if both pass and fail at least 20% of the time
    const passRate = passCount / results.length;
    const failRate = failCount / results.length;

    if (passRate >= 0.2 && failRate >= 0.2) {
      const testName = results[0]?.name || testKey;
      const severity: InsightSeverity =
        failRate > 0.5 ? 'high' : failRate > 0.3 ? 'medium' : 'low';

      insights.push({
        id: `flaky-${testKey}`,
        type: 'flaky_test',
        severity,
        title: 'Flaky Test Detected',
        description: `"${testName}" has inconsistent results: ${Math.round(passRate * 100)}% pass rate over ${results.length} runs`,
        affectedTests: [testName],
        occurrenceCount: results.length,
        recommendation: 'Review test for race conditions, timing issues, or environmental dependencies. Consider adding retry logic or stabilizing the test setup.',
        actionable: true,
        metadata: { passRate, failRate, totalRuns: results.length },
      });
    }
  });

  return insights;
}

/**
 * Detects repeated failures of the same test
 */
function detectRepeatedFailures(
  groupedResults: Map<string, TestResult[]>
): TestInsight[] {
  const insights: TestInsight[] = [];

  groupedResults.forEach((results, testKey) => {
    // Sort by date descending
    const sortedResults = [...results].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Count consecutive failures from most recent
    let consecutiveFailures = 0;
    for (const result of sortedResults) {
      if (result.status === 'failed') {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    if (consecutiveFailures >= 3) {
      const testName = results[0]?.name || testKey;
      const latestError = sortedResults[0]?.error_message;
      const severity: InsightSeverity =
        consecutiveFailures >= 5 ? 'high' : consecutiveFailures >= 3 ? 'medium' : 'low';

      insights.push({
        id: `repeated-${testKey}`,
        type: 'repeated_failure',
        severity,
        title: 'Repeated Test Failure',
        description: `"${testName}" has failed ${consecutiveFailures} times in a row`,
        affectedTests: [testName],
        pattern: latestError || undefined,
        occurrenceCount: consecutiveFailures,
        recommendation: 'This test requires immediate attention. Review the error pattern and check for recent code changes that may have caused the regression.',
        actionable: true,
        metadata: { consecutiveFailures, latestError },
      });
    }
  });

  return insights;
}

/**
 * Detects selector-related issues
 */
function detectSelectorIssues(results: TestResult[]): TestInsight[] {
  const insights: TestInsight[] = [];
  const selectorErrors: Map<string, TestResult[]> = new Map();

  for (const result of results) {
    if (result.status !== 'failed') continue;

    const patterns = parseErrorPatterns(result.error_message);
    if (patterns.isSelectorIssue || patterns.isNotFound) {
      const key = result.test_id || result.name;
      const existing = selectorErrors.get(key) || [];
      existing.push(result);
      selectorErrors.set(key, existing);
    }
  }

  selectorErrors.forEach((errors, testKey) => {
    if (errors.length >= 2) {
      const testName = errors[0]?.name || testKey;
      const errorSample = errors[0]?.error_message?.slice(0, 200);

      insights.push({
        id: `selector-${testKey}`,
        type: 'selector_issue',
        severity: errors.length >= 5 ? 'high' : errors.length >= 3 ? 'medium' : 'low',
        title: 'Selector Issue Pattern',
        description: `"${testName}" has ${errors.length} failures related to element selectors`,
        affectedTests: [testName],
        pattern: errorSample || undefined,
        occurrenceCount: errors.length,
        recommendation: 'The selectors used in this test may be fragile. Consider using more stable selectors like data-testid, ARIA labels, or unique element identifiers.',
        actionable: true,
        metadata: { errorSample },
      });
    }
  });

  return insights;
}

/**
 * Detects timeout patterns
 */
function detectTimeoutPatterns(results: TestResult[]): TestInsight[] {
  const insights: TestInsight[] = [];
  const timeoutErrors: Map<string, TestResult[]> = new Map();

  for (const result of results) {
    if (result.status !== 'failed') continue;

    const patterns = parseErrorPatterns(result.error_message);
    if (patterns.isTimeout) {
      const key = result.test_id || result.name;
      const existing = timeoutErrors.get(key) || [];
      existing.push(result);
      timeoutErrors.set(key, existing);
    }
  }

  timeoutErrors.forEach((errors, testKey) => {
    if (errors.length >= 2) {
      const testName = errors[0]?.name || testKey;

      insights.push({
        id: `timeout-${testKey}`,
        type: 'timeout_pattern',
        severity: errors.length >= 4 ? 'high' : errors.length >= 2 ? 'medium' : 'low',
        title: 'Timeout Pattern Detected',
        description: `"${testName}" has ${errors.length} timeout-related failures`,
        affectedTests: [testName],
        occurrenceCount: errors.length,
        recommendation: 'Consider increasing timeout values, checking for slow API responses, or adding explicit waits for elements. Verify that the application performance has not degraded.',
        actionable: true,
      });
    }
  });

  return insights;
}

/**
 * Detects performance regressions based on duration changes
 */
function detectPerformanceRegressions(
  groupedResults: Map<string, TestResult[]>
): TestInsight[] {
  const insights: TestInsight[] = [];

  groupedResults.forEach((results, testKey) => {
    if (results.length < 5) return; // Need enough data points

    // Sort by date
    const sortedResults = [...results]
      .filter((r) => r.duration_ms != null)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (sortedResults.length < 5) return;

    // Compare recent average to historical average
    const midpoint = Math.floor(sortedResults.length / 2);
    const historicalAvg =
      sortedResults
        .slice(0, midpoint)
        .reduce((sum, r) => sum + (r.duration_ms || 0), 0) / midpoint;
    const recentAvg =
      sortedResults
        .slice(midpoint)
        .reduce((sum, r) => sum + (r.duration_ms || 0), 0) /
      (sortedResults.length - midpoint);

    // Check for >50% increase
    const increasePercent = ((recentAvg - historicalAvg) / historicalAvg) * 100;

    if (increasePercent > 50 && recentAvg > 1000) {
      // > 50% slower and > 1s
      const testName = results[0]?.name || testKey;

      insights.push({
        id: `perf-${testKey}`,
        type: 'performance_regression',
        severity: increasePercent > 100 ? 'high' : increasePercent > 75 ? 'medium' : 'low',
        title: 'Performance Regression',
        description: `"${testName}" is ${Math.round(increasePercent)}% slower than baseline (${Math.round(historicalAvg)}ms -> ${Math.round(recentAvg)}ms)`,
        affectedTests: [testName],
        occurrenceCount: sortedResults.length,
        recommendation: 'Investigate recent code changes that may have impacted performance. Consider profiling the test to identify bottlenecks.',
        actionable: true,
        metadata: { historicalAvg, recentAvg, increasePercent },
      });
    }
  });

  return insights;
}

/**
 * Main function to generate all insights from test results
 */
function generateInsights(testResults: TestResult[]): TestInsight[] {
  const allInsights: TestInsight[] = [];
  const groupedResults = groupResultsByTest(testResults);

  // Detect various patterns
  allInsights.push(...detectFlakyTests(groupedResults));
  allInsights.push(...detectRepeatedFailures(groupedResults));
  allInsights.push(...detectSelectorIssues(testResults));
  allInsights.push(...detectTimeoutPatterns(testResults));
  allInsights.push(...detectPerformanceRegressions(groupedResults));

  // Sort by severity (high -> medium -> low) then by occurrence count
  const severityOrder: Record<InsightSeverity, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return allInsights.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.occurrenceCount - a.occurrenceCount;
  });
}

// ============================================
// UI Components
// ============================================

const severityConfig: Record<
  InsightSeverity,
  { color: string; bgColor: string; borderColor: string; icon: React.ReactNode }
> = {
  high: {
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  medium: {
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  low: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    icon: <AlertCircle className="h-4 w-4" />,
  },
};

const typeConfig: Record<
  InsightType,
  { icon: React.ReactNode; label: string }
> = {
  repeated_failure: {
    icon: <XCircle className="h-4 w-4" />,
    label: 'Repeated Failure',
  },
  flaky_test: {
    icon: <RefreshCw className="h-4 w-4" />,
    label: 'Flaky Test',
  },
  selector_issue: {
    icon: <Target className="h-4 w-4" />,
    label: 'Selector Issue',
  },
  performance_regression: {
    icon: <TrendingDown className="h-4 w-4" />,
    label: 'Performance',
  },
  timeout_pattern: {
    icon: <Clock className="h-4 w-4" />,
    label: 'Timeout',
  },
  error_cluster: {
    icon: <BarChart3 className="h-4 w-4" />,
    label: 'Error Cluster',
  },
  coverage_gap: {
    icon: <Target className="h-4 w-4" />,
    label: 'Coverage Gap',
  },
};

interface InsightCardProps {
  insight: TestInsight;
  onViewPattern?: (insight: TestInsight) => void;
  onAutoHeal?: (insight: TestInsight) => void;
  onDismiss?: (insightId: string) => void;
}

function InsightCard({
  insight,
  onViewPattern,
  onAutoHeal,
  onDismiss,
}: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const severity = severityConfig[insight.severity];
  const typeInfo = typeConfig[insight.type];

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all hover:shadow-md',
        severity.bgColor,
        severity.borderColor
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg', severity.bgColor, severity.color)}>
          {typeInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-medium text-sm">{insight.title}</h4>
            <Badge
              variant={
                insight.severity === 'high'
                  ? 'error'
                  : insight.severity === 'medium'
                  ? 'warning'
                  : 'default'
              }
              className="text-xs"
            >
              {insight.severity}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {typeInfo.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{insight.description}</p>

          {/* Affected tests count */}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {insight.occurrenceCount} occurrences
            </span>
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              {insight.affectedTests.length} test{insight.affectedTests.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Expand/Collapse */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 flex-shrink-0"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
          {/* Pattern */}
          {insight.pattern && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Error Pattern
              </p>
              <code className="block p-2 bg-background/50 rounded text-xs font-mono overflow-x-auto">
                {insight.pattern}
              </code>
            </div>
          )}

          {/* Recommendation */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Recommendation
            </p>
            <p className="text-sm">{insight.recommendation}</p>
          </div>

          {/* Affected Tests */}
          {insight.affectedTests.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Affected Tests
              </p>
              <div className="flex flex-wrap gap-1">
                {insight.affectedTests.slice(0, 5).map((test) => (
                  <Badge key={test} variant="outline" className="text-xs">
                    {test}
                  </Badge>
                ))}
                {insight.affectedTests.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{insight.affectedTests.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {insight.actionable && (
            <div className="flex items-center gap-2 pt-2">
              {onViewPattern && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewPattern(insight)}
                  className="h-8"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Pattern
                </Button>
              )}
              {onAutoHeal && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onAutoHeal(insight)}
                  className="h-8"
                >
                  <Wrench className="h-3 w-3 mr-1" />
                  Auto-heal
                </Button>
              )}
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(insight.id)}
                  className="h-8 ml-auto text-muted-foreground"
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function AIInsightsPanel({
  testResults,
  testRuns,
  className,
  isLoading = false,
  onViewPattern,
  onAutoHeal,
  onDismiss,
  maxInsights = 10,
}: AIInsightsPanelProps) {
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(
    new Set()
  );

  const insights = useMemo(() => {
    if (testResults.length === 0) return [];
    return generateInsights(testResults);
  }, [testResults]);

  const visibleInsights = useMemo(() => {
    return insights
      .filter((insight) => !dismissedInsights.has(insight.id))
      .slice(0, maxInsights);
  }, [insights, dismissedInsights, maxInsights]);

  const handleDismiss = (insightId: string) => {
    setDismissedInsights((prev) => new Set([...prev, insightId]));
    onDismiss?.(insightId);
  };

  // Summary stats
  const stats = useMemo(() => {
    const byType: Record<InsightType, number> = {
      repeated_failure: 0,
      flaky_test: 0,
      selector_issue: 0,
      performance_regression: 0,
      timeout_pattern: 0,
      error_cluster: 0,
      coverage_gap: 0,
    };
    const bySeverity: Record<InsightSeverity, number> = {
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const insight of visibleInsights) {
      byType[insight.type]++;
      bySeverity[insight.severity]++;
    }

    return { byType, bySeverity };
  }, [visibleInsights]);

  if (isLoading) {
    return (
      <div className={cn('rounded-xl border bg-card p-6', className)}>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Analyzing test results...</span>
        </div>
      </div>
    );
  }

  if (testResults.length === 0) {
    return (
      <div className={cn('rounded-xl border bg-card p-6', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-medium">AI Insights</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          No test results available for analysis. Run some tests to generate insights.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border bg-card', className)}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-medium">AI Insights</h3>
          {visibleInsights.length > 0 && (
            <Badge variant="default" className="text-xs">
              {visibleInsights.length}
            </Badge>
          )}
        </div>

        {/* Severity summary */}
        {visibleInsights.length > 0 && (
          <div className="flex items-center gap-2">
            {stats.bySeverity.high > 0 && (
              <Badge variant="error" className="text-xs">
                {stats.bySeverity.high} high
              </Badge>
            )}
            {stats.bySeverity.medium > 0 && (
              <Badge variant="warning" className="text-xs">
                {stats.bySeverity.medium} medium
              </Badge>
            )}
            {stats.bySeverity.low > 0 && (
              <Badge variant="default" className="text-xs">
                {stats.bySeverity.low} low
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Insights List */}
      <div className="p-4 space-y-3">
        {visibleInsights.length === 0 ? (
          <div className="text-center py-8">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <p className="font-medium text-sm">All Tests Healthy</p>
            <p className="text-sm text-muted-foreground mt-1">
              No issues or patterns detected in recent test results
            </p>
          </div>
        ) : (
          <>
            {visibleInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onViewPattern={onViewPattern}
                onAutoHeal={onAutoHeal}
                onDismiss={handleDismiss}
              />
            ))}

            {insights.length > maxInsights && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                Showing {maxInsights} of {insights.length} insights
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AIInsightsPanel;
