'use client';

import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  User,
  Globe,
  Monitor,
  ExternalLink,
  Server,
  Play,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Json } from '@/lib/supabase/types';

/**
 * CI/CD metadata that may be present in test runs
 */
interface CIMetadata {
  // Pipeline/Workflow info
  pipeline_name?: string;
  workflow_name?: string;
  run_number?: number;
  run_id?: string;
  job_name?: string;

  // Git context
  commit_sha?: string;
  branch?: string;
  pr_number?: number;
  pr_title?: string;

  // Author info
  author?: string;
  author_email?: string;
  triggered_by?: string;

  // External URLs
  pipeline_url?: string;
  workflow_url?: string;
  commit_url?: string;
  pr_url?: string;
  repo_url?: string;

  // Environment info (may also come from test run directly)
  browser?: string;
  viewport?: string;
  os?: string;
  region?: string;
  environment?: string;
  node_version?: string;

  // Provider info
  ci_provider?: string;

  // Catch-all for any other metadata
  [key: string]: unknown;
}

/**
 * Environment info that may come from the test run itself
 */
interface EnvironmentInfo {
  browser?: string;
  viewport?: string;
  os?: string;
  region?: string;
  environment?: string;
}

interface CIContextPanelProps {
  ciMetadata?: Json | null;
  environment?: EnvironmentInfo;
  className?: string;
}

/**
 * Helper to safely parse ci_metadata JSON field
 */
function parseCIMetadata(metadata: Json | null | undefined): CIMetadata | null {
  if (!metadata) return null;
  if (typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as CIMetadata;
  }
  return null;
}

/**
 * Helper to truncate commit SHA to short format
 */
function shortSha(sha: string | undefined): string {
  if (!sha) return '';
  return sha.substring(0, 7);
}

/**
 * Item row component for displaying metadata with icon
 */
interface MetadataItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | null | undefined;
  href?: string;
  mono?: boolean;
}

function MetadataItem({ icon, label, value, href, mono = false }: MetadataItemProps) {
  // Don't render if no value
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const content = (
    <div className="flex items-center gap-3 text-sm">
      <div className="p-1.5 rounded bg-muted shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className={cn(
          'font-medium truncate',
          mono && 'font-mono text-xs'
        )}>
          {value}
        </p>
      </div>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );

  return content;
}

/**
 * Section divider with optional title
 */
function SectionDivider({ title }: { title?: string }) {
  if (!title) {
    return <div className="h-px bg-border my-3" />;
  }
  return (
    <div className="flex items-center gap-2 my-3">
      <div className="h-px bg-border flex-1" />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {title}
      </span>
      <div className="h-px bg-border flex-1" />
    </div>
  );
}

/**
 * CI/CD Context Panel Component
 *
 * Displays CI/CD metadata and environment information for a test run.
 * Parses the ci_metadata JSON field and renders organized sections with:
 * - Pipeline/workflow information
 * - Git context (branch, commit, PR)
 * - Author information
 * - External links to GitHub/CI provider
 * - Environment details (browser, viewport, OS, region)
 *
 * Handles missing data gracefully by showing "-" or hiding empty sections.
 */
