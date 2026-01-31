'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { VisualBaseline, VisualComparison } from '@/lib/supabase/types';
import {
  visualApi,
  type VisualBaselineApi,
  type VisualComparisonApi,
  type AIExplainResponse,
  type VisualAccessibilityResult,
  type BrowserCaptureResponse,
  type BrowserCompareResponse,
} from '@/lib/api-client';

// ============================================================================
// Transform Functions - Convert API responses to legacy Supabase types
// ============================================================================

/**
 * Transform API baseline response to legacy Supabase VisualBaseline format
 */
function transformBaselineToLegacy(baseline: VisualBaselineApi): VisualBaseline {
  return {
    id: baseline.id,
    project_id: baseline.projectId,
    name: baseline.name,
    selector: null, // Not in API response
    page_url: baseline.url,
    viewport: '1440x900', // Default, could be extracted from API if available
    screenshot_url: baseline.screenshotUrl || '',
    screenshot_hash: null, // Not in API response
    is_active: true, // Default to active
    created_by: null, // Not in API response
    created_at: baseline.createdAt,
  };
}

/**
 * Transform API comparison response to legacy Supabase VisualComparison format
 */
function transformComparisonToLegacy(comparison: VisualComparisonApi): VisualComparison {
  // Map API status to legacy status
  let status: VisualComparison['status'] = 'pending';
  if (comparison.match) {
    status = 'match';
  } else if (comparison.hasRegressions) {
    status = 'mismatch';
  }

  return {
    id: comparison.id,
    project_id: '', // Not directly in API response, populated from context
    baseline_id: comparison.baselineId,
    name: comparison.summary?.substring(0, 100) || 'Visual Comparison',
    status,
    match_percentage: comparison.matchPercentage,
    difference_count: comparison.differences?.length || 0,
    baseline_url: null, // Not directly in API response
    current_url: '', // Not directly in API response
    diff_url: null, // Not directly in API response
    threshold: 0.1, // Default threshold
    approved_by: null, // Not in API response
    approved_at: null, // Not in API response
    created_at: comparison.comparedAt,
  };
}

/**
 * Transform raw API comparison data (from list endpoint) to legacy format
 */
function transformRawComparisonToLegacy(raw: Record<string, unknown>): VisualComparison {
  return {
    id: String(raw.id || ''),
    project_id: String(raw.project_id || ''),
    baseline_id: raw.baseline_id as string | null,
    name: String(raw.name || ''),
    status: (raw.status as VisualComparison['status']) || 'pending',
    match_percentage: raw.match_percentage as number | null,
    difference_count: Number(raw.difference_count || 0),
    baseline_url: raw.baseline_url as string | null,
    current_url: String(raw.current_url || ''),
    diff_url: raw.diff_url as string | null,
    threshold: Number(raw.threshold || 0.1),
    approved_by: raw.approved_by as string | null,
    approved_at: raw.approved_at as string | null,
    created_at: String(raw.created_at || new Date().toISOString()),
  };
}

/**
 * Transform raw API baseline data (from list endpoint) to legacy format
 */
function transformRawBaselineToLegacy(raw: Record<string, unknown>): VisualBaseline {
  return {
    id: String(raw.id || ''),
    project_id: String(raw.project_id || ''),
    name: String(raw.name || ''),
    selector: raw.selector as string | null,
    page_url: String(raw.page_url || raw.url || ''),
    viewport: String(raw.viewport || `${raw.viewport_width || 1440}x${raw.viewport_height || 900}`),
    screenshot_url: String(raw.screenshot_url || raw.screenshot_path || ''),
    screenshot_hash: raw.screenshot_hash as string | null,
    is_active: raw.is_active !== false, // Default to true
    created_by: raw.created_by as string | null,
    created_at: String(raw.created_at || new Date().toISOString()),
  };
}

// ============================================================================
// Simple pixel diffing using canvas (kept for local comparison)
// ============================================================================

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

