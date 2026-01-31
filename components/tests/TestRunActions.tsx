'use client';

import { useState } from 'react';
import {
  Play,
  Share2,
  Download,
  MoreHorizontal,
  Copy,
  Check,
  Loader2,
  FileJson,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/lib/hooks/useToast';
import { useRerunTest, type LegacyTestRun } from '@/lib/hooks/use-tests';
import type { TestRun, TestResult } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';

export interface TestRunActionsProps {
  testRun: TestRun;
  testResults?: TestResult[];
  onRerunComplete?: (newRun: LegacyTestRun) => void;
  onDelete?: () => void;
  className?: string;
  size?: 'sm' | 'default';
}

export function TestRunActions({
  testRun,
  testResults = [],
  onRerunComplete,
  onDelete,
  className,
  size = 'default',
}: TestRunActionsProps) {
  const [copied, setCopied] = useState(false);
  const rerunTest = useRerunTest();

  const isRunning = testRun.status === 'running' || testRun.status === 'pending';
  const buttonSize = size === 'sm' ? 'sm' : 'default';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  // Handle rerun test
  const handleRerun = async () => {
    try {
      const newRun = await rerunTest.mutateAsync({
        testRunId: testRun.id,
        projectId: testRun.project_id,
        appUrl: testRun.app_url,
        browser: testRun.browser,
      });

      toast.success({
        title: 'Test run started',
        description: `Rerunning tests on ${testRun.app_url}`,
      });

      onRerunComplete?.(newRun);
    } catch (error) {
      console.error('Failed to rerun test:', error);
      toast.error({
        title: 'Failed to rerun test',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  };

  // Handle share (copy URL to clipboard)
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success({
        title: 'Link copied',
        description: 'Test run URL copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error({
        title: 'Failed to copy link',
        description: 'Could not copy URL to clipboard',
      });
    }
  };

  // Handle export (download as JSON)
  const handleExport = () => {
    try {
      const exportData = {
        testRun: {
          id: testRun.id,
          name: testRun.name,
          status: testRun.status,
          app_url: testRun.app_url,
          environment: testRun.environment,
          browser: testRun.browser,
          trigger: testRun.trigger,
          total_tests: testRun.total_tests,
          passed_tests: testRun.passed_tests,
          failed_tests: testRun.failed_tests,
          skipped_tests: testRun.skipped_tests,
          duration_ms: testRun.duration_ms,
          started_at: testRun.started_at,
          completed_at: testRun.completed_at,
          created_at: testRun.created_at,
        },
        results: testResults.map((result) => ({
          id: result.id,
          name: result.name,
          status: result.status,
          duration_ms: result.duration_ms,
          error_message: result.error_message,
          steps_completed: result.steps_completed,
          steps_total: result.steps_total,
          step_results: result.step_results,
          started_at: result.started_at,
          completed_at: result.completed_at,
        })),
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-run-${testRun.id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success({
        title: 'Export complete',
        description: 'Test results downloaded as JSON',
      });
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error({
        title: 'Export failed',
        description: 'Could not export test results',
      });
    }
  };

  // Handle copy test run ID
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(testRun.id);
      toast.success({
        title: 'ID copied',
        description: 'Test run ID copied to clipboard',
      });
    } catch (error) {
      console.error('Failed to copy ID:', error);
      toast.error({
        title: 'Failed to copy',
        description: 'Could not copy test run ID',
      });
    }
  };

  // Handle open in new tab
  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Rerun Button */}
      <Button
        variant="default"
        size={buttonSize}
        onClick={handleRerun}
        disabled={rerunTest.isPending || isRunning}
        title={isRunning ? 'Test is already running' : 'Rerun this test'}
      >
        {rerunTest.isPending ? (
          <Loader2 className={cn(iconSize, 'mr-2 animate-spin')} />
        ) : (
          <Play className={cn(iconSize, 'mr-2')} />
        )}
        Rerun
      </Button>

      {/* Share Button */}
      <Button
        variant="outline"
        size={buttonSize}
        onClick={handleShare}
        title="Copy link to clipboard"
      >
        {copied ? (
          <Check className={iconSize} />
        ) : (
          <Share2 className={iconSize} />
        )}
      </Button>

      {/* Export Button */}
      <Button
        variant="outline"
        size={buttonSize}
        onClick={handleExport}
        title="Export as JSON"
      >
        <Download className={cn(iconSize, 'mr-2')} />
        Export
      </Button>

      {/* More Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size={buttonSize} className="h-9 w-9 p-0">
            <MoreHorizontal className={iconSize} />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCopyId}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Test Run ID
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenNewTab}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExport}>
            <FileJson className="h-4 w-4 mr-2" />
            Export as JSON
          </DropdownMenuItem>
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Test Run
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
