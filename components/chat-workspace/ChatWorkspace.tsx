/**
 * ChatWorkspace - Main orchestrator component for the chat workspace
 *
 * Integrates:
 * - Adaptive layout (focused/split/multi)
 * - AI SDK chat functionality
 * - Panel spawning based on AI responses
 * - Keyboard shortcuts
 * - Conversation history
 */

'use client';

import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { UIMessage } from '@ai-sdk/react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pin, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Internal imports
import { WorkspaceLayout, type LayoutState } from './layout/WorkspaceLayout';
import { GlassCard } from './glass';
import {
  useAdaptiveLayout,
  usePanelOrchestrator,
  useContextualSuggestions,
  useFloatingPanels,
  type Panel,
  type PanelType,
} from './hooks';

// Chat components from existing chat system
import { useChatState, type ChatStateResult } from '@/components/chat/hooks/useChatState';

// =============================================================================
// TYPES
// =============================================================================

export interface ChatWorkspaceProps {
  /** Conversation ID for persisting messages */
  conversationId?: string;
  /** Initial messages to load */
  initialMessages?: UIMessage[];
  /** Callback when messages change */
  onMessagesChange?: (messages: UIMessage[]) => void;
  /** Whether to show the history drawer */
  showHistoryDrawer?: boolean;
  /** Callback when history drawer toggle is requested */
  onHistoryToggle?: () => void;
  /** Additional className */
  className?: string;
}

// =============================================================================
// PANEL CONTENT RENDERER
// =============================================================================

interface PanelContentProps {
  panel: Panel;
  onClose: () => void;
  onPin: () => void;
  onPopOut: () => void;
}

const PanelContent = React.memo(function PanelContent({
  panel,
  onClose,
  onPin,
  onPopOut,
}: PanelContentProps) {
  // Render different panel types
  const renderContent = () => {
    switch (panel.type) {
      case 'test-results':
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Test Results</h3>
            <pre className="text-xs bg-black/20 p-3 rounded-lg overflow-auto max-h-[400px]">
              {JSON.stringify(panel.data, null, 2)}
            </pre>
          </div>
        );

      case 'quality-report':
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Quality Report</h3>
            <pre className="text-xs bg-black/20 p-3 rounded-lg overflow-auto max-h-[400px]">
              {JSON.stringify(panel.data, null, 2)}
            </pre>
          </div>
        );

      case 'visual-diff':
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Visual Comparison</h3>
            <div className="text-sm text-muted-foreground">
              Visual diff viewer placeholder
            </div>
          </div>
        );

      case 'code-viewer':
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Code Viewer</h3>
            <pre className="text-xs bg-black/20 p-3 rounded-lg overflow-auto max-h-[400px] font-mono">
              {typeof panel.data === 'object' && panel.data !== null
                ? JSON.stringify(panel.data, null, 2)
                : String(panel.data)}
            </pre>
          </div>
        );

      case 'pipeline':
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Pipeline Status</h3>
            <div className="text-sm text-muted-foreground">
              Pipeline status viewer placeholder
            </div>
          </div>
        );

      case 'logs':
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Logs</h3>
            <pre className="text-xs bg-black/20 p-3 rounded-lg overflow-auto max-h-[400px] font-mono">
              {typeof panel.data === 'string' ? panel.data : JSON.stringify(panel.data, null, 2)}
            </pre>
          </div>
        );

      default:
        return (
          <div className="p-4 text-muted-foreground">
            Panel content for type: {panel.type}
          </div>
        );
    }
  };

  return (
    <GlassCard className="h-full flex flex-col">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
        <h2 className="text-sm font-medium truncate">{panel.title}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onPin}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              'hover:bg-white/[0.06]',
              panel.isPinned && 'text-primary bg-primary/10'
            )}
            title={panel.isPinned ? 'Unpin' : 'Pin'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onPopOut}
            className="p-1.5 rounded-md transition-colors hover:bg-white/[0.06]"
            title="Pop out"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors hover:bg-white/[0.06] hover:text-destructive"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-auto">{renderContent()}</div>
    </GlassCard>
  );
});

// =============================================================================
// FLOATING PANEL
// =============================================================================

interface FloatingPanelProps {
  panel: Panel;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  onClose: () => void;
  onPopIn: () => void;
  onPositionChange: (position: { x: number; y: number }) => void;
  onSizeChange: (size: { width: number; height: number }) => void;
  onBringToFront: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onRestore: () => void;
}

