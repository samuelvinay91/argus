'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './use-auth-api';

// ============================================================================
// Types
// ============================================================================

/**
 * Platform identifiers for integrations
 */
export type IntegrationPlatform =
  // Source Code Management
  | 'github'
  | 'gitlab'
  | 'bitbucket'
  | 'azure_devops'
  // Issue Tracking
  | 'jira'
  | 'linear'
  | 'asana'
  | 'trello'
  | 'clickup'
  | 'shortcut'
  | 'monday'
  | 'notion'
  | 'height'
  // Chat & Notifications
  | 'slack'
  | 'discord'
  | 'teams'
  | 'google_chat'
  // CI/CD
  | 'github_actions'
  | 'gitlab_ci'
  | 'jenkins'
  | 'circleci'
  | 'azure_pipelines'
  | 'bitbucket_pipelines'
  | 'teamcity'
  // Deployment
  | 'vercel'
  | 'netlify'
  | 'heroku'
  | 'railway'
  | 'render'
  | 'flyio'
  | 'aws'
  // Observability
  | 'sentry'
  | 'datadog'
  | 'newrelic'
  | 'grafana'
  | 'splunk'
  | 'dynatrace'
  // Session Replay
  | 'logrocket'
  | 'fullstory'
  | 'posthog'
  | 'hotjar'
  | 'heap'
  // Analytics
  | 'amplitude'
  | 'mixpanel'
  | 'segment'
  // Incident Management
  | 'pagerduty'
  | 'opsgenie'
  | 'incident_io'
  | 'spike'
  | 'victorops'
  // Feature Flags
  | 'launchdarkly'
  | 'split'
  | 'flagsmith'
  | 'unleash'
  // Testing
  | 'browserstack'
  | 'saucelabs'
  | 'lambdatest'
  | 'percy'
  | 'chromatic'
  | 'playwright'
  | 'cypress'
  // Webhooks & Automation
  | 'webhook'
  | 'zapier'
  | 'n8n'
  // AI & Coding Agents
  | 'cursor'
  | 'claude_code'
  // Database
  | 'supabase'
  | 'turso';

/**
 * Authentication type for integrations
 */
export type IntegrationAuthType = 'oauth' | 'api_key' | 'webhook';

/**
 * Sync status for integrations
 */
export type IntegrationSyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/**
 * Integration configuration from the backend
 */
export interface Integration {
  id: string;
  platform: IntegrationPlatform;
  name: string;
  description: string;
  connected: boolean;
  auth_type: IntegrationAuthType;
  features: string[];
  // Connection metadata
  connected_at?: string | null;
  connected_by?: string | null;
  // Sync information
  last_sync_at?: string | null;
  sync_status?: IntegrationSyncStatus;
  data_points?: number;
  // Platform-specific configuration (sanitized, no secrets)
  config?: Record<string, unknown>;
  // Error information
  error_message?: string | null;
}

/**
 * Response from listing integrations
 */
export interface IntegrationsListResponse {
  integrations: Integration[];
  total: number;
}

/**
 * Request payload for connecting an integration
 */
export interface ConnectIntegrationRequest {
  // Common fields
  api_key?: string;
  auth_token?: string; // For Sentry and similar platforms
  webhook_url?: string;
  // OAuth (returned from OAuth flow)
  oauth_code?: string;
  oauth_state?: string;
  // Platform-specific fields
  site?: string; // e.g., for Datadog
  application_key?: string; // e.g., for Datadog
  org_slug?: string; // e.g., for Sentry
  project_slug?: string; // e.g., for Sentry
  project_key?: string; // e.g., for Jira
  instance_url?: string; // e.g., for Jira
  email?: string; // e.g., for Jira
  team_id?: string; // e.g., for Linear/Slack
  channel?: string; // e.g., for Slack/Discord
  bot_name?: string; // e.g., for Discord
  // Notification preferences
  notify_on_failure?: boolean;
  notify_on_success?: boolean;
  notify_on_healing?: boolean;
  // Issue tracker settings
  auto_create_issues?: boolean;
  issue_type?: string;
  default_priority?: number;
  link_to_runs?: boolean;
}

/**
 * Response from connecting an integration
 */
export interface ConnectIntegrationResponse {
  success: boolean;
  integration: Integration;
  message: string;
  // For OAuth integrations
  oauth_url?: string;
}

/**
 * Response from disconnecting an integration
 */
export interface DisconnectIntegrationResponse {
  success: boolean;
  message: string;
}

