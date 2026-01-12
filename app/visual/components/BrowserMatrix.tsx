'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chrome,
  Globe,
  Compass,
  Check,
  X,
  AlertTriangle,
  ChevronRight,
  ZoomIn,
  Star,
  ArrowLeftRight,
  Eye,
  Diff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Types
export interface BrowserDifference {
  id: string;
  type: 'color' | 'font' | 'layout' | 'spacing' | 'missing' | 'extra' | 'size';
  severity: 'low' | 'medium' | 'high' | 'critical';
  element: string;
  description: string;
  baselineValue?: string;
  currentValue?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface BrowserSnapshot {
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  screenshotUrl: string;
  status: 'pass' | 'fail' | 'issues';
  differenceCount: number;
  isBaseline: boolean;
  differences?: BrowserDifference[];
}

interface BrowserMatrixProps {
  snapshots: BrowserSnapshot[];
  componentName?: string;
  onBrowserSelect?: (browser: BrowserSnapshot) => void;
  className?: string;
}

// Custom Safari icon (Compass-like)
const SafariIcon = Compass;

// Custom Edge icon
const EdgeIcon = Globe;

// Browser configuration
const browserConfig: Record<
  'chrome' | 'firefox' | 'safari' | 'edge',
  {
    label: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    borderColor: string;
    glowColor: string;
  }
> = {
  chrome: {
    label: 'Chrome',
    icon: Chrome,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    glowColor: 'shadow-green-500/20',
  },
  firefox: {
    label: 'Firefox',
    icon: Globe,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    glowColor: 'shadow-orange-500/20',
  },
  safari: {
    label: 'Safari',
    icon: SafariIcon,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    glowColor: 'shadow-blue-500/20',
  },
  edge: {
    label: 'Edge',
    icon: EdgeIcon,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    glowColor: 'shadow-cyan-500/20',
  },
};

// Status configuration
const statusConfig = {
  pass: {
    label: 'Match',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500',
    borderColor: 'border-emerald-500/30',
    icon: Check,
  },
  fail: {
    label: 'Mismatch',
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    borderColor: 'border-red-500/30',
    icon: X,
  },
  issues: {
    label: 'Differences',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-500/30',
    icon: AlertTriangle,
  },
};

// Severity colors
const severityColors = {
  low: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  medium: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
  high: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-500 border-red-500/30',
};

// Difference type icons
const differenceTypeIcons: Record<string, string> = {
  color: 'Color',
  font: 'Font',
  layout: 'Layout',
  spacing: 'Spacing',
  missing: 'Missing',
  extra: 'Extra',
  size: 'Size',
};

// Browser Cell Component
const BrowserCell = memo(function BrowserCell({
  snapshot,
  onClick,
  isSelected,
}: {
  snapshot: BrowserSnapshot;
  onClick: () => void;
  isSelected: boolean;
}) {
  const brConfig = browserConfig[snapshot.browser];
  const stConfig = statusConfig[snapshot.status];
  const Icon = brConfig.icon;
  const StatusIcon = stConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative rounded-xl border overflow-hidden cursor-pointer transition-all duration-200',
        'bg-gradient-to-br from-background to-muted/30',
        isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:border-primary/50',
        snapshot.status === 'fail' && 'border-red-500/50',
        snapshot.status === 'issues' && 'border-amber-500/50',
        snapshot.status === 'pass' && 'border-emerald-500/30'
      )}
      onClick={onClick}
    >
      {/* Baseline indicator */}
      {snapshot.isBaseline && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/80 text-white text-xs font-medium py-1 px-3 flex items-center justify-center gap-1.5 z-10">
          <Star className="h-3 w-3 fill-current" />
          Baseline
        </div>
      )}

      {/* Screenshot preview */}
      <div
        className={cn(
          'aspect-[16/10] relative overflow-hidden bg-muted',
          snapshot.isBaseline && 'mt-6'
        )}
      >
        {snapshot.screenshotUrl ? (
          <img
            src={snapshot.screenshotUrl}
            alt={`${brConfig.label} browser screenshot`}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className={cn('h-12 w-12 opacity-20', brConfig.color)} />
          </div>
        )}

        {/* Hover overlay with zoom icon */}
        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <ZoomIn className="h-8 w-8 text-white" />
        </div>

        {/* Status badge */}
        {!snapshot.isBaseline && (
          <div
            className={cn(
              'absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
              stConfig.bgColor,
              'text-white'
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {snapshot.differenceCount > 0 && (
              <span>{snapshot.differenceCount}</span>
            )}
          </div>
        )}

        {/* Difference count badge for non-baseline */}
        {!snapshot.isBaseline && snapshot.differenceCount > 0 && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/60 text-white text-xs font-medium flex items-center gap-1">
            <Diff className="h-3 w-3" />
            {snapshot.differenceCount} diff{snapshot.differenceCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg', brConfig.bgColor)}>
            <Icon className={cn('h-4 w-4', brConfig.color)} />
          </div>
          <span className="font-medium text-sm">{brConfig.label}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Cross-browser issue pulse */}
      {snapshot.status === 'fail' && (
        <motion.div
          className="absolute inset-0 border-2 border-red-500 rounded-xl pointer-events-none"
          animate={{
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.div>
  );
});

// Cross-Browser Summary Component
const CrossBrowserSummary = memo(function CrossBrowserSummary({
  snapshots,
}: {
  snapshots: BrowserSnapshot[];
}) {
  const baseline = snapshots.find((s) => s.isBaseline);
  const comparisons = snapshots.filter((s) => !s.isBaseline);
  const totalDifferences = comparisons.reduce((sum, s) => sum + s.differenceCount, 0);
  const passCount = comparisons.filter((s) => s.status === 'pass').length;
  const failCount = comparisons.filter((s) => s.status === 'fail').length;
  const issueCount = comparisons.filter((s) => s.status === 'issues').length;

  return (
    <Card className="p-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {baseline && (
            <div className="flex items-center gap-2 pr-4 border-r border-border">
              <Star className="h-4 w-4 text-primary fill-primary" />
              <span className="text-sm font-medium">
                Baseline: {browserConfig[baseline.browser].label}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm text-muted-foreground">
              {passCount} Match
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-sm text-muted-foreground">
              {issueCount} Differences
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="text-sm text-muted-foreground">
              {failCount} Mismatch
            </span>
          </div>
        </div>
        {totalDifferences > 0 && (
          <div className="flex items-center gap-2 text-amber-500">
            <ArrowLeftRight className="h-4 w-4" />
            <span className="text-sm font-medium">
              {totalDifferences} cross-browser difference{totalDifferences !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Per-browser breakdown */}
      {totalDifferences > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50 flex gap-4">
          {comparisons
            .filter((s) => s.differenceCount > 0)
            .map((snapshot) => {
              const brConfig = browserConfig[snapshot.browser];
              const Icon = brConfig.icon;
              return (
                <div
                  key={snapshot.browser}
                  className="flex items-center gap-2 text-xs"
                >
                  <Icon className={cn('h-3.5 w-3.5', brConfig.color)} />
                  <span className="text-muted-foreground">
                    {brConfig.label}:{' '}
                    <span className="font-medium text-foreground">
                      {snapshot.differenceCount}
                    </span>
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </Card>
  );
});

// Browser Detail Dialog Component
const BrowserDetailDialog = memo(function BrowserDetailDialog({
  snapshot,
  baselineSnapshot,
  open,
  onOpenChange,
}: {
  snapshot: BrowserSnapshot | null;
  baselineSnapshot: BrowserSnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single');

  if (!snapshot) return null;

  const brConfig = browserConfig[snapshot.browser];
  const stConfig = statusConfig[snapshot.status];
  const Icon = brConfig.icon;
  const StatusIcon = stConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', brConfig.bgColor)}>
                <Icon className={cn('h-5 w-5', brConfig.color)} />
              </div>
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {brConfig.label}
                  {snapshot.isBaseline && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      <Star className="h-3 w-3 fill-current" />
                      Baseline
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  {!snapshot.isBaseline && (
                    <>
                      <StatusIcon className={cn('h-4 w-4', stConfig.color)} />
                      <span className={stConfig.color}>{stConfig.label}</span>
                      {snapshot.differenceCount > 0 && (
                        <span className="text-muted-foreground">
                          - {snapshot.differenceCount} difference
                          {snapshot.differenceCount !== 1 ? 's' : ''} from baseline
                        </span>
                      )}
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>

            {/* View mode toggle */}
            {!snapshot.isBaseline && baselineSnapshot && (
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                <Button
                  size="sm"
                  variant={viewMode === 'single' ? 'default' : 'ghost'}
                  className="h-7 px-3 text-xs"
                  onClick={() => setViewMode('single')}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Single
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'compare' ? 'default' : 'ghost'}
                  className="h-7 px-3 text-xs"
                  onClick={() => setViewMode('compare')}
                >
                  <ArrowLeftRight className="h-3 w-3 mr-1" />
                  Compare
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 mt-4">
          {/* Screenshot(s) */}
          {viewMode === 'compare' && baselineSnapshot ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Baseline */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-primary fill-primary" />
                  <span className="text-sm font-medium">
                    Baseline ({browserConfig[baselineSnapshot.browser].label})
                  </span>
                </div>
                <div className="relative rounded-lg overflow-hidden border bg-muted">
                  {baselineSnapshot.screenshotUrl ? (
                    <img
                      src={baselineSnapshot.screenshotUrl}
                      alt="Baseline screenshot"
                      className="w-full h-auto"
                    />
                  ) : (
                    <div className="aspect-video flex items-center justify-center">
                      <Chrome className="h-16 w-16 opacity-20" />
                    </div>
                  )}
                </div>
              </div>

              {/* Current */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn('h-4 w-4', brConfig.color)} />
                  <span className="text-sm font-medium">
                    {brConfig.label}
                  </span>
                </div>
                <div className="relative rounded-lg overflow-hidden border bg-muted">
                  {snapshot.screenshotUrl ? (
                    <img
                      src={snapshot.screenshotUrl}
                      alt={`${brConfig.label} screenshot`}
                      className="w-full h-auto"
                    />
                  ) : (
                    <div className="aspect-video flex items-center justify-center">
                      <Icon className={cn('h-16 w-16 opacity-20', brConfig.color)} />
                    </div>
                  )}
                  {/* Difference overlay markers */}
                  {snapshot.differences?.map((diff) =>
                    diff.boundingBox ? (
                      <motion.div
                        key={diff.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn(
                          'absolute border-2 rounded pointer-events-none',
                          diff.severity === 'critical' && 'border-red-500 bg-red-500/10',
                          diff.severity === 'high' && 'border-orange-500 bg-orange-500/10',
                          diff.severity === 'medium' && 'border-amber-500 bg-amber-500/10',
                          diff.severity === 'low' && 'border-blue-500 bg-blue-500/10'
                        )}
                        style={{
                          left: `${diff.boundingBox.x}%`,
                          top: `${diff.boundingBox.y}%`,
                          width: `${diff.boundingBox.width}%`,
                          height: `${diff.boundingBox.height}%`,
                        }}
                      />
                    ) : null
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden border bg-muted">
              {snapshot.screenshotUrl ? (
                <img
                  src={snapshot.screenshotUrl}
                  alt={`${brConfig.label} full screenshot`}
                  className="w-full h-auto"
                />
              ) : (
                <div className="aspect-video flex items-center justify-center">
                  <Icon className={cn('h-16 w-16 opacity-20', brConfig.color)} />
                </div>
              )}
              {/* Difference markers overlay */}
              {snapshot.differences?.map((diff) =>
                diff.boundingBox ? (
                  <motion.div
                    key={diff.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      'absolute border-2 rounded pointer-events-none',
                      diff.severity === 'critical' && 'border-red-500 bg-red-500/10',
                      diff.severity === 'high' && 'border-orange-500 bg-orange-500/10',
                      diff.severity === 'medium' && 'border-amber-500 bg-amber-500/10',
                      diff.severity === 'low' && 'border-blue-500 bg-blue-500/10'
                    )}
                    style={{
                      left: `${diff.boundingBox.x}%`,
                      top: `${diff.boundingBox.y}%`,
                      width: `${diff.boundingBox.width}%`,
                      height: `${diff.boundingBox.height}%`,
                    }}
                  />
                ) : null
              )}
            </div>
          )}

          {/* Differences list */}
          {snapshot.differences && snapshot.differences.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Diff className="h-4 w-4 text-amber-500" />
                Browser Differences from Baseline
              </h4>
              <div className="space-y-2">
                {snapshot.differences.map((diff) => (
                  <motion.div
                    key={diff.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'p-3 rounded-lg border',
                      severityColors[diff.severity]
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {differenceTypeIcons[diff.type] || diff.type}
                          </span>
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-xs font-medium uppercase',
                              severityColors[diff.severity]
                            )}
                          >
                            {diff.severity}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {diff.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          Element: {diff.element}
                        </p>
                        {(diff.baselineValue || diff.currentValue) && (
                          <div className="mt-2 flex gap-4 text-xs">
                            {diff.baselineValue && (
                              <div>
                                <span className="text-muted-foreground">Baseline: </span>
                                <code className="px-1 py-0.5 bg-muted rounded font-mono">
                                  {diff.baselineValue}
                                </code>
                              </div>
                            )}
                            {diff.currentValue && (
                              <div>
                                <span className="text-muted-foreground">Current: </span>
                                <code className="px-1 py-0.5 bg-muted rounded font-mono">
                                  {diff.currentValue}
                                </code>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

// Main BrowserMatrix Component
export const BrowserMatrix = memo(function BrowserMatrix({
  snapshots,
  componentName,
  onBrowserSelect,
  className,
}: BrowserMatrixProps) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<BrowserSnapshot | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Find baseline snapshot
  const baselineSnapshot = snapshots.find((s) => s.isBaseline) || null;

  // Sort browsers: baseline first, then chrome, firefox, safari, edge
  const browserOrder: Array<'chrome' | 'firefox' | 'safari' | 'edge'> = [
    'chrome',
    'firefox',
    'safari',
    'edge',
  ];
  const sortedSnapshots = [...snapshots].sort((a, b) => {
    if (a.isBaseline) return -1;
    if (b.isBaseline) return 1;
    return browserOrder.indexOf(a.browser) - browserOrder.indexOf(b.browser);
  });

  const handleBrowserClick = (snapshot: BrowserSnapshot) => {
    setSelectedSnapshot(snapshot);
    setDialogOpen(true);
    onBrowserSelect?.(snapshot);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Browser Compatibility Matrix</h3>
            {componentName && (
              <p className="text-sm text-muted-foreground">{componentName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {browserOrder.map((browser) => {
            const config = browserConfig[browser];
            const Icon = config.icon;
            return (
              <div
                key={browser}
                className={cn('p-1.5 rounded-lg', config.bgColor)}
                title={config.label}
              >
                <Icon className={cn('h-4 w-4', config.color)} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {sortedSnapshots.map((snapshot) => (
            <BrowserCell
              key={snapshot.browser}
              snapshot={snapshot}
              onClick={() => handleBrowserClick(snapshot)}
              isSelected={selectedSnapshot?.browser === snapshot.browser}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Cross-Browser Summary */}
      <CrossBrowserSummary snapshots={sortedSnapshots} />

      {/* Detail Dialog */}
      <BrowserDetailDialog
        snapshot={selectedSnapshot}
        baselineSnapshot={baselineSnapshot}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
});

export default BrowserMatrix;
