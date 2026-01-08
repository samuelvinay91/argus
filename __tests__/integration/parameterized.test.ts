/**
 * Integration Tests for Parameterized Tests
 *
 * Tests the parameterized testing functionality including:
 * - Creating parameterized test with inline data
 * - Creating parameterized test with CSV data source
 * - Expanding test to see all parameter combinations
 * - Running parameterized test
 * - Viewing iteration results
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
  type TestParameterizedTest,
} from '../setup';

describe('Parameterized Tests Integration Tests', () => {
  let testProject: TestProject;

  beforeAll(async () => {
    // Create a test project for all parameterized test tests
    testProject = await createTestProject({
      name: 'Parameterized Test Project',
      app_url: 'https://parameterized-test.example.com',
    });
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Clean up all test data
    if (testProject?.id) {
      await cleanupTestData(testProject.id);
    }
  }, TEST_TIMEOUT);

  describe('Create Parameterized Test with Inline Data', () => {
    it('should create a parameterized test with inline JSON data', async () => {
      const testDef = testData.parameterizedTest(testProject.id, {
        name: 'Login Test with Inline Data',
        data_source_type: 'inline',
        data_source_config: {
          data: [
            { email: 'user1@test.com', password: 'pass1', expected: 'success' },
            { email: 'user2@test.com', password: 'pass2', expected: 'success' },
            { email: 'invalid@test.com', password: 'wrong', expected: 'failure' },
          ],
        },
      });

      const { data, error } = await supabase
        .from('parameterized_tests')
        .insert({
          project_id: testDef.project_id,
          name: testDef.name,
          description: testDef.description,
          tags: testDef.tags,
          priority: testDef.priority,
          data_source_type: testDef.data_source_type,
          data_source_config: testDef.data_source_config,
          parameter_schema: testDef.parameter_schema,
          steps: testDef.steps,
          iteration_mode: testDef.iteration_mode,
          is_active: testDef.is_active,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBeDefined();
      expect(data?.name).toBe('Login Test with Inline Data');
      expect(data?.data_source_type).toBe('inline');
      expect(validators.isValidUUID(data?.id || '')).toBe(true);
    });

    it('should store parameter schema for type validation', async () => {
      const parameterSchema = {
        username: { type: 'string', required: true, description: 'User login name' },
        age: { type: 'number', required: false, min: 0, max: 150 },
        isAdmin: { type: 'boolean', required: false, default: false },
      };

      const { data, error } = await supabase
        .from('parameterized_tests')
        .insert({
          project_id: testProject.id,
          name: 'Test with Parameter Schema',
          data_source_type: 'inline',
          data_source_config: {
            data: [{ username: 'admin', age: 30, isAdmin: true }],
          },
          parameter_schema: parameterSchema,
          steps: [{ action: 'fill', target: '#username', value: '{{username}}' }],
          is_active: true,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.parameter_schema).toEqual(parameterSchema);
    });

    it('should create parameterized test with multiple step placeholders', async () => {
      const steps = [
        { action: 'goto', target: '/products/{{category}}' },
        { action: 'fill', target: '#search', value: '{{searchTerm}}' },
        { action: 'fill', target: '#min-price', value: '{{minPrice}}' },
        { action: 'fill', target: '#max-price', value: '{{maxPrice}}' },
        { action: 'click', target: 'button.search' },
        { action: 'assert', target: '.results-count', value: '{{expectedCount}}' },
      ];

      const { data, error } = await supabase
        .from('parameterized_tests')
        .insert({
          project_id: testProject.id,
          name: 'Product Search with Multiple Parameters',
          data_source_type: 'inline',
          data_source_config: {
            data: [
              { category: 'electronics', searchTerm: 'laptop', minPrice: '500', maxPrice: '2000', expectedCount: '25' },
              { category: 'clothing', searchTerm: 'shirt', minPrice: '20', maxPrice: '100', expectedCount: '150' },
            ],
          },
          steps,
          is_active: true,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.steps).toHaveLength(6);
      expect((data?.steps as Array<Record<string, string>>)[0].target).toBe('/products/{{category}}');
    });

    it('should set iteration mode to sequential', async () => {
      const { data, error } = await supabase
        .from('parameterized_tests')
        .insert({
          project_id: testProject.id,
          name: 'Sequential Iteration Test',
          data_source_type: 'inline',
          data_source_config: { data: [{ id: 1 }, { id: 2 }, { id: 3 }] },
          steps: [{ action: 'log', value: '{{id}}' }],
          iteration_mode: 'sequential',
          is_active: true,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.iteration_mode).toBe('sequential');
    });

    it('should set iteration mode to parallel', async () => {
      const { data, error } = await supabase
        .from('parameterized_tests')
        .insert({
          project_id: testProject.id,
          name: 'Parallel Iteration Test',
          data_source_type: 'inline',
          data_source_config: { data: [{ id: 1 }, { id: 2 }, { id: 3 }] },
          steps: [{ action: 'log', value: '{{id}}' }],
          iteration_mode: 'parallel',
          max_parallel: 3,
          is_active: true,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.iteration_mode).toBe('parallel');
      expect(data?.max_parallel).toBe(3);
    });
  });

  describe('Create Parameterized Test with CSV Data Source', () => {
    it('should create a parameterized test with CSV data source', async () => {
      const testDef = testData.csvParameterizedTest(testProject.id);

      const { data, error } = await supabase
        .from('parameterized_tests')
        .insert({
          project_id: testDef.project_id,
          name: testDef.name,
          description: testDef.description,
          tags: testDef.tags,
          priority: testDef.priority,
          data_source_type: testDef.data_source_type,
          data_source_config: testDef.data_source_config,
          parameter_schema: testDef.parameter_schema,
          steps: testDef.steps,
          iteration_mode: testDef.iteration_mode,
          is_active: testDef.is_active,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.data_source_type).toBe('csv');
      expect((data?.data_source_config as Record<string, unknown>)?.file_path).toBeDefined();
    });

    it('should configure CSV delimiter and header options', async () => {
      const config = {
        file_path: '/data/users.csv',
        delimiter: ';',
        has_header: true,
        skip_rows: 1,
        encoding: 'utf-8',
      };

      const { data, error } = await supabase
        .from('parameterized_tests')
        .insert({
          project_id: testProject.id,
          name: 'CSV with Custom Delimiter',
          data_source_type: 'csv',
          data_source_config: config,
          steps: [{ action: 'log', value: '{{field1}}' }],
          is_active: true,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect((data?.data_source_config as Record<string, unknown>)?.delimiter).toBe(';');
      expect((data?.data_source_config as Record<string, unknown>)?.has_header).toBe(true);
    });
  });

  describe('Create Parameterized Test with Other Data Sources', () => {
    it('should create a parameterized test with JSON file data source', async () => {
      const { data, error } = await supabase
        .from('parameterized_tests')
        .insert({
          project_id: testProject.id,
          name: 'JSON File Data Source Test',
          data_source_type: 'json',
          data_source_config: {
            file_path: '/data/test-data.json',
            json_path: '$.users[*]',
          },
          steps: [{ action: 'log', value: '{{name}}' }],
          is_active: true,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.data_source_type).toBe('json');
    });

    it('should create a parameterized test with API data source', async () => {
      const { data, error } = await supabase
        .from('parameterized_tests')
        .insert({
          project_id: testProject.id,
          name: 'API Data Source Test',
          data_source_type: 'api',
          data_source_config: {
            url: 'https://api.example.com/test-data',
            method: 'GET',
            headers: { 'Authorization': 'Bearer token' },
            json_path: '$.data[*]',
            refresh_interval_ms: 300000,
          },
          steps: [{ action: 'log', value: '{{item}}' }],
          is_active: true,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.data_source_type).toBe('api');
    });

    it('should create a parameterized test with database data source', async () => {
      const { data, error } = await supabase
        .from('parameterized_tests')
        .insert({
          project_id: testProject.id,
          name: 'Database Data Source Test',
          data_source_type: 'database',
          data_source_config: {
            connection_string: 'postgresql://test:test@localhost/testdb',
            query: 'SELECT username, email FROM test_users WHERE active = true',
          },
          steps: [{ action: 'fill', target: '#email', value: '{{email}}' }],
          is_active: true,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.data_source_type).toBe('database');
    });
  });

  describe('Parameter Sets (Expand Test)', () => {
    let parameterizedTest: { id: string } | null = null;

    beforeEach(async () => {
      const { data } = await supabase
        .from('parameterized_tests')
        .insert({
          project_id: testProject.id,
          name: 'Test with Parameter Sets',
          data_source_type: 'inline',
          data_source_config: { data: [] },
          steps: [
            { action: 'fill', target: '#email', value: '{{email}}' },
            { action: 'fill', target: '#password', value: '{{password}}' },
          ],
          is_active: true,
        })
        .select()
        .single();

      parameterizedTest = data;
    });

    it('should create individual parameter sets for a test', async () => {
      const parameterSets = [
        { name: 'Valid Admin User', values: { email: 'admin@test.com', password: 'admin123' } },
        { name: 'Valid Regular User', values: { email: 'user@test.com', password: 'user456' } },
        { name: 'Invalid Credentials', values: { email: 'wrong@test.com', password: 'invalid' } },
      ];

      for (let i = 0; i < parameterSets.length; i++) {
        const ps = parameterSets[i];
        const { data, error } = await supabase
          .from('parameter_sets')
          .insert({
            parameterized_test_id: parameterizedTest!.id,
            name: ps.name,
            values: ps.values,
            order_index: i,
            expected_outcome: i < 2 ? 'pass' : 'fail',
            source: 'manual',
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.name).toBe(ps.name);
        expect(data?.values).toEqual(ps.values);
      }
    });

    it('should list all parameter sets for a test', async () => {
      // First create some parameter sets
      await supabase.from('parameter_sets').insert([
        {
          parameterized_test_id: parameterizedTest!.id,
          name: 'Set 1',
          values: { email: 'test1@test.com', password: 'pass1' },
          order_index: 0,
        },
        {
          parameterized_test_id: parameterizedTest!.id,
          name: 'Set 2',
          values: { email: 'test2@test.com', password: 'pass2' },
          order_index: 1,
        },
      ]);

      const { data, error } = await supabase
        .from('parameter_sets')
        .select('*')
        .eq('parameterized_test_id', parameterizedTest!.id)
        .order('order_index', { ascending: true });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThanOrEqual(2);
    });

    it('should skip specific parameter sets', async () => {
      const { data, error } = await supabase
        .from('parameter_sets')
        .insert({
          parameterized_test_id: parameterizedTest!.id,
          name: 'Skipped Set',
          values: { email: 'skip@test.com', password: 'skip' },
          order_index: 0,
          skip: true,
          skip_reason: 'Known issue - skip until fixed',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.skip).toBe(true);
      expect(data?.skip_reason).toBe('Known issue - skip until fixed');
    });

    it('should mark parameter set to run only (exclusive)', async () => {
      const { data, error } = await supabase
        .from('parameter_sets')
        .insert({
          parameterized_test_id: parameterizedTest!.id,
          name: 'Only This Set',
          values: { email: 'only@test.com', password: 'only' },
          order_index: 0,
          run_only: true,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.run_only).toBe(true);
    });

    it('should categorize parameter sets with tags', async () => {
      const { data, error } = await supabase
        .from('parameter_sets')
        .insert({
          parameterized_test_id: parameterizedTest!.id,
          name: 'Tagged Set',
          values: { email: 'tagged@test.com', password: 'tagged' },
          order_index: 0,
          tags: ['smoke', 'regression', 'critical'],
          category: 'authentication',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.tags).toContain('smoke');
      expect(data?.category).toBe('authentication');
    });
  });

  describe('Run Parameterized Test', () => {
    let testToRun: { id: string } | null = null;

    beforeEach(async () => {
      // Create a parameterized test with parameter sets
      const { data: test } = await supabase
        .from('parameterized_tests')
        .insert({
          project_id: testProject.id,
          name: 'Test to Run',
          data_source_type: 'inline',
          data_source_config: {
            data: [
              { email: 'user1@test.com', password: 'pass1' },
              { email: 'user2@test.com', password: 'pass2' },
            ],
          },
          steps: [
            { action: 'goto', target: '/login' },
            { action: 'fill', target: '#email', value: '{{email}}' },
            { action: 'fill', target: '#password', value: '{{password}}' },
            { action: 'click', target: 'button[type=submit]' },
          ],
          iteration_mode: 'sequential',
          is_active: true,
        })
        .select()
        .single();

      testToRun = test;

      // Create parameter sets
      await supabase.from('parameter_sets').insert([
        {
          parameterized_test_id: test!.id,
          name: 'User 1',
          values: { email: 'user1@test.com', password: 'pass1' },
          order_index: 0,
        },
        {
          parameterized_test_id: test!.id,
          name: 'User 2',
          values: { email: 'user2@test.com', password: 'pass2' },
          order_index: 1,
        },
      ]);
    });

    it('should create a parameterized result record when test starts', async () => {
      const { data, error } = await supabase
        .from('parameterized_results')
        .insert({
          parameterized_test_id: testToRun!.id,
          total_iterations: 2,
          status: 'running',
          iteration_mode: 'sequential',
          environment: 'staging',
          browser: 'chromium',
          app_url: 'https://test.example.com',
          triggered_by: 'manual',
          trigger_type: 'manual',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.status).toBe('running');
      expect(data?.total_iterations).toBe(2);
    });

    it('should record individual iteration results', async () => {
      // Create a result
      const { data: result } = await supabase
        .from('parameterized_results')
        .insert({
          parameterized_test_id: testToRun!.id,
          total_iterations: 2,
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Record iteration results
      const iterationResults = [
        { index: 0, status: 'passed', duration_ms: 1500 },
        { index: 1, status: 'failed', duration_ms: 2000, error: 'Element not found' },
      ];

      for (const iter of iterationResults) {
        const { data, error } = await supabase
          .from('iteration_results')
          .insert({
            parameterized_result_id: result!.id,
            iteration_index: iter.index,
            parameter_values: { email: `user${iter.index + 1}@test.com`, password: `pass${iter.index + 1}` },
            status: iter.status,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            duration_ms: iter.duration_ms,
            error_message: iter.error || null,
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.status).toBe(iter.status);
      }
    });

    it('should update parameterized result with final statistics', async () => {
      const { data: result } = await supabase
        .from('parameterized_results')
        .insert({
          parameterized_test_id: testToRun!.id,
          total_iterations: 5,
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Complete the test
      const { data, error } = await supabase
        .from('parameterized_results')
        .update({
          status: 'passed',
          passed: 4,
          failed: 1,
          skipped: 0,
          error: 0,
          duration_ms: 15000,
          avg_iteration_ms: 3000,
          min_iteration_ms: 2000,
          max_iteration_ms: 4000,
          completed_at: new Date().toISOString(),
        })
        .eq('id', result!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.status).toBe('passed');
      expect(data?.passed).toBe(4);
      expect(data?.failed).toBe(1);
      expect(data?.avg_iteration_ms).toBe(3000);
    });

    it('should update last_run_at and last_run_status on test', async () => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('parameterized_tests')
        .update({
          last_run_at: now,
          last_run_status: 'passed',
        })
        .eq('id', testToRun!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.last_run_at).toBeDefined();
      expect(data?.last_run_status).toBe('passed');
    });
  });

  describe('View Iteration Results', () => {
    let resultWithIterations: { id: string } | null = null;

    beforeEach(async () => {
      // Create a test
      const { data: test } = await supabase
        .from('parameterized_tests')
        .insert({
          project_id: testProject.id,
          name: 'Test with Iterations',
          data_source_type: 'inline',
          data_source_config: { data: [] },
          steps: [],
          is_active: true,
        })
        .select()
        .single();

      // Create a result with iterations
      const { data: result } = await supabase
        .from('parameterized_results')
        .insert({
          parameterized_test_id: test!.id,
          total_iterations: 5,
          passed: 3,
          failed: 2,
          status: 'failed',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      resultWithIterations = result;

      // Create iteration results
      const statuses = ['passed', 'passed', 'failed', 'passed', 'failed'];
      for (let i = 0; i < statuses.length; i++) {
        await supabase.from('iteration_results').insert({
          parameterized_result_id: result!.id,
          iteration_index: i,
          parameter_values: { index: i },
          status: statuses[i],
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          duration_ms: 1000 + i * 200,
          error_message: statuses[i] === 'failed' ? 'Assertion failed' : null,
        });
      }
    });

    it('should list all iteration results for a parameterized run', async () => {
      const { data, error } = await supabase
        .from('iteration_results')
        .select('*')
        .eq('parameterized_result_id', resultWithIterations!.id)
        .order('iteration_index', { ascending: true });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBe(5);
    });

    it('should filter iterations by status', async () => {
      const { data: failedIterations, error } = await supabase
        .from('iteration_results')
        .select('*')
        .eq('parameterized_result_id', resultWithIterations!.id)
        .eq('status', 'failed');

      expect(error).toBeNull();
      expect(failedIterations?.length).toBe(2);
      failedIterations?.forEach((iter) => {
        expect(iter.status).toBe('failed');
        expect(iter.error_message).toBeDefined();
      });
    });

    it('should include step results in iteration', async () => {
      const stepResults = [
        { step_index: 0, action: 'goto', status: 'passed', duration_ms: 200 },
        { step_index: 1, action: 'fill', status: 'passed', duration_ms: 100 },
        { step_index: 2, action: 'click', status: 'failed', duration_ms: 50, error: 'Element not found' },
      ];

      const { data, error } = await supabase
        .from('iteration_results')
        .insert({
          parameterized_result_id: resultWithIterations!.id,
          iteration_index: 99,
          parameter_values: { test: 'step_results' },
          status: 'failed',
          step_results: stepResults,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.step_results).toHaveLength(3);
    });

    it('should track assertion results per iteration', async () => {
      const assertionDetails = [
        { assertion: 'expect(title).toBe("Dashboard")', passed: true },
        { assertion: 'expect(url).toContain("/home")', passed: true },
        { assertion: 'expect(button).toBeVisible()', passed: false, error: 'Element hidden' },
      ];

      const { data, error } = await supabase
        .from('iteration_results')
        .insert({
          parameterized_result_id: resultWithIterations!.id,
          iteration_index: 100,
          parameter_values: { test: 'assertions' },
          status: 'failed',
          assertions_passed: 2,
          assertions_failed: 1,
          assertion_details: assertionDetails,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.assertions_passed).toBe(2);
      expect(data?.assertions_failed).toBe(1);
      expect(data?.assertion_details).toHaveLength(3);
    });

    it('should include error screenshots for failed iterations', async () => {
      const { data, error } = await supabase
        .from('iteration_results')
        .insert({
          parameterized_result_id: resultWithIterations!.id,
          iteration_index: 101,
          parameter_values: { test: 'screenshot' },
          status: 'failed',
          error_message: 'Button not clickable',
          error_screenshot_url: 'https://storage.example.com/screenshots/error-12345.png',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.error_screenshot_url).toContain('screenshots');
    });

    it('should track retry attempts', async () => {
      // Original failed iteration
      const { data: original } = await supabase
        .from('iteration_results')
        .insert({
          parameterized_result_id: resultWithIterations!.id,
          iteration_index: 102,
          parameter_values: { test: 'retry' },
          status: 'failed',
          retry_count: 0,
          is_retry: false,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Retry attempt that succeeds
      const { data: retry, error } = await supabase
        .from('iteration_results')
        .insert({
          parameterized_result_id: resultWithIterations!.id,
          iteration_index: 102,
          parameter_values: { test: 'retry' },
          status: 'passed',
          retry_count: 1,
          is_retry: true,
          original_iteration_id: original!.id,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(retry?.is_retry).toBe(true);
      expect(retry?.original_iteration_id).toBe(original!.id);
      expect(retry?.retry_count).toBe(1);
    });
  });

  describe('List and Filter Parameterized Tests', () => {
    beforeEach(async () => {
      // Create multiple parameterized tests
      const tests = [
        { name: 'Auth Test 1', tags: ['auth', 'smoke'], priority: 'critical' },
        { name: 'Auth Test 2', tags: ['auth', 'regression'], priority: 'high' },
        { name: 'Product Test', tags: ['products', 'smoke'], priority: 'medium' },
        { name: 'Inactive Test', tags: ['deprecated'], priority: 'low', is_active: false },
      ];

      for (const test of tests) {
        await supabase.from('parameterized_tests').insert({
          project_id: testProject.id,
          name: test.name,
          tags: test.tags,
          priority: test.priority,
          data_source_type: 'inline',
          data_source_config: { data: [] },
          steps: [],
          is_active: test.is_active ?? true,
        });
      }
    });

    it('should list all active parameterized tests', async () => {
      const { data, error } = await supabase
        .from('parameterized_tests')
        .select('*')
        .eq('project_id', testProject.id)
        .eq('is_active', true);

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(3);
      data?.forEach((test) => {
        expect(test.is_active).toBe(true);
      });
    });

    it('should filter by tags', async () => {
      const { data, error } = await supabase
        .from('parameterized_tests')
        .select('*')
        .eq('project_id', testProject.id)
        .contains('tags', ['auth']);

      expect(error).toBeNull();
      data?.forEach((test) => {
        expect(test.tags).toContain('auth');
      });
    });

    it('should filter by priority', async () => {
      const { data, error } = await supabase
        .from('parameterized_tests')
        .select('*')
        .eq('project_id', testProject.id)
        .eq('priority', 'critical');

      expect(error).toBeNull();
      data?.forEach((test) => {
        expect(test.priority).toBe('critical');
      });
    });

    it('should search by name', async () => {
      const { data, error } = await supabase
        .from('parameterized_tests')
        .select('*')
        .eq('project_id', testProject.id)
        .ilike('name', '%Auth%');

      expect(error).toBeNull();
      data?.forEach((test) => {
        expect(test.name.toLowerCase()).toContain('auth');
      });
    });
  });
});
