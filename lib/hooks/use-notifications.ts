'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './use-auth-api';
import type { Json } from '@/lib/supabase/types';
import type {
  NotificationChannelApi,
  NotificationLogApi,
  NotificationChannelType,
  NotificationPriority,
  NotificationLogStatus,
} from '@/lib/api-client';

// ============================================================================
// Legacy Types (snake_case for backward compatibility)
// ============================================================================

export interface NotificationChannel {
  id: string;
  organization_id: string;
  project_id: string | null;
  name: string;
  channel_type: NotificationChannelType;
  config: Json;
  enabled: boolean;
  verified: boolean;
  verification_token: string | null;
  verified_at: string | null;
  rate_limit_per_hour: number;
  last_sent_at: string | null;
  sent_today: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Computed field
  rules_count?: number;
}

export interface NotificationRule {
  id: string;
  channel_id: string;
  name: string | null;
  description: string | null;
  event_type: string;
  conditions: Json;
  message_template: string | null;
  priority: NotificationPriority;
  cooldown_minutes: number;
  last_triggered_at: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  channel_id: string;
  rule_id: string | null;
  event_type: string;
  event_id: string | null;
  payload: Json;
  status: NotificationLogStatus;
  response_code: number | null;
  response_body: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  queued_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
  // Joined fields
  channel_name?: string;
  channel_type?: string;
}

// Generic config type that's compatible with Json - accepts any object
export type ChannelConfig = Record<string, unknown>;

export interface ChannelFormData {
  name: string;
  channel_type: NotificationChannelType;
  config: ChannelConfig;
  enabled: boolean;
  rate_limit_per_hour: number;
  rules: {
    event_type: string;
    conditions?: Record<string, unknown>;
    priority?: NotificationPriority;
    cooldown_minutes?: number;
  }[];
}

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform API response (camelCase) to legacy format (snake_case)
 */
function transformChannelToLegacy(channel: NotificationChannelApi): NotificationChannel {
  return {
    id: channel.id,
    organization_id: channel.organizationId,
    project_id: channel.projectId,
    name: channel.name,
    channel_type: channel.channelType,
    config: channel.config as Json,
    enabled: channel.enabled,
    verified: channel.verified,
    verification_token: null, // Not returned by API
    verified_at: null, // Not returned by API
    rate_limit_per_hour: channel.rateLimitPerHour,
    last_sent_at: channel.lastSentAt,
    sent_today: channel.sentToday,
    created_by: null, // Not returned by API
    created_at: channel.createdAt,
    updated_at: channel.updatedAt,
    rules_count: 0, // Will be populated separately
  };
}

/**
 * Transform API log response to legacy format
 */
function transformLogToLegacy(log: NotificationLogApi): NotificationLog {
  return {
    id: log.id,
    channel_id: log.channelId,
    rule_id: log.ruleId,
    event_type: log.eventType,
    event_id: null,
    payload: {} as Json,
    status: log.status,
    response_code: log.responseCode,
    response_body: null,
    error_message: log.errorMessage,
    retry_count: 0,
    max_retries: 3,
    next_retry_at: null,
    queued_at: log.createdAt,
    sent_at: log.sentAt,
    delivered_at: null,
    created_at: log.createdAt,
    channel_name: log.channelName,
    channel_type: log.channelType,
  };
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch all notification channels
 */
export function useNotificationChannels() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['notification-channels'],
    queryFn: async () => {
      // Fetch channels from backend API
      const channelsResponse = await fetchJson<NotificationChannelApi[]>(
        '/api/v1/notifications/channels'
      );

      if (channelsResponse.error) {
        throw new Error(channelsResponse.error);
      }

      const channels = channelsResponse.data || [];

      // Fetch rules to count per channel
      const rulesResponse = await fetchJson<Array<{ id: string; channelId: string }>>(
        '/api/v1/notifications/rules'
      );

      const rules = rulesResponse.data || [];

      // Count rules per channel
      const ruleCounts: Record<string, number> = {};
      rules.forEach((r) => {
        const channelId = r.channelId;
        ruleCounts[channelId] = (ruleCounts[channelId] || 0) + 1;
      });

      // Transform to legacy format and add rules_count
      const channelsWithRules = channels.map((c) => ({
        ...transformChannelToLegacy(c),
        rules_count: ruleCounts[c.id] || 0,
      }));

      return channelsWithRules as NotificationChannel[];
    },
    enabled: isLoaded && isSignedIn,
  });
}

