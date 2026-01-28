'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Shield,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Play,
  XCircle,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useProjects } from '@/lib/hooks/use-projects';
import {
  useSecurityScan,
  useRunSecurityScan,
  useOWASPCompliance,
  countBySeverity,
  getSeverityColor,
  getRiskLevel,
} from '@/lib/hooks/use-security';
import { Badge } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import { NoProjectsEmptyState } from '@/components/ui/empty-state';
import type { SecurityScanResult, Vulnerability, VulnerabilitySeverity } from '@/lib/supabase/types';

// Risk Score Gauge Component
function RiskScoreGauge({ score, size = 'lg' }: { score: number | null; size?: 'sm' | 'lg' }) {
  const radius = size === 'lg' ? 80 : 50;
  const strokeWidth = size === 'lg' ? 12 : 8;
  const circumference = 2 * Math.PI * radius;
  const progress = score !== null ? (score / 100) * circumference : 0;

  const { level, color } = score !== null ? getRiskLevel(score) : { level: '-', color: 'text-muted-foreground' };

  // Color based on risk score (lower is better for security)
  const getStrokeColor = (s: number) => {
    if (s >= 80) return '#ef4444'; // red
    if (s >= 60) return '#f97316'; // orange
    if (s >= 40) return '#eab308'; // yellow
    if (s >= 20) return '#3b82f6'; // blue
    return '#22c55e'; // green
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg
          width={radius * 2 + strokeWidth}
          height={radius * 2 + strokeWidth}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth / 2}
            cy={radius + strokeWidth / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/30"
          />
          {/* Progress circle */}
          <circle
            cx={radius + strokeWidth / 2}
            cy={radius + strokeWidth / 2}
            r={radius}
            fill="none"
            stroke={score !== null ? getStrokeColor(score) : '#6b7280'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold', size === 'lg' ? 'text-4xl' : 'text-2xl', color)}>
            {score !== null ? score : '-'}
          </span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Risk Score
          </span>
        </div>
      </div>
      <div className={cn('mt-2 font-medium', color)}>{level} Risk</div>
    </div>
  );
}

// Severity Badge Component
function SeverityBadge({ severity, count }: { severity: VulnerabilitySeverity; count: number }) {
  const icons: Record<VulnerabilitySeverity, React.ReactNode> = {
    critical: <AlertOctagon className="h-4 w-4" />,
    high: <ShieldAlert className="h-4 w-4" />,
    medium: <AlertTriangle className="h-4 w-4" />,
    low: <Info className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />,
  };

  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border', getSeverityColor(severity))}>
      {icons[severity]}
      <span className="font-medium capitalize">{severity}</span>
      <span className="font-bold">{count}</span>
    </div>
  );
}

