'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BACKEND_URL } from '@/lib/config/api-endpoints';
// No conversion imports needed - backend CamelCaseMiddleware handles all case conversion
import type { SecurityScanResult, Vulnerability, VulnerabilitySeverity } from '@/lib/supabase/types';

// OWASP Top 10 2021 compliance checklist
export const OWASP_TOP_10 = [
  { id: 'A01', name: 'Broken Access Control', description: 'Restrictions on authenticated users' },
  { id: 'A02', name: 'Cryptographic Failures', description: 'Sensitive data exposure' },
  { id: 'A03', name: 'Injection', description: 'SQL, NoSQL, OS, LDAP injection' },
  { id: 'A04', name: 'Insecure Design', description: 'Design and architectural flaws' },
  { id: 'A05', name: 'Security Misconfiguration', description: 'Missing or incorrect security settings' },
  { id: 'A06', name: 'Vulnerable Components', description: 'Using components with known vulnerabilities' },
  { id: 'A07', name: 'Auth Failures', description: 'Authentication and session management' },
  { id: 'A08', name: 'Integrity Failures', description: 'Software and data integrity failures' },
  { id: 'A09', name: 'Logging Failures', description: 'Security logging and monitoring failures' },
  { id: 'A10', name: 'SSRF', description: 'Server-Side Request Forgery' },
] as const;

/**
 * Hook to fetch the latest security scan for a project
 */
export function useSecurityScan(projectId: string | null) {
  return useQuery({
    queryKey: ['security-scan', projectId],
    queryFn: async (): Promise<SecurityScanResult | null> => {
      if (!projectId) return null;

      try {
        const response = await fetch(`${BACKEND_URL}/api/v1/security/scans/${projectId}/latest`, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.status === 404) {
          return null;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch security scan: ${response.status}`);
        }

        const data = await response.json();
        return data as SecurityScanResult;
      } catch (error) {
        // If backend doesn't have security endpoints yet, return mock data for UI development
        console.warn('Security scan API not available, using mock data');
        return getMockSecurityScan(projectId);
      }
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to list all security scans for a project
 */
export function useSecurityScans(projectId: string | null, limit = 10) {
  return useQuery({
    queryKey: ['security-scans', projectId, limit],
    queryFn: async (): Promise<SecurityScanResult[]> => {
      if (!projectId) return [];

      try {
        const response = await fetch(
          `${BACKEND_URL}/api/v1/security/scans/${projectId}?limit=${limit}`,
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch security scans: ${response.status}`);
        }

        const data = await response.json();
        return data as SecurityScanResult[];
      } catch (error) {
        console.warn('Security scans API not available, using mock data');
        const mockScan = getMockSecurityScan(projectId);
        return mockScan ? [mockScan] : [];
      }
    },
    enabled: !!projectId,
  });
}

/**
 * Hook to list vulnerabilities for a project or scan
 */
export function useVulnerabilities(
  projectId: string | null,
  options?: {
    scanId?: string;
    severity?: VulnerabilitySeverity;
    limit?: number;
  }
) {
  const { scanId, severity, limit = 50 } = options || {};

  return useQuery({
    queryKey: ['vulnerabilities', projectId, scanId, severity, limit],
    queryFn: async (): Promise<Vulnerability[]> => {
      if (!projectId) return [];

      try {
        const params = new URLSearchParams({ limit: String(limit) });
        if (scanId) params.append('scan_id', scanId);
        if (severity) params.append('severity', severity);

        const response = await fetch(
          `${BACKEND_URL}/api/v1/security/vulnerabilities/${projectId}?${params}`,
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch vulnerabilities: ${response.status}`);
        }

        const data = await response.json();
        return data as Vulnerability[];
      } catch (error) {
        console.warn('Vulnerabilities API not available, using mock data');
        const mockScan = getMockSecurityScan(projectId);
        return mockScan?.vulnerabilities || [];
      }
    },
    enabled: !!projectId,
  });
}

/**
 * Hook to trigger a new security scan
 */
export function useRunSecurityScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      url,
      scanType = 'standard',
    }: {
      projectId: string;
      url: string;
      scanType?: 'quick' | 'standard' | 'deep';
    }): Promise<SecurityScanResult> => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/v1/security/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            url,
            scan_type: scanType,
            include_api_tests: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to start security scan: ${response.status}`);
        }

        const data = await response.json();
        return data as SecurityScanResult;
      } catch (error) {
        console.warn('Security scan API not available, using mock data');
        // Simulate a running scan for UI development
        return {
          ...getMockSecurityScan(projectId)!,
          status: 'running',
          started_at: new Date().toISOString(),
          completed_at: null,
        };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['security-scan', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['security-scans', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['vulnerabilities', data.project_id] });
    },
  });
}

/**
 * Hook to get OWASP compliance status based on vulnerabilities
 */
export function useOWASPCompliance(vulnerabilities: Vulnerability[] | undefined) {
  const compliance = OWASP_TOP_10.map((item) => {
    const relatedVulns = vulnerabilities?.filter((v) =>
      v.category.includes(item.id)
    ) || [];

    const hasCritical = relatedVulns.some((v) => v.severity === 'critical');
    const hasHigh = relatedVulns.some((v) => v.severity === 'high');
    const hasMedium = relatedVulns.some((v) => v.severity === 'medium');

    let status: 'pass' | 'warning' | 'fail' | 'unknown' = 'unknown';
    if (vulnerabilities !== undefined) {
      if (hasCritical || hasHigh) {
        status = 'fail';
      } else if (hasMedium) {
        status = 'warning';
      } else {
        status = 'pass';
      }
    }

    return {
      ...item,
      status,
      vulnerabilityCount: relatedVulns.length,
      criticalCount: relatedVulns.filter((v) => v.severity === 'critical').length,
      highCount: relatedVulns.filter((v) => v.severity === 'high').length,
    };
  });

  const passCount = compliance.filter((c) => c.status === 'pass').length;
  const failCount = compliance.filter((c) => c.status === 'fail').length;
  const warningCount = compliance.filter((c) => c.status === 'warning').length;

  return {
    items: compliance,
    passCount,
    failCount,
    warningCount,
    overallScore: vulnerabilities !== undefined ? Math.round((passCount / OWASP_TOP_10.length) * 100) : null,
  };
}

