'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { QualityAudit, AccessibilityIssue } from '@/lib/supabase/types';
import { BACKEND_URL } from '@/lib/config/api-endpoints';

// Types for extended accessibility audit data
export interface AccessibilityAuditResult {
  audit: QualityAudit;
  issues: AccessibilityIssue[];
  wcagCompliance: WCAGComplianceStatus;
  issuesByImpact: IssuesByImpact;
  aiExplanations: AIExplanation[];
}

export interface WCAGComplianceStatus {
  levelA: 'pass' | 'fail' | 'partial';
  levelAA: 'pass' | 'fail' | 'partial';
  levelAAA: 'pass' | 'fail' | 'partial';
  levelAIssues: number;
  levelAAIssues: number;
  levelAAAIssues: number;
}

export interface IssuesByImpact {
  critical: AccessibilityIssue[];
  serious: AccessibilityIssue[];
  moderate: AccessibilityIssue[];
  minor: AccessibilityIssue[];
}

export interface AIExplanation {
  issueId: string;
  rule: string;
  plainEnglish: string;
  affectedUsers: string[];
  howToFix: string;
  priority: 'high' | 'medium' | 'low';
}

// WCAG criteria to level mapping
const WCAG_LEVEL_MAP: Record<string, 'A' | 'AA' | 'AAA'> = {
  // Level A
  '1.1.1': 'A',
  '1.2.1': 'A',
  '1.2.2': 'A',
  '1.2.3': 'A',
  '1.3.1': 'A',
  '1.3.2': 'A',
  '1.3.3': 'A',
  '1.4.1': 'A',
  '1.4.2': 'A',
  '2.1.1': 'A',
  '2.1.2': 'A',
  '2.1.4': 'A',
  '2.2.1': 'A',
  '2.2.2': 'A',
  '2.3.1': 'A',
  '2.4.1': 'A',
  '2.4.2': 'A',
  '2.4.3': 'A',
  '2.4.4': 'A',
  '2.5.1': 'A',
  '2.5.2': 'A',
  '2.5.3': 'A',
  '2.5.4': 'A',
  '3.1.1': 'A',
  '3.2.1': 'A',
  '3.2.2': 'A',
  '3.3.1': 'A',
  '3.3.2': 'A',
  '4.1.1': 'A',
  '4.1.2': 'A',
  // Level AA
  '1.2.4': 'AA',
  '1.2.5': 'AA',
  '1.3.4': 'AA',
  '1.3.5': 'AA',
  '1.4.3': 'AA',
  '1.4.4': 'AA',
  '1.4.5': 'AA',
  '1.4.10': 'AA',
  '1.4.11': 'AA',
  '1.4.12': 'AA',
  '1.4.13': 'AA',
  '2.4.5': 'AA',
  '2.4.6': 'AA',
  '2.4.7': 'AA',
  '3.1.2': 'AA',
  '3.2.3': 'AA',
  '3.2.4': 'AA',
  '3.3.3': 'AA',
  '3.3.4': 'AA',
  '4.1.3': 'AA',
  // Level AAA
  '1.2.6': 'AAA',
  '1.2.7': 'AAA',
  '1.2.8': 'AAA',
  '1.2.9': 'AAA',
  '1.3.6': 'AAA',
  '1.4.6': 'AAA',
  '1.4.7': 'AAA',
  '1.4.8': 'AAA',
  '1.4.9': 'AAA',
  '2.1.3': 'AAA',
  '2.2.3': 'AAA',
  '2.2.4': 'AAA',
  '2.2.5': 'AAA',
  '2.2.6': 'AAA',
  '2.3.2': 'AAA',
  '2.3.3': 'AAA',
  '2.4.8': 'AAA',
  '2.4.9': 'AAA',
  '2.4.10': 'AAA',
  '2.5.5': 'AAA',
  '2.5.6': 'AAA',
  '3.1.3': 'AAA',
  '3.1.4': 'AAA',
  '3.1.5': 'AAA',
  '3.1.6': 'AAA',
  '3.2.5': 'AAA',
  '3.3.5': 'AAA',
  '3.3.6': 'AAA',
};

