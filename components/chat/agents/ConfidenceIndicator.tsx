/**
 * ConfidenceIndicator - Display confidence scores
 *
 * Shows confidence percentage with color coding:
 * - Green: 80%+
 * - Yellow: 60-79%
 * - Orange: 40-59%
 * - Red: <40%
 */

'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface ConfidenceIndicatorProps {
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function getConfidenceColor(confidence: number): {
  text: string;
  bg: string;
  border: string;
} {
  if (confidence >= 80) {
    return {
      text: 'text-green-500',
      bg: 'bg-green-500',
      border: 'border-green-500',
    };
  }
  if (confidence >= 60) {
    return {
      text: 'text-yellow-500',
      bg: 'bg-yellow-500',
      border: 'border-yellow-500',
    };
  }
  if (confidence >= 40) {
    return {
      text: 'text-orange-500',
      bg: 'bg-orange-500',
      border: 'border-orange-500',
    };
  }
  return {
    text: 'text-red-500',
    bg: 'bg-red-500',
    border: 'border-red-500',
  };
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 90) return 'Very High';
  if (confidence >= 70) return 'High';
  if (confidence >= 50) return 'Medium';
  if (confidence >= 30) return 'Low';
  return 'Very Low';
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ConfidenceIndicator = memo(function ConfidenceIndicator({
  confidence,
  size = 'md',
  showLabel = false,
  label,
  className,
}: ConfidenceIndicatorProps) {
  const colors = useMemo(() => getConfidenceColor(confidence), [confidence]);
  const confidenceLabel = useMemo(() => getConfidenceLabel(confidence), [confidence]);

  // Size classes
  const sizeClasses = {
    sm: {
      container: 'gap-1',
      ring: 'w-5 h-5',
      ringWidth: 'border-[2px]',
      text: 'text-[9px]',
      label: 'text-[10px]',
    },
    md: {
      container: 'gap-1.5',
      ring: 'w-7 h-7',
      ringWidth: 'border-[2.5px]',
      text: 'text-[10px]',
      label: 'text-xs',
    },
    lg: {
      container: 'gap-2',
      ring: 'w-10 h-10',
      ringWidth: 'border-[3px]',
      text: 'text-xs',
      label: 'text-sm',
    },
  };

  const s = sizeClasses[size];

  return (
    <div className={cn('flex items-center', s.container, className)}>
      {/* Circular indicator */}
      <div className="relative">
        {/* Background ring */}
        <div
          className={cn(
            'rounded-full border-muted-foreground/20',
            s.ring,
            s.ringWidth
          )}
        />

        {/* Progress ring */}
        <svg
          className={cn('absolute inset-0', s.ring)}
          viewBox="0 0 36 36"
        >
          <motion.path
            className={colors.text.replace('text-', 'stroke-')}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            d="M18 2.0845
               a 15.9155 15.9155 0 0 1 0 31.831
               a 15.9155 15.9155 0 0 1 0 -31.831"
            initial={{ strokeDasharray: '0, 100' }}
            animate={{ strokeDasharray: `${confidence}, 100` }}
            transition={{ duration: 0.5 }}
          />
        </svg>

        {/* Percentage text */}
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center font-medium',
            colors.text,
            s.text
          )}
        >
          {Math.round(confidence)}
        </span>
      </div>

      {/* Label */}
      {(showLabel || label) && (
        <div className="flex flex-col">
          {label && (
            <span className={cn('text-muted-foreground', s.label)}>
              {label}
            </span>
          )}
          {showLabel && (
            <span className={cn('font-medium', colors.text, s.label)}>
              {confidenceLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

// =============================================================================
// INLINE BADGE VARIANT
// =============================================================================

export interface ConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

export const ConfidenceBadge = memo(function ConfidenceBadge({
  confidence,
  className,
}: ConfidenceBadgeProps) {
  const colors = useMemo(() => getConfidenceColor(confidence), [confidence]);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
        `${colors.bg}/10`,
        colors.text,
        className
      )}
    >
      <motion.span
        className={cn('w-1.5 h-1.5 rounded-full', colors.bg)}
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {Math.round(confidence)}%
    </span>
  );
});

export default ConfidenceIndicator;
