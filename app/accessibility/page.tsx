'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import {
  Accessibility,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  ExternalLink,
  Eye,
  Keyboard,
  Users,
  Info,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
} from 'lucide-react';
import { useProjects } from '@/lib/hooks/use-projects';
import {
  useAccessibilityAudit,
  useAccessibilityHistory,
  useRunAccessibilityAudit,
  type WCAGComplianceStatus,
  type IssuesByImpact,
  type AIExplanation,
} from '@/lib/hooks/use-accessibility';
import { Badge } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { NoProjectsEmptyState } from '@/components/ui/empty-state';

// Score display with color coding
function ScoreDisplay({ score, size = 'large' }: { score: number | null; size?: 'large' | 'small' }) {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-success';
    if (s >= 70) return 'text-warning';
    return 'text-error';
  };

  const getScoreRing = (s: number) => {
    if (s >= 90) return 'ring-success/20';
    if (s >= 70) return 'ring-warning/20';
    return 'ring-error/20';
  };

  if (score === null) {
    return (
      <div className={cn(
        'flex items-center justify-center rounded-full bg-muted',
        size === 'large' ? 'h-32 w-32' : 'h-16 w-16'
      )}>
        <span className={cn('text-muted-foreground', size === 'large' ? 'text-3xl' : 'text-lg')}>--</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center rounded-full ring-8',
      getScoreRing(score),
      size === 'large' ? 'h-32 w-32' : 'h-16 w-16'
    )}>
      <span className={cn('font-bold', getScoreColor(score), size === 'large' ? 'text-4xl' : 'text-xl')}>
        {score}
      </span>
      {size === 'large' && <span className="text-sm text-muted-foreground">/ 100</span>}
    </div>
  );
}

// WCAG Level Compliance Badge
function WCAGLevelBadge({
  level,
  status,
  issueCount,
}: {
  level: 'A' | 'AA' | 'AAA';
  status: 'pass' | 'fail' | 'partial';
  issueCount: number;
}) {
  const getIcon = () => {
    if (status === 'pass') return <ShieldCheck className="h-5 w-5 text-success" />;
    if (status === 'partial') return <ShieldAlert className="h-5 w-5 text-warning" />;
    return <ShieldX className="h-5 w-5 text-error" />;
  };

  const getLabel = () => {
    if (status === 'pass') return 'Compliant';
    if (status === 'partial') return 'Partial';
    return 'Non-compliant';
  };

  const getBgColor = () => {
    if (status === 'pass') return 'bg-success/10 border-success/30';
    if (status === 'partial') return 'bg-warning/10 border-warning/30';
    return 'bg-error/10 border-error/30';
  };

  return (
    <div className={cn('flex items-center gap-3 p-4 rounded-xl border', getBgColor())}>
      {getIcon()}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Level {level}</span>
          <Badge variant={status === 'pass' ? 'success' : status === 'partial' ? 'warning' : 'error'}>
            {getLabel()}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {issueCount === 0
            ? 'All criteria met'
            : `${issueCount} issue${issueCount === 1 ? '' : 's'} found`}
        </p>
      </div>
    </div>
  );
}