// Vulnerability Card Component
function VulnerabilityCard({ vulnerability, isExpanded, onToggle }: {
  vulnerability: Vulnerability;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={cn('rounded-lg border transition-all', getSeverityColor(vulnerability.severity))}>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-3 text-left"
      >
        <div className="mt-0.5">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{vulnerability.title}</span>
            <Badge
              variant={
                vulnerability.severity === 'critical' ? 'error' :
                vulnerability.severity === 'high' ? 'warning' :
                vulnerability.severity === 'medium' ? 'warning' :
                'info'
              }
            >
              {vulnerability.severity.toUpperCase()}
            </Badge>
            {vulnerability.cvss_score > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                CVSS {vulnerability.cvss_score.toFixed(1)}
              </span>
            )}
            {vulnerability.cwe_id && (
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {vulnerability.cwe_id}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {vulnerability.description}
          </p>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 space-y-4 border-t border-border/50 mt-2">
          <div>
            <h4 className="text-sm font-medium mb-1">Description</h4>
            <p className="text-sm text-muted-foreground">{vulnerability.description}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-1">Location</h4>
            <code className="text-xs bg-muted px-2 py-1 rounded block overflow-x-auto">
              {vulnerability.location}
            </code>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-1">Evidence</h4>
            <code className="text-xs bg-muted px-2 py-1 rounded block overflow-x-auto">
              {vulnerability.evidence}
            </code>
          </div>

          {vulnerability.remediation && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-medium text-primary">AI Fix Suggestion</h4>
              </div>
              <p className="text-sm">{vulnerability.remediation}</p>
            </div>
          )}

          {vulnerability.references.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">References</h4>
              <div className="space-y-1">
                {vulnerability.references.map((ref, i) => (
                  <a
                    key={i}
                    href={ref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {ref}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// OWASP Compliance Checklist Component
function OWASPChecklist({ vulnerabilities }: { vulnerabilities: Vulnerability[] | undefined }) {
  const compliance = useOWASPCompliance(vulnerabilities);

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">OWASP Top 10 Compliance</h3>
        {compliance.overallScore !== null && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Score:</span>
            <span className={cn(
              'font-bold',
              compliance.overallScore >= 80 ? 'text-green-500' :
              compliance.overallScore >= 60 ? 'text-yellow-500' :
              'text-red-500'
            )}>
              {compliance.overallScore}%
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {compliance.items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'p-2 rounded-lg border flex items-center gap-2',
              item.status === 'pass' && 'bg-green-500/5 border-green-500/20',
              item.status === 'warning' && 'bg-yellow-500/5 border-yellow-500/20',
              item.status === 'fail' && 'bg-red-500/5 border-red-500/20',
              item.status === 'unknown' && 'bg-muted/50 border-border'
            )}
          >
            {item.status === 'pass' && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
            {item.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
            {item.status === 'fail' && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
            {item.status === 'unknown' && <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{item.id}: {item.name}</div>
              {item.vulnerabilityCount > 0 && (
                <div className="text-xs text-muted-foreground">
                  {item.criticalCount > 0 && <span className="text-red-500">{item.criticalCount} critical</span>}
                  {item.criticalCount > 0 && item.highCount > 0 && ', '}
                  {item.highCount > 0 && <span className="text-orange-500">{item.highCount} high</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Security Headers Status Component
function SecurityHeadersStatus({ headers }: { headers: SecurityScanResult['headers'] | undefined }) {
  if (!headers) return null;

  const headersList = [
    { name: 'Content-Security-Policy', value: headers.content_security_policy, critical: true },
    { name: 'Strict-Transport-Security', value: headers.strict_transport_security, critical: true },
    { name: 'X-Frame-Options', value: headers.x_frame_options, critical: false },
    { name: 'X-Content-Type-Options', value: headers.x_content_type_options, critical: false },
    { name: 'Referrer-Policy', value: headers.referrer_policy, critical: false },
    { name: 'Permissions-Policy', value: headers.permissions_policy, critical: false },
  ];

  const presentCount = headersList.filter(h => h.value).length;

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Security Headers</h3>
        <span className="text-sm text-muted-foreground">
          {presentCount}/{headersList.length} configured
        </span>
      </div>

      <div className="space-y-2">
        {headersList.map((header) => (
          <div
            key={header.name}
            className={cn(
              'flex items-center justify-between p-2 rounded text-sm',
              header.value ? 'bg-green-500/5' : header.critical ? 'bg-red-500/5' : 'bg-yellow-500/5'
            )}
          >
            <div className="flex items-center gap-2">
              {header.value ? (
                <ShieldCheck className="h-4 w-4 text-green-500" />
              ) : (
                <ShieldAlert className={cn('h-4 w-4', header.critical ? 'text-red-500' : 'text-yellow-500')} />
              )}
              <span className={header.value ? 'text-foreground' : 'text-muted-foreground'}>
                {header.name}
              </span>
            </div>
            {header.value ? (
              <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                {header.value}
              </span>
            ) : (
              <span className={cn('text-xs', header.critical ? 'text-red-500' : 'text-yellow-500')}>
                Missing
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SecurityPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [scanUrl, setScanUrl] = useState('');
  const [expandedVulns, setExpandedVulns] = useState<Set<string>>(new Set());
  const [scanType, setScanType] = useState<'quick' | 'standard' | 'deep'>('standard');

  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const currentProject = selectedProjectId || projects[0]?.id;
  const currentProjectData = projects.find((p) => p.id === currentProject);

  const { data: scan, isLoading: scanLoading } = useSecurityScan(currentProject || null);
  const runScan = useRunSecurityScan();

  const effectiveUrl = scanUrl || currentProjectData?.app_url || 'https://example.com';
  const severityCounts = countBySeverity(scan?.vulnerabilities);

  const handleRunScan = async () => {
    if (!currentProject) return;
    try {
      await runScan.mutateAsync({
        projectId: currentProject,
        url: effectiveUrl,
        scanType,
      });
    } catch (error) {
      console.error('Failed to run security scan:', error);
    }
  };

  const toggleVuln = (id: string) => {
    setExpandedVulns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isRunning = runScan.isPending || scan?.status === 'running';
  const isLoading = projectsLoading || scanLoading;

  if (!projectsLoading && projects.length === 0) {
    return (
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-w-0 flex items-center justify-center">
          <NoProjectsEmptyState />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="font-semibold">Security Testing</h1>
          <select
            value={currentProject || ''}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          {scan?.completed_at && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Last scan: {formatDistanceToNow(new Date(scan.completed_at), { addSuffix: true })}
            </div>
          )}
          <div className="flex-1" />
          <Input
            value={effectiveUrl}
            onChange={(e) => setScanUrl(e.target.value)}
            placeholder="URL to scan"
            className="w-64 h-9"
          />
          <select
            value={scanType}
            onChange={(e) => setScanType(e.target.value as 'quick' | 'standard' | 'deep')}
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="quick">Quick Scan</option>
            <option value="standard">Standard Scan</option>
            <option value="deep">Deep Scan</option>
          </select>
          <Button size="sm" onClick={handleRunScan} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Scan
              </>
            )}
          </Button>
        </header>

        <div className="p-6 space-y-6">
          {/* Top Section: Risk Score + Severity Counts */}
          <div className="grid grid-cols-12 gap-6">
            {/* Risk Score Gauge */}
            <div className="col-span-4 p-6 rounded-lg border bg-card flex items-center justify-center">
              <RiskScoreGauge score={scan?.risk_score ?? null} />
            </div>

            {/* Vulnerability Counts by Severity */}
            <div className="col-span-8 p-6 rounded-lg border bg-card">
              <h3 className="font-medium mb-4">Vulnerabilities by Severity</h3>
              <div className="grid grid-cols-5 gap-3">
                <SeverityBadge severity="critical" count={severityCounts.critical} />
                <SeverityBadge severity="high" count={severityCounts.high} />
                <SeverityBadge severity="medium" count={severityCounts.medium} />
                <SeverityBadge severity="low" count={severityCounts.low} />
                <SeverityBadge severity="info" count={severityCounts.info} />
              </div>

              {scan?.summary && (
                <div className="mt-4 p-3 rounded-lg bg-muted/50">
                  <p className="text-sm">{scan.summary}</p>
                </div>
              )}
            </div>
          </div>

          {/* Middle Section: OWASP + Headers */}
          <div className="grid grid-cols-2 gap-6">
            <OWASPChecklist vulnerabilities={scan?.vulnerabilities} />
            <SecurityHeadersStatus headers={scan?.headers} />
          </div>

          {/* AI Recommendations */}
          {scan?.recommendations && scan.recommendations.length > 0 && (
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-medium">AI Recommendations</h3>
              </div>
              <div className="space-y-2">
                {scan.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                      {i + 1}
                    </span>
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vulnerability List */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Vulnerabilities ({severityCounts.total})</h3>
              {severityCounts.total > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (expandedVulns.size === scan?.vulnerabilities.length) {
                      setExpandedVulns(new Set());
                    } else {
                      setExpandedVulns(new Set(scan?.vulnerabilities.map(v => v.id)));
                    }
                  }}
                >
                  {expandedVulns.size === scan?.vulnerabilities.length ? 'Collapse All' : 'Expand All'}
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : scan?.vulnerabilities && scan.vulnerabilities.length > 0 ? (
                // Sort by severity: critical > high > medium > low > info
                [...scan.vulnerabilities]
                  .sort((a, b) => {
                    const order: Record<VulnerabilitySeverity, number> = {
                      critical: 0,
                      high: 1,
                      medium: 2,
                      low: 3,
                      info: 4,
                    };
                    return order[a.severity] - order[b.severity];
                  })
                  .map((vuln) => (
                    <VulnerabilityCard
                      key={vuln.id}
                      vulnerability={vuln}
                      isExpanded={expandedVulns.has(vuln.id)}
                      onToggle={() => toggleVuln(vuln.id)}
                    />
                  ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {scan ? (
                    <div className="flex flex-col items-center gap-2">
                      <ShieldCheck className="h-12 w-12 text-green-500" />
                      <p className="font-medium text-foreground">No vulnerabilities found!</p>
                      <p className="text-sm">Your application passed all security checks.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Shield className="h-12 w-12 text-muted-foreground/50" />
                      <p>Run a security scan to detect vulnerabilities.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
