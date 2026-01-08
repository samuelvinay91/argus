/**
 * Integration Tests for Test Schedules
 *
 * Tests the scheduling functionality including:
 * - Creating schedules with valid cron expressions
 * - Listing schedules for a project
 * - Updating schedule (enable/disable)
 * - Triggering schedule manually
 * - Viewing schedule run history
 * - Deleting schedule
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
  TEST_TIMEOUT,
  type TestProject,
  type TestSchedule,
} from '../setup';

describe('Schedules Integration Tests', () => {
  let testProject: TestProject;

  beforeAll(async () => {
    // Create a test project for all schedule tests
    testProject = await createTestProject({
      name: 'Schedule Test Project',
      app_url: 'https://schedule-test.example.com',
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Clean up all test data
    if (testProject?.id) {
      await cleanupTestData(testProject.id);
    }
  }, TEST_TIMEOUT);

  describe('Create Schedule', () => {
    it('should create a schedule with a valid cron expression', async () => {
      const scheduleData = testData.schedule(testProject.id, {
        name: 'Daily Morning Tests',
        cron_expression: '0 9 * * *', // Every day at 9 AM
      });

      const { data, error } = await supabase
        .from('test_schedules')
        .insert({
          project_id: scheduleData.project_id,
          name: scheduleData.name,
          description: scheduleData.description,
          cron_expression: scheduleData.cron_expression,
          timezone: scheduleData.timezone,
          enabled: scheduleData.enabled,
          test_ids: scheduleData.test_ids,
          notification_config: scheduleData.notification_config,
          environment: scheduleData.environment,
          browser: scheduleData.browser,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBeDefined();
      expect(data?.name).toBe('Daily Morning Tests');
      expect(data?.cron_expression).toBe('0 9 * * *');
      expect(data?.enabled).toBe(true);
      expect(validators.isValidUUID(data?.id || '')).toBe(true);
    });

    it('should create a schedule with weekday-only cron expression', async () => {
      const scheduleData = testData.schedule(testProject.id, {
        name: 'Weekday Regression Suite',
        cron_expression: '0 9 * * 1-5', // Monday to Friday at 9 AM
      });

      const { data, error } = await supabase
        .from('test_schedules')
        .insert({
          project_id: scheduleData.project_id,
          name: scheduleData.name,
          cron_expression: scheduleData.cron_expression,
          timezone: scheduleData.timezone,
          enabled: scheduleData.enabled,
          test_ids: scheduleData.test_ids,
          notification_config: scheduleData.notification_config,
          environment: scheduleData.environment,
          browser: scheduleData.browser,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.cron_expression).toBe('0 9 * * 1-5');
      expect(validators.isValidCronExpression(data?.cron_expression || '')).toBe(true);
    });

    it('should create a schedule with hourly cron expression', async () => {
      const scheduleData = testData.schedule(testProject.id, {
        name: 'Hourly Smoke Tests',
        cron_expression: '0 * * * *', // Every hour
      });

      const { data, error } = await supabase
        .from('test_schedules')
        .insert({
          project_id: scheduleData.project_id,
          name: scheduleData.name,
          cron_expression: scheduleData.cron_expression,
          timezone: 'UTC',
          enabled: scheduleData.enabled,
          test_ids: scheduleData.test_ids,
          notification_config: scheduleData.notification_config,
          environment: 'production',
          browser: scheduleData.browser,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.cron_expression).toBe('0 * * * *');
      expect(data?.timezone).toBe('UTC');
      expect(data?.environment).toBe('production');
    });

    it('should create a disabled schedule', async () => {
      const scheduleData = testData.schedule(testProject.id, {
        name: 'Disabled Schedule',
        enabled: false,
      });

      const { data, error } = await supabase
        .from('test_schedules')
        .insert({
          project_id: scheduleData.project_id,
          name: scheduleData.name,
          cron_expression: scheduleData.cron_expression,
          timezone: scheduleData.timezone,
          enabled: false,
          test_ids: scheduleData.test_ids,
          notification_config: scheduleData.notification_config,
          environment: scheduleData.environment,
          browser: scheduleData.browser,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.enabled).toBe(false);
    });

    it('should create a schedule with notification configuration', async () => {
      const notificationConfig = {
        on_failure: true,
        on_success: true,
        channels: ['slack-channel-1', 'email-channel-2'],
      };

      const scheduleData = testData.schedule(testProject.id, {
        name: 'Schedule with Notifications',
        notification_config: notificationConfig,
      });

      const { data, error } = await supabase
        .from('test_schedules')
        .insert({
          project_id: scheduleData.project_id,
          name: scheduleData.name,
          cron_expression: scheduleData.cron_expression,
          timezone: scheduleData.timezone,
          enabled: scheduleData.enabled,
          test_ids: scheduleData.test_ids,
          notification_config: notificationConfig,
          environment: scheduleData.environment,
          browser: scheduleData.browser,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.notification_config).toEqual(notificationConfig);
    });

    it('should create a schedule with different timezones', async () => {
      const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'UTC'];

      for (const timezone of timezones) {
        const scheduleData = testData.schedule(testProject.id, {
          name: `Schedule in ${timezone}`,
          timezone,
        });

        const { data, error } = await supabase
          .from('test_schedules')
          .insert({
            project_id: scheduleData.project_id,
            name: scheduleData.name,
            cron_expression: scheduleData.cron_expression,
            timezone: scheduleData.timezone,
            enabled: scheduleData.enabled,
            test_ids: scheduleData.test_ids,
            notification_config: scheduleData.notification_config,
            environment: scheduleData.environment,
            browser: scheduleData.browser,
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.timezone).toBe(timezone);
        expect(validators.isValidTimezone(data?.timezone || '')).toBe(true);
      }
    });
  });

  describe('List Schedules', () => {
    let createdScheduleIds: string[] = [];

    beforeEach(async () => {
      // Create multiple schedules for listing tests
      const schedules = [
        testData.schedule(testProject.id, { name: 'List Test Schedule 1', enabled: true }),
        testData.schedule(testProject.id, { name: 'List Test Schedule 2', enabled: true }),
        testData.schedule(testProject.id, { name: 'List Test Schedule 3', enabled: false }),
      ];

      createdScheduleIds = [];
      for (const scheduleData of schedules) {
        const { data } = await supabase
          .from('test_schedules')
          .insert({
            project_id: scheduleData.project_id,
            name: scheduleData.name,
            cron_expression: scheduleData.cron_expression,
            timezone: scheduleData.timezone,
            enabled: scheduleData.enabled,
            test_ids: scheduleData.test_ids,
            notification_config: scheduleData.notification_config,
            environment: scheduleData.environment,
            browser: scheduleData.browser,
          })
          .select()
          .single();

        if (data) createdScheduleIds.push(data.id);
      }
    });

    it('should list all schedules for a project', async () => {
      const { data, error } = await supabase
        .from('test_schedules')
        .select('*')
        .eq('project_id', testProject.id)
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data!.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter schedules by enabled status', async () => {
      const { data: enabledSchedules, error: enabledError } = await supabase
        .from('test_schedules')
        .select('*')
        .eq('project_id', testProject.id)
        .eq('enabled', true);

      expect(enabledError).toBeNull();
      expect(enabledSchedules).toBeDefined();
      enabledSchedules?.forEach((schedule) => {
        expect(schedule.enabled).toBe(true);
      });

      const { data: disabledSchedules, error: disabledError } = await supabase
        .from('test_schedules')
        .select('*')
        .eq('project_id', testProject.id)
        .eq('enabled', false);

      expect(disabledError).toBeNull();
      expect(disabledSchedules).toBeDefined();
      disabledSchedules?.forEach((schedule) => {
        expect(schedule.enabled).toBe(false);
      });
    });

    it('should search schedules by name', async () => {
      const { data, error } = await supabase
        .from('test_schedules')
        .select('*')
        .eq('project_id', testProject.id)
        .ilike('name', '%List Test%');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThanOrEqual(3);
      data?.forEach((schedule) => {
        expect(schedule.name.toLowerCase()).toContain('list test');
      });
    });

    it('should paginate schedules', async () => {
      const pageSize = 2;

      const { data: page1, error: error1 } = await supabase
        .from('test_schedules')
        .select('*')
        .eq('project_id', testProject.id)
        .order('created_at', { ascending: true })
        .range(0, pageSize - 1);

      expect(error1).toBeNull();
      expect(page1?.length).toBeLessThanOrEqual(pageSize);

      const { data: page2, error: error2 } = await supabase
        .from('test_schedules')
        .select('*')
        .eq('project_id', testProject.id)
        .order('created_at', { ascending: true })
        .range(pageSize, pageSize * 2 - 1);

      expect(error2).toBeNull();

      // Ensure different pages return different data
      if (page1 && page2 && page1.length > 0 && page2.length > 0) {
        expect(page1[0].id).not.toBe(page2[0].id);
      }
    });
  });

  describe('Update Schedule', () => {
    let scheduleToUpdate: { id: string } | null = null;

    beforeEach(async () => {
      const scheduleData = testData.schedule(testProject.id, {
        name: 'Schedule to Update',
        enabled: true,
      });

      const { data } = await supabase
        .from('test_schedules')
        .insert({
          project_id: scheduleData.project_id,
          name: scheduleData.name,
          cron_expression: scheduleData.cron_expression,
          timezone: scheduleData.timezone,
          enabled: scheduleData.enabled,
          test_ids: scheduleData.test_ids,
          notification_config: scheduleData.notification_config,
          environment: scheduleData.environment,
          browser: scheduleData.browser,
        })
        .select()
        .single();

      scheduleToUpdate = data;
    });

    it('should enable a disabled schedule', async () => {
      // First disable it
      await supabase
        .from('test_schedules')
        .update({ enabled: false })
        .eq('id', scheduleToUpdate!.id);

      // Then enable it
      const { data, error } = await supabase
        .from('test_schedules')
        .update({ enabled: true })
        .eq('id', scheduleToUpdate!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.enabled).toBe(true);
    });

    it('should disable an enabled schedule', async () => {
      const { data, error } = await supabase
        .from('test_schedules')
        .update({ enabled: false })
        .eq('id', scheduleToUpdate!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.enabled).toBe(false);
    });

    it('should update schedule name', async () => {
      const newName = 'Updated Schedule Name';

      const { data, error } = await supabase
        .from('test_schedules')
        .update({ name: newName })
        .eq('id', scheduleToUpdate!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.name).toBe(newName);
    });

    it('should update cron expression', async () => {
      const newCron = '30 8 * * 1-5'; // 8:30 AM weekdays

      const { data, error } = await supabase
        .from('test_schedules')
        .update({ cron_expression: newCron })
        .eq('id', scheduleToUpdate!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.cron_expression).toBe(newCron);
    });

    it('should update timezone', async () => {
      const newTimezone = 'Europe/Paris';

      const { data, error } = await supabase
        .from('test_schedules')
        .update({ timezone: newTimezone })
        .eq('id', scheduleToUpdate!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.timezone).toBe(newTimezone);
    });

    it('should update notification configuration', async () => {
      const newConfig = {
        on_failure: true,
        on_success: true,
        channels: ['new-channel-1'],
      };

      const { data, error } = await supabase
        .from('test_schedules')
        .update({ notification_config: newConfig })
        .eq('id', scheduleToUpdate!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.notification_config).toEqual(newConfig);
    });

    it('should update multiple fields at once', async () => {
      const updates = {
        name: 'Multi-field Update',
        enabled: false,
        environment: 'production',
        browser: 'firefox',
      };

      const { data, error } = await supabase
        .from('test_schedules')
        .update(updates)
        .eq('id', scheduleToUpdate!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.name).toBe('Multi-field Update');
      expect(data?.enabled).toBe(false);
      expect(data?.environment).toBe('production');
      expect(data?.browser).toBe('firefox');
    });
  });

  describe('Trigger Schedule Manually', () => {
    let scheduleForTrigger: { id: string } | null = null;

    beforeEach(async () => {
      const scheduleData = testData.schedule(testProject.id, {
        name: 'Schedule to Trigger',
        enabled: true,
      });

      const { data } = await supabase
        .from('test_schedules')
        .insert({
          project_id: scheduleData.project_id,
          name: scheduleData.name,
          cron_expression: scheduleData.cron_expression,
          timezone: scheduleData.timezone,
          enabled: scheduleData.enabled,
          test_ids: scheduleData.test_ids,
          notification_config: scheduleData.notification_config,
          environment: scheduleData.environment,
          browser: scheduleData.browser,
        })
        .select()
        .single();

      scheduleForTrigger = data;
    });

    it('should create a schedule run record when triggered', async () => {
      const runData = {
        schedule_id: scheduleForTrigger!.id,
        status: 'pending',
        trigger_type: 'manual',
        triggered_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('schedule_runs')
        .insert(runData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.schedule_id).toBe(scheduleForTrigger!.id);
      expect(data?.trigger_type).toBe('manual');
      expect(data?.status).toBe('pending');
    });

    it('should update schedule run status during execution', async () => {
      // Create a run
      const { data: run } = await supabase
        .from('schedule_runs')
        .insert({
          schedule_id: scheduleForTrigger!.id,
          status: 'pending',
          trigger_type: 'manual',
          triggered_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Update to running
      const { data: runningRun, error: runningError } = await supabase
        .from('schedule_runs')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .eq('id', run!.id)
        .select()
        .single();

      expect(runningError).toBeNull();
      expect(runningRun?.status).toBe('running');

      // Update to completed
      const { data: completedRun, error: completedError } = await supabase
        .from('schedule_runs')
        .update({
          status: 'passed',
          completed_at: new Date().toISOString(),
          tests_total: 10,
          tests_passed: 9,
          tests_failed: 1,
          tests_skipped: 0,
          duration_ms: 45000,
        })
        .eq('id', run!.id)
        .select()
        .single();

      expect(completedError).toBeNull();
      expect(completedRun?.status).toBe('passed');
      expect(completedRun?.tests_total).toBe(10);
      expect(completedRun?.tests_passed).toBe(9);
      expect(completedRun?.tests_failed).toBe(1);
    });

    it('should update last_run_at on schedule after trigger', async () => {
      const lastRunAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('test_schedules')
        .update({ last_run_at: lastRunAt })
        .eq('id', scheduleForTrigger!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.last_run_at).toBeDefined();
    });
  });

  describe('View Schedule Run History', () => {
    let scheduleWithHistory: { id: string } | null = null;

    beforeEach(async () => {
      // Create a schedule
      const scheduleData = testData.schedule(testProject.id, {
        name: 'Schedule with History',
      });

      const { data: schedule } = await supabase
        .from('test_schedules')
        .insert({
          project_id: scheduleData.project_id,
          name: scheduleData.name,
          cron_expression: scheduleData.cron_expression,
          timezone: scheduleData.timezone,
          enabled: scheduleData.enabled,
          test_ids: scheduleData.test_ids,
          notification_config: scheduleData.notification_config,
          environment: scheduleData.environment,
          browser: scheduleData.browser,
        })
        .select()
        .single();

      scheduleWithHistory = schedule;

      // Create multiple run history entries
      const runs = [
        { status: 'passed', tests_passed: 10, tests_failed: 0 },
        { status: 'failed', tests_passed: 8, tests_failed: 2 },
        { status: 'passed', tests_passed: 10, tests_failed: 0 },
      ];

      for (const run of runs) {
        await supabase.from('schedule_runs').insert({
          schedule_id: schedule!.id,
          status: run.status,
          trigger_type: 'scheduled',
          triggered_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          tests_total: run.tests_passed + run.tests_failed,
          tests_passed: run.tests_passed,
          tests_failed: run.tests_failed,
          tests_skipped: 0,
          duration_ms: Math.floor(Math.random() * 60000),
        });
        await waitFor(10); // Small delay to ensure different timestamps
      }
    });

    it('should list run history for a schedule', async () => {
      const { data, error } = await supabase
        .from('schedule_runs')
        .select('*')
        .eq('schedule_id', scheduleWithHistory!.id)
        .order('triggered_at', { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter runs by status', async () => {
      const { data: passedRuns, error } = await supabase
        .from('schedule_runs')
        .select('*')
        .eq('schedule_id', scheduleWithHistory!.id)
        .eq('status', 'passed');

      expect(error).toBeNull();
      expect(passedRuns).toBeDefined();
      passedRuns?.forEach((run) => {
        expect(run.status).toBe('passed');
      });
    });

    it('should include test statistics in run history', async () => {
      const { data, error } = await supabase
        .from('schedule_runs')
        .select('*')
        .eq('schedule_id', scheduleWithHistory!.id)
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);
      expect(typeof data![0].tests_total).toBe('number');
      expect(typeof data![0].tests_passed).toBe('number');
      expect(typeof data![0].tests_failed).toBe('number');
    });

    it('should return runs in chronological order', async () => {
      const { data, error } = await supabase
        .from('schedule_runs')
        .select('*')
        .eq('schedule_id', scheduleWithHistory!.id)
        .order('triggered_at', { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Verify descending order
      for (let i = 1; i < data!.length; i++) {
        const prevDate = new Date(data![i - 1].triggered_at);
        const currDate = new Date(data![i].triggered_at);
        expect(prevDate >= currDate).toBe(true);
      }
    });
  });

  describe('Delete Schedule', () => {
    it('should delete a schedule', async () => {
      // Create a schedule to delete
      const scheduleData = testData.schedule(testProject.id, {
        name: 'Schedule to Delete',
      });

      const { data: created } = await supabase
        .from('test_schedules')
        .insert({
          project_id: scheduleData.project_id,
          name: scheduleData.name,
          cron_expression: scheduleData.cron_expression,
          timezone: scheduleData.timezone,
          enabled: scheduleData.enabled,
          test_ids: scheduleData.test_ids,
          notification_config: scheduleData.notification_config,
          environment: scheduleData.environment,
          browser: scheduleData.browser,
        })
        .select()
        .single();

      expect(created).toBeDefined();

      // Delete the schedule
      const { error: deleteError } = await supabase
        .from('test_schedules')
        .delete()
        .eq('id', created!.id);

      expect(deleteError).toBeNull();

      // Verify it's deleted
      const { data: found } = await supabase
        .from('test_schedules')
        .select('*')
        .eq('id', created!.id)
        .single();

      expect(found).toBeNull();
    });

    it('should cascade delete schedule runs when schedule is deleted', async () => {
      // Create a schedule
      const scheduleData = testData.schedule(testProject.id, {
        name: 'Schedule with Runs to Delete',
      });

      const { data: schedule } = await supabase
        .from('test_schedules')
        .insert({
          project_id: scheduleData.project_id,
          name: scheduleData.name,
          cron_expression: scheduleData.cron_expression,
          timezone: scheduleData.timezone,
          enabled: scheduleData.enabled,
          test_ids: scheduleData.test_ids,
          notification_config: scheduleData.notification_config,
          environment: scheduleData.environment,
          browser: scheduleData.browser,
        })
        .select()
        .single();

      // Create some runs
      await supabase.from('schedule_runs').insert({
        schedule_id: schedule!.id,
        status: 'passed',
        trigger_type: 'scheduled',
        triggered_at: new Date().toISOString(),
      });

      // Delete the schedule (should cascade to runs)
      await supabase.from('test_schedules').delete().eq('id', schedule!.id);

      // Verify runs are also deleted
      const { data: runs } = await supabase
        .from('schedule_runs')
        .select('*')
        .eq('schedule_id', schedule!.id);

      expect(runs?.length || 0).toBe(0);
    });

    it('should not affect other schedules when one is deleted', async () => {
      // Create two schedules
      const { data: schedule1 } = await supabase
        .from('test_schedules')
        .insert({
          project_id: testProject.id,
          name: 'Schedule 1 - Keep',
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

      const { data: schedule2 } = await supabase
        .from('test_schedules')
        .insert({
          project_id: testProject.id,
          name: 'Schedule 2 - Delete',
          cron_expression: '0 10 * * *',
          timezone: 'UTC',
          enabled: true,
          test_ids: [],
          notification_config: { on_failure: true, on_success: false, channels: [] },
          environment: 'staging',
          browser: 'chromium',
        })
        .select()
        .single();

      // Delete schedule 2
      await supabase.from('test_schedules').delete().eq('id', schedule2!.id);

      // Verify schedule 1 still exists
      const { data: found } = await supabase
        .from('test_schedules')
        .select('*')
        .eq('id', schedule1!.id)
        .single();

      expect(found).toBeDefined();
      expect(found?.name).toBe('Schedule 1 - Keep');
    });
  });
});
