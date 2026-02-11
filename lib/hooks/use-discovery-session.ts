'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { discoveryApi, apiClient, BACKEND_URL, getAuthToken } from '@/lib/api-client';
import type {
  DiscoveredPage,
  DiscoveredFlow,
  Json,
} from '@/lib/supabase/types';

// ============================================
// API Configuration
// ============================================

const API_BASE = '/api/v1/discovery';

// ============================================
// Types
// ============================================

// IMPORTANT: These must match the backend enums in src/api/discovery.py
export type DiscoveryMode = 'standard_crawl' | 'quick_scan' | 'deep_analysis' | 'authenticated' | 'api_first';
export type DiscoveryStrategy = 'breadth_first' | 'depth_first' | 'priority_based' | 'smart_adaptive';
export type DiscoverySessionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

// Mapping for display purposes (user-friendly names)
export const DISCOVERY_MODE_LABELS: Record<DiscoveryMode, string> = {
  standard_crawl: 'Standard Crawl',
  quick_scan: 'Quick Scan',
  deep_analysis: 'Deep Analysis',
  authenticated: 'Authenticated',
  api_first: 'API First',
};

export const DISCOVERY_STRATEGY_LABELS: Record<DiscoveryStrategy, string> = {
  breadth_first: 'Breadth First',
  depth_first: 'Depth First',
  priority_based: 'Priority Based',
  smart_adaptive: 'AI Adaptive',
};

export interface AuthConfig {
  type: 'none' | 'basic' | 'bearer' | 'cookie' | 'oauth' | 'custom';
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
    cookie?: string;
    loginUrl?: string;
    loginSteps?: Array<{ instruction: string }>;
  };
}

export interface DiscoveryConfig {
  mode?: DiscoveryMode;
  strategy?: DiscoveryStrategy;
  maxPages?: number;
  maxDepth?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  focusAreas?: string[];
  captureScreenshots?: boolean;
  useVisionAi?: boolean;
  authConfig?: AuthConfig;
  timeout?: number;
  waitForNetworkIdle?: boolean;
  respectRobotsTxt?: boolean;
}

export interface StartDiscoveryParams {
  projectId: string;
  appUrl: string;
  mode?: DiscoveryMode;
  strategy?: DiscoveryStrategy;
  maxPages?: number;
  maxDepth?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  focusAreas?: string[];
  captureScreenshots?: boolean;
  useVisionAi?: boolean;
  authConfig?: AuthConfig;
}

export interface DiscoverySessionResponse {
  id: string;
  projectId: string;
  appUrl: string;
  status: DiscoverySessionStatus;
  config: DiscoveryConfig;
  progress: {
    pagesDiscovered: number;
    pagesQueued: number;
    flowsIdentified: number;
    currentUrl?: string;
    currentStep?: string;
  };
  startedAt: string | null;
  completedAt: string | null;
  error?: string;
}

export interface DiscoveredPageResponse {
  id: string;
  sessionId: string;
  url: string;
  title: string | null;
  pageType: string | null;
  elementCount: number;
  formCount: number;
  linkCount: number;
  screenshotUrl: string | null;
  metadata: Json;
  createdAt: string;
}

export interface DiscoveredFlowResponse {
  id: string;
  sessionId: string;
  name: string;
  description: string | null;
  steps: Array<{ instruction: string; selector?: string }>;
  stepCount: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status?: 'pending' | 'validated' | 'failed' | 'converted';
  convertedToTestId: string | null;
  createdAt: string;
}

export interface FlowValidationResult {
  flowId: string;
  valid: boolean;
  errors: Array<{
    step: number;
    message: string;
    suggestion?: string;
  }>;
  warnings: Array<{
    step: number;
    message: string;
  }>;
  duration: number;
}

export interface GeneratedTestResult {
  testId: string;
  flowId: string;
  name: string;
  steps: Array<{ instruction: string }>;
  assertions: Array<{ type: string; value: string }>;
}

export interface DiscoveryStatus {
  sessionId: string;
  status: DiscoverySessionStatus;
  progress: {
    pagesDiscovered: number;
    pagesQueued: number;
    flowsIdentified: number;
    currentUrl?: string;
    currentStep?: string;
    percentComplete: number;
  };
  lastUpdate: string;
  events: Array<{
    type: 'page_discovered' | 'flow_identified' | 'error' | 'info';
    message: string;
    timestamp: string;
    data?: Json;
  }>;
}

export interface DiscoveryHistoryItem {
  id: string;
  appUrl: string;
  status: DiscoverySessionStatus;
  pagesFound: number;
  flowsFound: number;
  startedAt: string | null;
  completedAt: string | null;
  duration?: number;
}

