'use client';

import { useState, useMemo, useCallback } from 'react';
import { formatDistanceToNow, format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Eye,
  Loader2,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  Plus,
  Camera,
  Search,
  Grid3X3,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Accessibility,
  History,
  ChevronRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  Image,
  Layers,
  Clock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  SplitSquareHorizontal,
  ArrowLeftRight,
  Info,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useProjects } from '@/lib/hooks/use-projects';
import {
  useVisualBaselines,
  useVisualComparisons,
  useApproveComparison,
  useRunVisualTest,
  useUpdateBaseline,
  useRunResponsiveTest,
  useCrossBrowserTest,
  useAIExplain,
  useAccessibilityAnalysis,
  type ResponsiveCompareResult,
  type ResponsiveViewportResult,
  type ViewportConfig,
  type CrossBrowserTestResult,
  type BrowserCompareResult,
  type BrowserCaptureResult,
  type AIExplainResponse,
  type AIExplainChangeDetail,
  type AccessibilityAnalysisResult,
  type AccessibilityIssue,
} from '@/lib/hooks/use-visual';
import { Badge } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import type { VisualComparison, VisualBaseline } from '@/lib/supabase/types';

// Tab types
type TabType = 'overview' | 'responsive' | 'cross-browser' | 'accessibility' | 'history';

// Status filter types
type StatusFilter = 'all' | 'match' | 'mismatch' | 'new' | 'pending';

// Sort options
type SortOption = 'date-desc' | 'date-asc' | 'status' | 'match-asc' | 'match-desc';

// Date range presets
type DateRangePreset = 'all' | 'today' | '7days' | '30days' | 'custom';

// Viewport definitions for responsive testing
const VIEWPORTS = [
  { name: 'Mobile S', width: 320, height: 568, icon: Smartphone, device: 'mobile' },
  { name: 'Mobile M', width: 375, height: 667, icon: Smartphone, device: 'mobile' },
  { name: 'Mobile L', width: 425, height: 812, icon: Smartphone, device: 'mobile' },
  { name: 'Tablet', width: 768, height: 1024, icon: Tablet, device: 'tablet' },
  { name: 'Laptop', width: 1024, height: 768, icon: Monitor, device: 'desktop' },
  { name: 'Desktop', width: 1440, height: 900, icon: Monitor, device: 'desktop' },
  { name: 'Desktop L', width: 1920, height: 1080, icon: Monitor, device: 'desktop' },
];

