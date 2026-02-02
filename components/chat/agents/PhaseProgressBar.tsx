/**
 * PhaseProgressBar - Display current testing phase with progress
 *
 * Shows the testing lifecycle phases with visual indication
 * of current phase and progress.
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { TestingPhase } from '@/lib/chat/chat-store';

// =============================================================================
// TYPES
// =============================================================================

export interface PhaseProgressBarProps {
  phase: TestingPhase;
  progress?: number;
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
}

// =============================================================================
// PHASE CONFIG
// =============================================================================

const PHASES: Array<{
  id: TestingPhase;
  label: string;
  shortLabel: string;
  color: string;
  activeColor: string;
}> = [
  {
    id: 'analysis',
    label: 'Analysis',
    shortLabel: 'Analyze',
    color: 'bg-blue-500/20',
    activeColor: 'bg-blue-500',
  },
  {
    id: 'planning',
    label: 'Planning',
    shortLabel: 'Plan',
    color: 'bg-purple-500/20',
    activeColor: 'bg-purple-500',
  },
  {
    id: 'execution',
    label: 'Execution',
    shortLabel: 'Execute',
    color: 'bg-green-500/20',
    activeColor: 'bg-green-500',
  },
  {
    id: 'healing',
    label: 'Self-Healing',
    shortLabel: 'Heal',
    color: 'bg-orange-500/20',
    activeColor: 'bg-orange-500',
  },
  {
    id: 'reporting',
    label: 'Reporting',
    shortLabel: 'Report',
    color: 'bg-cyan-500/20',
    activeColor: 'bg-cyan-500',
  },
];

// =============================================================================
// COMPACT VERSION
// =============================================================================

const CompactPhaseBar = memo(function CompactPhaseBar({
  phase,
  progress = 0,
  className,
}: PhaseProgressBarProps) {
  const currentPhaseConfig = PHASES.find(p => p.id === phase);
  const currentIndex = PHASES.findIndex(p => p.id === phase);

  if (phase === 'idle' || currentIndex === -1) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Phase indicator dots */}
      <div className="flex items-center gap-1">
        {PHASES.map((p, index) => (
          <motion.div
            key={p.id}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              index < currentIndex && 'bg-primary',
              index === currentIndex && p.activeColor,
              index > currentIndex && 'bg-muted'
            )}
            animate={
              index === currentIndex
                ? { scale: [1, 1.2, 1] }
                : {}
            }
            transition={{ duration: 1, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Current phase label */}
      <span className="text-xs font-medium text-muted-foreground">
        {currentPhaseConfig?.shortLabel}
      </span>

      {/* Progress */}
      {progress > 0 && progress < 100 && (
        <span className="text-[10px] text-muted-foreground">
          {progress}%
        </span>
      )}
    </div>
  );
});

// =============================================================================
// FULL VERSION
// =============================================================================

const FullPhaseBar = memo(function FullPhaseBar({
  phase,
  progress = 0,
  showLabel = true,
  className,
}: PhaseProgressBarProps) {
  const currentIndex = PHASES.findIndex(p => p.id === phase);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Phase</span>
          <span className="text-muted-foreground">
            {phase === 'idle' ? 'Ready' : PHASES.find(p => p.id === phase)?.label}
          </span>
        </div>
      )}

      {/* Phase segments */}
      <div className="flex gap-1">
        {PHASES.map((p, index) => {
          const isPast = currentIndex > index;
          const isCurrent = currentIndex === index;
          const isFuture = currentIndex < index || phase === 'idle';

          return (
            <div
              key={p.id}
              className="flex-1 relative"
            >
              {/* Background */}
              <div
                className={cn(
                  'h-2 rounded-full transition-colors',
                  isFuture && 'bg-muted',
                  isPast && p.activeColor,
                  isCurrent && p.color
                )}
              />

              {/* Progress fill for current phase */}
              {isCurrent && (
                <motion.div
                  className={cn('absolute inset-0 h-2 rounded-full', p.activeColor)}
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              )}

              {/* Pulse animation for current */}
              {isCurrent && (
                <motion.div
                  className={cn(
                    'absolute inset-0 h-2 rounded-full opacity-50',
                    p.activeColor
                  )}
                  animate={{ opacity: [0.5, 0.2, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Phase labels (optional) */}
      {showLabel && phase !== 'idle' && (
        <div className="flex text-[10px] text-muted-foreground">
          {PHASES.map((p, index) => (
            <div
              key={p.id}
              className={cn(
                'flex-1 text-center transition-colors',
                index === currentIndex && 'text-foreground font-medium'
              )}
            >
              {p.shortLabel}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// =============================================================================
// MAIN EXPORT
// =============================================================================

export const PhaseProgressBar = memo(function PhaseProgressBar({
  compact = false,
  ...props
}: PhaseProgressBarProps) {
  if (compact) {
    return <CompactPhaseBar {...props} />;
  }
  return <FullPhaseBar {...props} />;
});

export default PhaseProgressBar;
