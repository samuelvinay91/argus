'use client';

import { useParams, useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Globe,
  Monitor,
  AlertCircle,
  Play,
  Calendar,
  Timer,
  Target,
  Zap,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/data-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTestRun, useTestResults } from '@/lib/hooks/use-tests';
import type { TestResult } from '@/lib/supabase/types';

function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'passed':
      return <CheckCircle2 className="h-5 w-5 text-success" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-error" />;
    case 'running':
      return <Loader2 className="h-5 w-5 text-info animate-spin" />;
    case 'pending':
      return <Clock className="h-5 w-5 text-warning" />;
    default:
      return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  }
}

function getStatusVariant(status: string): 'success' | 'error' | 'warning' | 'info' | 'default' {
  switch (status) {
    case 'passed':
      return 'success';
    case 'failed':
      return 'error';
    case 'running':
      return 'info';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
}

function LoadingSkeleton() {
  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </div>
      </main>
    </div>
  );
}

function ErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-64 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 rounded-2xl bg-error/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-error" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight mb-2">Test Run Not Found</h2>
          <p className="text-muted-foreground mb-6">{message}</p>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
}

function TestResultCard({ result }: { result: TestResult }) {
  const stepResults = result.step_results as Array<{
    step: string;
    success: boolean;
    error?: string;
    screenshot?: string;
  }> | null;

  return (
    <Card className={cn(
      'border-l-4',
      result.status === 'passed' && 'border-l-success',
      result.status === 'failed' && 'border-l-error',
      result.status === 'running' && 'border-l-info',
      result.status === 'pending' && 'border-l-warning',
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(result.status)}
            <div>
              <CardTitle className="text-base">{result.name}</CardTitle>
              <CardDescription>
                {result.steps_completed}/{result.steps_total} steps completed
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={getStatusVariant(result.status)}>
              {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
            </Badge>
            {result.duration_ms && (
              <span className="text-sm text-muted-foreground">
                {formatDuration(result.duration_ms)}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      {(result.error_message || (stepResults && stepResults.length > 0)) && (
        <CardContent className="pt-0">
          {result.error_message && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 mb-4">
              <p className="text-sm text-error font-medium">Error</p>
              <p className="text-sm text-muted-foreground mt-1">{result.error_message}</p>
            </div>
          )}

          {stepResults && stepResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">Step Results</p>
              {stepResults.map((step, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-start gap-3 p-2 rounded-lg text-sm',
                    step.success ? 'bg-success/5' : 'bg-error/5'
                  )}
                >
                  <div className="mt-0.5">
                    {step.success ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-error" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{step.step || `Step ${index + 1}`}</p>
                    {step.error && (
                      <p className="text-xs text-error mt-1">{step.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function TestRunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.id as string;

  const { data: testRun, isLoading: runLoading, error: runError } = useTestRun(runId);
  const { data: testResults = [], isLoading: resultsLoading } = useTestResults(runId);

  const handleBack = () => {
    router.push('/dashboard');
  };

  if (runLoading) {
    return <LoadingSkeleton />;
  }

  if (runError || !testRun) {
    return (
      <ErrorState
        message={runError ? `Failed to load test run: ${runError.message}` : "The test run you're looking for doesn't exist or has been deleted."}
        onBack={handleBack}
      />
    );
  }

  const passRate = testRun.total_tests > 0
    ? Math.round((testRun.passed_tests / testRun.total_tests) * 100)
    : 0;

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-sm px-4 lg:px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="h-4 w-px bg-border" />
              <Badge variant={getStatusVariant(testRun.status)} className="text-sm">
                {getStatusIcon(testRun.status)}
                <span className="ml-1.5">{testRun.status.charAt(0).toUpperCase() + testRun.status.slice(1)}</span>
              </Badge>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {testRun.name || 'Test Run'}
                </h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(testRun.created_at), 'PPp')}
                  <span className="text-border">|</span>
                  {formatDistanceToNow(new Date(testRun.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">{testRun.total_tests}</p>
                      <p className="text-xs text-muted-foreground">Total Tests</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-success">{testRun.passed_tests}</p>
                      <p className="text-xs text-muted-foreground">Passed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-error/10">
                      <XCircle className="h-5 w-5 text-error" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-error">{testRun.failed_tests}</p>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-info/10">
                      <Timer className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">{formatDuration(testRun.duration_ms)}</p>
                      <p className="text-xs text-muted-foreground">Duration</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Run Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Run Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">App URL</p>
                      <a
                        href={testRun.app_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate block max-w-xs"
                      >
                        {testRun.app_url}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Browser</p>
                      <p className="text-sm capitalize">{testRun.browser || 'chromium'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Trigger</p>
                      <p className="text-sm capitalize">{testRun.trigger || 'manual'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Play className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Pass Rate</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{passRate}%</p>
                        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all',
                              passRate >= 80 ? 'bg-success' : passRate >= 50 ? 'bg-warning' : 'bg-error'
                            )}
                            style={{ width: `${passRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timing Info */}
                {(testRun.started_at || testRun.completed_at) && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {testRun.started_at && (
                        <div>
                          <p className="text-xs text-muted-foreground">Started</p>
                          <p>{format(new Date(testRun.started_at), 'PPp')}</p>
                        </div>
                      )}
                      {testRun.completed_at && (
                        <div>
                          <p className="text-xs text-muted-foreground">Completed</p>
                          <p>{format(new Date(testRun.completed_at), 'PPp')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Results */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Test Results</h2>

              {resultsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : testResults.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No test results found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Results will appear here once the test run completes.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {testResults.map((result) => (
                    <TestResultCard key={result.id} result={result} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