// Impact Summary Card
function ImpactCard({
  label,
  count,
  icon: Icon,
  color,
}: {
  label: string;
  count: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
      <div className={cn('p-2 rounded-lg', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold">{count}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// Issue Card with AI Explanation
function IssueCard({
  issue,
  explanation,
  isExpanded,
  onToggle,
}: {
  issue: {
    id: string;
    rule: string;
    severity: 'critical' | 'serious' | 'moderate' | 'minor';
    description: string;
    suggested_fix: string | null;
    element_selector: string | null;
    wcag_criteria: string[] | null;
  };
  explanation?: AIExplanation;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-error';
      case 'serious':
        return 'text-warning';
      case 'moderate':
        return 'text-info';
      default:
        return 'text-muted-foreground';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-error/10';
      case 'serious':
        return 'bg-warning/10';
      case 'moderate':
        return 'bg-info/10';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className={cn('p-2 rounded-lg mt-0.5', getSeverityBg(issue.severity))}>
          <AlertTriangle className={cn('h-4 w-4', getSeverityColor(issue.severity))} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{issue.rule.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
            <Badge variant={
              issue.severity === 'critical' ? 'error' :
              issue.severity === 'serious' ? 'warning' :
              issue.severity === 'moderate' ? 'info' : 'default'
            }>
              {issue.severity}
            </Badge>
            {issue.wcag_criteria && issue.wcag_criteria.map(criterion => (
              <a
                key={criterion}
                href={`https://www.w3.org/WAI/WCAG21/Understanding/${criterion.replace(/\./g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                WCAG {criterion}
              </a>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {explanation?.plainEnglish || issue.description}
          </p>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
          <div className="grid gap-4 mt-4">
            {/* AI Plain English Explanation */}
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm mb-1">What this means</h4>
                <p className="text-sm text-muted-foreground">
                  {explanation?.plainEnglish || issue.description}
                </p>
              </div>
            </div>

            {/* Affected Users */}
            {explanation?.affectedUsers && explanation.affectedUsers.length > 0 && (
              <div className="flex gap-3">
                <Users className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm mb-1">Who is affected</h4>
                  <div className="flex flex-wrap gap-2">
                    {explanation.affectedUsers.map((user, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        {user}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* How to Fix */}
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm mb-1">How to fix</h4>
                <p className="text-sm text-muted-foreground">
                  {explanation?.howToFix || issue.suggested_fix || 'Review and update the element to meet accessibility guidelines.'}
                </p>
              </div>
            </div>

            {/* Element Selector */}
            {issue.element_selector && (
              <div className="flex gap-3">
                <Keyboard className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm mb-1">Element</h4>
                  <code className="text-xs px-2 py-1 rounded bg-muted font-mono">
                    {issue.element_selector}
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Issue List by Severity
function IssueList({
  title,
  issues,
  explanations,
  defaultExpanded = false,
}: {
  title: string;
  issues: Array<{
    id: string;
    rule: string;
    severity: 'critical' | 'serious' | 'moderate' | 'minor';
    description: string;
    suggested_fix: string | null;
    element_selector: string | null;
    wcag_criteria: string[] | null;
  }>;
  explanations: AIExplanation[];
  defaultExpanded?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const toggleIssue = (id: string) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIssues(newExpanded);
  };

  if (issues.length === 0) return null;

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <h3 className="font-medium">{title}</h3>
        <Badge variant="default">{issues.length}</Badge>
      </button>

      {isOpen && (
        <div className="space-y-3 ml-6">
          {issues.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              explanation={explanations.find(e => e.issueId === issue.id)}
              isExpanded={expandedIssues.has(issue.id)}
              onToggle={() => toggleIssue(issue.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AccessibilityPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [auditUrl, setAuditUrl] = useState('');

  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const currentProject = selectedProjectId || projects[0]?.id;
  const currentProjectData = projects.find((p) => p.id === currentProject);

  const { data: auditResult, isLoading: auditLoading } = useAccessibilityAudit(currentProject || null);
  const { data: auditHistory = [] } = useAccessibilityHistory(currentProject || null);
  const runAudit = useRunAccessibilityAudit();

  const effectiveUrl = auditUrl || currentProjectData?.app_url || 'https://example.com';

  const handleRunAudit = async () => {
    if (!currentProject) return;
    try {
      await runAudit.mutateAsync({
        projectId: currentProject,
        url: effectiveUrl,
      });
    } catch (error) {
      console.error('Failed to run accessibility audit:', error);
    }
  };

  const isRunning = runAudit.isPending;
  const isLoading = projectsLoading || auditLoading;

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
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Accessibility className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Accessibility</h1>
              <p className="text-xs text-muted-foreground">WCAG 2.1 Compliance Testing</p>
            </div>
          </div>
          <select
            value={currentProject || ''}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          {auditResult?.audit && (
            <div className="text-sm text-muted-foreground">
              Last audit: {formatDistanceToNow(new Date(auditResult.audit.created_at), { addSuffix: true })}
            </div>
          )}
          <div className="flex-1" />
          <Input
            value={effectiveUrl}
            onChange={(e) => setAuditUrl(e.target.value)}
            placeholder="URL to audit"
            className="w-64 h-9"
          />
          <Button size="sm" onClick={handleRunAudit} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Audit
              </>
            )}
          </Button>
        </header>

        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !auditResult ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Accessibility className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Accessibility Audit Yet</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                Run an accessibility audit to check your website for WCAG 2.1 compliance and get AI-powered recommendations.
              </p>
              <Button onClick={handleRunAudit} disabled={isRunning}>
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Audit...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run First Audit
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Overview Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Card */}
                <div className="lg:col-span-1 p-6 rounded-xl border bg-card">
                  <div className="flex flex-col items-center">
                    <ScoreDisplay score={auditResult.audit.accessibility_score} size="large" />
                    <h2 className="text-lg font-semibold mt-4">Accessibility Score</h2>
                    <p className="text-sm text-muted-foreground text-center mt-1">
                      {auditResult.audit.accessibility_score !== null
                        ? auditResult.audit.accessibility_score >= 90
                          ? 'Excellent! Your page is highly accessible.'
                          : auditResult.audit.accessibility_score >= 70
                          ? 'Good, but there are some issues to address.'
                          : 'Needs improvement. Multiple issues found.'
                        : 'Run an audit to get your score.'}
                    </p>
                    <a
                      href={auditResult.audit.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline mt-4"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View tested page
                    </a>
                  </div>
                </div>

                {/* WCAG Compliance */}
                <div className="lg:col-span-2 p-6 rounded-xl border bg-card">
                  <h2 className="text-lg font-semibold mb-4">WCAG 2.1 Compliance</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <WCAGLevelBadge
                      level="A"
                      status={auditResult.wcagCompliance.levelA}
                      issueCount={auditResult.wcagCompliance.levelAIssues}
                    />
                    <WCAGLevelBadge
                      level="AA"
                      status={auditResult.wcagCompliance.levelAA}
                      issueCount={auditResult.wcagCompliance.levelAAIssues}
                    />
                    <WCAGLevelBadge
                      level="AAA"
                      status={auditResult.wcagCompliance.levelAAA}
                      issueCount={auditResult.wcagCompliance.levelAAAIssues}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Level AA is the recommended conformance level for most websites. Level AAA provides enhanced accessibility.
                  </p>
                </div>
              </div>

              {/* Impact Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ImpactCard
                  label="Critical"
                  count={auditResult.issuesByImpact.critical.length}
                  icon={XCircle}
                  color="bg-error/10 text-error"
                />
                <ImpactCard
                  label="Serious"
                  count={auditResult.issuesByImpact.serious.length}
                  icon={AlertTriangle}
                  color="bg-warning/10 text-warning"
                />
                <ImpactCard
                  label="Moderate"
                  count={auditResult.issuesByImpact.moderate.length}
                  icon={Info}
                  color="bg-info/10 text-info"
                />
                <ImpactCard
                  label="Minor"
                  count={auditResult.issuesByImpact.minor.length}
                  icon={Eye}
                  color="bg-muted text-muted-foreground"
                />
              </div>

              {/* Issues List */}
              <div className="p-6 rounded-xl border bg-card space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    Issues Found ({auditResult.issues.length})
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Click on an issue to see AI-powered explanations
                  </p>
                </div>

                {auditResult.issues.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <CheckCircle className="h-12 w-12 text-success mb-4" />
                    <h3 className="font-medium mb-1">No accessibility issues found!</h3>
                    <p className="text-sm text-muted-foreground">
                      Your page appears to meet WCAG 2.1 guidelines.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <IssueList
                      title="Critical Issues"
                      issues={auditResult.issuesByImpact.critical}
                      explanations={auditResult.aiExplanations}
                      defaultExpanded={true}
                    />
                    <IssueList
                      title="Serious Issues"
                      issues={auditResult.issuesByImpact.serious}
                      explanations={auditResult.aiExplanations}
                      defaultExpanded={true}
                    />
                    <IssueList
                      title="Moderate Issues"
                      issues={auditResult.issuesByImpact.moderate}
                      explanations={auditResult.aiExplanations}
                    />
                    <IssueList
                      title="Minor Issues"
                      issues={auditResult.issuesByImpact.minor}
                      explanations={auditResult.aiExplanations}
                    />
                  </div>
                )}
              </div>

              {/* Audit History */}
              {auditHistory.length > 1 && (
                <div className="p-6 rounded-xl border bg-card">
                  <h2 className="text-lg font-semibold mb-4">Audit History</h2>
                  <div className="space-y-2">
                    {auditHistory.slice(0, 5).map((audit, index) => (
                      <div
                        key={audit.id}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg',
                          index === 0 ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <ScoreDisplay score={audit.accessibility_score} size="small" />
                          <div>
                            <div className="font-medium">
                              {audit.accessibility_score !== null ? `Score: ${audit.accessibility_score}` : 'Pending'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(audit.created_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                        <Badge variant={
                          audit.status === 'completed' ? 'success' :
                          audit.status === 'running' ? 'warning' :
                          audit.status === 'failed' ? 'error' : 'default'
                        }>
                          {audit.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
