'use client';

import { useQuery } from '@tanstack/react-query';
import { discoveryApi, type DiscoverySession, type DiscoveredPage } from '@/lib/api-client';

/**
 * Extended discovery session with discovered pages for Visual AI integration
 */
export interface DiscoverySessionWithPages {
  id: string;
  project_id: string;
  status: string;
  app_url: string;
  created_at: string;
  pages: Array<{
    id: string;
    discovery_session_id: string;
    url: string;
    title: string | null;
    page_type: string;
    created_at: string;
  }>;
}

/**
 * Transform API response to legacy format for backward compatibility
 */
function transformSessionToLegacy(
  session: DiscoverySession,
  pages: DiscoveredPage[]
): DiscoverySessionWithPages {
  return {
    id: session.id,
    project_id: session.projectId,
    status: session.status,
    app_url: session.appUrl,
    created_at: session.startedAt,
    pages: pages.map((page) => ({
      id: page.id,
      discovery_session_id: page.sessionId,
      url: page.url,
      title: page.title || null,
      page_type: page.pageType,
      created_at: page.discoveredAt,
    })),
  };
}

/**
 * Hook to fetch recent discovery sessions with their discovered pages.
 * Designed for Visual AI integration to allow selecting discovered URLs for visual testing.
 */
export function useRecentDiscoverySessions(projectId: string | null, limit: number = 5) {
  return useQuery({
    queryKey: ['discovery-sessions-with-pages', projectId, limit],
    queryFn: async (): Promise<DiscoverySessionWithPages[]> => {
      if (!projectId) return [];

      // Fetch recent completed/running discovery sessions via API
      const response = await discoveryApi.listSessions({
        projectId,
        limit,
      });

      // Filter to only completed or running sessions
      const filteredSessions = response.sessions.filter(
        (s) => s.status === 'completed' || s.status === 'running'
      );

      if (filteredSessions.length === 0) return [];

      // Fetch pages for each session in parallel
      const sessionsWithPages = await Promise.all(
        filteredSessions.map(async (session) => {
          try {
            const pages = await discoveryApi.getPages(session.id);
            return transformSessionToLegacy(session, pages);
          } catch {
            // If pages fetch fails, return session with empty pages
            return transformSessionToLegacy(session, []);
          }
        })
      );

      return sessionsWithPages;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: [],
  });
}

/**
 * Get all unique discovered URLs from recent sessions
 */
export function useDiscoveredUrls(projectId: string | null) {
  const { data: sessions = [], isLoading, error } = useRecentDiscoverySessions(projectId, 10);

  // Extract unique URLs from all sessions
  const discoveredUrls = sessions.flatMap((session) =>
    session.pages.map((page) => ({
      url: page.url,
      title: page.title || page.url,
      pageType: page.page_type,
      sessionId: session.id,
      sessionUrl: session.app_url,
      discoveredAt: page.created_at,
    }))
  );

  // Deduplicate by URL, keeping the most recent
  const uniqueUrls = Array.from(
    discoveredUrls.reduce((map, item) => {
      const existing = map.get(item.url);
      if (!existing || new Date(item.discoveredAt) > new Date(existing.discoveredAt)) {
        map.set(item.url, item);
      }
      return map;
    }, new Map<string, (typeof discoveredUrls)[0]>())
  ).map(([, value]) => value);

  // Sort by discovery date (newest first)
  uniqueUrls.sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime());

  return {
    discoveredUrls: uniqueUrls,
    isLoading,
    error,
  };
}
