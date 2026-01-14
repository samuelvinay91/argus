'use client';

import { memo, useState, useMemo, useCallback } from 'react';
import { Message } from 'ai/react';
import {
  Images,
  X,
  Download,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Calendar,
  Play,
  Eye,
  Search,
  TestTube,
  Sparkles,
  ZoomIn,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ============================================================================
// TYPES
// ============================================================================

interface Screenshot {
  id: string;
  src: string;
  timestamp: Date;
  toolName: string;
  toolLabel: string;
  messageId: string;
  stepIndex?: number;
  type: 'step' | 'final' | 'single';
}

interface ScreenshotGroup {
  toolName: string;
  toolLabel: string;
  messageId: string;
  timestamp: Date;
  screenshots: Screenshot[];
}

interface SessionScreenshotsPanelProps {
  messages: Message[];
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const TOOL_LABELS: Record<string, string> = {
  executeAction: 'Action',
  runTest: 'Test Run',
  createTest: 'Test Creation',
  discoverElements: 'Element Discovery',
  extractData: 'Data Extraction',
  runAgent: 'Agent Run',
};

const TOOL_ICONS: Record<string, typeof Play> = {
  executeAction: Play,
  runTest: TestTube,
  createTest: Sparkles,
  discoverElements: Search,
  extractData: Eye,
  runAgent: Sparkles,
};

function generateScreenshotId(src: string): string {
  // Create a simple hash from the src for deduplication
  // For base64, we use a portion of the data; for URLs, use the full URL
  if (src.startsWith('data:')) {
    // Use the first 100 chars of base64 data as identifier
    return src.slice(0, 150);
  }
  return src;
}

function formatScreenshotSrc(src: string): string {
  if (src.startsWith('data:')) {
    return src;
  }
  if (src.startsWith('http')) {
    return src;
  }
  // Assume it's raw base64
  return `data:image/png;base64,${src}`;
}

function extractScreenshotsFromMessages(messages: Message[]): Screenshot[] {
  const screenshots: Screenshot[] = [];
  const seenIds = new Set<string>();

  messages.forEach((message) => {
    if (message.role !== 'assistant' || !message.toolInvocations) {
      return;
    }

    message.toolInvocations.forEach((tool) => {
      if (tool.state !== 'result' || !tool.result) {
        return;
      }

      const result = tool.result as Record<string, unknown>;
      const toolName = tool.toolName;
      const toolLabel = TOOL_LABELS[toolName] || toolName;
      const timestamp = message.createdAt ? new Date(message.createdAt) : new Date();

      // Extract from 'screenshots' array
      if (Array.isArray(result.screenshots)) {
        result.screenshots.forEach((src, index) => {
          if (typeof src === 'string') {
            const id = generateScreenshotId(src);
            if (!seenIds.has(id)) {
              seenIds.add(id);
              screenshots.push({
                id,
                src: formatScreenshotSrc(src),
                timestamp,
                toolName,
                toolLabel,
                messageId: message.id,
                stepIndex: index,
                type: 'step',
              });
            }
          }
        });
      }

      // Extract from 'screenshot' field
      if (typeof result.screenshot === 'string') {
        const id = generateScreenshotId(result.screenshot);
        if (!seenIds.has(id)) {
          seenIds.add(id);
          screenshots.push({
            id,
            src: formatScreenshotSrc(result.screenshot),
            timestamp,
            toolName,
            toolLabel,
            messageId: message.id,
            type: 'single',
          });
        }
      }

      // Extract from 'finalScreenshot' field
      if (typeof result.finalScreenshot === 'string') {
        const id = generateScreenshotId(result.finalScreenshot);
        if (!seenIds.has(id)) {
          seenIds.add(id);
          screenshots.push({
            id,
            src: formatScreenshotSrc(result.finalScreenshot),
            timestamp,
            toolName,
            toolLabel,
            messageId: message.id,
            type: 'final',
          });
        }
      }

      // Extract from step results if available
      if (Array.isArray(result.steps)) {
        result.steps.forEach((step: unknown, index: number) => {
          if (typeof step === 'object' && step !== null && 'screenshot' in step) {
            const stepObj = step as { screenshot?: string };
            if (typeof stepObj.screenshot === 'string') {
              const id = generateScreenshotId(stepObj.screenshot);
              if (!seenIds.has(id)) {
                seenIds.add(id);
                screenshots.push({
                  id,
                  src: formatScreenshotSrc(stepObj.screenshot),
                  timestamp,
                  toolName,
                  toolLabel,
                  messageId: message.id,
                  stepIndex: index,
                  type: 'step',
                });
              }
            }
          }
        });
      }
    });
  });

  return screenshots;
}

function groupScreenshotsByTool(screenshots: Screenshot[]): ScreenshotGroup[] {
  const groups: Map<string, ScreenshotGroup> = new Map();

  screenshots.forEach((screenshot) => {
    const key = `${screenshot.messageId}-${screenshot.toolName}`;
    if (!groups.has(key)) {
      groups.set(key, {
        toolName: screenshot.toolName,
        toolLabel: screenshot.toolLabel,
        messageId: screenshot.messageId,
        timestamp: screenshot.timestamp,
        screenshots: [],
      });
    }
    groups.get(key)!.screenshots.push(screenshot);
  });

  // Sort groups by timestamp (newest first)
  return Array.from(groups.values()).sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) {
    return `Today, ${formatTime(date)}`;
  }
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// SCREENSHOT THUMBNAIL COMPONENT
// ============================================================================

interface ScreenshotThumbnailProps {
  screenshot: Screenshot;
  onClick: () => void;
}

const ScreenshotThumbnail = memo(function ScreenshotThumbnail({
  screenshot,
  onClick,
}: ScreenshotThumbnailProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative group aspect-video rounded-md overflow-hidden border border-border/50 hover:border-primary/50 transition-colors bg-muted"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={screenshot.src}
        alt={`${screenshot.toolLabel} screenshot`}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
        <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {/* Step badge */}
      {screenshot.stepIndex !== undefined && (
        <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
          Step {screenshot.stepIndex + 1}
        </div>
      )}
      {/* Final badge */}
      {screenshot.type === 'final' && (
        <div className="absolute bottom-1 left-1 bg-green-500/90 text-white text-[10px] px-1.5 py-0.5 rounded">
          Final
        </div>
      )}
    </motion.button>
  );
});

// ============================================================================
// SCREENSHOT GROUP COMPONENT
// ============================================================================

interface ScreenshotGroupCardProps {
  group: ScreenshotGroup;
  onSelectScreenshot: (screenshot: Screenshot) => void;
  defaultExpanded?: boolean;
}

const ScreenshotGroupCard = memo(function ScreenshotGroupCard({
  group,
  onSelectScreenshot,
  defaultExpanded = true,
}: ScreenshotGroupCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const Icon = TOOL_ICONS[group.toolName] || Play;

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Group header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors"
      >
        <div className="p-1 rounded bg-primary/10">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-medium truncate">{group.toolLabel}</div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(group.timestamp)}
            <span className="mx-1">-</span>
            {group.screenshots.length} screenshot{group.screenshots.length !== 1 ? 's' : ''}
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Screenshots grid */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-2 grid grid-cols-2 gap-2 border-t">
              {group.screenshots.map((screenshot) => (
                <ScreenshotThumbnail
                  key={screenshot.id}
                  screenshot={screenshot}
                  onClick={() => onSelectScreenshot(screenshot)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ============================================================================
// FULL-SIZE VIEWER DIALOG
// ============================================================================

interface ScreenshotViewerDialogProps {
  screenshot: Screenshot | null;
  allScreenshots: Screenshot[];
  onClose: () => void;
  onNavigate: (screenshot: Screenshot) => void;
}

const ScreenshotViewerDialog = memo(function ScreenshotViewerDialog({
  screenshot,
  allScreenshots,
  onClose,
  onNavigate,
}: ScreenshotViewerDialogProps) {
  const currentIndex = screenshot
    ? allScreenshots.findIndex((s) => s.id === screenshot.id)
    : -1;

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(allScreenshots[currentIndex - 1]);
    }
  }, [currentIndex, allScreenshots, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex < allScreenshots.length - 1) {
      onNavigate(allScreenshots[currentIndex + 1]);
    }
  }, [currentIndex, allScreenshots, onNavigate]);

  const handleDownload = useCallback(() => {
    if (!screenshot) return;

    const link = document.createElement('a');
    link.href = screenshot.src;
    link.download = `screenshot-${screenshot.toolLabel.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [screenshot]);

  if (!screenshot) return null;

  return (
    <Dialog open={!!screenshot} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-sm font-medium">
              {screenshot.toolLabel}
              {screenshot.stepIndex !== undefined && ` - Step ${screenshot.stepIndex + 1}`}
              {screenshot.type === 'final' && ' (Final)'}
            </DialogTitle>
            <span className="text-xs text-muted-foreground">
              {formatDate(screenshot.timestamp)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        </DialogHeader>

        <div className="relative flex-1 overflow-hidden bg-black/90 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screenshot.src}
            alt={`${screenshot.toolLabel} screenshot`}
            className="max-w-full max-h-[70vh] object-contain"
          />

          {/* Navigation buttons */}
          {currentIndex > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="absolute left-2 top-1/2 -translate-y-1/2"
              onClick={handlePrevious}
            >
              Previous
            </Button>
          )}
          {currentIndex < allScreenshots.length - 1 && (
            <Button
              variant="secondary"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={handleNext}
            >
              Next
            </Button>
          )}
        </div>

        {/* Footer with position indicator */}
        <div className="px-4 py-2 border-t text-center text-xs text-muted-foreground">
          {currentIndex + 1} of {allScreenshots.length}
        </div>
      </DialogContent>
    </Dialog>
  );
});

// ============================================================================
// MAIN PANEL COMPONENT
// ============================================================================

export const SessionScreenshotsPanel = memo(function SessionScreenshotsPanel({
  messages,
  isOpen,
  onClose,
  className,
}: SessionScreenshotsPanelProps) {
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);

  // Extract and deduplicate screenshots from all messages
  const screenshots = useMemo(
    () => extractScreenshotsFromMessages(messages),
    [messages]
  );

  // Group screenshots by tool invocation
  const groups = useMemo(
    () => groupScreenshotsByTool(screenshots),
    [screenshots]
  );

  // Download all screenshots as a zip (simplified - just downloads them individually)
  const handleDownloadAll = useCallback(() => {
    screenshots.forEach((screenshot, index) => {
      const link = document.createElement('a');
      link.href = screenshot.src;
      link.download = `screenshot-${index + 1}-${screenshot.toolLabel.toLowerCase().replace(/\s+/g, '-')}.png`;
      document.body.appendChild(link);
      // Stagger downloads to avoid browser blocking
      setTimeout(() => {
        link.click();
        document.body.removeChild(link);
      }, index * 200);
    });
  }, [screenshots]);

  return (
    <>
      {/* Panel overlay for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              'fixed right-0 top-0 bottom-0 z-50 w-full sm:w-80 lg:w-72',
              'bg-background border-l shadow-xl',
              'flex flex-col',
              'lg:relative lg:z-auto lg:shadow-none',
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Images className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Session Screenshots</h3>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {screenshots.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {screenshots.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadAll}
                    className="h-7 px-2 text-xs"
                    title="Download all screenshots"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-7 w-7 p-0 lg:hidden"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {screenshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="p-3 rounded-full bg-muted mb-3">
                    <Images className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No screenshots yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Screenshots from test runs and actions will appear here
                  </p>
                </div>
              ) : (
                groups.map((group) => (
                  <ScreenshotGroupCard
                    key={`${group.messageId}-${group.toolName}`}
                    group={group}
                    onSelectScreenshot={setSelectedScreenshot}
                    defaultExpanded={groups.length <= 3}
                  />
                ))
              )}
            </div>

            {/* Footer stats */}
            {screenshots.length > 0 && (
              <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
                <span>{groups.length} tool invocation{groups.length !== 1 ? 's' : ''}</span>
                <span>{screenshots.length} total screenshot{screenshots.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-size viewer dialog */}
      <ScreenshotViewerDialog
        screenshot={selectedScreenshot}
        allScreenshots={screenshots}
        onClose={() => setSelectedScreenshot(null)}
        onNavigate={setSelectedScreenshot}
      />
    </>
  );
});

// ============================================================================
// TOGGLE BUTTON COMPONENT
// ============================================================================

interface ScreenshotsPanelToggleProps {
  screenshotCount: number;
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export const ScreenshotsPanelToggle = memo(function ScreenshotsPanelToggle({
  screenshotCount,
  isOpen,
  onClick,
  className,
}: ScreenshotsPanelToggleProps) {
  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
        'bg-primary/10 text-primary hover:bg-primary/20',
        'border border-primary/20 hover:border-primary/40',
        'transition-colors text-sm font-medium',
        isOpen && 'bg-primary/20 border-primary/40',
        className
      )}
    >
      <Images className="w-4 h-4" />
      <span>Screenshots</span>
      {screenshotCount > 0 && (
        <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {screenshotCount}
        </span>
      )}
    </motion.button>
  );
});

// Export utility function for external use
export { extractScreenshotsFromMessages };
