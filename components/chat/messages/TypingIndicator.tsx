/**
 * TypingIndicator - Animated dots showing AI is thinking
 *
 * Displayed when waiting for AI response before any content streams.
 */

'use client';

import { memo } from 'react';
import { motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AIAvatar } from './AIAvatar';

// =============================================================================
// TYPES
// =============================================================================

export interface TypingIndicatorProps {
  className?: string;
}

// =============================================================================
// ANIMATION
// =============================================================================

const dotVariants: Variants = {
  initial: { y: 0 },
  animate: { y: -6 },
};

// =============================================================================
// DOTS COMPONENT
// =============================================================================

const TypingDots = memo(function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-2 py-1">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{
            duration: 0.4,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: index * 0.15,
            ease: 'easeInOut',
          }}
          className="w-2 h-2 rounded-full bg-primary/60"
        />
      ))}
    </div>
  );
});

// =============================================================================
// MESSAGE BUBBLE
// =============================================================================

const IndicatorBubble = memo(function IndicatorBubble({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-[90%] sm:max-w-[85%] min-w-0 relative overflow-hidden rounded-lg"
    >
      {/* Glass effect background */}
      <div className="absolute inset-0 bg-gradient-to-br from-card/80 via-card/90 to-card/80 backdrop-blur-sm border border-white/10 rounded-lg" />

      {/* Content */}
      <div className="relative p-2 sm:p-3">
        {children}
      </div>
    </motion.div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const TypingIndicator = memo(function TypingIndicator({
  className,
}: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn('flex gap-2 sm:gap-3', className)}
    >
      <AIAvatar status="thinking" size="sm" />
      <IndicatorBubble>
        <TypingDots />
      </IndicatorBubble>
    </motion.div>
  );
});

export default TypingIndicator;