// ============================================================================
// Hooks
// ============================================================================

export function useVisualBaselines(projectId: string | null) {
  return useQuery({
    queryKey: ['visual-baselines', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await visualApi.listBaselines(projectId);
      // Handle both new API format and legacy format
      if ('baselines' in response && Array.isArray(response.baselines)) {
        return response.baselines.map((b) => transformRawBaselineToLegacy(b as unknown as Record<string, unknown>));
      }
      // Fallback for unexpected format
      return [];
    },
    enabled: !!projectId,
  });
}

export function useVisualComparisons(projectId: string | null, limit = 20) {
  return useQuery({
    queryKey: ['visual-comparisons', projectId, limit],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await visualApi.listComparisons({ projectId, limit });
      // Handle both new API format and legacy format
      if ('comparisons' in response && Array.isArray(response.comparisons)) {
        return response.comparisons.map((c) => transformRawComparisonToLegacy(c as unknown as Record<string, unknown>));
      }
      // Fallback for unexpected format
      return [];
    },
    enabled: !!projectId,
  });
}

export function useVisualComparison(comparisonId: string | null) {
  return useQuery({
    queryKey: ['visual-comparison', comparisonId],
    queryFn: async () => {
      if (!comparisonId) return null;

      const response = await visualApi.getComparison(comparisonId);
      if (response.comparison) {
        return transformRawComparisonToLegacy(response.comparison as unknown as Record<string, unknown>);
      }
      return null;
    },
    enabled: !!comparisonId,
  });
}