// Human-readable explanations for common accessibility rules
const RULE_EXPLANATIONS: Record<string, { plain: string; affected: string[]; fix: string }> = {
  'image-alt': {
    plain: 'Images on your page are missing text descriptions. Screen reader users will not know what these images show.',
    affected: ['Blind users', 'Users with low vision', 'Users on slow connections'],
    fix: 'Add an alt attribute to each image that describes what the image shows. For decorative images, use alt="".',
  },
  'label': {
    plain: 'Form fields are missing labels. Users will not know what information to enter in these fields.',
    affected: ['Blind users', 'Users with cognitive disabilities', 'Voice control users'],
    fix: 'Add a <label> element connected to each form field, or use aria-label for custom inputs.',
  },
  'button-name': {
    plain: 'Buttons on your page have no accessible name. Screen reader users will hear "button" with no indication of what it does.',
    affected: ['Blind users', 'Users with low vision'],
    fix: 'Add text content inside buttons, or use aria-label for icon-only buttons.',
  },
  'link-name': {
    plain: 'Links on your page have no accessible name. Users will not know where the link goes.',
    affected: ['Blind users', 'Users navigating by links'],
    fix: 'Add descriptive text inside links. Avoid "click here" - use text that describes the destination.',
  },
  'color-contrast': {
    plain: 'Text on your page does not have enough contrast with the background. Users with low vision may not be able to read it.',
    affected: ['Users with low vision', 'Users with color blindness', 'Users in bright sunlight'],
    fix: 'Increase the contrast ratio between text and background colors. Use tools like WebAIM Contrast Checker.',
  },
  'heading-order': {
    plain: 'Headings on your page skip levels (e.g., h1 to h3). This makes it harder to understand the page structure.',
    affected: ['Blind users', 'Users with cognitive disabilities'],
    fix: 'Use headings in order (h1, then h2, then h3). Do not skip levels.',
  },
  'focus-visible': {
    plain: 'Interactive elements do not show a visible focus indicator. Keyboard users cannot see which element is selected.',
    affected: ['Keyboard users', 'Users with motor disabilities'],
    fix: 'Ensure all interactive elements have a visible focus style. Never use outline: none without an alternative.',
  },
  'aria-hidden-focus': {
    plain: 'Elements hidden from screen readers can still receive keyboard focus. This confuses keyboard and screen reader users.',
    affected: ['Blind users', 'Keyboard users'],
    fix: 'Remove tabindex or add tabindex="-1" to elements with aria-hidden="true".',
  },
};

function getWCAGLevel(criteria: string[]): 'A' | 'AA' | 'AAA' | null {
  if (!criteria || criteria.length === 0) return null;

  let highestLevel: 'A' | 'AA' | 'AAA' | null = null;

  for (const criterion of criteria) {
    const level = WCAG_LEVEL_MAP[criterion];
    if (level === 'AAA') {
      highestLevel = 'AAA';
    } else if (level === 'AA' && highestLevel !== 'AAA') {
      highestLevel = 'AA';
    } else if (level === 'A' && !highestLevel) {
      highestLevel = 'A';
    }
  }

  return highestLevel;
}

function calculateWCAGCompliance(issues: AccessibilityIssue[]): WCAGComplianceStatus {
  let levelAIssues = 0;
  let levelAAIssues = 0;
  let levelAAAIssues = 0;

  for (const issue of issues) {
    const level = getWCAGLevel(issue.wcag_criteria || []);
    if (level === 'A') levelAIssues++;
    else if (level === 'AA') levelAAIssues++;
    else if (level === 'AAA') levelAAAIssues++;
  }

  // Determine pass/fail/partial for each level
  // Critical/serious issues mean fail, moderate means partial, only minor means pass
  const criticalOrSerious = issues.filter(i => i.severity === 'critical' || i.severity === 'serious');
  const levelACritical = criticalOrSerious.filter(i => getWCAGLevel(i.wcag_criteria || []) === 'A');
  const levelAACritical = criticalOrSerious.filter(i => getWCAGLevel(i.wcag_criteria || []) === 'AA');
  const levelAAACritical = criticalOrSerious.filter(i => getWCAGLevel(i.wcag_criteria || []) === 'AAA');

  return {
    levelA: levelACritical.length > 0 ? 'fail' : levelAIssues > 0 ? 'partial' : 'pass',
    levelAA: levelAACritical.length > 0 ? 'fail' : levelAAIssues > 0 ? 'partial' : 'pass',
    levelAAA: levelAAACritical.length > 0 ? 'fail' : levelAAAIssues > 0 ? 'partial' : 'pass',
    levelAIssues,
    levelAAIssues,
    levelAAAIssues,
  };
}

function groupIssuesByImpact(issues: AccessibilityIssue[]): IssuesByImpact {
  return {
    critical: issues.filter(i => i.severity === 'critical'),
    serious: issues.filter(i => i.severity === 'serious'),
    moderate: issues.filter(i => i.severity === 'moderate'),
    minor: issues.filter(i => i.severity === 'minor'),
  };
}

