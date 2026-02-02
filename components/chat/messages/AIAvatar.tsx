/**
 * AIAvatar - Animated AI avatar with status indication
 *
 * Displays different animations based on AI status:
 * - ready: Static with green indicator
 * - thinking: Pulsing animation
 * - typing: Subtle rotation
 */

'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export type AIStatus = 'ready' | 'thinking' | 'typing';

export interface AIAvatarProps {
  status: AIStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// =============================================================================
// SIZE CONFIGS
// =============================================================================

const SIZE_CLASSES = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

const ICON_SIZES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const AIAvatar = memo(function AIAvatar({
  status,
  size = 'md',
  className,
}: AIAvatarProps) {
  return (
    <div className={cn('relative flex-shrink-0', className)}>
      {/* Outer pulse ring for thinking state */}
      <AnimatePresence>
        {status === 'thinking' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.4, opacity: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            className={cn(
              'absolute inset-0 rounded-full bg-primary/30',
              SIZE_CLASSES[size]
            )}
          />
        )}
      </AnimatePresence>

      {/* Main avatar container */}
      <motion.div
        animate={
          status === 'thinking'
            ? { scale: [1, 1.05, 1] }
            : status === 'typing'
            ? { rotate: [0, 5, -5, 0] }
            : { scale: 1 }
        }
        transition={{
          duration: status === 'thinking' ? 1.5 : 0.5,
          repeat: status !== 'ready' ? Infinity : 0,
          ease: 'easeInOut',
        }}
        className={cn(
          'rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20',
          'flex items-center justify-center',
          SIZE_CLASSES[size]
        )}
      >
        <Bot className={cn('text-primary', ICON_SIZES[size])} />
      </motion.div>

      {/* Status indicator dot */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={cn(
          'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full',
          'border-2 border-background',
          status === 'ready' && 'bg-green-500',
          status === 'thinking' && 'bg-amber-500',
          status === 'typing' && 'bg-blue-500'
        )}
      >
        {status !== 'ready' && (
          <motion.div
            className="w-full h-full rounded-full bg-inherit"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </motion.div>
    </div>
  );
});

export default AIAvatar;
