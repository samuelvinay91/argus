'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Image,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  Info,
  Layers,
  Type,
  Palette,
  Minus,
  Plus,
  RefreshCw,
  Bug,
  ZoomIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Severity configuration with icons and colors
const SEVERITY_CONFIG: Record<string, { icon: typeof AlertTriangle; color: string; bgColor: string; label: string }> = {
  critical: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500/10', label: 'Critical' },
  major: { icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-500/10', label: 'Major' },
  minor: { icon: AlertCircle, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', label: 'Minor' },
  info: { icon: Info, color: 'text-blue-500', bgColor: 'bg-blue-500/10', label: 'Info' },
};

// Difference type configuration
const DIFF_TYPE_CONFIG: Record<string, { icon: typeof Layers; label: string; color: string }> = {
  layout: { icon: Layers, label: 'Layout', color: 'text-purple-500' },
  content: { icon: Type, label: 'Content', color: 'text-blue-500' },
  style: { icon: Palette, label: 'Style', color: 'text-pink-500' },
  missing: { icon: Minus, label: 'Missing', color: 'text-red-500' },
  new: { icon: Plus, label: 'New', color: 'text-green-500' },
  dynamic: { icon: RefreshCw, label: 'Dynamic', color: 'text-gray-500' },
  none: { icon: CheckCircle, label: 'None', color: 'text-green-500' },
};

interface VisualDifference {
  type: string;
  severity: string;
  description: string;
  location: string;
  element?: string | null;
  expected?: string | null;
  actual?: string | null;
  is_regression: boolean;
}

interface VisualComparisonCardProps {
  data: {
    success: boolean;
    baseline_url: string;
    current_url: string;
    match: boolean;
    match_percentage: number;
    has_regressions: boolean;
    summary: string;
    differences: VisualDifference[];
    analysis_cost_usd?: number;
    timestamp?: string;
    context?: string | null;
    sensitivity?: string;
    error?: string;
    _actions?: string[];
  };
  onAction?: (action: string, data: unknown) => void;
}

// Match percentage gauge component
function MatchGauge({ percentage }: { percentage: number }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = (pct: number): { stroke: string; text: string; bg: string } => {
    if (pct >= 95) return { stroke: 'stroke-green-500', text: 'text-green-500', bg: 'bg-green-500/10' };
    if (pct >= 80) return { stroke: 'stroke-yellow-500', text: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    if (pct >= 60) return { stroke: 'stroke-orange-500', text: 'text-orange-500', bg: 'bg-orange-500/10' };
    return { stroke: 'stroke-red-500', text: 'text-red-500', bg: 'bg-red-500/10' };
  };

  const colors = getColor(percentage);

  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg className="w-full h-full -rotate-90">
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          strokeWidth="6"
          className="stroke-muted"
        />
        <motion.circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className={colors.stroke}
          style={{ strokeDasharray: circumference }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-xl font-bold', colors.text)}>{Math.round(percentage)}%</span>
        <span className="text-[9px] text-muted-foreground">match</span>
      </div>
    </div>
  );
}

// Screenshot preview component
function ScreenshotPreview({
  url,
  label,
  onClick,
}: {
  url: string;
  label: string;
  onClick?: () => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="flex-1 min-w-0">
      <div className="text-[10px] text-muted-foreground font-medium mb-1">{label}</div>
      <button
        onClick={onClick}
        className="relative w-full aspect-video rounded-md overflow-hidden border border-border/50 bg-muted/30 group hover:border-primary/50 transition-colors"
      >
        {!hasError ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={label}
              className={cn(
                'w-full h-full object-cover transition-opacity',
                isLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setIsLoaded(true)}
              onError={() => setHasError(true)}
            />
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ZoomIn className="w-6 h-6 text-white" />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <Image className="w-6 h-6 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Failed to load</span>
          </div>
        )}
      </button>
    </div>
  );
}

// Difference item component
function DifferenceItem({ diff, isExpanded, onToggle }: {
  diff: VisualDifference;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const severityConfig = SEVERITY_CONFIG[diff.severity] || SEVERITY_CONFIG.info;
  const typeConfig = DIFF_TYPE_CONFIG[diff.type] || DIFF_TYPE_CONFIG.content;
  const SeverityIcon = severityConfig.icon;
  const TypeIcon = typeConfig.icon;

  return (
    <motion.div
      layout
      className={cn(
        'rounded-md border overflow-hidden transition-colors',
        diff.is_regression ? severityConfig.bgColor : 'bg-muted/30',
        diff.is_regression ? 'border-current/20' : 'border-border/50'
      )}
    >
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-start gap-2 text-left hover:bg-muted/50 transition-colors"
      >
        {/* Severity icon */}
        <div className={cn('flex-shrink-0 mt-0.5', severityConfig.color)}>
          <SeverityIcon className="w-3.5 h-3.5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Type badge */}
            <span className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-background/50',
              typeConfig.color
            )}>
              <TypeIcon className="w-2.5 h-2.5" />
              {typeConfig.label}
            </span>
            {/* Location */}
            <span className="text-[10px] text-muted-foreground">
              @ {diff.location}
            </span>
            {/* Regression badge */}
            {!diff.is_regression && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-500">
                Expected
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-foreground mt-1 line-clamp-2">
            {diff.description}
          </p>

          {/* Element if present */}
          {diff.element && !isExpanded && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              Element: {diff.element}
            </p>
          )}
        </div>

        {/* Expand icon */}
        <div className="flex-shrink-0 self-center text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 pt-0 border-t border-border/50">
              <div className="grid grid-cols-2 gap-2 mt-2">
                {diff.expected && (
                  <div>
                    <span className="text-[10px] text-muted-foreground font-medium">Expected:</span>
                    <p className="text-xs text-foreground bg-red-500/10 rounded p-1.5 mt-0.5">
                      {diff.expected}
                    </p>
                  </div>
                )}
                {diff.actual && (
                  <div>
                    <span className="text-[10px] text-muted-foreground font-medium">Actual:</span>
                    <p className="text-xs text-foreground bg-green-500/10 rounded p-1.5 mt-0.5">
                      {diff.actual}
                    </p>
                  </div>
                )}
              </div>
              {diff.element && (
                <div className="mt-2">
                  <span className="text-[10px] text-muted-foreground font-medium">Affected Element:</span>
                  <p className="text-xs font-mono text-foreground bg-muted rounded p-1.5 mt-0.5">
                    {diff.element}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export const VisualComparisonCard = memo(function VisualComparisonCard({
  data,
  onAction,
}: VisualComparisonCardProps) {
  const [expandedDiffs, setExpandedDiffs] = useState<Set<number>>(new Set());
  const [showAllDiffs, setShowAllDiffs] = useState(false);

  const {
    success,
    baseline_url,
    current_url,
    match,
    match_percentage,
    has_regressions,
    summary,
    differences = [],
    analysis_cost_usd,
    context,
    sensitivity,
    error,
  } = data;

  const toggleDiff = (index: number) => {
    setExpandedDiffs(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Error state
  if (!success || error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-red-500/30 bg-red-500/5 p-4"
      >
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-md bg-red-500/10">
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-red-500">Comparison Failed</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {error || 'An error occurred during visual comparison'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Calculate severity counts
  const severityCounts = {
    critical: differences.filter(d => d.severity === 'critical' && d.is_regression).length,
    major: differences.filter(d => d.severity === 'major' && d.is_regression).length,
    minor: differences.filter(d => d.severity === 'minor' && d.is_regression).length,
    info: differences.filter(d => d.severity === 'info' || !d.is_regression).length,
  };

  const visibleDiffs = showAllDiffs ? differences : differences.slice(0, 5);

  // Determine overall status color
  const statusColor = match && !has_regressions
    ? { border: 'border-green-500/30', bg: 'from-green-500/5 to-emerald-500/5', icon: 'text-green-500' }
    : has_regressions
    ? { border: 'border-red-500/30', bg: 'from-red-500/5 to-orange-500/5', icon: 'text-red-500' }
    : { border: 'border-yellow-500/30', bg: 'from-yellow-500/5 to-amber-500/5', icon: 'text-yellow-500' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-lg border-2 overflow-hidden',
        statusColor.border,
        `bg-gradient-to-br ${statusColor.bg}`
      )}
    >
      {/* Header */}
      <div className={cn('px-4 py-3 border-b', statusColor.border, 'bg-background/50')}>
        <div className="flex items-start gap-4">
          {/* Match gauge */}
          <MatchGauge percentage={match_percentage} />

          {/* Summary info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Eye className={cn('h-4 w-4', statusColor.icon)} />
              <h4 className="font-semibold text-sm">Visual Comparison</h4>
              {match && !has_regressions ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-500 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Match
                </span>
              ) : has_regressions ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-500 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Regressions
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/10 text-yellow-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Changes
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {summary}
            </p>

            {/* Severity badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {severityCounts.critical > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-500">
                  {severityCounts.critical} critical
                </span>
              )}
              {severityCounts.major > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/10 text-orange-500">
                  {severityCounts.major} major
                </span>
              )}
              {severityCounts.minor > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/10 text-yellow-500">
                  {severityCounts.minor} minor
                </span>
              )}
              {severityCounts.info > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500">
                  {severityCounts.info} info
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Screenshot comparison */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex gap-3">
          <ScreenshotPreview
            url={baseline_url}
            label="Baseline (Expected)"
            onClick={() => onAction?.('view_baseline', { url: baseline_url })}
          />
          <ScreenshotPreview
            url={current_url}
            label="Current (Actual)"
            onClick={() => onAction?.('view_current', { url: current_url })}
          />
        </div>

        {/* Context and sensitivity info */}
        {(context || sensitivity) && (
          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
            {sensitivity && (
              <span className="px-1.5 py-0.5 rounded bg-muted">
                Sensitivity: {sensitivity}
              </span>
            )}
            {context && (
              <span className="truncate">Context: {context}</span>
            )}
          </div>
        )}
      </div>

      {/* Differences list */}
      {differences.length > 0 && (
        <div className="px-4 py-3">
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center justify-between">
            <span>{differences.length} difference{differences.length !== 1 ? 's' : ''} detected</span>
            {differences.length > 5 && (
              <button
                onClick={() => setShowAllDiffs(!showAllDiffs)}
                className="text-primary hover:underline"
              >
                {showAllDiffs ? 'Show less' : `Show all ${differences.length}`}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {visibleDiffs.map((diff, index) => (
              <DifferenceItem
                key={index}
                diff={diff}
                isExpanded={expandedDiffs.has(index)}
                onToggle={() => toggleDiff(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* No differences */}
      {differences.length === 0 && match && (
        <div className="px-4 py-4 text-center">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-green-600">Perfect Match!</p>
          <p className="text-xs text-muted-foreground mt-1">
            No visual differences detected between screenshots
          </p>
        </div>
      )}

      {/* Cost info */}
      {analysis_cost_usd !== undefined && analysis_cost_usd > 0 && (
        <div className="px-4 py-1.5 border-t border-border/50 bg-muted/30 text-[10px] text-muted-foreground">
          Analysis cost: ${analysis_cost_usd.toFixed(4)}
        </div>
      )}

      {/* Actions */}
      <div className={cn('px-4 py-3 border-t flex items-center gap-2', statusColor.border, 'bg-background/50')}>
        <Button
          onClick={() => onAction?.('view_baseline', { url: baseline_url })}
          size="sm"
          variant="outline"
          className="gap-1.5"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View Baseline
        </Button>
        <Button
          onClick={() => onAction?.('view_current', { url: current_url })}
          size="sm"
          variant="outline"
          className="gap-1.5"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View Current
        </Button>
        {has_regressions && (
          <Button
            onClick={() => onAction?.('create_issue', data)}
            size="sm"
            className="gap-1.5 bg-red-500 hover:bg-red-600 text-white"
          >
            <Bug className="h-3.5 w-3.5" />
            Report Issue
          </Button>
        )}
        {!has_regressions && differences.length > 0 && (
          <Button
            onClick={() => onAction?.('approve_changes', data)}
            size="sm"
            className="gap-1.5 bg-green-500 hover:bg-green-600 text-white"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Approve Changes
          </Button>
        )}
      </div>
    </motion.div>
  );
});

export default VisualComparisonCard;
