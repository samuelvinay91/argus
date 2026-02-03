'use client';

/**
 * ResizeDivider - Draggable divider between chat and panel
 *
 * Features:
 * - Vertical line with hover state
 * - Drag handle indicator
 * - Visual feedback during resize
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ResizeDividerProps {
  /** Whether the divider is currently being dragged */
  isResizing?: boolean;
  /** Orientation of the divider */
  orientation?: 'horizontal' | 'vertical';
  /** Additional className */
  className?: string;
}

const ResizeDivider = React.forwardRef<HTMLDivElement, ResizeDividerProps>(
  ({ isResizing = false, orientation = 'vertical', className }, ref) => {
    const isVertical = orientation === 'vertical';

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex items-center justify-center',
          isVertical ? 'w-2 h-full cursor-col-resize' : 'h-2 w-full cursor-row-resize',
          'group',
          className
        )}
      >
        {/* Background line */}
        <motion.div
          className={cn(
            'absolute bg-white/[0.08] transition-colors duration-200',
            isVertical ? 'w-px h-full' : 'h-px w-full',
            'group-hover:bg-white/[0.16]',
            isResizing && 'bg-primary/50'
          )}
          animate={{
            backgroundColor: isResizing ? 'rgba(99, 102, 241, 0.5)' : undefined,
          }}
        />

        {/* Drag handle indicator */}
        <motion.div
          className={cn(
            'absolute z-10 flex items-center justify-center',
            'rounded-full bg-white/[0.06] border border-white/[0.08]',
            'opacity-0 group-hover:opacity-100',
            'transition-all duration-200',
            isVertical ? 'w-4 h-8' : 'w-8 h-4',
            isResizing && 'opacity-100 bg-primary/20 border-primary/30'
          )}
          initial={{ scale: 0.8 }}
          whileHover={{ scale: 1 }}
          animate={{
            scale: isResizing ? 1.1 : 1,
            opacity: isResizing ? 1 : undefined,
          }}
        >
          <GripVertical
            className={cn(
              'text-white/40 group-hover:text-white/60',
              isVertical ? 'w-3 h-3' : 'w-3 h-3 rotate-90',
              isResizing && 'text-primary'
            )}
          />
        </motion.div>

        {/* Hover zone indicator */}
        <motion.div
          className={cn(
            'absolute rounded-full bg-primary/20',
            isVertical ? 'w-1 h-16' : 'h-1 w-16',
            'opacity-0 group-hover:opacity-100',
            'transition-opacity duration-200'
          )}
          animate={{
            opacity: isResizing ? 1 : undefined,
            scale: isResizing ? [1, 1.2, 1] : 1,
          }}
          transition={{
            scale: {
              repeat: isResizing ? Infinity : 0,
              duration: 0.8,
            },
          }}
        />
      </div>
    );
  }
);

ResizeDivider.displayName = 'ResizeDivider';

export { ResizeDivider };
