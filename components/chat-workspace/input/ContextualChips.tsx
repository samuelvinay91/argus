'use client';

/**
 * ContextualChips - Smart Suggestion Chips
 *
 * Displays contextual action suggestions that adapt based on the
 * current conversation state. Chips help users discover actions
 * and quickly access common commands.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  TestTube,
  Search,
  Rocket,
  RefreshCw,
  Wand2,
  MessageSquare,
  SkipForward,
  FileDown,
  Share2,
  TrendingDown,
  BarChart3,
  Wrench,
  ArrowRight,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export type ChipContext =
  | 'empty'
  | 'afterTest'
  | 'afterReport'
  | 'afterError'
  | 'custom';

export interface Chip {
  id: string;
  label: string;
  icon: LucideIcon;
  command: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export interface ContextualChipsProps {
  /** Current conversation context */
  context: ChipContext;
  /** Custom chips (used when context is 'custom') */
  customChips?: Chip[];
  /** Called when a chip is clicked */
  onChipClick: (chip: Chip) => void;
  /** Additional class names */
  className?: string;
  /** Whether chips are disabled */
  disabled?: boolean;
  /** Maximum chips to show before scrolling */
  maxVisible?: number;
}

// =============================================================================
// CHIP PRESETS BY CONTEXT
// =============================================================================

const CONTEXT_CHIPS: Record<Exclude<ChipContext, 'custom'>, Chip[]> = {
  empty: [
    { id: 'test', label: 'Test', icon: TestTube, command: '/test run', variant: 'primary' },
    { id: 'quality', label: 'Quality', icon: BarChart3, command: '/quality score' },
    { id: 'analyze', label: 'Analyze', icon: Search, command: '/analyze' },
    { id: 'deploy', label: 'Deploy', icon: Rocket, command: '/cicd deploy' },
  ],
  afterTest: [
    { id: 'retry', label: 'Retry', icon: RefreshCw, command: '/test retry', variant: 'warning' },
    { id: 'heal', label: 'Heal', icon: Wand2, command: '/test heal', variant: 'primary' },
    { id: 'explain', label: 'Explain', icon: MessageSquare, command: '/explain last test' },
    { id: 'skip', label: 'Skip', icon: SkipForward, command: '/test skip' },
  ],
  afterReport: [
    { id: 'export', label: 'Export', icon: FileDown, command: '/export report' },
    { id: 'share', label: 'Share', icon: Share2, command: '/share report' },
    { id: 'drilldown', label: 'Drill down', icon: TrendingDown, command: '/drill down' },
    { id: 'compare', label: 'Compare', icon: BarChart3, command: '/compare reports' },
  ],
  afterError: [
    { id: 'fix', label: 'Fix', icon: Wrench, command: '/fix', variant: 'primary' },
    { id: 'retry-error', label: 'Retry', icon: RefreshCw, command: '/retry', variant: 'warning' },
    { id: 'explain-error', label: 'Explain', icon: MessageSquare, command: '/explain error' },
    { id: 'ignore', label: 'Ignore', icon: XCircle, command: '/ignore', variant: 'danger' },
  ],
};

// =============================================================================
// VARIANT STYLES
// =============================================================================

const VARIANT_STYLES: Record<NonNullable<Chip['variant']>, string> = {
  default: cn(
    'bg-white/[0.06] hover:bg-white/[0.10]',
    'border-white/[0.08] hover:border-white/[0.12]',
    'text-muted-foreground hover:text-foreground'
  ),
  primary: cn(
    'bg-primary/10 hover:bg-primary/20',
    'border-primary/20 hover:border-primary/30',
    'text-primary'
  ),
  success: cn(
    'bg-green-500/10 hover:bg-green-500/20',
    'border-green-500/20 hover:border-green-500/30',
    'text-green-500'
  ),
  warning: cn(
    'bg-amber-500/10 hover:bg-amber-500/20',
    'border-amber-500/20 hover:border-amber-500/30',
    'text-amber-500'
  ),
  danger: cn(
    'bg-red-500/10 hover:bg-red-500/20',
    'border-red-500/20 hover:border-red-500/30',
    'text-red-400'
  ),
};

// =============================================================================
// COMPONENT
// =============================================================================

const ContextualChips = React.forwardRef<HTMLDivElement, ContextualChipsProps>(
  (
    {
      context,
      customChips,
      onChipClick,
      className,
      disabled = false,
      maxVisible = 6,
    },
    ref
  ) => {
    const chips = context === 'custom' ? (customChips || []) : CONTEXT_CHIPS[context];
    const visibleChips = chips.slice(0, maxVisible);
    const hasOverflow = chips.length > maxVisible;

    // Staggered animation
    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.05,
          delayChildren: 0.1,
        },
      },
      exit: {
        opacity: 0,
        transition: {
          staggerChildren: 0.03,
          staggerDirection: -1,
        },
      },
    };

    const chipVariants = {
      hidden: { opacity: 0, y: 10, scale: 0.95 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: 'spring', stiffness: 300, damping: 25 },
      },
      exit: { opacity: 0, y: -5, scale: 0.95 },
    };

    return (
      <AnimatePresence mode="wait">
        {chips.length > 0 && (
          <motion.div
            ref={ref}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'flex items-center gap-2',
              // Horizontal scroll on mobile
              'overflow-x-auto scrollbar-none',
              // Hide scrollbar
              '-mx-1 px-1 pb-1',
              'snap-x snap-mandatory',
              disabled && 'opacity-50 pointer-events-none',
              className
            )}
            role="group"
            aria-label="Suggested actions"
          >
            {visibleChips.map((chip) => {
              const Icon = chip.icon;
              const variant = chip.variant || 'default';

              return (
                <motion.button
                  key={chip.id}
                  variants={chipVariants}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onChipClick(chip)}
                  disabled={disabled}
                  className={cn(
                    'inline-flex items-center gap-1.5',
                    'px-3 py-1.5 rounded-full',
                    'border',
                    'text-sm font-medium',
                    'transition-all duration-200',
                    'backdrop-blur-sm',
                    'whitespace-nowrap',
                    'snap-start',
                    VARIANT_STYLES[variant],
                    'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background'
                  )}
                  aria-label={`${chip.label}: ${chip.command}`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{chip.label}</span>
                </motion.button>
              );
            })}

            {/* Overflow indicator */}
            {hasOverflow && (
              <motion.div
                variants={chipVariants}
                className={cn(
                  'inline-flex items-center gap-1',
                  'px-2 py-1.5',
                  'text-xs text-muted-foreground'
                )}
              >
                <ArrowRight className="w-3 h-3" />
                <span>+{chips.length - maxVisible}</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

ContextualChips.displayName = 'ContextualChips';

// =============================================================================
// EXPORTS
// =============================================================================

export { ContextualChips, CONTEXT_CHIPS };
