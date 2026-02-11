'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  cicdApi,
  type CicdPipeline,
  type CicdPipelineStage,
  type CicdBuild,
  type CicdDeployment,
  type CicdRiskFactor,
  type CicdTestImpactAnalysis,
  type CicdChangedFile,
  type CicdImpactedTest,
  type CicdStats,
  type CicdDeploymentRiskResponse,
} from '@/lib/api-client';
import type { Json } from '@/lib/supabase/types';

// ============================================
// TYPES (Legacy snake_case for backward compatibility)
// ============================================

export type PipelineStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'skipped';
export type PipelineProvider = 'github' | 'gitlab' | 'jenkins' | 'circleci' | 'bitbucket' | 'azure';

export interface PipelineJob {
  name: string;
  status: PipelineStatus;
  runner: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  logs_url: string | null;
}

export interface PipelineStage {
  name: string;
  status: PipelineStatus;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  jobs: PipelineJob[];
}

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
// TRANSFORM FUNCTIONS (API camelCase -> Legacy snake_case)
// ============================================

function transformPipelineStage(stage: CicdPipelineStage): PipelineStage {
  return {
    name: stage.name,
    status: stage.status as PipelineStatus,
    started_at: stage.startedAt,
    completed_at: stage.completedAt,
    duration_ms: stage.durationSeconds ? stage.durationSeconds * 1000 : null,
    jobs: stage.jobs.map(job => ({
      name: job.name,
      status: job.status as PipelineStatus,
      runner: null,
      started_at: null,
      completed_at: null,
      duration_ms: null,
      logs_url: null,
    })),
  };
}

function transformPipeline(pipeline: CicdPipeline): Pipeline {
  return {
    id: pipeline.id,
    project_id: pipeline.projectId,
    provider: 'github' as PipelineProvider, // GitHub is primary provider
    name: pipeline.workflowName || 'Pipeline',
    branch: pipeline.branch || '',
    status: (pipeline.conclusion || pipeline.status) as PipelineStatus,
    commit_sha: pipeline.commitSha || '',
    commit_message: pipeline.commitMessage,
    commit_author: pipeline.actor,
    trigger: (pipeline.event as Pipeline['trigger']) || 'push',
    workflow_name: pipeline.workflowName,
    workflow_url: pipeline.htmlUrl,
    started_at: pipeline.startedAt,
    completed_at: pipeline.completedAt,
    duration_ms: null, // Computed from started_at/completed_at if needed
    stages: pipeline.stages.map(transformPipelineStage),
    metadata: {},
    created_at: pipeline.createdAt,
    updated_at: pipeline.updatedAt || pipeline.createdAt,
  };
}

function transformBuild(build: CicdBuild): Build {
  return {
    id: build.id,
    project_id: build.projectId,
    pipeline_id: build.pipelineId,
    provider: build.provider as PipelineProvider,
    build_number: build.buildNumber,
    name: build.name,
    branch: build.branch,
    status: build.status as PipelineStatus,
    commit_sha: build.commitSha,
    commit_message: build.commitMessage,
    commit_author: build.commitAuthor,
    tests_total: build.testsTotal,
    tests_passed: build.testsPassed,
    tests_failed: build.testsFailed,
    tests_skipped: build.testsSkipped,
    coverage_percent: build.coveragePercent,
    artifact_urls: build.artifactUrls,
    logs_url: build.logsUrl,
    started_at: build.startedAt,
    completed_at: build.completedAt,
    duration_ms: build.durationMs,
    metadata: build.metadata as Json,
    created_at: build.createdAt,
  };
}

function transformRiskFactor(rf: CicdRiskFactor): RiskFactor {
  return {
    category: rf.category as RiskFactor['category'],
    severity: rf.severity as RiskFactor['severity'],
    description: rf.description,
    score: rf.score,
  };
}

function transformDeployment(deployment: CicdDeployment): Deployment {
  return {
    id: deployment.id,
    project_id: deployment.projectId,
    build_id: deployment.buildId,
    environment: deployment.environment as Deployment['environment'],
    status: deployment.status as Deployment['status'],
    version: deployment.version,
    commit_sha: deployment.commitSha,
    deployed_by: deployment.deployedBy,
    deployment_url: deployment.deploymentUrl,
    preview_url: deployment.previewUrl,
    risk_score: deployment.riskScore,
    risk_factors: deployment.riskFactors.map(transformRiskFactor),
    health_check_status: deployment.healthCheckStatus as Deployment['health_check_status'],
    rollback_available: deployment.rollbackAvailable,
    started_at: deployment.startedAt,
    completed_at: deployment.completedAt,
    duration_ms: deployment.durationMs,
    metadata: deployment.metadata as Json,
    created_at: deployment.createdAt,
  };
}

function transformChangedFile(file: CicdChangedFile): ChangedFile {
  return {
    path: file.path,
    change_type: file.changeType as ChangedFile['change_type'],
    additions: file.additions,
    deletions: file.deletions,
    impact_score: file.impactScore,
  };
}

function transformImpactedTest(test: CicdImpactedTest): ImpactedTest {
  return {
    test_id: test.testId,
    test_name: test.testName,
    impact_reason: test.impactReason,
    confidence: test.confidence,
    priority: test.priority,
  };
}

