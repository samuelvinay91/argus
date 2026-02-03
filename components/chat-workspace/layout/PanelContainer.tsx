'use client';

/**
 * PanelContainer - Container for contextual panels with tab support
 *
 * Features:
 * - Tab bar when multiple panels
 * - Active panel content area
 * - Pin/pop-out/close buttons in header
 * - Glassmorphic styling
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Pin,
  PinOff,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../glass/GlassCard';

export interface PanelItem {
  /** Unique identifier for the panel */
  id: string;
  /** Display title */
  title: string;
  /** Icon component */
  icon: LucideIcon;
  /** Panel content */
  content: React.ReactNode;
  /** Whether the panel is pinned */
  pinned?: boolean;
}

export interface PanelContainerProps {
  /** Array of panels to display */
  panels: PanelItem[];
  /** ID of the currently active panel */
  activePanel: string;
  /** Callback when active panel changes */
  onPanelChange: (id: string) => void;
  /** Callback when a panel is closed */
  onPanelClose: (id: string) => void;
  /** Callback when a panel is pinned/unpinned */
  onPanelPin: (id: string) => void;
  /** Callback when a panel is popped out to floating mode */
  onPanelPopOut: (id: string) => void;
  /** Additional className */
  className?: string;
}

const PanelContainer = React.forwardRef<HTMLDivElement, PanelContainerProps>(
  (
    {
      panels,
      activePanel,
      onPanelChange,
      onPanelClose,
      onPanelPin,
      onPanelPopOut,
      className,
    },
    ref
  ) => {
    const activePanelData = panels.find((p) => p.id === activePanel);
    const showTabs = panels.length > 1;

    // Tab animation variants
    const tabVariants = {
      inactive: {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        borderColor: 'rgba(255, 255, 255, 0)',
      },
      active: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
      },
    };

    // Content animation variants
    const contentVariants = {
      initial: { opacity: 0, y: 10 },
      animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.2 },
      },
      exit: {
        opacity: 0,
        y: -10,
        transition: { duration: 0.15 },
      },
    };

    return (
      <GlassCard
        ref={ref}
        variant="medium"
        padding="none"
        className={cn('h-full flex flex-col', className)}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-white/[0.08]">
          {/* Tab bar (shown when multiple panels) */}
          {showTabs && (
            <div className="flex items-center gap-1 px-2 pt-2">
              {panels.map((panel) => {
                const Icon = panel.icon;
                const isActive = panel.id === activePanel;
                return (
                  <motion.button
                    key={panel.id}
                    onClick={() => onPanelChange(panel.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-t-lg',
                      'text-sm font-medium transition-colors',
                      'border border-b-0',
                      isActive
                        ? 'text-white'
                        : 'text-white/60 hover:text-white/80'
                    )}
                    variants={tabVariants}
                    initial="inactive"
                    animate={isActive ? 'active' : 'inactive'}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="max-w-[100px] truncate">{panel.title}</span>
                    {panel.pinned && (
                      <Pin className="w-3 h-3 text-primary opacity-70" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Panel header with title and actions */}
          {activePanelData && (
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                {!showTabs && (
                  <>
                    <activePanelData.icon className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-semibold text-white">
                      {activePanelData.title}
                    </h3>
                    {activePanelData.pinned && (
                      <Pin className="w-3.5 h-3.5 text-primary opacity-70" />
                    )}
                  </>
                )}
                {showTabs && activePanelData.pinned && (
                  <span className="text-xs text-white/40">Pinned</span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {/* Pin/Unpin button */}
                <motion.button
                  onClick={() => onPanelPin(activePanel)}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    'text-white/40 hover:text-white/80',
                    'hover:bg-white/[0.06]',
                    activePanelData.pinned && 'text-primary hover:text-primary/80'
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={activePanelData.pinned ? 'Unpin panel' : 'Pin panel'}
                >
                  {activePanelData.pinned ? (
                    <PinOff className="w-4 h-4" />
                  ) : (
                    <Pin className="w-4 h-4" />
                  )}
                </motion.button>

                {/* Pop-out button */}
                <motion.button
                  onClick={() => onPanelPopOut(activePanel)}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    'text-white/40 hover:text-white/80',
                    'hover:bg-white/[0.06]'
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Pop out to floating panel"
                >
                  <ExternalLink className="w-4 h-4" />
                </motion.button>

                {/* Close button */}
                <motion.button
                  onClick={() => onPanelClose(activePanel)}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    'text-white/40 hover:text-white/80 hover:text-red-400',
                    'hover:bg-white/[0.06]'
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Close panel"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activePanelData && (
              <motion.div
                key={activePanelData.id}
                className="h-full w-full overflow-auto"
                variants={contentVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {activePanelData.content}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>
    );
  }
);

PanelContainer.displayName = 'PanelContainer';

export { PanelContainer };
