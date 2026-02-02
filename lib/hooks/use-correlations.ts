'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './use-auth-api';

// ============================================================================
// Types
// ============================================================================

/**
 * Event types that can appear in the SDLC timeline
 */
export type SDLCEventType =
  | 'requirement'
  | 'pr'
  | 'commit'
  | 'build'
  | 'test_run'
  | 'deploy'
  | 'error'
  | 'incident'
  | 'feature_flag'
  | 'session';

/**
 * Source platforms for events
 */
export type SDLCSourcePlatform =
  | 'jira'
  | 'github'
  | 'gitlab'
  | 'sentry'
  | 'pagerduty'
  | 'opsgenie'
  | 'launchdarkly'
  | 'vercel'
  | 'argus'
  | 'amplitude';

/**
 * Insight severity levels
 */
export type InsightSeverity = 'critical' | 'warning' | 'info';

/**
 * Insight status
 */
export type InsightStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';

/**
 * A single SDLC event from the unified timeline
 * Note: Properties use camelCase because API responses are converted from snake_case
 */
export interface SDLCEvent {
  id: string;
  eventType: SDLCEventType;
  sourcePlatform: SDLCSourcePlatform;
  externalId: string;
  externalUrl?: string | null;
  title?: string | null;
  occurredAt: string;
  commitSha?: string | null;
  prNumber?: number | null;
  jiraKey?: string | null;
  deployId?: string | null;
  data: Record<string, unknown>;
}

/**
 * An AI-generated insight from correlation analysis
 * Note: Properties use camelCase because API responses are converted from snake_case
 */
export interface CorrelationInsight {
  id: string;
  insightType: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  recommendations: Array<{ action: string; priority: string }>;
  eventIds: string[];
  status: InsightStatus;
  createdAt: string;
}

/**
 * Timeline response with pagination
 */
export interface TimelineResponse {
  events: SDLCEvent[];
  totalCount: number;
}

/**
 * Impact analysis response
 * Note: Properties use camelCase because API responses are converted from snake_case
 */
export interface ImpactAnalysisResponse {
  commitSha: string;
  relatedEvents: SDLCEvent[];
  riskScore: number;
  potentialImpacts: string[];
}

/**
 * Root cause chain item
 */
export interface RootCauseChain {
  event: SDLCEvent;
  correlationType?: string | null;
  confidence: number;
}

/**
 * Root cause analysis response
 * Note: Properties use camelCase because API responses are converted from snake_case
 */
export interface RootCauseResponse {
  targetEvent: SDLCEvent;
  rootCauseChain: RootCauseChain[];
  likelyRootCause?: SDLCEvent | null;
  confidence: number;
  analysisSummary: string;
}

/**
 * Natural language query response
 * Note: Properties use camelCase because API responses are converted from snake_case
 */
export interface NLQueryResponse {
  query: string;
  interpretedAs: string;
  events: SDLCEvent[];
  insights: string[];
  suggestedActions: string[];
}

/**
 * Correlation statistics
 * Note: Properties use camelCase because API responses are converted from snake_case
 */
export interface CorrelationStats {
  timeRangeDays: number;
  projectId?: string | null;
  events: {
    total: number;
    byType: Record<string, number>;
  };
  insights: {
    total: number;
    statusActive?: number;
    statusAcknowledged?: number;
    statusResolved?: number;
    statusDismissed?: number;
    severityCritical?: number;
    severityWarning?: number;
    severityInfo?: number;
  };
  correlations: {
    total: number;
    [key: string]: number;
  };
  generatedAt: string;
}

/**
 * Event with correlations response
 * Note: Properties use camelCase because API responses are converted from snake_case
 */
export interface EventWithCorrelations {
  event: SDLCEvent;
  correlations: Array<{
    id: string;
    sourceEventId: string;
    targetEventId: string;
    correlationType: string;
    confidence: number;
  }>;
}

// ============================================================================
// Query Options
// ============================================================================

export interface TimelineQueryOptions {
  projectId?: string | null;
  eventTypes?: SDLCEventType[];
  days?: number;
  limit?: number;
  offset?: number;
}

export interface InsightsQueryOptions {
  projectId?: string | null;
  insightTypes?: string[];
  status?: InsightStatus;
  limit?: number;
}

