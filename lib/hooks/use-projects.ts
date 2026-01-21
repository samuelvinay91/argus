'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { getSupabaseClient } from '@/lib/supabase/client';
import { apiClient, projectsApi } from '@/lib/api-client';
import { useFeatureFlags } from '@/lib/feature-flags';
import type { Project, InsertTables } from '@/lib/supabase/types';

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
      // This matches how MCP server fetches projects
      const projects = await apiClient.get<Project[]>('/api/v1/projects');
      return projects;
    },
    enabled: isLoaded && !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - projects rarely change
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    placeholderData: [], // Prevent loading state flash
  });
}

export function useProject(projectId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: Omit<InsertTables<'projects'>, 'user_id'>) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Use backend API which handles organization assignment
      const created = await apiClient.post<Project>('/api/v1/projects', project);
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const flags = useFeatureFlags();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Project>) => {
      if (flags.useBackendApi('projects')) {
        // NEW: Use backend API
        return projectsApi.update(id, updates) as Promise<Project>;
      }

      // LEGACY: Direct Supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('projects') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.id] });
    },
  });
}

export function useDeleteProject() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const flags = useFeatureFlags();

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (flags.useBackendApi('projects')) {
        // NEW: Use backend API
        await projectsApi.delete(projectId);
        return;
      }

      // LEGACY: Direct Supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('projects') as any)
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