export function useApproveComparison() {
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
      const response = await visualApi.approveComparison(comparisonId, {
        notes: approvedBy ? `Approved by ${approvedBy}` : undefined,
        updateBaseline: false,
      });

      if (!response.success) {
        throw new Error('Failed to approve comparison');
      }

      // Return a synthetic comparison for cache invalidation
      return {
        comparison: {
          id: comparisonId,
          project_id: projectId,
          status: 'match' as const,
          approved_at: response.reviewedAt,
        } as VisualComparison,
        projectId,
      };
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
  const queryClient = useQueryClient();

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

      // 1. Capture screenshot using backend Visual AI API
      const captureResult = await visualApi.capture({
        url,
        viewport: { width, height },
        browser: 'chromium',
        projectId,
        name: name || undefined,
      });

      // Get screenshot URL from backend response
      const screenshotDataUrl = captureResult.screenshotUrl;
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

      // 2. Check for existing baseline via API
      const baselinesResponse = await visualApi.listBaselines(projectId);
      const existingBaseline = baselinesResponse.baselines?.find(
        (b) => b.url === url
      );

      if (!existingBaseline) {
        // 3a. No baseline - create new baseline via API
        const newBaseline = await visualApi.createBaseline(
          url,
          testName,
          projectId,
          { width, height },
          'chromium'
        );

        // Transform to legacy format
        const legacyBaseline = transformRawBaselineToLegacy(newBaseline as unknown as Record<string, unknown>);

        // Create a synthetic comparison marked as new
        const comparison: VisualComparison = {
          id: captureResult.id,
          project_id: projectId,
          baseline_id: newBaseline.id,
          name: testName,
          status: 'new',
          match_percentage: 100,
          difference_count: 0,
          baseline_url: screenshotDataUrl,
          current_url: screenshotDataUrl,
          diff_url: null,
          threshold,
          approved_by: null,
          approved_at: null,
          created_at: new Date().toISOString(),
        };

        return {
          comparison,
          baseline: legacyBaseline,
          isNew: true,
        };
      } else {
        // 3b. Baseline exists - compare screenshots locally
        // Use camelCase properties from VisualBaselineApi
        const baselineScreenshotUrl = existingBaseline.screenshotUrl || '';
        const { matchPercentage, diffBase64 } = await compareScreenshots(
          baselineScreenshotUrl,
          screenshotDataUrl
        );

        const status = matchPercentage >= (100 - threshold * 100) ? 'match' : 'mismatch';
        const differenceCount = Math.round((100 - matchPercentage) * 100);

        const comparison: VisualComparison = {
          id: captureResult.id,
          project_id: projectId,
          baseline_id: existingBaseline.id,
          name: testName,
          status,
          match_percentage: matchPercentage,
          difference_count: differenceCount,
          baseline_url: baselineScreenshotUrl,
          current_url: screenshotDataUrl,
          diff_url: diffBase64 || null,
          threshold,
          approved_by: null,
          approved_at: null,
          created_at: new Date().toISOString(),
        };

        return {
          comparison,
          baseline: transformRawBaselineToLegacy(existingBaseline as unknown as Record<string, unknown>),
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
      const captureResult = await visualApi.captureResponsive({
        url,
        viewports: viewports.map((vp) => ({
          name: vp.name,
          width: vp.width,
          height: vp.height,
        })),
        projectId,
      });

      if (!captureResult.success) {
        throw new Error('Responsive capture failed');
      }

      // 2. Compare against baselines
      const compareResult = await visualApi.compareResponsive({
        url,
        viewports: captureResult.results
          .filter(r => r.success && r.screenshotUrl)
          .map((vp) => ({
            name: vp.viewport.name,
            width: vp.viewport.width,
            height: vp.viewport.height,
            screenshotUrl: vp.screenshotUrl!,
          })),
        projectId,
        threshold,
      });

      // Transform to legacy format
      return {
        url: compareResult.url,
        results: compareResult.results.map(r => ({
          viewport: r.viewport,
          width: r.width,
          height: r.height,
          status: r.status,
          match_percentage: r.matchPercentage,
          baseline_url: r.baselineUrl,
          current_url: r.currentUrl,
          diff_url: r.diffUrl,
          error: r.error,
        })),
        summary: {
          total: compareResult.summary.total,
          passed: compareResult.summary.passed,
          failed: compareResult.summary.failed,
          new_baselines: compareResult.summary.newBaselines,
        },
      };
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

export interface AIExplainResponseLegacy {
  summary: string;
  changes_explained: AIExplainChangeDetail[];
  recommendations: string[];
  overall_assessment: string;
}

/**
 * Transform API AI explanation to legacy format
 */
function transformAIExplainToLegacy(response: AIExplainResponse): AIExplainResponseLegacy {
  return {
    summary: response.summary,
    changes_explained: response.changesExplained.map(c => ({
      change: c.change,
      likely_cause: c.likelyCause,
      intentional_likelihood: c.intentionalLikelihood,
      risk_level: c.riskLevel,
    })),
    recommendations: response.recommendations,
    overall_assessment: response.overallAssessment,
  };
}

/**
 * Hook to fetch AI-powered explanation for a visual comparison.
 * Calls the backend's Claude-powered AI explanation endpoint.
 * Results are cached by comparison ID to avoid repeated API calls.
 */
export function useAIExplain(comparisonId: string | null, comparison: VisualComparison | null) {
  return useQuery({
    queryKey: ['ai-explain', comparisonId],
    queryFn: async (): Promise<AIExplainResponseLegacy | null> => {
      if (!comparisonId || !comparison) return null;

      // Only fetch AI explanation for mismatches with visual differences
      if (comparison.status !== 'mismatch' || comparison.match_percentage === null) {
        return null;
      }

      const response = await visualApi.explain(comparisonId);

      if (!response.success || !response.explanation) {
        throw new Error('AI explanation failed');
      }

      return transformAIExplainToLegacy(response.explanation);
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

/**
 * Transform API accessibility result to legacy format
 */
function transformAccessibilityToLegacy(result: VisualAccessibilityResult): AccessibilityAnalysisResult {
  return {
    overall_score: result.overallScore,
    level_compliance: result.levelCompliance,
    issues: result.issues.map(i => ({
      criterion: i.criterion,
      severity: i.severity,
      description: i.description,
      location: i.location,
      recommendation: i.recommendation,
    })),
    passed_criteria: result.passedCriteria,
    summary: result.summary,
  };
}

export function useAccessibilityAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      url,
      projectId,
      wcagLevel = 'AA',
    }: {
      url: string;
      projectId?: string;
      wcagLevel?: 'A' | 'AA' | 'AAA';
    }): Promise<AccessibilityAnalysisResult> => {
      // Step 1: Capture a screenshot first
      const captureResult = await visualApi.capture({
        url,
        viewport: { width: 1920, height: 1080 },
        browser: 'chromium',
        projectId,
        name: `accessibility-${url.replace(/https?:\/\//, '').split('/')[0]}`,
      });

      if (!captureResult.id) {
        throw new Error('Screenshot capture failed');
      }

      // Step 2: Analyze the screenshot for accessibility issues
      const analysisResponse = await visualApi.analyzeAccessibility(captureResult.id, wcagLevel);

      if (!analysisResponse.success || !analysisResponse.accessibility) {
        throw new Error('Accessibility analysis failed');
      }

      return transformAccessibilityToLegacy(analysisResponse.accessibility);
    },
    onSuccess: (_data, variables) => {
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: ['accessibility-analysis', variables.projectId] });
      }
    },
  });
}

