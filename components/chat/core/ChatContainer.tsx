/**
 * ChatContainer - Main layout wrapper for chat interface
 *
 * Provides the responsive layout structure with:
 * - Main chat area (shrinks when panels are open)
 * - Side panels (artifacts, screenshots)
 * - Mobile-responsive behavior
 */

'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useChatContext } from './ChatProvider';

// =============================================================================
// TYPES
// =============================================================================

export interface ChatContainerProps {
  children: ReactNode;
  rightPanel?: ReactNode;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ChatContainer({
  children,
  rightPanel,
  className,
}: ChatContainerProps) {
  const { isArtifactsPanelOpen, isScreenshotsPanelOpen } = useChatContext();

  const isPanelOpen = isArtifactsPanelOpen || isScreenshotsPanelOpen;

  return (
    <div
      className={cn(
        'relative flex h-[calc(100vh-8rem)] sm:h-[calc(100vh-10rem)] lg:h-[calc(100vh-12rem)]',
        'min-w-0 w-full overflow-hidden',
        className
      )}
    >
      {/* Main Chat Area */}
      <motion.div
        className="flex flex-col min-w-0 overflow-hidden"
        animate={{
          width: isPanelOpen ? '60%' : '100%',
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{ flex: isPanelOpen ? 'none' : 1 }}
      >
        {children}
      </motion.div>

      {/* Right Panel (Artifacts/Screenshots) */}
      {rightPanel}
    </div>
  );
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

interface ChatMainAreaProps {
  children: ReactNode;
  className?: string;
}

/**
 * Main scrollable area for messages
 */
export function ChatMainArea({ children, className }: ChatMainAreaProps) {
  return (
    <div
      className={cn(
        'flex-1 overflow-y-auto overflow-x-hidden min-w-0',
        'space-y-3 sm:space-y-4 p-2 sm:p-4 scroll-smooth',
        className
      )}
    >
      {children}
    </div>
  );
}

interface ChatFooterProps {
  children: ReactNode;
  className?: string;
}

/**
 * Footer area for input and suggestions
 */
export function ChatFooter({ children, className }: ChatFooterProps) {
  return (
    <div
      className={cn(
        'border-t bg-background/80 backdrop-blur-sm',
        'p-2 sm:p-4 safe-area-inset-bottom',
        className
      )}
    >
      {children}
    </div>
  );
}

interface ChatHeaderAreaProps {
  children: ReactNode;
  className?: string;
}

/**
 * Header area for controls
 */
export function ChatHeaderArea({ children, className }: ChatHeaderAreaProps) {
  return (
    <div
      className={cn(
        'absolute top-2 right-2 z-30 lg:top-4 lg:right-4',
        'flex items-center gap-2',
        className
      )}
    >
      {children}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default ChatContainer;
