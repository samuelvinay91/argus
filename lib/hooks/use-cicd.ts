'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { BACKEND_URL } from '@/lib/config/api-endpoints';
import type { Json } from '@/lib/supabase/types';

// ============================================
// TYPES
// ============================================

export type PipelineStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'skipped';
export type PipelineProvider = 'github' | 'gitlab' | 'jenkins' | 'circleci' | 'bitbucket' | 'azure';

export interface Pipeline {
  id: string;
  project_id: string;
  provider: PipelineProvider;
  name: string;
  branch: string;
  status: PipelineStatus;
  commit_sha: string;
  commit_message: string | null;
  commit_author: string | null;
  trigger: 'push' | 'pull_request' | 'schedule' | 'manual' | 'webhook';
  workflow_name: string | null;
  workflow_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  stages: PipelineStage[];
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  name: string;
  status: PipelineStatus;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  jobs: PipelineJob[];
}

export interface PipelineJob {
  name: string;
  status: PipelineStatus;
  runner: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  logs_url: string | null;
}

export interface Build {
  id: string;
  project_id: string;
  pipeline_id: string | null;
  provider: PipelineProvider;
  build_number: number;
  name: string;
  branch: string;
  status: PipelineStatus;
  commit_sha: string;
  commit_message: string | null;
  commit_author: string | null;
  tests_total: number;
  tests_passed: number;
  tests_failed: number;
  tests_skipped: number;
  coverage_percent: number | null;
  artifact_urls: string[];
  logs_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  metadata: Json;
  created_at: string;
}

export interface Deployment {
  id: string;
  project_id: string;
  build_id: string | null;
  environment: 'development' | 'staging' | 'production' | 'preview';
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back';
  version: string | null;
  commit_sha: string | null;
  deployed_by: string | null;
  deployment_url: string | null;
  preview_url: string | null;
  risk_score: number | null;
  risk_factors: RiskFactor[];
  health_check_status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  rollback_available: boolean;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  metadata: Json;
  created_at: string;
}

export interface RiskFactor {
  category: 'test_coverage' | 'flaky_tests' | 'change_size' | 'time_since_deploy' | 'error_rate' | 'dependencies';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  score: number;
}

export interface TestImpactAnalysis {
  id: string;
  project_id: string;
  commit_sha: string;
  branch: string;
  base_sha: string | null;
  changed_files: ChangedFile[];
  impacted_tests: ImpactedTest[];
  total_files_changed: number;
  total_tests_impacted: number;
  recommended_tests: string[];
  skip_candidates: string[];
  confidence_score: number;
  analysis_time_ms: number;
  created_at: string;
}

export interface ChangedFile {
  path: string;
  change_type: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  impact_score: number;
}

export interface ImpactedTest {
  test_id: string;
  test_name: string;
  impact_reason: string;
  confidence: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface CICDStats {
  total_pipelines: number;
  pipelines_last_24h: number;
  success_rate: number;
  avg_pipeline_duration_ms: number;
  total_builds: number;
  builds_last_24h: number;
  build_success_rate: number;
  avg_build_duration_ms: number;
  total_deployments: number;
  deployments_last_24h: number;
  deployment_success_rate: number;
  avg_deployment_duration_ms: number;
  current_risk_score: number;
  tests_impacted_by_recent_changes: number;
}

// ============================================
// PIPELINES
// ============================================

export function usePipelines(projectId: string | null, options?: {
  branch?: string;
  status?: PipelineStatus;
  limit?: number;
}) {
  const supabase = getSupabaseClient();
  const limit = options?.limit || 50;

  return useQuery({
    queryKey: ['pipelines', projectId, options],
    queryFn: async () => {
      if (!projectId) return [];

      // Try to fetch from backend API (which integrates with GitHub/GitLab)
      try {
        const params = new URLSearchParams({
          project_id: projectId,
          limit: limit.toString(),
        });
        if (options?.branch) params.append('branch', options.branch);
        if (options?.status) params.append('status', options.status);

        const response = await fetch(`${BACKEND_URL}/api/v1/cicd/pipelines?${params}`);
        if (response.ok) {
          const data = await response.json();
          return data.pipelines as Pipeline[];
        }
      } catch (error) {
        console.warn('Backend API not available, falling back to Supabase:', error);
      }

      // Fallback to Supabase (for cached/webhook data)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from('ci_pipelines') as any)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (options?.branch) {
        query = query.eq('branch', options.branch);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Supabase query error:', error);
        return [];
      }
      return (data || []) as Pipeline[];
    },
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30 seconds - pipelines update frequently
    gcTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}

export function usePipeline(pipelineId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['pipeline', pipelineId],
    queryFn: async () => {
      if (!pipelineId) return null;

      try {
        const response = await fetch(`${BACKEND_URL}/api/v1/cicd/pipelines/${pipelineId}`);
        if (response.ok) {
          return await response.json() as Pipeline;
        }
      } catch (error) {
        console.warn('Backend API not available:', error);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('ci_pipelines') as any)
        .select('*')
        .eq('id', pipelineId)
        .single();

      if (error) return null;
      return data as Pipeline;
    },
    enabled: !!pipelineId,
  });
}

