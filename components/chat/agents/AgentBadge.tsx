/**
 * AgentBadge - Display individual agent with status
 *
 * Shows agent icon, name, status, and optional progress.
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActiveAgent } from '@/lib/chat/chat-store';
import { getAgentConfig } from '@/lib/chat/agent-config';
import { ConfidenceIndicator } from './ConfidenceIndicator';

// =============================================================================
// TYPES
// =============================================================================

export interface AgentBadgeProps {
  agent: ActiveAgent;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  showConfidence?: boolean;
  showTool?: boolean;
  className?: string;
}

// =============================================================================
// STATUS ICON
// =============================================================================

interface StatusIconProps {
  status: ActiveAgent['status'];
  className?: string;
}

const StatusIcon = memo(function StatusIcon({ status, className }: StatusIconProps) {
  switch (status) {
    case 'thinking':
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Activity className={cn('w-3 h-3', className)} />
        </motion.div>
      );
    case 'executing':
      return <Loader2 className={cn('w-3 h-3 animate-spin', className)} />;
    case 'complete':
      return <CheckCircle className={cn('w-3 h-3 text-green-500', className)} />;
    case 'error':
      return <XCircle className={cn('w-3 h-3 text-red-500', className)} />;
    default:
      return null;
  }
});

// =============================================================================
// PROGRESS BAR
// =============================================================================

interface ProgressBarProps {
  progress: number;
  className?: string;
}

const ProgressBar = memo(function ProgressBar({ progress, className }: ProgressBarProps) {
  return (
    <div className={cn('h-1 bg-muted rounded-full overflow-hidden', className)}>
      <motion.div
        className="h-full bg-primary rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
});

// =============================================================================
// COMPONENT
// =============================================================================

export const AgentBadge = memo(function AgentBadge({
  agent,
  size = 'md',
  showProgress = false,
  showConfidence = false,
  showTool = false,
  className,
}: AgentBadgeProps) {
  const config = getAgentConfig(agent.type);
  const Icon = config.icon;

  // Size classes
  const sizeClasses = {
    sm: {
      container: 'p-1.5 gap-1.5',
      icon: 'w-3 h-3',
      iconWrapper: 'p-1',
      text: 'text-[10px]',
      name: 'max-w-16',
    },
    md: {
      container: 'p-2 gap-2',
      icon: 'w-4 h-4',
      iconWrapper: 'p-1.5',
      text: 'text-xs',
      name: 'max-w-24',
    },
    lg: {
      container: 'p-3 gap-3',
      icon: 'w-5 h-5',
      iconWrapper: 'p-2',
      text: 'text-sm',
      name: 'max-w-32',
    },
  };

  const s = sizeClasses[size];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'flex items-center rounded-lg border',
        config.bgColor,
        s.container,
        agent.status === 'error' && 'border-red-500/50 bg-red-500/10',
        agent.status === 'complete' && 'border-green-500/50 bg-green-500/10',
        className
      )}
    >
      {/* Agent Icon */}
      <div className={cn('rounded-md', config.bgColor, s.iconWrapper)}>
        <Icon className={cn(config.color, s.icon)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name and Status */}
        <div className="flex items-center gap-1">
          <span className={cn('font-medium truncate', s.text, s.name)}>
            {agent.name}
          </span>
          <StatusIcon status={agent.status} className={s.icon} />
        </div>

        {/* Message or Tool */}
        {(agent.message || (showTool && agent.currentTool)) && (
          <p className={cn('text-muted-foreground truncate', s.text)}>
            {showTool && agent.currentTool
              ? `Using: ${agent.currentTool}`
              : agent.message
            }
          </p>
        )}

        {/* Progress bar */}
        {showProgress && agent.progress > 0 && agent.progress < 100 && (
          <ProgressBar progress={agent.progress} className="mt-1.5" />
        )}
      </div>

      {/* Confidence */}
      {showConfidence && agent.confidence !== undefined && (
        <ConfidenceIndicator
          confidence={agent.confidence}
          size={size === 'lg' ? 'md' : 'sm'}
        />
      )}

      {/* Progress percentage (when not showing bar) */}
      {!showProgress && agent.status === 'executing' && agent.progress > 0 && (
        <span className={cn('text-muted-foreground', s.text)}>
          {agent.progress}%
        </span>
      )}
    </motion.div>
  );
});

export default AgentBadge;
