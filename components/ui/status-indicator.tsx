'use client';

import { memo } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Sparkles,
  Circle,
  type LucideIcon,
} from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Status type definition
export type Status = 'passed' | 'failed' | 'running' | 'pending' | 'healing' | 'idle';

// Status configuration
const statusConfig: Record<
  Status,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: LucideIcon;
  }
> = {
  passed: {
    label: 'Passed',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500',
    borderColor: 'border-emerald-500',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Failed',
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    borderColor: 'border-red-500',
    icon: XCircle,
  },
  running: {
    label: 'Running',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500',
    borderColor: 'border-cyan-500',
    icon: Loader2,
  },
  pending: {
    label: 'Pending',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-500',
    icon: Clock,
  },
  healing: {
    label: 'Healing',
    color: 'text-violet-500',
    bgColor: 'bg-violet-500',
    borderColor: 'border-violet-500',
    icon: Sparkles,
  },
  idle: {
    label: 'Idle',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted-foreground',
    borderColor: 'border-muted-foreground',
    icon: Circle,
  },
};

// Size variants using CVA
const sizeVariants = cva('', {
  variants: {
    size: {
      sm: '',
      md: '',
      lg: '',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

// Dot size classes
const dotSizes = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

// Icon size classes
const iconSizes = {
  sm: 12,
  md: 16,
  lg: 20,
};

// Text size classes
const textSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

// Badge/Pill padding classes
const paddingSizes = {
  sm: 'px-1.5 py-0.5',
  md: 'px-2 py-1',
  lg: 'px-3 py-1.5',
};

// Animation variants for different statuses
const pulseAnimation: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

const sparkleAnimation: Variants = {
  animate: {
    rotate: [0, 180, 360],
    scale: [1, 1.1, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

const shakeAnimation: Variants = {
  animate: {
    x: [-1, 1, -1, 1, 0],
    transition: {
      duration: 0.4,
      repeat: Infinity,
      repeatDelay: 2,
      ease: 'easeInOut',
    },
  },
};

const spinAnimation: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Get animation for status
const getAnimation = (status: Status, animate: boolean): Variants | undefined => {
  if (!animate) return undefined;

  switch (status) {
    case 'running':
      return pulseAnimation;
    case 'healing':
      return sparkleAnimation;
    case 'failed':
      return shakeAnimation;
    default:
      return undefined;
  }
};

export interface StatusIndicatorProps extends VariantProps<typeof sizeVariants> {
  status: Status;
  variant?: 'dot' | 'badge' | 'pill' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
  className?: string;
}

// Dot variant component
const DotIndicator = memo(function DotIndicator({
  status,
  size = 'md',
  showLabel,
  animate = true,
  className,
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const animation = getAnimation(status, animate);

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="relative flex">
        <motion.span
          className={cn('rounded-full', dotSizes[size], config.bgColor)}
          variants={animation}
          animate={animation ? 'animate' : undefined}
        />
        {/* Pulse ring for running status */}
        {animate && status === 'running' && (
          <motion.span
            className={cn(
              'absolute inset-0 rounded-full',
              config.bgColor,
              'opacity-40'
            )}
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.4, 0, 0.4],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        )}
      </span>
      {showLabel && (
        <span className={cn(textSizes[size], config.color, 'font-medium')}>
          {config.label}
        </span>
      )}
    </span>
  );
});

// Badge variant component
const BadgeIndicator = memo(function BadgeIndicator({
  status,
  size = 'md',
  showLabel = true,
  animate = true,
  className,
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const animation = getAnimation(status, animate);
  const Icon = config.icon;

  return (
    <motion.span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border',
        paddingSizes[size],
        config.borderColor,
        'bg-background',
        className
      )}
      variants={animation}
      animate={animation ? 'animate' : undefined}
    >
      {status === 'running' && animate ? (
        <motion.div variants={spinAnimation} animate="animate">
          <Icon className={cn(config.color)} size={iconSizes[size]} />
        </motion.div>
      ) : (
        <Icon className={cn(config.color)} size={iconSizes[size]} />
      )}
      {showLabel && (
        <span className={cn(textSizes[size], config.color, 'font-medium')}>
          {config.label}
        </span>
      )}
    </motion.span>
  );
});

// Pill variant component
const PillIndicator = memo(function PillIndicator({
  status,
  size = 'md',
  showLabel = true,
  animate = true,
  className,
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const animation = getAnimation(status, animate);
  const Icon = config.icon;

  return (
    <motion.span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full',
        paddingSizes[size],
        `${config.bgColor}/10`,
        className
      )}
      variants={animation}
      animate={animation ? 'animate' : undefined}
    >
      {status === 'running' && animate ? (
        <motion.div variants={spinAnimation} animate="animate">
          <Icon className={cn(config.color)} size={iconSizes[size]} />
        </motion.div>
      ) : (
        <Icon className={cn(config.color)} size={iconSizes[size]} />
      )}
      {showLabel && (
        <span className={cn(textSizes[size], config.color, 'font-medium')}>
          {config.label}
        </span>
      )}
    </motion.span>
  );
});

// Icon-only variant component
const IconIndicator = memo(function IconIndicator({
  status,
  size = 'md',
  showLabel,
  animate = true,
  className,
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const animation = getAnimation(status, animate);
  const Icon = config.icon;

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {status === 'running' && animate ? (
        <motion.div variants={spinAnimation} animate="animate">
          <Icon className={cn(config.color)} size={iconSizes[size]} />
        </motion.div>
      ) : (
        <motion.div variants={animation} animate={animation ? 'animate' : undefined}>
          <Icon className={cn(config.color)} size={iconSizes[size]} />
        </motion.div>
      )}
      {showLabel && (
        <span className={cn(textSizes[size], config.color, 'font-medium')}>
          {config.label}
        </span>
      )}
    </span>
  );
});

// Main StatusIndicator component
export const StatusIndicator = memo(function StatusIndicator({
  status,
  variant = 'dot',
  size = 'md',
  showLabel = false,
  animate = true,
  className,
}: StatusIndicatorProps) {
  const props = { status, size, showLabel, animate, className };

  switch (variant) {
    case 'dot':
      return <DotIndicator {...props} />;
    case 'badge':
      return <BadgeIndicator {...props} />;
    case 'pill':
      return <PillIndicator {...props} />;
    case 'icon':
      return <IconIndicator {...props} />;
    default:
      return <DotIndicator {...props} />;
  }
});

// Export status config for external use
export { statusConfig };

// Helper function to get status from string
export function parseStatus(value: string): Status {
  const normalized = value.toLowerCase();
  if (normalized in statusConfig) {
    return normalized as Status;
  }
  return 'idle';
}

export default StatusIndicator;