function transformTestImpactAnalysis(analysis: CicdTestImpactAnalysis): TestImpactAnalysis {
  return {
    id: analysis.id,
    project_id: analysis.projectId,
    commit_sha: analysis.commitSha,
    branch: analysis.branch,
    base_sha: analysis.baseSha,
    changed_files: analysis.changedFiles.map(transformChangedFile),
    impacted_tests: analysis.impactedTests.map(transformImpactedTest),
    total_files_changed: analysis.totalFilesChanged,
    total_tests_impacted: analysis.totalTestsImpacted,
    recommended_tests: analysis.recommendedTests,
    skip_candidates: analysis.skipCandidates,
    confidence_score: analysis.confidenceScore,
    analysis_time_ms: analysis.analysisTimeMs,
    created_at: analysis.createdAt,
  };
}

function transformStats(stats: CicdStats): CICDStats {
  return {
    total_pipelines: stats.totalPipelines,
    pipelines_last_24h: stats.pipelinesLast24h,
    success_rate: stats.successRate,
    avg_pipeline_duration_ms: stats.avgPipelineDurationMs,
    total_builds: stats.totalBuilds,
    builds_last_24h: stats.buildsLast24h,
    build_success_rate: stats.buildSuccessRate,
    avg_build_duration_ms: stats.avgBuildDurationMs,
    total_deployments: stats.totalDeployments,
    deployments_last_24h: stats.deploymentsLast24h,
    deployment_success_rate: stats.deploymentSuccessRate,
    avg_deployment_duration_ms: stats.avgDeploymentDurationMs,
    current_risk_score: stats.currentRiskScore,
    tests_impacted_by_recent_changes: stats.testsImpactedByRecentChanges,
  };
}

// ============================================
// PIPELINES
// ============================================

export function usePipelines(projectId: string | null, options?: {
  branch?: string;
  status?: PipelineStatus;
  limit?: number;
}) {
  const limit = options?.limit || 50;

  return useQuery({
    queryKey: ['pipelines', projectId, options],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await cicdApi.listPipelines({
        projectId,
        branch: options?.branch,
        status: options?.status,
        limit,
      });

      return response.pipelines.map(transformPipeline);
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}

export function usePipeline(pipelineId: string | null, projectId?: string | null) {
  return useQuery({
    queryKey: ['pipeline', pipelineId, projectId],
    queryFn: async () => {
      if (!pipelineId || !projectId) return null;

      const response = await cicdApi.getPipeline(pipelineId, projectId);
      return transformPipeline(response);
    },
    enabled: !!pipelineId && !!projectId,
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
  const limit = options?.limit || 50;

  return useQuery({
    queryKey: ['build-history', projectId, options],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await cicdApi.listBuilds({
        projectId,
        branch: options?.branch,
        status: options?.status,
        limit,
      });

      return response.builds.map(transformBuild);
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}

export function useBuild(buildId: string | null) {
  return useQuery({
    queryKey: ['build', buildId],
    queryFn: async () => {
      if (!buildId) return null;

      const response = await cicdApi.getBuild(buildId);
      return transformBuild(response);
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
  const limit = options?.limit || 50;

  return useQuery({
    queryKey: ['deployments', projectId, options],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await cicdApi.listDeployments({
        projectId,
        environment: options?.environment,
        status: options?.status,
        limit,
      });

      return response.deployments.map(transformDeployment);
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}

export function useDeployment(deploymentId: string | null) {
  return useQuery({
    queryKey: ['deployment', deploymentId],
    queryFn: async () => {
      if (!deploymentId) return null;

      const response = await cicdApi.getDeployment(deploymentId);
      return transformDeployment(response);
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

      const response = await cicdApi.getTestImpact({
        projectId,
        commitSha,
      });

      if (!response) return null;
      return transformTestImpactAnalysis(response);
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
      const response = await cicdApi.analyzeTestImpact({
        projectId,
        commitSha,
        baseSha,
      });

      return transformTestImpactAnalysis(response);
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
  return useQuery({
    queryKey: ['cicd-stats', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const response = await cicdApi.getStats(projectId);
      return transformStats(response);
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
      const response = await cicdApi.retriggerPipeline(pipelineId, projectId);

      if (!response.success) {
        throw new Error(response.message);
      }

      return response.pipeline ? transformPipeline(response.pipeline) : null;
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
      const response = await cicdApi.cancelPipeline(pipelineId, projectId);

      if (!response.success) {
        throw new Error(response.message);
      }

      return response.pipeline ? transformPipeline(response.pipeline) : null;
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
      const response = await cicdApi.rollbackDeployment(deploymentId);

      if (!response.success) {
        throw new Error(response.message);
      }

      return transformDeployment(response.deployment);
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

      const response = await cicdApi.getDeploymentRisk({
        projectId,
        commitSha,
      });

      return {
        risk_score: response.riskScore,
        risk_level: response.riskLevel as 'low' | 'medium' | 'high' | 'critical',
        factors: response.factors as unknown as RiskFactor[],
        recommendations: response.recommendations,
      };
    },
    enabled: !!projectId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
