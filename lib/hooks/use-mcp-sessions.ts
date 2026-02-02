import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { authenticatedFetch, convertKeysToCamelCase } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';

interface MCPConnection {
  id: string;
  userId: string;
  organizationId: string | null;
  clientId: string;
  clientName: string | null;
  clientType: string;
  sessionId: string | null;
  deviceName: string | null;
  status: string;
  lastActivityAt: string;
  requestCount: number;
  toolsUsed: string[];
  connectedAt: string;
  isActive: boolean;
}

interface MCPActivity {
  id: string;
  connectionId: string;
  activityType: string;
  toolName: string | null;
  durationMs: number | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export function useMCPSessions(orgId: string) {
  const { isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['mcp-sessions', orgId],
    queryFn: async () => {
      // Use global authenticatedFetch which has pre-configured token getter
      const response = await authenticatedFetch(`/api/v1/mcp/connections?org_id=${orgId}`, {
        headers: { 'X-Organization-ID': orgId },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch MCP sessions');
      }
      const data = await response.json();
      return convertKeysToCamelCase(data) as { connections: MCPConnection[]; total: number; activeCount: number };
    },
    staleTime: 30 * 1000, // 30 seconds
    // Only fetch when auth is loaded, user is signed in, and orgId is set
    enabled: isLoaded && isSignedIn && !!orgId,
  });
}

export function useMCPSessionActivity(connectionId: string) {
  const [activities, setActivities] = useState<MCPActivity[]>([]);

  // Initial fetch
  useEffect(() => {
    // Fetch initial activities
  }, [connectionId]);

  // Subscribe to realtime updates
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`mcp-activity-${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mcp_connection_activity',
          filter: `connection_id=eq.${connectionId}`,
        },
        (payload) => {
          const converted = convertKeysToCamelCase(payload.new) as MCPActivity;
          setActivities(prev => [converted, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId]);

  return { activities };
}

export function useRevokeMCPSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ connectionId, orgId }: { connectionId: string; orgId: string }) => {
      const response = await authenticatedFetch(`/api/v1/mcp/connections/${connectionId}`, {
        method: 'DELETE',
        headers: { 'X-Organization-ID': orgId },
      });
      if (!response.ok) {
        throw new Error('Failed to revoke session');
      }
      const data = await response.json();
      return convertKeysToCamelCase(data);
    },
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: ['mcp-sessions', orgId] });
    },
  });
}