// Browser definitions for cross-browser testing
const BROWSERS = [
  { name: 'Chrome', icon: '🌐', key: 'chrome' },
  { name: 'Firefox', icon: '🦊', key: 'firefox' },
  { name: 'Safari', icon: '🧭', key: 'safari' },
  { name: 'Edge', icon: '🔵', key: 'edge' },
];

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  description,
  variant = 'default',
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}) {
  const variantStyles = {
    default: 'bg-muted/50',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className={cn('p-2 rounded-lg', variantStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend && trendValue && (
          <div className="flex items-center gap-1 mt-2 text-xs">
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 text-success" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-3 w-3 text-error" />
            ) : (
              <Minus className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={cn(
              trend === 'up' && 'text-success',
              trend === 'down' && 'text-error',
              trend === 'neutral' && 'text-muted-foreground'
            )}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  children,
  icon: Icon,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ElementType;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors relative',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          'px-1.5 py-0.5 text-xs rounded-full',
          active ? 'bg-primary-foreground/20' : 'bg-muted-foreground/20'
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

// Comparison Card Component
function ComparisonCard({
  comparison,
  selected,
  onClick,
  onApprove,
  onUpdateBaseline,
  isUpdating,
}: {
  comparison: VisualComparison;
  selected: boolean;
  onClick: () => void;
  onApprove: () => void;
  onUpdateBaseline: () => void;
  isUpdating: boolean;
}) {
  const statusStyles = {
    match: 'border-success/30 bg-success/5',
    mismatch: 'border-error/30 bg-error/5',
    new: 'border-primary/30 bg-primary/5',
    pending: 'border-warning/30 bg-warning/5',
    error: 'border-error/30 bg-error/5',
  };

  const statusIcon = {
    match: <CheckCircle2 className="h-4 w-4 text-success" />,
    mismatch: <XCircle className="h-4 w-4 text-error" />,
    new: <Sparkles className="h-4 w-4 text-primary" />,
    pending: <Clock className="h-4 w-4 text-warning" />,
    error: <AlertCircle className="h-4 w-4 text-error" />,
  };

  return (
    <div
      className={cn(
        'relative rounded-lg border overflow-hidden group cursor-pointer transition-all',
        statusStyles[comparison.status],
        selected && 'ring-2 ring-primary shadow-lg'
      )}
      onClick={onClick}
    >
      {/* Screenshot */}
      <div className="aspect-video bg-muted relative overflow-hidden">
        {comparison.current_url ? (
          <img
            src={comparison.current_url}
            alt={comparison.name}
            className="w-full h-full object-cover object-top transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Camera className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}

        {/* Match percentage badge */}
        {comparison.status === 'mismatch' && comparison.match_percentage !== null && (
          <div className="absolute top-2 right-2 bg-error/90 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            {comparison.match_percentage.toFixed(1)}% match
          </div>
        )}

        {/* Status icon */}
        <div className="absolute top-2 left-2">
          {statusIcon[comparison.status]}
        </div>

        {/* View diff overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="text-white text-sm font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            View Details
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 border-t">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{comparison.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(comparison.created_at), { addSuffix: true })}
            </div>
          </div>
          <Badge
            variant={
              comparison.status === 'match' ? 'success' :
              comparison.status === 'mismatch' ? 'error' :
              comparison.status === 'new' ? 'info' : 'warning'
            }
          >
            {comparison.status}
          </Badge>
        </div>

        {/* Actions for mismatch when selected */}
        {comparison.status === 'mismatch' && selected && (
          <div className="mt-3 pt-3 border-t flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateBaseline();
              }}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Update
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-8"
              onClick={(e) => {
                e.stopPropagation();
                onApprove();
              }}
            >
              <Check className="h-3 w-3 mr-1" />
              Approve
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Visual Comparison Viewer Component (for Sheet)
function VisualComparisonViewer({
  comparison,
  baseline,
}: {
  comparison: VisualComparison;
  baseline?: VisualBaseline | null;
}) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'slider' | 'diff'>('side-by-side');
  const [zoom, setZoom] = useState(100);
  const [sliderPosition, setSliderPosition] = useState(50);

  return (
    <div className="space-y-4">
      {/* View mode controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              viewMode === 'side-by-side' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <SplitSquareHorizontal className="h-4 w-4 inline mr-1" />
            Side by Side
          </button>
          <button
            onClick={() => setViewMode('slider')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              viewMode === 'slider' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ArrowLeftRight className="h-4 w-4 inline mr-1" />
            Slider
          </button>
          {comparison.diff_url && (
            <button
              onClick={() => setViewMode('diff')}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                viewMode === 'diff' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Layers className="h-4 w-4 inline mr-1" />
              Diff
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(25, zoom - 25))}
            className="p-1.5 hover:bg-muted rounded-md"
            disabled={zoom <= 25}
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground min-w-[4rem] text-center">{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(200, zoom + 25))}
            className="p-1.5 hover:bg-muted rounded-md"
            disabled={zoom >= 200}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom(100)}
            className="p-1.5 hover:bg-muted rounded-md"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Image viewer */}
      <div className="border rounded-lg bg-muted/30 overflow-hidden">
        {viewMode === 'side-by-side' && (
          <div className="grid grid-cols-2 gap-4 p-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Baseline</div>
              <div className="border rounded-lg overflow-hidden bg-background">
                {comparison.baseline_url ? (
                  <img
                    src={comparison.baseline_url}
                    alt="Baseline"
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
                    className="w-full transition-transform"
                  />
                ) : (
                  <div className="aspect-video flex items-center justify-center text-muted-foreground">
                    No baseline available
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Current</div>
              <div className="border rounded-lg overflow-hidden bg-background">
                <img
                  src={comparison.current_url}
                  alt="Current"
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
                  className="w-full transition-transform"
                />
              </div>
            </div>
          </div>
        )}

        {viewMode === 'slider' && (
          <div className="relative p-4">
            <div className="relative overflow-hidden rounded-lg">
              {/* Current image (full width) */}
              <img
                src={comparison.current_url}
                alt="Current"
                className="w-full"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
              />

              {/* Baseline image (clipped) */}
              {comparison.baseline_url && (
                <div
                  className="absolute top-0 left-0 h-full overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src={comparison.baseline_url}
                    alt="Baseline"
                    className="h-full"
                    style={{
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: 'top left',
                      width: `${10000 / sliderPosition}%`
                    }}
                  />
                </div>
              )}

              {/* Slider handle */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <ArrowLeftRight className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
            </div>

            {/* Slider control */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="w-full mt-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Baseline</span>
              <span>Current</span>
            </div>
          </div>
        )}

        {viewMode === 'diff' && comparison.diff_url && (
          <div className="p-4">
            <div className="border rounded-lg overflow-hidden bg-background">
              <img
                src={comparison.diff_url}
                alt="Diff"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
                className="w-full transition-transform"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Red areas indicate visual differences
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Changes List Component
function ChangesList({ comparison }: { comparison: VisualComparison }) {
  const changes = useMemo(() => {
    const items = [];

    if (comparison.status === 'mismatch') {
      items.push({
        type: 'visual',
        severity: 'error' as const,
        message: `Visual difference detected (${comparison.match_percentage?.toFixed(1)}% match)`,
      });

      if (comparison.difference_count > 100) {
        items.push({
          type: 'layout',
          severity: 'warning' as const,
          message: 'Possible layout shift detected',
        });
      }
    }

    if (comparison.status === 'new') {
      items.push({
        type: 'new',
        severity: 'info' as const,
        message: 'New baseline created',
      });
    }

    return items;
  }, [comparison]);

  if (changes.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
        <p className="font-medium">No changes detected</p>
        <p className="text-sm mt-1">Visual appearance matches the baseline</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {changes.map((change, index) => (
        <div
          key={index}
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg',
            change.severity === 'error' && 'bg-error/10',
            change.severity === 'warning' && 'bg-warning/10',
            change.severity === 'info' && 'bg-info/10'
          )}
        >
          {change.severity === 'error' ? (
            <XCircle className="h-4 w-4 text-error mt-0.5" />
          ) : change.severity === 'warning' ? (
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
          ) : (
            <Info className="h-4 w-4 text-info mt-0.5" />
          )}
          <div>
            <p className="text-sm font-medium">{change.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// AI Insights Panel Component - Uses backend Claude AI for intelligent analysis
function AIInsightsPanel({ comparisonId, comparison }: { comparisonId: string | null; comparison: VisualComparison }) {
  const { data: aiExplanation, isLoading, error } = useAIExplain(comparisonId, comparison);

  // Fallback insights for non-mismatch statuses (AI only analyzes mismatches)
  const fallbackInsights = useMemo(() => {
    if (comparison.status === 'new') {
      return [{
        type: 'success' as const,
        title: 'Baseline Established',
        description: 'This screenshot will be used as the reference for future comparisons.',
        action: 'Verify the baseline looks correct.',
      }];
    }
    if (comparison.status === 'match') {
      return [{
        type: 'success' as const,
        title: 'Visual Match',
        description: 'No visual differences detected between baseline and current screenshot.',
        action: 'No action required.',
      }];
    }
    return [];
  }, [comparison.status]);

  // Show loading state for AI analysis
  if (comparison.status === 'mismatch' && isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          AI Analysis
        </div>
        <div className="p-4 rounded-lg border bg-card flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Analyzing visual changes with AI...</span>
        </div>
      </div>
    );
  }

  // Show AI-powered analysis for mismatches
  if (comparison.status === 'mismatch' && aiExplanation) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Analysis
        </div>

        {/* Summary */}
        <div className="p-3 rounded-lg border bg-card space-y-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-info" />
            <span className="font-medium text-sm">Summary</span>
          </div>
          <p className="text-sm text-muted-foreground">{aiExplanation.summary}</p>
        </div>

        {/* Overall Assessment */}
        <div className="p-3 rounded-lg border bg-card space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Overall Assessment</span>
          </div>
          <p className="text-sm text-muted-foreground">{aiExplanation.overall_assessment}</p>
        </div>

        {/* Changes Explained */}
        {aiExplanation.changes_explained.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Changes Detected
            </div>
            {aiExplanation.changes_explained.map((change, index) => (
              <div key={index} className="p-3 rounded-lg border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{change.change}</span>
                  <div className="flex gap-1">
                    <Badge variant={change.risk_level === 'high' ? 'error' : change.risk_level === 'medium' ? 'warning' : 'success'}>
                      {change.risk_level} risk
                    </Badge>
                    <Badge variant={change.intentional_likelihood === 'high' ? 'success' : change.intentional_likelihood === 'medium' ? 'info' : 'warning'}>
                      {change.intentional_likelihood === 'high' ? 'Likely intentional' : change.intentional_likelihood === 'medium' ? 'Maybe intentional' : 'Check this'}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{change.likely_cause}</p>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {aiExplanation.recommendations.length > 0 && (
          <div className="p-3 rounded-lg border bg-card space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="font-medium text-sm">Recommendations</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {aiExplanation.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Show error state
  if (comparison.status === 'mismatch' && error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Analysis
        </div>
        <div className="p-3 rounded-lg border bg-card space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="font-medium text-sm">Analysis Unavailable</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Could not fetch AI analysis. The visual comparison is still available for manual review.
          </p>
        </div>
      </div>
    );
  }

  // Show fallback insights for non-mismatch statuses
  if (fallbackInsights.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" />
        AI Analysis
      </div>

      {fallbackInsights.map((insight, index) => (
        <div
          key={index}
          className="p-3 rounded-lg border bg-card space-y-2"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="font-medium text-sm">{insight.title}</span>
          </div>
          <p className="text-sm text-muted-foreground">{insight.description}</p>
          <p className="text-xs text-primary">{insight.action}</p>
        </div>
      ))}
    </div>
  );
}

// Baseline Card Component
function BaselineCard({ baseline }: { baseline: VisualBaseline }) {
  return (
    <div className="rounded-lg border overflow-hidden group hover:shadow-md transition-shadow">
      <div className="aspect-video bg-muted relative overflow-hidden">
        {baseline.screenshot_url ? (
          <img
            src={baseline.screenshot_url}
            alt={baseline.name}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Camera className="h-6 w-6 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="text-white text-xs truncate">{baseline.viewport}</div>
        </div>
      </div>
      <div className="p-2 border-t">
        <div className="font-medium text-xs truncate">{baseline.name}</div>
        <div className="text-xs text-muted-foreground truncate">{baseline.page_url}</div>
      </div>
    </div>
  );
}

// Responsive Matrix Component
function ResponsiveMatrix({
  baselines,
  comparisons,
  projectId,
}: {
  baselines: VisualBaseline[];
  comparisons: VisualComparison[];
  projectId: string | null;
}) {
  const [showTestInput, setShowTestInput] = useState(false);
  const [testUrl, setTestUrl] = useState('');
  const [selectedViewports, setSelectedViewports] = useState<string[]>(['Mobile M', 'Tablet', 'Desktop']);
  const [testResults, setTestResults] = useState<ResponsiveCompareResult | null>(null);

  const runResponsiveTest = useRunResponsiveTest();
  const isRunning = runResponsiveTest.isPending;

  // Handle running a responsive test
  const handleRunTest = useCallback(async () => {
    if (!projectId || !testUrl || selectedViewports.length === 0) return;
    try {
      const viewportsToTest: ViewportConfig[] = selectedViewports
        .map((name) => VIEWPORTS.find((v) => v.name === name))
        .filter((v): v is typeof VIEWPORTS[number] => v !== undefined)
        .map((v) => ({ name: v.name, width: v.width, height: v.height }));
      const result = await runResponsiveTest.mutateAsync({
        projectId,
        url: testUrl,
        viewports: viewportsToTest,
      });
      setTestResults(result);
    } catch (error) {
      console.error('Responsive test failed:', error);
    }
  }, [projectId, testUrl, selectedViewports, runResponsiveTest]);

  // Get status color for viewport result
  const getStatusColor = (status: ResponsiveViewportResult['status']) => {
    switch (status) {
      case 'match': return 'border-success bg-success/10';
      case 'mismatch': return 'border-error bg-error/10';
      case 'new': return 'border-primary bg-primary/10';
      case 'error': return 'border-warning bg-warning/10';
      default: return 'border-muted';
    }
  };

  const getStatusIcon = (status: ResponsiveViewportResult['status']) => {
    switch (status) {
      case 'match': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'mismatch': return <XCircle className="h-4 w-4 text-error" />;
      case 'new': return <Sparkles className="h-4 w-4 text-primary" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-warning" />;
      default: return null;
    }
  };

  // Group by URL
  const urlGroups = useMemo(() => {
    const groups: Record<string, { baselines: VisualBaseline[]; comparisons: VisualComparison[] }> = {};

    baselines.forEach((b) => {
      if (!groups[b.page_url]) {
        groups[b.page_url] = { baselines: [], comparisons: [] };
      }
      groups[b.page_url].baselines.push(b);
    });

    comparisons.forEach((c) => {
      const baseline = baselines.find((b) => b.id === c.baseline_id);
      if (baseline && groups[baseline.page_url]) {
        groups[baseline.page_url].comparisons.push(c);
      }
    });

    return groups;
  }, [baselines, comparisons]);

  return (
    <div className="space-y-6">
      {/* Run Test Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Run Responsive Test</CardTitle>
              <CardDescription>Test your website across multiple viewport sizes</CardDescription>
            </div>
            {!showTestInput && (
              <Button variant="outline" onClick={() => setShowTestInput(true)} className="gap-2">
                <Play className="h-4 w-4" />
                Run Responsive Test
              </Button>
            )}
          </div>
        </CardHeader>
        {showTestInput && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="responsive-url" className="text-sm font-medium">URL to Test</label>
              <Input id="responsive-url" type="url" value={testUrl} onChange={(e) => setTestUrl(e.target.value)} placeholder="https://example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Viewports</label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {VIEWPORTS.map((vp) => {
                  const isSelected = selectedViewports.includes(vp.name);
                  const Icon = vp.icon;
                  return (
                    <button key={vp.name} onClick={() => isSelected ? setSelectedViewports(selectedViewports.filter((v) => v !== vp.name)) : setSelectedViewports([...selectedViewports, vp.name])} className={cn('flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors', isSelected ? 'border-primary bg-primary/10' : 'border-muted hover:bg-muted/50')}>
                      <Icon className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                      <span className="text-xs font-medium">{vp.name}</span>
                      <span className="text-xs text-muted-foreground">{vp.width}x{vp.height}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleRunTest} disabled={isRunning || !testUrl || selectedViewports.length === 0 || !projectId}>
                {isRunning ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running...</>) : (<><Play className="h-4 w-4 mr-2" />Run ({selectedViewports.length})</>)}
              </Button>
              <Button variant="ghost" onClick={() => { setShowTestInput(false); setTestUrl(''); setTestResults(null); }}>Cancel</Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Test Results */}
      {testResults && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Test Results</CardTitle>
                <CardDescription className="flex items-center gap-2"><Globe className="h-4 w-4" />{testResults.url}</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-success" /><span>{testResults.summary.passed} passed</span></div>
                <div className="flex items-center gap-1"><XCircle className="h-4 w-4 text-error" /><span>{testResults.summary.failed} failed</span></div>
                {testResults.summary.new_baselines > 0 && (<div className="flex items-center gap-1"><Sparkles className="h-4 w-4 text-primary" /><span>{testResults.summary.new_baselines} new</span></div>)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {testResults.results.map((result) => {
                const viewport = VIEWPORTS.find((v) => v.name === result.viewport || `${v.width}x${v.height}` === result.viewport);
                const Icon = viewport?.icon || Monitor;
                return (
                  <div key={result.viewport} className="text-center">
                    <div className={cn('aspect-video rounded-lg border-2 flex flex-col items-center justify-center relative overflow-hidden', getStatusColor(result.status))}>
                      {result.current_url ? (<><img src={result.current_url} alt={result.viewport} className="w-full h-full object-cover" /><div className="absolute top-1 right-1">{getStatusIcon(result.status)}</div>{result.match_percentage !== null && result.status === 'mismatch' && (<div className="absolute bottom-1 left-1 bg-error/90 text-white text-xs px-1.5 py-0.5 rounded-full">{result.match_percentage.toFixed(1)}%</div>)}</>) : (<><Icon className="h-6 w-6 text-muted-foreground/50" />{result.error && <p className="text-xs text-error mt-1 px-1">{result.error}</p>}</>)}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-2">{getStatusIcon(result.status)}<p className="text-xs font-medium">{result.viewport}</p></div>
                    <p className="text-xs text-muted-foreground">{result.width}x{result.height}</p>
                    {result.match_percentage !== null && (<p className={cn('text-xs font-medium', result.status === 'match' ? 'text-success' : result.status === 'mismatch' ? 'text-error' : 'text-muted-foreground')}>{result.match_percentage.toFixed(1)}% match</p>)}
                    {result.status === 'new' && <Badge variant="info" className="mt-1 text-xs">New baseline</Badge>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Baselines */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Existing Baselines</h3>
        {Object.entries(urlGroups).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No responsive baselines yet</p>
            <p className="text-sm mt-1">Run a responsive test above to create baselines</p>
          </div>
        ) : (
          Object.entries(urlGroups).map(([url, data]) => (
            <div key={url} className="border rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-4"><Globe className="h-4 w-4 text-muted-foreground" /><span className="font-medium text-sm truncate">{url}</span></div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {VIEWPORTS.map((viewport) => {
                  const baseline = data.baselines.find((b) => b.viewport === `${viewport.width}x${viewport.height}`);
                  const recentComparison = data.comparisons.find((c) => c.baseline_id === baseline?.id);
                  const Icon = viewport.icon;
                  return (
                    <div key={viewport.name} className="text-center">
                      <div className={cn('aspect-video rounded-lg border-2 flex items-center justify-center relative overflow-hidden', baseline ? (recentComparison?.status === 'match' ? 'border-success bg-success/5' : recentComparison?.status === 'mismatch' ? 'border-error bg-error/5' : 'border-success bg-success/5') : 'border-dashed border-muted')}>
                        {baseline ? (<><img src={baseline.screenshot_url} alt={viewport.name} className="w-full h-full object-cover rounded-md" />{recentComparison && (<div className="absolute top-1 right-1">{recentComparison.status === 'match' && <CheckCircle2 className="h-4 w-4 text-success" />}{recentComparison.status === 'mismatch' && <XCircle className="h-4 w-4 text-error" />}</div>)}</>) : (<Icon className="h-6 w-6 text-muted-foreground/50" />)}
                      </div>
                      <p className="text-xs mt-2 font-medium">{viewport.name}</p>
                      <p className="text-xs text-muted-foreground">{viewport.width}x{viewport.height}</p>
                      {recentComparison?.match_percentage !== null && recentComparison?.match_percentage !== undefined && (<p className={cn('text-xs', recentComparison.status === 'match' ? 'text-success' : 'text-error')}>{recentComparison.match_percentage.toFixed(1)}% match</p>)}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Cross-Browser Matrix Component
function CrossBrowserMatrix({
  baselines,
  comparisons,
  projectId,
}: {
  baselines: VisualBaseline[];
  comparisons: VisualComparison[];
  projectId: string | null;
}) {
  const [testUrl, setTestUrl] = useState('');
  const [lastResult, setLastResult] = useState<CrossBrowserTestResult | null>(null);
  const [showScreenshots, setShowScreenshots] = useState(true);
  const crossBrowserTest = useCrossBrowserTest();

  const browserDisplayInfo: Record<string, { name: string; icon: string }> = {
    chromium: { name: 'Chrome', icon: '🌐' },
    chrome: { name: 'Chrome', icon: '🌐' },
    firefox: { name: 'Firefox', icon: '🦊' },
    webkit: { name: 'Safari', icon: '🧭' },
    safari: { name: 'Safari', icon: '🧭' },
    edge: { name: 'Edge', icon: '🔵' },
  };

  const handleRunTest = async () => {
    if (!testUrl || !projectId) return;
    try {
      const result = await crossBrowserTest.mutateAsync({
        url: testUrl,
        browsers: ['chromium', 'firefox', 'webkit'],
        projectId,
        viewport: { width: 1920, height: 1080 },
      });
      setLastResult(result);
    } catch (error) {
      console.error('Cross-browser test failed:', error);
    }
  };

  const getMatchBadgeVariant = (percentage: number | undefined): 'default' | 'success' | 'warning' | 'error' => {
    if (percentage === undefined) return 'default';
    if (percentage >= 98) return 'success';
    if (percentage >= 90) return 'warning';
    return 'error';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Cross-Browser Testing
          </CardTitle>
          <CardDescription>
            Compare how your page renders across different browsers (Chrome, Firefox, Safari)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter URL to test (e.g., https://example.com)"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              disabled={crossBrowserTest.isPending}
              className="flex-1"
            />
            <Button onClick={handleRunTest} disabled={!testUrl || !projectId || crossBrowserTest.isPending}>
              {crossBrowserTest.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing...</>
              ) : (
                <><Play className="h-4 w-4 mr-2" />Run Cross-Browser Test</>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Browsers:</span>
            {BROWSERS.filter(b => ['chrome', 'firefox', 'safari'].includes(b.key)).map((browser) => (
              <div key={browser.key} className="flex items-center gap-1">
                <span>{browser.icon}</span>
                <span>{browser.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {crossBrowserTest.isPending && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-lg font-medium">Running cross-browser test...</p>
              <p className="text-sm text-muted-foreground mt-1">Capturing screenshots in Chrome, Firefox, and Safari</p>
            </div>
          </CardContent>
        </Card>
      )}

      {crossBrowserTest.isError && (
        <Card className="border-destructive">
          <CardContent className="py-6">
            <div className="flex items-center gap-3 text-destructive">
              <XCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Test failed</p>
                <p className="text-sm">{crossBrowserTest.error?.message || 'An error occurred'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {lastResult && !crossBrowserTest.isPending && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Test Results
              </span>
              <Button variant="outline" size="sm" onClick={() => setShowScreenshots(!showScreenshots)}>
                {showScreenshots ? 'Hide' : 'Show'} Screenshots
              </Button>
            </CardTitle>
            <CardDescription>Tested URL: {lastResult.captureResults.url}</CardDescription>
          </CardHeader>
          <CardContent>
            {lastResult.compareResults && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Info className="h-4 w-4" />
                  Reference browser: {browserDisplayInfo[lastResult.compareResults.reference_browser]?.name || lastResult.compareResults.reference_browser}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {lastResult.compareResults.results.map((result: BrowserCompareResult) => {
                    const browserInfo = browserDisplayInfo[result.browser] || { name: result.browser, icon: '🌐' };
                    const captureResult = lastResult.captureResults.results.find((c: BrowserCaptureResult) => c.browser === result.browser);
                    return (
                      <Card key={result.browser} className={cn("overflow-hidden", result.is_reference && "ring-2 ring-primary")}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{browserInfo.icon}</span>
                              <span className="font-medium">{browserInfo.name}</span>
                            </div>
                            {result.is_reference ? (
                              <Badge variant="default">Reference</Badge>
                            ) : (
                              <Badge variant={getMatchBadgeVariant(result.match_percentage)}>
                                {result.match_percentage !== undefined ? `${result.match_percentage.toFixed(1)}% match` : 'N/A'}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {showScreenshots && captureResult?.screenshot_url && (
                            <div className="aspect-video bg-muted rounded-md overflow-hidden">
                              <img src={captureResult.screenshot_url} alt={`${browserInfo.name} screenshot`} className="w-full h-full object-cover" />
                            </div>
                          )}
                          {!result.is_reference && (
                            <div className="space-y-2">
                              {result.match !== undefined && (
                                <div className="flex items-center gap-2 text-sm">
                                  {result.match ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-yellow-500" />}
                                  <span>{result.match ? 'Matches reference' : 'Differences detected'}</span>
                                </div>
                              )}
                              {result.differences && result.differences.length > 0 && (
                                <div className="text-xs space-y-1">
                                  {result.differences.slice(0, 3).map((diff, idx) => (
                                    <div key={idx} className="flex items-start gap-1 text-muted-foreground">
                                      <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                      <span>{diff.description}</span>
                                    </div>
                                  ))}
                                  {result.differences.length > 3 && <p className="text-muted-foreground">+{result.differences.length - 3} more differences</p>}
                                </div>
                              )}
                            </div>
                          )}
                          {result.error && (
                            <div className="text-sm text-destructive flex items-center gap-1">
                              <XCircle className="h-4 w-4" />
                              {result.error}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
            {!lastResult.compareResults && lastResult.captureResults.results.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {lastResult.captureResults.results.map((result: BrowserCaptureResult) => {
                  const browserInfo = browserDisplayInfo[result.browser] || { name: result.browser, icon: '🌐' };
                  return (
                    <Card key={result.browser}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{browserInfo.icon}</span>
                          <span className="font-medium">{browserInfo.name}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {result.success && result.screenshot_url ? (
                          <div className="aspect-video bg-muted rounded-md overflow-hidden">
                            <img src={result.screenshot_url} alt={`${browserInfo.name} screenshot`} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                              <XCircle className="h-8 w-8 mx-auto mb-2" />
                              <p className="text-sm">{result.error || 'Capture failed'}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!lastResult && !crossBrowserTest.isPending && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No cross-browser tests yet</p>
              <p className="text-sm mt-1">Enter a URL above to compare how it renders across browsers</p>
              <div className="flex items-center justify-center gap-6 mt-6">
                {BROWSERS.filter(b => ['chrome', 'firefox', 'safari'].includes(b.key)).map((browser) => (
                  <div key={browser.key} className="text-center">
                    <div className="text-3xl mb-1">{browser.icon}</div>
                    <p className="text-xs">{browser.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Accessibility Tab Component
function AccessibilityTab({ projectId }: { projectId: string | null }) {
  const [url, setUrl] = useState('');
  const accessibilityAnalysis = useAccessibilityAnalysis();
  const [result, setResult] = useState<AccessibilityAnalysisResult | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!url.trim()) return;

    try {
      const analysisResult = await accessibilityAnalysis.mutateAsync({
        url: url.trim(),
        projectId: projectId || undefined,
      });
      setResult(analysisResult);
    } catch (error) {
      console.error('Accessibility analysis failed:', error);
    }
  }, [url, projectId, accessibilityAnalysis]);

  const getSeverityColor = (severity: AccessibilityIssue['severity']) => {
    switch (severity) {
      case 'critical': return 'text-error';
      case 'major': return 'text-warning';
      case 'minor': return 'text-muted-foreground';
    }
  };

  const getComplianceBadgeVariant = (level: AccessibilityAnalysisResult['level_compliance']) => {
    switch (level) {
      case 'AAA': return 'success' as const;
      case 'AA': return 'success' as const;
      case 'A': return 'warning' as const;
      case 'None': return 'error' as const;
    }
  };

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Enter URL to analyze (e.g., https://example.com)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
        />
        <Button
          onClick={handleAnalyze}
          disabled={!url.trim() || accessibilityAnalysis.isPending}
        >
          {accessibilityAnalysis.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Accessibility className="h-4 w-4 mr-2" />
              Analyze
            </>
          )}
        </Button>
      </div>

      {/* Error State */}
      {accessibilityAnalysis.isError && (
        <div className="p-4 rounded-lg border border-error/50 bg-error/10">
          <div className="flex items-center gap-2 text-error">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Analysis Failed</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {accessibilityAnalysis.error instanceof Error
              ? accessibilityAnalysis.error.message
              : 'An unexpected error occurred'}
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Score Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Accessibility Score</CardTitle>
                <Badge variant={getComplianceBadgeVariant(result.level_compliance)}>
                  WCAG {result.level_compliance}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="text-5xl font-bold">
                  {result.overall_score}
                  <span className="text-2xl text-muted-foreground">/100</span>
                </div>
                <div className="flex-1">
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        result.overall_score >= 90 ? 'bg-success' :
                        result.overall_score >= 70 ? 'bg-warning' : 'bg-error'
                      )}
                      style={{ width: `${result.overall_score}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{result.summary}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issues */}
          {result.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Issues Found ({result.issues.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.issues.map((issue, index) => (
                  <div key={index} className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{issue.criterion}</span>
                      <Badge variant={issue.severity === 'critical' ? 'error' : issue.severity === 'major' ? 'warning' : 'default'}>
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{issue.description}</p>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Location: </span>
                      <code className="bg-muted px-1 rounded">{issue.location}</code>
                    </div>
                    <div className="text-xs">
                      <span className="text-primary font-medium">Recommendation: </span>
                      {issue.recommendation}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Passed Criteria */}
          {result.passed_criteria.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Passed Criteria ({result.passed_criteria.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.passed_criteria.map((criterion, index) => (
                    <Badge key={index} variant="outline" className="text-success border-success/30">
                      {criterion}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {!result && !accessibilityAnalysis.isPending && !accessibilityAnalysis.isError && (
        <div className="text-center py-12 text-muted-foreground">
          <Accessibility className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Analyze Page Accessibility</p>
          <p className="text-sm mt-1">
            Enter a URL above to check WCAG compliance, color contrast, and more
          </p>
        </div>
      )}
    </div>
  );
}

// History Timeline Component
function HistoryTimeline({ comparisons }: { comparisons: VisualComparison[] }) {
  const groupedByDate = useMemo(() => {
    const groups: Record<string, VisualComparison[]> = {};

    comparisons.forEach((c) => {
      const date = format(new Date(c.created_at), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(c);
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [comparisons]);

  if (comparisons.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No comparison history yet</p>
        <p className="text-sm mt-1">Run visual tests to build history</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedByDate.map(([date, items]) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm font-medium text-muted-foreground">
              {format(new Date(date), 'MMMM d, yyyy')}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            {items.map((comparison) => (
              <div
                key={comparison.id}
                className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="w-16 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                  {comparison.current_url ? (
                    <img
                      src={comparison.current_url}
                      alt={comparison.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Image className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{comparison.name}</span>
                    <Badge
                      variant={
                        comparison.status === 'match' ? 'success' :
                        comparison.status === 'mismatch' ? 'error' :
                        comparison.status === 'new' ? 'info' : 'warning'
                      }
                    >
                      {comparison.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(comparison.created_at), 'h:mm a')}
                    {comparison.match_percentage !== null && comparison.status !== 'new' && (
                      <> - {comparison.match_percentage.toFixed(1)}% match</>
                    )}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Main Visual Page Component
export default function VisualPage() {
  // State
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [testUrl, setTestUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [selectedComparison, setSelectedComparison] = useState<string | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  // Quick Actions modal state
  const [visualTestModalOpen, setVisualTestModalOpen] = useState(false);
  const [responsiveModalOpen, setResponsiveModalOpen] = useState(false);
  const [crossBrowserModalOpen, setCrossBrowserModalOpen] = useState(false);
  const [selectedViewports, setSelectedViewports] = useState<string[]>(['Mobile M', 'Tablet', 'Desktop']);
  const [selectedBrowsers, setSelectedBrowsers] = useState<string[]>(['chrome', 'firefox', 'safari']);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [dateRange, setDateRange] = useState<DateRangePreset>('all');

  // Data hooks
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const currentProject = selectedProjectId || projects[0]?.id;

  const { data: baselines = [], isLoading: baselinesLoading } = useVisualBaselines(currentProject || null);
  const { data: comparisons = [], isLoading: comparisonsLoading } = useVisualComparisons(currentProject || null, 100);
  const approveComparison = useApproveComparison();
  const runVisualTest = useRunVisualTest();
  const updateBaseline = useUpdateBaseline();
  const runResponsiveTest = useRunResponsiveTest();
  const crossBrowserTest = useCrossBrowserTest();

  const isLoading = projectsLoading || baselinesLoading || comparisonsLoading;
  const isRunning = runVisualTest.isPending;

  // Selected comparison data
  const selectedComparisonData = useMemo(
    () => comparisons.find((c) => c.id === selectedComparison),
    [comparisons, selectedComparison]
  );

  const selectedBaseline = useMemo(() => {
    if (!selectedComparisonData?.baseline_id) return null;
    return baselines.find((b) => b.id === selectedComparisonData.baseline_id);
  }, [baselines, selectedComparisonData]);

  // Filtered and sorted comparisons
  const filteredComparisons = useMemo(() => {
    let result = [...comparisons];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.baseline_url && c.baseline_url.toLowerCase().includes(query))
      );
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case 'today':
          startDate = startOfDay(now);
          break;
        case '7days':
          startDate = subDays(now, 7);
          break;
        case '30days':
          startDate = subDays(now, 30);
          break;
        default:
          startDate = new Date(0);
      }

      result = result.filter((c) =>
        isWithinInterval(new Date(c.created_at), {
          start: startDate,
          end: endOfDay(now),
        })
      );
    }

    // Sort
    switch (sortOption) {
      case 'date-asc':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'date-desc':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'status':
        const statusOrder = { mismatch: 0, pending: 1, new: 2, match: 3, error: 4 };
        result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
        break;
      case 'match-asc':
        result.sort((a, b) => (a.match_percentage ?? 0) - (b.match_percentage ?? 0));
        break;
      case 'match-desc':
        result.sort((a, b) => (b.match_percentage ?? 0) - (a.match_percentage ?? 0));
        break;
    }

    return result;
  }, [comparisons, statusFilter, searchQuery, sortOption, dateRange]);

  // Stats
  const stats = useMemo(() => ({
    total: comparisons.length,
    match: comparisons.filter((c) => c.status === 'match').length,
    mismatch: comparisons.filter((c) => c.status === 'mismatch').length,
    pending: comparisons.filter((c) => c.status === 'pending' || c.status === 'new').length,
    passRate: comparisons.length > 0
      ? ((comparisons.filter((c) => c.status === 'match').length / comparisons.length) * 100).toFixed(1)
      : '0',
    autoApproved: comparisons.filter((c) => c.approved_at && !c.approved_by).length,
  }), [comparisons]);

  // Handlers
  const handleRunVisualTest = useCallback(async () => {
    if (!currentProject || !testUrl) return;

    try {
      await runVisualTest.mutateAsync({
        projectId: currentProject,
        url: testUrl,
      });
      setTestUrl('');
      setShowUrlInput(false);
    } catch (error) {
      console.error('Visual test failed:', error);
    }
  }, [currentProject, testUrl, runVisualTest]);

  // Run responsive test across selected viewports using dedicated responsive endpoint
  const handleRunResponsiveTest = useCallback(async () => {
    if (!currentProject || !testUrl) return;

    try {
      const viewportsToTest: ViewportConfig[] = selectedViewports
        .map((name) => VIEWPORTS.find((v) => v.name === name))
        .filter((v): v is typeof VIEWPORTS[number] => v !== undefined)
        .map((v) => ({ name: v.name, width: v.width, height: v.height }));

      // Use dedicated responsive testing hook instead of running individual tests
      await runResponsiveTest.mutateAsync({
        projectId: currentProject,
        url: testUrl,
        viewports: viewportsToTest,
      });

      setTestUrl('');
      setResponsiveModalOpen(false);
    } catch (error) {
      console.error('Responsive test failed:', error);
    }
  }, [currentProject, testUrl, selectedViewports, runResponsiveTest]);

  // Run cross-browser test using dedicated cross-browser endpoint
  const handleRunCrossBrowserTest = useCallback(async () => {
    if (!currentProject || !testUrl) return;

    try {
      // Map frontend browser keys to backend browser names
      const browserMapping: Record<string, string> = {
        'chrome': 'chromium',
        'firefox': 'firefox',
        'safari': 'webkit',
        'edge': 'chromium',
      };

      const browsersToTest = selectedBrowsers.map(b => browserMapping[b] || b);

      // Use dedicated cross-browser testing hook
      await crossBrowserTest.mutateAsync({
        url: testUrl,
        browsers: browsersToTest,
        projectId: currentProject,
        viewport: { width: 1920, height: 1080 },
        name: `${testUrl.replace(/https?:\/\//, '').split('/')[0]}-cross-browser`,
      });

      setTestUrl('');
      setCrossBrowserModalOpen(false);
    } catch (error) {
      console.error('Cross-browser test failed:', error);
    }
  }, [currentProject, testUrl, selectedBrowsers, crossBrowserTest]);

  const handleUpdateBaseline = useCallback(async (comparisonId: string) => {
    if (!currentProject) return;
    try {
      await updateBaseline.mutateAsync({
        comparisonId,
        projectId: currentProject,
      });
    } catch (error) {
      console.error('Update baseline failed:', error);
    }
  }, [currentProject, updateBaseline]);

  const handleApprove = useCallback((comparisonId: string) => {
    if (!currentProject) return;
    approveComparison.mutate({
      comparisonId,
      projectId: currentProject,
    });
  }, [currentProject, approveComparison]);

  const handleComparisonClick = useCallback((comparison: VisualComparison) => {
    setSelectedComparison(comparison.id);
    setDetailSheetOpen(true);
  }, []);

  // Empty state
  if (!projectsLoading && projects.length === 0) {
    return (
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-w-0 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Eye className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight mb-2">No Projects Yet</h2>
            <p className="text-muted-foreground">Create a project first to start visual testing.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-sm">
          <div className="flex h-16 items-center gap-4 px-6">
            <select
              value={currentProject || ''}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            {/* Quick stats */}
            <div className="flex items-center gap-3 ml-4">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-success" />
                <span className="font-medium">{stats.match}</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-sm">
                <X className="h-4 w-4 text-error" />
                <span className="font-medium">{stats.mismatch}</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="font-medium">{stats.pending}</span>
              </div>
            </div>

            <div className="flex-1" />

            {/* Quick actions */}
            {showUrlInput ? (
              <div className="flex items-center gap-2">
                <Input
                  type="url"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="h-9 w-64"
                  onKeyDown={(e) => e.key === 'Enter' && handleRunVisualTest()}
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleRunVisualTest}
                  disabled={isRunning || !testUrl}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Capturing...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Capture
                    </>
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowUrlInput(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowUrlInput(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Visual Test
                </Button>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 px-6 pb-2">
            <TabButton
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              icon={Grid3X3}
            >
              Overview
            </TabButton>
            <TabButton
              active={activeTab === 'responsive'}
              onClick={() => setActiveTab('responsive')}
              icon={Smartphone}
            >
              Responsive
            </TabButton>
            <TabButton
              active={activeTab === 'cross-browser'}
              onClick={() => setActiveTab('cross-browser')}
              icon={Globe}
            >
              Cross-Browser
            </TabButton>
            <TabButton
              active={activeTab === 'accessibility'}
              onClick={() => setActiveTab('accessibility')}
              icon={Accessibility}
            >
              Accessibility
            </TabButton>
            <TabButton
              active={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              icon={History}
              badge={comparisons.length}
            >
              History
            </TabButton>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="Total Tests"
                  value={stats.total}
                  icon={Eye}
                  description="All visual comparisons"
                />
                <StatCard
                  title="Pass Rate"
                  value={`${stats.passRate}%`}
                  icon={TrendingUp}
                  variant={Number(stats.passRate) >= 90 ? 'success' : Number(stats.passRate) >= 70 ? 'warning' : 'error'}
                  trend={Number(stats.passRate) >= 90 ? 'up' : 'neutral'}
                  trendValue="vs last week"
                />
                <StatCard
                  title="Changes Detected"
                  value={stats.mismatch}
                  icon={AlertTriangle}
                  variant={stats.mismatch > 0 ? 'warning' : 'default'}
                  description="Needs review"
                />
                <StatCard
                  title="Auto-Approved"
                  value={stats.autoApproved}
                  icon={CheckCircle2}
                  variant="success"
                  description="Within threshold"
                />
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                  <CardDescription>Run visual testing suites</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-3">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setVisualTestModalOpen(true)}
                  >
                    <Play className="h-4 w-4" />
                    Run Visual Test
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setResponsiveModalOpen(true)}
                  >
                    <Smartphone className="h-4 w-4" />
                    Run Responsive Suite
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setCrossBrowserModalOpen(true)}
                  >
                    <Globe className="h-4 w-4" />
                    Run Cross-Browser Suite
                  </Button>
                </CardContent>
              </Card>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search comparisons..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="match">Match</option>
                  <option value="mismatch">Mismatch</option>
                  <option value="new">New</option>
                  <option value="pending">Pending</option>
                </select>

                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as DateRangePreset)}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>

                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="status">By Status</option>
                  <option value="match-asc">Match % (Low to High)</option>
                  <option value="match-desc">Match % (High to Low)</option>
                </select>
              </div>

              {/* Recent Comparisons Grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Recent Comparisons ({filteredComparisons.length})
                  </h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="aspect-video rounded-lg border bg-muted animate-pulse" />
                    ))
                  ) : filteredComparisons.length > 0 ? (
                    filteredComparisons.map((comparison) => (
                      <ComparisonCard
                        key={comparison.id}
                        comparison={comparison}
                        selected={selectedComparison === comparison.id}
                        onClick={() => handleComparisonClick(comparison)}
                        onApprove={() => handleApprove(comparison.id)}
                        onUpdateBaseline={() => handleUpdateBaseline(comparison.id)}
                        isUpdating={updateBaseline.isPending}
                      />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No visual comparisons found</p>
                      <p className="text-sm mt-1">
                        {searchQuery || statusFilter !== 'all' || dateRange !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Run visual tests to capture screenshots'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Baselines Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Baselines ({baselines.length})
                  </h3>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Manage Baselines
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {baselines.length > 0 ? (
                    baselines.slice(0, 6).map((baseline) => (
                      <BaselineCard key={baseline.id} baseline={baseline} />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No baselines yet</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'responsive' && (
            <ResponsiveMatrix baselines={baselines} comparisons={comparisons} projectId={currentProject || null} />
          )}

          {activeTab === 'cross-browser' && (
            <CrossBrowserMatrix baselines={baselines} comparisons={comparisons} projectId={currentProject || null} />
          )}

          {activeTab === 'accessibility' && <AccessibilityTab projectId={selectedProjectId} />}

          {activeTab === 'history' && <HistoryTimeline comparisons={comparisons} />}
        </div>

        {/* Detail Sheet */}
        <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
          <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
            {selectedComparisonData && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    {selectedComparisonData.name}
                    <Badge
                      variant={
                        selectedComparisonData.status === 'match' ? 'success' :
                        selectedComparisonData.status === 'mismatch' ? 'error' :
                        selectedComparisonData.status === 'new' ? 'info' : 'warning'
                      }
                    >
                      {selectedComparisonData.status}
                    </Badge>
                  </SheetTitle>
                  <SheetDescription>
                    {format(new Date(selectedComparisonData.created_at), 'PPpp')}
                    {selectedComparisonData.match_percentage !== null && (
                      <> - {selectedComparisonData.match_percentage.toFixed(1)}% match</>
                    )}
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Visual Comparison Viewer */}
                  <VisualComparisonViewer
                    comparison={selectedComparisonData}
                    baseline={selectedBaseline}
                  />

                  {/* Changes List */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Changes Detected</h4>
                    <ChangesList comparison={selectedComparisonData} />
                  </div>

                  {/* AI Insights */}
                  <AIInsightsPanel comparisonId={selectedComparison} comparison={selectedComparisonData} />
                </div>

                <SheetFooter className="mt-6 pt-6 border-t">
                  {selectedComparisonData.status === 'mismatch' && (
                    <div className="flex gap-3 w-full">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleUpdateBaseline(selectedComparisonData.id)}
                        disabled={updateBaseline.isPending}
                      >
                        {updateBaseline.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Update Baseline
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => {
                          handleApprove(selectedComparisonData.id);
                          setDetailSheetOpen(false);
                        }}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve Changes
                      </Button>
                    </div>
                  )}
                  {selectedComparisonData.status === 'match' && (
                    <p className="text-sm text-muted-foreground text-center w-full">
                      This comparison matches the baseline. No action required.
                    </p>
                  )}
                  {selectedComparisonData.status === 'new' && (
                    <p className="text-sm text-muted-foreground text-center w-full">
                      This is a new baseline. Future comparisons will use this as reference.
                    </p>
                  )}
                </SheetFooter>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Visual Test Modal */}
        <Dialog open={visualTestModalOpen} onOpenChange={setVisualTestModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Run Visual Test</DialogTitle>
              <DialogDescription>
                Capture a screenshot and compare against the baseline.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="test-url" className="text-sm font-medium">
                  URL to Test
                </label>
                <Input
                  id="test-url"
                  type="url"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="https://example.com"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && testUrl) {
                      handleRunVisualTest();
                      setVisualTestModalOpen(false);
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVisualTestModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleRunVisualTest();
                  setVisualTestModalOpen(false);
                }}
                disabled={isRunning || !testUrl}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Test
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Responsive Test Modal */}
        <Dialog open={responsiveModalOpen} onOpenChange={setResponsiveModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Run Responsive Suite</DialogTitle>
              <DialogDescription>
                Test across multiple viewport sizes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="responsive-url" className="text-sm font-medium">
                  URL to Test
                </label>
                <Input
                  id="responsive-url"
                  type="url"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Viewports</label>
                <div className="grid grid-cols-2 gap-2">
                  {VIEWPORTS.map((vp) => (
                    <label
                      key={vp.name}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors',
                        selectedViewports.includes(vp.name)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedViewports.includes(vp.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedViewports([...selectedViewports, vp.name]);
                          } else {
                            setSelectedViewports(selectedViewports.filter(v => v !== vp.name));
                          }
                        }}
                        className="sr-only"
                      />
                      <vp.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{vp.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {vp.width}×{vp.height}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResponsiveModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRunResponsiveTest}
                disabled={isRunning || !testUrl || selectedViewports.length === 0}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Smartphone className="h-4 w-4 mr-2" />
                    Run Suite ({selectedViewports.length})
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cross-Browser Test Modal */}
        <Dialog open={crossBrowserModalOpen} onOpenChange={setCrossBrowserModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Run Cross-Browser Suite</DialogTitle>
              <DialogDescription>
                Test across multiple browsers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="browser-url" className="text-sm font-medium">
                  URL to Test
                </label>
                <Input
                  id="browser-url"
                  type="url"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Browsers</label>
                <div className="grid grid-cols-2 gap-2">
                  {BROWSERS.map((browser) => (
                    <label
                      key={browser.key}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors',
                        selectedBrowsers.includes(browser.key)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedBrowsers.includes(browser.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBrowsers([...selectedBrowsers, browser.key]);
                          } else {
                            setSelectedBrowsers(selectedBrowsers.filter(b => b !== browser.key));
                          }
                        }}
                        className="sr-only"
                      />
                      <span className="text-lg">{browser.icon}</span>
                      <span className="text-sm">{browser.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCrossBrowserModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRunCrossBrowserTest}
                disabled={isRunning || !testUrl || selectedBrowsers.length === 0}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Run Suite ({selectedBrowsers.length})
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
