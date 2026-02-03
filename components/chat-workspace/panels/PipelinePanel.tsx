'use client';

/**
 * PipelinePanel - CI/CD pipeline status display
 *
 * Features:
 * - Stage diagram (horizontal flow)
 * - Each stage: icon, name, status (pending/running/success/failed)
 * - Expandable logs per stage
 * - Timing information
 * - Re-run button
 */

import * as React from 'react';
import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  RefreshCw,
  Terminal,
  ArrowRight,
  Package,
  TestTube2,
  Rocket,
  Shield,
  FileCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../glass';

// =============================================================================
// TYPES
// =============================================================================

export type StageStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface Stage {
  id: string;
  name: string;
  status: StageStatus;
  duration?: number; // in seconds
  logs?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface Pipeline {
  id: string;
  name?: string;
  branch?: string;
  commit?: string;
  stages: Stage[];
  status: StageStatus;
  duration?: number; // total duration in seconds
  triggeredBy?: string;
  startedAt?: string;
}

export interface PipelinePanelProps {
  pipeline: Pipeline;
  onRerun?: () => void;
  onViewLogs?: (stageId: string) => void;
  className?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatDuration(seconds?: number): string {
  if (!seconds) return '-';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function getStageIcon(stageName: string): React.ElementType {
  const name = stageName.toLowerCase();
  if (name.includes('build')) return Package;
  if (name.includes('test')) return TestTube2;
  if (name.includes('deploy')) return Rocket;
  if (name.includes('security') || name.includes('scan')) return Shield;
  if (name.includes('lint') || name.includes('code')) return FileCode;
  return Play;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const StatusBadge = memo(function StatusBadge({ status }: { status: StageStatus }) {
  const config: Record<StageStatus, { icon: React.ElementType; color: string; label: string; animate?: boolean }> = {
    pending: { icon: Clock, color: 'text-white/50 bg-white/10', label: 'Pending' },
    running: { icon: Loader2, color: 'text-blue-400 bg-blue-500/20', label: 'Running', animate: true },
    success: { icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/20', label: 'Success' },
    failed: { icon: XCircle, color: 'text-red-400 bg-red-500/20', label: 'Failed' },
    skipped: { icon: ArrowRight, color: 'text-yellow-400 bg-yellow-500/20', label: 'Skipped' },
  };

  const { icon: Icon, color, animate } = config[status];

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs', color)}>
      <Icon size={12} className={animate ? 'animate-spin' : undefined} />
    </span>
  );
});

const StageNode = memo(function StageNode({
  stage,
  isLast,
  onViewLogs,
}: {
  stage: Stage;
  isLast: boolean;
  onViewLogs?: (stageId: string) => void;
}) {
  const [showLogs, setShowLogs] = useState(false);
  const Icon = getStageIcon(stage.name);

  const statusColors = {
    pending: 'border-white/20 bg-white/5',
    running: 'border-blue-500/50 bg-blue-500/10',
    success: 'border-emerald-500/50 bg-emerald-500/10',
    failed: 'border-red-500/50 bg-red-500/10',
    skipped: 'border-yellow-500/50 bg-yellow-500/10',
  };

  const iconColors = {
    pending: 'text-white/40',
    running: 'text-blue-400',
    success: 'text-emerald-400',
    failed: 'text-red-400',
    skipped: 'text-yellow-400',
  };

  return (
    <div className="flex items-start">
      <div className="flex flex-col items-center">
        {/* Stage Icon */}
        <motion.div
          className={cn(
            'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors',
            statusColors[stage.status]
          )}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {stage.status === 'running' ? (
            <Loader2 size={18} className="text-blue-400 animate-spin" />
          ) : (
            <Icon size={18} className={iconColors[stage.status]} />
          )}
        </motion.div>

        {/* Stage Details */}
        <div className="mt-2 text-center">
          <div className="text-xs font-medium text-white/80">{stage.name}</div>
          <div className="text-xs text-white/40 mt-0.5">
            {formatDuration(stage.duration)}
          </div>
          {stage.logs && (
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
            >
              <Terminal size={10} />
              Logs
              <ChevronDown
                size={10}
                className={cn('transition-transform', showLogs && 'rotate-180')}
              />
            </button>
          )}
        </div>

        {/* Logs Dropdown */}
        <AnimatePresence>
          {showLogs && stage.logs && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 w-48 overflow-hidden"
            >
              <div className="bg-black/50 rounded-lg p-2 border border-white/10">
                <pre className="text-xs text-white/60 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {stage.logs}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Connector Arrow */}
      {!isLast && (
        <div className="flex items-center h-10 mx-2">
          <div className="w-8 h-0.5 bg-gradient-to-r from-white/20 to-white/10" />
          <ArrowRight size={12} className="text-white/20 -ml-1" />
        </div>
      )}
    </div>
  );
});

// =============================================================================
// LOADING SKELETON
// =============================================================================

const PipelineSkeleton = memo(function PipelineSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-6 w-32 bg-white/10 rounded" />
        <div className="h-6 w-20 bg-white/10 rounded-full" />
      </div>
      <div className="flex items-start justify-center gap-4 py-4">
        {[1, 2, 3, 4].map((i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/10" />
              <div className="h-4 w-16 bg-white/10 rounded" />
            </div>
            {i < 4 && <div className="h-0.5 w-8 bg-white/10 mt-5" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PipelinePanel = memo(function PipelinePanel({
  pipeline,
  onRerun,
  onViewLogs,
  className,
}: PipelinePanelProps) {
  const statusConfig = {
    pending: { color: 'text-white/50', label: 'Pending' },
    running: { color: 'text-blue-400', label: 'Running' },
    success: { color: 'text-emerald-400', label: 'Success' },
    failed: { color: 'text-red-400', label: 'Failed' },
    skipped: { color: 'text-yellow-400', label: 'Skipped' },
  };

  const currentStatus = statusConfig[pipeline.status];

  return (
    <GlassCard variant="medium" padding="none" className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-indigo-400" />
          <h3 className="text-sm font-medium text-white">
            {pipeline.name || 'Pipeline'}
          </h3>
          <StatusBadge status={pipeline.status} />
        </div>
        {onRerun && (
          <button
            onClick={onRerun}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <RefreshCw size={12} />
            Re-run
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Pipeline Info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {pipeline.branch && (
            <div className="flex items-center gap-1 text-white/60">
              <GitBranch size={12} />
              <span>{pipeline.branch}</span>
            </div>
          )}
          {pipeline.commit && (
            <div className="text-white/40 font-mono">
              {pipeline.commit.slice(0, 7)}
            </div>
          )}
          {pipeline.duration && (
            <div className="flex items-center gap-1 text-white/60">
              <Clock size={12} />
              <span>{formatDuration(pipeline.duration)}</span>
            </div>
          )}
          {pipeline.triggeredBy && (
            <div className="text-white/40">
              by {pipeline.triggeredBy}
            </div>
          )}
        </div>

        {/* Stage Diagram */}
        <div className="overflow-x-auto">
          <div className="flex items-start justify-center min-w-max py-4">
            {pipeline.stages.map((stage, index) => (
              <StageNode
                key={stage.id}
                stage={stage}
                isLast={index === pipeline.stages.length - 1}
                onViewLogs={onViewLogs}
              />
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span className="text-white/60">
                {pipeline.stages.filter((s) => s.status === 'success').length} passed
              </span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle size={12} className="text-red-400" />
              <span className="text-white/60">
                {pipeline.stages.filter((s) => s.status === 'failed').length} failed
              </span>
            </div>
          </div>
          <div className={cn('text-xs font-medium', currentStatus.color)}>
            {currentStatus.label}
          </div>
        </div>
      </div>
    </GlassCard>
  );
});

export { PipelineSkeleton };
export default PipelinePanel;
