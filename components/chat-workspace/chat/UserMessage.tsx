/**
 * UserMessage - User message bubble (right-aligned)
 *
 * Features:
 * - Glassmorphic bubble design
 * - Avatar on right
 * - Timestamp on hover
 * - Edit button on hover (optional)
 */

'use client';

import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Pencil, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeFormat } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface UserMessageProps {
  /** Message content */
  content: string;
  /** Message timestamp */
  timestamp: Date;
  /** Callback when edit is requested */
  onEdit?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// AVATAR
// =============================================================================

const UserAvatar = memo(function UserAvatar() {
  return (
    <div
      className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full',
        'bg-gradient-to-br from-primary/30 to-violet-500/30',
        'flex items-center justify-center',
        'border border-white/10'
      )}
    >
      <User className="w-4 h-4 text-primary" />
    </div>
  );
});

// =============================================================================
// EDIT BUTTON
// =============================================================================

interface EditButtonProps {
  onClick: () => void;
  visible: boolean;
}

const EditButton = memo(function EditButton({ onClick, visible }: EditButtonProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
          onClick={onClick}
          className={cn(
            'absolute -left-8 top-1/2 -translate-y-1/2',
            'w-6 h-6 rounded-full',
            'bg-white/5 hover:bg-white/10',
            'flex items-center justify-center',
            'transition-colors duration-200'
          )}
          aria-label="Edit message"
        >
          <Pencil className="w-3 h-3 text-muted-foreground" />
        </motion.button>
      )}
    </AnimatePresence>
  );
});

// =============================================================================
// TIMESTAMP
// =============================================================================

interface TimestampProps {
  timestamp: Date;
  visible: boolean;
}

const Timestamp = memo(function Timestamp({ timestamp, visible }: TimestampProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'absolute -bottom-6 right-0',
            'flex items-center gap-1',
            'text-xs text-muted-foreground/70'
          )}
        >
          <Clock className="w-3 h-3" />
          <span>{safeFormat(timestamp, 'h:mm a')}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const UserMessage = memo(function UserMessage({
  content,
  timestamp,
  onEdit,
  className,
}: UserMessageProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return (
    <div className={cn('flex justify-end gap-3', className)}>
      <div
        className="relative max-w-[85%] sm:max-w-[75%]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Edit button */}
        {onEdit && <EditButton onClick={onEdit} visible={isHovered} />}

        {/* Message bubble */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className={cn(
            'relative overflow-hidden',
            'rounded-2xl rounded-br-md',
            // Glass effect
            'bg-gradient-to-br from-primary/90 to-primary/80',
            'backdrop-blur-sm',
            'border border-primary/50',
            'shadow-lg shadow-primary/10'
          )}
        >
          {/* Top highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {/* Content */}
          <div className="relative px-4 py-2.5">
            <p className="text-sm text-primary-foreground whitespace-pre-wrap break-words leading-relaxed">
              {content}
            </p>
          </div>
        </motion.div>

        {/* Timestamp */}
        <Timestamp timestamp={timestamp} visible={isHovered} />
      </div>

      {/* Avatar */}
      <UserAvatar />
    </div>
  );
});

export default UserMessage;
