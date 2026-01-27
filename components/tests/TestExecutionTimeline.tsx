'use client';

import { memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Test status types
export type TestStatus = 'passed' | 'failed' | 'running' | 'pending';

// Individual test node in the timeline
export interface TestNode {
  id: string;
  number: number;
  name: string;
  status: TestStatus;
  durationMs?: number;
}

interface TestExecutionTimelineProps {
  tests: TestNode[];
  onTestClick?: (testId: string, index: number) => void;
  className?: string;
}

// Status colors for nodes and connectors
const statusColors: Record<TestStatus, { bg: string; border: string; text: string }> = {
  passed: { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-500' },
  failed: { bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-500' },
  running: { bg: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-yellow-500' },
  pending: { bg: 'bg-gray-400', border: 'border-gray-400', text: 'text-gray-400' },
};

// Status icons mapping
const statusIcons: Record<TestStatus, typeof CheckCircle2> = {
  passed: CheckCircle2,
  failed: XCircle,
  running: Loader2,
  pending: Circle,
};

// Format duration for display
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

// Single test node component
const TestNodeMarker = memo(function TestNodeMarker({
  test,
  index,
  onClick,
}: {
  test: TestNode;
  index: number;
  onClick?: () => void;
}) {
  const { bg, border, text } = statusColors[test.status];
  const Icon = statusIcons[test.status];
  const isRunning = test.status === 'running';

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center group',
        onClick && 'cursor-pointer'
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Test ${test.number}: ${test.name} - ${test.status}`}
    >
      {/* Pulsing indicator for running tests */}
      {isRunning && (
        <motion.div
          className="absolute -inset-2 rounded-full bg-yellow-500/30"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.2, 0.5],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Node circle */}
      <div
        className={cn(
          'relative z-10 w-8 h-8 rounded-full flex items-center justify-center',
          'border-2 bg-background transition-all duration-200',
          border,
          test.status === 'passed' && 'bg-green-500/10',
          test.status === 'failed' && 'bg-red-500/10',
          test.status === 'running' && 'bg-yellow-500/10',
          test.status === 'pending' && 'bg-gray-500/5'
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4',
            text,
            isRunning && 'animate-spin'
          )}
        />
      </div>

      {/* Test number below node */}
      <span
        className={cn(
          'mt-1 text-xs font-medium',
          text
        )}
      >
        {test.number}
      </span>

      {/* Status indicator symbol */}
      <span className={cn('text-xs', text)}>
        {test.status === 'passed' && '\u2713'}
        {test.status === 'failed' && '\u2717'}
        {test.status === 'running' && '\u25CB'}
        {test.status === 'pending' && '\u2014'}
      </span>

      {/* Hover tooltip */}
      <div
        className={cn(
          'absolute top-full mt-6 px-3 py-2 rounded-lg text-xs',
          'bg-popover border shadow-lg z-20',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
          'whitespace-nowrap pointer-events-none'
        )}
      >
        <p className="font-medium">{test.name}</p>
        <p className={cn('capitalize', text)}>{test.status}</p>
        {test.durationMs !== undefined && (
          <p className="text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" />
            {formatDuration(test.durationMs)}
          </p>
        )}
      </div>
    </motion.button>
  );
});

// Connection line between nodes
const NodeConnection = memo(function NodeConnection({
  fromStatus,
  toStatus,
  index,
}: {
  fromStatus: TestStatus;
  toStatus: TestStatus;
  index: number;
}) {
  // Determine line color based on the statuses
  const getLineColor = () => {
    if (fromStatus === 'passed' && (toStatus === 'passed' || toStatus === 'running')) {
      return 'bg-green-500';
    }
    if (fromStatus === 'passed' && toStatus === 'failed') {
      return 'bg-green-500';
    }
    if (fromStatus === 'failed') {
      return 'bg-red-500';
    }
    if (fromStatus === 'running') {
      return 'bg-yellow-500';
    }
    return 'bg-gray-300';
  };

  const lineColor = getLineColor();
  const isActive = fromStatus === 'running';

  return (
    <div className="w-8 h-0.5 mx-0.5 relative overflow-hidden">
      {/* Background line */}
      <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-full" />

      {/* Colored progress line */}
      <motion.div
        className={cn('absolute inset-y-0 left-0 rounded-full', lineColor)}
        initial={{ width: '0%' }}
        animate={{ width: fromStatus !== 'pending' ? '100%' : '0%' }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      />

      {/* Animated pulse for active connection */}
      {isActive && (
        <motion.div
          className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-full"
          animate={{
            x: [0, 32, 0],
            opacity: [0, 0.7, 0],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </div>
  );
});

export function TestExecutionTimeline({
  tests,
  onTestClick,
  className,
}: TestExecutionTimelineProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    const passed = tests.filter((t) => t.status === 'passed').length;
    const failed = tests.filter((t) => t.status === 'failed').length;
    const running = tests.filter((t) => t.status === 'running').length;
    const pending = tests.filter((t) => t.status === 'pending').length;

    const completedTests = tests.filter(
      (t) => t.durationMs !== undefined && (t.status === 'passed' || t.status === 'failed')
    );
    const totalDurationMs = completedTests.reduce((sum, t) => sum + (t.durationMs || 0), 0);
    const averageDurationMs = completedTests.length > 0 ? totalDurationMs / completedTests.length : 0;

    return { passed, failed, running, pending, totalDurationMs, averageDurationMs };
  }, [tests]);

  const handleTestClick = useCallback(
    (testId: string, index: number) => {
      if (onTestClick) {
        onTestClick(testId, index);
      }
    },
    [onTestClick]
  );

  if (tests.length === 0) {
    return (
      <div className={cn('border rounded-lg p-4', className)}>
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Clock className="h-5 w-5 mr-2" />
          <span className="text-sm">No tests to display</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <h3 className="text-sm font-medium">Test Execution Timeline</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-green-500">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {stats.passed}
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <XCircle className="h-3.5 w-3.5" />
            {stats.failed}
          </span>
          {stats.running > 0 && (
            <span className="flex items-center gap-1 text-yellow-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {stats.running}
            </span>
          )}
          {stats.pending > 0 && (
            <span className="flex items-center gap-1 text-gray-400">
              <Circle className="h-3.5 w-3.5" />
              {stats.pending}
            </span>
          )}
        </div>
      </div>

      {/* Timeline visualization */}
      <div className="p-4 overflow-x-auto">
        <div className="flex items-center min-w-max">
          {tests.map((test, index) => (
            <div key={test.id} className="flex items-center">
              <TestNodeMarker
                test={test}
                index={index}
                onClick={onTestClick ? () => handleTestClick(test.id, index) : undefined}
              />
              {index < tests.length - 1 && (
                <NodeConnection
                  fromStatus={test.status}
                  toStatus={tests[index + 1].status}
                  index={index}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer with duration stats */}
      <div className="px-4 py-3 border-t bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Total Duration:</span>
            <span className="font-medium text-foreground">
              {stats.totalDurationMs > 0 ? formatDuration(stats.totalDurationMs) : '--'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span>Average per Test:</span>
            <span className="font-medium text-foreground">
              {stats.averageDurationMs > 0 ? formatDuration(stats.averageDurationMs) : '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestExecutionTimeline;
