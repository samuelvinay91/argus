'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { VisualBaseline, VisualComparison } from '@/lib/supabase/types';
import { useAuthApi } from './use-auth-api';

// Backend API response type for visual capture
interface VisualCaptureResponse {
  id: string;
  url: string;
  screenshot_url: string;
  viewport: { width: number; height: number };
  browser: string;
  captured_at: string;
  metadata?: Record<string, unknown>;
}

// Simple pixel diffing using canvas
async function compareScreenshots(
  baselineBase64: string,
  currentBase64: string
): Promise<{ matchPercentage: number; diffBase64: string }> {
  return new Promise((resolve) => {
    const baseImg = new Image();
    const currImg = new Image();
    let loaded = 0;

    const onBothLoaded = () => {
      // Create canvases
      const baseCanvas = document.createElement('canvas');
      const currCanvas = document.createElement('canvas');
      const diffCanvas = document.createElement('canvas');

      const width = Math.max(baseImg.width, currImg.width);
      const height = Math.max(baseImg.height, currImg.height);

      baseCanvas.width = currCanvas.width = diffCanvas.width = width;
      baseCanvas.height = currCanvas.height = diffCanvas.height = height;

      const baseCtx = baseCanvas.getContext('2d')!;
      const currCtx = currCanvas.getContext('2d')!;
      const diffCtx = diffCanvas.getContext('2d')!;

      baseCtx.drawImage(baseImg, 0, 0);
      currCtx.drawImage(currImg, 0, 0);

      const baseData = baseCtx.getImageData(0, 0, width, height);
      const currData = currCtx.getImageData(0, 0, width, height);
      const diffData = diffCtx.createImageData(width, height);

      let matchingPixels = 0;
      const totalPixels = width * height;

      for (let i = 0; i < baseData.data.length; i += 4) {
        const rDiff = Math.abs(baseData.data[i] - currData.data[i]);
        const gDiff = Math.abs(baseData.data[i + 1] - currData.data[i + 1]);
        const bDiff = Math.abs(baseData.data[i + 2] - currData.data[i + 2]);

        const threshold = 10; // Allow small color variations
        if (rDiff <= threshold && gDiff <= threshold && bDiff <= threshold) {
          matchingPixels++;
          // Keep original pixel in diff
          diffData.data[i] = currData.data[i];
          diffData.data[i + 1] = currData.data[i + 1];
          diffData.data[i + 2] = currData.data[i + 2];
          diffData.data[i + 3] = currData.data[i + 3];
        } else {
          // Highlight difference in red
          diffData.data[i] = 255;
          diffData.data[i + 1] = 0;
          diffData.data[i + 2] = 0;
          diffData.data[i + 3] = 255;
        }
      }

      diffCtx.putImageData(diffData, 0, 0);
      const matchPercentage = (matchingPixels / totalPixels) * 100;
      const diffBase64 = diffCanvas.toDataURL('image/png');

      resolve({ matchPercentage, diffBase64 });
    };

    const checkLoaded = () => {
      loaded++;
      if (loaded === 2) onBothLoaded();
    };

    baseImg.onload = checkLoaded;
    currImg.onload = checkLoaded;
    baseImg.onerror = () => resolve({ matchPercentage: 0, diffBase64: '' });
    currImg.onerror = () => resolve({ matchPercentage: 0, diffBase64: '' });

    baseImg.src = baselineBase64.startsWith('data:') ? baselineBase64 : `data:image/png;base64,${baselineBase64}`;
    currImg.src = currentBase64.startsWith('data:') ? currentBase64 : `data:image/png;base64,${currentBase64}`;
  });
}

export function useVisualBaselines(projectId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['visual-baselines', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('visual_baselines') as any)
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as VisualBaseline[];
    },
    enabled: !!projectId,
  });
}

export function useVisualComparisons(projectId: string | null, limit = 20) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['visual-comparisons', projectId, limit],
    queryFn: async () => {
      if (!projectId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('visual_comparisons') as any)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as VisualComparison[];
    },
    enabled: !!projectId,
  });
}

