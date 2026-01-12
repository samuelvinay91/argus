'use client';

import * as React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';
import {
  Eye,
  Accessibility,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Type,
  MousePointer2,
  Contrast,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  Loader2,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/data-table';

// TypeScript interfaces
export interface AccessibilityViolation {
  id: string;
  type: 'contrast' | 'touch_target' | 'readability';
  element_selector: string;
  issue: string;
  wcag_criterion: string;
  severity: 'critical' | 'major' | 'minor';
  details: Record<string, unknown>;
}

export interface AccessibilityReport {
  overall_score: number; // 0-100
  violations: AccessibilityViolation[];
  contrast_violations: number;
  touch_target_violations: number;
  readability_violations: number;
  passed_checks: number;
  total_checks: number;
}

interface AccessibilityReportProps {
  report: AccessibilityReport | null;
  previousReport?: AccessibilityReport | null; // For comparison/regressions
  isLoading?: boolean;
  onViolationClick?: (violation: AccessibilityViolation) => void;
  className?: string;
}

const SEVERITY_CONFIG = {
  critical: {
    color: 'text-error',
    bgColor: 'bg-error/10',
    borderColor: 'border-error/20',
    icon: XCircle,
    label: 'Critical',
  },
  major: {
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/20',
    icon: AlertTriangle,
    label: 'Major',
  },
  minor: {
    color: 'text-info',
    bgColor: 'bg-info/10',
    borderColor: 'border-info/20',
    icon: Info,
    label: 'Minor',
  },
};

const TYPE_CONFIG = {
  contrast: {
    icon: Contrast,
    label: 'Contrast',
    color: 'hsl(var(--warning))',
  },
  touch_target: {
    icon: MousePointer2,
    label: 'Touch Target',
    color: 'hsl(var(--error))',
  },
  readability: {
    icon: Type,
    label: 'Readability',
    color: 'hsl(var(--info))',
  },
};

function getScoreColor(score: number) {
  if (score >= 90) return 'text-success';
  if (score >= 70) return 'text-warning';
  return 'text-error';
}

function getScoreGradient(score: number) {
  if (score >= 90) return 'from-success to-emerald-400';
  if (score >= 70) return 'from-warning to-amber-400';
  return 'from-error to-rose-400';
}

function getScoreLabel(score: number) {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
}

export function AccessibilityReport({
  report,
  previousReport,
  isLoading = false,
  onViolationClick,
  className,
}: AccessibilityReportProps) {
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(
    new Set(['critical'])
  );

  // Group violations by type
  const violationsByType = React.useMemo(() => {
    if (!report) return {};
    return report.violations.reduce((acc, violation) => {
      if (!acc[violation.type]) acc[violation.type] = [];
      acc[violation.type].push(violation);
      return acc;
    }, {} as Record<string, AccessibilityViolation[]>);
  }, [report]);

  // Group violations by severity
  const violationsBySeverity = React.useMemo(() => {
    if (!report) return {};
    return report.violations.reduce((acc, violation) => {
      if (!acc[violation.severity]) acc[violation.severity] = [];
      acc[violation.severity].push(violation);
      return acc;
    }, {} as Record<string, AccessibilityViolation[]>);
  }, [report]);

  // Calculate score change from previous report
  const scoreChange = React.useMemo(() => {
    if (!report || !previousReport) return null;
    return report.overall_score - previousReport.overall_score;
  }, [report, previousReport]);

  // Prepare bar chart data
  const chartData = React.useMemo(() => {
    if (!report) return [];
    return [
      {
        name: 'Contrast',
        violations: report.contrast_violations,
        color: TYPE_CONFIG.contrast.color,
      },
      {
        name: 'Touch Targets',
        violations: report.touch_target_violations,
        color: TYPE_CONFIG.touch_target.color,
      },
      {
        name: 'Readability',
        violations: report.readability_violations,
        color: TYPE_CONFIG.readability.color,
      },
    ];
  }, [report]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
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
              <CardTitle className="text-base">Accessibility Report</CardTitle>
              <p className="text-xs text-muted-foreground">Analyzing WCAG compliance...</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-24 bg-muted/30 animate-pulse rounded-lg" />
          <div className="h-32 bg-muted/30 animate-pulse rounded-lg" />
          <div className="h-48 bg-muted/30 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
              <Accessibility className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Accessibility Report</CardTitle>
              <p className="text-xs text-muted-foreground">No report available</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Run visual tests to check accessibility</p>
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
              <Accessibility className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Accessibility Report</CardTitle>
              <p className="text-xs text-muted-foreground">
                WCAG 2.1 AA Compliance Check
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Overall Score */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="relative h-20 w-20 shrink-0">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                className="stroke-muted"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                className={cn('transition-all duration-1000', getScoreColor(report.overall_score))}
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${(report.overall_score / 100) * 100.53} 100.53`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn('text-xl font-bold', getScoreColor(report.overall_score))}>
                {report.overall_score}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn('text-lg font-semibold', getScoreColor(report.overall_score))}>
                {getScoreLabel(report.overall_score)}
              </span>
              {report.overall_score >= 90 && (
                <Award className="h-4 w-4 text-success" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {report.passed_checks} of {report.total_checks} checks passed
            </p>
            {scoreChange !== null && (
              <div
                className={cn(
                  'flex items-center gap-1 text-xs mt-1',
                  scoreChange > 0 ? 'text-success' : scoreChange < 0 ? 'text-error' : 'text-muted-foreground'
                )}
              >
                {scoreChange > 0 ? '+' : ''}
                {scoreChange} from baseline
                {scoreChange < 0 && ' (regression)'}
              </div>
            )}
          </div>
        </div>

        {/* Pass/Fail Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/10">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <div className="text-lg font-semibold text-success">{report.passed_checks}</div>
              <div className="text-xs text-muted-foreground">Passed Checks</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-error/5 border border-error/10">
            <XCircle className="h-5 w-5 text-error" />
            <div>
              <div className="text-lg font-semibold text-error">{report.violations.length}</div>
              <div className="text-xs text-muted-foreground">Violations</div>
            </div>
          </div>
        </div>

        {/* Violations by Category Chart */}
        {report.violations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span>Violations by Category</span>
            </div>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
                            <span className="font-medium">{data.name}:</span>{' '}
                            <span>{data.violations} violation{data.violations !== 1 ? 's' : ''}</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="violations" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Violations List by Severity */}
        {report.violations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span>Violations Details</span>
            </div>

            {(['critical', 'major', 'minor'] as const).map((severity) => {
              const violations = violationsBySeverity[severity] || [];
              if (violations.length === 0) return null;

              const config = SEVERITY_CONFIG[severity];
              const isExpanded = expandedCategories.has(severity);

              return (
                <div
                  key={severity}
                  className={cn(
                    'rounded-lg border overflow-hidden',
                    config.borderColor,
                    config.bgColor
                  )}
                >
                  <button
                    onClick={() => toggleCategory(severity)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-black/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <config.icon className={cn('h-4 w-4', config.color)} />
                      <span className={cn('font-medium text-sm', config.color)}>
                        {config.label}
                      </span>
                      <Badge variant={severity === 'critical' ? 'error' : severity === 'major' ? 'warning' : 'info'}>
                        {violations.length}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/50 bg-background/50">
                      {violations.map((violation) => {
                        const typeConfig = TYPE_CONFIG[violation.type];
                        return (
                          <div
                            key={violation.id}
                            className="p-3 border-b border-border/30 last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => onViolationClick?.(violation)}
                          >
                            <div className="flex items-start gap-2">
                              <typeConfig.icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{violation.issue}</p>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground truncate max-w-[200px]">
                                    {violation.element_selector}
                                  </code>
                                  <a
                                    href={`https://www.w3.org/WAI/WCAG21/Understanding/${violation.wcag_criterion.toLowerCase()}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {violation.wcag_criterion}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* No Violations State */}
        {report.violations.length === 0 && (
          <div className="text-center py-6 rounded-lg bg-success/5 border border-success/10">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-2" />
            <p className="text-sm font-medium text-success">All accessibility checks passed!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your page meets WCAG 2.1 AA standards
            </p>
          </div>
        )}

        {/* Quick Actions */}
        {report.violations.length > 0 && (
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a
                href="https://www.w3.org/WAI/WCAG21/quickref/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3 w-3 mr-1.5" />
                WCAG Guide
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setExpandedCategories(new Set(['critical', 'major', 'minor']))}
            >
              Expand All
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Skeleton loader for the report
export function AccessibilityReportSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          <div className="space-y-1">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-3 w-40 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-24 bg-muted/30 animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-muted/30 animate-pulse rounded-lg" />
          <div className="h-16 bg-muted/30 animate-pulse rounded-lg" />
        </div>
        <div className="h-24 bg-muted/30 animate-pulse rounded-lg" />
        <div className="h-32 bg-muted/30 animate-pulse rounded-lg" />
      </CardContent>
    </Card>
  );
}