// Real-time subscription for pipelines
export function usePipelineSubscription(projectId: string | null) {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`pipelines-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ci_pipelines',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pipelines', projectId] });
          queryClient.invalidateQueries({ queryKey: ['cicd-stats', projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient, supabase]);
}

// ============================================
// BUILD HISTORY
// ============================================

export function useBuildHistory(projectId: string | null, options?: {
  branch?: string;
  status?: PipelineStatus;
  limit?: number;
}) {
  const supabase = getSupabaseClient();
  const limit = options?.limit || 50;

  return useQuery({
    queryKey: ['build-history', projectId, options],
    queryFn: async () => {
      if (!projectId) return [];

      try {
        const params = new URLSearchParams({
          project_id: projectId,
          limit: limit.toString(),
        });
        if (options?.branch) params.append('branch', options.branch);
        if (options?.status) params.append('status', options.status);

        const response = await fetch(`${BACKEND_URL}/api/v1/cicd/builds?${params}`);
        if (response.ok) {
          const data = await response.json();
          return data.builds as Build[];
        }
      } catch (error) {
        console.warn('Backend API not available:', error);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from('ci_builds') as any)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (options?.branch) {
        query = query.eq('branch', options.branch);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Supabase query error:', error);
        return [];
      }
      return (data || []) as Build[];
    },
    enabled: !!projectId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}

export function useBuild(buildId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['build', buildId],
    queryFn: async () => {
      if (!buildId) return null;

      try {
        const response = await fetch(`${BACKEND_URL}/api/v1/cicd/builds/${buildId}`);
        if (response.ok) {
          return await response.json() as Build;
        }
      } catch (error) {
        console.warn('Backend API not available:', error);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('ci_builds') as any)
        .select('*')
        .eq('id', buildId)
        .single();

      if (error) return null;
      return data as Build;
    },
    enabled: !!buildId,
  });
}

// ============================================
// DEPLOYMENTS
// ============================================

export function useDeployments(projectId: string | null, options?: {
  environment?: string;
  status?: string;
  limit?: number;
}) {
  const supabase = getSupabaseClient();
  const limit = options?.limit || 50;

  return useQuery({
    queryKey: ['deployments', projectId, options],
    queryFn: async () => {
      if (!projectId) return [];

      try {
        const params = new URLSearchParams({
          project_id: projectId,
          limit: limit.toString(),
        });
        if (options?.environment) params.append('environment', options.environment);
        if (options?.status) params.append('status', options.status);

        const response = await fetch(`${BACKEND_URL}/api/v1/cicd/deployments?${params}`);
        if (response.ok) {
          const data = await response.json();
          return data.deployments as Deployment[];
        }
      } catch (error) {
        console.warn('Backend API not available:', error);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from('ci_deployments') as any)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (options?.environment) {
        query = query.eq('environment', options.environment);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Supabase query error:', error);
        return [];
      }
      return (data || []) as Deployment[];
    },
    enabled: !!projectId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}

export function useDeployment(deploymentId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['deployment', deploymentId],
    queryFn: async () => {
      if (!deploymentId) return null;

      try {
        const response = await fetch(`${BACKEND_URL}/api/v1/cicd/deployments/${deploymentId}`);
        if (response.ok) {
          return await response.json() as Deployment;
        }
      } catch (error) {
        console.warn('Backend API not available:', error);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('ci_deployments') as any)
        .select('*')
        .eq('id', deploymentId)
        .single();

      if (error) return null;
      return data as Deployment;
    },
    enabled: !!deploymentId,
  });
}

// Real-time subscription for deployments
export function useDeploymentSubscription(projectId: string | null) {
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`deployments-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ci_deployments',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['deployments', projectId] });
          queryClient.invalidateQueries({ queryKey: ['cicd-stats', projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient, supabase]);
}

// ============================================
// TEST IMPACT ANALYSIS
// ============================================

export function useTestImpact(projectId: string | null, commitSha?: string) {
  return useQuery({
    queryKey: ['test-impact', projectId, commitSha],
    queryFn: async () => {
      if (!projectId) return null;

      const params = new URLSearchParams({ project_id: projectId });
      if (commitSha) params.append('commit_sha', commitSha);

      const response = await fetch(`${BACKEND_URL}/api/v1/cicd/test-impact?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch test impact analysis');
      }
      return await response.json() as TestImpactAnalysis;
    },
    enabled: !!projectId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000,
  });
}

export function useRunTestImpactAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      commitSha,
      baseSha,
    }: {
      projectId: string;
      commitSha: string;
      baseSha?: string;
    }) => {
      const response = await fetch(`${BACKEND_URL}/api/v1/cicd/test-impact/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          commit_sha: commitSha,
          base_sha: baseSha,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to run test impact analysis');
      }

      return await response.json() as TestImpactAnalysis;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-impact', data.project_id] });
    },
  });
}

// ============================================
// CI/CD STATS
// ============================================

export function useCICDStats(projectId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['cicd-stats', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      try {
        const response = await fetch(`${BACKEND_URL}/api/v1/cicd/stats?project_id=${projectId}`);
        if (response.ok) {
          return await response.json() as CICDStats;
        }
      } catch (error) {
        console.warn('Backend API not available, computing stats locally:', error);
      }

      // Compute basic stats from Supabase
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get pipeline stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: pipelines } = await (supabase.from('ci_pipelines') as any)
        .select('status, duration_ms, created_at')
        .eq('project_id', projectId);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: builds } = await (supabase.from('ci_builds') as any)
        .select('status, duration_ms, created_at')
        .eq('project_id', projectId);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: deployments } = await (supabase.from('ci_deployments') as any)
        .select('status, duration_ms, created_at, risk_score')
        .eq('project_id', projectId);

      const pipelineList = pipelines || [];
      const buildList = builds || [];
      const deploymentList = deployments || [];

      const pipelinesLast24h = pipelineList.filter(
        (p: { created_at: string }) => new Date(p.created_at) > yesterday
      );
      const buildsLast24h = buildList.filter(
        (b: { created_at: string }) => new Date(b.created_at) > yesterday
      );
      const deploymentsLast24h = deploymentList.filter(
        (d: { created_at: string }) => new Date(d.created_at) > yesterday
      );

      const successPipelines = pipelineList.filter((p: { status: string }) => p.status === 'success');
      const successBuilds = buildList.filter((b: { status: string }) => b.status === 'success');
      const successDeployments = deploymentList.filter((d: { status: string }) => d.status === 'success');

      const avgPipelineDuration = pipelineList.length > 0
        ? pipelineList.reduce((sum: number, p: { duration_ms: number }) => sum + (p.duration_ms || 0), 0) / pipelineList.length
        : 0;
      const avgBuildDuration = buildList.length > 0
        ? buildList.reduce((sum: number, b: { duration_ms: number }) => sum + (b.duration_ms || 0), 0) / buildList.length
        : 0;
      const avgDeploymentDuration = deploymentList.length > 0
        ? deploymentList.reduce((sum: number, d: { duration_ms: number }) => sum + (d.duration_ms || 0), 0) / deploymentList.length
        : 0;

      const latestDeployment = deploymentList[0];
      const currentRiskScore = latestDeployment?.risk_score || 0;

      return {
        total_pipelines: pipelineList.length,
        pipelines_last_24h: pipelinesLast24h.length,
        success_rate: pipelineList.length > 0 ? (successPipelines.length / pipelineList.length) * 100 : 0,
        avg_pipeline_duration_ms: avgPipelineDuration,
        total_builds: buildList.length,
        builds_last_24h: buildsLast24h.length,
        build_success_rate: buildList.length > 0 ? (successBuilds.length / buildList.length) * 100 : 0,
        avg_build_duration_ms: avgBuildDuration,
        total_deployments: deploymentList.length,
        deployments_last_24h: deploymentsLast24h.length,
        deployment_success_rate: deploymentList.length > 0 ? (successDeployments.length / deploymentList.length) * 100 : 0,
        avg_deployment_duration_ms: avgDeploymentDuration,
        current_risk_score: currentRiskScore,
        tests_impacted_by_recent_changes: 0,
      } as CICDStats;
    },
    enabled: !!projectId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });
}