export function useVisualComparison(comparisonId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['visual-comparison', comparisonId],
    queryFn: async () => {
      if (!comparisonId) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('visual_comparisons') as any)
        .select('*')
        .eq('id', comparisonId)
        .single();

      if (error) throw error;
      return data as VisualComparison;
    },
    enabled: !!comparisonId,
  });
}

export function useApproveComparison() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      comparisonId,
      projectId,
      approvedBy,
    }: {
      comparisonId: string;
      projectId: string;
      approvedBy?: string | null;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('visual_comparisons') as any)
        .update({
          status: 'match',
          approved_by: approvedBy || null,
          approved_at: new Date().toISOString(),
        })
        .eq('id', comparisonId)
        .select()
        .single();

      if (error) throw error;
      return { comparison: data as VisualComparison, projectId };
    },
    onSuccess: ({ comparison, projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['visual-comparisons', projectId] });
      queryClient.invalidateQueries({ queryKey: ['visual-comparison', comparison.id] });
    },
  });
}

interface VisualTestResult {
  comparison: VisualComparison;
  baseline: VisualBaseline | null;
  isNew: boolean;
}

export function useRunVisualTest() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const { fetchJson } = useAuthApi();

  return useMutation({
    mutationFn: async ({
      projectId,
      url,
      name,
      viewport = '1920x1080',
      threshold = 0.1,
    }: {
      projectId: string;
      url: string;
      name?: string;
      viewport?: string;
      threshold?: number;
    }): Promise<VisualTestResult> => {
      // Parse viewport
      const [width, height] = viewport.split('x').map(Number);

      // 1. Capture screenshot using backend Visual AI API (with authentication, cost tracking, baseline management)
      const captureResponse = await fetchJson<VisualCaptureResponse>(
        '/api/v1/visual/capture',
        {
          method: 'POST',
          body: JSON.stringify({
            url,
            viewport: { width, height },
            browser: 'chromium',
            project_id: projectId,
            name: name || undefined,
          }),
          timeout: 90000, // 90 second timeout for screenshot capture
        }
      );

      if (captureResponse.error || !captureResponse.data) {
        throw new Error(captureResponse.error || 'Failed to capture screenshot');
      }

      const captureResult = captureResponse.data;

      // Get screenshot URL from backend response
      const screenshotDataUrl = captureResult.screenshot_url;
      if (!screenshotDataUrl) {
        throw new Error('No screenshot captured');
      }

      // Generate name from URL if not provided
      let testName = name;
      if (!testName) {
        try {
          testName = new URL(url).pathname.replace(/\//g, '-').replace(/^-/, '') || 'homepage';
        } catch {
          testName = 'visual-test';
        }
      }

      // 2. Check for existing baseline
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingBaselines } = await (supabase.from('visual_baselines') as any)
        .select('*')
        .eq('project_id', projectId)
        .eq('page_url', url)
        .eq('viewport', viewport)
        .eq('is_active', true)
        .limit(1);

      const existingBaseline = existingBaselines?.[0] as VisualBaseline | undefined;

      if (!existingBaseline) {
        // 3a. No baseline - create new baseline and comparison marked as "new"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newBaseline, error: baselineError } = await (supabase.from('visual_baselines') as any)
          .insert({
            project_id: projectId,
            name: testName,
            page_url: url,
            viewport,
            screenshot_url: screenshotDataUrl,
            is_active: true,
          })
          .select()
          .single();

        if (baselineError) throw baselineError;

        // Create comparison marked as new
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: comparison, error: compError } = await (supabase.from('visual_comparisons') as any)
          .insert({
            project_id: projectId,
            baseline_id: newBaseline.id,
            name: testName,
            status: 'new',
            match_percentage: 100,
            difference_count: 0,
            baseline_url: screenshotDataUrl,
            current_url: screenshotDataUrl,
            threshold,
          })
          .select()
          .single();

        if (compError) throw compError;

        return {
          comparison: comparison as VisualComparison,
          baseline: newBaseline as VisualBaseline,
          isNew: true,
        };
      } else {
        // 3b. Baseline exists - compare screenshots
        const { matchPercentage, diffBase64 } = await compareScreenshots(
          existingBaseline.screenshot_url,
          screenshotDataUrl
        );

        const status = matchPercentage >= (100 - threshold * 100) ? 'match' : 'mismatch';
        const differenceCount = Math.round((100 - matchPercentage) * 100);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: comparison, error: compError } = await (supabase.from('visual_comparisons') as any)
          .insert({
            project_id: projectId,
            baseline_id: existingBaseline.id,
            name: testName,
            status,
            match_percentage: matchPercentage,
            difference_count: differenceCount,
            baseline_url: existingBaseline.screenshot_url,
            current_url: screenshotDataUrl,
            diff_url: diffBase64 || null,
            threshold,
          })
          .select()
          .single();

        if (compError) throw compError;

        return {
          comparison: comparison as VisualComparison,
          baseline: existingBaseline,
          isNew: false,
        };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['visual-baselines', data.comparison.project_id] });
      queryClient.invalidateQueries({ queryKey: ['visual-comparisons', data.comparison.project_id] });
      queryClient.invalidateQueries({ queryKey: ['visual-comparison', data.comparison.id] });
    },
  });
}

