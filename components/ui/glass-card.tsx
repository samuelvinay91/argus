import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const glassCardVariants = cva(
  // Base styles - frosted glass effect with backdrop-blur, gradient overlay, and transparent border
  [
    'relative overflow-hidden rounded-xl',
    'backdrop-blur-[20px] backdrop-saturate-[180%]',
    'transition-all duration-300 ease-out',
    // Inner highlight gradient (top-left corner shine effect)
    'before:content-[""] before:absolute before:inset-0 before:pointer-events-none',
    'before:bg-gradient-to-br before:from-[hsl(var(--glass-highlight))] before:to-transparent before:opacity-50',
    // Base shadow with inset highlight
    'shadow-[0_8px_32px_hsl(var(--glass-shadow)),inset_0_1px_0_hsl(var(--glass-highlight))]',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-gradient-to-br from-[hsl(var(--glass-surface))] to-[hsl(0_0%_100%/0.01)]',
          'border border-[hsl(var(--glass-border))]',
        ],
        primary: [
          'bg-gradient-to-br from-[hsl(var(--glass-surface))] to-[hsl(0_0%_100%/0.01)]',
          'border border-[hsl(var(--primary)/0.3)]',
          'shadow-[0_8px_32px_hsl(var(--glass-shadow)),0_0_40px_hsl(var(--glow-primary)),inset_0_1px_0_hsl(var(--glass-highlight))]',
        ],
        violet: [
          'bg-gradient-to-br from-[hsl(var(--glass-surface))] to-[hsl(0_0%_100%/0.01)]',
          'border border-[hsl(var(--argus-violet-400)/0.3)]',
          'shadow-[0_8px_32px_hsl(var(--glass-shadow)),0_0_40px_hsl(var(--glow-violet)),inset_0_1px_0_hsl(var(--glass-highlight))]',
        ],
        success: [
          'bg-gradient-to-br from-[hsl(var(--glass-surface))] to-[hsl(0_0%_100%/0.01)]',
          'border border-[hsl(var(--status-healthy)/0.3)]',
          'shadow-[0_8px_32px_hsl(var(--glass-shadow)),0_0_40px_hsl(var(--glow-success)),inset_0_1px_0_hsl(var(--glass-highlight))]',
        ],
        warning: [
          'bg-gradient-to-br from-[hsl(var(--glass-surface))] to-[hsl(0_0%_100%/0.01)]',
          'border border-[hsl(var(--status-warning)/0.3)]',
          'shadow-[0_8px_32px_hsl(var(--glass-shadow)),0_0_30px_hsl(var(--status-warning)/0.25),inset_0_1px_0_hsl(var(--glass-highlight))]',
        ],
        error: [
          'bg-gradient-to-br from-[hsl(var(--glass-surface))] to-[hsl(0_0%_100%/0.01)]',
          'border border-[hsl(var(--status-critical)/0.3)]',
          'shadow-[0_8px_32px_hsl(var(--glass-shadow)),0_0_40px_hsl(var(--glow-error)),inset_0_1px_0_hsl(var(--glass-highlight))]',
        ],
      },
      hover: {
        true: [
          'hover:border-[hsl(var(--glass-border-hover))]',
          'hover:bg-gradient-to-br hover:from-[hsl(var(--glass-surface-hover))] hover:to-[hsl(0_0%_100%/0.02)]',
          'hover:brightness-110',
        ],
        false: [],
      },
      glow: {
        true: [],
        false: [],
      },
      clickable: {
        true: 'cursor-pointer active:scale-[0.98] active:brightness-95',
        false: '',
      },
    },
    compoundVariants: [
      // Glow effects per variant
      {
        variant: 'default',
        glow: true,
        className: 'shadow-[0_8px_32px_hsl(var(--glass-shadow)),0_0_30px_hsl(var(--primary)/0.2),inset_0_1px_0_hsl(var(--glass-highlight))]',
      },
      {
        variant: 'primary',
        glow: true,
        className: 'shadow-[0_8px_32px_hsl(var(--glass-shadow)),0_0_60px_hsl(var(--glow-primary)),inset_0_1px_0_hsl(var(--glass-highlight))]',
      },
      {
        variant: 'violet',
        glow: true,
        className: 'shadow-[0_8px_32px_hsl(var(--glass-shadow)),0_0_60px_hsl(var(--glow-violet)),inset_0_1px_0_hsl(var(--glass-highlight))]',
      },
      {
        variant: 'success',
        glow: true,
        className: 'shadow-[0_8px_32px_hsl(var(--glass-shadow)),0_0_60px_hsl(var(--glow-success)),inset_0_1px_0_hsl(var(--glass-highlight))]',
      },
      {
        variant: 'warning',
        glow: true,
        className: 'shadow-[0_8px_32px_hsl(var(--glass-shadow)),0_0_50px_hsl(var(--status-warning)/0.4),inset_0_1px_0_hsl(var(--glass-highlight))]',
      },
      {
        variant: 'error',
        glow: true,
        className: 'shadow-[0_8px_32px_hsl(var(--glass-shadow)),0_0_60px_hsl(var(--glow-error)),inset_0_1px_0_hsl(var(--glass-highlight))]',
      },
      // Hover glow effects per variant
      {
        variant: 'primary',
        hover: true,
        className: 'hover:shadow-[0_12px_40px_hsl(var(--glass-shadow)),0_0_50px_hsl(var(--glow-primary)),inset_0_1px_0_hsl(var(--glass-highlight))]',
      },
      {
        variant: 'violet',
        hover: true,
        className: 'hover:shadow-[0_12px_40px_hsl(var(--glass-shadow)),0_0_50px_hsl(var(--glow-violet)),inset_0_1px_0_hsl(var(--glass-highlight))]',
      },
      {
        variant: 'success',
        hover: true,
        className: 'hover:shadow-[0_12px_40px_hsl(var(--glass-shadow)),0_0_50px_hsl(var(--glow-success)),inset_0_1px_0_hsl(var(--glass-highlight))]',
      },
      {
        variant: 'error',
        hover: true,
        className: 'hover:shadow-[0_12px_40px_hsl(var(--glass-shadow)),0_0_50px_hsl(var(--glow-error)),inset_0_1px_0_hsl(var(--glass-highlight))]',
      },
    ],
    defaultVariants: {
      variant: 'default',
      hover: true,
      glow: false,
      clickable: false,
    },
  }
);

type ElementType = 'div' | 'article' | 'section' | 'aside' | 'main' | 'header' | 'footer' | 'nav';

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof glassCardVariants> {
  children: React.ReactNode;
  as?: ElementType;
}

const GlassCard = React.forwardRef<HTMLElement, GlassCardProps>(
  (
    {
      className,
      variant,
      hover,
      glow,
      children,
      as: Component = 'div',
      onClick,
      ...props
    },
    ref
  ) => {
    // Determine if the card is clickable based on onClick presence
    const isClickable = Boolean(onClick);

    return React.createElement(
      Component,
      {
        ref,
        className: cn(
          glassCardVariants({
            variant,
            hover,
            glow,
            clickable: isClickable,
          }),
          className
        ),
        onClick,
        role: isClickable ? 'button' : undefined,
        tabIndex: isClickable ? 0 : undefined,
        onKeyDown: isClickable
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.(e as unknown as React.MouseEvent<HTMLElement>);
              }
            }
          : undefined,
        ...props,
      },
      children
    );
  }
);

GlassCard.displayName = 'GlassCard';

export { GlassCard, glassCardVariants };
