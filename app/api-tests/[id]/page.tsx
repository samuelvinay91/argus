'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { safeFormatDistanceToNow, safeFormat } from '@/lib/utils';
import {
  ArrowLeft,
  Play,
  Edit,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Copy,
  Code2,
  FileJson,
  History,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/data-table';
import {
  useAPITest,
  useAPITestResults,
  useRunSingleAPITest,
  useDeleteAPITest,
  type APITestResult,
} from '@/lib/hooks/use-api-tests';
import { useProjects } from '@/lib/hooks/use-projects';
import { cn } from '@/lib/utils';

// HTTP method badge colors
const methodColors: Record<string, string> = {
  GET: 'bg-green-500/10 text-green-500 border-green-500/20',
  POST: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  PUT: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  PATCH: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  DELETE: 'bg-red-500/10 text-red-500 border-red-500/20',
  HEAD: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  OPTIONS: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
};

// Status badge variants
const statusVariants: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
  passed: 'success',
  failed: 'error',
  error: 'error',
  skipped: 'default',
  timeout: 'warning',
};

function JSONBlock({ data, title }: { data: unknown; title: string }) {
  const [expanded, setExpanded] = useState(false);
  const isEmpty = !data || (typeof data === 'object' && Object.keys(data as object).length === 0);

  if (isEmpty) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">Empty</span>
        </div>
      </div>
    );
  }

  const jsonString = JSON.stringify(data, null, 2);

  return (
    <div className="rounded-lg border bg-muted/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm font-medium">{title}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(jsonString);
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="border-t p-3">
          <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
            {jsonString}
          </pre>
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: APITestResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
      >
        {/* Status indicator */}
        <div
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
            result.status === 'passed' && 'bg-green-500/10',
            result.status === 'failed' && 'bg-red-500/10',
            result.status === 'error' && 'bg-red-500/10',
            result.status === 'timeout' && 'bg-amber-500/10',
            result.status === 'skipped' && 'bg-gray-500/10'
          )}
        >
          {result.status === 'passed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {(result.status === 'failed' || result.status === 'error') && (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          {result.status === 'timeout' && <Clock className="h-4 w-4 text-amber-500" />}
          {result.status === 'skipped' && <AlertCircle className="h-4 w-4 text-gray-500" />}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm font-medium',
              result.status === 'passed' && 'text-green-500',
              result.status === 'failed' && 'text-red-500',
              result.status === 'error' && 'text-red-500',
              result.status === 'timeout' && 'text-amber-500'
            )}>
              {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
            </span>
            {result.response_status && (
              <span className="text-xs font-mono text-muted-foreground">
                HTTP {result.response_status}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5" suppressHydrationWarning>
            {safeFormatDistanceToNow(result.started_at, { addSuffix: true })}
          </div>
        </div>

        {/* Timing */}
        <div className="flex items-center gap-4 text-sm">
          {result.response_time_ms !== null && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono">{result.response_time_ms}ms</span>
            </div>
          )}
          {result.schema_valid !== null && (
            <div className="flex items-center gap-1.5">
              <FileJson className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={result.schema_valid ? 'text-green-500' : 'text-red-500'}>
                {result.schema_valid ? 'Valid' : 'Invalid'}
              </span>
            </div>
          )}
        </div>

        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t p-4 space-y-4">
          {/* Error message */}
          {result.error_message && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-500">Error</p>
                  <p className="text-sm text-muted-foreground mt-1">{result.error_message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Schema errors */}
          {result.schema_errors && result.schema_errors.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-sm font-medium text-amber-500 mb-2">Schema Validation Errors</p>
              <ul className="list-disc list-inside space-y-1">
                {result.schema_errors.map((error, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Request/Response details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Request
              </h4>
              <div className="text-xs font-mono text-muted-foreground break-all">
                {result.request_method} {result.request_url}
              </div>
              <JSONBlock data={result.request_headers} title="Headers" />
              {result.request_body && (
                <JSONBlock data={result.request_body} title="Body" />
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                Response
              </h4>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-xs font-mono px-2 py-0.5 rounded',
                    result.response_status && result.response_status < 300 && 'bg-green-500/10 text-green-500',
                    result.response_status && result.response_status >= 300 && result.response_status < 400 && 'bg-amber-500/10 text-amber-500',
                    result.response_status && result.response_status >= 400 && 'bg-red-500/10 text-red-500'
                  )}
                >
                  {result.response_status || 'No response'}
                </span>
                {result.response_time_ms !== null && (
                  <span className="text-xs text-muted-foreground">
                    {result.response_time_ms}ms
                  </span>
                )}
              </div>
              <JSONBlock data={result.response_headers} title="Headers" />
              <JSONBlock data={result.response_body} title="Body" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function APITestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id as string;

  const [baseUrl, setBaseUrl] = useState('');
  const [authToken, setAuthToken] = useState('');

  // Data fetching
  const { data: projects = [] } = useProjects();
  const projectId = projects[0]?.id || null;

  const { data: test, isLoading: testLoading } = useAPITest(projectId, testId);
  const { data: results = [], isLoading: resultsLoading } = useAPITestResults(projectId, {
    testCaseId: testId,
    limit: 20,
  });

  // Mutations
  const runTest = useRunSingleAPITest();
  const deleteTest = useDeleteAPITest();

  // Set base URL from project
  useMemo(() => {
    if (projects[0]?.app_url && !baseUrl) {
      setBaseUrl(projects[0].app_url);
    }
  }, [projects, baseUrl]);

  // Handle run test
  const handleRunTest = async () => {
    if (!projectId || !testId || !baseUrl) return;

    try {
      await runTest.mutateAsync({
        projectId,
        testId,
        baseUrl,
        authToken: authToken || undefined,
      });
    } catch (error) {
      console.error('Failed to run test:', error);
    }
  };

  // Handle delete test
  const handleDeleteTest = async () => {
    if (!projectId || !testId) return;

    try {
      await deleteTest.mutateAsync({ testId, projectId });
      router.push('/api-tests');
    } catch (error) {
      console.error('Failed to delete test:', error);
    }
  };

  // Loading state
  if (testLoading) {
    return (
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-w-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  // Not found state
  if (!test) {
    return (
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-w-0 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Test not found</h2>
            <p className="text-muted-foreground mb-4">
              The API test you are looking for does not exist.
            </p>
            <Link href="/api-tests">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to API Tests
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0 overflow-x-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-sm px-4 lg:px-6 py-4">
          <div className="flex items-center gap-4 mb-3">
            <Link href="/api-tests">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold border',
                    methodColors[test.method] || 'bg-muted text-muted-foreground'
                  )}
                >
                  {test.method}
                </span>
                <h1 className="text-xl font-semibold truncate">{test.name}</h1>
                {test.last_run_status && (
                  <Badge
                    variant={statusVariants[test.last_run_status] || 'default'}
                    className="capitalize"
                  >
                    {test.last_run_status}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-mono mt-1 truncate">
                {test.endpoint}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteTest}
                disabled={deleteTest.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleRunTest}
                disabled={runTest.isPending || !baseUrl}
              >
                {runTest.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run Test
              </Button>
            </div>
          </div>

          {/* Run configuration */}
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="Base URL"
              className="flex-1 min-w-[200px] max-w-md h-9"
            />
            <Input
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Bearer token (optional)"
              type="password"
              className="flex-1 min-w-[150px] max-w-xs h-9"
            />
          </div>
        </header>

        <div className="p-4 lg:p-6 space-y-6">
          {/* Test Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Test Configuration */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Code2 className="h-5 w-5" />
                Test Configuration
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="text-sm font-medium capitalize">{test.test_type}</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <p className="text-sm font-medium capitalize">{test.priority}</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Expected Status</p>
                  <p className="text-sm font-medium font-mono">{test.expected_status}</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Max Latency</p>
                  <p className="text-sm font-medium">{test.max_latency_ms}ms</p>
                </div>
              </div>

              {/* Description */}
              {test.description && (
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm text-muted-foreground">{test.description}</p>
                </div>
              )}

              {/* Request configuration */}
              <div className="space-y-3">
                <JSONBlock data={test.headers} title="Request Headers" />
                <JSONBlock data={test.query_params} title="Query Parameters" />
                <JSONBlock data={test.path_params} title="Path Parameters" />
                <JSONBlock data={test.body} title="Request Body" />
                <JSONBlock data={test.expected_body_schema} title="Expected Response Schema" />
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Details</h2>

              <div className="rounded-lg border bg-card divide-y">
                <div className="p-3 flex justify-between">
                  <span className="text-sm text-muted-foreground">Source</span>
                  <span className="text-sm capitalize">{test.source}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-sm text-muted-foreground">Auth Type</span>
                  <span className="text-sm capitalize">{test.auth_type}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-sm text-muted-foreground">Active</span>
                  <span className={cn('text-sm', test.is_active ? 'text-green-500' : 'text-red-500')}>
                    {test.is_active ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm" suppressHydrationWarning>
                    {safeFormat(test.created_at, 'MMM d, yyyy')}
                  </span>
                </div>
                {test.updated_at && (
                  <div className="p-3 flex justify-between">
                    <span className="text-sm text-muted-foreground">Updated</span>
                    <span className="text-sm" suppressHydrationWarning>
                      {safeFormat(test.updated_at, 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {test.tags && test.tags.length > 0 && (
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-sm text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {test.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Test Results History */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <History className="h-5 w-5" />
              Execution History
              {results.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({results.length} runs)
                </span>
              )}
            </h2>

            {resultsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-lg border bg-card p-8 text-center">
                <History className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No test runs yet. Run the test to see results here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result) => (
                  <ResultCard key={result.id} result={result} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
