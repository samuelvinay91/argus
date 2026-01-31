'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discoveryApi } from '@/lib/api-client';
import type { DiscoverySession, DiscoveredPage, DiscoveredFlow, Json } from '@/lib/supabase/types';

/**
 * Transform API discovery session to legacy Supabase format
 */
function transformSessionToLegacy(session: {
  id: string;
  projectId: string;
  status: string;
  appUrl: string;
  mode: string;
  strategy: string;
  maxPages: number;
  maxDepth: number;
  pagesFound: number;
  flowsFound: number;
  elementsFound: number;
  formsFound: number;
  startedAt: string;
  completedAt: string | null;
  coverageScore: number | null;
  videoArtifactId: string | null;
  recordingUrl: string | null;
}): DiscoverySession {
  // Return only fields that exist in the Supabase type
  return {
    id: session.id,
    project_id: session.projectId,
    status: session.status as DiscoverySession['status'],
    app_url: session.appUrl,
    pages_found: session.pagesFound,
    flows_found: session.flowsFound,
    forms_found: session.formsFound,
    elements_found: session.elementsFound,
    started_at: session.startedAt,
    completed_at: session.completedAt,
    triggered_by: null,
    created_at: session.startedAt,
  };
}

/**
 * Transform API page to legacy Supabase format
 */
function transformPageToLegacy(page: {
  id: string;
  sessionId: string;
  url: string;
  title: string;
  description: string;
  pageType: string;
  screenshotUrl: string | null;
  elementsCount: number;
  formsCount: number;
  linksCount: number;
  discoveredAt: string;
  loadTimeMs: number | null;
  aiAnalysis: Record<string, unknown> | null;
}): DiscoveredPage {
  // Return only fields that exist in the Supabase type
  return {
    id: page.id,
    discovery_session_id: page.sessionId,
    project_id: '', // API doesn't return project_id
    url: page.url,
    title: page.title,
    page_type: page.pageType,
    element_count: page.elementsCount,
    form_count: page.formsCount,
    link_count: page.linksCount,
    screenshot_url: page.screenshotUrl,
    metadata: {} as Json,
    created_at: page.discoveredAt,
  };
}

/**
 * Transform API flow to legacy Supabase format
 */
function transformFlowToLegacy(flow: {
  id: string;
  sessionId: string;
  name: string;
  description: string;
  category: string;
  priority: string;
  startUrl: string;
  steps: Array<Record<string, unknown>>;
  pagesInvolved: string[];
  estimatedDuration: number | null;
  complexityScore: number | null;
  testGenerated: boolean;
  validated: boolean;
  validationResult: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string | null;
}): DiscoveredFlow {
  // Return only fields that exist in the Supabase type
  return {
    id: flow.id,
    discovery_session_id: flow.sessionId,
    project_id: '', // API doesn't return project_id
    name: flow.name,
    description: flow.description,
    steps: flow.steps as Json,
    step_count: flow.steps?.length ?? 0,
    priority: flow.priority as DiscoveredFlow['priority'],
    converted_to_test_id: flow.testGenerated ? flow.id : null,
    created_at: flow.createdAt,
  };
}

export function useDiscoverySessions(projectId: string | null) {
  return useQuery({
    queryKey: ['discovery-sessions', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await discoveryApi.listSessions({
        projectId,
        limit: 100,
      });

      return response.sessions.map(transformSessionToLegacy);
    },
    enabled: !!projectId,
    staleTime: 10 * 1000, // 10 seconds - refresh frequently to pick up new sessions
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    placeholderData: [], // Prevent loading state flash
  });
}

export function useDiscoveredPages(sessionId: string | null) {
  return useQuery({
    queryKey: ['discovered-pages', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const pages = await discoveryApi.getPages(sessionId);
      return pages.map(transformPageToLegacy);
    },
    enabled: !!sessionId,
    staleTime: 15 * 1000, // 15 seconds - discovery pages may update during crawl
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    placeholderData: [], // Prevent loading state flash
  });
}

export function useDiscoveredFlows(sessionId: string | null) {
  return useQuery({
    queryKey: ['discovered-flows', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const flows = await discoveryApi.getFlows(sessionId);
      return flows.map(transformFlowToLegacy);
    },
    enabled: !!sessionId,
    staleTime: 15 * 1000, // 15 seconds - flows may be added during crawl
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    placeholderData: [], // Prevent loading state flash
  });
}

export function useLatestDiscoveryData(projectId: string | null) {
  return useQuery({
    queryKey: ['latest-discovery', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      // Get sessions for this project
      const response = await discoveryApi.listSessions({
        projectId,
        limit: 1,
      });

      if (response.sessions.length === 0) return null;

      const latestSession = response.sessions[0];

      // Fetch pages and flows in parallel
      const [pages, flows] = await Promise.all([
        discoveryApi.getPages(latestSession.id),
        discoveryApi.getFlows(latestSession.id),
      ]);

      return {
        session: transformSessionToLegacy(latestSession),
        pages: pages.map(transformPageToLegacy),
        flows: flows.map(transformFlowToLegacy),
      };
    },
    enabled: !!projectId,
    staleTime: 10 * 1000, // 10 seconds - refresh to show latest discovery results
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    placeholderData: null, // Prevent loading state flash
  });
}

interface DiscoveryResult {
  session: DiscoverySession;
  pages: DiscoveredPage[];
  flows: DiscoveredFlow[];
}

/**
 * @deprecated Use `useStartDiscoverySession` from `use-discovery-session.ts` instead.
 *
 * This legacy hook has been updated to use the backend API instead of direct Supabase
 * writes, but the modern session-based discovery system with SSE streaming is preferred.
 *
 * The modern hook provides:
 * - Backend session state management
 * - Real-time SSE streaming updates
 * - Proper background task scheduling
 * - Database persistence
 *
 * This hook is kept for backwards compatibility but should not be used for new code.
 */
export function useStartDiscovery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      appUrl,
    }: {
      projectId: string;
      appUrl: string;
      triggeredBy?: string | null;
    }): Promise<DiscoveryResult> => {
      // Start discovery session via backend API
      const session = await discoveryApi.startSession({
        projectId,
        appUrl,
        mode: 'quick_scan',
        strategy: 'breadth_first',
        maxPages: 10,
        maxDepth: 2,
      });

      // Poll for completion (simple polling, not SSE)
      let currentSession = session;
      const maxWaitMs = 120000; // 2 minutes
      const pollIntervalMs = 2000;
      let waitedMs = 0;

      while (
        currentSession.status === 'pending' ||
        currentSession.status === 'running'
      ) {
        if (waitedMs >= maxWaitMs) {
          throw new Error('Discovery timed out');
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        waitedMs += pollIntervalMs;

        currentSession = await discoveryApi.getSession(session.id);
      }

      if (currentSession.status === 'failed') {
        throw new Error('Discovery failed');
      }

      // Fetch pages and flows
      const [pages, flows] = await Promise.all([
        discoveryApi.getPages(session.id),
        discoveryApi.getFlows(session.id),
      ]);

      return {
        session: transformSessionToLegacy(currentSession),
        pages: pages.map(transformPageToLegacy),
        flows: flows.map(transformFlowToLegacy),
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['discovery-sessions', data.session.project_id] });
      queryClient.invalidateQueries({ queryKey: ['latest-discovery', data.session.project_id] });
    },
  });
}
