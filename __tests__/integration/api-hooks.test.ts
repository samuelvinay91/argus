/**
 * Integration Tests for React Query Hooks
 *
 * Tests the React Query hooks functionality including:
 * - Testing useSchedules hook
 * - Testing useNotificationChannels hook
 * - Testing useParameterizedTests hook
 * - Testing real-time subscriptions
 *
 * Note: These tests simulate hook behavior by testing the underlying
 * Supabase queries that the hooks use.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
  supabase,
  createTestProject,
  cleanupTestData,
  getTestOrganization,
  testData,
  validators,
  waitFor,
  generateTestId,
  TEST_TIMEOUT,
  type TestProject,
} from '../setup';

describe('API Hooks Integration Tests', () => {
  let testProject: TestProject;
  let testOrganizationId: string;

  beforeAll(async () => {
    // Get or create test organization
    const org = await getTestOrganization();
    testOrganizationId = org.id;

    // Create a test project for all hook tests
    testProject = await createTestProject({
      name: 'API Hooks Test Project',
      app_url: 'https://hooks-test.example.com',
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Clean up all test data
    if (testProject?.id) {
      await cleanupTestData(testProject.id);
    }
  }, TEST_TIMEOUT);

  describe('useSchedules Hook Queries', () => {
    beforeEach(async () => {
      // Create schedules for testing
      const schedules = [
        { name: 'Schedule A', enabled: true, cron_expression: '0 9 * * *' },
        { name: 'Schedule B', enabled: true, cron_expression: '0 * * * *' },
        { name: 'Schedule C', enabled: false, cron_expression: '0 0 * * *' },
      ];

      for (const schedule of schedules) {
        await supabase.from('test_schedules').insert({
          project_id: testProject.id,
          name: schedule.name,
          cron_expression: schedule.cron_expression,
          timezone: 'UTC',
          enabled: schedule.enabled,
          test_ids: [],
          notification_config: { on_failure: true, on_success: false, channels: [] },
          environment: 'staging',
          browser: 'chromium',
        });
      }
    });

    it('should fetch all schedules for a project (useSchedules query)', async () => {
      // This simulates the query in useSchedules hook
      const { data, error } = await supabase
        .from('test_schedules')
        .select('*')
        .eq('project_id', testProject.id)
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThanOrEqual(3);

      // Verify data shape matches hook expectations
      data?.forEach((schedule) => {
        expect(schedule).toHaveProperty('id');
        expect(schedule).toHaveProperty('name');
        expect(schedule).toHaveProperty('cron_expression');
        expect(schedule).toHaveProperty('enabled');
        expect(schedule).toHaveProperty('project_id');
      });
    });

    it('should fetch a single schedule by ID (useSchedule query)', async () => {
      // First get a schedule ID
      const { data: schedules } = await supabase
        .from('test_schedules')
        .select('id')
        .eq('project_id', testProject.id)
        .limit(1);

      const scheduleId = schedules?.[0]?.id;
      expect(scheduleId).toBeDefined();

      // Simulate useSchedule query
      const { data, error } = await supabase
        .from('test_schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBe(scheduleId);
    });

    it('should return enabled schedules only when filtered', async () => {
      // Simulate filtered query
      const { data, error } = await supabase
        .from('test_schedules')
        .select('*')
        .eq('project_id', testProject.id)
        .eq('enabled', true);

      expect(error).toBeNull();
      data?.forEach((schedule) => {
        expect(schedule.enabled).toBe(true);
      });
    });

    it('should return empty array for non-existent project', async () => {
      // Use a valid UUID format that doesn't exist
      const { data, error } = await supabase
        .from('test_schedules')
        .select('*')
        .eq('project_id', '00000000-0000-0000-0000-000000000000');

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe('useNotificationChannels Hook Queries', () => {
    beforeEach(async () => {
      // Create notification channels for testing
      const channels = [
        {
          name: 'Slack Channel',
          channel_type: 'slack',
          config: { webhook_url: 'https://hooks.slack.com/test', channel: '#alerts' },
          enabled: true,
        },
        {
          name: 'Email Channel',
          channel_type: 'email',
          config: { recipients: ['test@example.com'] },
          enabled: true,
        },
        {
          name: 'Webhook Channel',
          channel_type: 'webhook',
          config: { url: 'https://api.example.com/webhook', method: 'POST' },
          enabled: false,
        },
      ];

      for (const channel of channels) {
        await supabase.from('notification_channels').insert({
          organization_id: testOrganizationId,
          project_id: testProject.id,
          name: channel.name,
          channel_type: channel.channel_type,
          config: channel.config,
          enabled: channel.enabled,
          rate_limit_per_hour: 100,
        });
      }
    });

    it('should fetch all notification channels for a project', async () => {
      // Simulate useNotificationChannels query
      const { data, error } = await supabase
        .from('notification_channels')
        .select('*')
        .eq('project_id', testProject.id)
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThanOrEqual(3);

      // Verify data shape
      data?.forEach((channel) => {
        expect(channel).toHaveProperty('id');
        expect(channel).toHaveProperty('name');
        expect(channel).toHaveProperty('channel_type');
        expect(channel).toHaveProperty('config');
        expect(channel).toHaveProperty('enabled');
      });
    });

    it('should filter channels by type', async () => {
      const { data, error } = await supabase
        .from('notification_channels')
        .select('*')
        .eq('project_id', testProject.id)
        .eq('channel_type', 'slack');

      expect(error).toBeNull();
      data?.forEach((channel) => {
        expect(channel.channel_type).toBe('slack');
      });
    });

    it('should include sent_today and last_sent_at fields', async () => {
      // Update a channel with sent_today
      const { data: channels } = await supabase
        .from('notification_channels')
        .select('id')
        .eq('project_id', testProject.id)
        .limit(1);

      const channelId = channels?.[0]?.id;

      await supabase
        .from('notification_channels')
        .update({
          sent_today: 10,
          last_sent_at: new Date().toISOString(),
        })
        .eq('id', channelId);

      const { data, error } = await supabase
        .from('notification_channels')
        .select('sent_today, last_sent_at')
        .eq('id', channelId)
        .single();

      expect(error).toBeNull();
      expect(data?.sent_today).toBe(10);
      expect(data?.last_sent_at).toBeDefined();
    });
  });

  describe('useParameterizedTests Hook Queries', () => {
    beforeEach(async () => {
      // Create parameterized tests for testing
      const tests = [
        {
          name: 'Login Param Test',
          data_source_type: 'inline',
          priority: 'high',
          is_active: true,
        },
        {
          name: 'Search Param Test',
          data_source_type: 'csv',
          priority: 'medium',
          is_active: true,
        },
        {
          name: 'Deleted Test',
          data_source_type: 'inline',
          priority: 'low',
          is_active: false,
        },
      ];

      for (const test of tests) {
        await supabase.from('parameterized_tests').insert({
          project_id: testProject.id,
          name: test.name,
          data_source_type: test.data_source_type,
          data_source_config: { data: [] },
          steps: [],
          priority: test.priority,
          is_active: test.is_active,
        });
      }
    });

    it('should fetch all active parameterized tests for a project', async () => {
      // Simulate useParameterizedTests query
      const { data, error } = await supabase
        .from('parameterized_tests')
        .select('*')
        .eq('project_id', testProject.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThanOrEqual(2);

      // Verify only active tests are returned
      data?.forEach((test) => {
        expect(test.is_active).toBe(true);
      });
    });

    it('should fetch a single parameterized test by ID', async () => {
      const { data: tests } = await supabase
        .from('parameterized_tests')
        .select('id')
        .eq('project_id', testProject.id)
        .eq('is_active', true)
        .limit(1);

      const testId = tests?.[0]?.id;
      expect(testId).toBeDefined();

      // Simulate useParameterizedTest query
      const { data, error } = await supabase
        .from('parameterized_tests')
        .select('*')
        .eq('id', testId)
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBe(testId);
    });

    it('should include parameter sets in query', async () => {
      // Create a test with parameter sets
      const { data: test } = await supabase
        .from('parameterized_tests')
        .insert({
          project_id: testProject.id,
          name: 'Test with Sets',
          data_source_type: 'inline',
          data_source_config: { data: [] },
          steps: [],
          is_active: true,
        })
        .select()
        .single();

      // Add parameter sets
      await supabase.from('parameter_sets').insert([
        {
          parameterized_test_id: test!.id,
          name: 'Set 1',
          values: { email: 'test1@test.com' },
          order_index: 0,
        },
        {
          parameterized_test_id: test!.id,
          name: 'Set 2',
          values: { email: 'test2@test.com' },
          order_index: 1,
        },
      ]);

      // Query with parameter sets (simulating hook with join)
      const { data, error } = await supabase
        .from('parameterized_tests')
        .select(`
          *,
          parameter_sets (*)
        `)
        .eq('id', test!.id)
        .single();

      expect(error).toBeNull();
      expect(data?.parameter_sets).toBeDefined();
      expect(data?.parameter_sets.length).toBe(2);
    });

    it('should fetch parameterized results for a test', async () => {
      const { data: tests } = await supabase
        .from('parameterized_tests')
        .select('id')
        .eq('project_id', testProject.id)
        .eq('is_active', true)
        .limit(1);

      const testId = tests?.[0]?.id;

      // Create some results
      await supabase.from('parameterized_results').insert([
        {
          parameterized_test_id: testId,
          total_iterations: 5,
          passed: 4,
          failed: 1,
          status: 'failed',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
        {
          parameterized_test_id: testId,
          total_iterations: 5,
          passed: 5,
          failed: 0,
          status: 'passed',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
      ]);

      // Simulate useParameterizedResultsForTest query
      const { data, error } = await supabase
        .from('parameterized_results')
        .select('*')
        .eq('parameterized_test_id', testId)
        .order('created_at', { ascending: false })
        .limit(20);

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Mutation Hooks Simulation', () => {
    describe('useCreateSchedule mutation', () => {
      it('should create a schedule and return it', async () => {
        const newSchedule = {
          project_id: testProject.id,
          name: 'Created via Hook',
          cron_expression: '30 10 * * 1-5',
          timezone: 'America/Chicago',
          enabled: true,
          test_ids: [],
          notification_config: { on_failure: true, on_success: false, channels: [] },
          environment: 'production',
          browser: 'firefox',
        };

        const { data, error } = await supabase
          .from('test_schedules')
          .insert(newSchedule)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.name).toBe('Created via Hook');
        expect(data?.id).toBeDefined();
      });
    });

    describe('useUpdateSchedule mutation', () => {
      it('should update a schedule', async () => {
        // Create a schedule first
        const { data: created } = await supabase
          .from('test_schedules')
          .insert({
            project_id: testProject.id,
            name: 'To Update',
            cron_expression: '0 9 * * *',
            timezone: 'UTC',
            enabled: true,
            test_ids: [],
            notification_config: { on_failure: true, on_success: false, channels: [] },
            environment: 'staging',
            browser: 'chromium',
          })
          .select()
          .single();

        // Simulate update mutation
        const { data, error } = await supabase
          .from('test_schedules')
          .update({ name: 'Updated Name', enabled: false })
          .eq('id', created!.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.name).toBe('Updated Name');
        expect(data?.enabled).toBe(false);
      });
    });

    describe('useDeleteSchedule mutation', () => {
      it('should delete a schedule', async () => {
        // Create a schedule first
        const { data: created } = await supabase
          .from('test_schedules')
          .insert({
            project_id: testProject.id,
            name: 'To Delete',
            cron_expression: '0 9 * * *',
            timezone: 'UTC',
            enabled: true,
            test_ids: [],
            notification_config: { on_failure: true, on_success: false, channels: [] },
            environment: 'staging',
            browser: 'chromium',
          })
          .select()
          .single();

        // Simulate delete mutation
        const { error } = await supabase
          .from('test_schedules')
          .delete()
          .eq('id', created!.id);

        expect(error).toBeNull();

        // Verify deletion
        const { data: found } = await supabase
          .from('test_schedules')
          .select('id')
          .eq('id', created!.id)
          .single();

        expect(found).toBeNull();
      });
    });

    describe('useCreateNotificationChannel mutation', () => {
      it('should create a notification channel', async () => {
        const newChannel = {
          organization_id: testOrganizationId,
          project_id: testProject.id,
          name: 'Hook Created Channel',
          channel_type: 'slack',
          config: { webhook_url: 'https://hooks.slack.com/hook' },
          enabled: true,
          rate_limit_per_hour: 100,
        };

        const { data, error } = await supabase
          .from('notification_channels')
          .insert(newChannel)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.name).toBe('Hook Created Channel');
      });
    });

    describe('useDeleteParameterizedTest mutation (soft delete)', () => {
      it('should soft delete a parameterized test by setting is_active to false', async () => {
        // Create a test
        const { data: created } = await supabase
          .from('parameterized_tests')
          .insert({
            project_id: testProject.id,
            name: 'To Soft Delete',
            data_source_type: 'inline',
            data_source_config: { data: [] },
            steps: [],
            is_active: true,
          })
          .select()
          .single();

        // Simulate soft delete mutation
        const { data, error } = await supabase
          .from('parameterized_tests')
          .update({ is_active: false })
          .eq('id', created!.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.is_active).toBe(false);

        // Verify it's not returned in active query
        const { data: activeTests } = await supabase
          .from('parameterized_tests')
          .select('id')
          .eq('id', created!.id)
          .eq('is_active', true);

        expect(activeTests?.length || 0).toBe(0);
      });
    });
  });

  describe('Real-time Subscription Simulation', () => {
    it('should support postgres_changes subscription filter', async () => {
      // This tests that the filter syntax used in subscriptions is valid
      const testId = generateTestId('test');

      // Create a parameterized test
      const { data: test } = await supabase
        .from('parameterized_tests')
        .insert({
          project_id: testProject.id,
          name: 'Subscription Test',
          data_source_type: 'inline',
          data_source_config: { data: [] },
          steps: [],
          is_active: true,
        })
        .select()
        .single();

      // Verify we can query with the filter pattern used in subscriptions
      const { data, error } = await supabase
        .from('parameterized_results')
        .select('*')
        .eq('parameterized_test_id', test!.id);

      expect(error).toBeNull();
      // Initially empty, but query should work
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle iteration results subscription filter', async () => {
      // Create a result
      const { data: test } = await supabase
        .from('parameterized_tests')
        .insert({
          project_id: testProject.id,
          name: 'Iteration Subscription Test',
          data_source_type: 'inline',
          data_source_config: { data: [] },
          steps: [],
          is_active: true,
        })
        .select()
        .single();

      const { data: result } = await supabase
        .from('parameterized_results')
        .insert({
          parameterized_test_id: test!.id,
          total_iterations: 5,
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Verify iteration results filter works
      const { data, error } = await supabase
        .from('iteration_results')
        .select('*')
        .eq('parameterized_result_id', result!.id);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should support activity logs subscription for project', async () => {
      // Verify activity logs filter works
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('project_id', testProject.id)
        .order('created_at', { ascending: false })
        .limit(50);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Query Client Cache Simulation', () => {
    it('should return consistent data on repeated queries', async () => {
      // First query
      const { data: first } = await supabase
        .from('test_schedules')
        .select('*')
        .eq('project_id', testProject.id)
        .order('created_at', { ascending: false });

      // Second query (should return same data if no changes)
      const { data: second } = await supabase
        .from('test_schedules')
        .select('*')
        .eq('project_id', testProject.id)
        .order('created_at', { ascending: false });

      expect(first?.length).toBe(second?.length);
      expect(first?.map((s) => s.id).sort()).toEqual(second?.map((s) => s.id).sort());
    });

    it('should reflect mutations in subsequent queries', async () => {
      // Create a schedule
      const { data: created } = await supabase
        .from('test_schedules')
        .insert({
          project_id: testProject.id,
          name: 'Cache Test Schedule',
          cron_expression: '0 9 * * *',
          timezone: 'UTC',
          enabled: true,
          test_ids: [],
          notification_config: { on_failure: true, on_success: false, channels: [] },
          environment: 'staging',
          browser: 'chromium',
        })
        .select()
        .single();

      // Query should include new schedule
      const { data: afterCreate } = await supabase
        .from('test_schedules')
        .select('id')
        .eq('project_id', testProject.id);

      expect(afterCreate?.map((s) => s.id)).toContain(created!.id);

      // Delete the schedule
      await supabase.from('test_schedules').delete().eq('id', created!.id);

      // Query should not include deleted schedule
      const { data: afterDelete } = await supabase
        .from('test_schedules')
        .select('id')
        .eq('project_id', testProject.id);

      expect(afterDelete?.map((s) => s.id)).not.toContain(created!.id);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent record gracefully', async () => {
      const { data, error } = await supabase
        .from('test_schedules')
        .select('*')
        .eq('id', 'non-existent-uuid')
        .single();

      // Should return null or error for non-existent record
      expect(data).toBeNull();
    });

    it('should handle invalid project_id in queries', async () => {
      // Use a valid UUID format that doesn't exist
      const { data, error } = await supabase
        .from('notification_channels')
        .select('*')
        .eq('project_id', '00000000-0000-0000-0000-000000000000');

      // Should return empty array for non-existent UUID
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('should handle concurrent queries', async () => {
      // Execute multiple queries in parallel
      const queries = Promise.all([
        supabase
          .from('test_schedules')
          .select('*')
          .eq('project_id', testProject.id),
        supabase
          .from('notification_channels')
          .select('*')
          .eq('project_id', testProject.id),
        supabase
          .from('parameterized_tests')
          .select('*')
          .eq('project_id', testProject.id)
          .eq('is_active', true),
      ]);

      const results = await queries;

      results.forEach((result) => {
        expect(result.error).toBeNull();
        expect(Array.isArray(result.data)).toBe(true);
      });
    });
  });
});