// ============================================================================
// Hooks - Timeline
// ============================================================================

/**
 * Hook to fetch the unified SDLC timeline.
 *
 * @param options - Query options for filtering/pagination
 * @returns Query result with timeline events
 *
 * @example
 * ```tsx
 * function Timeline() {
 *   const { data, isLoading } = useCorrelationTimeline({ days: 7, limit: 50 });
 *
 *   return (
 *     <div>
 *       {data?.events.map(event => (
 *         <EventCard key={event.id} event={event} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCorrelationTimeline(options: TimelineQueryOptions = {}) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();
  const { projectId, eventTypes, days = 7, limit = 100, offset = 0 } = options;

  return useQuery({
    queryKey: ['correlations', 'timeline', { projectId, eventTypes, days, limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId);
      if (eventTypes?.length) {
        eventTypes.forEach((type) => params.append('event_types', type));
      }
      params.append('days', days.toString());
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetchJson<TimelineResponse>(
        `/api/v1/correlations/timeline?${params.toString()}`
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single event with its correlations.
 *
 * @param eventId - The event ID to fetch
 * @returns Query result with event details and correlations
 */
export function useCorrelationEvent(eventId: string | null) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['correlations', 'event', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID is required');

      const response = await fetchJson<EventWithCorrelations>(
        `/api/v1/correlations/event/${eventId}`
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn && !!eventId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// Hooks - Impact Analysis
// ============================================================================

/**
 * Hook to fetch impact analysis for a commit.
 *
 * @param commitSha - The commit SHA to analyze
 * @returns Query result with impact analysis
 *
 * @example
 * ```tsx
 * function CommitImpact({ sha }) {
 *   const { data, isLoading } = useCommitImpact(sha);
 *
 *   return (
 *     <div>
 *       <RiskBadge score={data?.risk_score} />
 *       {data?.potential_impacts.map((impact, i) => (
 *         <p key={i}>{impact}</p>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCommitImpact(commitSha: string | null) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['correlations', 'impact', commitSha],
    queryFn: async () => {
      if (!commitSha) throw new Error('Commit SHA is required');

      const response = await fetchJson<ImpactAnalysisResponse>(
        `/api/v1/correlations/impact/${commitSha}`
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn && !!commitSha,
    staleTime: 5 * 60 * 1000, // 5 minutes - impact doesn't change often
  });
}

// ============================================================================
// Hooks - Root Cause Analysis
// ============================================================================

/**
 * Hook to fetch root cause analysis for an event.
 *
 * @param eventId - The event ID to trace
 * @param hoursBefore - Hours to look back (default 48)
 * @returns Query result with root cause chain
 */
export function useRootCauseAnalysis(eventId: string | null, hoursBefore = 48) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['correlations', 'root-cause', eventId, hoursBefore],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID is required');

      const response = await fetchJson<RootCauseResponse>(
        `/api/v1/correlations/root-cause/${eventId}?hours_before=${hoursBefore}`
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn && !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// Hooks - Insights
// ============================================================================

/**
 * Hook to fetch AI-generated correlation insights.
 *
 * @param options - Query options for filtering
 * @returns Query result with insights
 */
export function useCorrelationInsights(options: InsightsQueryOptions = {}) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();
  const { projectId, insightTypes, status = 'active', limit = 20 } = options;

  return useQuery({
    queryKey: ['correlations', 'insights', { projectId, insightTypes, status, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId);
      if (insightTypes?.length) {
        insightTypes.forEach((type) => params.append('insight_types', type));
      }
      params.append('status', status);
      params.append('limit', limit.toString());

      const response = await fetchJson<CorrelationInsight[]>(
        `/api/v1/correlations/insights?${params.toString()}`
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to acknowledge an insight.
 */
export function useAcknowledgeInsight() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insightId: string) => {
      if (!isLoaded || !isSignedIn) {
        throw new Error('Not authenticated');
      }

      const response = await fetchJson<{ success: boolean; message: string }>(
        `/api/v1/correlations/insights/${insightId}/acknowledge`,
        { method: 'POST' }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['correlations', 'insights'] });
    },
  });
}

/**
 * Hook to resolve an insight.
 */
export function useResolveInsight() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ insightId, notes }: { insightId: string; notes?: string }) => {
      if (!isLoaded || !isSignedIn) {
        throw new Error('Not authenticated');
      }

      const params = notes ? `?resolution_notes=${encodeURIComponent(notes)}` : '';
      const response = await fetchJson<{ success: boolean; message: string }>(
        `/api/v1/correlations/insights/${insightId}/resolve${params}`,
        { method: 'POST' }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['correlations', 'insights'] });
    },
  });
}

