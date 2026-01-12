'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ArrowLeft,
  Check,
  X,
  RefreshCw,
  Loader2,
  Calendar,
  Monitor,
  Link2,
  Clock,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { VisualComparisonViewer, type VisualChange } from '../components/VisualComparisonViewer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import { useVisualComparison, useApproveComparison, useUpdateBaseline } from '@/lib/hooks/use-visual';

// Types
interface AIInsight {
  id: string;
  type: 'warning' | 'suggestion' | 'info';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface ComparisonMetadata {
  name: string;
  pageUrl: string | null;
  viewport: string;
  createdAt: string;
  matchPercentage: number | null;
  threshold: number;
  baselineId: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
}

// Mock data for AI insights (until API is ready)
const getMockAIInsights = (matchPercentage: number | null): AIInsight[] => {
  if (matchPercentage === null) return [];

  const insights: AIInsight[] = [];

  if (matchPercentage < 90) {
    insights.push({
      id: '1',
      type: 'warning',
      title: 'Significant Visual Changes Detected',
      description: `The current screenshot differs by ${(100 - matchPercentage).toFixed(1)}% from the baseline. Review carefully before approving.`,
      severity: 'high',
    });
  }

  if (matchPercentage >= 90 && matchPercentage < 99) {
    insights.push({
      id: '2',
      type: 'suggestion',
      title: 'Minor Visual Differences',
      description: 'Small layout shifts or style changes detected. These may be intentional UI updates.',
      severity: 'medium',
    });
  }

  if (matchPercentage >= 99) {
    insights.push({
      id: '3',
      type: 'info',
      title: 'Minimal Changes',
      description: 'Only minor pixel differences detected, likely due to anti-aliasing or font rendering.',
      severity: 'low',
    });
  }

  return insights;
};

// Mock data for changes (until API is ready)
const getMockChanges = (matchPercentage: number | null): VisualChange[] => {
  if (matchPercentage === null || matchPercentage >= 99) return [];

  const changes: VisualChange[] = [];
  const numChanges = Math.ceil((100 - matchPercentage) / 10);

  for (let i = 0; i < numChanges; i++) {
    changes.push({
      id: `change-${i + 1}`,
      type: i % 3 === 0 ? 'added' : i % 3 === 1 ? 'removed' : 'modified',
      bounds: {
        x: 100 + (i * 150) % 600,
        y: 100 + Math.floor(i / 4) * 100,
        width: 80 + (i * 20) % 100,
        height: 60 + (i * 15) % 80,
      },
      severity: i === 0 ? 'high' : i < 3 ? 'medium' : 'low',
      description: `Visual change region ${i + 1}`,
      pixelDifference: Math.floor(Math.random() * 5000) + 500,
    });
  }

  return changes;
};

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="flex h-screen bg-background">
      {/* Main viewer area skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b bg-card/50 animate-pulse" />
        <div className="flex-1 p-4">
          <div className="h-full bg-muted/30 rounded-xl animate-pulse" />
        </div>
        <div className="h-16 border-t bg-card/50 animate-pulse" />
      </div>

      {/* Right sidebar skeleton */}
      <div className="w-80 border-l bg-card p-4 space-y-4">
        <div className="h-8 bg-muted/30 rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-40 bg-muted/30 rounded animate-pulse" />
        <div className="h-60 bg-muted/30 rounded animate-pulse" />
      </div>
    </div>
  );
}

// Error state component
function ErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center max-w-md">
        <div className="h-16 w-16 rounded-2xl bg-error/10 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-error" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight mb-2">Comparison Not Found</h2>
        <p className="text-muted-foreground mb-6">{message}</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Visual Testing
        </Button>
      </div>
    </div>
  );
}

