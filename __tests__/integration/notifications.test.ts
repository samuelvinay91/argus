/**
 * Integration Tests for Notification Channels
 *
 * Tests the notification functionality including:
 * - Creating Slack notification channel
 * - Creating webhook notification channel
 * - Testing notification delivery
 * - Listing notification logs
 * - Updating channel configuration
 * - Deleting channel
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  supabase,
  createTestProject,
  cleanupTestData,
  testData,
  validators,
  waitFor,
  generateTestId,
  getTestOrganization,
  TEST_TIMEOUT,
  type TestProject,
  type TestNotificationChannel,
} from '../setup';

describe('Notifications Integration Tests', () => {
  let testProject: TestProject;
  let testOrganizationId: string;

  beforeAll(async () => {
    // Create a test organization first
    const org = await getTestOrganization();
    testOrganizationId = org.id;

    // Create a test project for all notification tests
    testProject = await createTestProject({
      name: 'Notification Test Project',
      app_url: 'https://notification-test.example.com',
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Clean up all test data
    if (testProject?.id) {
      await cleanupTestData(testProject.id);
    }
  }, TEST_TIMEOUT);

  describe('Create Slack Notification Channel', () => {
    it('should create a Slack channel with webhook URL', async () => {
      const channelData = testData.slackChannel(testOrganizationId, testProject.id, {
        name: 'Engineering Slack',
      });

      const { data, error } = await supabase
        .from('notification_channels')
        .insert({
          organization_id: channelData.organization_id,
          project_id: channelData.project_id,
          name: channelData.name,
          channel_type: channelData.channel_type,
          config: channelData.config,
          enabled: channelData.enabled,
          rate_limit_per_hour: channelData.rate_limit_per_hour,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBeDefined();
      expect(data?.name).toBe('Engineering Slack');
      expect(data?.channel_type).toBe('slack');
      expect(data?.enabled).toBe(true);
      expect(validators.isValidUUID(data?.id || '')).toBe(true);
    });

    it('should create a Slack channel with channel name in config', async () => {
      const channelData = testData.slackChannel(testOrganizationId, testProject.id, {
        name: 'QA Slack Alerts',
        config: {
          webhook_url: 'https://hooks.slack.com/services/QA/WEBHOOK/URL',
          channel: '#qa-alerts',
          username: 'Argus Bot',
          icon_emoji: ':robot_face:',
        },
      });

      const { data, error } = await supabase
        .from('notification_channels')
        .insert({
          organization_id: channelData.organization_id,
          project_id: channelData.project_id,
          name: channelData.name,
          channel_type: channelData.channel_type,
          config: channelData.config,
          enabled: channelData.enabled,
          rate_limit_per_hour: channelData.rate_limit_per_hour,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect((data?.config as Record<string, unknown>)?.channel).toBe('#qa-alerts');
      expect((data?.config as Record<string, unknown>)?.username).toBe('Argus Bot');
    });

    it('should create a disabled Slack channel', async () => {
      const channelData = testData.slackChannel(testOrganizationId, testProject.id, {
        name: 'Disabled Slack',
        enabled: false,
      });

      const { data, error } = await supabase
        .from('notification_channels')
        .insert({
          organization_id: channelData.organization_id,
          project_id: channelData.project_id,
          name: channelData.name,
          channel_type: channelData.channel_type,
          config: channelData.config,
          enabled: false,
          rate_limit_per_hour: channelData.rate_limit_per_hour,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.enabled).toBe(false);
    });

    it('should set rate limits for Slack channel', async () => {
      const channelData = testData.slackChannel(testOrganizationId, testProject.id, {
        name: 'Rate Limited Slack',
        rate_limit_per_hour: 50,
      });

      const { data, error } = await supabase
        .from('notification_channels')
        .insert({
          organization_id: channelData.organization_id,
          project_id: channelData.project_id,
          name: channelData.name,
          channel_type: channelData.channel_type,
          config: channelData.config,
          enabled: channelData.enabled,
          rate_limit_per_hour: 50,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.rate_limit_per_hour).toBe(50);
    });
  });

  describe('Create Webhook Notification Channel', () => {
    it('should create a webhook channel with POST method', async () => {
      const channelData = testData.webhookChannel(testOrganizationId, testProject.id, {
        name: 'Monitoring Webhook',
      });

      const { data, error } = await supabase
        .from('notification_channels')
        .insert({
          organization_id: channelData.organization_id,
          project_id: channelData.project_id,
          name: channelData.name,
          channel_type: channelData.channel_type,
          config: channelData.config,
          enabled: channelData.enabled,
          rate_limit_per_hour: channelData.rate_limit_per_hour,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.channel_type).toBe('webhook');
      expect((data?.config as Record<string, unknown>)?.method).toBe('POST');
    });

    it('should create a webhook with custom headers', async () => {
      const config = {
        url: 'https://api.example.com/notifications',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'X-Custom-Header': 'custom-value',
          'Content-Type': 'application/json',
        },
        secret: 'webhook-signing-secret',
      };

      const { data, error } = await supabase
        .from('notification_channels')
        .insert({
          organization_id: testOrganizationId,
          project_id: testProject.id,
          name: 'Webhook with Headers',
          channel_type: 'webhook',
          config,
          enabled: true,
          rate_limit_per_hour: 100,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      const headers = (data?.config as Record<string, unknown>)?.headers as Record<string, string>;
      expect(headers?.['Authorization']).toBe('Bearer test-token');
      expect(headers?.['X-Custom-Header']).toBe('custom-value');
    });

    it('should create a webhook with retry configuration', async () => {
      const config = {
        url: 'https://api.example.com/webhook',
        method: 'POST',
        headers: {},
        retry_count: 3,
        retry_delay_ms: 1000,
        timeout_ms: 5000,
      };

      const { data, error } = await supabase
        .from('notification_channels')
        .insert({
          organization_id: testOrganizationId,
          project_id: testProject.id,
          name: 'Webhook with Retry',
          channel_type: 'webhook',
          config,
          enabled: true,
          rate_limit_per_hour: 200,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect((data?.config as Record<string, unknown>)?.retry_count).toBe(3);
      expect((data?.config as Record<string, unknown>)?.retry_delay_ms).toBe(1000);
    });
  });

  describe('Create Email Notification Channel', () => {
    it('should create an email channel with recipients', async () => {
      const channelData = testData.emailChannel(testOrganizationId, testProject.id, {
        name: 'QA Team Email',
      });

      const { data, error } = await supabase
        .from('notification_channels')
        .insert({
          organization_id: channelData.organization_id,
          project_id: channelData.project_id,
          name: channelData.name,
          channel_type: channelData.channel_type,
          config: channelData.config,
          enabled: channelData.enabled,
          rate_limit_per_hour: channelData.rate_limit_per_hour,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.channel_type).toBe('email');
      expect(Array.isArray((data?.config as Record<string, unknown>)?.recipients)).toBe(true);
    });

    it('should create an email channel with CC and BCC', async () => {
      const config = {
        recipients: ['primary@example.com'],
        cc: ['manager@example.com'],
        bcc: ['audit@example.com'],
        reply_to: 'support@example.com',
      };

      const { data, error } = await supabase
        .from('notification_channels')
        .insert({
          organization_id: testOrganizationId,
          project_id: testProject.id,
          name: 'Email with CC/BCC',
          channel_type: 'email',
          config,
          enabled: true,
          rate_limit_per_hour: 50,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect((data?.config as Record<string, unknown>)?.cc).toEqual(['manager@example.com']);
      expect((data?.config as Record<string, unknown>)?.bcc).toEqual(['audit@example.com']);
    });
  });

  describe('Test Notification Delivery', () => {
    let testChannel: { id: string } | null = null;

    beforeEach(async () => {
      // Create a channel for testing delivery
      const channelData = testData.slackChannel(testOrganizationId, testProject.id, {
        name: 'Delivery Test Channel',
      });

      const { data } = await supabase
        .from('notification_channels')
        .insert({
          organization_id: channelData.organization_id,
          project_id: channelData.project_id,
          name: channelData.name,
          channel_type: channelData.channel_type,
          config: channelData.config,
          enabled: channelData.enabled,
          rate_limit_per_hour: channelData.rate_limit_per_hour,
        })
        .select()
        .single();

      testChannel = data;
    });

    it('should record a test notification delivery attempt', async () => {
      const logEntry = {
        channel_id: testChannel!.id,
        event_type: 'test.notification',
        payload: { message: 'Test notification' },
        status: 'sent',
        response_code: 200,
        sent_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('notification_logs')
        .insert(logEntry)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.status).toBe('sent');
      expect(data?.response_code).toBe(200);
    });

    it('should record a failed notification delivery', async () => {
      const logEntry = {
        channel_id: testChannel!.id,
        event_type: 'test.run.failed',
        payload: { test_name: 'Login Test', error: 'Element not found' },
        status: 'failed',
        response_code: 500,
        error_message: 'Internal server error',
        retry_count: 3,
        max_retries: 3,
      };

      const { data, error } = await supabase
        .from('notification_logs')
        .insert(logEntry)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.status).toBe('failed');
      expect(data?.response_code).toBe(500);
      expect(data?.error_message).toBe('Internal server error');
      expect(data?.retry_count).toBe(3);
    });

    it('should record notification retry attempts', async () => {
      // First attempt fails
      const { data: attempt1 } = await supabase
        .from('notification_logs')
        .insert({
          channel_id: testChannel!.id,
          event_type: 'schedule.run.failed',
          payload: { schedule_name: 'Nightly Tests' },
          status: 'failed',
          response_code: 503,
          error_message: 'Service unavailable',
          retry_count: 1,
          max_retries: 3,
        })
        .select()
        .single();

      expect(attempt1?.retry_count).toBe(1);

      // Simulate retry succeeding
      const { data: attempt2 } = await supabase
        .from('notification_logs')
        .insert({
          channel_id: testChannel!.id,
          event_type: 'schedule.run.failed',
          payload: { schedule_name: 'Nightly Tests' },
          status: 'sent',
          response_code: 200,
          retry_count: 2,
          max_retries: 3,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      expect(attempt2?.status).toBe('sent');
      expect(attempt2?.retry_count).toBe(2);
    });

    it('should update sent_today counter on channel', async () => {
      // Get initial count
      const { data: before } = await supabase
        .from('notification_channels')
        .select('sent_today')
        .eq('id', testChannel!.id)
        .single();

      const initialCount = before?.sent_today || 0;

      // Update sent_today (simulating a notification being sent)
      const { data: after, error } = await supabase
        .from('notification_channels')
        .update({ sent_today: initialCount + 1 })
        .eq('id', testChannel!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(after?.sent_today).toBe(initialCount + 1);
    });

    it('should update last_sent_at timestamp', async () => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('notification_channels')
        .update({ last_sent_at: now })
        .eq('id', testChannel!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.last_sent_at).toBeDefined();
    });
  });

  describe('List Notification Logs', () => {
    let channelWithLogs: { id: string } | null = null;

    beforeEach(async () => {
      // Create a channel and add logs
      const { data: channel } = await supabase
        .from('notification_channels')
        .insert({
          organization_id: testOrganizationId,
          project_id: testProject.id,
          name: 'Channel with Logs',
          channel_type: 'slack',
          config: { webhook_url: 'https://hooks.slack.com/test' },
          enabled: true,
          rate_limit_per_hour: 100,
        })
        .select()
        .single();

      channelWithLogs = channel;

      // Create multiple log entries
      const logs = [
        { event_type: 'test.run.passed', status: 'sent', response_code: 200 },
        { event_type: 'test.run.failed', status: 'sent', response_code: 200 },
        { event_type: 'healing.applied', status: 'failed', response_code: 500 },
        { event_type: 'schedule.triggered', status: 'sent', response_code: 200 },
      ];

      for (const log of logs) {
        await supabase.from('notification_logs').insert({
          channel_id: channel!.id,
          event_type: log.event_type,
          payload: { test: true },
          status: log.status,
          response_code: log.response_code,
          sent_at: log.status === 'sent' ? new Date().toISOString() : null,
        });
        await waitFor(10);
      }
    });

    it('should list all logs for a channel', async () => {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('channel_id', channelWithLogs!.id)
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThanOrEqual(4);
    });

    it('should filter logs by status', async () => {
      const { data: sentLogs, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('channel_id', channelWithLogs!.id)
        .eq('status', 'sent');

      expect(error).toBeNull();
      sentLogs?.forEach((log) => {
        expect(log.status).toBe('sent');
      });
    });

    it('should filter logs by event type', async () => {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('channel_id', channelWithLogs!.id)
        .eq('event_type', 'test.run.failed');

      expect(error).toBeNull();
      data?.forEach((log) => {
        expect(log.event_type).toBe('test.run.failed');
      });
    });

    it('should paginate notification logs', async () => {
      const pageSize = 2;

      const { data: page1, error: error1 } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('channel_id', channelWithLogs!.id)
        .order('created_at', { ascending: false })
        .range(0, pageSize - 1);

      expect(error1).toBeNull();
      expect(page1?.length).toBeLessThanOrEqual(pageSize);

      const { data: page2, error: error2 } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('channel_id', channelWithLogs!.id)
        .order('created_at', { ascending: false })
        .range(pageSize, pageSize * 2 - 1);

      expect(error2).toBeNull();
    });

    it('should include channel details with logs', async () => {
      const { data, error } = await supabase
        .from('notification_logs')
        .select(`
          *,
          notification_channels!inner(name, channel_type)
        `)
        .eq('channel_id', channelWithLogs!.id)
        .limit(1)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.notification_channels).toBeDefined();
    });
  });

  describe('Update Channel Configuration', () => {
    let channelToUpdate: { id: string } | null = null;

    beforeEach(async () => {
      const { data } = await supabase
        .from('notification_channels')
        .insert({
          organization_id: testOrganizationId,
          project_id: testProject.id,
          name: 'Channel to Update',
          channel_type: 'slack',
          config: {
            webhook_url: 'https://hooks.slack.com/original',
            channel: '#original',
          },
          enabled: true,
          rate_limit_per_hour: 100,
        })
        .select()
        .single();

      channelToUpdate = data;
    });

    it('should update channel name', async () => {
      const { data, error } = await supabase
        .from('notification_channels')
        .update({ name: 'Updated Channel Name' })
        .eq('id', channelToUpdate!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.name).toBe('Updated Channel Name');
    });

    it('should update webhook URL', async () => {
      const newConfig = {
        webhook_url: 'https://hooks.slack.com/updated',
        channel: '#updated-channel',
      };

      const { data, error } = await supabase
        .from('notification_channels')
        .update({ config: newConfig })
        .eq('id', channelToUpdate!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect((data?.config as Record<string, unknown>)?.webhook_url).toBe('https://hooks.slack.com/updated');
    });

    it('should enable/disable channel', async () => {
      // Disable
      const { data: disabled, error: disableError } = await supabase
        .from('notification_channels')
        .update({ enabled: false })
        .eq('id', channelToUpdate!.id)
        .select()
        .single();

      expect(disableError).toBeNull();
      expect(disabled?.enabled).toBe(false);

      // Enable
      const { data: enabled, error: enableError } = await supabase
        .from('notification_channels')
        .update({ enabled: true })
        .eq('id', channelToUpdate!.id)
        .select()
        .single();

      expect(enableError).toBeNull();
      expect(enabled?.enabled).toBe(true);
    });

    it('should update rate limit', async () => {
      const { data, error } = await supabase
        .from('notification_channels')
        .update({ rate_limit_per_hour: 200 })
        .eq('id', channelToUpdate!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.rate_limit_per_hour).toBe(200);
    });

    it('should mark channel as verified', async () => {
      const { data, error } = await supabase
        .from('notification_channels')
        .update({ verified: true, verified_at: new Date().toISOString() })
        .eq('id', channelToUpdate!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.verified).toBe(true);
      expect(data?.verified_at).toBeDefined();
    });
  });

  describe('Delete Channel', () => {
    it('should delete a notification channel', async () => {
      // Create a channel to delete
      const { data: created } = await supabase
        .from('notification_channels')
        .insert({
          organization_id: testOrganizationId,
          project_id: testProject.id,
          name: 'Channel to Delete',
          channel_type: 'webhook',
          config: { url: 'https://example.com/webhook' },
          enabled: true,
          rate_limit_per_hour: 100,
        })
        .select()
        .single();

      expect(created).toBeDefined();

      // Delete the channel
      const { error: deleteError } = await supabase
        .from('notification_channels')
        .delete()
        .eq('id', created!.id);

      expect(deleteError).toBeNull();

      // Verify it's deleted
      const { data: found } = await supabase
        .from('notification_channels')
        .select('*')
        .eq('id', created!.id)
        .single();

      expect(found).toBeNull();
    });

    it('should cascade delete notification logs when channel is deleted', async () => {
      // Create a channel with logs
      const { data: channel } = await supabase
        .from('notification_channels')
        .insert({
          organization_id: testOrganizationId,
          project_id: testProject.id,
          name: 'Channel with Logs to Delete',
          channel_type: 'slack',
          config: { webhook_url: 'https://hooks.slack.com/delete' },
          enabled: true,
          rate_limit_per_hour: 100,
        })
        .select()
        .single();

      // Add some logs
      await supabase.from('notification_logs').insert({
        channel_id: channel!.id,
        event_type: 'test',
        payload: {},
        status: 'sent',
      });

      // Delete the channel
      await supabase.from('notification_channels').delete().eq('id', channel!.id);

      // Verify logs are also deleted
      const { data: logs } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('channel_id', channel!.id);

      expect(logs?.length || 0).toBe(0);
    });

    it('should not affect other channels when one is deleted', async () => {
      // Create two channels
      const { data: channel1 } = await supabase
        .from('notification_channels')
        .insert({
          organization_id: testOrganizationId,
          project_id: testProject.id,
          name: 'Channel 1 - Keep',
          channel_type: 'slack',
          config: { webhook_url: 'https://hooks.slack.com/keep' },
          enabled: true,
          rate_limit_per_hour: 100,
        })
        .select()
        .single();

      const { data: channel2 } = await supabase
        .from('notification_channels')
        .insert({
          organization_id: testOrganizationId,
          project_id: testProject.id,
          name: 'Channel 2 - Delete',
          channel_type: 'slack',
          config: { webhook_url: 'https://hooks.slack.com/delete' },
          enabled: true,
          rate_limit_per_hour: 100,
        })
        .select()
        .single();

      // Delete channel 2
      await supabase.from('notification_channels').delete().eq('id', channel2!.id);

      // Verify channel 1 still exists
      const { data: found } = await supabase
        .from('notification_channels')
        .select('*')
        .eq('id', channel1!.id)
        .single();

      expect(found).toBeDefined();
      expect(found?.name).toBe('Channel 1 - Keep');
    });
  });

  describe('Channel Types', () => {
    const channelTypes = ['slack', 'email', 'webhook', 'discord', 'pagerduty', 'teams'];

    for (const type of channelTypes) {
      it(`should create a ${type} notification channel`, async () => {
        const config: Record<string, unknown> = {
          slack: { webhook_url: 'https://hooks.slack.com/test', channel: '#test' },
          email: { recipients: ['test@example.com'] },
          webhook: { url: 'https://api.example.com/webhook', method: 'POST' },
          discord: { webhook_url: 'https://discord.com/api/webhooks/test' },
          pagerduty: { routing_key: 'test-key', severity: 'error' },
          teams: { webhook_url: 'https://outlook.office.com/webhook/test' },
        }[type];

        const { data, error } = await supabase
          .from('notification_channels')
          .insert({
            organization_id: testOrganizationId,
            project_id: testProject.id,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} Channel`,
            channel_type: type,
            config,
            enabled: true,
            rate_limit_per_hour: 100,
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data?.channel_type).toBe(type);
      });
    }
  });
});
