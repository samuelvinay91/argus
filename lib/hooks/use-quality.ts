'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QualityAudit, AccessibilityIssue } from '@/lib/supabase/types';
import {
  accessibilityApi,
  QualityAuditApi,
  AccessibilityIssueApi,
  BACKEND_URL,
  authenticatedFetch,
} from '@/lib/api-client';

// ============================================================================
// Transform Functions (API snake_case -> Legacy types)
// ============================================================================

/**
 * Transform API audit response to legacy Supabase format.
 * Since the API and Supabase types both use snake_case, this is mostly a pass-through.
 */
function transformAuditToLegacy(audit: QualityAuditApi): QualityAudit {
  return {
    id: audit.id,
    project_id: audit.project_id,
    url: audit.url,
    status: audit.status,
    accessibility_score: audit.accessibility_score,
    performance_score: audit.performance_score,
    best_practices_score: audit.best_practices_score,
    seo_score: audit.seo_score,
    lcp_ms: audit.lcp_ms,
    fid_ms: audit.fid_ms,
    cls: audit.cls,
    ttfb_ms: audit.ttfb_ms,
    fcp_ms: audit.fcp_ms,
    tti_ms: audit.tti_ms,
    started_at: audit.started_at,
    completed_at: audit.completed_at,
    triggered_by: audit.triggered_by,
    created_at: audit.created_at,
  };
}

/**
 * Transform API issue response to legacy Supabase format.
 * Since the API and Supabase types both use snake_case, this is mostly a pass-through.
 */
