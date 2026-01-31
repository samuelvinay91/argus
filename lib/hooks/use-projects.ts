'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { projectsApi } from '@/lib/api-client';
import type { Project, Json } from '@/lib/supabase/types';

/**
 * Extended Project type that includes backend API fields not in Supabase types
 * The backend returns additional computed/enriched fields
 */
export interface ExtendedProject extends Project {
  organization_id?: string;
  codebase_path?: string | null;
  repository_url?: string | null;
  is_active?: boolean;
  test_count?: number;
  last_run_at?: string | null;
}

/**
 * Transform API project response to legacy Supabase format
 * The API returns camelCase, but existing components expect snake_case
 */
function transformProjectToLegacy(project: {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  appUrl: string | null;
  codebasePath?: string | null;
  repositoryUrl?: string | null;
  settings?: Record<string, unknown> | null;
  isActive: boolean;
  testCount: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt?: string | null;
}): ExtendedProject {
  return {
    id: project.id,
    user_id: '', // Backend handles auth via organization
    name: project.name,
    slug: project.name.toLowerCase().replace(/\s+/g, '-'), // Generate slug from name
    app_url: project.appUrl ?? '',
    description: project.description,
    settings: (project.settings ?? {}) as Json,
    created_at: project.createdAt,
    updated_at: project.updatedAt ?? project.createdAt,
    // Extended fields from backend API
    organization_id: project.organizationId,
    codebase_path: project.codebasePath ?? null,
    repository_url: project.repositoryUrl ?? null,
    is_active: project.isActive,
    test_count: project.testCount,
    last_run_at: project.lastRunAt,
  };
}

/**
 * Fetch projects via backend API (organization-based access control)
 * This uses the same logic as MCP server, ensuring data consistency.
 */
export function useProjects() {
  const { user, isLoaded } = useUser();

  return useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Use backend API which handles organization-based filtering
      const projects = await projectsApi.list();
      return projects.map(transformProjectToLegacy);
    },
    enabled: isLoaded && !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - projects rarely change
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    placeholderData: [], // Prevent loading state flash
  });
}

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const project = await projectsApi.get(projectId);
      return transformProjectToLegacy(project);
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

/**
 * Input type for creating a project
 * Accepts snake_case fields for backward compatibility with existing forms
 */
interface CreateProjectInput {
  name: string;
  description?: string | null;
  app_url?: string;
  codebase_path?: string | null;
  repository_url?: string | null;
  settings?: Record<string, unknown> | null;
}

export function useCreateProject() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: CreateProjectInput) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Use backend API which handles organization assignment
      const created = await projectsApi.create({
        name: project.name,
        description: project.description,
        appUrl: project.app_url,
        codebasePath: project.codebase_path,
        repositoryUrl: project.repository_url,
        settings: project.settings,
      });
      return transformProjectToLegacy(created);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/**
 * Input type for updating a project
 * Accepts snake_case fields for backward compatibility
 */
interface UpdateProjectInput {
  id: string;
  name?: string;
  description?: string | null;
  app_url?: string;
  codebase_path?: string | null;
  repository_url?: string | null;
  settings?: Record<string, unknown> | null;
  is_active?: boolean;
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateProjectInput) => {
      // Convert snake_case updates to camelCase for API
      const updated = await projectsApi.update(id, {
        name: updates.name,
        description: updates.description,
        appUrl: updates.app_url,
        codebasePath: updates.codebase_path,
        repositoryUrl: updates.repository_url,
        settings: updates.settings,
        isActive: updates.is_active,
      });
      return transformProjectToLegacy(updated);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      await projectsApi.delete(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
