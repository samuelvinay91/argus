'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/types';

// Types for notifications based on the database schema
export interface NotificationChannel {
  id: string;
  organization_id: string;
  project_id: string | null;
  name: string;
  channel_type: 'slack' | 'email' | 'webhook' | 'discord' | 'teams' | 'pagerduty' | 'opsgenie';
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
  priority: 'low' | 'normal' | 'high' | 'urgent';
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
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'suppressed';
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
  channel_type: 'slack' | 'email' | 'webhook' | 'discord' | 'teams' | 'pagerduty' | 'opsgenie';
  config: ChannelConfig;
  enabled: boolean;
  rate_limit_per_hour: number;
  rules: {
    event_type: string;
    conditions?: Record<string, unknown>;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    cooldown_minutes?: number;
  }[];
}

// Default organization ID - in production this would come from auth context
const DEFAULT_ORG_ID = 'default';

// Fetch all notification channels
export function useNotificationChannels() {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['notification-channels'],
    queryFn: async () => {
      // Get channels
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: channels, error } = await (supabase.from('notification_channels') as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get rule counts for each channel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rules, error: rulesError } = await (supabase.from('notification_rules') as any)
        .select('channel_id');

      if (rulesError) throw rulesError;

      // Count rules per channel
      const ruleCounts: Record<string, number> = {};
      (rules || []).forEach((r: { channel_id: string }) => {
        ruleCounts[r.channel_id] = (ruleCounts[r.channel_id] || 0) + 1;
      });

      // Add rules_count to channels
      const channelsWithRules = (channels || []).map((c: NotificationChannel) => ({
        ...c,
        rules_count: ruleCounts[c.id] || 0,
      }));

      return channelsWithRules as NotificationChannel[];
    },
  });
}

// Fetch notification logs
export function useNotificationLogs(limit = 50) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['notification-logs', limit],
    queryFn: async () => {
      // Get logs with channel info
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: logs, error } = await (supabase.from('notification_logs') as any)
        .select(`
          *,
          notification_channels (
            name,
            channel_type
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Flatten the joined data
      const flattenedLogs = (logs || []).map((log: NotificationLog & { notification_channels?: { name: string; channel_type: string } }) => ({
        ...log,
        channel_name: log.notification_channels?.name,
        channel_type: log.notification_channels?.channel_type,
        notification_channels: undefined,
      }));

      return flattenedLogs as NotificationLog[];
    },
  });
}

// Create a new notification channel
export function useCreateNotificationChannel() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ChannelFormData) => {
      // Create channel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: channel, error } = await (supabase.from('notification_channels') as any)
        .insert({
          organization_id: DEFAULT_ORG_ID,
          name: data.name,
          channel_type: data.channel_type,
          config: data.config as unknown as Json,
          enabled: data.enabled,
          rate_limit_per_hour: data.rate_limit_per_hour,
        })
        .select()
        .single();

      if (error) throw error;

      // Create rules if provided
      if (data.rules && data.rules.length > 0) {
        const rulesToInsert = data.rules.map(rule => ({
          channel_id: channel.id,
          event_type: rule.event_type,
          conditions: rule.conditions || {},
          priority: rule.priority || 'normal',
          cooldown_minutes: rule.cooldown_minutes || 0,
          enabled: true,
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: rulesError } = await (supabase.from('notification_rules') as any)
          .insert(rulesToInsert);

        if (rulesError) {
          console.error('Failed to create rules:', rulesError);
        }
      }

      return channel as NotificationChannel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });
}

// Update a notification channel
export function useUpdateNotificationChannel() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ChannelFormData }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: channel, error } = await (supabase.from('notification_channels') as any)
        .update({
          name: data.name,
          channel_type: data.channel_type,
          config: data.config as unknown as Json,
          enabled: data.enabled,
          rate_limit_per_hour: data.rate_limit_per_hour,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return channel as NotificationChannel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });
}

// Delete a notification channel
export function useDeleteNotificationChannel() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('notification_channels') as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });
}

// Test a notification channel
export function useTestNotificationChannel() {
  const supabase = getSupabaseClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      // Queue a test notification
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('notification_logs') as any)
        .insert({
          channel_id: channelId,
          event_type: 'test.notification',
          payload: { message: 'Test notification from Argus' },
          status: 'queued',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
}

// Retry a failed notification
export function useRetryNotification() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('notification_logs') as any)
        .update({
          status: 'queued',
          next_retry_at: null,
        })
        .eq('id', logId)
        .select()
        .single();

      if (error) throw error;
      return data as NotificationLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
    },
  });
}

// Calculate notification stats
export function useNotificationStats() {
  const { data: channels = [] } = useNotificationChannels();
  const { data: logs = [] } = useNotificationLogs();

  const stats = {
    totalChannels: channels.length,
    enabledChannels: channels.filter(c => c.enabled).length,
    verifiedChannels: channels.filter(c => c.verified).length,
    notificationsSentToday: channels.reduce((sum, c) => sum + c.sent_today, 0),
    failedToday: logs.filter(l => l.status === 'failed' || l.status === 'bounced').length,
    successRate: 0,
  };

  const successfulLogs = logs.filter(l => l.status === 'sent' || l.status === 'delivered').length;
  const totalLogs = stats.failedToday + successfulLogs;
  stats.successRate = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 100;

  return stats;
}