// ============================================
// Hooks
// ============================================

/**
 * Start a new discovery session
 */
export function useStartDiscoverySession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: StartDiscoveryParams): Promise<DiscoverySessionResponse> => {
      return apiClient.post<DiscoverySessionResponse>(`${API_BASE}/sessions`, params);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['discovery-sessions', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['discovery-history', data.projectId] });
    },
    onError: (error) => {
      console.error('Failed to start discovery session:', error);
    },
  });
}

/**
 * Get discovery session by ID with automatic polling while running
 */
export function useDiscoverySession(sessionId: string | null) {
  return useQuery({
    queryKey: ['discovery-session', sessionId],
    queryFn: async (): Promise<DiscoverySessionResponse | null> => {
      if (!sessionId) return null;
      return apiClient.get<DiscoverySessionResponse>(`${API_BASE}/sessions/${sessionId}`);
    },
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const data = query.state.data as DiscoverySessionResponse | null | undefined;
      // Poll every 2 seconds while running
      return data?.status === 'running' ? 2000 : false;
    },
    staleTime: 1000, // 1 second - session status changes frequently
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

/**
 * Get discovered pages for a session
 */
export function useDiscoveredPages(sessionId: string | null) {
  return useQuery({
    queryKey: ['discovered-pages', sessionId],
    queryFn: async (): Promise<DiscoveredPage[]> => {
      if (!sessionId) return [];

      const pages = await discoveryApi.getPages(sessionId);

      // Transform API response to legacy format
      // Note: Supabase type expects project_id as string, but API doesn't return it
      // So we use empty string as a fallback
      return pages.map((page) => ({
        id: page.id,
        discovery_session_id: page.sessionId,
        project_id: '', // API doesn't return project_id, use empty string
        url: page.url,
        title: page.title,
        page_type: page.pageType,
        element_count: page.elementsCount,
        form_count: page.formsCount,
        link_count: page.linksCount,
        screenshot_url: page.screenshotUrl,
        metadata: {} as Json,
        created_at: page.discoveredAt,
      }));
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    placeholderData: [],
  });
}

/**
 * Get discovered flows for a session
 */
export function useDiscoveredFlows(sessionId: string | null) {
  return useQuery({
    queryKey: ['discovered-flows', sessionId],
    queryFn: async (): Promise<DiscoveredFlow[]> => {
      if (!sessionId) return [];

      const flows = await discoveryApi.getFlows(sessionId);

      // Transform API response to legacy format
      // Supabase type is simpler - only core fields
      return flows.map((flow) => ({
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
      }));
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    placeholderData: [],
  });
}

/**
 * Update a discovered flow
 */
export function useUpdateFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      flowId,
      updates,
    }: {
      flowId: string;
      updates: Partial<DiscoveredFlow>;
    }): Promise<DiscoveredFlow> => {
      const apiUpdates = {
        name: updates.name,
        description: updates.description ?? undefined,
        priority: updates.priority,
        steps: updates.steps as Record<string, unknown>[] | undefined,
      };

      const flow = await discoveryApi.updateFlow(flowId, apiUpdates);

      // Transform API response to legacy format (matching Supabase type)
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
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['discovered-flows'] });
      queryClient.invalidateQueries({
        queryKey: ['discovered-flows', data.discovery_session_id],
      });
    },
    onError: (error) => {
      console.error('Failed to update flow:', error);
    },
  });
}

/**
 * Validate a discovered flow
 */
export function useValidateFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flowId: string): Promise<FlowValidationResult> => {
      return apiClient.post<FlowValidationResult>(`${API_BASE}/flows/${flowId}/validate`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['discovered-flows'] });
      // Update the specific flow's validation status
      queryClient.setQueryData(
        ['flow-validation', data.flowId],
        data
      );
    },
    onError: (error) => {
      console.error('Failed to validate flow:', error);
    },
  });
}

/**
 * Generate test from a discovered flow
 */
export function useGenerateTestFromFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flowId: string): Promise<GeneratedTestResult> => {
      return apiClient.post<GeneratedTestResult>(`${API_BASE}/flows/${flowId}/generate-test`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovered-flows'] });
      queryClient.invalidateQueries({ queryKey: ['tests'] });
    },
    onError: (error) => {
      console.error('Failed to generate test from flow:', error);
    },
  });
}

/**
 * Pause a running discovery session
 */
export function usePauseDiscovery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string): Promise<DiscoverySessionResponse> => {
      return apiClient.post<DiscoverySessionResponse>(`${API_BASE}/sessions/${sessionId}/pause`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['discovery-session', data.id] });
      queryClient.invalidateQueries({ queryKey: ['discovery-sessions'] });
    },
    onError: (error) => {
      console.error('Failed to pause discovery:', error);
    },
  });
}

