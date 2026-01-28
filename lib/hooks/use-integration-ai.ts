'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './use-auth-api';

// ============================================================================
// Types
// ============================================================================

/**
 * Error item from integration platforms
 */
export interface IntegrationError {
  id: string;
  platform: string;
  message: string;
  stack_trace: string | null;
  first_seen: string;
  last_seen: string;
  occurrence_count: number;
  affected_users: number;
  severity: string;
  status: string;
  issue_url: string | null;
  can_generate_test: boolean;
}

/**
 * Session item from integration platforms
 */
export interface IntegrationSession {
  id: string;
  platform: string;
  user_id: string | null;
  started_at: string;
  duration_ms: number;
  page_views: number;
  has_errors: boolean;
  has_frustration: boolean;
  replay_url: string | null;
  can_generate_test: boolean;
}

/**
 * Response from listing errors
 */
export interface ErrorListResponse {
  errors: IntegrationError[];
  total: number;
  platforms: string[];
}

/**
 * Response from listing sessions
 */
export interface SessionListResponse {
  sessions: IntegrationSession[];
  total: number;
  platforms: string[];
}

/**
 * Generated test from error or session
 */
export interface GeneratedTest {
  id: string;
  name: string;
  description: string;
  source_type: 'error' | 'session';
  source_id: string;
  source_platform: string;
  priority: string;
  confidence: number;
  steps: Array<{
    action: string;
    target?: string;
    value?: string;
    description?: string;
  }>;
  assertions: Array<{
    type: string;
    target: string;
    expected: string;
    description?: string;
  }>;
  preconditions: string[];
  rationale: string;
  user_journey: string;
  created_at: string;
  test_id: string | null;
}

/**
 * Request to convert an error to a test
 */
export interface ErrorToTestRequest {
  error_id: string;
  platform: string;
  project_id?: string;
  include_session?: boolean;
  app_url?: string;
}

/**
 * Request to convert a session to a test
 */
export interface SessionToTestRequest {
  session_id: string;
  platform: string;
  project_id?: string;
  generalize?: boolean;
  include_assertions?: boolean;
  app_url?: string;
}

/**
 * Request for bulk test generation
 */
export interface BulkGenerateRequest {
  items: Array<{ id: string; platform: string }>;
  source_type: 'error' | 'session';
  project_id?: string;
}

/**
 * Response from bulk test generation
 */
export interface BulkGenerateResponse {
  generated: GeneratedTest[];
  failed: Array<{ item: { id: string; platform: string }; error: string }>;
  total_generated: number;
  total_failed: number;
}

/**
 * Analysis result for error or session
 */
