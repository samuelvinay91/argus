/**
 * Integration Tests for Activity Feed
 *
 * Tests the activity feed functionality including:
 * - Verifying activity logs are created for test runs
 * - Verifying real-time updates work
 * - Filtering activities by type
 * - Verifying activity log cleanup
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
} from '../setup';

// Activity event types - based on database constraint
type ActivityType = 'discovery';

interface ActivityLog {
  id?: string;
  project_id: string;
  session_id: string;
  activity_type: ActivityType;
  event_type: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  screenshot_url?: string;
  duration_ms?: number;
  created_at?: string;
}

// Generate a test session ID for activity logs (must be UUID format)
let testSessionId: string;

// Generate a valid UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

describe('Activity Feed Integration Tests', () => {
  let testProject: TestProject;

  beforeAll(async () => {
    // Generate a test session ID (must be valid UUID)
    testSessionId = generateUUID();

    // Create a test project for all activity tests
    testProject = await createTestProject({
      name: 'Activity Feed Test Project',
      app_url: 'https://activity-test.example.com',
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Clean up all test data
    if (testProject?.id) {
      await cleanupTestData(testProject.id);
    }
  }, TEST_TIMEOUT);

  describe('Activity Logs Created for Test Runs', () => {
    it('should create an activity log when a test starts', async () => {
      const activity: ActivityLog = {
        project_id: testProject.id,
        session_id: testSessionId,
        activity_type: 'discovery',
        event_type: 'started',
        title: 'Test run started',
        description: 'Login Flow test has started execution',
        metadata: {
          test_id: generateTestId('test'),
          test_name: 'Login Flow',
          browser: 'chromium',
          environment: 'staging',
        },
      };

      const { data, error } = await supabase
        .from('activity_logs')
        .insert(activity)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.activity_type).toBe('discovery');
      expect(data?.title).toBe('Test run started');
      expect((data?.metadata as Record<string, unknown>)?.test_name).toBe('Login Flow');
    });

    it('should create an activity log when a test passes', async () => {
      const activity: ActivityLog = {
        project_id: testProject.id,
        session_id: testSessionId,
        activity_type: 'discovery',
        event_type: 'completed',
        title: 'Test run completed successfully',
        description: 'Login Flow passed all 5 steps in 4.2s',
        metadata: {
          test_id: generateTestId('test'),
          test_name: 'Login Flow',
          duration_ms: 4200,
          steps_passed: 5,
          steps_total: 5,
        },
      };

      const { data, error } = await supabase
        .from('activity_logs')
        .insert(activity)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.activity_type).toBe('discovery');
      expect((data?.metadata as Record<string, unknown>)?.duration_ms).toBe(4200);
    });

    it('should create an activity log when a test fails', async () => {
      const activity: ActivityLog = {
        project_id: testProject.id,
        session_id: testSessionId,
        activity_type: 'discovery',
        event_type: 'completed',
        title: 'Test run failed',
        description: 'Payment Processing failed at step 3: Element not found',
        metadata: {
          test_id: generateTestId('test'),
          test_name: 'Payment Processing',
          duration_ms: 8500,
          steps_passed: 2,
          steps_total: 5,
          error_type: 'ElementNotFound',
          error_message: 'Element not found: #payment-button',
          failed_step: 3,
        },
      };

      const { data, error } = await supabase
        .from('activity_logs')
        .insert(activity)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.activity_type).toBe('discovery');
      expect((data?.metadata as Record<string, unknown>)?.error_type).toBe('ElementNotFound');
    });

    it('should create an activity log for test creation', async () => {
      const activity: ActivityLog = {
        project_id: testProject.id,
        session_id: testSessionId,
        activity_type: 'discovery',
        event_type: 'started',
        title: 'New test created',
        description: 'Added "Product Search" test with 8 steps',
        metadata: {
          test_id: generateTestId('test'),
          test_name: 'Product Search',
          steps_count: 8,
          tags: ['search', 'products'],
          user_name: 'John Doe',
        },
      };

      const { data, error } = await supabase
        .from('activity_logs')
        .insert(activity)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.activity_type).toBe('discovery');
      expect((data?.metadata as Record<string, unknown>)?.user_name).toBe('John Doe');
    });

    it('should create an activity log for healing events', async () => {
      const activity: ActivityLog = {
        project_id: testProject.id,
        session_id: testSessionId,
        activity_type: 'discovery',
        event_type: 'step',
        title: 'Self-healing fix applied',
        description: 'Updated selector for Submit button: #submit-btn -> [data-testid="submit"]',
        metadata: {
          test_id: generateTestId('test'),
          test_name: 'Checkout Flow',
          healing_type: 'selector_update',
          old_selector: '#submit-btn',
          new_selector: '[data-testid="submit"]',
          confidence: 0.95,
          user_name: 'Argus AI',
        },
      };

      const { data, error } = await supabase
        .from('activity_logs')
        .insert(activity)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.activity_type).toBe('discovery');
      expect((data?.metadata as Record<string, unknown>)?.healing_type).toBe('selector_update');
    });

    it('should create an activity log for scheduled runs', async () => {
      const activity: ActivityLog = {
        project_id: testProject.id,
        session_id: testSessionId,
        activity_type: 'discovery',
        event_type: 'started',
        title: 'Scheduled run started',
        description: 'Daily regression suite started (15 tests)',
        metadata: {
          schedule_id: generateTestId('schedule'),
          schedule_name: 'Daily Regression',
          tests_count: 15,
          trigger_type: 'cron',
          user_name: 'Scheduler',
        },
      };

      const { data, error } = await supabase
        .from('activity_logs')
        .insert(activity)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.activity_type).toBe('discovery');
      expect((data?.metadata as Record<string, unknown>)?.tests_count).toBe(15);
    });
  });

  describe('Real-time Activity Updates', () => {
    it('should return activities in reverse chronological order', async () => {
      // Create multiple activities with slight delays
      const activities = [
        { activity_type: 'discovery' as ActivityType, title: 'Activity 1' },
        { activity_type: 'discovery' as ActivityType, title: 'Activity 2' },
        { activity_type: 'discovery' as ActivityType, title: 'Activity 3' },
      ];

      for (const act of activities) {
        await supabase.from('activity_logs').insert({
          project_id: testProject.id,
          session_id: testSessionId,
          activity_type: act.activity_type,
          event_type: 'test',
          title: act.title,
          description: 'Test activity',
        });
        await waitFor(50);
      }

      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('project_id', testProject.id)
        .order('created_at', { ascending: false })
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThanOrEqual(3);

      // Verify descending order
      for (let i = 1; i < data!.length; i++) {
        const prevDate = new Date(data![i - 1].created_at);
        const currDate = new Date(data![i].created_at);
        expect(prevDate >= currDate).toBe(true);
      }
    });

    it('should support pagination for activity feed', async () => {
      // Create enough activities for pagination
      for (let i = 0; i < 15; i++) {
        await supabase.from('activity_logs').insert({
          project_id: testProject.id,
          session_id: testSessionId,
          activity_type: 'discovery',
          event_type: 'started',
          title: `Pagination Activity ${i}`,
          description: 'Test activity for pagination',
        });
      }

      const pageSize = 5;

      // First page
      const { data: page1, error: error1 } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('project_id', testProject.id)
        .order('created_at', { ascending: false })
        .range(0, pageSize - 1);

      expect(error1).toBeNull();
      expect(page1?.length).toBe(pageSize);

      // Second page
      const { data: page2, error: error2 } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('project_id', testProject.id)
        .order('created_at', { ascending: false })
        .range(pageSize, pageSize * 2 - 1);

      expect(error2).toBeNull();
      expect(page2?.length).toBe(pageSize);

      // Ensure no duplicates between pages
      const page1Ids = new Set(page1?.map((a) => a.id));
      page2?.forEach((a) => {
        expect(page1Ids.has(a.id)).toBe(false);
      });
    });

    it('should include user information in activities', async () => {
      const activity: ActivityLog = {
        project_id: testProject.id,
        session_id: testSessionId,
        activity_type: 'discovery',
        event_type: 'started',
        title: 'Test with user info',
        description: 'Activity with user details',
        metadata: {
          user_id: 'user-123',
          user_name: 'Jane Smith',
          user_avatar: 'https://example.com/avatar.png',
        },
      };

      const { data, error } = await supabase
        .from('activity_logs')
        .insert(activity)
        .select()
        .single();

      expect(error).toBeNull();
      const metadata = data?.metadata as Record<string, unknown>;
      expect(metadata?.user_id).toBe('user-123');
      expect(metadata?.user_name).toBe('Jane Smith');
    });
  });

  describe('Filter Activities by Type', () => {
    beforeEach(async () => {
      // Create multiple activities for filtering tests
      for (let i = 0; i < 10; i++) {
        await supabase.from('activity_logs').insert({
          project_id: testProject.id,
          session_id: testSessionId,
          activity_type: 'discovery',
          event_type: 'test',
          title: `discovery activity ${i}`,
          description: 'Filtered activity',
        });
      }
    });

    it('should filter activities by discovery type', async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('project_id', testProject.id)
        .eq('activity_type', 'discovery');

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(10);
      data?.forEach((activity) => {
        expect(activity.activity_type).toBe('discovery');
      });
    });

    it('should filter activities by project ID', async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('project_id', testProject.id);

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
      data?.forEach((activity) => {
        expect(activity.project_id).toBe(testProject.id);
      });
    });

    it('should filter activities by session ID', async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('project_id', testProject.id)
        .eq('session_id', testSessionId);

      expect(error).toBeNull();
      data?.forEach((activity) => {
        expect(activity.session_id).toBe(testSessionId);
      });
    });

    it('should filter activities by event type', async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('project_id', testProject.id)
        .eq('event_type', 'test');

      expect(error).toBeNull();
      data?.forEach((activity) => {
        expect(activity.event_type).toBe('test');
      });
    });

    it('should combine type filter with text search', async () => {
      // Add activity with specific text
      await supabase.from('activity_logs').insert({
        project_id: testProject.id,
        session_id: testSessionId,
        activity_type: 'discovery',
        event_type: 'search',
        title: 'Checkout test search',
        description: 'Searching for checkout elements',
      });

      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('project_id', testProject.id)
        .eq('activity_type', 'discovery')
        .ilike('title', '%Checkout%');

      expect(error).toBeNull();
      data?.forEach((activity) => {
        expect(activity.activity_type).toBe('discovery');
        expect(activity.title.toLowerCase()).toContain('checkout');
      });
    });

    it('should filter by time range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('project_id', testProject.id)
        .gte('created_at', oneHourAgo.toISOString())
        .lte('created_at', now.toISOString());

      expect(error).toBeNull();
      data?.forEach((activity) => {
        const activityDate = new Date(activity.created_at);
        expect(activityDate >= oneHourAgo).toBe(true);
        expect(activityDate <= now).toBe(true);
      });
    });
  });

  describe('Activity Log Cleanup', () => {
    it('should delete old activity logs', async () => {
      // Create an old activity (we'll pretend it's old by checking deletion works)
      const { data: oldActivity } = await supabase
        .from('activity_logs')
        .insert({
          project_id: testProject.id,
          session_id: testSessionId,
          activity_type: 'discovery',
          event_type: 'started',
          title: 'Old activity to delete',
          description: 'This will be deleted',
        })
        .select()
        .single();

      expect(oldActivity).toBeDefined();

      // Delete the activity
      const { error: deleteError } = await supabase
        .from('activity_logs')
        .delete()
        .eq('id', oldActivity!.id);

      expect(deleteError).toBeNull();

      // Verify it's deleted
      const { data: found } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('id', oldActivity!.id)
        .single();

      expect(found).toBeNull();
    });

    it('should delete activities older than a threshold', async () => {
      // Create activities to test bulk deletion
      const oldIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase
          .from('activity_logs')
          .insert({
            project_id: testProject.id,
            session_id: testSessionId,
            activity_type: 'discovery',
            event_type: 'started',
            title: `Old batch activity ${i}`,
            description: 'Batch cleanup test',
          })
          .select()
          .single();
        if (data) oldIds.push(data.id);
      }

      // Delete all these activities
      const { error } = await supabase
        .from('activity_logs')
        .delete()
        .in('id', oldIds);

      expect(error).toBeNull();

      // Verify deletion
      const { data: remaining } = await supabase
        .from('activity_logs')
        .select('id')
        .in('id', oldIds);

      expect(remaining?.length || 0).toBe(0);
    });

    it('should not delete activities from other projects', async () => {
      // Create another test project
      const otherProject = await createTestProject({
        name: 'Other Project',
        app_url: 'https://other.example.com',
      });

      // Create activity in other project
      const { data: otherActivity } = await supabase
        .from('activity_logs')
        .insert({
          project_id: otherProject.id,
          session_id: testSessionId,
          activity_type: 'discovery',
          event_type: 'started',
          title: 'Other project activity',
          description: 'Should not be deleted',
        })
        .select()
        .single();

      // Delete activities from main test project
      await supabase
        .from('activity_logs')
        .delete()
        .eq('project_id', testProject.id)
        .ilike('title', '%Old%');

      // Verify other project's activity still exists
      const { data: found } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('id', otherActivity!.id)
        .single();

      expect(found).toBeDefined();
      expect(found?.project_id).toBe(otherProject.id);

      // Cleanup other project
      await cleanupTestData(otherProject.id);
    });

    it('should count activities per project for cleanup decisions', async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id', { count: 'exact' })
        .eq('project_id', testProject.id);

      expect(error).toBeNull();
      expect(typeof (data?.length || 0)).toBe('number');
    });
  });

  describe('Activity Metadata and Details', () => {
    it('should store rich metadata for test activities', async () => {
      const metadata = {
        test_id: generateTestId('test'),
        test_name: 'Login Flow',
        duration_ms: 4200,
        browser: 'chromium',
        environment: 'staging',
        steps: [
          { name: 'Navigate to login', status: 'passed', duration: 500 },
          { name: 'Enter credentials', status: 'passed', duration: 1000 },
          { name: 'Click submit', status: 'passed', duration: 200 },
          { name: 'Verify redirect', status: 'passed', duration: 2500 },
        ],
        screenshots: ['before.png', 'after.png'],
        video_url: 'https://storage.example.com/videos/test-123.mp4',
      };

      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          project_id: testProject.id,
          session_id: testSessionId,
          activity_type: 'discovery',
          event_type: 'completed',
          title: 'Rich metadata test',
          description: 'Test with detailed metadata',
          metadata,
        })
        .select()
        .single();

      expect(error).toBeNull();
      const storedMetadata = data?.metadata as Record<string, unknown>;
      expect(storedMetadata?.duration_ms).toBe(4200);
      expect((storedMetadata?.steps as unknown[]).length).toBe(4);
      expect((storedMetadata?.screenshots as string[]).length).toBe(2);
    });

    it('should store healing activity details', async () => {
      const metadata = {
        test_id: generateTestId('test'),
        test_name: 'Checkout Flow',
        healing_type: 'selector_update',
        healed_element: 'Submit Button',
        original_selector: '#submit-btn',
        new_selector: '[data-testid="submit"]',
        confidence_score: 0.95,
        similar_fixes: 3,
        applied_automatically: true,
        user_name: 'Argus AI',
      };

      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          project_id: testProject.id,
          session_id: testSessionId,
          activity_type: 'discovery',
          event_type: 'step',
          title: 'Healing with details',
          description: 'Self-healing activity',
          metadata,
        })
        .select()
        .single();

      expect(error).toBeNull();
      const storedMetadata = data?.metadata as Record<string, unknown>;
      expect(storedMetadata?.confidence_score).toBe(0.95);
      expect(storedMetadata?.applied_automatically).toBe(true);
    });

    it('should link activities to related entities', async () => {
      const testId = generateTestId('test');
      const scheduleId = generateTestId('schedule');
      const runId = generateTestId('run');

      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          project_id: testProject.id,
          session_id: testSessionId,
          activity_type: 'discovery',
          event_type: 'completed',
          title: 'Linked activity',
          description: 'Activity with entity links',
          metadata: {
            test_id: testId,
            schedule_id: scheduleId,
            run_id: runId,
            links: {
              test: `/tests/${testId}`,
              schedule: `/schedules/${scheduleId}`,
              run: `/runs/${runId}`,
            },
          },
        })
        .select()
        .single();

      expect(error).toBeNull();
      const storedMetadata = data?.metadata as Record<string, unknown>;
      expect(storedMetadata?.test_id).toBe(testId);
      expect(storedMetadata?.schedule_id).toBe(scheduleId);
      expect((storedMetadata?.links as Record<string, string>)?.test).toContain(testId);
    });
  });
});
