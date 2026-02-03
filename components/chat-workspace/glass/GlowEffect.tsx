'use client';

import * as React from 'react';
import { motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface GlowEffectProps {
  /** Content to wrap with glow effect */
  children: React.ReactNode;
  /** Glow color - accepts hex, rgb, rgba, or CSS variable */
  color?: string;
  /** Glow intensity (blur spread radius) */
  intensity?: 'subtle' | 'medium' | 'strong';
  /** Whether the glow animates (pulses) */
  animated?: boolean;
  /** Animation speed in seconds */
  animationDuration?: number;
  /** Additional classes */
  className?: string;
  /** Whether glow is currently active */
  active?: boolean;
}

const intensityMap = {
  subtle: {
    blur: '20px',
    spread: '0px',
    opacity: 0.3,
  },
  medium: {
    blur: '40px',
    spread: '0px',
    opacity: 0.4,
  },
  strong: {
    blur: '60px',
    spread: '4px',
    opacity: 0.5,
  },
};

const pulseVariants: Variants = {
  initial: {
    opacity: 0.3,
    scale: 1,
  },
  animate: {
    opacity: [0.3, 0.5, 0.3],
    scale: [1, 1.02, 1],
  },
};

const GlowEffect = React.forwardRef<HTMLDivElement, GlowEffectProps>(
  (
    {
      children,
      color = '#6366f1',
      intensity = 'medium',
      animated = false,
      animationDuration = 2,
      className,
      active = true,
    },
    ref
  ) => {
    const config = intensityMap[intensity];

    // Build box-shadow string
    const boxShadow = active
      ? `0 0 ${config.blur} ${config.spread} ${color}`
      : 'none';

    const glowStyle: React.CSSProperties = {
      boxShadow,
      opacity: active ? config.opacity : 0,
    };

    if (animated && active) {
      return (
        <div ref={ref} className={cn('relative', className)}>
          {/* Animated glow layer */}
          <motion.div
            className="absolute inset-0 rounded-[inherit] pointer-events-none"
            style={{ boxShadow }}
            variants={pulseVariants}
            initial="initial"
            animate="animate"
            transition={{
              duration: animationDuration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Content */}
          <div className="relative">{children}</div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn('relative transition-shadow duration-300', className)}
        style={glowStyle}
      >
        {children}
      </div>
    );
  }
);

GlowEffect.displayName = 'GlowEffect';

/**
 * Preset glow colors for common use cases
 */
export const glowColors = {
  primary: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
  pink: '#ec4899',
} as const;

export { GlowEffect };