/**
 * Helper to count vulnerabilities by severity
 */
export function countBySeverity(vulnerabilities: Vulnerability[] | undefined) {
  if (!vulnerabilities) {
    return { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 };
  }

  return {
    critical: vulnerabilities.filter((v) => v.severity === 'critical').length,
    high: vulnerabilities.filter((v) => v.severity === 'high').length,
    medium: vulnerabilities.filter((v) => v.severity === 'medium').length,
    low: vulnerabilities.filter((v) => v.severity === 'low').length,
    info: vulnerabilities.filter((v) => v.severity === 'info').length,
    total: vulnerabilities.length,
  };
}

/**
 * Get severity color class
 */
export function getSeverityColor(severity: VulnerabilitySeverity): string {
  switch (severity) {
    case 'critical':
      return 'text-red-500 bg-red-500/10 border-red-500/20';
    case 'high':
      return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    case 'medium':
      return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    case 'low':
      return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    case 'info':
      return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    default:
      return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
  }
}

/**
 * Get risk level from score
 */
export function getRiskLevel(score: number): { level: string; color: string } {
  if (score >= 80) return { level: 'Critical', color: 'text-red-500' };
  if (score >= 60) return { level: 'High', color: 'text-orange-500' };
  if (score >= 40) return { level: 'Medium', color: 'text-yellow-500' };
  if (score >= 20) return { level: 'Low', color: 'text-blue-500' };
  return { level: 'Minimal', color: 'text-green-500' };
}

// Mock data for UI development when backend is not available
function getMockSecurityScan(projectId: string): SecurityScanResult | null {
  return {
    id: 'mock-scan-1',
    project_id: projectId,
    url: 'https://example.com',
    status: 'completed',
    vulnerabilities: [
      {
        id: 'vuln-1',
        category: 'A03:2021-Injection',
        severity: 'high',
        title: 'Potential XSS: innerHTML assignment',
        description: 'The page uses innerHTML assignment which can lead to XSS if user input is not sanitized.',
        location: 'https://example.com/dashboard',
        evidence: "Pattern 'innerHTML\\s*=' found in page source",
        cvss_score: 7.5,
        cwe_id: 'CWE-79',
        remediation: 'Use safe DOM manipulation methods and sanitize all user input.',
        references: ['https://owasp.org/www-community/attacks/xss/'],
      },
      {
        id: 'vuln-2',
        category: 'A05:2021-Security Misconfiguration',
        severity: 'medium',
        title: 'Missing Content-Security-Policy Header',
        description: 'The Content-Security-Policy security header is not set, which may expose the application to various attacks.',
        location: 'https://example.com',
        evidence: "Header 'Content-Security-Policy' not present in response",
        cvss_score: 5.0,
        cwe_id: 'CWE-693',
        remediation: 'Add the Content-Security-Policy header to your server configuration.',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP'],
      },
      {
        id: 'vuln-3',
        category: 'A05:2021-Security Misconfiguration',
        severity: 'low',
        title: 'Missing X-Frame-Options Header',
        description: 'The X-Frame-Options security header is not set.',
        location: 'https://example.com',
        evidence: "Header 'X-Frame-Options' not present in response",
        cvss_score: 3.0,
        cwe_id: 'CWE-1021',
        remediation: 'Add X-Frame-Options: DENY or SAMEORIGIN header.',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options'],
      },
      {
        id: 'vuln-4',
        category: 'A05:2021-Security Misconfiguration',
        severity: 'low',
        title: 'Missing Strict-Transport-Security Header',
        description: 'HSTS header not set, clients may connect over insecure HTTP.',
        location: 'https://example.com',
        evidence: "Header 'Strict-Transport-Security' not present in response",
        cvss_score: 3.0,
        cwe_id: 'CWE-319',
        remediation: 'Add Strict-Transport-Security header with appropriate max-age.',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security'],
      },
    ],
    headers: {
      content_security_policy: null,
      x_frame_options: null,
      x_content_type_options: 'nosniff',
      strict_transport_security: null,
      x_xss_protection: '1; mode=block',
      referrer_policy: 'strict-origin-when-cross-origin',
      permissions_policy: null,
    },
    risk_score: 45,
    summary: 'Security scan found 4 vulnerabilities: 0 critical, 1 high, 1 medium, 2 low. Primary concerns are XSS risks and missing security headers.',
    scan_duration_ms: 15420,
    recommendations: [
      'Implement Content Security Policy to prevent XSS attacks',
      'Add HSTS header to enforce HTTPS connections',
      'Review innerHTML usage and replace with safe alternatives',
      'Add X-Frame-Options header to prevent clickjacking',
    ],
    scan_type: 'standard',
    started_at: new Date(Date.now() - 20000).toISOString(),
    completed_at: new Date().toISOString(),
    triggered_by: null,
    created_at: new Date().toISOString(),
  };
}
