'use client';

import { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  List,
  Play,
  Edit,
  Clock,
  Tag,
  Search,
  ChevronRight,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TestItem {
  id: string;
  name: string;
  description: string;
  tags: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  is_active: boolean;
  step_count: number;
  last_run?: {
    status: 'passed' | 'failed';
    date: string;
  };
}

interface TestListCardProps {
  data: {
    tests: TestItem[];
    total: number;
    _actions?: string[];
  };
  onAction?: (action: string, data: unknown) => void;
}

// Priority badge colors
const priorityConfig: Record<string, { color: string; bg: string }> = {
  critical: { color: 'text-red-600', bg: 'bg-red-500/10' },
  high: { color: 'text-orange-600', bg: 'bg-orange-500/10' },
  medium: { color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
  low: { color: 'text-slate-600', bg: 'bg-slate-500/10' },
};

// Single test item row
function TestItemRow({
  test,
  onAction,
  isSelected,
  onClick,
}: {
  test: TestItem;
  onAction?: (action: string, data: unknown) => void;
  isSelected: boolean;
  onClick: () => void;
}) {
  const priority = priorityConfig[test.priority] || priorityConfig.medium;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className={cn(
        'px-3 py-2.5 cursor-pointer transition-colors border-l-2',
        isSelected
          ? 'bg-primary/10 border-l-primary'
          : 'hover:bg-muted/50 border-l-transparent'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div className={cn(
          'w-2 h-2 rounded-full flex-shrink-0',
          test.is_active ? 'bg-green-500' : 'bg-muted-foreground'
        )} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h5 className="font-medium text-sm truncate">{test.name}</h5>
            {test.last_run && (
              <span className={cn(
                'text-[10px]',
                test.last_run.status === 'passed' ? 'text-green-500' : 'text-red-500'
              )}>
                {test.last_run.status === 'passed' ? <CheckCircle className="h-3 w-3 inline" /> : <XCircle className="h-3 w-3 inline" />}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', priority.bg, priority.color)}>
              {test.priority}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {test.step_count} steps
            </span>
            {test.tags.length > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Tag className="h-2.5 w-2.5" />
                {test.tags.slice(0, 2).join(', ')}
                {test.tags.length > 2 && ` +${test.tags.length - 2}`}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onAction?.('run_test', test);
            }}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
          >
            <Play className="h-3.5 w-3.5 text-green-500" />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onAction?.('schedule_test', test);
            }}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
          >
            <Clock className="h-3.5 w-3.5 text-blue-500" />
          </Button>
        </div>

        <ChevronRight className={cn(
          'h-4 w-4 text-muted-foreground transition-transform',
          isSelected && 'rotate-90'
        )} />
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isSelected && test.description && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="text-xs text-muted-foreground mt-2 pl-5">
              {test.description}
            </p>
            <div className="flex items-center gap-2 mt-2 pl-5">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onAction?.('run_test', test);
                }}
                size="sm"
                className="h-7 text-xs bg-primary"
              >
                <Play className="h-3 w-3 mr-1" />
                Run Test
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onAction?.('edit_test', test);
                }}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export const TestListCard = memo(function TestListCard({
  data,
  onAction,
}: TestListCardProps) {
  const { tests, total } = data;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tests based on search
  const filteredTests = useMemo(() => {
    if (!searchQuery) return tests;
    const query = searchQuery.toLowerCase();
    return tests.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [tests, searchQuery]);

  // Stats
  const activeCount = tests.filter(t => t.is_active).length;
  const recentPassCount = tests.filter(t => t.last_run?.status === 'passed').length;

  if (tests.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-muted p-6 text-center">
        <List className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <h4 className="font-medium text-sm">No Tests Found</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Create your first test to get started
        </p>
        <Button
          onClick={() => onAction?.('create_test', {})}
          size="sm"
          className="mt-3"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          Create Test
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">Tests</h4>
            <span className="text-xs text-muted-foreground">({total})</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {activeCount} active
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {recentPassCount} passing
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tests..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Test List */}
      <div className="divide-y max-h-[300px] overflow-y-auto group">
        {filteredTests.map((test) => (
          <TestItemRow
            key={test.id}
            test={test}
            onAction={onAction}
            isSelected={selectedId === test.id}
            onClick={() => setSelectedId(selectedId === test.id ? null : test.id)}
          />
        ))}
      </div>

      {/* Footer */}
      {total > tests.length && (
        <div className="px-4 py-2 border-t bg-muted/20 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Showing {tests.length} of {total} tests
          </span>
          <button
            onClick={() => onAction?.('view_all_tests', {})}
            className="text-xs text-primary hover:underline"
          >
            View all
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t bg-muted/30 flex items-center gap-2">
        <Button
          onClick={() => onAction?.('create_test', {})}
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
        >
          <Sparkles className="h-3 w-3" />
          Create
        </Button>
        <Button
          onClick={() => onAction?.('run_all_tests', {})}
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
        >
          <Play className="h-3 w-3" />
          Run All
        </Button>
        <Button
          onClick={() => onAction?.('bulk_schedule', {})}
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1 ml-auto"
        >
          <Calendar className="h-3 w-3" />
          Schedule
        </Button>
      </div>
    </motion.div>
  );
});

// Test Runs Card - for displaying test run history
interface TestRunItem {
  id: string;
  test_id?: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
}

interface TestRunsCardProps {
  data: {
    runs: TestRunItem[];
    summary: {
      total: number;
      passed: number;
      failed: number;
      pass_rate: number;
    };
    period: string;
    _actions?: string[];
  };
  onAction?: (action: string, data: unknown) => void;
}

export const TestRunsCard = memo(function TestRunsCard({
  data,
  onAction,
}: TestRunsCardProps) {
  const { runs, summary, period } = data;

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  // Format relative time
  const formatRelativeTime = (isoDate?: string) => {
    if (!isoDate) return '-';
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border bg-card overflow-hidden"
    >
      {/* Header with Summary */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">Test Runs</h4>
            <span className="text-xs text-muted-foreground">({period})</span>
          </div>
          <div className={cn(
            'text-lg font-bold',
            summary.pass_rate >= 90 ? 'text-green-500' :
            summary.pass_rate >= 70 ? 'text-yellow-500' : 'text-red-500'
          )}>
            {summary.pass_rate.toFixed(0)}%
          </div>
        </div>

        {/* Mini stats */}
        <div className="flex items-center gap-4 mt-2 text-xs">
          <span className="text-muted-foreground">
            {summary.total} runs
          </span>
          <span className="text-green-500 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {summary.passed} passed
          </span>
          <span className="text-red-500 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            {summary.failed} failed
          </span>
        </div>
      </div>

      {/* Runs List */}
      <div className="divide-y max-h-[200px] overflow-y-auto">
        {runs.map((run) => (
          <div
            key={run.id}
            onClick={() => onAction?.('view_run', run)}
            className="px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {run.status === 'passed' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : run.status === 'failed' ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
                )}
                <span className="text-sm font-medium">
                  {run.passed_tests}/{run.total_tests} passed
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatRelativeTime(run.started_at)}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-1 text-[10px] text-muted-foreground pl-6">
              <span>Duration: {formatDuration(run.duration_ms)}</span>
              <span className="font-mono">{run.id.slice(0, 8)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 py-2 border-t bg-muted/20 flex items-center gap-2">
        <Button
          onClick={() => onAction?.('compare_runs', {})}
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
        >
          Compare Runs
        </Button>
        <Button
          onClick={() => onAction?.('generate_report', {})}
          variant="ghost"
          size="sm"
          className="h-7 text-xs ml-auto"
        >
          Generate Report
        </Button>
      </div>
    </motion.div>
  );
});

export default TestListCard;