const FloatingPanel = React.memo(function FloatingPanel({
  panel,
  position,
  size,
  zIndex,
  isMinimized,
  isMaximized,
  onClose,
  onPopIn,
  onPositionChange,
  onBringToFront,
  onMinimize,
  onMaximize,
  onRestore,
}: FloatingPanelProps) {
  const dragRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;

    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    onBringToFront();
  }, [position, onBringToFront]);

  // Handle drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;

      // Constrain to viewport
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - size.height;

      onPositionChange({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [size, onPositionChange]);

  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed bottom-4 left-4"
        style={{ zIndex }}
        onClick={onRestore}
      >
        <GlassCard className="px-4 py-2 cursor-pointer hover:bg-white/[0.06]">
          <span className="text-sm truncate max-w-[200px] block">{panel.title}</span>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={dragRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed shadow-2xl"
      style={{
        left: position.x,
        top: position.y,
        width: isMaximized ? '100vw' : size.width,
        height: isMaximized ? '100vh' : size.height,
        zIndex,
      }}
      onClick={onBringToFront}
    >
      <GlassCard className="h-full flex flex-col">
        {/* Floating Panel Header (draggable) */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b border-white/[0.08] cursor-move"
          onMouseDown={handleMouseDown}
        >
          <h2 className="text-sm font-medium truncate">{panel.title}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onMinimize}
              className="p-1.5 rounded-md transition-colors hover:bg-white/[0.06]"
              title="Minimize"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={isMaximized ? onRestore : onMaximize}
              className="p-1.5 rounded-md transition-colors hover:bg-white/[0.06]"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onPopIn}
              className="p-1.5 rounded-md transition-colors hover:bg-white/[0.06]"
              title="Dock"
            >
              <ExternalLink className="w-3.5 h-3.5 rotate-180" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md transition-colors hover:bg-white/[0.06] hover:text-destructive"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-xs bg-black/20 p-3 rounded-lg overflow-auto max-h-full">
            {JSON.stringify(panel.data, null, 2)}
          </pre>
        </div>
      </GlassCard>
    </motion.div>
  );
});

// =============================================================================
// TABBED PANEL VIEW (for multi-panel mode)
// =============================================================================

interface TabbedPanelViewProps {
  panels: Panel[];
  activePanel: string | null;
  onSelectPanel: (id: string) => void;
  onClosePanel: (id: string) => void;
  onPinPanel: (id: string) => void;
  onPopOutPanel: (id: string) => void;
}

const TabbedPanelView = React.memo(function TabbedPanelView({
  panels,
  activePanel,
  onSelectPanel,
  onClosePanel,
  onPinPanel,
  onPopOutPanel,
}: TabbedPanelViewProps) {
  const activePanelData = panels.find((p) => p.id === activePanel);

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-white/[0.08] overflow-x-auto">
        {panels.map((panel) => (
          <button
            key={panel.id}
            onClick={() => onSelectPanel(panel.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap',
              panel.id === activePanel
                ? 'bg-white/[0.08] text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
            )}
          >
            {panel.isPinned && <Pin className="w-3 h-3 text-primary" />}
            <span className="truncate max-w-[120px]">{panel.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClosePanel(panel.id);
              }}
              className="ml-1 p-0.5 rounded hover:bg-white/[0.1]"
            >
              <X className="w-3 h-3" />
            </button>
          </button>
        ))}
      </div>

      {/* Active Panel Content */}
      {activePanelData && (
        <div className="flex-1 overflow-hidden">
          <PanelContent
            panel={activePanelData}
            onClose={() => onClosePanel(activePanelData.id)}
            onPin={() => onPinPanel(activePanelData.id)}
            onPopOut={() => onPopOutPanel(activePanelData.id)}
          />
        </div>
      )}
    </div>
  );
});

// =============================================================================
// CHAT THREAD (Simplified placeholder - would use existing chat components)
// =============================================================================

interface ChatThreadProps {
  chatState: ChatStateResult;
  suggestions: Array<{ id: string; text: string; prompt: string }>;
  onSuggestionClick: (prompt: string) => void;
}

