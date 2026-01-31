'use client';

/**
 * Test Library Hooks - Migrated to Backend API
 *
 * This module uses the FastAPI backend for all CRUD operations,
 * replacing direct Supabase queries.
 *
 * Migration: Tests Library Domain
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProjects } from './use-projects';
import {
  testsApi,
  type Test as ApiTest,
  type CreateTestRequest,
  type UpdateTestRequest,
} from '@/lib/api-client';

// ============================================
// Types for Test Library
// ============================================

export interface SavedTestData {
  name: string;
  description?: string;
  steps: Array<{ action: string; target?: string; value?: string; description?: string }>;
  assertions?: Array<{ type: string; expected: string; description?: string }>;
  tags?: string[];
  priority?: 'critical' | 'high' | 'medium' | 'low';
  app_url?: string;
}

export interface TestLibraryStats {
  totalTests: number;
  byPriority: Record<string, number>;
  bySource: Record<string, number>;
  recentTests: number;
}

// Legacy type for backward compatibility (snake_case)
export interface LegacyTest {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  steps: Array<{ instruction?: string; action?: string; target?: string; value?: string; order?: number }>;
  tags: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  is_active: boolean;
  source: 'manual' | 'discovered' | 'generated' | 'imported';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Transform Functions
// ============================================

/**
 * Transform API test response (camelCase) to legacy format (snake_case)
 */
function transformToLegacyTest(test: ApiTest): LegacyTest {
  return {
    id: test.id,
    project_id: test.projectId,
    name: test.name,
    description: test.description,
    steps: test.steps?.map((step, index) => ({
      instruction: step.description || `${step.action}${step.target ? ` on ${step.target}` : ''}${step.value ? ` with "${step.value}"` : ''}`,
      action: step.action,
      target: step.target,
      value: step.value,
      order: index + 1,
    })) || [],
    tags: test.tags || [],
    priority: test.priority,
    is_active: test.isActive,
    source: test.source,
    created_by: test.createdBy,
    created_at: test.createdAt,
    updated_at: test.updatedAt || test.createdAt,
  };
}

/**
 * Transform SavedTestData to API CreateTestRequest
 */
function transformToCreateRequest(
  projectId: string,
  testData: SavedTestData,
  createdBy?: string | null
): CreateTestRequest {
  return {
    projectId,
    name: testData.name,
    description: testData.description || `Test with ${testData.steps.length} steps`,
    steps: testData.steps.map((step) => ({
      action: step.action,
      target: step.target,
      value: step.value,
      description: step.description || `${step.action}${step.target ? ` on ${step.target}` : ''}${step.value ? ` with "${step.value}"` : ''}`,
    })),
    tags: testData.tags || [],
    priority: testData.priority || 'medium',
    source: 'generated',
    isActive: true,
  };
}

// ============================================
// Fetch all library tests for current projects
// ============================================

export function useTestLibrary(projectId?: string | null) {
  const { data: projects = [] } = useProjects();

  // Use provided projectId or fall back to first project
  const effectiveProjectId = projectId || projects[0]?.id;

  return useQuery({
    queryKey: ['test-library', effectiveProjectId],
    queryFn: async () => {
      if (!effectiveProjectId) return [];

      const response = await testsApi.list({
        projectId: effectiveProjectId,
        isActive: true,
        limit: 500,
      });

      // Transform to legacy format for backward compatibility
      return response.tests.map((test) => ({
        id: test.id,
        project_id: test.projectId,
        name: test.name,
        description: test.description,
        // Note: list endpoint returns stepCount, not full steps
        // Full steps are only available via get endpoint
        steps: [] as Array<{ instruction?: string; action?: string; target?: string; value?: string; order?: number }>,
        tags: test.tags,
        priority: test.priority,
        is_active: test.isActive,
        source: test.source,
        created_by: null as string | null,
        created_at: test.createdAt,
        updated_at: test.createdAt,
      })) as LegacyTest[];
    },
    enabled: !!effectiveProjectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    placeholderData: [],
  });
}

// ============================================
// Get test library stats
// ============================================

