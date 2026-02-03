'use client';

/**
 * Glass Design Tokens (CSS Variables Reference)
 *
 * --glass-subtle: rgba(255,255,255,0.03)
 * --glass-medium: rgba(255,255,255,0.06)
 * --glass-prominent: rgba(255,255,255,0.10)
 * --glass-border: rgba(255,255,255,0.08)
 * --glass-blur: 20px
 * --glass-blur-heavy: 32px
 * --primary: #6366f1
 * --primary-glow: rgba(99,102,241,0.3)
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const glassCardVariants = cva(
  // Base glass styles
  [
    'relative overflow-hidden',
    'rounded-2xl',
    'backdrop-blur-[20px]',
    'border border-white/[0.08]',
    'transition-all duration-300 ease-out',
    // Inset highlight at top for depth
    'before:pointer-events-none',
    'before:absolute before:inset-x-0 before:top-0 before:h-px',
    'before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
  ],
  {
    variants: {
      variant: {
        subtle: [
          'bg-white/[0.03]',
          'shadow-[0_4px_24px_rgba(0,0,0,0.12)]',
        ],
        medium: [
          'bg-white/[0.06]',
          'shadow-[0_8px_32px_rgba(0,0,0,0.16)]',
        ],
        prominent: [
          'bg-white/[0.10]',
          'shadow-[0_12px_48px_rgba(0,0,0,0.20)]',
        ],
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
      hoverable: {
        true: [
          'hover:bg-white/[0.08]',
          'hover:border-white/[0.12]',
          'hover:shadow-[0_16px_64px_rgba(0,0,0,0.24)]',
          'cursor-pointer',
        ],
        false: [],
      },
    },
    defaultVariants: {
      variant: 'medium',
      padding: 'md',
      hoverable: false,
    },
  }
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  /** Element type to render */
  as?: 'div' | 'article' | 'section' | 'aside' | 'main' | 'header' | 'footer' | 'nav';
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant,
      padding,
      hoverable,
      as: Component = 'div',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn(
          glassCardVariants({ variant, padding, hoverable }),
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export { GlassCard, glassCardVariants };
