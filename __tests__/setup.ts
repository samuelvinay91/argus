/**
 * Test Setup for Argus Dashboard Integration Tests
 *
 * This file provides utilities for testing against Supabase.
 * It can be configured to use either a real test database or mock Supabase client.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/types';

// Test environment configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

// Use service role key for tests to bypass RLS
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Regular client (simulates user access)
export const supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test user ID for all tests
export const TEST_USER_ID = 'test-user-' + Date.now();

// Test organization (will be created on first use)
let testOrganization: { id: string; name: string } | null = null;

// Get or create test organization
export async function getTestOrganization(): Promise<{ id: string; name: string }> {
  if (testOrganization) {
    return testOrganization;
  }

  const timestamp = Date.now();
  const orgName = `Test Organization ${timestamp}`;
  const orgSlug = `test-org-${timestamp}`;

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name: orgName,
      slug: orgSlug,
      plan: 'free',
    })
    .select()
    .single();

  if (error) {
    // If organization creation fails, try to get an existing one
    const { data: existing } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1)
      .single();

    if (existing) {
      testOrganization = existing;
      return testOrganization;
    }
    throw new Error(`Failed to create test organization: ${error.message}`);
  }

  testOrganization = { id: data.id, name: data.name };
  return testOrganization;
}

// Test data factory functions
export interface TestProject {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  app_url: string;
  description?: string;
  settings?: Record<string, unknown>;
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TestSchedule {
  id?: string;
  project_id: string;
  name: string;
  description?: string;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  test_ids: string[];
  notification_config: {
    on_failure: boolean;
    on_success: boolean;
    channels: string[];
  };
  environment: string;
  browser: string;
}

export interface TestNotificationChannel {
  id?: string;
  organization_id: string;
  project_id: string;
  name: string;
  channel_type: 'slack' | 'email' | 'webhook' | 'discord' | 'pagerduty' | 'teams' | 'custom';
  config: Record<string, unknown>;
  enabled: boolean;
  rate_limit_per_hour?: number;
}

export interface TestParameterizedTest {
  id?: string;
  project_id: string;
  base_test_id?: string;
  name: string;
  description?: string;
  tags?: string[];
  priority?: 'critical' | 'high' | 'medium' | 'low';
  data_source_type: 'inline' | 'csv' | 'json' | 'api' | 'database' | 'spreadsheet';
  data_source_config: Record<string, unknown>;
  parameter_schema?: Record<string, unknown>;
  steps: Array<{
    action: string;
    target?: string;
    value?: string;
  }>;
  iteration_mode?: 'sequential' | 'parallel' | 'random';
  is_active?: boolean;
}

// Create test project
export async function createTestProject(overrides: Partial<TestProject> = {}): Promise<TestProject> {
  const timestamp = Date.now();
  const project = {
    user_id: TEST_USER_ID,
    name: `Integration Test Project ${timestamp}`,
    slug: `test-project-${timestamp}`,
    app_url: 'https://test.example.com',
    description: 'Test project for integration tests',
    settings: {},
    ...overrides,
  };

  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test project: ${error.message}`);
  }

  return data as TestProject;
}

// Test data cleanup functions
export async function cleanupTestData(projectId: string): Promise<void> {
  // Delete in correct order due to foreign key constraints

  // 1. Delete iteration results (depends on parameterized_results)
  await supabase
    .from('iteration_results')
    .delete()
    .filter('parameterized_result_id', 'in',
      `(SELECT id FROM parameterized_results WHERE parameterized_test_id IN (SELECT id FROM parameterized_tests WHERE project_id = '${projectId}'))`
    );

  // 2. Delete parameterized results
  await supabase
    .from('parameterized_results')
    .delete()
    .filter('parameterized_test_id', 'in',
      `(SELECT id FROM parameterized_tests WHERE project_id = '${projectId}')`
    );

  // 3. Delete parameter sets
  await supabase
    .from('parameter_sets')
    .delete()
    .filter('parameterized_test_id', 'in',
      `(SELECT id FROM parameterized_tests WHERE project_id = '${projectId}')`
    );

  // 4. Delete parameterized tests
  await supabase
    .from('parameterized_tests')
    .delete()
    .eq('project_id', projectId);

  // 5. Delete schedule runs
  await supabase
    .from('schedule_runs')
    .delete()
    .filter('schedule_id', 'in',
      `(SELECT id FROM test_schedules WHERE project_id = '${projectId}')`
    );

  // 6. Delete test schedules
  await supabase
    .from('test_schedules')
    .delete()
    .eq('project_id', projectId);

  // 7. Delete notification logs
  await supabase
    .from('notification_logs')
    .delete()
    .filter('channel_id', 'in',
      `(SELECT id FROM notification_channels WHERE project_id = '${projectId}')`
    );

  // 8. Delete notification channels
  await supabase
    .from('notification_channels')
    .delete()
    .eq('project_id', projectId);

  // 9. Delete activity logs
  await supabase
    .from('activity_logs')
    .delete()
    .eq('project_id', projectId);

  // 10. Delete test results (depends on test_runs)
  await supabase
    .from('test_results')
    .delete()
    .filter('test_run_id', 'in',
      `(SELECT id FROM test_runs WHERE project_id = '${projectId}')`
    );

  // 11. Delete test runs
  await supabase
    .from('test_runs')
    .delete()
    .eq('project_id', projectId);

  // 12. Delete tests
  await supabase
    .from('tests')
    .delete()
    .eq('project_id', projectId);

  // 13. Finally delete the project
  await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);
}

// Full cleanup for a user
export async function cleanupAllTestDataForUser(userId: string): Promise<void> {
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', userId);

  if (projects) {
    for (const project of projects) {
      await cleanupTestData(project.id);
    }
  }
}

// Helper to wait for async operations
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper for generating unique test IDs
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// Mock data generators
export const testData = {
  // Valid schedule data
  schedule: (projectId: string, overrides: Partial<TestSchedule> = {}): TestSchedule => ({
    project_id: projectId,
    name: 'Daily Regression Tests',
    description: 'Automated daily regression test suite',
    cron_expression: '0 9 * * 1-5', // 9 AM weekdays
    timezone: 'America/New_York',
    enabled: true,
    test_ids: [],
    notification_config: {
      on_failure: true,
      on_success: false,
      channels: [],
    },
    environment: 'staging',
    browser: 'chromium',
    ...overrides,
  }),

  // Valid notification channel data
  slackChannel: (organizationId: string, projectId: string, overrides: Partial<TestNotificationChannel> = {}): TestNotificationChannel => ({
    organization_id: organizationId,
    project_id: projectId,
    name: 'Test Slack Channel',
    channel_type: 'slack',
    config: {
      webhook_url: 'https://hooks.slack.com/services/TEST/WEBHOOK/URL',
      channel: '#testing',
    },
    enabled: true,
    rate_limit_per_hour: 100,
    ...overrides,
  }),

  webhookChannel: (organizationId: string, projectId: string, overrides: Partial<TestNotificationChannel> = {}): TestNotificationChannel => ({
    organization_id: organizationId,
    project_id: projectId,
    name: 'Test Webhook Channel',
    channel_type: 'webhook',
    config: {
      url: 'https://api.example.com/webhook',
      method: 'POST',
      headers: { 'X-API-Key': 'test-key' },
      secret: 'webhook-secret',
    },
    enabled: true,
    rate_limit_per_hour: 200,
    ...overrides,
  }),

  emailChannel: (organizationId: string, projectId: string, overrides: Partial<TestNotificationChannel> = {}): TestNotificationChannel => ({
    organization_id: organizationId,
    project_id: projectId,
    name: 'Test Email Channel',
    channel_type: 'email',
    config: {
      recipients: ['test@example.com'],
      cc: [],
      reply_to: 'noreply@example.com',
    },
    enabled: true,
    rate_limit_per_hour: 50,
    ...overrides,
  }),

  // Valid parameterized test data
  parameterizedTest: (projectId: string, overrides: Partial<TestParameterizedTest> = {}): TestParameterizedTest => ({
    project_id: projectId,
    name: 'Login Test with Multiple Users',
    description: 'Tests login functionality with various user credentials',
    tags: ['auth', 'login', 'regression'],
    priority: 'high',
    data_source_type: 'inline',
    data_source_config: {
      data: [
        { email: 'user1@test.com', password: 'password1', expected: 'success' },
        { email: 'user2@test.com', password: 'password2', expected: 'success' },
        { email: 'invalid@test.com', password: 'wrong', expected: 'failure' },
      ],
    },
    parameter_schema: {
      email: { type: 'string', required: true },
      password: { type: 'string', required: true },
      expected: { type: 'string', required: true },
    },
    steps: [
      { action: 'goto', target: '/login' },
      { action: 'fill', target: '#email', value: '{{email}}' },
      { action: 'fill', target: '#password', value: '{{password}}' },
      { action: 'click', target: 'button[type=submit]' },
    ],
    iteration_mode: 'sequential',
    is_active: true,
    ...overrides,
  }),

  csvParameterizedTest: (projectId: string, overrides: Partial<TestParameterizedTest> = {}): TestParameterizedTest => ({
    project_id: projectId,
    name: 'Product Search Test with CSV Data',
    description: 'Tests product search with data from CSV',
    tags: ['search', 'products'],
    priority: 'medium',
    data_source_type: 'csv',
    data_source_config: {
      file_path: '/test-data/products.csv',
      delimiter: ',',
      has_header: true,
    },
    parameter_schema: {
      query: { type: 'string', required: true },
      expected_count: { type: 'number', required: false },
    },
    steps: [
      { action: 'goto', target: '/products' },
      { action: 'fill', target: '#search', value: '{{query}}' },
      { action: 'click', target: 'button[type=submit]' },
      { action: 'wait', target: '.results' },
    ],
    iteration_mode: 'parallel',
    is_active: true,
    ...overrides,
  }),

  // Activity event data
  activityEvent: (projectId: string, type: string = 'test_started') => ({
    project_id: projectId,
    activity_type: type,
    event_type: 'started',
    title: 'Test activity event',
    description: 'Activity event for integration testing',
    metadata: { source: 'integration_test' },
  }),
};

// Validation helpers
export const validators = {
  isValidUUID: (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  },

  isValidCronExpression: (cron: string): boolean => {
    // Simple validation - 5 or 6 fields
    const fields = cron.trim().split(/\s+/);
    return fields.length >= 5 && fields.length <= 6;
  },

  isValidTimezone: (tz: string): boolean => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
};

// Error matchers for tests
export const errorMessages = {
  notFound: 'not found',
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  invalidInput: 'invalid input',
  duplicateKey: 'duplicate key',
};

// Default test timeout
export const TEST_TIMEOUT = 30000;

// Re-export for convenience
export { SupabaseClient };