function generateAIExplanations(issues: AccessibilityIssue[]): AIExplanation[] {
  return issues.map(issue => {
    const ruleExplanation = RULE_EXPLANATIONS[issue.rule];

    return {
      issueId: issue.id,
      rule: issue.rule,
      plainEnglish: ruleExplanation?.plain || issue.description,
      affectedUsers: ruleExplanation?.affected || ['Users with disabilities'],
      howToFix: ruleExplanation?.fix || issue.suggested_fix || 'Review the element and ensure it meets WCAG guidelines.',
      priority: issue.severity === 'critical' ? 'high' : issue.severity === 'serious' ? 'medium' : 'low',
    };
  });
}

/**
 * Get the latest accessibility audit for a project
 */
export function useAccessibilityAudit(projectId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['accessibility-audit', projectId],
    queryFn: async (): Promise<AccessibilityAuditResult | null> => {
      if (!projectId) return null;

      // Get latest completed audit
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: audits, error: auditError } = await (supabase.from('quality_audits') as any)
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (auditError) throw auditError;
      if (!audits || audits.length === 0) return null;

      const audit = audits[0] as QualityAudit;

      // Get accessibility issues for this audit
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: issues, error: issuesError } = await (supabase.from('accessibility_issues') as any)
        .select('*')
        .eq('audit_id', audit.id)
        .order('severity', { ascending: true });

      if (issuesError) throw issuesError;

      const issueList = (issues || []) as AccessibilityIssue[];

      return {
        audit,
        issues: issueList,
        wcagCompliance: calculateWCAGCompliance(issueList),
        issuesByImpact: groupIssuesByImpact(issueList),
        aiExplanations: generateAIExplanations(issueList),
      };
    },
    enabled: !!projectId,
  });
}

/**
 * Get accessibility audit history for a project
 */
export function useAccessibilityHistory(projectId: string | null, limit = 10) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['accessibility-history', projectId, limit],
    queryFn: async () => {
      if (!projectId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('quality_audits') as any)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as QualityAudit[];
    },
    enabled: !!projectId,
  });
}

/**
 * Trigger a new accessibility audit
 */
