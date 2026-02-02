/**
 * AgentActivityPanel - Show active agents and their progress
 *
 * Displays which AI agents are currently working, their status,
 * and overall phase progress.
 */

'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAgentActivity } from '../hooks/useAgentActivity';
import { AgentBadge } from './AgentBadge';
import { PhaseProgressBar } from './PhaseProgressBar';
import { ConfidenceIndicator } from './ConfidenceIndicator';

// =============================================================================
// TYPES
// =============================================================================

export interface AgentActivityPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  position?: 'inline' | 'floating' | 'sidebar';
  className?: string;
}

// =============================================================================
// INLINE PANEL (shows in chat header area)
// =============================================================================

export const AgentActivityInline = memo(function AgentActivityInline({
  className,
}: { className?: string }) {
  const { activeAgents, currentPhase, phaseProgress, isProcessing } = useAgentActivity();

  if (!isProcessing && activeAgents.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg',
        'bg-card/80 backdrop-blur-sm border border-border/50',
        className
      )}
    >
      {/* Phase indicator */}
      <PhaseProgressBar
        phase={currentPhase}
        progress={phaseProgress}
        compact
      />

      {/* Active agents */}
      <div className="flex items-center gap-1">
        {activeAgents.slice(0, 3).map((agent) => (
          <AgentBadge
            key={agent.id}
            agent={agent}
            size="sm"
            showProgress={false}
          />
        ))}
        {activeAgents.length > 3 && (
          <span className="text-xs text-muted-foreground ml-1">
            +{activeAgents.length - 3}
          </span>
        )}
      </div>
    </motion.div>
  );
});

// =============================================================================
// FLOATING PANEL
// =============================================================================

export const AgentActivityFloating = memo(function AgentActivityFloating({
  isOpen = true,
  onClose,
  className,
}: AgentActivityPanelProps) {
  const { activeAgents, currentPhase, phaseProgress, overallProgress } = useAgentActivity();

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className={cn(
        'fixed bottom-24 right-6 z-40 w-80',
        'bg-card border rounded-lg shadow-lg',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Agent Activity</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Phase Progress */}
      <div className="p-3 border-b">
        <PhaseProgressBar
          phase={currentPhase}
          progress={phaseProgress}
        />
      </div>

      {/* Agent List */}
      <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
        {activeAgents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No active agents
          </p>
        ) : (
          activeAgents.map((agent) => (
            <AgentBadge
              key={agent.id}
              agent={agent}
              size="md"
              showProgress
              showConfidence
            />
          ))
        )}
      </div>

      {/* Footer */}
      {activeAgents.length > 0 && (
        <div className="p-3 border-t bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{activeAgents.length} agent{activeAgents.length !== 1 ? 's' : ''} active</span>
            <span>Overall: {overallProgress}%</span>
          </div>
        </div>
      )}
    </motion.div>
  );
});

// =============================================================================
// SIDEBAR PANEL
// =============================================================================

export const AgentActivitySidebar = memo(function AgentActivitySidebar({
  isOpen = true,
  onClose,
  className,
}: AgentActivityPanelProps) {
  const { activeAgents, currentPhase, phaseProgress, overallProgress, agentsByStatus } = useAgentActivity();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={cn(
            'h-full border-l bg-card overflow-hidden flex flex-col',
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <span className="font-semibold">Agent Activity</span>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Phase Progress */}
          <div className="p-4 border-b flex-shrink-0">
            <PhaseProgressBar
              phase={currentPhase}
              progress={phaseProgress}
              showLabel
            />
          </div>

          {/* Agent Groups */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Executing */}
            {agentsByStatus.executing.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Executing ({agentsByStatus.executing.length})
                </h4>
                <div className="space-y-2">
                  {agentsByStatus.executing.map((agent) => (
                    <AgentBadge
                      key={agent.id}
                      agent={agent}
                      size="lg"
                      showProgress
                      showConfidence
                      showTool
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Thinking */}
            {agentsByStatus.thinking.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Thinking ({agentsByStatus.thinking.length})
                </h4>
                <div className="space-y-2">
                  {agentsByStatus.thinking.map((agent) => (
                    <AgentBadge
                      key={agent.id}
                      agent={agent}
                      size="lg"
                      showProgress
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Complete */}
            {agentsByStatus.complete.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Completed ({agentsByStatus.complete.length})
                </h4>
                <div className="space-y-2">
                  {agentsByStatus.complete.map((agent) => (
                    <AgentBadge
                      key={agent.id}
                      agent={agent}
                      size="lg"
                      showConfidence
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {activeAgents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active agents</p>
                <p className="text-xs mt-1">
                  Agents will appear here during test execution
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-muted/30 flex-shrink-0">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {activeAgents.length} agent{activeAgents.length !== 1 ? 's' : ''}
              </span>
              <ConfidenceIndicator
                confidence={overallProgress}
                size="sm"
                label="Progress"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// =============================================================================
// MAIN EXPORT (with position prop)
// =============================================================================

export const AgentActivityPanel = memo(function AgentActivityPanel({
  position = 'floating',
  ...props
}: AgentActivityPanelProps) {
  switch (position) {
    case 'inline':
      return <AgentActivityInline className={props.className} />;
    case 'sidebar':
      return <AgentActivitySidebar {...props} />;
    case 'floating':
    default:
      return <AgentActivityFloating {...props} />;
  }
});

export default AgentActivityPanel;
