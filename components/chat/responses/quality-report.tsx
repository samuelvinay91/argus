'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Zap,
  Search,
  Check,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Download,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QualityScore {
  name: string;
  value: number;
  icon: typeof Shield;
  color: string;
  bgColor: string;
}

interface QualityReportCardProps {
  data: {
    url: string;
    scores: {
      accessibility: number;
      performance: number;
      seo: number;
      best_practices: number;
      overall?: number;
    };
    issues?: Array<{
      type: string;
      severity: string;
      message: string;
      element?: string;
    }>;
    recommendations?: Array<{
      category: string;
      title: string;
      impact: string;
    }>;
    _actions?: string[];
  };
  onAction?: (action: string) => void;
}

// Score color based on value
function getScoreColor(value: number): { color: string; bgColor: string; ring: string } {
  if (value >= 90) return { color: 'text-green-500', bgColor: 'bg-green-500/10', ring: 'ring-green-500/30' };
  if (value >= 70) return { color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', ring: 'ring-yellow-500/30' };
  if (value >= 50) return { color: 'text-orange-500', bgColor: 'bg-orange-500/10', ring: 'ring-orange-500/30' };
  return { color: 'text-red-500', bgColor: 'bg-red-500/10', ring: 'ring-red-500/30' };
}

// Circular progress gauge component
function ScoreGauge({ score, label, icon: Icon, size = 'md' }: {
  score: number;
  label: string;
  icon: typeof Shield;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { color, bgColor, ring } = getScoreColor(score);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  const sizes = {
    sm: { container: 'w-16 h-16', text: 'text-lg', label: 'text-[10px]', icon: 'w-3 h-3' },
    md: { container: 'w-20 h-20', text: 'text-xl', label: 'text-xs', icon: 'w-4 h-4' },
    lg: { container: 'w-24 h-24', text: 'text-2xl', label: 'text-sm', icon: 'w-5 h-5' },
  };

  const s = sizes[size];

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn('relative', s.container)}>
        {/* Background ring */}
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="40%"
            fill="none"
            strokeWidth="6"
            className="stroke-muted"
          />
          {/* Progress ring */}
          <motion.circle
            cx="50%"
            cy="50%"
            r="40%"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className={cn('stroke-current', color)}
            style={{
              strokeDasharray: circumference,
            }}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className={cn(s.icon, color)} />
          <span className={cn('font-bold', s.text, color)}>{score}</span>
        </div>
      </div>
      <span className={cn('text-muted-foreground font-medium', s.label)}>{label}</span>
    </div>
  );
}

// Issue badge component
function IssueBadge({ type, severity }: { type: string; severity: string }) {
  const severityConfig: Record<string, { icon: typeof Check; color: string }> = {
    error: { icon: XCircle, color: 'text-red-500 bg-red-500/10' },
    warning: { icon: AlertTriangle, color: 'text-yellow-500 bg-yellow-500/10' },
    info: { icon: Check, color: 'text-blue-500 bg-blue-500/10' },
  };

  const config = severityConfig[severity] || severityConfig.info;
  const Icon = config.icon;

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium', config.color)}>
      <Icon className="w-3 h-3" />
      {type}
    </span>
  );
}

export const QualityReportCard = memo(function QualityReportCard({
  data,
  onAction,
}: QualityReportCardProps) {
  const { url, scores, issues = [], recommendations = [] } = data;

  const overall = scores.overall ?? Math.round(
    (scores.accessibility + scores.performance + scores.seo + scores.best_practices) / 4
  );
  const overallColors = getScoreColor(overall);

  const scoreItems: QualityScore[] = [
    { name: 'Accessibility', value: scores.accessibility, icon: Shield, ...getScoreColor(scores.accessibility) },
    { name: 'Performance', value: scores.performance, icon: Zap, ...getScoreColor(scores.performance) },
    { name: 'SEO', value: scores.seo, icon: Search, ...getScoreColor(scores.seo) },
    { name: 'Best Practices', value: scores.best_practices, icon: Check, ...getScoreColor(scores.best_practices) },
  ];

  const criticalIssues = issues.filter(i => i.severity === 'error');
  const warningIssues = issues.filter(i => i.severity === 'warning');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-primary/20 bg-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-md', overallColors.bgColor)}>
            <Shield className={cn('h-4 w-4', overallColors.color)} />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Quality Audit Report</h4>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              {url.length > 40 ? `${url.substring(0, 40)}...` : url}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
        <div className="text-right">
          <div className={cn('text-2xl font-bold', overallColors.color)}>{overall}</div>
          <div className="text-[10px] text-muted-foreground">Overall Score</div>
        </div>
      </div>

      {/* Score Gauges */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-4 gap-2">
          {scoreItems.map((item) => (
            <ScoreGauge
              key={item.name}
              score={item.value}
              label={item.name}
              icon={item.icon}
              size="sm"
            />
          ))}
        </div>
      </div>

      {/* Issues Summary */}
      {issues.length > 0 && (
        <div className="px-4 pb-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Issues Found ({issues.length})
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {issues.slice(0, 5).map((issue, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs bg-background/50 rounded p-2"
              >
                <IssueBadge type={issue.type} severity={issue.severity} />
                <span className="flex-1 text-muted-foreground">{issue.message}</span>
              </div>
            ))}
            {issues.length > 5 && (
              <button className="text-xs text-primary hover:underline">
                +{issues.length - 5} more issues
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="px-4 py-2 bg-muted/30 flex items-center gap-4 text-xs">
        {criticalIssues.length > 0 && (
          <span className="flex items-center gap-1 text-red-500">
            <XCircle className="w-3 h-3" />
            {criticalIssues.length} critical
          </span>
        )}
        {warningIssues.length > 0 && (
          <span className="flex items-center gap-1 text-yellow-500">
            <AlertTriangle className="w-3 h-3" />
            {warningIssues.length} warnings
          </span>
        )}
        {recommendations.length > 0 && (
          <span className="flex items-center gap-1 text-blue-500">
            {recommendations.length} recommendations
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 border-t border-primary/20 bg-primary/5 flex items-center gap-2">
        <Button
          onClick={() => onAction?.('view_details')}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
        >
          <Search className="h-3.5 w-3.5" />
          View Details
        </Button>
        <Button
          onClick={() => onAction?.('export_report')}
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
        <Button
          onClick={() => onAction?.('schedule_audit')}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
        >
          <Calendar className="h-3.5 w-3.5" />
          Schedule
        </Button>
      </div>
    </motion.div>
  );
});

export default QualityReportCard;
