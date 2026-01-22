'use client';

import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { DiscoverySession, DiscoveredPage } from '@/lib/supabase/types';

/**
 * Extended discovery session with discovered pages for Visual AI integration
 */
export interface DiscoverySessionWithPages extends DiscoverySession {
  pages: DiscoveredPage[];
}

/**
 * Hook to fetch recent discovery sessions with their discovered pages.
 * Designed for Visual AI integration to allow selecting discovered URLs for visual testing.
 */
export function useRecentDiscoverySessions(projectId: string | null, limit: number = 5) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['discovery-sessions-with-pages', projectId, limit],
    queryFn: async (): Promise<DiscoverySessionWithPages[]> => {
      if (!projectId) return [];

      // Fetch recent completed discovery sessions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sessions, error: sessionError } = await (supabase.from('discovery_sessions') as any)
        .select('*')
        .eq('project_id', projectId)
        .in('status', ['completed', 'running'])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (sessionError) throw sessionError;
      if (!sessions || sessions.length === 0) return [];

      // Fetch pages for all sessions in parallel
      const sessionIds = sessions.map((s: DiscoverySession) => s.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allPages, error: pagesError } = await (supabase.from('discovered_pages') as any)
        .select('*')
        .in('discovery_session_id', sessionIds)
        .order('created_at', { ascending: false });

      if (pagesError) throw pagesError;

      // Group pages by session ID
      const pagesBySession = (allPages || []).reduce((acc: Record<string, DiscoveredPage[]>, page: DiscoveredPage) => {
        const sessionId = page.discovery_session_id;
        if (!acc[sessionId]) {
          acc[sessionId] = [];
        }
        acc[sessionId].push(page);
        return acc;
      }, {});

      // Combine sessions with their pages
      return (sessions as DiscoverySession[]).map((session) => ({
        ...session,
        pages: pagesBySession[session.id] || [],
      }));
    },
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30 seconds
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
    }, new Map<string, typeof discoveredUrls[0]>())
  ).map(([, value]) => value);

  // Sort by discovery date (newest first)
  uniqueUrls.sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime());

  return {
    discoveredUrls: uniqueUrls,
    isLoading,
    error,
  };
}
