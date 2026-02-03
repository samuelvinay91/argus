'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeFormatDistanceToNowStrict } from '@/lib/utils';
import type { Conversation } from './ConversationItem';

export interface RecentPillsProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  visible: boolean;
  className?: string;
}

const pillVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.25,
      ease: [0.25, 0.4, 0.25, 1],
    },
  }),
  exit: {
    opacity: 0,
    y: -5,
    scale: 0.98,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
    },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
    },
  },
};

const RecentPills = React.forwardRef<HTMLDivElement, RecentPillsProps>(
  ({ conversations, onSelect, visible, className }, ref) => {
    // Limit to 5 most recent conversations
    const recentConversations = conversations.slice(0, 5);

    if (recentConversations.length === 0) {
      return null;
    }

    return (
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            ref={ref}
            className={cn(
              'flex flex-col items-center gap-4',
              className
            )}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Label */}
            <motion.div
              className="flex items-center gap-2 text-white/40 text-xs"
              variants={pillVariants}
              custom={0}
            >
              <Clock className="w-3 h-3" />
              <span>Recent conversations</span>
            </motion.div>

            {/* Pills container */}
            <motion.div
              className={cn(
                'flex flex-wrap justify-center gap-2',
                'max-w-2xl px-4',
                // Stack vertically on mobile
                'sm:flex-row flex-col sm:items-center items-stretch'
              )}
            >
              {recentConversations.map((conversation, index) => (
                <motion.button
                  key={conversation.id}
                  onClick={() => onSelect(conversation.id)}
                  className={cn(
                    'group relative',
                    'px-4 py-2 rounded-full',
                    'bg-white/[0.06] hover:bg-white/[0.10]',
                    'border border-white/[0.08] hover:border-white/[0.12]',
                    'backdrop-blur-[20px]',
                    'transition-all duration-200 ease-out',
                    'hover:shadow-[0_4px_24px_rgba(0,0,0,0.16)]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50',
                    // Mobile full width
                    'sm:w-auto w-full'
                  )}
                  variants={pillVariants}
                  custom={index + 1}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2 sm:justify-start justify-between">
                    {/* Title */}
                    <span
                      className={cn(
                        'text-sm text-white/80 group-hover:text-white',
                        'truncate max-w-[180px] sm:max-w-[160px]',
                        'transition-colors duration-150'
                      )}
                    >
                      {conversation.title || 'New conversation'}
                    </span>

                    {/* Separator dot */}
                    <span className="text-white/20 hidden sm:inline">
                      /
                    </span>

                    {/* Time */}
                    <span className="text-xs text-white/40 flex-shrink-0">
                      {safeFormatDistanceToNowStrict(
                        conversation.updatedAt,
                        { addSuffix: false },
                        'Just now'
                      )}
                    </span>
                  </div>

                  {/* Hover glow effect */}
                  <motion.div
                    className={cn(
                      'absolute inset-0 rounded-full',
                      'bg-gradient-to-r from-indigo-500/0 via-indigo-500/10 to-indigo-500/0',
                      'opacity-0 group-hover:opacity-100',
                      'pointer-events-none',
                      'transition-opacity duration-300'
                    )}
                    initial={false}
                  />
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

RecentPills.displayName = 'RecentPills';

export { RecentPills };
