'use client';

import * as React from 'react';
import {
  Layout,
  Type,
  Palette,
  Layers,
  Smartphone,
  Accessibility,
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  X,
  Eye,
  Code,
  GitCommit,
  FileCode,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';

export interface VisualChange {
  id: string;
  category: 'layout' | 'content' | 'style' | 'structure' | 'responsive' | 'accessibility';
  intent: 'intentional' | 'regression' | 'dynamic' | 'unknown';
  severity: 'critical' | 'major' | 'minor' | 'info' | 'safe';
  description: string;
  root_cause?: string;
  impact_assessment?: string;
  recommendation?: string;
  confidence: number;
  bounds?: { x: number; y: number; width: number; height: number };
  property_name?: string;
  baseline_value?: string;
  current_value?: string;
  related_commit?: string;
  related_files?: string[];
  status: 'pending' | 'approved' | 'rejected';
}

interface ChangeCardProps {
  change: VisualChange;
  onApprove?: (changeId: string) => void;
  onReject?: (changeId: string) => void;
  onShowOnScreenshot?: (changeId: string, bounds?: VisualChange['bounds']) => void;
  onViewCode?: (files: string[]) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const categoryConfig: Record<VisualChange['category'], { icon: React.ElementType; label: string; color: string }> = {
  layout: { icon: Layout, label: 'Layout', color: 'text-blue-500' },
  content: { icon: Type, label: 'Content', color: 'text-purple-500' },
  style: { icon: Palette, label: 'Style', color: 'text-pink-500' },
  structure: { icon: Layers, label: 'Structure', color: 'text-orange-500' },
  responsive: { icon: Smartphone, label: 'Responsive', color: 'text-cyan-500' },
  accessibility: { icon: Accessibility, label: 'Accessibility', color: 'text-green-500' },
};

const severityConfig: Record<VisualChange['severity'], { icon: React.ElementType; label: string; variant: 'error' | 'warning' | 'info' | 'success' | 'default' }> = {
  critical: { icon: AlertCircle, label: 'Critical', variant: 'error' },
  major: { icon: AlertTriangle, label: 'Major', variant: 'warning' },
  minor: { icon: Info, label: 'Minor', variant: 'info' },
  info: { icon: Info, label: 'Info', variant: 'default' },
  safe: { icon: Shield, label: 'Safe', variant: 'success' },
};

const statusConfig: Record<VisualChange['status'], { icon: React.ElementType; label: string; color: string }> = {
  pending: { icon: AlertCircle, label: 'Pending Review', color: 'text-warning' },
  approved: { icon: Check, label: 'Approved', color: 'text-success' },
  rejected: { icon: X, label: 'Rejected', color: 'text-error' },
};

const intentConfig: Record<VisualChange['intent'], { label: string; color: string }> = {
  intentional: { label: 'Intentional', color: 'bg-success/10 text-success' },
  regression: { label: 'Regression', color: 'bg-error/10 text-error' },
  dynamic: { label: 'Dynamic Content', color: 'bg-info/10 text-info' },
  unknown: { label: 'Unknown', color: 'bg-muted text-muted-foreground' },
};

export function ChangeCard({
  change,
  onApprove,
  onReject,
  onShowOnScreenshot,
  onViewCode,
  isExpanded = false,
  onToggleExpand,
}: ChangeCardProps) {
  const CategoryIcon = categoryConfig[change.category].icon;
  const SeverityIcon = severityConfig[change.severity].icon;
  const StatusIcon = statusConfig[change.status].icon;

  const confidencePercent = Math.round(change.confidence * 100);
  const confidenceColor =
    confidencePercent >= 90 ? 'text-success' :
    confidencePercent >= 70 ? 'text-warning' :
    'text-muted-foreground';

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      change.status === 'approved' && 'border-success/30 bg-success/5',
      change.status === 'rejected' && 'border-error/30 bg-error/5',
      change.severity === 'critical' && change.status === 'pending' && 'border-error/50'
    )}>
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Category Icon */}
            <div className={cn(
              'mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
              'bg-muted/50'
            )}>
              <CategoryIcon className={cn('h-4 w-4', categoryConfig[change.category].color)} />
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-xs font-medium', categoryConfig[change.category].color)}>
                  {categoryConfig[change.category].label}
                </span>
                <Badge variant={severityConfig[change.severity].variant}>
                  <SeverityIcon className="h-3 w-3 mr-1" />
                  {severityConfig[change.severity].label}
                </Badge>
                <span className={cn('text-xs px-1.5 py-0.5 rounded', intentConfig[change.intent].color)}>
                  {intentConfig[change.intent].label}
                </span>
              </div>
              <p className="text-sm font-medium mt-1">{change.description}</p>
              {change.property_name && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Property: <code className="bg-muted px-1 py-0.5 rounded">{change.property_name}</code>
                </p>
              )}
            </div>
          </div>

          {/* Status and Confidence */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className={cn('flex items-center gap-1 text-xs font-medium', statusConfig[change.status].color)}>
              <StatusIcon className="h-3.5 w-3.5" />
              <span>{statusConfig[change.status].label}</span>
            </div>
            <div className={cn('text-xs', confidenceColor)}>
              {confidencePercent}% confidence
            </div>
          </div>
        </div>

        {/* Before/After Values */}
        {(change.baseline_value || change.current_value) && (
          <div className="mt-3 flex gap-4 text-xs">
            {change.baseline_value && (
              <div className="flex-1 min-w-0">
                <span className="text-muted-foreground">Before:</span>
                <div className="mt-0.5 p-2 rounded bg-error/10 border border-error/20 font-mono text-error truncate">
                  {change.baseline_value}
                </div>
              </div>
            )}
            {change.current_value && (
              <div className="flex-1 min-w-0">
                <span className="text-muted-foreground">After:</span>
                <div className="mt-0.5 p-2 rounded bg-success/10 border border-success/20 font-mono text-success truncate">
                  {change.current_value}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Impact Assessment */}
        {change.impact_assessment && (
          <div className="mt-3 p-2 rounded bg-muted/50 border border-border">
            <span className="text-xs font-medium text-muted-foreground">Impact Assessment</span>
            <p className="text-xs mt-0.5">{change.impact_assessment}</p>
          </div>
        )}

        {/* Expandable Details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {/* Root Cause */}
            {change.root_cause && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">AI Detected Root Cause</span>
                <p className="text-xs mt-0.5">{change.root_cause}</p>
              </div>
            )}

            {/* Recommendation */}
            {change.recommendation && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Recommendation</span>
                <p className="text-xs mt-0.5">{change.recommendation}</p>
              </div>
            )}

            {/* Related Commit */}
            {change.related_commit && (
              <div className="flex items-center gap-2">
                <GitCommit className="h-3.5 w-3.5 text-muted-foreground" />
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                  {change.related_commit.substring(0, 7)}
                </code>
              </div>
            )}

            {/* Related Files */}
            {change.related_files && change.related_files.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                  <FileCode className="h-3.5 w-3.5" />
                  Related Files ({change.related_files.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {change.related_files.map((file, index) => (
                    <code
                      key={index}
                      className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono truncate max-w-[200px]"
                      title={file}
                    >
                      {file.split('/').pop()}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* Bounds Info */}
            {change.bounds && (
              <div className="text-xs text-muted-foreground">
                Location: ({change.bounds.x}, {change.bounds.y}) - {change.bounds.width}x{change.bounds.height}
              </div>
            )}
          </div>
        )}

        {/* Actions Row */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            {change.status === 'pending' && (
              <>
                <Button
                  variant="success"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onApprove?.(change.id)}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onReject?.(change.id)}
                >
                  <X className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </>
            )}
            {change.bounds && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onShowOnScreenshot?.(change.id, change.bounds)}
              >
                <Eye className="h-3 w-3 mr-1" />
                Show on Screenshot
              </Button>
            )}
            {change.related_files && change.related_files.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onViewCode?.(change.related_files!)}
              >
                <Code className="h-3 w-3 mr-1" />
                View Code
              </Button>
            )}
          </div>

          {onToggleExpand && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onToggleExpand}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  More
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ChangeCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      </div>
      <div className="mt-3 pt-3 border-t flex gap-2">
        <div className="h-7 w-20 bg-muted animate-pulse rounded" />
        <div className="h-7 w-20 bg-muted animate-pulse rounded" />
      </div>
    </Card>
  );
}
