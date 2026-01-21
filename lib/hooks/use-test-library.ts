'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useProjects } from './use-projects';
import type { Test, InsertTables } from '@/lib/supabase/types';
import { useFeatureFlags } from '@/lib/feature-flags';
import { testsApi } from '@/lib/api-client';

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

// ============================================
// Fetch all library tests for current projects
// ============================================

export function useTestLibrary(projectId?: string | null) {
  const supabase = getSupabaseClient();
  const { data: projects = [] } = useProjects();

  // Use provided projectId or fall back to first project
  const effectiveProjectId = projectId || projects[0]?.id;

  return useQuery({
    queryKey: ['test-library', effectiveProjectId],
    queryFn: async () => {
      if (!effectiveProjectId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('tests') as any)
        .select('*')
        .eq('project_id', effectiveProjectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Test[];
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
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const flags = useFeatureFlags();

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
      // Convert test steps to the format expected by the database
      const steps = testData.steps.map((step, index) => ({
        instruction: step.description || `${step.action}${step.target ? ` on ${step.target}` : ''}${step.value ? ` with "${step.value}"` : ''}`,
        action: step.action,
        target: step.target,
        value: step.value,
        order: index + 1,
      }));

      if (flags.useBackendApi('tests')) {
        // NEW: Use backend API
        const result = await testsApi.create({
          projectId,
          name: testData.name,
          description: testData.description || `Test with ${steps.length} steps`,
          steps: steps,
          tags: testData.tags || [],
          priority: testData.priority || 'medium',
          source: 'generated',
        });
        return result as Test;
      }

      // LEGACY: Direct Supabase
      const insertData: InsertTables<'tests'> = {
        project_id: projectId,
        name: testData.name,
        description: testData.description || `Test with ${steps.length} steps`,
        steps: steps,
        tags: testData.tags || [],
        priority: testData.priority || 'medium',
        source: 'generated',
        is_active: true,
        created_by: createdBy || null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('tests') as any)
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as Test;
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
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const flags = useFeatureFlags();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<SavedTestData>;
    }) => {
      const updateData: Partial<Test> = {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.tags && { tags: updates.tags }),
        ...(updates.priority && { priority: updates.priority }),
        ...(updates.steps && {
          steps: updates.steps.map((step, index) => ({
            instruction: step.description || `${step.action}${step.target ? ` on ${step.target}` : ''}${step.value ? ` with "${step.value}"` : ''}`,
            action: step.action,
            target: step.target,
            value: step.value,
            order: index + 1,
          })),
        }),
        updated_at: new Date().toISOString(),
      };

      if (flags.useBackendApi('tests')) {
        // NEW: Use backend API
        const result = await testsApi.update(id, updateData as Record<string, unknown>);
        return result as Test;
      }

      // LEGACY: Direct Supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('tests') as any)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Test;
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
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const flags = useFeatureFlags();

  return useMutation({
    mutationFn: async ({ testId, projectId }: { testId: string; projectId: string }) => {
      if (flags.useBackendApi('tests')) {
        // NEW: Use backend API (soft delete via API)
        await testsApi.delete(testId);
        return { testId, projectId };
      }

      // LEGACY: Direct Supabase - Soft delete by setting is_active to false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('tests') as any)
        .update({ is_active: false })
        .eq('id', testId);

      if (error) throw error;
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
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const flags = useFeatureFlags();

  return useMutation({
    mutationFn: async ({ test, newName }: { test: Test; newName?: string }) => {
      if (flags.useBackendApi('tests')) {
        // NEW: Use backend API
        const result = await testsApi.create({
          projectId: test.project_id,
          name: newName || `${test.name} (Copy)`,
          description: test.description || undefined,
          steps: test.steps as unknown[] | undefined,
          tags: test.tags || undefined,
          priority: test.priority || undefined,
          source: test.source || undefined,
        });
        return result as Test;
      }

      // LEGACY: Direct Supabase
      const insertData: InsertTables<'tests'> = {
        project_id: test.project_id,
        name: newName || `${test.name} (Copy)`,
        description: test.description,
        steps: test.steps,
        tags: test.tags,
        priority: test.priority,
        source: test.source,
        is_active: true,
        created_by: test.created_by,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('tests') as any)
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as Test;
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
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['library-test', testId],
    queryFn: async () => {
      if (!testId) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('tests') as any)
        .select('*')
        .eq('id', testId)
        .single();

      if (error) throw error;
      return data as Test;
    },
    enabled: !!testId,
  });
}

// ============================================
// Search tests in the library
// ============================================

export function useSearchLibraryTests(projectId: string | null, searchQuery: string) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['test-library-search', projectId, searchQuery],
    queryFn: async () => {
      if (!projectId || !searchQuery) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('tests') as any)
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Test[];
    },
    enabled: !!projectId && searchQuery.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================
// Get tests by tag
// ============================================

export function useTestsByTag(projectId: string | null, tag: string) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['test-library-by-tag', projectId, tag],
    queryFn: async () => {
      if (!projectId || !tag) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('tests') as any)
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .contains('tags', [tag])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Test[];
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
