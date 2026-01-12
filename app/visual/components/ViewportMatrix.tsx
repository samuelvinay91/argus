'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Tablet,
  Monitor,
  MonitorUp,
  Check,
  X,
  AlertTriangle,
  ChevronRight,
  Maximize2,
  ArrowRight,
  ZoomIn,
} from 'lucide-react';
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
export interface BreakpointIssue {
  id: string;
  type: 'overflow' | 'truncation' | 'misalignment' | 'responsive' | 'missing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  element: string;
  description: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ViewportSnapshot {
  viewport: 'mobile' | 'tablet' | 'desktop' | 'wide';
  width: number;
  height: number;
  screenshotUrl: string;
  status: 'pass' | 'fail' | 'issues';
  issueCount: number;
  issues?: BreakpointIssue[];
}

interface ViewportMatrixProps {
  snapshots: ViewportSnapshot[];
  componentName?: string;
  onViewportSelect?: (viewport: ViewportSnapshot) => void;
  className?: string;
}

// Viewport configuration
const viewportConfig = {
  mobile: {
    label: 'Mobile',
    icon: Smartphone,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    glowColor: 'shadow-cyan-500/20',
  },
  tablet: {
    label: 'Tablet',
    icon: Tablet,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    glowColor: 'shadow-violet-500/20',
  },
  desktop: {
    label: 'Desktop',
    icon: Monitor,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    glowColor: 'shadow-blue-500/20',
  },
  wide: {
    label: 'Wide',
    icon: MonitorUp,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
    glowColor: 'shadow-indigo-500/20',
  },
};

// Status configuration
const statusConfig = {
  pass: {
    label: 'Pass',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500',
    borderColor: 'border-emerald-500/30',
    icon: Check,
  },
  fail: {
    label: 'Fail',
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    borderColor: 'border-red-500/30',
    icon: X,
  },
  issues: {
    label: 'Issues',
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

// Viewport Cell Component
const ViewportCell = memo(function ViewportCell({
  snapshot,
  onClick,
  isSelected,
}: {
  snapshot: ViewportSnapshot;
  onClick: () => void;
  isSelected: boolean;
}) {
  const vpConfig = viewportConfig[snapshot.viewport];
  const stConfig = statusConfig[snapshot.status];
  const Icon = vpConfig.icon;
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
      {/* Screenshot preview */}
      <div className="aspect-[16/10] relative overflow-hidden bg-muted">
        {snapshot.screenshotUrl ? (
          <img
            src={snapshot.screenshotUrl}
            alt={`${vpConfig.label} viewport screenshot`}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className={cn('h-12 w-12 opacity-20', vpConfig.color)} />
          </div>
        )}

        {/* Hover overlay with zoom icon */}
        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <ZoomIn className="h-8 w-8 text-white" />
        </div>

        {/* Status badge */}
        <div
          className={cn(
            'absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            stConfig.bgColor,
            'text-white'
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {snapshot.status === 'issues' && snapshot.issueCount > 0 && (
            <span>{snapshot.issueCount}</span>
          )}
        </div>

        {/* Viewport size badge */}
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs font-mono">
          {snapshot.width} x {snapshot.height}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg', vpConfig.bgColor)}>
            <Icon className={cn('h-4 w-4', vpConfig.color)} />
          </div>
          <span className="font-medium text-sm">{vpConfig.label}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Issue highlight pulse for failing viewports */}
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

// Summary Row Component
const SummaryRow = memo(function SummaryRow({
  snapshots,
}: {
  snapshots: ViewportSnapshot[];
}) {
  const totalIssues = snapshots.reduce((sum, s) => sum + s.issueCount, 0);
  const passCount = snapshots.filter((s) => s.status === 'pass').length;
  const failCount = snapshots.filter((s) => s.status === 'fail').length;
  const issueCount = snapshots.filter((s) => s.status === 'issues').length;

  return (
    <Card className="p-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm text-muted-foreground">
              {passCount} Pass
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-sm text-muted-foreground">
              {issueCount} Issues
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="text-sm text-muted-foreground">
              {failCount} Fail
            </span>
          </div>
        </div>
        {totalIssues > 0 && (
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {totalIssues} breakpoint issue{totalIssues !== 1 ? 's' : ''} detected
            </span>
          </div>
        )}
      </div>

      {/* Per-viewport issue breakdown */}
      {totalIssues > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50 flex gap-4">
          {snapshots
            .filter((s) => s.issueCount > 0)
            .map((snapshot) => {
              const vpConfig = viewportConfig[snapshot.viewport];
              const Icon = vpConfig.icon;
              return (
                <div
                  key={snapshot.viewport}
                  className="flex items-center gap-2 text-xs"
                >
                  <Icon className={cn('h-3.5 w-3.5', vpConfig.color)} />
                  <span className="text-muted-foreground">
                    {vpConfig.label}:{' '}
                    <span className="font-medium text-foreground">
                      {snapshot.issueCount}
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

// Detail Dialog Component
const ViewportDetailDialog = memo(function ViewportDetailDialog({
  snapshot,
  open,
  onOpenChange,
}: {
  snapshot: ViewportSnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!snapshot) return null;

  const vpConfig = viewportConfig[snapshot.viewport];
  const stConfig = statusConfig[snapshot.status];
  const Icon = vpConfig.icon;
  const StatusIcon = stConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', vpConfig.bgColor)}>
              <Icon className={cn('h-5 w-5', vpConfig.color)} />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                {vpConfig.label} Viewport
                <span className="text-sm font-mono text-muted-foreground">
                  ({snapshot.width} x {snapshot.height})
                </span>
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <StatusIcon className={cn('h-4 w-4', stConfig.color)} />
                <span className={stConfig.color}>{stConfig.label}</span>
                {snapshot.issueCount > 0 && (
                  <span className="text-muted-foreground">
                    - {snapshot.issueCount} issue{snapshot.issueCount !== 1 ? 's' : ''}
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 mt-4">
          {/* Screenshot */}
          <div className="relative rounded-lg overflow-hidden border bg-muted">
            {snapshot.screenshotUrl ? (
              <img
                src={snapshot.screenshotUrl}
                alt={`${vpConfig.label} viewport full screenshot`}
                className="w-full h-auto"
              />
            ) : (
              <div className="aspect-video flex items-center justify-center">
                <Icon className={cn('h-16 w-16 opacity-20', vpConfig.color)} />
              </div>
            )}

            {/* Issue markers overlay */}
            {snapshot.issues?.map((issue) =>
              issue.boundingBox ? (
                <motion.div
                  key={issue.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    'absolute border-2 rounded pointer-events-none',
                    issue.severity === 'critical' && 'border-red-500 bg-red-500/10',
                    issue.severity === 'high' && 'border-orange-500 bg-orange-500/10',
                    issue.severity === 'medium' && 'border-amber-500 bg-amber-500/10',
                    issue.severity === 'low' && 'border-blue-500 bg-blue-500/10'
                  )}
                  style={{
                    left: `${issue.boundingBox.x}%`,
                    top: `${issue.boundingBox.y}%`,
                    width: `${issue.boundingBox.width}%`,
                    height: `${issue.boundingBox.height}%`,
                  }}
                />
              ) : null
            )}
          </div>

          {/* Issues list */}
          {snapshot.issues && snapshot.issues.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Breakpoint Issues
              </h4>
              <div className="space-y-2">
                {snapshot.issues.map((issue) => (
                  <motion.div
                    key={issue.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'p-3 rounded-lg border',
                      severityColors[issue.severity]
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm capitalize">
                            {issue.type}
                          </span>
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-xs font-medium uppercase',
                              severityColors[issue.severity]
                            )}
                          >
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {issue.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          Element: {issue.element}
                        </p>
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

// Main ViewportMatrix Component
export const ViewportMatrix = memo(function ViewportMatrix({
  snapshots,
  componentName,
  onViewportSelect,
  className,
}: ViewportMatrixProps) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<ViewportSnapshot | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Sort viewports in order: mobile, tablet, desktop, wide
  const orderedViewports: Array<'mobile' | 'tablet' | 'desktop' | 'wide'> = [
    'mobile',
    'tablet',
    'desktop',
    'wide',
  ];
  const sortedSnapshots = [...snapshots].sort(
    (a, b) => orderedViewports.indexOf(a.viewport) - orderedViewports.indexOf(b.viewport)
  );

  const handleViewportClick = (snapshot: ViewportSnapshot) => {
    setSelectedSnapshot(snapshot);
    setDialogOpen(true);
    onViewportSelect?.(snapshot);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Maximize2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Viewport Matrix</h3>
            {componentName && (
              <p className="text-sm text-muted-foreground">{componentName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Smartphone className="h-4 w-4" />
          <ArrowRight className="h-3 w-3" />
          <MonitorUp className="h-4 w-4" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {sortedSnapshots.map((snapshot) => (
            <ViewportCell
              key={snapshot.viewport}
              snapshot={snapshot}
              onClick={() => handleViewportClick(snapshot)}
              isSelected={selectedSnapshot?.viewport === snapshot.viewport}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Summary Row */}
      <SummaryRow snapshots={sortedSnapshots} />

      {/* Detail Dialog */}
      <ViewportDetailDialog
        snapshot={selectedSnapshot}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
});

export default ViewportMatrix;