/**
 * Hook to dismiss an insight.
 */
export function useDismissInsight() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ insightId, reason }: { insightId: string; reason: string }) => {
      if (!isLoaded || !isSignedIn) {
        throw new Error('Not authenticated');
      }

      const response = await fetchJson<{ success: boolean; message: string }>(
        `/api/v1/correlations/insights/${insightId}/dismiss?reason=${encodeURIComponent(reason)}`,
        { method: 'POST' }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['correlations', 'insights'] });
    },
  });
}

// ============================================================================
// Hooks - Natural Language Query
// ============================================================================

/**
 * Hook for natural language queries against correlation data.
 *
 * @example
 * ```tsx
 * function SearchBox() {
 *   const query = useNLQuery();
 *
 *   const handleSearch = (text) => {
 *     query.mutate({ query: text });
 *   };
 *
 *   return (
 *     <>
 *       <Input onSubmit={handleSearch} />
 *       {query.data && (
 *         <Results
 *           events={query.data.events}
 *           insights={query.data.insights}
 *         />
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function useNLQuery() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useMutation({
    mutationFn: async ({ query, projectId }: { query: string; projectId?: string }) => {
      if (!isLoaded || !isSignedIn) {
        throw new Error('Not authenticated');
      }

      const params = new URLSearchParams();
      params.append('query', query);
      if (projectId) params.append('project_id', projectId);

      const response = await fetchJson<NLQueryResponse>(
        `/api/v1/correlations/query?${params.toString()}`,
        { method: 'POST' }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
  });
}

// ============================================================================
// Hooks - Correlation Keys
// ============================================================================

/**
 * Hook to fetch events by commit SHA.
 */
export function useEventsByCommit(commitSha: string | null) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['correlations', 'by-commit', commitSha],
    queryFn: async () => {
      if (!commitSha) throw new Error('Commit SHA is required');

      const response = await fetchJson<{ commit_sha: string; events: SDLCEvent[] }>(
        `/api/v1/correlations/by-commit/${commitSha}`
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn && !!commitSha,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch events by PR number.
 */
export function useEventsByPR(prNumber: number | null, projectId?: string) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['correlations', 'by-pr', prNumber, projectId],
    queryFn: async () => {
      if (!prNumber) throw new Error('PR number is required');

      const params = projectId ? `?project_id=${projectId}` : '';
      const response = await fetchJson<{ pr_number: number; events: SDLCEvent[] }>(
        `/api/v1/correlations/by-pr/${prNumber}${params}`
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn && !!prNumber,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch events by Jira key.
 */
export function useEventsByJira(jiraKey: string | null) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['correlations', 'by-jira', jiraKey],
    queryFn: async () => {
      if (!jiraKey) throw new Error('Jira key is required');

      const response = await fetchJson<{ jira_key: string; events: SDLCEvent[] }>(
        `/api/v1/correlations/by-jira/${jiraKey}`
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn && !!jiraKey,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch events by deploy ID.
 */
export function useEventsByDeploy(deployId: string | null) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['correlations', 'by-deploy', deployId],
    queryFn: async () => {
      if (!deployId) throw new Error('Deploy ID is required');

      const response = await fetchJson<{ deploy_id: string; events: SDLCEvent[] }>(
        `/api/v1/correlations/by-deploy/${deployId}`
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn && !!deployId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================================================
// Hooks - Statistics
// ============================================================================

/**
 * Hook to fetch correlation statistics.
 *
 * @param projectId - Optional project ID filter
 * @param days - Number of days to analyze (default 30)
 * @returns Query result with statistics
 */
export function useCorrelationStats(projectId?: string | null, days = 30) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['correlations', 'stats', projectId, days],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId);
      params.append('days', days.toString());

      const response = await fetchJson<CorrelationStats>(
        `/api/v1/correlations/stats?${params.toString()}`
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