// ============================================
// ACTIONS
// ============================================

export function useRetriggerPipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pipelineId, projectId }: { pipelineId: string; projectId: string }) => {
      const response = await fetch(`${BACKEND_URL}/api/v1/cicd/pipelines/${pipelineId}/retrigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to retrigger pipeline');
      }

      return await response.json() as Pipeline;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines', variables.projectId] });
    },
  });
}

export function useCancelPipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pipelineId, projectId }: { pipelineId: string; projectId: string }) => {
      const response = await fetch(`${BACKEND_URL}/api/v1/cicd/pipelines/${pipelineId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel pipeline');
      }

      return await response.json() as Pipeline;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines', variables.projectId] });
    },
  });
}

export function useRollbackDeployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ deploymentId, projectId }: { deploymentId: string; projectId: string }) => {
      const response = await fetch(`${BACKEND_URL}/api/v1/cicd/deployments/${deploymentId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to rollback deployment');
      }

      return await response.json() as Deployment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deployments', variables.projectId] });
    },
  });
}

// ============================================
// DEPLOYMENT RISK ANALYSIS
// ============================================

export function useDeploymentRisk(projectId: string | null, commitSha?: string) {
  return useQuery({
    queryKey: ['deployment-risk', projectId, commitSha],
    queryFn: async () => {
      if (!projectId) return null;

      const params = new URLSearchParams({ project_id: projectId });
      if (commitSha) params.append('commit_sha', commitSha);

      const response = await fetch(`${BACKEND_URL}/api/v1/cicd/deployment-risk?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch deployment risk');
      }
      return await response.json() as {
        risk_score: number;
        risk_level: 'low' | 'medium' | 'high' | 'critical';
        factors: RiskFactor[];
        recommendations: string[];
      };
    },
    enabled: !!projectId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