// Responsive Testing Types
export interface ViewportConfig {
  name: string;
  width: number;
  height: number;
}

export interface ResponsiveViewportResult {
  viewport: string;
  width: number;
  height: number;
  status: 'match' | 'mismatch' | 'new' | 'error';
  match_percentage: number | null;
  baseline_url: string | null;
  current_url: string;
  diff_url: string | null;
  error?: string;
}

export interface ResponsiveCompareResult {
  url: string;
  results: ResponsiveViewportResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    new_baselines: number;
  };
}

/**
 * Hook to run responsive visual tests across multiple viewports.
 * Calls the backend's responsive capture and compare endpoints.
 */
export function useRunResponsiveTest() {
  const queryClient = useQueryClient();
  const { fetchJson } = useAuthApi();

  return useMutation({
    mutationFn: async ({
      projectId,
      url,
      viewports,
      threshold = 0.1,
    }: {
      projectId: string;
      url: string;
      viewports: ViewportConfig[];
      threshold?: number;
    }): Promise<ResponsiveCompareResult> => {
      // 1. Capture screenshots at multiple viewports
      const captureResponse = await fetchJson<{
        url: string;
        viewports: Array<{
          name: string;
          width: number;
          height: number;
          screenshot_url: string;
          captured_at: string;
        }>;
        project_id: string;
      }>(
        '/api/v1/visual/responsive/capture',
        {
          method: 'POST',
          body: JSON.stringify({
            url,
            viewports: viewports.map((vp) => ({
              name: vp.name,
              width: vp.width,
              height: vp.height,
            })),
            project_id: projectId,
          }),
          timeout: 120000, // 2 minute timeout for multiple captures
        }
      );

      if (captureResponse.error || !captureResponse.data) {
        throw new Error(captureResponse.error || 'Responsive capture failed');
      }

      const captureResult = captureResponse.data;

      // 2. Compare against baselines
      const compareResponse = await fetchJson<ResponsiveCompareResult>(
        '/api/v1/visual/responsive/compare',
        {
          method: 'POST',
          body: JSON.stringify({
            url,
            viewports: captureResult.viewports.map((vp) => ({
              name: vp.name,
              width: vp.width,
              height: vp.height,
              screenshot_url: vp.screenshot_url,
            })),
            project_id: projectId,
            threshold,
          }),
          timeout: 60000, // 1 minute timeout for comparisons
        }
      );

      if (compareResponse.error || !compareResponse.data) {
        throw new Error(compareResponse.error || 'Responsive compare failed');
      }

      return compareResponse.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['visual-baselines', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['visual-comparisons', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['responsive-results', variables.projectId] });
    },
  });
}