/**
 * Response from testing an integration
 */
export interface TestIntegrationResponse {
  success: boolean;
  message: string;
  details?: {
    latency_ms?: number;
    api_version?: string;
    permissions?: string[];
  };
}

/**
 * Response from syncing an integration
 */
export interface SyncIntegrationResponse {
  success: boolean;
  message: string;
  sync_id?: string;
  data_points_synced?: number;
  started_at?: string;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch all integrations for the current organization.
 *
 * @returns Query result with list of integrations
 *
 * @example
 * ```tsx
 * function IntegrationsList() {
 *   const { data, isLoading, error } = useIntegrations();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <div>
 *       {data?.integrations.map(integration => (
 *         <IntegrationCard key={integration.id} integration={integration} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useIntegrations() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const response = await fetchJson<IntegrationsListResponse>('/api/v1/integrations');

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Poll every 5 seconds when any integration is syncing
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasSyncing = data?.integrations.some(
        (i) => i.sync_status === 'syncing'
      );
      return hasSyncing ? 5000 : false;
    },
  });
}

/**
 * Hook to get a specific integration by platform.
 *
 * @param platform - The platform identifier
 * @returns The integration if found, undefined otherwise
 *
 * @example
 * ```tsx
 * function DatadogCard() {
 *   const integration = useIntegration('datadog');
 *
 *   if (!integration) return null;
 *
 *   return <Card>{integration.name} - {integration.connected ? 'Connected' : 'Not connected'}</Card>;
 * }
 * ```
 */
export function useIntegration(platform: IntegrationPlatform) {
  const { data } = useIntegrations();

  return data?.integrations.find((i) => i.platform === platform);
}

/**
 * Hook to connect an integration.
 *
 * @returns Mutation for connecting integrations
 *
 * @example
 * ```tsx
 * function ConnectDatadogButton() {
 *   const connectIntegration = useConnectIntegration();
 *
 *   const handleConnect = async () => {
 *     try {
 *       await connectIntegration.mutateAsync({
 *         platform: 'datadog',
 *         config: {
 *           api_key: 'your-api-key',
 *           application_key: 'your-app-key',
 *           site: 'datadoghq.com',
 *         },
 *       });
 *       toast.success({ title: 'Datadog connected successfully!' });
 *     } catch (error) {
 *       toast.error({ title: 'Failed to connect', description: error.message });
 *     }
 *   };
 *
 *   return <button onClick={handleConnect}>Connect Datadog</button>;
 * }
 * ```
 */
export function useConnectIntegration() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      platform,
      config,
    }: {
      platform: IntegrationPlatform;
      config: ConnectIntegrationRequest;
    }): Promise<ConnectIntegrationResponse> => {
      // Backend expects credentials to be wrapped in a "credentials" object
      // Also extract non-credential fields to their proper locations
      const { notify_on_failure, notify_on_success, notify_on_healing,
              auto_create_issues, issue_type, default_priority, link_to_runs,
              ...credentialFields } = config;

      const requestBody = {
        credentials: credentialFields,
        settings: {
          notify_on_failure,
          notify_on_success,
          notify_on_healing,
          auto_create_issues,
          issue_type,
          default_priority,
          link_to_runs,
        },
      };

      const response = await fetchJson<ConnectIntegrationResponse>(
        `/api/v1/integrations/${platform}/connect`,
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

/**
 * Hook to disconnect an integration.
 *
 * @returns Mutation for disconnecting integrations
 *
 * @example
 * ```tsx
 * function DisconnectButton({ platform }: { platform: IntegrationPlatform }) {
 *   const disconnectIntegration = useDisconnectIntegration();
 *
 *   const handleDisconnect = async () => {
 *     if (confirm('Are you sure you want to disconnect this integration?')) {
 *       await disconnectIntegration.mutateAsync(platform);
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleDisconnect} disabled={disconnectIntegration.isPending}>
 *       {disconnectIntegration.isPending ? 'Disconnecting...' : 'Disconnect'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDisconnectIntegration() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      platform: IntegrationPlatform
    ): Promise<DisconnectIntegrationResponse> => {
      const response = await fetchJson<DisconnectIntegrationResponse>(
        `/api/v1/integrations/${platform}/disconnect`,
        {
          method: 'POST',
        }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || { success: true, message: 'Integration disconnected' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

/**
 * Hook to test an integration connection.
 *
 * @returns Mutation for testing integration connections
 *
 * @example
 * ```tsx
 * function TestConnectionButton({ platform }: { platform: IntegrationPlatform }) {
 *   const testIntegration = useTestIntegration();
 *
 *   const handleTest = async () => {
 *     try {
 *       const result = await testIntegration.mutateAsync(platform);
 *       if (result.success) {
 *         toast.success({ title: 'Connection successful!', description: `Latency: ${result.details?.latency_ms}ms` });
 *       } else {
 *         toast.error({ title: 'Connection failed', description: result.message });
 *       }
 *     } catch (error) {
 *       toast.error({ title: 'Test failed', description: error.message });
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleTest} disabled={testIntegration.isPending}>
 *       {testIntegration.isPending ? 'Testing...' : 'Test Connection'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useTestIntegration() {
  const { fetchJson } = useAuthApi();

  return useMutation({
    mutationFn: async (
      platform: IntegrationPlatform
    ): Promise<TestIntegrationResponse> => {
      const response = await fetchJson<TestIntegrationResponse>(
        `/api/v1/integrations/${platform}/test`,
        {
          method: 'POST',
        }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || { success: false, message: 'No response from server' };
    },
    // Don't invalidate queries - this is a read-only operation
  });
}

/**
 * Hook to trigger a sync for an integration.
 *
 * @returns Mutation for syncing integration data
 *
 * @example
 * ```tsx
 * function SyncButton({ platform }: { platform: IntegrationPlatform }) {
 *   const syncIntegration = useSyncIntegration();
 *
 *   const handleSync = async () => {
 *     try {
 *       const result = await syncIntegration.mutateAsync(platform);
 *       toast.success({ title: 'Sync started', description: result.message });
 *     } catch (error) {
 *       toast.error({ title: 'Sync failed', description: error.message });
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleSync} disabled={syncIntegration.isPending}>
 *       {syncIntegration.isPending ? 'Syncing...' : 'Sync Now'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useSyncIntegration() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      platform: IntegrationPlatform
    ): Promise<SyncIntegrationResponse> => {
      const response = await fetchJson<SyncIntegrationResponse>(
        `/api/v1/integrations/${platform}/sync`,
        {
          method: 'POST',
        }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || { success: true, message: 'Sync started' };
    },
    onSuccess: () => {
      // Invalidate to trigger polling for sync status
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

/**
 * Hook to sync all connected integrations at once.
 *
 * @returns Mutation for syncing all integrations
 *
 * @example
 * ```tsx
 * function SyncAllButton() {
 *   const syncAllIntegrations = useSyncAllIntegrations();
 *
 *   const handleSyncAll = async () => {
 *     try {
 *       await syncAllIntegrations.mutateAsync();
 *       toast.success({ title: 'All integrations syncing' });
 *     } catch (error) {
 *       toast.error({ title: 'Sync failed', description: error.message });
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleSyncAll} disabled={syncAllIntegrations.isPending}>
 *       {syncAllIntegrations.isPending ? 'Syncing...' : 'Sync All'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useSyncAllIntegrations() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; message: string; syncs: SyncIntegrationResponse[] }> => {
      const response = await fetchJson<{ success: boolean; message: string; syncs: SyncIntegrationResponse[] }>(
        '/api/v1/integrations/sync-all',
        {
          method: 'POST',
        }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || { success: true, message: 'All integrations syncing', syncs: [] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

/**
 * Hook to get integration statistics.
 *
 * @returns Object with integration statistics
 *
 * @example
 * ```tsx
 * function IntegrationStats() {
 *   const stats = useIntegrationStats();
 *
 *   return (
 *     <div>
 *       <p>Connected: {stats.connected} / {stats.total}</p>
 *       <p>Total data points: {stats.totalDataPoints.toLocaleString()}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useIntegrationStats() {
  const { data, isLoading } = useIntegrations();

  const integrations = data?.integrations || [];

  const stats = {
    total: integrations.length,
    connected: integrations.filter((i) => i.connected).length,
    disconnected: integrations.filter((i) => !i.connected).length,
    syncing: integrations.filter((i) => i.sync_status === 'syncing').length,
    totalDataPoints: integrations.reduce((sum, i) => sum + (i.data_points || 0), 0),
    lastSync: integrations.reduce((latest: string | null, i) => {
      if (!i.last_sync_at) return latest;
      if (!latest) return i.last_sync_at;
      return new Date(i.last_sync_at) > new Date(latest) ? i.last_sync_at : latest;
    }, null),
    isLoading,
  };

  return stats;
}
