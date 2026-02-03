'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeFormatDistanceToNowStrict } from '@/lib/utils';

export interface Conversation {
  id: string;
  title: string | null;
  preview: string | null;
  updatedAt: string;
  messageCount: number;
}

export interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

const ConversationItem = React.forwardRef<HTMLButtonElement, ConversationItemProps>(
  ({ conversation, isActive, onClick, onDelete }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete();
      }
    };

    const title = conversation.title || 'New conversation';
    const preview = conversation.preview || 'No messages yet';
    const relativeTime = safeFormatDistanceToNowStrict(
      conversation.updatedAt,
      { addSuffix: true },
      'Just now'
    );

    return (
      <motion.button
        ref={ref}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'w-full text-left px-3 py-3 rounded-xl',
          'transition-all duration-200 ease-out',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50',
          'group relative',
          isActive
            ? 'bg-white/[0.10] border border-white/[0.12]'
            : 'bg-transparent hover:bg-white/[0.06] border border-transparent'
        )}
        initial={false}
        animate={{
          backgroundColor: isActive
            ? 'rgba(255, 255, 255, 0.10)'
            : isHovered
              ? 'rgba(255, 255, 255, 0.06)'
              : 'rgba(255, 255, 255, 0)',
        }}
        transition={{ duration: 0.15 }}
        role="option"
        aria-selected={isActive}
      >
        <div className="flex items-start gap-3">
          {/* Chat icon */}
          <div
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-lg',
              'flex items-center justify-center',
              'bg-white/[0.06] border border-white/[0.08]',
              isActive && 'bg-indigo-500/20 border-indigo-500/30'
            )}
          >
            <MessageSquare
              className={cn(
                'w-4 h-4',
                isActive ? 'text-indigo-400' : 'text-white/60'
              )}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-8">
            {/* Title */}
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  'text-sm font-medium truncate',
                  isActive ? 'text-white' : 'text-white/90'
                )}
              >
                {title}
              </span>
            </div>

            {/* Preview */}
            <p className="text-xs text-white/50 truncate mt-0.5">{preview}</p>

            {/* Timestamp */}
            <p className="text-[10px] text-white/40 mt-1">{relativeTime}</p>
          </div>

          {/* Delete button - appears on hover */}
          <motion.div
            className="absolute right-2 top-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: isHovered ? 1 : 0,
              scale: isHovered ? 1 : 0.8,
            }}
            transition={{ duration: 0.15 }}
          >
            <button
              onClick={handleDelete}
              className={cn(
                'p-1.5 rounded-lg',
                'bg-white/[0.06] hover:bg-red-500/20',
                'border border-white/[0.08] hover:border-red-500/30',
                'text-white/50 hover:text-red-400',
                'transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50'
              )}
              aria-label={`Delete conversation: ${title}`}
              tabIndex={isHovered ? 0 : -1}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        </div>
      </motion.button>
    );
  }
);

ConversationItem.displayName = 'ConversationItem';

export { ConversationItem };