const ChatThread = React.memo(function ChatThread({
  chatState,
  suggestions,
  onSuggestionClick,
}: ChatThreadProps) {
  const { messages, isLoading, input, setInput, handleSubmit, scrollRef } = chatState;
  const formRef = useRef<HTMLFormElement>(null);

  // Structured logging for debugging message flow
  React.useEffect(() => {
    console.group('[ChatThread] Messages Update');
    console.log('Count:', messages.length);
    console.log('isLoading:', isLoading);
    messages.forEach((msg, i) => {
      console.log(`Message[${i}]:`, {
        id: msg.id,
        role: msg.role,
        partsCount: msg.parts?.length ?? 0,
        parts: msg.parts,
      });
    });
    console.groupEnd();
  }, [messages, isLoading]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-semibold mb-2">Hey Argus</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Your autonomous quality companion. Describe what you want to test in plain English.
            </p>

            {/* Suggestions */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => onSuggestionClick(suggestion.prompt)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm',
                    'bg-white/[0.06] border border-white/[0.08]',
                    'hover:bg-white/[0.1] transition-colors'
                  )}
                >
                  {suggestion.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => {
            // Extract text content from parts array (AI SDK v6 format)
            const textParts = message.parts?.filter(
              (part): part is { type: 'text'; text: string } => part.type === 'text'
            ) || [];
            const content = textParts.map(p => p.text).join('\n');

            return (
              <div
                key={message.id}
                className={cn(
                  'max-w-[85%] p-3 rounded-lg',
                  message.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'bg-white/[0.06]'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{content}</p>
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="bg-white/[0.06] max-w-[85%] p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-white/[0.08] p-4">
        <form ref={formRef} onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what to test... (type / for commands)"
            className={cn(
              'flex-1 px-4 py-2 rounded-lg',
              'bg-white/[0.06] border border-white/[0.08]',
              'focus:outline-none focus:ring-2 focus:ring-primary/50',
              'placeholder:text-muted-foreground'
            )}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              'px-4 py-2 rounded-lg bg-primary text-primary-foreground',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'hover:bg-primary/90 transition-colors'
            )}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ChatWorkspace({
  conversationId,
  initialMessages = [],
  onMessagesChange,
  className,
}: ChatWorkspaceProps) {
  // Chat state from AI SDK integration
  const chatState = useChatState({
    conversationId,
    initialMessages,
    onMessagesChange,
  });

  // Layout management
  const layout = useAdaptiveLayout();

  // Panel orchestrator
  usePanelOrchestrator({
    layout,
    messages: chatState.messages,
    autoSpawn: true,
  });

  // Contextual suggestions
  const { suggestions } = useContextualSuggestions({
    messages: chatState.messages,
    maxSuggestions: 5,
  });

  // Floating panels
  const floating = useFloatingPanels({ persist: true });

  // Sync floating panels with layout floating state
  useEffect(() => {
    for (const panel of layout.floatingPanels) {
      if (!floating.hasPanel(panel.id)) {
        floating.addPanel(panel.id);
      }
    }
  }, [layout.floatingPanels, floating]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for command palette (could integrate with slash commands)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // TODO: Open command palette
      }

      // Escape to close active panel
      if (e.key === 'Escape') {
        if (layout.activePanel) {
          const panel = layout.activePanelData;
          if (panel && !panel.isPinned) {
            layout.closePanel(panel.id);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [layout]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((prompt: string) => {
    chatState.setInput(prompt);
    chatState.inputRef.current?.focus();
  }, [chatState]);

  // Render panel content for split mode
  const panelContent = useMemo(() => {
    if (layout.dockedPanels.length === 0) return null;

    if (layout.layoutState === 'multi') {
      return (
        <TabbedPanelView
          panels={layout.dockedPanels}
          activePanel={layout.activePanel}
          onSelectPanel={layout.setActivePanel}
          onClosePanel={layout.closePanel}
          onPinPanel={(id) => {
            const panel = layout.panels.find((p) => p.id === id);
            if (panel?.isPinned) {
              layout.unpinPanel(id);
            } else {
              layout.pinPanel(id);
            }
          }}
          onPopOutPanel={layout.popOutPanel}
        />
      );
    }

    // Single panel (split mode)
    const panel = layout.dockedPanels[0];
    if (!panel) return null;

    return (
      <PanelContent
        panel={panel}
        onClose={() => layout.closePanel(panel.id)}
        onPin={() => {
          if (panel.isPinned) {
            layout.unpinPanel(panel.id);
          } else {
            layout.pinPanel(panel.id);
          }
        }}
        onPopOut={() => layout.popOutPanel(panel.id)}
      />
    );
  }, [layout]);

  return (
    <div className={cn('h-full w-full relative', className)}>
      <WorkspaceLayout
        layoutState={layout.layoutState}
        panelContent={panelContent}
      >
        <ChatThread
          chatState={chatState}
          suggestions={suggestions}
          onSuggestionClick={handleSuggestionClick}
        />
      </WorkspaceLayout>

      {/* Floating Panels */}
      <AnimatePresence>
        {layout.floatingPanels.map((panel) => {
          const floatingState = floating.getPanel(panel.id);
          if (!floatingState) return null;

          return (
            <FloatingPanel
              key={panel.id}
              panel={panel}
              position={floatingState.position}
              size={floatingState.size}
              zIndex={floatingState.zIndex}
              isMinimized={floatingState.isMinimized}
              isMaximized={floatingState.isMaximized}
              onClose={() => {
                layout.closePanel(panel.id);
                floating.removePanel(panel.id);
              }}
              onPopIn={() => layout.popInPanel(panel.id)}
              onPositionChange={(pos) => floating.updatePosition(panel.id, pos)}
              onSizeChange={(size) => floating.updateSize(panel.id, size)}
              onBringToFront={() => floating.bringToFront(panel.id)}
              onMinimize={() => floating.minimize(panel.id)}
              onMaximize={() => floating.maximize(panel.id)}
              onRestore={() => floating.restore(panel.id)}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default ChatWorkspace;
