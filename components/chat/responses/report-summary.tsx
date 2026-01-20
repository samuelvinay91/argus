'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Download,
  Share2,
  Calendar,
  Clock,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReportSummaryProps {
  data: {
    period: string;
    date_range: {
      from: string;
      to: string;
    };
    summary: {
      total_tests: number;
      passed_tests: number;
      failed_tests: number;
      skipped_tests?: number;
      pass_rate: number;
      duration_ms?: number;
    };
    content?: {
      test_runs?: Array<{
        id: string;
        name?: string;
        status: string;
        created_at: string;
      }>;
      daily_stats?: Array<{
        date: string;
        runs: number;
        passed: number;
        failed: number;
      }>;
    };
    format: string;
    _actions?: string[];
  };
  onAction?: (action: string) => void;
}

// Mini bar chart for daily stats
function MiniBarChart({ data }: {
  data: Array<{ date: string; passed: number; failed: number }>;
}) {
  const maxValue = Math.max(...data.flatMap(d => [d.passed, d.failed]), 1);

  return (
    <div className="flex items-end gap-0.5 h-12">
      {data.slice(-14).map((day, idx) => {
        const passedHeight = (day.passed / maxValue) * 100;
        const failedHeight = (day.failed / maxValue) * 100;
        const date = new Date(day.date);
        const isToday = date.toDateString() === new Date().toDateString();

        return (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center gap-px"
            title={`${date.toLocaleDateString()}: ${day.passed} passed, ${day.failed} failed`}
          >
            <div
              className={cn(
                'w-full rounded-t-sm transition-all',
                day.failed > 0 ? 'bg-red-500/80' : 'bg-transparent'
              )}
              style={{ height: `${failedHeight}%`, minHeight: day.failed > 0 ? 2 : 0 }}
            />
            <div
              className={cn(
                'w-full rounded-t-sm transition-all',
                isToday ? 'bg-primary' : 'bg-green-500/70'
              )}
              style={{ height: `${passedHeight}%`, minHeight: day.passed > 0 ? 2 : 0 }}
            />
          </div>
        );
      })}
    </div>
  );
}

// Stat card component
function StatCard({ label, value, icon: Icon, color, trend }: {
  label: string;
  value: number | string;
  icon: typeof CheckCircle;
  color: string;
  trend?: { direction: 'up' | 'down'; value: string };
}) {
  return (
    <div className={cn('p-3 rounded-lg', color)}>
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 opacity-70" />
        {trend && (
          <span className={cn(
            'text-[10px] flex items-center gap-0.5',
            trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
          )}>
            {trend.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}
          </span>
        )}
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs opacity-70">{label}</div>
      </div>
    </div>
  );
}

export const ReportSummaryCard = memo(function ReportSummaryCard({
  data,
  onAction,
}: ReportSummaryProps) {
  const { period, date_range, summary, content } = data;

  // Format duration
  const formattedDuration = useMemo(() => {
    if (!summary.duration_ms) return null;
    const seconds = Math.round(summary.duration_ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }, [summary.duration_ms]);

  // Format date range
  const formattedDateRange = useMemo(() => {
    const from = new Date(date_range.from);
    const to = new Date(date_range.to);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

    if (from.toDateString() === to.toDateString()) {
      return from.toLocaleDateString('en-US', { ...options, year: 'numeric' });
    }

    return `${from.toLocaleDateString('en-US', options)} - ${to.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
  }, [date_range]);

  // Pass rate color
  const passRateColor = summary.pass_rate >= 90
    ? 'text-green-500'
    : summary.pass_rate >= 70
    ? 'text-yellow-500'
    : 'text-red-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-purple-500/20 bg-purple-500/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-purple-500/20">
            <FileText className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Test Report</h4>
            <p className="text-[10px] text-muted-foreground">
              {formattedDateRange} ({period})
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className={cn('text-2xl font-bold', passRateColor)}>
            {summary.pass_rate.toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground">Pass Rate</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4 grid grid-cols-4 gap-2">
        <StatCard
          label="Total Tests"
          value={summary.total_tests}
          icon={BarChart3}
          color="bg-slate-500/10 text-slate-600 dark:text-slate-400"
        />
        <StatCard
          label="Passed"
          value={summary.passed_tests}
          icon={CheckCircle}
          color="bg-green-500/10 text-green-600"
        />
        <StatCard
          label="Failed"
          value={summary.failed_tests}
          icon={XCircle}
          color="bg-red-500/10 text-red-600"
        />
        <StatCard
          label="Skipped"
          value={summary.skipped_tests || 0}
          icon={AlertTriangle}
          color="bg-yellow-500/10 text-yellow-600"
        />
      </div>

      {/* Mini Chart - Daily Stats */}
      {content?.daily_stats && content.daily_stats.length > 0 && (
        <div className="px-4 pb-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Daily Trend (last 14 days)
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <MiniBarChart data={content.daily_stats} />
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
              <span>14 days ago</span>
              <span>Today</span>
            </div>
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="px-4 pb-3 flex items-center gap-4 text-xs text-muted-foreground">
        {formattedDuration && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Total duration: {formattedDuration}
          </span>
        )}
        {content?.test_runs && (
          <span className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            {content.test_runs.length} test runs
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 border-t border-purple-500/20 bg-purple-500/5 flex items-center gap-2">
        <Button
          onClick={() => onAction?.('download_report')}
          size="sm"
          className="bg-purple-500 hover:bg-purple-600 text-white gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
        <Button
          onClick={() => onAction?.('share_report')}
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
        <Button
          onClick={() => onAction?.('schedule_report')}
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

export default ReportSummaryCard;
