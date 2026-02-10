'use client';

/**
 * WorkspaceLayout - Main adaptive split layout component
 *
 * Three layout states:
 * - focused: Chat takes full width (no panel)
 * - split: Chat 55%, Panel 45% with resizable divider
 * - multi: Chat + tabbed panels
 */

import * as React from 'react';
import {
  Group as PanelGroup,
  Panel,
  Separator,
  type Layout,
} from 'react-resizable-panels';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ResizeDivider } from './ResizeDivider';

export type LayoutState = 'focused' | 'split' | 'multi';

const STORAGE_KEY = 'skopaq-workspace-panel-size';
const DEFAULT_PANEL_SIZE = 45;
const MIN_PANEL_SIZE = 25;
const MAX_PANEL_SIZE = 60;

export interface WorkspaceLayoutProps {
  /** Current layout state */
  layoutState: LayoutState;
  /** Main chat content */
  children: React.ReactNode;
  /** Panel content (shown in split/multi mode) */
  panelContent: React.ReactNode | null;
  /** Callback when layout state changes */
  onLayoutChange?: (state: LayoutState) => void;
  /** Additional className for the container */
  className?: string;
}

/**
 * Load persisted panel size from localStorage
 */
function loadPanelSize(): number {
  if (typeof window === 'undefined') return DEFAULT_PANEL_SIZE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const size = parseInt(stored, 10);
      if (size >= MIN_PANEL_SIZE && size <= MAX_PANEL_SIZE) {
        return size;
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return DEFAULT_PANEL_SIZE;
}

/**
 * Persist panel size to localStorage
 */
function savePanelSize(size: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.round(size)));
  } catch {
    // Ignore localStorage errors
  }
}

const WorkspaceLayout = React.forwardRef<HTMLDivElement, WorkspaceLayoutProps>(
  ({ layoutState, children, panelContent, onLayoutChange, className }, ref) => {
    const [panelSize, setPanelSize] = React.useState<number>(DEFAULT_PANEL_SIZE);
    const [isResizing, setIsResizing] = React.useState(false);

    // Load persisted panel size on mount
    React.useEffect(() => {
      setPanelSize(loadPanelSize());
    }, []);

    // Handle panel resize - v4 uses Layout object with panel IDs as keys
    const handleLayoutChange = React.useCallback((layout: Layout) => {
      // Layout is { [panelId]: percentage }
      const sidePanelSize = layout['side-panel'];
      if (typeof sidePanelSize === 'number') {
        setPanelSize(sidePanelSize);
      }
    }, []);

    // Persist panel size on resize end
    const handleResizeEnd = React.useCallback(() => {
      setIsResizing(false);
      savePanelSize(panelSize);
    }, [panelSize]);

    const handleResizeStart = React.useCallback(() => {
      setIsResizing(true);
    }, []);

    // Animation variants for layout transitions
    const containerVariants = {
      focused: { opacity: 1 },
      split: { opacity: 1 },
      multi: { opacity: 1 },
    };

    const panelVariants = {
      hidden: {
        opacity: 0,
        x: 50,
        scale: 0.95,
      },
      visible: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 30,
        },
      },
      exit: {
        opacity: 0,
        x: 50,
        scale: 0.95,
        transition: {
          duration: 0.2,
        },
      },
    };

    const showPanel = layoutState !== 'focused' && panelContent !== null;

    return (
      <motion.div
        ref={ref}
        className={cn('h-full w-full overflow-hidden', className)}
        variants={containerVariants}
        initial={layoutState}
        animate={layoutState}
        transition={{ duration: 0.3 }}
      >
        {showPanel ? (
          <PanelGroup
            orientation="horizontal"
            onLayoutChange={handleLayoutChange}
            onLayoutChanged={() => {
              handleResizeEnd();
            }}
            className="h-full"
          >
            {/* Main Chat Panel */}
            <Panel
              id="main-panel"
              defaultSize={`${100 - panelSize}%`}
              minSize={`${100 - MAX_PANEL_SIZE}%`}
              maxSize={`${100 - MIN_PANEL_SIZE}%`}
              className="h-full"
            >
              <div className="h-full w-full overflow-hidden">{children}</div>
            </Panel>

            {/* Resize Handle / Separator */}
            <Separator
              className="group relative flex items-center justify-center data-[state=dragging]:cursor-col-resize"
            >
              <ResizeDivider isResizing={isResizing} />
            </Separator>

            {/* Side Panel */}
            <Panel
              id="side-panel"
              defaultSize={`${panelSize}%`}
              minSize={`${MIN_PANEL_SIZE}%`}
              maxSize={`${MAX_PANEL_SIZE}%`}
              className="h-full"
              onResize={() => {
                handleResizeStart();
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key="panel-content"
                  className="h-full w-full overflow-hidden"
                  variants={panelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {panelContent}
                </motion.div>
              </AnimatePresence>
            </Panel>
          </PanelGroup>
        ) : (
          // Focused mode - full width chat
          <motion.div
            className="h-full w-full overflow-hidden"
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </motion.div>
    );
  }
);

WorkspaceLayout.displayName = 'WorkspaceLayout';

export { WorkspaceLayout };
