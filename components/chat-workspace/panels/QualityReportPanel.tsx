'use client';

/**
 * QualityReportPanel - Quality metrics display
 *
 * Displays quality metrics including:
 * - Large circular score gauge (0-100)
 * - Trend indicator (up/down from last)
 * - Metric bars: Coverage, Flaky Rate, Pass Rate
 * - Recommendations section
 * - Export/Share buttons
 */

import * as React from 'react';
import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Download,
  Share2,
  Lightbulb,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../glass';

// =============================================================================
// TYPES
// =============================================================================

export interface QualityMetrics {
  score: number;
  trend: number; // Positive = up, negative = down, 0 = stable
  coverage: number;
  flakyRate: number;
  passRate: number;
  recommendations: string[];
  lastUpdated?: string;
}

export interface QualityReportPanelProps {
  report: QualityMetrics;
  onExport?: () => void;
  onShare?: () => void;
  className?: string;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const ScoreGauge = memo(function ScoreGauge({
  score,
  trend,
}: {
  score: number;
  trend: number;
}) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 80) return { stroke: '#22c55e', text: 'text-emerald-400', bg: 'from-emerald-500/20' };
    if (score >= 60) return { stroke: '#f59e0b', text: 'text-amber-400', bg: 'from-amber-500/20' };
    return { stroke: '#ef4444', text: 'text-red-400', bg: 'from-red-500/20' };
  };

  const colors = getScoreColor(score);

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-white/40';

  return (
    <div className="relative flex flex-col items-center">
      <svg width="140" height="140" className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="70"
          cy="70"
          r="45"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="10"
          fill="none"
        />
        {/* Progress circle */}
        <motion.circle
          cx="70"
          cy="70"
          r="45"
          stroke={colors.stroke}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={cn('text-4xl font-bold', colors.text)}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-white/50 mt-1">Quality Score</span>
      </div>
      {/* Trend indicator */}
      <div className={cn('flex items-center gap-1 mt-2', trendColor)}>
        <TrendIcon size={14} />
        <span className="text-sm">
          {trend > 0 ? '+' : ''}{trend}% from last
        </span>
      </div>
    </div>
  );
});

const MetricBar = memo(function MetricBar({
  label,
  value,
  icon: Icon,
  color,
  inverted = false,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: 'emerald' | 'amber' | 'red' | 'blue';
  inverted?: boolean; // For metrics where lower is better (like flaky rate)
}) {
  const colorClasses = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
  };

  const iconColorClasses = {
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
  };

  // Determine the display color based on whether this metric is inverted
  const displayValue = inverted ? 100 - value : value;
  const displayColor = inverted
    ? (value <= 5 ? 'emerald' : value <= 15 ? 'amber' : 'red')
    : (value >= 80 ? 'emerald' : value >= 60 ? 'amber' : 'red');

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} className={iconColorClasses[color]} />
          <span className="text-sm text-white/70">{label}</span>
        </div>
        <span className="text-sm font-medium text-white">{value}%</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', colorClasses[displayColor])}
          initial={{ width: 0 }}
          animate={{ width: `${inverted ? displayValue : value}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
});

const RecommendationItem = memo(function RecommendationItem({
  text,
  index,
}: {
  text: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-start gap-2 text-sm"
    >
      <Lightbulb size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
      <span className="text-white/70">{text}</span>
    </motion.div>
  );
});

// =============================================================================
// LOADING SKELETON
// =============================================================================

const QualityReportSkeleton = memo(function QualityReportSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-center">
        <div className="w-36 h-36 rounded-full bg-white/10" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 bg-white/10 rounded w-1/3" />
            <div className="h-1.5 bg-white/10 rounded-full" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-6 bg-white/5 rounded" />
        ))}
      </div>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const QualityReportPanel = memo(function QualityReportPanel({
  report,
  onExport,
  onShare,
  className,
}: QualityReportPanelProps) {
  return (
    <GlassCard variant="medium" padding="none" className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-indigo-400" />
          <h3 className="text-sm font-medium text-white">Quality Report</h3>
        </div>
        <div className="flex items-center gap-1">
          {onExport && (
            <button
              onClick={onExport}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Export report"
            >
              <Download size={14} className="text-white/60" />
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Share report"
            >
              <Share2 size={14} className="text-white/60" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Score Gauge */}
        <ScoreGauge score={report.score} trend={report.trend} />

        {/* Metrics */}
        <div className="space-y-3">
          <MetricBar
            label="Test Coverage"
            value={report.coverage}
            icon={Target}
            color="blue"
          />
          <MetricBar
            label="Pass Rate"
            value={report.passRate}
            icon={CheckCircle2}
            color="emerald"
          />
          <MetricBar
            label="Flaky Rate"
            value={report.flakyRate}
            icon={AlertTriangle}
            color="amber"
            inverted
          />
        </div>

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-white/40" />
              <span className="text-xs text-white/50 uppercase tracking-wide">
                Recommendations
              </span>
            </div>
            <div className="space-y-2 bg-white/5 rounded-lg p-3">
              {report.recommendations.map((rec, i) => (
                <RecommendationItem key={i} text={rec} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        {report.lastUpdated && (
          <div className="text-xs text-white/30 text-center">
            Last updated: {new Date(report.lastUpdated).toLocaleString()}
          </div>
        )}
      </div>
    </GlassCard>
  );
});

export { QualityReportSkeleton };
export default QualityReportPanel;
