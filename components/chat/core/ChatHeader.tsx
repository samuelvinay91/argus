/**
 * ChatHeader - Header controls for chat interface
 *
 * Displays:
 * - Model selector badge
 * - Settings panel
 * - Agent activity indicators
 * - Phase progress bar
 * - Panel toggles
 */

'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelRightOpen, Camera, Activity, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useChatContext } from './ChatProvider';
import { useAgentActivity, usePrimaryAgent } from '../hooks/useAgentActivity';
import { getAgentConfig } from '@/lib/chat/agent-config';
import { ChatModelSelector } from '../chat-model-selector';
import { ChatSettingsPanel } from '../settings';

// =============================================================================
// PHASE BADGE
// =============================================================================

const PHASE_CONFIG = {
  idle: { label: 'Ready', color: 'text-gray-400', bgColor: 'bg-gray-400/10' },
  analysis: { label: 'Analyzing', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  planning: { label: 'Planning', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  execution: { label: 'Executing', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  healing: { label: 'Healing', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  reporting: { label: 'Reporting', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
};

interface PhaseBadgeProps {
  className?: string;
}

export const PhaseBadge = memo(function PhaseBadge({ className }: PhaseBadgeProps) {
  const { currentPhase, phaseProgress, isProcessing } = useAgentActivity();

  if (currentPhase === 'idle' && !isProcessing) return null;

  const config = PHASE_CONFIG[currentPhase];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full',
        'border border-border/50',
        config.bgColor,
        className
      )}
    >
      {/* Animated activity indicator */}
      <div className="relative">
        <Activity className={cn('w-3.5 h-3.5', config.color)} />
        {isProcessing && (
          <motion.div
            className={cn('absolute inset-0 rounded-full', config.bgColor)}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      <span className={cn('text-xs font-medium', config.color)}>
        {config.label}
      </span>

      {/* Mini progress bar */}
      {phaseProgress > 0 && phaseProgress < 100 && (
        <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn('h-full rounded-full', config.color.replace('text-', 'bg-'))}
            initial={{ width: 0 }}
            animate={{ width: `${phaseProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </motion.div>
  );
});

// =============================================================================
// ACTIVE AGENT INDICATOR
// =============================================================================

interface ActiveAgentIndicatorProps {
  className?: string;
}

export const ActiveAgentIndicator = memo(function ActiveAgentIndicator({
  className,
}: ActiveAgentIndicatorProps) {
  const primaryAgent = usePrimaryAgent();

  if (!primaryAgent) return null;

  const config = getAgentConfig(primaryAgent.type);
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full',
        'border border-border/50',
        config.bgColor,
        className
      )}
    >
      <div className="relative">
        <Icon className={cn('w-3.5 h-3.5', config.color)} />
        {primaryAgent.status === 'executing' && (
          <motion.div
            className={cn('absolute -inset-0.5 rounded-full border', config.color.replace('text-', 'border-'))}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>

      <span className={cn('text-xs font-medium truncate max-w-24', config.color)}>
        {primaryAgent.message || config.name}
      </span>

      {/* Progress indicator */}
      {primaryAgent.progress > 0 && primaryAgent.progress < 100 && (
        <span className="text-[10px] text-muted-foreground">
          {primaryAgent.progress}%
        </span>
      )}
    </motion.div>
  );
});

// =============================================================================
// SCREENSHOTS TOGGLE
// =============================================================================

interface ScreenshotsToggleProps {
  screenshotCount: number;
  className?: string;
}

export const ScreenshotsToggle = memo(function ScreenshotsToggle({
  screenshotCount,
  className,
}: ScreenshotsToggleProps) {
  const { isScreenshotsPanelOpen, setScreenshotsPanelOpen, isArtifactsPanelOpen } = useChatContext();

  if (screenshotCount === 0 || isArtifactsPanelOpen) return null;

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setScreenshotsPanelOpen(!isScreenshotsPanelOpen)}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
        'text-sm font-medium transition-colors',
        isScreenshotsPanelOpen
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground',
        className
      )}
    >
      <Camera className="w-4 h-4" />
      <span>{screenshotCount}</span>
    </motion.button>
  );
});

// =============================================================================
// ARTIFACTS TOGGLE
// =============================================================================

interface ArtifactsToggleProps {
  hasArtifact: boolean;
  className?: string;
}

export const ArtifactsToggle = memo(function ArtifactsToggle({
  hasArtifact,
  className,
}: ArtifactsToggleProps) {
  const { isArtifactsPanelOpen, setArtifactsPanelOpen } = useChatContext();

  if (!hasArtifact || isArtifactsPanelOpen) return null;

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setArtifactsPanelOpen(true)}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
        'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
        'border border-purple-500/20 hover:border-purple-500/40',
        'transition-colors text-sm font-medium',
        className
      )}
    >
      <PanelRightOpen className="w-4 h-4" />
      <span>Artifact</span>
    </motion.button>
  );
});

// =============================================================================
// MAIN CHAT HEADER
// =============================================================================

export interface ChatHeaderProps {
  screenshotCount?: number;
  hasArtifact?: boolean;
  className?: string;
}

export const ChatHeader = memo(function ChatHeader({
  screenshotCount = 0,
  hasArtifact = false,
  className,
}: ChatHeaderProps) {
  const { messages } = useChatContext();

  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2',
        'px-2 py-2 sm:px-4 sm:py-3',
        'border-b border-border/50 bg-background/80 backdrop-blur-sm',
        'flex-shrink-0',
        className
      )}
    >
      {/* Phase Badge - When processing */}
      <AnimatePresence>
        <PhaseBadge />
      </AnimatePresence>

      {/* Active Agent - When an agent is working */}
      <AnimatePresence>
        <ActiveAgentIndicator />
      </AnimatePresence>

      {/* Spacer to push controls to the right */}
      <div className="flex-1" />

      {/* Artifacts Toggle */}
      <ArtifactsToggle hasArtifact={hasArtifact} />

      {/* Screenshots Toggle */}
      {messages.length > 0 && (
        <ScreenshotsToggle screenshotCount={screenshotCount} />
      )}

      {/* Model Badge - Always visible */}
      <ChatModelSelector />

      {/* Settings Panel */}
      <ChatSettingsPanel
        trigger={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Settings</span>
          </Button>
        }
      />
    </div>
  );
});

export default ChatHeader;