// AI Explanation response types
export interface AIExplainChangeDetail {
  change: string;
  likely_cause: string;
  intentional_likelihood: 'high' | 'medium' | 'low';
  risk_level: 'high' | 'medium' | 'low';
}

export interface AIExplainResponse {
  summary: string;
  changes_explained: AIExplainChangeDetail[];
  recommendations: string[];
  overall_assessment: string;
}

/**
 * Hook to fetch AI-powered explanation for a visual comparison.
 * Calls the backend's Claude-powered AI explanation endpoint.
 * Results are cached by comparison ID to avoid repeated API calls.
 */
export function useAIExplain(comparisonId: string | null, comparison: VisualComparison | null) {
  const { fetchJson } = useAuthApi();

  return useQuery({
    queryKey: ['ai-explain', comparisonId],
    queryFn: async (): Promise<AIExplainResponse | null> => {
      if (!comparisonId || !comparison) return null;

      // Only fetch AI explanation for mismatches with visual differences
      if (comparison.status !== 'mismatch' || comparison.match_percentage === null) {
        return null;
      }

      const response = await fetchJson<AIExplainResponse>('/api/v1/visual/ai/explain', {
        method: 'POST',
        body: JSON.stringify({
          comparison_id: comparisonId,
          baseline_url: comparison.baseline_url,
          current_url: comparison.current_url,
          diff_url: comparison.diff_url,
          match_percentage: comparison.match_percentage,
          name: comparison.name,
        }),
      });

      if (response.error) {
        throw new Error(`AI explanation failed: ${response.error}`);
      }

      return response.data;
    },
    enabled: !!comparisonId && !!comparison && comparison.status === 'mismatch',
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    gcTime: 1000 * 60 * 60, // Keep in garbage collection cache for 1 hour
    retry: 1, // Only retry once on failure
  });
}

// Accessibility Analysis Types
export interface AccessibilityIssue {
  criterion: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  location: string;
  recommendation: string;
}

export interface AccessibilityAnalysisResult {
  overall_score: number;
  level_compliance: 'A' | 'AA' | 'AAA' | 'None';
  issues: AccessibilityIssue[];
  passed_criteria: string[];
  summary: string;
}

export function useAccessibilityAnalysis() {
  const queryClient = useQueryClient();
  const { fetchJson } = useAuthApi();

  return useMutation({
    mutationFn: async ({
      url,
      projectId,
    }: {
      url: string;
      projectId?: string;
    }): Promise<AccessibilityAnalysisResult> => {
      const response = await fetchJson<AccessibilityAnalysisResult>(
        '/api/v1/visual/accessibility/analyze',
        {
          method: 'POST',
          body: JSON.stringify({ url, project_id: projectId }),
        }
      );

      if (response.error || !response.data) {
        throw new Error(`Accessibility analysis failed: ${response.error || 'Unknown error'}`);
      }

      return response.data;
    },
    onSuccess: (_data, variables) => {
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: ['accessibility-analysis', variables.projectId] });
      }
    },
  });
}

export function useUpdateBaseline() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      comparisonId,
      projectId,
    }: {
      comparisonId: string;
      projectId: string;
    }) => {
      // Get the comparison
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: comparison, error: compError } = await (supabase.from('visual_comparisons') as any)
        .select('*')
        .eq('id', comparisonId)
        .single();

      if (compError || !comparison) throw new Error('Comparison not found');

      // Update the baseline with the current screenshot
      if (comparison.baseline_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('visual_baselines') as any)
          .update({
            screenshot_url: comparison.current_url,
          })
          .eq('id', comparison.baseline_id);
      }

      // Mark comparison as approved
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updated, error: updateError } = await (supabase.from('visual_comparisons') as any)
        .update({
          status: 'match',
          approved_at: new Date().toISOString(),
        })
        .eq('id', comparisonId)
        .select()
        .single();

      if (updateError) throw updateError;

      return { comparison: updated as VisualComparison, projectId };
    },
    onSuccess: ({ comparison, projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['visual-baselines', projectId] });
      queryClient.invalidateQueries({ queryKey: ['visual-comparisons', projectId] });
      queryClient.invalidateQueries({ queryKey: ['visual-comparison', comparison.id] });
    },
  });
}

