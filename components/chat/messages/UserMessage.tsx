/**
 * UserMessage - User message bubble component
 *
 * Renders user messages with edit capability.
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MarkdownRenderer } from '../renderers/MarkdownRenderer';

// =============================================================================
// TYPES
// =============================================================================

export interface UserMessageProps {
  content: string;
  isEditing?: boolean;
  editContent?: string;
  onEditChange?: (content: string) => void;
  onCancelEdit?: () => void;
  onSubmitEdit?: () => void;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const UserMessage = memo(function UserMessage({
  content,
  isEditing = false,
  editContent = '',
  onEditChange,
  onCancelEdit,
  onSubmitEdit,
  className,
}: UserMessageProps) {
  // Edit mode
  if (isEditing) {
    return (
      <Card
        className={cn(
          'max-w-[90%] sm:max-w-[85%] min-w-0 overflow-hidden',
          'bg-primary text-primary-foreground',
          className
        )}
      >
        <CardContent className="p-2 sm:p-3 min-w-0 overflow-hidden">
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => onEditChange?.(e.target.value)}
              className={cn(
                'w-full min-h-[80px] p-2 rounded',
                'bg-primary-foreground/10 text-primary-foreground',
                'border border-primary-foreground/20',
                'focus:outline-none focus:ring-1 focus:ring-primary-foreground/50',
                'resize-none'
              )}
              autoFocus
            />
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelEdit}
                className="h-7 text-xs text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={onSubmitEdit}
                className="h-7 text-xs bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
              >
                Save & Resend
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Normal display
  return (
    <Card
      className={cn(
        'max-w-[90%] sm:max-w-[85%] min-w-0 overflow-hidden',
        'bg-primary text-primary-foreground',
        className
      )}
    >
      <CardContent className="p-2 sm:p-3 min-w-0 overflow-hidden break-words">
        <div className={cn(
          'min-w-0 max-w-full overflow-hidden',
          'text-primary-foreground',
          '[&_p]:text-primary-foreground',
          '[&_a]:text-primary-foreground',
          '[&_code]:bg-primary-foreground/20'
        )}>
          <MarkdownRenderer content={content} />
        </div>
      </CardContent>
    </Card>
  );
});

export default UserMessage;
