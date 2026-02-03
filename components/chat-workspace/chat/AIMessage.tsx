/**
 * AIMessage - Rich AI response card
 *
 * Features:
 * - AI avatar with status indicator (thinking/typing/ready)
 * - Glassmorphic card with content
 * - Support for markdown rendering
 * - Inline action buttons at bottom
 * - Expandable sections for long content
 */

'use client';

import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Bot,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Share,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../glass';

// =============================================================================
// TYPES
// =============================================================================

export type AIStatus = 'thinking' | 'streaming' | 'complete';

export interface MessageAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'danger';
}

export interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  result?: unknown;
}

export interface AIMessageProps {
  /** Message content (markdown supported) */
  content: string;
  /** Current AI status */
  status: AIStatus;
  /** Custom action buttons */
  actions?: MessageAction[];
  /** Tool calls made during this message */
  toolCalls?: ToolCall[];
  /** Maximum height before truncation (in lines) */
  maxLines?: number;
  /** Whether to show default actions (copy, regenerate, feedback) */
  showDefaultActions?: boolean;
  /** Callback when copy is clicked */
  onCopy?: () => void;
  /** Callback when regenerate is clicked */
  onRegenerate?: () => void;
  /** Callback when feedback is provided */
  onFeedback?: (positive: boolean) => void;
  /** Render function for content (for custom markdown rendering) */
  renderContent?: (content: string) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const cardVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

const actionVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.2,
      duration: 0.2,
    },
  },
};

// =============================================================================
// AI AVATAR
// =============================================================================

interface AIAvatarProps {
  status: AIStatus;
}