// =============================================================================
// Cross-Browser Testing Types and Hooks
// =============================================================================

export interface BrowserCaptureResult {
  id?: string;
  browser: string;
  success: boolean;
  screenshot_url?: string;
  error?: string;
}

export interface CrossBrowserCaptureResponse {
  success: boolean;
  url: string;
  results: BrowserCaptureResult[];
  captured_at: string;
}

export interface BrowserDifference {
  type: string;
  severity: string;
  description: string;
  location?: string;
}

export interface BrowserCompareResult {
  browser: string;
  is_reference: boolean;
  reference_browser?: string;
  match?: boolean;
  match_percentage?: number;
  differences?: BrowserDifference[];
  error?: string;
}

export interface CrossBrowserCompareResponse {
  success: boolean;
  url: string;
  reference_browser: string;
  results: BrowserCompareResult[];
  compared_at: string;
}

export interface CrossBrowserTestResult {
  captureResults: CrossBrowserCaptureResponse;
  compareResults: CrossBrowserCompareResponse | null;
}

/**
 * Hook for running cross-browser visual tests.
 * Captures screenshots in multiple browsers and compares them.
 */
export function useCrossBrowserTest() {
  const queryClient = useQueryClient();
  const { fetchJson } = useAuthApi();

  return useMutation({
    mutationFn: async ({
      url,
      browsers = ['chromium', 'firefox', 'webkit'],
      viewport,
      projectId,
      name,
      compareAfterCapture = true,
    }: {
      url: string;
      browsers?: string[];
      viewport?: { width: number; height: number };
      projectId?: string;
      name?: string;
      compareAfterCapture?: boolean;
    }): Promise<CrossBrowserTestResult> => {
      // Build request payload
      const requestPayload: {
        url: string;
        browsers: string[];
        viewport?: { width: number; height: number };
        project_id?: string;
        name?: string;
      } = {
        url,
        browsers,
      };

      if (viewport) {
        requestPayload.viewport = viewport;
      }
      if (projectId) {
        requestPayload.project_id = projectId;
      }
      if (name) {
        requestPayload.name = name;
      }

      // Step 1: Capture screenshots in multiple browsers using authenticated API
      const captureResponse = await fetchJson<CrossBrowserCaptureResponse>(
        '/api/v1/visual/browsers/capture',
        {
          method: 'POST',
          body: JSON.stringify(requestPayload),
          timeout: 120000, // 2 minute timeout for multi-browser capture
        }
      );

      if (captureResponse.error || !captureResponse.data) {
        throw new Error(captureResponse.error || 'Cross-browser capture failed');
      }

      const captureResults = captureResponse.data;

      // Step 2: Compare browsers if requested and capture was successful
      let compareResults: CrossBrowserCompareResponse | null = null;

      if (compareAfterCapture && captureResults.success) {
        const compareResponse = await fetchJson<CrossBrowserCompareResponse>(
          '/api/v1/visual/browsers/compare',
          {
            method: 'POST',
            body: JSON.stringify(requestPayload),
            timeout: 120000,
          }
        );

        if (compareResponse.data) {
          compareResults = compareResponse.data;
        }
      }

      return {
        captureResults,
        compareResults,
      };
    },
    onSuccess: (_data, variables) => {
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: ['cross-browser-tests', variables.projectId] });
        queryClient.invalidateQueries({ queryKey: ['visual-baselines', variables.projectId] });
      }
    },
  });
}
