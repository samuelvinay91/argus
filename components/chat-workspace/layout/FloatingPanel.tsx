'use client';

/**
 * FloatingPanel - A draggable floating panel for pop-out mode
 *
 * Features:
 * - @floating-ui/react for positioning
 * - Draggable header
 * - Resize handles
 * - Glassmorphic styling with stronger blur
 * - Close button
 * - Z-index management
 */

import * as React from 'react';
import {
  useFloating,
  offset,
  shift,
  flip,
  autoUpdate,
  FloatingPortal,
} from '@floating-ui/react';
import { motion, useDragControls, type PanInfo } from 'framer-motion';
import { X, GripHorizontal, Minimize2, Maximize2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FloatingPanelProps {
  /** Unique identifier for the panel */
  id: string;
  /** Display title */
  title: string;
  /** Icon component */
  icon: LucideIcon;
  /** Panel content */
  children: React.ReactNode;
  /** Initial position */
  initialPosition?: { x: number; y: number };
  /** Initial size */
  initialSize?: { width: number; height: number };
  /** Callback when the panel is closed */
  onClose: () => void;
  /** Optional callback when position changes */
  onPositionChange?: (position: { x: number; y: number }) => void;
  /** Optional callback when size changes */
  onSizeChange?: (size: { width: number; height: number }) => void;
  /** Z-index for stacking */
  zIndex?: number;
  /** Additional className */
  className?: string;
}

const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;
const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 500;

const FloatingPanel = React.forwardRef<HTMLDivElement, FloatingPanelProps>(
  (
    {
      id,
      title,
      icon: Icon,
      children,
      initialPosition = { x: 100, y: 100 },
      initialSize = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
      onClose,
      onPositionChange,
      onSizeChange,
      zIndex = 1000,
      className,
    },
    ref
  ) => {
    const [position, setPosition] = React.useState(initialPosition);
    const [size, setSize] = React.useState(initialSize);
    const [isMinimized, setIsMinimized] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);
    const [isResizing, setIsResizing] = React.useState(false);
    const dragControls = useDragControls();

    // Ref for the panel element
    const panelRef = React.useRef<HTMLDivElement>(null);
    const combinedRef = (node: HTMLDivElement | null) => {
      panelRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    // Floating UI setup for viewport boundary handling
    const { refs, floatingStyles } = useFloating({
      placement: 'bottom-start',
      middleware: [
        offset(0),
        shift({ padding: 16 }),
        flip(),
      ],
      whileElementsMounted: autoUpdate,
    });

    // Handle drag end
    const handleDragEnd = React.useCallback(
      (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const newPosition = {
          x: position.x + info.offset.x,
          y: position.y + info.offset.y,
        };
        setPosition(newPosition);
        setIsDragging(false);
        onPositionChange?.(newPosition);
      },
      [position, onPositionChange]
    );

    // Handle resize
    const handleResize = React.useCallback(
      (e: React.MouseEvent, direction: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 's' | 'n') => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = size.width;
        const startHeight = size.height;
        const startPosX = position.x;
        const startPosY = position.y;

        const handleMouseMove = (moveEvent: MouseEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const deltaY = moveEvent.clientY - startY;

          let newWidth = startWidth;
          let newHeight = startHeight;
          let newX = startPosX;
          let newY = startPosY;

          // Handle horizontal resize
          if (direction.includes('e')) {
            newWidth = Math.max(MIN_WIDTH, startWidth + deltaX);
          }
          if (direction.includes('w')) {
            newWidth = Math.max(MIN_WIDTH, startWidth - deltaX);
            newX = startPosX + (startWidth - newWidth);
          }

          // Handle vertical resize
          if (direction.includes('s')) {
            newHeight = Math.max(MIN_HEIGHT, startHeight + deltaY);
          }
          if (direction.includes('n')) {
            newHeight = Math.max(MIN_HEIGHT, startHeight - deltaY);
            newY = startPosY + (startHeight - newHeight);
          }

          setSize({ width: newWidth, height: newHeight });
          setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
          setIsResizing(false);
          onSizeChange?.(size);
          onPositionChange?.(position);
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      },
      [size, position, onSizeChange, onPositionChange]
    );

    // Toggle minimize
    const toggleMinimize = React.useCallback(() => {
      setIsMinimized((prev) => !prev);
    }, []);

    return (
      <FloatingPortal>
        <motion.div
          ref={combinedRef}
          className={cn(
            'fixed',
            'rounded-2xl overflow-hidden',
            // Glassmorphic styling with stronger blur
            'bg-black/60 backdrop-blur-[32px]',
            'border border-white/[0.12]',
            'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)]',
            // Depth effects
            'before:pointer-events-none',
            'before:absolute before:inset-x-0 before:top-0 before:h-px',
            'before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent',
            isDragging && 'cursor-grabbing',
            isResizing && 'select-none',
            className
          )}
          style={{
            left: position.x,
            top: position.y,
            width: size.width,
            height: isMinimized ? 'auto' : size.height,
            zIndex,
          }}
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Header - draggable */}
          <div
            className={cn(
              'flex items-center justify-between px-4 py-3',
              'border-b border-white/[0.08]',
              'cursor-grab active:cursor-grabbing',
              'select-none'
            )}
            onPointerDown={(e) => dragControls.start(e)}
          >
            <div className="flex items-center gap-3">
              <GripHorizontal className="w-4 h-4 text-white/30" />
              <Icon className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-white truncate max-w-[200px]">
                {title}
              </h3>
            </div>

            <div className="flex items-center gap-1">
              {/* Minimize button */}
              <motion.button
                onClick={toggleMinimize}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  'text-white/40 hover:text-white/80',
                  'hover:bg-white/[0.08]'
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </motion.button>

              {/* Close button */}
              <motion.button
                onClick={onClose}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  'text-white/40 hover:text-red-400',
                  'hover:bg-white/[0.08]'
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Close"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <motion.div
            className="overflow-auto"
            style={{ height: isMinimized ? 0 : size.height - 56 }}
            animate={{ height: isMinimized ? 0 : size.height - 56 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>

          {/* Resize handles (only when not minimized) */}
          {!isMinimized && (
            <>
              {/* Corner handles */}
              <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                onMouseDown={(e) => handleResize(e, 'se')}
              />
              <div
                className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize"
                onMouseDown={(e) => handleResize(e, 'sw')}
              />
              <div
                className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize mt-12"
                onMouseDown={(e) => handleResize(e, 'ne')}
              />
              <div
                className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize mt-12"
                onMouseDown={(e) => handleResize(e, 'nw')}
              />

              {/* Edge handles */}
              <div
                className="absolute top-12 bottom-4 right-0 w-2 cursor-e-resize"
                onMouseDown={(e) => handleResize(e, 'e')}
              />
              <div
                className="absolute top-12 bottom-4 left-0 w-2 cursor-w-resize"
                onMouseDown={(e) => handleResize(e, 'w')}
              />
              <div
                className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize"
                onMouseDown={(e) => handleResize(e, 's')}
              />

              {/* Visual resize indicator (bottom-right corner) */}
              <div
                className={cn(
                  'absolute bottom-1 right-1 w-3 h-3',
                  'opacity-30 pointer-events-none'
                )}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10 2L2 10M10 6L6 10M10 10L10 10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="text-white/40"
                  />
                </svg>
              </div>
            </>
          )}
        </motion.div>
      </FloatingPortal>
    );
  }
);

FloatingPanel.displayName = 'FloatingPanel';

export { FloatingPanel };
