'use client';

import { useState, useMemo, useEffect } from 'react';
import { safeFormatDistanceToNow, safeFormat } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Download,
  ChevronDown,
  ChevronRight,
  SkipForward,
  RefreshCw,
  Filter,
  BarChart3,
  Zap,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, StatusDot } from '@/components/ui/data-table';
import {
  useParameterizedResultsForTest,
  useIterationResults,
  type ParameterizedTest,
  type ParameterizedResult,
  type IterationResult,
} from '@/lib/hooks/use-parameterized';
import { cn } from '@/lib/utils';

interface ResultsViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: ParameterizedTest;
  projectId: string;
}

type StatusFilter = 'all' | 'passed' | 'failed' | 'skipped' | 'error';

export function ResultsView({
  open,
  onOpenChange,
  test,
  projectId,
}: ResultsViewProps) {
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedIterations, setExpandedIterations] = useState<Set<string>>(new Set());

  // Data fetching
  const { data: results = [], isLoading: resultsLoading } = useParameterizedResultsForTest(test.id);
  const { data: iterationResults = [], isLoading: iterationsLoading } = useIterationResults(selectedResultId);

  // Auto-select most recent result
  useEffect(() => {
    if (results.length > 0 && !selectedResultId) {
      setSelectedResultId(results[0].id);
    }
  }, [results, selectedResultId]);

  // Filter iteration results by status
  const filteredIterations = useMemo(() => {
    if (statusFilter === 'all') return iterationResults;
    return iterationResults.filter(ir => ir.status === statusFilter);
  }, [iterationResults, statusFilter]);

  // Calculate stats for selected result
  const selectedResult = results.find(r => r.id === selectedResultId);
  const stats = useMemo(() => {
    if (!selectedResult) return null;
    return {
      total: selectedResult.total_iterations,
      passed: selectedResult.passed,
      failed: selectedResult.failed,
      skipped: selectedResult.skipped,
      error: selectedResult.error,
      passRate: selectedResult.total_iterations > 0
        ? ((selectedResult.passed / selectedResult.total_iterations) * 100).toFixed(1)
        : '0',
      avgDuration: selectedResult.avg_iteration_ms
        ? `${(selectedResult.avg_iteration_ms / 1000).toFixed(2)}s`
        : '-',
      totalDuration: selectedResult.duration_ms
        ? `${(selectedResult.duration_ms / 1000).toFixed(1)}s`
        : '-',
    };
  }, [selectedResult]);

  // Toggle iteration expanded
  const toggleIteration = (id: string) => {
    const newExpanded = new Set(expandedIterations);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIterations(newExpanded);
  };

  // Export results to CSV
  const exportResults = () => {
    if (!selectedResult || iterationResults.length === 0) return;

    const headers = ['Iteration', 'Name', 'Status', 'Duration (ms)', 'Error'];
    const rows = iterationResults.map(ir => {
      const values = ir.parameter_values as Record<string, any>;
      return [
        ir.iteration_index + 1,
        values.name || `Iteration ${ir.iteration_index + 1}`,
        ir.status,
        ir.duration_ms || '',
        ir.error_message || '',
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${test.name}-results-${safeFormat(selectedResult.created_at, 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-error" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-warning" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-error" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-info animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Results: {test.name}
          </DialogTitle>
          <DialogDescription>
            View execution history and iteration results.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Results List (Left Panel) */}
          <div className="w-64 flex-shrink-0 border-r pr-4 overflow-y-auto">
            <h4 className="text-sm font-medium mb-2">Run History</h4>
            {resultsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No runs yet
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => setSelectedResultId(result.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-colors',
                      selectedResultId === result.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <StatusDot status={result.status} />
                      <span className="text-sm font-medium capitalize">{result.status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {safeFormatDistanceToNow(result.created_at, { addSuffix: true })}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-success">{result.passed} passed</span>
                      <span className="text-error">{result.failed} failed</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results Detail (Right Panel) */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {!selectedResult ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a run to view details
              </div>
            ) : (
              <>
                {/* Summary Stats */}
                {stats && (
                  <div className="grid grid-cols-5 gap-3 mb-4">
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <div className="text-2xl font-bold">{stats.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="p-3 bg-success/10 rounded-lg text-center">
                      <div className="text-2xl font-bold text-success">{stats.passed}</div>
                      <div className="text-xs text-muted-foreground">Passed</div>
                    </div>
                    <div className="p-3 bg-error/10 rounded-lg text-center">
                      <div className="text-2xl font-bold text-error">{stats.failed}</div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <div className="text-2xl font-bold">{stats.passRate}%</div>
                      <div className="text-xs text-muted-foreground">Pass Rate</div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <div className="text-2xl font-bold">{stats.totalDuration}</div>
                      <div className="text-xs text-muted-foreground">Duration</div>
                    </div>
                  </div>
                )}

                {/* Filters */}
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  {(['all', 'passed', 'failed', 'skipped', 'error'] as const).map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportResults}
                    disabled={iterationResults.length === 0}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>

                {/* Iteration Results */}
                <div className="flex-1 overflow-y-auto border rounded-lg">
                  {iterationsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredIterations.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No iterations match the filter
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredIterations.map((iteration) => {
                        const isExpanded = expandedIterations.has(iteration.id);
                        const values = iteration.parameter_values as Record<string, any>;
                        const stepResults = iteration.step_results as any[] || [];

                        return (
                          <div key={iteration.id} className="group">
                            {/* Iteration Header */}
                            <div
                              className={cn(
                                'flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors',
                                isExpanded && 'bg-muted/30'
                              )}
                              onClick={() => toggleIteration(iteration.id)}
                            >
                              <button type="button" className="p-0.5">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>

                              {getStatusIcon(iteration.status)}

                              <span className="font-medium text-sm">
                                #{iteration.iteration_index + 1}
                              </span>

                              <span className="text-sm text-muted-foreground truncate">
                                {values.name || Object.values(values).slice(0, 2).join(', ')}
                              </span>

                              <div className="flex-1" />

                              {iteration.duration_ms && (
                                <span className="text-xs text-muted-foreground">
                                  {(iteration.duration_ms / 1000).toFixed(2)}s
                                </span>
                              )}

                              {iteration.retry_count > 0 && (
                                <Badge variant="warning">
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Retry {iteration.retry_count}
                                </Badge>
                              )}
                            </div>

                            {/* Iteration Details */}
                            {isExpanded && (
                              <div className="px-4 pb-4 bg-muted/20">
                                {/* Parameter Values */}
                                <div className="mb-3">
                                  <h5 className="text-xs font-medium text-muted-foreground mb-2">
                                    Parameter Values
                                  </h5>
                                  <div className="flex flex-wrap gap-2">
                                    {Object.entries(values).map(([key, value]) => (
                                      <div
                                        key={key}
                                        className="px-2 py-1 bg-background rounded text-xs"
                                      >
                                        <span className="font-mono text-muted-foreground">{key}:</span>{' '}
                                        <span>{String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Step Results */}
                                {stepResults.length > 0 && (
                                  <div className="mb-3">
                                    <h5 className="text-xs font-medium text-muted-foreground mb-2">
                                      Step Results
                                    </h5>
                                    <div className="space-y-1">
                                      {stepResults.map((step: any, index: number) => (
                                        <div
                                          key={index}
                                          className="flex items-center gap-2 text-xs"
                                        >
                                          {step.success ? (
                                            <CheckCircle2 className="h-3 w-3 text-success" />
                                          ) : (
                                            <XCircle className="h-3 w-3 text-error" />
                                          )}
                                          <span className="text-muted-foreground">
                                            Step {index + 1}:
                                          </span>
                                          <span className="truncate">
                                            {step.instruction || step.action || 'Unknown step'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Error Message */}
                                {iteration.error_message && (
                                  <div className="p-2 bg-error/10 rounded text-sm text-error">
                                    <span className="font-medium">Error: </span>
                                    {iteration.error_message}
                                  </div>
                                )}

                                {/* Error Screenshot */}
                                {iteration.error_screenshot_url && (
                                  <div className="mt-2">
                                    <a
                                      href={iteration.error_screenshot_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline"
                                    >
                                      View Screenshot
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
