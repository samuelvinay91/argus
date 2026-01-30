'use client';

import * as React from 'react';
import { AnimatePresence, motion, PanInfo, useAnimation } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SwipeableDrawer - Mobile-native drawer with swipe-to-dismiss
 *
 * Features:
 * - Swipe down/right to dismiss (depending on position)
 * - Smooth spring animations
 * - Backdrop tap to close
 * - Drag handle for bottom drawers
 * - Accessible with keyboard support
 */

export interface SwipeableDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when drawer should close */
  onClose: () => void;
  /** Drawer content */
  children: React.ReactNode;
  /** Position of the drawer */
  position?: 'bottom' | 'right' | 'left';
  /** Height for bottom drawer (default: auto, max 90vh) */
  height?: 'auto' | 'full' | 'half';
  /** Width for side drawers */
  width?: 'auto' | 'full' | 'sm' | 'md' | 'lg';
  /** Whether to show the drag handle (bottom drawer only) */
  showHandle?: boolean;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Title for the drawer */
  title?: string;
  /** Additional className for the drawer content */
  className?: string;
}

const DRAG_CLOSE_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 500;

export function SwipeableDrawer({
  open,
  onClose,
  children,
  position = 'bottom',
  height = 'auto',
  width = 'sm',
  showHandle = true,
  showCloseButton = true,
  title,
  className,
}: SwipeableDrawerProps) {
  const controls = useAnimation();
  const constraintsRef = React.useRef<HTMLDivElement>(null);

  // Handle drag end
  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const { velocity, offset } = info;

    if (position === 'bottom') {
      // Close if dragged down enough or with enough velocity
      if (offset.y > DRAG_CLOSE_THRESHOLD || velocity.y > VELOCITY_THRESHOLD) {
        onClose();
      } else {
        // Snap back
        controls.start({ y: 0 });
      }
    } else if (position === 'right') {
      if (offset.x > DRAG_CLOSE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD) {
        onClose();
      } else {
        controls.start({ x: 0 });
      }
    } else if (position === 'left') {
      if (offset.x < -DRAG_CLOSE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD) {
        onClose();
      } else {
        controls.start({ x: 0 });
      }
    }
  };

  // Reset position when opened
  React.useEffect(() => {
    if (open) {
      controls.start({ x: 0, y: 0 });
    }
  }, [open, controls]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const heightClasses = {
    auto: 'max-h-[90vh]',
    full: 'h-[95vh]',
    half: 'h-[50vh]',
  };

  const widthClasses = {
    auto: 'w-auto max-w-[90vw]',
    full: 'w-full',
    sm: 'w-72',
    md: 'w-80',
    lg: 'w-96',
  };

  const getMotionProps = () => {
    switch (position) {
      case 'bottom':
        return {
          initial: { y: '100%' },
          animate: { y: 0 },
          exit: { y: '100%' },
          drag: 'y' as const,
          dragConstraints: { top: 0 },
          dragElastic: { top: 0, bottom: 0.5 },
        };
      case 'right':
        return {
          initial: { x: '100%' },
          animate: { x: 0 },
          exit: { x: '100%' },
          drag: 'x' as const,
          dragConstraints: { left: 0 },
          dragElastic: { left: 0, right: 0.5 },
        };
      case 'left':
        return {
          initial: { x: '-100%' },
          animate: { x: 0 },
          exit: { x: '-100%' },
          drag: 'x' as const,
          dragConstraints: { right: 0 },
          dragElastic: { left: 0.5, right: 0 },
        };
    }
  };

  const positionClasses = {
    bottom: 'inset-x-0 bottom-0 rounded-t-2xl',
    right: 'inset-y-0 right-0 rounded-l-2xl',
    left: 'inset-y-0 left-0 rounded-r-2xl',
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            ref={constraintsRef}
            {...getMotionProps()}
            animate={controls}
            onDragEnd={handleDragEnd}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            className={cn(
              'fixed z-50',
              'bg-background',
              'shadow-xl',
              'flex flex-col',
              'safe-area-bottom',
              positionClasses[position],
              position === 'bottom' && heightClasses[height],
              position !== 'bottom' && widthClasses[width],
              position !== 'bottom' && 'h-full',
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Drawer'}
          >
            {/* Drag handle (bottom drawer) */}
            {position === 'bottom' && showHandle && (
              <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                {title && <h2 className="font-semibold text-lg">{title}</h2>}
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className={cn(
                      'p-2 -m-2 rounded-full',
                      'text-muted-foreground hover:text-foreground',
                      'hover:bg-muted',
                      'transition-colors',
                      'touch-target',
                      !title && 'ml-auto'
                    )}
                    aria-label="Close drawer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * DrawerContent - Pre-styled content wrapper for drawer
 */
export function DrawerContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('p-4', className)}>{children}</div>;
}

/**
 * DrawerFooter - Fixed footer for drawer with actions
 */
export function DrawerFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'sticky bottom-0',
        'px-4 py-3',
        'border-t border-border',
        'bg-background',
        'safe-area-bottom',
        className
      )}
    >
      {children}
    </div>
  );
}