export function CIContextPanel({ ciMetadata, environment, className }: CIContextPanelProps) {
  const meta = parseCIMetadata(ciMetadata);

  // Merge environment info: CI metadata takes precedence, then explicit environment prop
  const envInfo: EnvironmentInfo = {
    browser: meta?.browser ?? environment?.browser,
    viewport: meta?.viewport ?? environment?.viewport,
    os: meta?.os ?? environment?.os,
    region: meta?.region ?? environment?.region,
    environment: meta?.environment ?? environment?.environment,
  };

  // Check if we have any CI/CD info to display
  const hasCIInfo = meta && (
    meta.pipeline_name ||
    meta.workflow_name ||
    meta.run_number ||
    meta.run_id ||
    meta.commit_sha ||
    meta.branch ||
    meta.pr_number ||
    meta.author ||
    meta.triggered_by
  );

  // Check if we have any environment info to display
  const hasEnvInfo = envInfo.browser || envInfo.viewport || envInfo.os || envInfo.region || envInfo.environment;

  // If nothing to display, show a minimal message
  if (!hasCIInfo && !hasEnvInfo) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        No CI/CD context available
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Pipeline/Workflow Section */}
      {(meta?.pipeline_name || meta?.workflow_name || meta?.run_number || meta?.run_id || meta?.job_name) && (
        <>
          <MetadataItem
            icon={<Play className="h-4 w-4 text-muted-foreground" />}
            label="Pipeline / Workflow"
            value={meta.pipeline_name || meta.workflow_name}
            href={meta.pipeline_url || meta.workflow_url}
          />
          {(meta.run_number || meta.run_id) && (
            <MetadataItem
              icon={<Hash className="h-4 w-4 text-muted-foreground" />}
              label="Run"
              value={meta.run_number ? `#${meta.run_number}` : meta.run_id}
              href={meta.pipeline_url || meta.workflow_url}
            />
          )}
          {meta.job_name && (
            <MetadataItem
              icon={<Server className="h-4 w-4 text-muted-foreground" />}
              label="Job"
              value={meta.job_name}
            />
          )}
        </>
      )}

      {/* Git Context Section */}
      {(meta?.branch || meta?.commit_sha || meta?.pr_number) && (
        <>
          {(meta?.pipeline_name || meta?.workflow_name) && <SectionDivider title="Git" />}

          <MetadataItem
            icon={<GitBranch className="h-4 w-4 text-muted-foreground" />}
            label="Branch"
            value={meta.branch}
          />

          <MetadataItem
            icon={<GitCommit className="h-4 w-4 text-muted-foreground" />}
            label="Commit"
            value={shortSha(meta.commit_sha)}
            href={meta.commit_url}
            mono
          />

          {meta.pr_number && (
            <MetadataItem
              icon={<GitPullRequest className="h-4 w-4 text-muted-foreground" />}
              label="Pull Request"
              value={meta.pr_title ? `#${meta.pr_number}: ${meta.pr_title}` : `#${meta.pr_number}`}
              href={meta.pr_url}
            />
          )}
        </>
      )}

      {/* Author Section */}
      {(meta?.author || meta?.triggered_by) && (
        <>
          {(meta?.branch || meta?.pipeline_name || meta?.workflow_name) && <SectionDivider title="Triggered By" />}

          <MetadataItem
            icon={<User className="h-4 w-4 text-muted-foreground" />}
            label={meta.author ? 'Author' : 'Triggered By'}
            value={meta.author || meta.triggered_by}
          />
        </>
      )}

      {/* Environment Section */}
      {hasEnvInfo && (
        <>
          {hasCIInfo && <SectionDivider title="Environment" />}

          {envInfo.environment && (
            <MetadataItem
              icon={<Server className="h-4 w-4 text-muted-foreground" />}
              label="Environment"
              value={envInfo.environment}
            />
          )}

          <MetadataItem
            icon={<Monitor className="h-4 w-4 text-muted-foreground" />}
            label="Browser"
            value={envInfo.browser}
          />

          {envInfo.viewport && (
            <MetadataItem
              icon={<Monitor className="h-4 w-4 text-muted-foreground" />}
              label="Viewport"
              value={envInfo.viewport}
            />
          )}

          {envInfo.os && (
            <MetadataItem
              icon={<Monitor className="h-4 w-4 text-muted-foreground" />}
              label="OS"
              value={envInfo.os}
            />
          )}

          {envInfo.region && (
            <MetadataItem
              icon={<Globe className="h-4 w-4 text-muted-foreground" />}
              label="Region"
              value={envInfo.region}
            />
          )}
        </>
      )}

      {/* CI Provider Badge */}
      {meta?.ci_provider && (
        <div className="pt-2">
          <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium bg-muted text-muted-foreground">
            {meta.ci_provider}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version of CIContextPanel for inline display
 */
interface CIContextBadgesProps {
  ciMetadata?: Json | null;
  className?: string;
}

export function CIContextBadges({ ciMetadata, className }: CIContextBadgesProps) {
  const meta = parseCIMetadata(ciMetadata);

  if (!meta) return null;

  const badges: Array<{ icon: React.ReactNode; label: string; href?: string }> = [];

  if (meta.branch) {
    badges.push({
      icon: <GitBranch className="h-3 w-3" />,
      label: meta.branch,
    });
  }

  if (meta.commit_sha) {
    badges.push({
      icon: <GitCommit className="h-3 w-3" />,
      label: shortSha(meta.commit_sha),
      href: meta.commit_url,
    });
  }

  if (meta.pr_number) {
    badges.push({
      icon: <GitPullRequest className="h-3 w-3" />,
      label: `#${meta.pr_number}`,
      href: meta.pr_url,
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {badges.map((badge, i) => {
        const content = (
          <span
            key={i}
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs bg-muted text-muted-foreground',
              badge.href && 'hover:bg-muted/80 cursor-pointer'
            )}
          >
            {badge.icon}
            <span className="font-mono">{badge.label}</span>
          </span>
        );

        if (badge.href) {
          return (
            <a
              key={i}
              href={badge.href}
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline"
            >
              {content}
            </a>
          );
        }

        return content;
      })}
    </div>
  );
}
