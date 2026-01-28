'use client';

/**
 * AI Hub Mode Toggle Component
 *
 * A toggle switch to switch between Simple and Expert modes in the AI Hub.
 * Features:
 * - Smooth transition animation
 * - Tooltips explaining each mode
 * - Keyboard accessible
 * - Proper ARIA attributes
 */

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIHubMode, type AIHubMode } from './ai-hub-mode-context';

interface ModeToggleProps {
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show labels inline (default: true on md+) */
  showLabels?: boolean;
}

/**
 * Toggle switch for Simple/Expert mode in AI Hub.
 *
 * Simple mode: Streamlined interface with auto-mode and basic controls
 * Expert mode: Full interface with routing tables, advanced policies
 *
 * @example
 * ```tsx
 * // In header
 * <ModeToggle />
 *
 * // Compact version for mobile
 * <ModeToggle size="sm" showLabels={false} />
 * ```
 */
export function ModeToggle({
  className,
  size = 'md',
  showLabels = true,
}: ModeToggleProps) {
  const { mode, setMode, isSimple, isExpert } = useAIHubMode();
  const [showTooltip, setShowTooltip] = useState<AIHubMode | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Handle hover for tooltip
  const handleMouseEnter = (side: AIHubMode) => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(side);
    }, 400); // Small delay to prevent flashing
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null; // Clear ref to prevent stale references
    }
    setShowTooltip(null);
  };

  // Size-based classes
  const sizeClasses = {
    sm: {
      container: 'h-8 p-0.5',
      button: 'h-7 px-2 text-xs gap-1',
      icon: 'h-3 w-3',
    },
    md: {
      container: 'h-10 p-0.5',
      button: 'h-9 px-3 text-sm gap-1.5',
      icon: 'h-4 w-4',
    },
    lg: {
      container: 'h-12 p-1',
      button: 'h-10 px-4 text-sm gap-2',
      icon: 'h-5 w-5',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        'relative inline-flex items-center rounded-full bg-muted/60 border border-border/50',
        sizes.container,
        className
      )}
      role="radiogroup"
      aria-label="AI Hub display mode"
    >
      {/* Simple Mode Button */}
      <button
        type="button"
        role="radio"
        aria-checked={isSimple}
        onClick={() => setMode('simple')}
        onMouseEnter={() => handleMouseEnter('simple')}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'relative flex items-center justify-center rounded-full font-medium transition-all duration-200',
          sizes.button,
          isSimple
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Sparkles className={cn(sizes.icon, 'flex-shrink-0')} />
        {showLabels && <span className="hidden sm:inline">Simple</span>}

        {/* Tooltip for Simple */}
        {showTooltip === 'simple' && (
          <div
            className={cn(
              'absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50',
              'px-3 py-2 rounded-lg bg-popover border shadow-lg',
              'text-xs text-popover-foreground whitespace-nowrap',
              'animate-in fade-in-0 zoom-in-95 duration-200'
            )}
            role="tooltip"
          >
            <div className="font-medium mb-1">Simple Mode</div>
            <div className="text-muted-foreground max-w-[200px] text-left">
              Streamlined interface with auto-routing slider. Perfect for quick adjustments.
            </div>
            {/* Tooltip arrow */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-popover border-t border-l" />
          </div>
        )}
      </button>

      {/* Expert Mode Button */}
      <button
        type="button"
        role="radio"
        aria-checked={isExpert}
        onClick={() => setMode('expert')}
        onMouseEnter={() => handleMouseEnter('expert')}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'relative flex items-center justify-center rounded-full font-medium transition-all duration-200',
          sizes.button,
          isExpert
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Settings2 className={cn(sizes.icon, 'flex-shrink-0')} />
        {showLabels && <span className="hidden sm:inline">Expert</span>}

        {/* Tooltip for Expert */}
        {showTooltip === 'expert' && (
          <div
            className={cn(
              'absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50',
              'px-3 py-2 rounded-lg bg-popover border shadow-lg',
              'text-xs text-popover-foreground whitespace-nowrap',
              'animate-in fade-in-0 zoom-in-95 duration-200'
            )}
            role="tooltip"
          >
            <div className="font-medium mb-1">Expert Mode</div>
            <div className="text-muted-foreground max-w-[200px] text-left">
              Full control with routing tables, model policies, and advanced configuration.
            </div>
            {/* Tooltip arrow */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-popover border-t border-l" />
          </div>
        )}
      </button>
    </div>
  );
}

/**
 * Compact mode indicator (read-only, useful for space-constrained areas)
 */
interface ModeIndicatorProps {
  className?: string;
}

export function ModeIndicator({ className }: ModeIndicatorProps) {
  const { mode, isSimple } = useAIHubMode();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        isSimple
          ? 'bg-primary/10 text-primary'
          : 'bg-secondary text-secondary-foreground',
        className
      )}
    >
      {isSimple ? (
        <>
          <Sparkles className="h-3 w-3" />
          Simple
        </>
      ) : (
        <>
          <Settings2 className="h-3 w-3" />
          Expert
        </>
      )}
    </div>
  );
}

export default ModeToggle;