export function useRunAccessibilityAudit() {
  const supabase = getSupabaseClient();
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
    }): Promise<AccessibilityAuditResult> => {
      // 1. Create audit with 'running' status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: audit, error: auditError } = await (supabase.from('quality_audits') as any)
        .insert({
          project_id: projectId,
          url,
          status: 'running',
          started_at: new Date().toISOString(),
          triggered_by: triggeredBy || null,
        })
        .select()
        .single();

      if (auditError) throw auditError;

      try {
        // 2. Call backend to run accessibility check
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);

        const response = await fetch(`${BACKEND_URL}/api/v1/accessibility/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            projectId,
            auditId: audit.id,
            wcagLevel: 'AA',
            includeBestPractices: true,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // If backend doesn't have the endpoint, fall back to browser observe
          if (response.status === 404) {
            return await runFallbackAudit(supabase, audit, url, projectId);
          }
          throw new Error(`Accessibility audit failed: ${response.status}`);
        }

        const result = await response.json();

        // 3. Save issues from backend response
        const issues = result.issues || [];

        if (issues.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('accessibility_issues') as any)
            .insert(issues.map((issue: any) => ({
              ...issue,
              audit_id: audit.id,
            })));
        }

        // 4. Update audit with results
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updatedAudit } = await (supabase.from('quality_audits') as any)
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            accessibility_score: result.score || calculateScore(issues),
          })
          .eq('id', audit.id)
          .select()
          .single();

        const issueList = issues as AccessibilityIssue[];

        return {
          audit: updatedAudit as QualityAudit,
          issues: issueList,
          wcagCompliance: calculateWCAGCompliance(issueList),
          issuesByImpact: groupIssuesByImpact(issueList),
          aiExplanations: generateAIExplanations(issueList),
        };
      } catch (error) {
        // Update audit to failed status
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('quality_audits') as any)
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', audit.id);

        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accessibility-audit', data.audit.project_id] });
      queryClient.invalidateQueries({ queryKey: ['accessibility-history', data.audit.project_id] });
      queryClient.invalidateQueries({ queryKey: ['quality-audits', data.audit.project_id] });
      queryClient.invalidateQueries({ queryKey: ['latest-audit', data.audit.project_id] });
    },
  });
}

// Fallback audit using browser observe endpoint
async function runFallbackAudit(
  supabase: ReturnType<typeof getSupabaseClient>,
  audit: QualityAudit,
  url: string,
  projectId: string
): Promise<AccessibilityAuditResult> {
  const response = await fetch(`${BACKEND_URL}/api/v1/browser/observe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      instruction: 'Analyze this page for accessibility issues, missing alt text, form labels, color contrast problems, keyboard navigation issues, and ARIA usage.',
      projectId,
      activityType: 'accessibility_audit',
    }),
  });

  if (!response.ok) {
    throw new Error(`Browser observe failed: ${response.status}`);
  }

  const observeResult = await response.json();
  const actions = observeResult.actions || [];

  // Analyze actions for accessibility patterns
  const issues: Array<{
    rule: string;
    severity: 'critical' | 'serious' | 'moderate' | 'minor';
    element_selector: string;
    description: string;
    suggested_fix: string;
    wcag_criteria: string[];
  }> = [];

  // Check for elements that might have accessibility issues
  const imageActions = actions.filter((a: any) =>
    a.selector?.includes('img') || a.description?.toLowerCase().includes('image')
  );
  const inputActions = actions.filter((a: any) =>
    a.selector?.includes('input') || a.description?.toLowerCase().includes('input')
  );
  const buttonActions = actions.filter((a: any) =>
    a.selector?.includes('button') || a.description?.toLowerCase().includes('button')
  );
  const linkActions = actions.filter((a: any) =>
    a.selector?.includes('a.') || a.selector?.includes('a[') || a.description?.toLowerCase().includes('link')
  );

  // Images without descriptive alt
  imageActions.forEach((img: any) => {
    if (!img.description || img.description === 'Image' || img.description.length < 10) {
      issues.push({
        rule: 'image-alt',
        severity: 'critical',
        element_selector: img.selector || 'img',
        description: 'Image is missing descriptive alt text. Screen reader users will not know what this image shows.',
        suggested_fix: 'Add an alt attribute that describes the image content, or alt="" for decorative images.',
        wcag_criteria: ['1.1.1'],
      });
    }
  });

  // Inputs without labels
  inputActions.forEach((input: any) => {
    if (!input.description || input.description === 'Input' || input.description.length < 5) {
      issues.push({
        rule: 'label',
        severity: 'serious',
        element_selector: input.selector || 'input',
        description: 'Form input is missing an associated label. Users will not know what information to enter.',
        suggested_fix: 'Add a <label> element connected to this input, or use aria-label for custom inputs.',
        wcag_criteria: ['1.3.1', '3.3.2'],
      });
    }
  });

  // Buttons without accessible names
  buttonActions.forEach((btn: any) => {
    if (!btn.description || btn.description === 'Button' || btn.description.length < 5) {
      issues.push({
        rule: 'button-name',
        severity: 'critical',
        element_selector: btn.selector || 'button',
        description: 'Button has no accessible name. Screen reader users will not know what this button does.',
        suggested_fix: 'Add text content inside the button, or use aria-label for icon-only buttons.',
        wcag_criteria: ['4.1.2'],
      });
    }
  });

  // Links without accessible names
  linkActions.forEach((link: any) => {
    if (!link.description || link.description === 'Link' || link.description.length < 5) {
      issues.push({
        rule: 'link-name',
        severity: 'serious',
        element_selector: link.selector || 'a',
        description: 'Link has no accessible name. Users will not know where this link goes.',
        suggested_fix: 'Add descriptive text inside the link that describes the destination.',
        wcag_criteria: ['2.4.4'],
      });
    }
  });

  // Save issues
  if (issues.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('accessibility_issues') as any)
      .insert(issues.map(issue => ({
        ...issue,
        audit_id: audit.id,
      })));
  }

  const accessibilityScore = calculateScore(issues);

  // Update audit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updatedAudit } = await (supabase.from('quality_audits') as any)
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      accessibility_score: accessibilityScore,
    })
    .eq('id', audit.id)
    .select()
    .single();

  // Map to AccessibilityIssue type
  const issueList = issues.map((issue, index) => ({
    id: `temp-${index}`,
    audit_id: audit.id,
    rule: issue.rule,
    severity: issue.severity,
    element_selector: issue.element_selector,
    description: issue.description,
    suggested_fix: issue.suggested_fix,
    wcag_criteria: issue.wcag_criteria,
    created_at: new Date().toISOString(),
  })) as AccessibilityIssue[];

  return {
    audit: updatedAudit as QualityAudit,
    issues: issueList,
    wcagCompliance: calculateWCAGCompliance(issueList),
    issuesByImpact: groupIssuesByImpact(issueList),
    aiExplanations: generateAIExplanations(issueList),
  };
}

function calculateScore(issues: Array<{ severity: string }>): number {
  if (!issues || issues.length === 0) return 100;

  const deductions: Record<string, number> = {
    critical: 25,
    serious: 15,
    moderate: 5,
    minor: 2,
  };

  const totalDeduction = issues.reduce(
    (sum, issue) => sum + (deductions[issue.severity] || 0),
    0
  );

  return Math.max(0, 100 - totalDeduction);
}
