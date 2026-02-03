'use client';

/**
 * TestResultsPanel - Live test execution panel
 *
 * Displays real-time test execution progress with:
 * - Progress bar with percentage
 * - Pass/fail/skip counts with colors
 * - Collapsible failure details
 * - Individual test list with status icons
 */

import * as React from 'react';
import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  CircleDashed,
  ChevronDown,
  ChevronRight,
  Play,
  Clock,
  FileText,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../glass';

// =============================================================================
// TYPES
// =============================================================================

export interface TestItem {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'running' | 'pending';
  duration?: number;
  error?: string;
  stackTrace?: string;
}

export interface TestRun {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  passed: number;
  failed: number;
  skipped: number;
  tests: TestItem[];
  startedAt?: string;
  duration?: number;
}

export interface TestResultsPanelProps {
  testRun: TestRun;
  onViewDetails?: (testId: string) => void;
  onViewFullReport?: () => void;
  className?: string;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const StatusIcon = memo(function StatusIcon({
  status,
  size = 16,
}: {
  status: TestItem['status'];
  size?: number;
}) {
  switch (status) {
    case 'passed':
      return <CheckCircle2 size={size} className="text-emerald-400" />;
    case 'failed':
      return <XCircle size={size} className="text-red-400" />;
    case 'skipped':
      return <CircleDashed size={size} className="text-yellow-400" />;
    case 'running':
      return <Loader2 size={size} className="text-blue-400 animate-spin" />;
    case 'pending':
      return <Clock size={size} className="text-white/40" />;
  }
});

const ProgressBar = memo(function ProgressBar({
  progress,
  passed,
  failed,
  total,
}: {
  progress: number;
  passed: number;
  failed: number;
  total: number;
}) {
  const passedPercent = total > 0 ? (passed / total) * 100 : 0;
  const failedPercent = total > 0 ? (failed / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/60">Progress</span>
        <span className="text-white font-medium">{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full flex">
          <motion.div
            className="bg-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${passedPercent}%` }}
            transition={{ duration: 0.3 }}
          />
          <motion.div
            className="bg-red-500"
            initial={{ width: 0 }}
            animate={{ width: `${failedPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
});

const StatBadge = memo(function StatBadge({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: 'emerald' | 'red' | 'yellow';
}) {
  const colorClasses = {
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg border',
        colorClasses[color]
      )}
    >
      <span className="text-lg font-semibold">{count}</span>
      <span className="text-sm opacity-80">{label}</span>
    </div>
  );
});

const TestItemRow = memo(function TestItemRow({
  test,
  onViewDetails,
}: {
  test: TestItem;
  onViewDetails?: (testId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasError = test.status === 'failed' && (test.error || test.stackTrace);

  return (
    <div className="border-b border-white/5 last:border-0">
      <div
        className={cn(
          'flex items-center gap-3 py-2 px-3 hover:bg-white/5 transition-colors',
          hasError && 'cursor-pointer'
        )}
        onClick={() => hasError && setIsExpanded(!isExpanded)}
      >
        <StatusIcon status={test.status} />
        <span className="flex-1 text-sm text-white/80 truncate">{test.name}</span>
        {test.duration !== undefined && (
          <span className="text-xs text-white/40">{test.duration}ms</span>
        )}
        {hasError && (
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
            <ChevronRight size={14} className="text-white/40" />
          </motion.div>
        )}
        {onViewDetails && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(test.id);
            }}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <FileText size={14} className="text-white/40" />
          </button>
        )}
      </div>
      <AnimatePresence>
        {isExpanded && hasError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pl-10">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    {test.error && (
                      <p className="text-sm text-red-300 break-words">{test.error}</p>
                    )}
                    {test.stackTrace && (
                      <pre className="mt-2 text-xs text-white/50 font-mono overflow-x-auto whitespace-pre-wrap">
                        {test.stackTrace}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// =============================================================================
// LOADING SKELETON
// =============================================================================

const TestResultsSkeleton = memo(function TestResultsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-24 bg-white/10 rounded-lg" />
        ))}
      </div>
      <div className="h-2 bg-white/10 rounded-full" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 bg-white/5 rounded" />
        ))}
      </div>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const TestResultsPanel = memo(function TestResultsPanel({
  testRun,
  onViewDetails,
  onViewFullReport,
  className,
}: TestResultsPanelProps) {
  const [showAllTests, setShowAllTests] = useState(false);
  const total = testRun.passed + testRun.failed + testRun.skipped;
  const visibleTests = showAllTests ? testRun.tests : testRun.tests.slice(0, 5);
  const hasMoreTests = testRun.tests.length > 5;

  // Separate failures for quick access
  const failures = testRun.tests.filter((t) => t.status === 'failed');

  return (
    <GlassCard variant="medium" padding="none" className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Play size={16} className="text-indigo-400" />
          <h3 className="text-sm font-medium text-white">Test Results</h3>
          {testRun.status === 'running' && (
            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
              Running
            </span>
          )}
        </div>
        {onViewFullReport && (
          <button
            onClick={onViewFullReport}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View Full Report
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="flex flex-wrap gap-2">
          <StatBadge count={testRun.passed} label="Passed" color="emerald" />
          <StatBadge count={testRun.failed} label="Failed" color="red" />
          <StatBadge count={testRun.skipped} label="Skipped" color="yellow" />
        </div>

        {/* Progress */}
        <ProgressBar
          progress={testRun.progress}
          passed={testRun.passed}
          failed={testRun.failed}
          total={total}
        />

        {/* Failures Section (if any) */}
        {failures.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-red-500/10">
              <XCircle size={14} className="text-red-400" />
              <span className="text-sm font-medium text-red-300">
                {failures.length} Failed Test{failures.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {failures.map((test) => (
                <TestItemRow key={test.id} test={test} onViewDetails={onViewDetails} />
              ))}
            </div>
          </div>
        )}

        {/* All Tests List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/50 uppercase tracking-wide">All Tests</span>
            <span className="text-xs text-white/40">
              {testRun.tests.length} total
            </span>
          </div>
          <div className="bg-white/5 rounded-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {visibleTests.map((test) => (
                <TestItemRow key={test.id} test={test} onViewDetails={onViewDetails} />
              ))}
            </div>
            {hasMoreTests && (
              <button
                onClick={() => setShowAllTests(!showAllTests)}
                className="w-full flex items-center justify-center gap-1 py-2 text-sm text-white/60 hover:text-white/80 hover:bg-white/5 transition-colors"
              >
                <ChevronDown
                  size={14}
                  className={cn('transition-transform', showAllTests && 'rotate-180')}
                />
                {showAllTests
                  ? 'Show Less'
                  : `Show ${testRun.tests.length - 5} More`}
              </button>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
});

export { TestResultsSkeleton };
export default TestResultsPanel;