export function useUpdateBaseline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      comparisonId,
      projectId,
    }: {
      comparisonId: string;
      projectId: string;
    }) => {
      // Approve the comparison and update the baseline
      const response = await visualApi.approveComparison(comparisonId, {
        updateBaseline: true,
        notes: 'Baseline updated from dashboard',
      });

      if (!response.success) {
        throw new Error('Failed to update baseline');
      }

      return {
        comparison: {
          id: comparisonId,
          project_id: projectId,
          status: 'match' as const,
          approved_at: response.reviewedAt,
        } as VisualComparison,
        projectId,
      };
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
 * Transform API browser capture response to legacy format
 */
function transformBrowserCaptureToLegacy(response: BrowserCaptureResponse): CrossBrowserCaptureResponse {
  return {
    success: response.success,
    url: response.url,
    results: response.results.map(r => ({
      id: r.id,
      browser: r.browser,
      success: r.success,
      screenshot_url: r.screenshotUrl,
      error: r.error,
    })),
    captured_at: response.capturedAt,
  };
}

/**
 * Transform API browser compare response to legacy format
 */
function transformBrowserCompareToLegacy(response: BrowserCompareResponse): CrossBrowserCompareResponse {
  return {
    success: response.success,
    url: response.url,
    reference_browser: response.referenceBrowser,
    results: response.results.map(r => ({
      browser: r.browser,
      is_reference: r.isReference,
      reference_browser: r.referenceBrowser,
      match: r.match,
      match_percentage: r.matchPercentage,
      differences: r.differences?.map(d => ({
        type: d.type,
        severity: d.severity,
        description: d.description,
        location: d.location,
      })),
      error: r.error,
    })),
    compared_at: response.comparedAt,
  };
}

/**
 * Hook for running cross-browser visual tests.
 * Captures screenshots in multiple browsers and compares them.
 */
export function useCrossBrowserTest() {
  const queryClient = useQueryClient();

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
      // Step 1: Capture screenshots in multiple browsers using authenticated API
      const captureResponse = await visualApi.captureBrowsers({
        url,
        browsers,
        viewport,
        projectId,
        name,
      });

      const captureResults = transformBrowserCaptureToLegacy(captureResponse);

      // Step 2: Compare browsers if requested and capture was successful
      let compareResults: CrossBrowserCompareResponse | null = null;

      if (compareAfterCapture && captureResults.success) {
        const compareResponse = await visualApi.compareBrowsers({
          url,
          browsers,
          viewport,
          projectId,
          name,
        });

        if (compareResponse) {
          compareResults = transformBrowserCompareToLegacy(compareResponse);
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