// Main page component
export default function ComparisonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const comparisonId = params.comparisonId as string;

  // State
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);
  const [showConfirmReject, setShowConfirmReject] = useState(false);

  // Hooks - fetch the specific comparison
  const { data: comparison, isLoading, error } = useVisualComparison(comparisonId);
  const approveComparison = useApproveComparison();
  const updateBaseline = useUpdateBaseline();

  // Get AI insights and changes (mocked for now)
  const aiInsights = getMockAIInsights(comparison?.match_percentage ?? null);
  const changes = getMockChanges(comparison?.match_percentage ?? null);

  // Navigation
  const handleBack = useCallback(() => {
    router.push('/visual');
  }, [router]);

  // Actions
  const handleApproveAll = useCallback(async () => {
    if (!comparison) return;
    try {
      await approveComparison.mutateAsync({
        comparisonId: comparison.id,
        projectId: comparison.project_id,
      });
    } catch (error) {
      console.error('Failed to approve comparison:', error);
    }
  }, [comparison, approveComparison]);

  const handleRejectAll = useCallback(() => {
    setShowConfirmReject(true);
  }, []);

  const handleConfirmReject = useCallback(async () => {
    // In a real implementation, this would reject the changes
    setShowConfirmReject(false);
    handleBack();
  }, [handleBack]);

  const handleUpdateBaseline = useCallback(async () => {
    if (!comparison) return;
    try {
      await updateBaseline.mutateAsync({
        comparisonId: comparison.id,
        projectId: comparison.project_id,
      });
    } catch (error) {
      console.error('Failed to update baseline:', error);
    }
  }, [comparison, updateBaseline]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          handleBack();
          break;
        case 'a':
        case 'A':
          if (!approveComparison.isPending) {
            handleApproveAll();
          }
          break;
        case 'r':
        case 'R':
          if (e.shiftKey) {
            handleRejectAll();
          }
          break;
        case 'u':
        case 'U':
          if (!updateBaseline.isPending) {
            handleUpdateBaseline();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBack, handleApproveAll, handleRejectAll, handleUpdateBaseline, approveComparison.isPending, updateBaseline.isPending]);

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state - comparison not found or fetch error
  if (error || !comparison) {
    return (
      <ErrorState
        message={error ? `Failed to load comparison: ${error.message}` : "The visual comparison you're looking for doesn't exist or has been deleted."}
        onBack={handleBack}
      />
    );
  }

  // Missing screenshots error state
  if (!comparison.current_url) {
    return (
      <ErrorState
        message="This comparison is missing screenshot data."
        onBack={handleBack}
      />
    );
  }

  // Get metadata
  const metadata: ComparisonMetadata = {
    name: comparison.name,
    pageUrl: null, // Would come from baseline
    viewport: '1920x1080', // Would come from baseline
    createdAt: comparison.created_at,
    matchPercentage: comparison.match_percentage,
    threshold: comparison.threshold,
    baselineId: comparison.baseline_id,
    approvedAt: comparison.approved_at,
    approvedBy: comparison.approved_by,
  };

  const statusVariant = comparison.status === 'match' ? 'success' : comparison.status === 'mismatch' ? 'error' : 'warning';

  return (
    <div className="flex h-screen bg-background">
      {/* Main viewer area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="flex items-center justify-between h-14 px-4 border-b bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="h-4 w-px bg-border" />
            <h1 className="font-medium truncate max-w-[300px]" title={comparison.name}>
              {comparison.name}
            </h1>
            <Badge variant={statusVariant}>{comparison.status}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatDistanceToNow(new Date(comparison.created_at), { addSuffix: true })}</span>
          </div>
        </header>

        {/* Viewer */}
        <div className="flex-1 min-h-0">
          <VisualComparisonViewer
            baselineScreenshot={comparison.baseline_url || ''}
            currentScreenshot={comparison.current_url}
            diffImageUrl={comparison.diff_url || undefined}
            changes={changes}
            onChangeSelect={setSelectedChangeId}
            className="h-full"
          />
        </div>

        {/* Bottom action bar */}
        <div className="flex items-center justify-between h-16 px-4 border-t bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
              <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border">Esc</kbd>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {comparison.status === 'mismatch' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpdateBaseline}
                  disabled={updateBaseline.isPending}
                >
                  {updateBaseline.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Update Baseline
                  <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border">U</kbd>
                </Button>

                <div className="h-6 w-px bg-border" />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejectAll}
                  className="text-error hover:text-error hover:bg-error/10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject All
                  <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border">Shift+R</kbd>
                </Button>

                <Button
                  size="sm"
                  onClick={handleApproveAll}
                  disabled={approveComparison.isPending}
                  className="bg-success hover:bg-success/90 text-white"
                >
                  {approveComparison.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Approve All
                  <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 rounded">A</kbd>
                </Button>
              </>
            )}

            {comparison.status === 'match' && (
              <Badge variant="success" className="text-sm">
                <Check className="h-4 w-4 mr-1" />
                Approved
              </Badge>
            )}

            {comparison.status === 'new' && (
              <Button
                size="sm"
                onClick={handleApproveAll}
                disabled={approveComparison.isPending}
              >
                {approveComparison.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Approve as Baseline
                <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 rounded">A</kbd>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="w-80 border-l bg-card overflow-y-auto">
        {/* Metadata section */}
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Comparison Details
          </h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="p-1.5 rounded bg-muted">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Created</p>
                <p className="font-medium">{format(new Date(metadata.createdAt), 'PPp')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="p-1.5 rounded bg-muted">
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Viewport</p>
                <p className="font-medium">{metadata.viewport}</p>
              </div>
            </div>

            {metadata.pageUrl && (
              <div className="flex items-center gap-3 text-sm">
                <div className="p-1.5 rounded bg-muted">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">URL</p>
                  <p className="font-medium truncate">{metadata.pageUrl}</p>
                </div>
              </div>
            )}

            {metadata.matchPercentage !== null && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Match Score</span>
                  <span className={cn(
                    'text-sm font-semibold',
                    metadata.matchPercentage >= 99 && 'text-success',
                    metadata.matchPercentage >= 90 && metadata.matchPercentage < 99 && 'text-warning',
                    metadata.matchPercentage < 90 && 'text-error'
                  )}>
                    {metadata.matchPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      metadata.matchPercentage >= 99 && 'bg-success',
                      metadata.matchPercentage >= 90 && metadata.matchPercentage < 99 && 'bg-warning',
                      metadata.matchPercentage < 90 && 'bg-error'
                    )}
                    style={{ width: `${metadata.matchPercentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Threshold: {(100 - metadata.threshold * 100).toFixed(1)}%
                </p>
              </div>
            )}

            {metadata.approvedAt && (
              <div className="flex items-center gap-2 text-sm text-success mt-2">
                <Check className="h-4 w-4" />
                <span>Approved {formatDistanceToNow(new Date(metadata.approvedAt), { addSuffix: true })}</span>
              </div>
            )}
          </div>
        </div>

        {/* AI Insights section */}
        {aiInsights.length > 0 && (
          <div className="p-4 border-b">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Insights
            </h2>
            <div className="space-y-2">
              {aiInsights.map((insight) => (
                <div
                  key={insight.id}
                  className={cn(
                    'p-3 rounded-lg border text-sm',
                    insight.type === 'warning' && 'bg-warning/10 border-warning/30',
                    insight.type === 'suggestion' && 'bg-info/10 border-info/30',
                    insight.type === 'info' && 'bg-muted/50 border-border'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {insight.type === 'warning' && <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />}
                    {insight.type === 'suggestion' && <Sparkles className="h-4 w-4 text-info shrink-0 mt-0.5" />}
                    {insight.type === 'info' && <Eye className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                    <div>
                      <p className="font-medium">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Changes list section */}
        <div className="p-4">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Changes
            {changes.length > 0 && (
              <Badge variant="outline" className="ml-auto">
                {changes.length}
              </Badge>
            )}
          </h2>

          {changes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Check className="h-8 w-8 mx-auto mb-2 text-success" />
              <p className="text-sm font-medium">No changes detected</p>
              <p className="text-xs">Screenshots match the baseline</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {changes.map((change) => (
                <button
                  key={change.id}
                  onClick={() => setSelectedChangeId(change.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-all',
                    'hover:bg-accent',
                    selectedChangeId === change.id && 'ring-2 ring-primary bg-primary/5'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      'p-1 rounded shrink-0',
                      change.severity === 'high' && 'bg-error/10 text-error',
                      change.severity === 'medium' && 'bg-warning/10 text-warning',
                      change.severity === 'low' && 'bg-muted text-muted-foreground'
                    )}>
                      <AlertCircle className="h-3 w-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium capitalize">{change.type}</span>
                        <Badge
                          variant={change.severity === 'high' ? 'error' : change.severity === 'medium' ? 'warning' : 'default'}
                          className="text-[10px] py-0"
                        >
                          {change.severity}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {change.description || `Region at (${change.bounds.x}, ${change.bounds.y})`}
                      </p>
                      {change.pixelDifference && (
                        <p className="text-[10px] text-muted-foreground">
                          {change.pixelDifference.toLocaleString()} pixels
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Reject confirmation dialog */}
      {showConfirmReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-error/10">
                <AlertTriangle className="h-6 w-6 text-error" />
              </div>
              <h3 className="text-lg font-semibold">Confirm Rejection</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to reject all changes? This will mark this comparison as failed
              and you'll need to investigate the visual regression.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowConfirmReject(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmReject}>
                <X className="h-4 w-4 mr-2" />
                Reject Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