/**
 * Resume a paused discovery session
 */
export function useResumeDiscovery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string): Promise<DiscoverySessionResponse> => {
      return apiClient.post<DiscoverySessionResponse>(`${API_BASE}/sessions/${sessionId}/resume`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['discovery-session', data.id] });
      queryClient.invalidateQueries({ queryKey: ['discovery-sessions'] });
    },
    onError: (error) => {
      console.error('Failed to resume discovery:', error);
    },
  });
}

/**
 * Cancel a discovery session
 */
export function useCancelDiscovery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string): Promise<DiscoverySessionResponse> => {
      return apiClient.post<DiscoverySessionResponse>(`${API_BASE}/sessions/${sessionId}/cancel`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['discovery-session', data.id] });
      queryClient.invalidateQueries({ queryKey: ['discovery-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['discovery-history'] });
    },
    onError: (error) => {
      console.error('Failed to cancel discovery:', error);
    },
  });
}

/**
 * Get discovery history for a project
 */
export function useDiscoveryHistory(projectId: string | null, limit: number = 20) {
  return useQuery({
    queryKey: ['discovery-history', projectId, limit],
    queryFn: async (): Promise<DiscoveryHistoryItem[]> => {
      if (!projectId) return [];

      const history = await discoveryApi.getProjectHistory(projectId, { limit });

      return history.map((item) => ({
        id: item.id,
        appUrl: '', // Not returned by API, would need to fetch session details
        status: item.status as DiscoverySessionStatus,
        pagesFound: item.pagesFound,
        flowsFound: item.flowsFound,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
        duration: item.durationSeconds ? item.durationSeconds * 1000 : undefined,
      }));
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    placeholderData: [],
  });
}

/**
 * SSE hook for real-time discovery updates
 *
 * Note: Native EventSource doesn't support custom headers, so we pass
 * the auth token as a query parameter. The backend should accept both
 * Authorization header and ?token= query parameter for SSE endpoints.
 */
export function useDiscoveryStream(sessionId: string | null) {
  const [status, setStatus] = useState<DiscoveryStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(async () => {
    if (!sessionId) return null;

    // Get auth token for SSE connection
    // Native EventSource doesn't support headers, so pass token as query param
    const token = await getAuthToken();
    const url = new URL(`${BACKEND_URL}${API_BASE}/sessions/${sessionId}/stream`);
    if (token) {
      url.searchParams.set('token', token);
    }

    const eventSource = new EventSource(url.toString());

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as DiscoveryStatus;
        setStatus(data);
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      // Only set error if it's not a normal close
      if (eventSource.readyState !== EventSource.CLOSED) {
        setError(new Error('Connection to discovery stream lost'));
      }
    };

    return eventSource;
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setStatus(null);
      setIsConnected(false);
      return;
    }

    let eventSource: EventSource | null = null;

    // Connect asynchronously to get the token
    connect().then(es => {
      eventSource = es;
    });

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      setIsConnected(false);
    };
  }, [sessionId, connect]);

  // Auto-reconnect on error
  useEffect(() => {
    if (error && sessionId) {
      const timeout = setTimeout(() => {
        setError(null);
        connect();
      }, 3000); // Reconnect after 3 seconds

      return () => clearTimeout(timeout);
    }
  }, [error, sessionId, connect]);

  return {
    status,
    error,
    isConnected,
    reconnect: connect,
  };
}

/**
 * Hook to get flow validation status
 */
export function useFlowValidation(flowId: string | null) {
  return useQuery({
    queryKey: ['flow-validation', flowId],
    queryFn: async (): Promise<FlowValidationResult | null> => {
      if (!flowId) return null;
      return apiClient.get<FlowValidationResult>(`${API_BASE}/flows/${flowId}/validation-status`);
    },
    enabled: !!flowId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Bulk generate tests from multiple flows
 */
export function useBulkGenerateTests() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flowIds: string[]): Promise<GeneratedTestResult[]> => {
      return apiClient.post<GeneratedTestResult[]>(`${API_BASE}/flows/bulk-generate-tests`, { flowIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovered-flows'] });
      queryClient.invalidateQueries({ queryKey: ['tests'] });
    },
    onError: (error) => {
      console.error('Failed to bulk generate tests:', error);
    },
  });
}

/**
 * Delete a discovery session and all associated data
 */
export function useDeleteDiscoverySession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      projectId,
    }: {
      sessionId: string;
      projectId: string;
    }): Promise<void> => {
      await discoveryApi.deleteSession(sessionId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['discovery-sessions', variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['discovery-history', variables.projectId],
      });
      queryClient.removeQueries({
        queryKey: ['discovery-session', variables.sessionId],
      });
    },
    onError: (error) => {
      console.error('Failed to delete discovery session:', error);
    },
  });
}

