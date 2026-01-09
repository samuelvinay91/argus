'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const typingIndicatorVariants = cva('inline-flex items-center', {
  variants: {
    size: {
      sm: 'gap-[3px]',
      md: 'gap-1',
      lg: 'gap-[5px]',
    },
    color: {
      primary: '[--dot-color:hsl(var(--primary))]',
      violet: '[--dot-color:hsl(var(--argus-violet-400))]',
      muted: '[--dot-color:hsl(var(--muted-foreground))]',
    },
  },
  defaultVariants: {
    size: 'md',
    color: 'primary',
  },
});

const dotVariants = cva('rounded-full bg-[var(--dot-color)]', {
  variants: {
    size: {
      sm: 'h-1.5 w-1.5',
      md: 'h-2 w-2',
      lg: 'h-2.5 w-2.5',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const labelVariants = cva('text-[var(--dot-color)]', {
  variants: {
    size: {
      sm: 'ml-1.5 text-xs',
      md: 'ml-2 text-sm',
      lg: 'ml-2.5 text-base',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface TypingIndicatorProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof typingIndicatorVariants> {
  variant?: 'dots' | 'pulse' | 'wave';
  label?: string;
}

const TypingIndicator = React.forwardRef<HTMLDivElement, TypingIndicatorProps>(
  ({ className, variant = 'dots', color, size, label, ...props }, ref) => {
    const getAnimationClass = (index: number): string => {
      if (variant === 'wave') {
        return 'animate-[wave-dot_1.2s_ease-in-out_infinite]';
      }
      return 'animate-[bounce-dot_1s_ease-in-out_infinite]';
    };

    const getAnimationDelay = (index: number): React.CSSProperties => {
      return { animationDelay: `${index * 0.15}s` };
    };

    const renderDots = () => {
      const dots = [0, 1, 2];

      if (variant === 'pulse') {
        return (
          <span
            className={cn(
              dotVariants({ size }),
              'animate-pulse'
            )}
          />
        );
      }

      return dots.map((i) => (
        <span
          key={i}
          className={cn(dotVariants({ size }), getAnimationClass(i))}
          style={getAnimationDelay(i)}
        />
      ));
    };

    return (
      <div
        ref={ref}
        className={cn(typingIndicatorVariants({ size, color, className }))}
        role="status"
        aria-label={label || 'typing'}
        {...props}
      >
        {renderDots()}
        {label && (
          <span className={cn(labelVariants({ size }))}>{label}</span>
        )}
      </div>
    );
  }
);

TypingIndicator.displayName = 'TypingIndicator';

export { TypingIndicator, typingIndicatorVariants };