function transformIssueToLegacy(issue: AccessibilityIssueApi): AccessibilityIssue {
  return {
    id: issue.id,
    audit_id: issue.audit_id,
    rule: issue.rule,
    severity: issue.severity,
    element_selector: issue.element_selector,
    description: issue.description,
    suggested_fix: issue.suggested_fix,
    wcag_criteria: issue.wcag_criteria,
    created_at: issue.created_at,
  };
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch quality audits for a project
 */
export function useQualityAudits(projectId: string | null, limit = 10) {
  return useQuery({
    queryKey: ['quality-audits', projectId, limit],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await accessibilityApi.getAuditHistory(projectId, { limit });
      return response.audits.map(transformAuditToLegacy);
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch the latest completed audit with its accessibility issues
 */
export function useLatestAudit(projectId: string | null) {
  return useQuery({
    queryKey: ['latest-audit', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const response = await accessibilityApi.getLatestAudit(projectId);

      if (!response) return null;

      return {
        audit: transformAuditToLegacy(response.audit),
        issues: response.issues.map(transformIssueToLegacy),
      };
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch accessibility issues for a specific audit
 */
export function useAccessibilityIssues(auditId: string | null) {
  return useQuery({
    queryKey: ['accessibility-issues', auditId],
    queryFn: async () => {
      if (!auditId) return [];

      const response = await accessibilityApi.getIssues(auditId);
      return response.issues.map(transformIssueToLegacy);
    },
    enabled: !!auditId,
  });
}

/**
 * Start a quality/accessibility audit
 *
 * This mutation:
 * 1. Calls the backend to run the audit
 * 2. Calls browser/observe to analyze the page
 * 3. Creates issues and updates the audit with results
 */
export function useStartQualityAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      url,
      triggeredBy,
    }: {
      projectId: string;
      url: string;
      triggeredBy?: string | null;
    }) => {
      // 1. Start the audit via the backend API
      const startResponse = await accessibilityApi.runAudit({
        projectId,
        url,
        wcagLevel: 'AA',
        includeBestPractices: true,
        triggeredBy,
      });

      if (!startResponse.success || !startResponse.audit_id) {
        throw new Error(startResponse.message || 'Failed to start audit');
      }

      const auditId = startResponse.audit_id;

      try {
        // 2. Call backend browser pool to observe the page
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await authenticatedFetch(`${BACKEND_URL}/api/v1/browser/observe`, {
          method: 'POST',
          body: JSON.stringify({
            url,
            instruction: 'Analyze this page for accessibility issues, missing alt text, form labels, and semantic HTML problems',
            projectId,
            activityType: 'quality_audit',
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Worker returned ${response.status}`);
        }

        const observeResult = await response.json();

        // Worker returns 'actions' not 'elements'
        const actions = observeResult.actions || [];

        // 3. Analyze actions for accessibility patterns
        const issues: Array<{
          rule: string;
          severity: 'critical' | 'serious' | 'moderate' | 'minor';
          elementSelector: string;
          description: string;
          suggestedFix: string;
          wcagCriteria: string[];
        }> = [];

        // Check for elements that might have accessibility issues based on selectors/descriptions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const imageActions = actions.filter((a: any) =>
          a.selector?.includes('img') || a.description?.toLowerCase().includes('image')
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inputActions = actions.filter((a: any) =>
          a.selector?.includes('input') || a.description?.toLowerCase().includes('input')
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const buttonActions = actions.filter((a: any) =>
          a.selector?.includes('button') || a.description?.toLowerCase().includes('button')
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const linkActions = actions.filter((a: any) =>
          a.selector?.includes('a.') || a.selector?.includes('a[') || a.description?.toLowerCase().includes('link')
        );

        // For images without descriptive alt in the description
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        imageActions.forEach((img: any) => {
          if (!img.description || img.description === 'Image' || img.description.length < 10) {
            issues.push({
              rule: 'image-alt',
              severity: 'critical',
              elementSelector: img.selector || 'img',
              description: 'Image may be missing descriptive alt text',
              suggestedFix: 'Add an alt attribute describing the image content',
              wcagCriteria: ['1.1.1'],
            });
          }
        });

        // Check for generic input descriptions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputActions.forEach((input: any) => {
          if (!input.description || input.description === 'Input' || input.description.length < 5) {
            issues.push({
              rule: 'label',
              severity: 'serious',
              elementSelector: input.selector || 'input',
              description: 'Form input may be missing an associated label',
              suggestedFix: 'Add a <label> element or aria-label attribute',
              wcagCriteria: ['1.3.1', '3.3.2'],
            });
          }
        });

        // Check for generic button descriptions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buttonActions.forEach((btn: any) => {
          if (!btn.description || btn.description === 'Button' || btn.description.length < 5) {
            issues.push({
              rule: 'button-name',
              severity: 'critical',
              elementSelector: btn.selector || 'button',
              description: 'Button may not have accessible name',
              suggestedFix: 'Add text content or aria-label to the button',
              wcagCriteria: ['4.1.2'],
            });
          }
        });

        // Check for generic link descriptions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        linkActions.forEach((link: any) => {
          if (!link.description || link.description === 'Link' || link.description.length < 5) {
            issues.push({
              rule: 'link-name',
              severity: 'serious',
              elementSelector: link.selector || 'a',
              description: 'Link may not have accessible name',
              suggestedFix: 'Add text content or aria-label to the link',
              wcagCriteria: ['2.4.4'],
            });
          }
        });

        // Use actions as elements for counting
        const elements = actions;

        // 4. Save accessibility issues via API
        if (issues.length > 0) {
          await accessibilityApi.createIssuesBatch(auditId, issues);
        }

        // 5. Calculate scores based on issues
        const criticalCount = issues.filter(i => i.severity === 'critical').length;
        const seriousCount = issues.filter(i => i.severity === 'serious').length;
        const moderateCount = issues.filter(i => i.severity === 'moderate').length;

        // Simple scoring - 100 minus penalties
        const accessibilityScore = Math.max(0, 100 - (criticalCount * 20) - (seriousCount * 10) - (moderateCount * 5));

        // Other scores are simulated based on page analysis
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasSemanticHTML = elements.some((el: any) =>
          ['HEADER', 'NAV', 'MAIN', 'FOOTER', 'ARTICLE', 'SECTION'].includes(el.tagName)
        );
        const bestPracticesScore = hasSemanticHTML ? 85 : 65;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const seoScore = elements.some((el: any) => el.tagName === 'H1') ? 90 : 70;

        // 6. Update audit with results via API
        await accessibilityApi.updateAudit(auditId, {
          status: 'completed',
          accessibilityScore,
        });

        // 7. Fetch the updated audit to return
        const updatedAuditResponse = await accessibilityApi.getAudit(auditId);

        return {
          audit: transformAuditToLegacy(updatedAuditResponse.audit),
          issues: updatedAuditResponse.issues.map(transformIssueToLegacy),
        };
      } catch (error) {
        // Update audit to failed status via API
        await accessibilityApi.updateAudit(auditId, { status: 'failed' });
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quality-audits', data.audit.project_id] });
      queryClient.invalidateQueries({ queryKey: ['latest-audit', data.audit.project_id] });
    },
  });
}
