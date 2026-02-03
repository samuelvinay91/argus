/**
 * ThinkingIndicator - AI thinking/processing state display
 *
 * Features:
 * - Animated dots or shimmer
 * - Optional status text ("Analyzing...", "Running tests...")
 * - Progress steps display
 * - Multiple visual variants
 */

'use client';

import { memo } from 'react';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import { Bot, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../glass';

// =============================================================================
// TYPES
// =============================================================================

export interface ThinkingStep {
  /** Step label */
  label: string;
  /** Whether the step is complete */
  complete: boolean;
  /** Whether the step is currently active */
  active?: boolean;
}

export interface ThinkingIndicatorProps {
  /** Current status text */
  status?: string;
  /** Progress steps to display */
  steps?: ThinkingStep[];
  /** Visual variant */
  variant?: 'dots' | 'shimmer' | 'pulse' | 'wave';
  /** Size of the indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show avatar */
  showAvatar?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.15,
    },
  },
};

const dotVariants: Variants = {
  initial: { y: 0, opacity: 0.5 },
  animate: { y: -6, opacity: 1 },
};

const pulseVariants: Variants = {
  initial: { scale: 1, opacity: 0.3 },
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0.3, 1, 0.3],
  },
};

const waveVariants: Variants = {
  initial: { scaleY: 0.5 },
  animate: { scaleY: 1 },
};

// =============================================================================
// SIZE CONFIG
// =============================================================================

const sizeConfig = {
  sm: {
    dot: 'w-1.5 h-1.5',
    gap: 'gap-1',
    text: 'text-xs',
    avatar: 'w-6 h-6',
    avatarIcon: 'w-3 h-3',
  },
  md: {
    dot: 'w-2 h-2',
    gap: 'gap-1.5',
    text: 'text-sm',
    avatar: 'w-8 h-8',
    avatarIcon: 'w-4 h-4',
  },
  lg: {
    dot: 'w-2.5 h-2.5',
    gap: 'gap-2',
    text: 'text-base',
    avatar: 'w-10 h-10',
    avatarIcon: 'w-5 h-5',
  },
};

// =============================================================================
// ANIMATED DOTS
// =============================================================================

interface AnimatedDotsProps {
  variant: 'dots' | 'wave' | 'pulse';
  size: 'sm' | 'md' | 'lg';
}

const AnimatedDots = memo(function AnimatedDots({ variant, size }: AnimatedDotsProps) {
  const config = sizeConfig[size];
  const dots = [0, 1, 2];

  if (variant === 'pulse') {
    return (
      <div className={cn('flex items-center', config.gap)}>
        {dots.map((i) => (
          <motion.div
            key={i}
            variants={pulseVariants}
            initial="initial"
            animate="animate"
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
            className={cn(config.dot, 'rounded-full bg-primary')}
          />
        ))}
      </div>
    );
  }

  if (variant === 'wave') {
    return (
      <div className={cn('flex items-end h-4', config.gap)}>
        {dots.map((i) => (
          <motion.div
            key={i}
            variants={waveVariants}
            initial="initial"
            animate="animate"
            transition={{
              duration: 0.4,
              repeat: Infinity,
              repeatType: 'reverse',
              delay: i * 0.1,
              ease: 'easeInOut',
            }}
            className={cn('w-1 h-4 rounded-full bg-primary origin-bottom')}
          />
        ))}
      </div>
    );
  }

  // Default: bouncing dots
  return (
    <div className={cn('flex items-center', config.gap)}>
      {dots.map((i) => (
        <motion.div
          key={i}
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{
            duration: 0.4,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
          className={cn(config.dot, 'rounded-full bg-primary')}
        />
      ))}
    </div>
  );
});

// =============================================================================
// SHIMMER EFFECT
// =============================================================================

interface ShimmerProps {
  size: 'sm' | 'md' | 'lg';
}

const Shimmer = memo(function Shimmer({ size }: ShimmerProps) {
  const heights = {
    sm: 'h-3',
    md: 'h-4',
    lg: 'h-5',
  };

  return (
    <div className="space-y-2 w-32">
      <motion.div
        animate={{
          background: [
            'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
            'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.1) 100%)',
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
        className={cn('rounded', heights[size])}
      />
      <motion.div
        animate={{
          background: [
            'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
            'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.1) 100%)',
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
          delay: 0.2,
        }}
        className={cn('rounded w-3/4', heights[size])}
      />
    </div>
  );
});

// =============================================================================
// PROGRESS STEPS
// =============================================================================

interface ProgressStepsProps {
  steps: ThinkingStep[];
  size: 'sm' | 'md' | 'lg';
}

const ProgressSteps = memo(function ProgressSteps({ steps, size }: ProgressStepsProps) {
  const config = sizeConfig[size];

  return (
    <div className="flex flex-col gap-2 mt-3">
      {steps.map((step, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn('flex items-center gap-2', config.text)}
        >
          {step.complete ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : step.active ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <Circle className="w-4 h-4 text-muted-foreground/50" />
          )}
          <span
            className={cn(
              step.complete && 'text-muted-foreground line-through',
              step.active && 'text-foreground',
              !step.complete && !step.active && 'text-muted-foreground/50'
            )}
          >
            {step.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
});

// =============================================================================
// AVATAR
// =============================================================================

interface ThinkingAvatarProps {
  size: 'sm' | 'md' | 'lg';
}

const ThinkingAvatar = memo(function ThinkingAvatar({ size }: ThinkingAvatarProps) {
  const config = sizeConfig[size];

  return (
    <div className="relative flex-shrink-0">
      {/* Pulse ring */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1.4, opacity: 0 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeOut',
        }}
        className={cn('absolute inset-0 rounded-full bg-primary/30', config.avatar)}
      />

      {/* Avatar */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={cn(
          'rounded-full',
          'bg-gradient-to-br from-primary/20 to-violet-500/20',
          'flex items-center justify-center',
          'border border-white/10',
          config.avatar
        )}
      >
        <Bot className={cn('text-primary', config.avatarIcon)} />
      </motion.div>

      {/* Status indicator */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={cn(
          'absolute -bottom-0.5 -right-0.5',
          'w-3 h-3 rounded-full bg-amber-500',
          'border-2 border-background'
        )}
      >
        <motion.div
          className="w-full h-full rounded-full bg-amber-500"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      </motion.div>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ThinkingIndicator = memo(function ThinkingIndicator({
  status,
  steps,
  variant = 'dots',
  size = 'md',
  showAvatar = true,
  className,
}: ThinkingIndicatorProps) {
  const config = sizeConfig[size];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn('flex gap-3', className)}
    >
      {/* Avatar */}
      {showAvatar && <ThinkingAvatar size={size} />}

      {/* Content */}
      <GlassCard variant="subtle" padding="sm" className="min-w-[120px]">
        {/* Animation */}
        <div className="flex items-center gap-3">
          {variant === 'shimmer' ? (
            <Shimmer size={size} />
          ) : (
            <AnimatedDots variant={variant} size={size} />
          )}

          {/* Status text */}
          <AnimatePresence mode="wait">
            {status && (
              <motion.span
                key={status}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className={cn('text-muted-foreground', config.text)}
              >
                {status}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Progress steps */}
        {steps && steps.length > 0 && <ProgressSteps steps={steps} size={size} />}
      </GlassCard>
    </motion.div>
  );
});

export default ThinkingIndicator;