/**
 * Export discovered flows as test file
 */
export function useExportFlowsAsTests() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      flowIds,
      format = 'playwright',
    }: {
      sessionId: string;
      flowIds?: string[];
      format?: 'playwright' | 'cypress' | 'testcafe' | 'json';
    }): Promise<{ content: string; filename: string }> => {
      return apiClient.post<{ content: string; filename: string }>(
        `${API_BASE}/sessions/${sessionId}/export`,
        { flowIds, format }
      );
    },
    onError: (error) => {
      console.error('Failed to export flows:', error);
    },
  });
}

// ============================================
// Cross-Project Pattern Types
// ============================================

export interface CrossProjectPattern {
  id: string;
  patternType: 'auth_flow' | 'form_flow' | 'navigation' | 'crud' | 'search' | 'checkout' | 'error_handling';
  patternName: string;
  description: string;
  timesSeen: number;
  projectCount: number;
  testSuccessRate: number;
  selfHealSuccessRate: number;
  selectors: string[];
  suggestedSteps?: Array<{ instruction: string }>;
  confidence: number;
  createdAt: string;
}

export interface PatternMatch {
  patternId: string;
  pattern: CrossProjectPattern;
  matchScore: number;
  matchedElements: Array<{
    selector: string;
    elementType: string;
    similarity: number;
  }>;
}

/**
 * Get cross-project patterns that match the current discovery session
 */
export function useCrossProjectPatterns(sessionId: string | null) {
  return useQuery({
    queryKey: ['cross-project-patterns', sessionId],
    queryFn: async (): Promise<PatternMatch[]> => {
      if (!sessionId) return [];

      const response = await discoveryApi.getSessionPatterns(sessionId);

      // Transform API response to PatternMatch format
      return response.patterns.map((p) => ({
        patternId: p.id,
        pattern: {
          id: p.id,
          patternType: p.patternType as CrossProjectPattern['patternType'],
          patternName: p.patternName,
          description: '', // Not in API response
          timesSeen: p.timesSeen,
          projectCount: 1, // Not in API response
          testSuccessRate: p.testSuccessRate || 0,
          selfHealSuccessRate: p.selfHealSuccessRate || 0,
          selectors: [], // Would need to extract from patternData
          suggestedSteps: undefined,
          confidence: Math.min(0.95, 0.5 + (p.timesSeen * 0.05)),
          createdAt: p.createdAt,
        },
        matchScore: 0.7, // Default score
        matchedElements: [],
      }));
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    placeholderData: [],
  });
}

/**
 * Get global patterns across all projects (for insights)
 */
export function useGlobalPatterns(limit: number = 5) {
  return useQuery({
    queryKey: ['global-patterns', limit],
    queryFn: async (): Promise<CrossProjectPattern[]> => {
      const response = await discoveryApi.listPatterns({ limit });

      return response.patterns.map((p) => ({
        id: p.id,
        patternType: p.patternType as CrossProjectPattern['patternType'],
        patternName: p.patternName,
        description: '', // Not in API response
        timesSeen: p.timesSeen,
        projectCount: 1, // Not in API response
        testSuccessRate: p.testSuccessRate || 0,
        selfHealSuccessRate: p.selfHealSuccessRate || 0,
        selectors: [], // Would need to extract from patternData
        suggestedSteps: undefined,
        confidence: Math.min(0.95, 0.5 + (p.timesSeen * 0.05)),
        createdAt: p.createdAt,
      }));
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    placeholderData: [],
  });
}

/**
 * Save a discovered pattern for cross-project learning
 */
export function useSavePattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pattern: Omit<CrossProjectPattern, 'id' | 'createdAt'>): Promise<CrossProjectPattern> => {
      return apiClient.post<CrossProjectPattern>(`${API_BASE}/patterns`, pattern);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-patterns'] });
      queryClient.invalidateQueries({ queryKey: ['cross-project-patterns'] });
    },
    onError: (error) => {
      console.error('Failed to save pattern:', error);
    },
  });
}

// ============================================
// Re-export read-only hooks for convenience
// ============================================

export {
  useDiscoverySessions,
  useLatestDiscoveryData,
  // NOTE: useStartDiscovery is deprecated - use useStartDiscoverySession instead
  // The legacy hook calls a non-existent /api/v1/discovery/observe endpoint
} from './use-discovery';