export function useTestLibraryStats(projectId?: string | null) {
  const { data: tests = [], isLoading } = useTestLibrary(projectId);

  const stats: TestLibraryStats = {
    totalTests: tests.length,
    byPriority: tests.reduce((acc, test) => {
      acc[test.priority] = (acc[test.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    bySource: tests.reduce((acc, test) => {
      acc[test.source] = (acc[test.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    recentTests: tests.filter(t => {
      const createdAt = new Date(t.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return createdAt >= weekAgo;
    }).length,
  };

  return { stats, isLoading };
}

// ============================================
// Save a test to the library
// ============================================

export function useSaveToLibrary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      testData,
      createdBy,
    }: {
      projectId: string;
      testData: SavedTestData;
      createdBy?: string | null;
    }) => {
      const createRequest = transformToCreateRequest(projectId, testData, createdBy);
      const response = await testsApi.create(createRequest);
      return transformToLegacyTest(response);
    },
    onSuccess: (data) => {
      // Invalidate both test-library and tests queries
      queryClient.invalidateQueries({ queryKey: ['test-library', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tests', data.project_id] });
    },
  });
}

// ============================================
// Update a test in the library
// ============================================

export function useUpdateLibraryTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<SavedTestData>;
    }) => {
      const updateData: UpdateTestRequest = {};

      if (updates.name) {
        updateData.name = updates.name;
      }
      if (updates.description !== undefined) {
        updateData.description = updates.description;
      }
      if (updates.tags) {
        updateData.tags = updates.tags;
      }
      if (updates.priority) {
        updateData.priority = updates.priority;
      }
      if (updates.steps) {
        updateData.steps = updates.steps.map((step) => ({
          action: step.action,
          target: step.target,
          value: step.value,
          description: step.description || `${step.action}${step.target ? ` on ${step.target}` : ''}${step.value ? ` with "${step.value}"` : ''}`,
        }));
      }

      const response = await testsApi.update(id, updateData);
      return transformToLegacyTest(response);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-library', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tests', data.project_id] });
    },
  });
}

// ============================================
// Delete a test from the library (soft delete)
// ============================================

export function useDeleteLibraryTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ testId, projectId }: { testId: string; projectId: string }) => {
      // Soft delete by setting is_active to false via API
      await testsApi.update(testId, { isActive: false });
      return { testId, projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['test-library', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tests', projectId] });
    },
  });
}

// ============================================
// Duplicate a test in the library
// ============================================

export function useDuplicateLibraryTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ test, newName }: { test: { id: string }; newName?: string }) => {
      // First, get the full test data to get steps
      const fullTest = await testsApi.get(test.id);

      // Create a new test with the duplicated data
      const createRequest: CreateTestRequest = {
        projectId: fullTest.projectId,
        name: newName || `${fullTest.name} (Copy)`,
        description: fullTest.description || undefined,
        steps: fullTest.steps?.map((step) => ({
          action: step.action,
          target: step.target,
          value: step.value,
          description: step.description,
        })),
        tags: fullTest.tags,
        priority: fullTest.priority,
        source: fullTest.source,
        isActive: true,
      };

      const response = await testsApi.create(createRequest);
      return transformToLegacyTest(response);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-library', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tests', data.project_id] });
    },
  });
}

// ============================================
// Get a single test by ID
// ============================================

export function useLibraryTest(testId: string | null) {
  return useQuery({
    queryKey: ['library-test', testId],
    queryFn: async () => {
      if (!testId) return null;

      const response = await testsApi.get(testId);
      return transformToLegacyTest(response);
    },
    enabled: !!testId,
  });
}

// ============================================
// Search tests in the library
// ============================================

export function useSearchLibraryTests(projectId: string | null, searchQuery: string) {
  return useQuery({
    queryKey: ['test-library-search', projectId, searchQuery],
    queryFn: async () => {
      if (!projectId || !searchQuery) return [];

      const response = await testsApi.list({
        projectId,
        isActive: true,
        search: searchQuery,
        limit: 20,
      });

      // Transform to legacy format for backward compatibility
      return response.tests.map((test) => ({
        id: test.id,
        project_id: test.projectId,
        name: test.name,
        description: test.description,
        steps: [] as Array<{ instruction?: string; action?: string; target?: string; value?: string; order?: number }>,
        tags: test.tags,
        priority: test.priority,
        is_active: test.isActive,
        source: test.source,
        created_by: null as string | null,
        created_at: test.createdAt,
        updated_at: test.createdAt,
      })) as LegacyTest[];
    },
    enabled: !!projectId && searchQuery.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================
// Get tests by tag
// ============================================

export function useTestsByTag(projectId: string | null, tag: string) {
  return useQuery({
    queryKey: ['test-library-by-tag', projectId, tag],
    queryFn: async () => {
      if (!projectId || !tag) return [];

      const response = await testsApi.list({
        projectId,
        isActive: true,
        tags: tag,
        limit: 500,
      });

      // Transform to legacy format for backward compatibility
      return response.tests.map((test) => ({
        id: test.id,
        project_id: test.projectId,
        name: test.name,
        description: test.description,
        steps: [] as Array<{ instruction?: string; action?: string; target?: string; value?: string; order?: number }>,
        tags: test.tags,
        priority: test.priority,
        is_active: test.isActive,
        source: test.source,
        created_by: null as string | null,
        created_at: test.createdAt,
        updated_at: test.createdAt,
      })) as LegacyTest[];
    },
    enabled: !!projectId && !!tag,
  });
}

// ============================================
// Get all unique tags from tests
// ============================================

export function useTestTags(projectId: string | null) {
  const { data: tests = [] } = useTestLibrary(projectId);

  const tags = Array.from(
    new Set(tests.flatMap(test => test.tags || []))
  ).sort();

  return tags;
}