/**
 * Fetch notification logs
 */
export function useNotificationLogs(limit = 50) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['notification-logs', limit],
    queryFn: async () => {
      const response = await fetchJson<NotificationLogApi[]>(
        `/api/v1/notifications/logs?limit=${limit}`
      );

      if (response.error) {
        throw new Error(response.error);
      }

      const logs = response.data || [];

      // Transform to legacy format
      return logs.map(transformLogToLegacy) as NotificationLog[];
    },
    enabled: isLoaded && isSignedIn,
  });
}

/**
 * Create a new notification channel
 */
export function useCreateNotificationChannel() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ChannelFormData) => {
      // Create channel via API
      const channelResponse = await fetchJson<NotificationChannelApi>(
        '/api/v1/notifications/channels',
        {
          method: 'POST',
          body: JSON.stringify({
            organization_id: 'default', // Backend will use actual org from auth
            name: data.name,
            channel_type: data.channel_type,
            config: data.config,
            enabled: data.enabled,
            rate_limit_per_hour: data.rate_limit_per_hour,
          }),
        }
      );

      if (channelResponse.error) {
        throw new Error(channelResponse.error);
      }

      if (!channelResponse.data) {
        throw new Error('Failed to create channel');
      }

      const channel = channelResponse.data;

      // Create rules if provided
      if (data.rules && data.rules.length > 0) {
        for (const rule of data.rules) {
          const ruleResponse = await fetchJson(
            '/api/v1/notifications/rules',
            {
              method: 'POST',
              body: JSON.stringify({
                channel_id: channel.id,
                event_type: rule.event_type,
                conditions: rule.conditions || {},
                priority: rule.priority || 'normal',
                cooldown_minutes: rule.cooldown_minutes || 0,
                enabled: true,
              }),
            }
          );

          if (ruleResponse.error) {
            console.error('Failed to create rule:', ruleResponse.error);
          }
        }
      }

      return transformChannelToLegacy(channel);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });
}

/**
 * Update a notification channel
 */
export function useUpdateNotificationChannel() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ChannelFormData }) => {
      const response = await fetchJson<NotificationChannelApi>(
        `/api/v1/notifications/channels/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: data.name,
            channel_type: data.channel_type,
            config: data.config,
            enabled: data.enabled,
            rate_limit_per_hour: data.rate_limit_per_hour,
          }),
        }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error('Failed to update channel');
      }

      return transformChannelToLegacy(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });
}

/**
 * Delete a notification channel
 */
export function useDeleteNotificationChannel() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetchJson<{ success: boolean }>(
        `/api/v1/notifications/channels/${id}`,
        {
          method: 'DELETE',
        }
      );

      if (response.error) {
        throw new Error(response.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });
}

/**
 * Test a notification channel
 */
export function useTestNotificationChannel() {
  const { fetchJson } = useAuthApi();

  return useMutation({
    mutationFn: async (channelId: string) => {
      const response = await fetchJson<{ success: boolean; message: string }>(
        `/api/v1/notifications/channels/${channelId}/test`,
        {
          method: 'POST',
        }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
  });
}

/**
 * Retry a failed notification
 * Note: This operation requires backend support for log updates
 */
export function useRetryNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_logId: string) => {
      // The backend doesn't currently expose a retry endpoint for logs
      // This would need to be implemented on the backend side
      // For now, we'll just invalidate the cache to refresh the list
      throw new Error('Retry functionality requires backend implementation');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
    },
  });
}

/**
 * Calculate notification stats from channels and logs
 */
export function useNotificationStats() {
  const { data: channels = [] } = useNotificationChannels();
  const { data: logs = [] } = useNotificationLogs();

  const stats = {
    totalChannels: channels.length,
    enabledChannels: channels.filter((c) => c.enabled).length,
    verifiedChannels: channels.filter((c) => c.verified).length,
    notificationsSentToday: channels.reduce((sum, c) => sum + c.sent_today, 0),
    failedToday: logs.filter((l) => l.status === 'failed' || l.status === 'bounced').length,
    successRate: 0,
  };

  const successfulLogs = logs.filter(
    (l) => l.status === 'sent' || l.status === 'delivered'
  ).length;
  const totalLogs = stats.failedToday + successfulLogs;
  stats.successRate = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 100;

  return stats;
}
