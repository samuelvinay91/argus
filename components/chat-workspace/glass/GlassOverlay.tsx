'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface GlassOverlayProps {
  /** Whether the overlay is visible */
  isOpen: boolean;
  /** Called when user clicks the overlay (typically to close) */
  onClose?: () => void;
  /** Content to render inside the overlay */
  children?: React.ReactNode;
  /** Additional classes for the overlay backdrop */
  className?: string;
  /** Additional classes for the content container */
  contentClassName?: string;
  /** Whether clicking outside dismisses the overlay */
  dismissOnClickOutside?: boolean;
  /** Z-index for the overlay */
  zIndex?: number;
}

const GlassOverlay = React.forwardRef<HTMLDivElement, GlassOverlayProps>(
  (
    {
      isOpen,
      onClose,
      children,
      className,
      contentClassName,
      dismissOnClickOutside = true,
      zIndex = 50,
    },
    ref
  ) => {
    // Handle click outside
    const handleBackdropClick = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (dismissOnClickOutside && e.target === e.currentTarget) {
          onClose?.();
        }
      },
      [dismissOnClickOutside, onClose]
    );

    // Handle escape key
    React.useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          onClose?.();
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleEscape);
        // Prevent body scroll when overlay is open
        document.body.style.overflow = 'hidden';
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }, [isOpen, onClose]);

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={ref}
            className={cn(
              'fixed inset-0',
              'backdrop-blur-[32px]',
              'bg-black/40',
              className
            )}
            style={{ zIndex }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
          >
            {children && (
              <motion.div
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  'p-4',
                  contentClassName
                )}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                {children}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

GlassOverlay.displayName = 'GlassOverlay';

export { GlassOverlay };