export interface AnalysisResult {
  id: string;
  platform: string;
  analysis: {
    can_reproduce?: boolean;
    test_worthy?: boolean;
    test_priority: string;
    suggested_test_type: string;
    journey_steps?: number;
  };
  [key: string]: unknown;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch errors from connected integrations.
 *
 * @example
 * ```tsx
 * function ErrorList() {
 *   const { data, isLoading } = useIntegrationErrors();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       {data?.errors.map(error => (
 *         <ErrorCard key={error.id} error={error} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useIntegrationErrors(options?: {
  projectId?: string;
  platform?: string;
  limit?: number;
  sinceHours?: number;
}) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();
  const { projectId, platform, limit = 50, sinceHours = 24 } = options || {};

  const params = new URLSearchParams();
  if (projectId) params.set('project_id', projectId);
  if (platform) params.set('platform', platform);
  if (limit) params.set('limit', limit.toString());
  if (sinceHours) params.set('since_hours', sinceHours.toString());

  const queryString = params.toString();

  return useQuery({
    queryKey: ['integration-errors', projectId, platform, limit, sinceHours],
    queryFn: async () => {
      const url = `/api/v1/integrations/errors${queryString ? `?${queryString}` : ''}`;
      const response = await fetchJson<ErrorListResponse>(url);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch sessions from connected integrations.
 *
 * @example
 * ```tsx
 * function SessionList() {
 *   const { data, isLoading } = useIntegrationSessions({ filterErrors: true });
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       {data?.sessions.map(session => (
 *         <SessionCard key={session.id} session={session} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useIntegrationSessions(options?: {
  projectId?: string;
  platform?: string;
  limit?: number;
  sinceHours?: number;
  filterErrors?: boolean;
  filterFrustrations?: boolean;
}) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();
  const {
    projectId,
    platform,
    limit = 50,
    sinceHours = 24,
    filterErrors = false,
    filterFrustrations = false,
  } = options || {};

  const params = new URLSearchParams();
  if (projectId) params.set('project_id', projectId);
  if (platform) params.set('platform', platform);
  if (limit) params.set('limit', limit.toString());
  if (sinceHours) params.set('since_hours', sinceHours.toString());
  if (filterErrors) params.set('filter_errors', 'true');
  if (filterFrustrations) params.set('filter_frustrations', 'true');

  const queryString = params.toString();

  return useQuery({
    queryKey: ['integration-sessions', projectId, platform, limit, sinceHours, filterErrors, filterFrustrations],
    queryFn: async () => {
      const url = `/api/v1/integrations/sessions${queryString ? `?${queryString}` : ''}`;
      const response = await fetchJson<SessionListResponse>(url);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to convert an error into a test.
 *
 * @example
 * ```tsx
 * function GenerateTestButton({ error }: { error: IntegrationError }) {
 *   const generateTest = useErrorToTest();
 *
 *   const handleGenerate = async () => {
 *     try {
 *       const test = await generateTest.mutateAsync({
 *         error_id: error.id,
 *         platform: error.platform,
 *       });
 *       toast.success({ title: 'Test generated!', description: test.name });
 *     } catch (error) {
 *       toast.error({ title: 'Failed to generate test' });
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleGenerate} disabled={generateTest.isPending}>
 *       {generateTest.isPending ? 'Generating...' : 'Generate Test'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useErrorToTest() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ErrorToTestRequest): Promise<GeneratedTest> => {
      const response = await fetchJson<GeneratedTest>('/api/v1/integrations/error-to-test', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error('No test generated');
      }

      return response.data;
    },
    onSuccess: () => {
      // Invalidate tests query to refresh test list
      queryClient.invalidateQueries({ queryKey: ['tests'] });
    },
  });
}

/**
 * Hook to convert a session into a test.
 *
 * @example
 * ```tsx
 * function GenerateTestButton({ session }: { session: IntegrationSession }) {
 *   const generateTest = useSessionToTest();
 *
 *   const handleGenerate = async () => {
 *     try {
 *       const test = await generateTest.mutateAsync({
 *         session_id: session.id,
 *         platform: session.platform,
 *       });
 *       toast.success({ title: 'Test generated!', description: test.name });
 *     } catch (error) {
 *       toast.error({ title: 'Failed to generate test' });
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleGenerate} disabled={generateTest.isPending}>
 *       {generateTest.isPending ? 'Generating...' : 'Generate Test'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useSessionToTest() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SessionToTestRequest): Promise<GeneratedTest> => {
      const response = await fetchJson<GeneratedTest>('/api/v1/integrations/session-to-test', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error('No test generated');
      }

      return response.data;
    },
    onSuccess: () => {
      // Invalidate tests query to refresh test list
      queryClient.invalidateQueries({ queryKey: ['tests'] });
    },
  });
}

/**
 * Hook to bulk generate tests from multiple errors or sessions.
 *
 * @example
 * ```tsx
 * function BulkGenerateButton({ selectedErrors }: { selectedErrors: IntegrationError[] }) {
 *   const bulkGenerate = useBulkGenerateTests();
 *
 *   const handleBulkGenerate = async () => {
 *     try {
 *       const result = await bulkGenerate.mutateAsync({
 *         items: selectedErrors.map(e => ({ id: e.id, platform: e.platform })),
 *         source_type: 'error',
 *       });
 *       toast.success({
 *         title: 'Tests generated',
 *         description: `${result.total_generated} tests created, ${result.total_failed} failed`,
 *       });
 *     } catch (error) {
 *       toast.error({ title: 'Bulk generation failed' });
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleBulkGenerate} disabled={bulkGenerate.isPending}>
 *       {bulkGenerate.isPending ? 'Generating...' : `Generate ${selectedErrors.length} Tests`}
 *     </button>
 *   );
 * }
 * ```
 */
export function useBulkGenerateTests() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: BulkGenerateRequest): Promise<BulkGenerateResponse> => {
      const response = await fetchJson<BulkGenerateResponse>('/api/v1/integrations/bulk-generate', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error('No response from bulk generation');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
    },
  });
}

/**
 * Hook to analyze an error without generating a test.
 */
export function useAnalyzeError() {
  const { fetchJson } = useAuthApi();

  return useMutation({
    mutationFn: async ({
      platform,
      errorId,
      projectId,
    }: {
      platform: string;
      errorId: string;
      projectId?: string;
    }): Promise<AnalysisResult> => {
      const params = projectId ? `?project_id=${projectId}` : '';
      const response = await fetchJson<AnalysisResult>(
        `/api/v1/integrations/error/${platform}/${errorId}/analyze${params}`
      );

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error('No analysis result');
      }

      return response.data;
    },
  });
}

/**
 * Hook to analyze a session without generating a test.
 */
export function useAnalyzeSession() {
  const { fetchJson } = useAuthApi();

  return useMutation({
    mutationFn: async ({
      platform,
      sessionId,
      projectId,
    }: {
      platform: string;
      sessionId: string;
      projectId?: string;
    }): Promise<AnalysisResult> => {
      const params = projectId ? `?project_id=${projectId}` : '';
      const response = await fetchJson<AnalysisResult>(
        `/api/v1/integrations/session/${platform}/${sessionId}/analyze${params}`
      );

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error('No analysis result');
      }

      return response.data;
    },
  });
}

/**
 * Hook to get statistics for integration AI features.
 */
export function useIntegrationAIStats() {
  const errors = useIntegrationErrors();
  const sessions = useIntegrationSessions();

  return {
    totalErrors: errors.data?.total || 0,
    totalSessions: sessions.data?.total || 0,
    errorPlatforms: errors.data?.platforms || [],
    sessionPlatforms: sessions.data?.platforms || [],
    isLoading: errors.isLoading || sessions.isLoading,
    hasData: (errors.data?.total || 0) > 0 || (sessions.data?.total || 0) > 0,
  };
}