const AIAvatar = memo(function AIAvatar({ status }: AIAvatarProps) {
  const isActive = status !== 'complete';

  return (
    <div className="relative flex-shrink-0">
      {/* Pulse ring for active states */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.4, opacity: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            className="absolute inset-0 w-8 h-8 rounded-full bg-primary/30"
          />
        )}
      </AnimatePresence>

      {/* Main avatar */}
      <motion.div
        animate={
          status === 'thinking'
            ? { scale: [1, 1.05, 1] }
            : status === 'streaming'
              ? { rotate: [0, 5, -5, 0] }
              : { scale: 1 }
        }
        transition={{
          duration: status === 'thinking' ? 1.5 : 0.5,
          repeat: status !== 'complete' ? Infinity : 0,
          ease: 'easeInOut',
        }}
        className={cn(
          'w-8 h-8 rounded-full',
          'bg-gradient-to-br from-primary/20 to-violet-500/20',
          'flex items-center justify-center',
          'border border-white/10'
        )}
      >
        <Bot className="w-4 h-4 text-primary" />
      </motion.div>

      {/* Status indicator */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={cn(
          'absolute -bottom-0.5 -right-0.5',
          'w-3 h-3 rounded-full',
          'border-2 border-background',
          status === 'complete' && 'bg-green-500',
          status === 'thinking' && 'bg-amber-500',
          status === 'streaming' && 'bg-blue-500'
        )}
      >
        {status !== 'complete' && (
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

// =============================================================================
// ACTION BUTTON
// =============================================================================

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'danger';
}

const ActionButton = memo(function ActionButton({
  icon,
  label,
  onClick,
  active,
  variant = 'default',
}: ActionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5',
        'rounded-lg text-xs font-medium',
        'transition-colors duration-200',
        variant === 'default' && 'text-muted-foreground hover:text-foreground hover:bg-white/5',
        variant === 'primary' && 'text-primary hover:bg-primary/10',
        variant === 'success' && 'text-green-500 hover:bg-green-500/10',
        variant === 'danger' && 'text-red-500 hover:bg-red-500/10',
        active && 'bg-white/10'
      )}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
});

// =============================================================================
// EXPAND/COLLAPSE SECTION
// =============================================================================

interface ExpandableSectionProps {
  content: string | React.ReactNode;
  maxLines: number;
  isExpanded: boolean;
  onToggle: () => void;
}

const ExpandableSection = memo(function ExpandableSection({
  content,
  maxLines,
  isExpanded,
  onToggle,
}: ExpandableSectionProps) {
  const shouldTruncate = typeof content === 'string' && content.length > maxLines * 80;

  return (
    <div className="relative">
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          !isExpanded && shouldTruncate && 'max-h-[300px]'
        )}
      >
        {content}
      </div>

      {shouldTruncate && (
        <>
          {/* Gradient fade */}
          {!isExpanded && (
            <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-white/5 to-transparent pointer-events-none" />
          )}

          {/* Toggle button */}
          <button
            onClick={onToggle}
            className={cn(
              'flex items-center gap-1.5 mt-2 px-3 py-1.5',
              'text-xs text-muted-foreground hover:text-foreground',
              'rounded-lg hover:bg-white/5',
              'transition-colors duration-200'
            )}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Show more
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
});

// =============================================================================
// TOOL CALL BADGE
// =============================================================================

interface ToolCallBadgeProps {
  tool: ToolCall;
}

const ToolCallBadge = memo(function ToolCallBadge({ tool }: ToolCallBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1',
        'rounded-md text-xs',
        'bg-white/5 border border-white/10',
        tool.status === 'running' && 'border-primary/30',
        tool.status === 'complete' && 'border-green-500/30',
        tool.status === 'error' && 'border-red-500/30'
      )}
    >
      <Sparkles
        className={cn(
          'w-3 h-3',
          tool.status === 'pending' && 'text-muted-foreground',
          tool.status === 'running' && 'text-primary animate-pulse',
          tool.status === 'complete' && 'text-green-500',
          tool.status === 'error' && 'text-red-500'
        )}
      />
      <span className="font-medium">{tool.name}</span>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AIMessage = memo(function AIMessage({
  content,
  status,
  actions = [],
  toolCalls = [],
  maxLines = 15,
  showDefaultActions = true,
  onCopy,
  onRegenerate,
  onFeedback,
  renderContent,
  className,
}: AIMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);

  // Handlers
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  }, [content, onCopy]);

  const handleFeedback = useCallback(
    (positive: boolean) => {
      setFeedback(positive ? 'positive' : 'negative');
      onFeedback?.(positive);
    },
    [onFeedback]
  );

  const toggleExpand = useCallback(() => setIsExpanded((prev) => !prev), []);

  // Rendered content
  const renderedContent = renderContent ? renderContent(content) : content;

  return (
    <div className={cn('flex gap-3', className)}>
      {/* Avatar */}
      <AIAvatar status={status} />

      {/* Message card */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" className="flex-1 min-w-0">
        <GlassCard variant="subtle" padding="none" className="overflow-hidden">
          {/* Top highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Tool calls */}
          {toolCalls.length > 0 && (
            <div className="px-4 pt-3 pb-2 border-b border-white/5 flex flex-wrap gap-2">
              {toolCalls.map((tool) => (
                <ToolCallBadge key={tool.id} tool={tool} />
              ))}
            </div>
          )}

          {/* Content */}
          <div className="px-4 py-3">
            <ExpandableSection
              content={renderedContent}
              maxLines={maxLines}
              isExpanded={isExpanded}
              onToggle={toggleExpand}
            />
          </div>

          {/* Actions */}
          {status === 'complete' && (showDefaultActions || actions.length > 0) && (
            <motion.div
              variants={actionVariants}
              initial="hidden"
              animate="visible"
              className="px-4 py-2 border-t border-white/5 flex items-center gap-1 flex-wrap"
            >
              {/* Default actions */}
              {showDefaultActions && (
                <>
                  <ActionButton
                    icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    label={copied ? 'Copied!' : 'Copy'}
                    onClick={handleCopy}
                    active={copied}
                    variant={copied ? 'success' : 'default'}
                  />
                  {onRegenerate && (
                    <ActionButton
                      icon={<RefreshCw className="w-3.5 h-3.5" />}
                      label="Regenerate"
                      onClick={onRegenerate}
                    />
                  )}
                  {onFeedback && (
                    <>
                      <div className="w-px h-4 bg-white/10 mx-1" />
                      <ActionButton
                        icon={<ThumbsUp className="w-3.5 h-3.5" />}
                        label="Helpful"
                        onClick={() => handleFeedback(true)}
                        active={feedback === 'positive'}
                        variant={feedback === 'positive' ? 'success' : 'default'}
                      />
                      <ActionButton
                        icon={<ThumbsDown className="w-3.5 h-3.5" />}
                        label="Not helpful"
                        onClick={() => handleFeedback(false)}
                        active={feedback === 'negative'}
                        variant={feedback === 'negative' ? 'danger' : 'default'}
                      />
                    </>
                  )}
                </>
              )}

              {/* Custom actions */}
              {actions.length > 0 && (
                <>
                  {showDefaultActions && <div className="w-px h-4 bg-white/10 mx-1" />}
                  {actions.map((action, index) => (
                    <ActionButton
                      key={index}
                      icon={action.icon || <Share className="w-3.5 h-3.5" />}
                      label={action.label}
                      onClick={action.onClick}
                      variant={action.variant}
                    />
                  ))}
                </>
              )}
            </motion.div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
});

export default AIMessage;
