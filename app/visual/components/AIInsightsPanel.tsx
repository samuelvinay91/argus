'use client';

import * as React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Brain,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  DollarSign,
  Clock,
  Shield,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/data-table';

// TypeScript interfaces
export interface AIAnalysis {
  overall_assessment: string;
  auto_approval_recommendation: boolean;
  approval_confidence: number; // 0-1
  blocking_changes: string[]; // change IDs
  intentional_count: number;
  regression_count: number;
  dynamic_count: number;
  unknown_count: number;
  suggestions: Array<{
    text: string;
    action?: string;
    actionLabel?: string;
  }>;
  analysis_cost_usd: number;
  analysis_duration_ms: number;
}

interface AIInsightsPanelProps {
  analysis: AIAnalysis | null;
  isLoading?: boolean;
  onSuggestionAction?: (action: string) => void;
  onApproveAll?: () => void;
  className?: string;
}

const INTENT_COLORS = {
  intentional: 'hsl(var(--success))',
  regression: 'hsl(var(--error))',
  dynamic: 'hsl(var(--warning))',
  unknown: 'hsl(var(--muted-foreground))',
};

export function AIInsightsPanel({
  analysis,
  isLoading = false,
  onSuggestionAction,
  onApproveAll,
  className,
}: AIInsightsPanelProps) {
  // Prepare pie chart data
  const intentData = React.useMemo(() => {
    if (!analysis) return [];
    return [
      { name: 'Intentional', value: analysis.intentional_count, color: INTENT_COLORS.intentional },
      { name: 'Regression', value: analysis.regression_count, color: INTENT_COLORS.regression },
      { name: 'Dynamic', value: analysis.dynamic_count, color: INTENT_COLORS.dynamic },
      { name: 'Unknown', value: analysis.unknown_count, color: INTENT_COLORS.unknown },
    ].filter((item) => item.value > 0);
  }, [analysis]);

  const totalChanges = React.useMemo(() => {
    if (!analysis) return 0;
    return (
      analysis.intentional_count +
      analysis.regression_count +
      analysis.dynamic_count +
      analysis.unknown_count
    );
  }, [analysis]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-success';
    if (confidence >= 0.5) return 'text-warning';
    return 'text-error';
  };

  const getConfidenceBgColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-success';
    if (confidence >= 0.5) return 'bg-warning';
    return 'bg-error';
  };

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            </div>
            <div>
              <CardTitle className="text-base">AI Analysis</CardTitle>
              <p className="text-xs text-muted-foreground">Analyzing changes...</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-32 bg-muted/30 animate-pulse rounded-lg" />
          <div className="h-20 bg-muted/30 animate-pulse rounded-lg" />
          <div className="h-16 bg-muted/30 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
              <Brain className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">AI Analysis</CardTitle>
              <p className="text-xs text-muted-foreground">No analysis available</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Run visual tests to get AI-powered insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">AI Analysis</CardTitle>
              <p className="text-xs text-muted-foreground">
                {totalChanges} change{totalChanges !== 1 ? 's' : ''} detected
              </p>
            </div>
          </div>
          {analysis.auto_approval_recommendation && (
            <Badge variant="success">Auto-approve Ready</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Overall Assessment */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-sm font-medium">{analysis.overall_assessment}</p>
        </div>

        {/* Auto-Approval Confidence */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Auto-approval Confidence</span>
            </div>
            <span className={cn('font-semibold', getConfidenceColor(analysis.approval_confidence))}>
              {Math.round(analysis.approval_confidence * 100)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', getConfidenceBgColor(analysis.approval_confidence))}
              style={{ width: `${analysis.approval_confidence * 100}%` }}
            />
          </div>
        </div>

        {/* Blocking Issues */}
        {analysis.blocking_changes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-error">
              <XCircle className="h-4 w-4" />
              <span>Blocking Issues ({analysis.blocking_changes.length})</span>
            </div>
            <ul className="space-y-1">
              {analysis.blocking_changes.slice(0, 5).map((changeId, index) => (
                <li
                  key={index}
                  className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1.5 rounded bg-error/5 border border-error/10"
                >
                  <AlertTriangle className="h-3 w-3 text-error shrink-0" />
                  <span className="truncate">Change {changeId}</span>
                </li>
              ))}
              {analysis.blocking_changes.length > 5 && (
                <li className="text-xs text-muted-foreground px-2">
                  +{analysis.blocking_changes.length - 5} more...
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Change Intent Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span>Change Intent Breakdown</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={intentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {intentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
                            <span className="font-medium">{data.name}:</span>{' '}
                            <span>{data.value}</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-xs text-muted-foreground">Intentional</span>
                <span className="text-xs font-medium ml-auto">{analysis.intentional_count}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-error" />
                <span className="text-xs text-muted-foreground">Regression</span>
                <span className="text-xs font-medium ml-auto">{analysis.regression_count}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning" />
                <span className="text-xs text-muted-foreground">Dynamic</span>
                <span className="text-xs font-medium ml-auto">{analysis.dynamic_count}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <span className="text-xs text-muted-foreground">Unknown</span>
                <span className="text-xs font-medium ml-auto">{analysis.unknown_count}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Suggestions */}
        {analysis.suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-warning" />
              <span>Smart Suggestions</span>
            </div>
            <ul className="space-y-2">
              {analysis.suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm p-2 rounded-lg bg-muted/30 border border-border/50"
                >
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-muted-foreground">{suggestion.text}</p>
                    {suggestion.action && suggestion.actionLabel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 mt-1.5 text-xs text-primary hover:text-primary"
                        onClick={() => onSuggestionAction?.(suggestion.action!)}
                      >
                        {suggestion.actionLabel}
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cost & Duration */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            <span>API Cost: ${analysis.analysis_cost_usd.toFixed(4)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{(analysis.analysis_duration_ms / 1000).toFixed(1)}s</span>
          </div>
        </div>

        {/* Action Buttons */}
        {analysis.auto_approval_recommendation && analysis.blocking_changes.length === 0 && (
          <Button
            className="w-full"
            variant="success"
            onClick={onApproveAll}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Approve All {analysis.intentional_count} Intentional Changes
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Skeleton loader for the panel
export function AIInsightsPanelSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          <div className="space-y-1">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-16 bg-muted/30 animate-pulse rounded-lg" />
        <div className="h-10 bg-muted/30 animate-pulse rounded-lg" />
        <div className="h-24 bg-muted/30 animate-pulse rounded-lg" />
        <div className="h-32 bg-muted/30 animate-pulse rounded-lg" />
      </CardContent>
    </Card>
  );
}
