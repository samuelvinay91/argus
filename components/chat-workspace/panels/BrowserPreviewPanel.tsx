'use client';

/**
 * BrowserPreviewPanel - Live browser view placeholder
 *
 * Features:
 * - URL bar (read-only)
 * - Refresh button
 * - Screenshot display area
 * - Element highlight overlay
 * - Loading state
 */

import * as React from 'react';
import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  RefreshCw,
  Maximize2,
  Lock,
  MousePointer2,
  Loader2,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../glass';

// =============================================================================
// TYPES
// =============================================================================

export interface ElementHighlight {
  selector: string;
  label: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface BrowserPreviewPanelProps {
  url: string;
  screenshot?: string; // Base64 or URL
  highlights?: ElementHighlight[];
  isLoading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onFullscreen?: () => void;
  className?: string;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const BrowserChrome = memo(function BrowserChrome({
  url,
  isLoading,
  onRefresh,
  onFullscreen,
}: {
  url: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onFullscreen?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border-b border-white/5">
      {/* Traffic lights */}
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-500/60" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
        <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
      </div>

      {/* URL Bar */}
      <div className="flex-1 flex items-center gap-2 bg-black/30 rounded-lg px-3 py-1.5 ml-2">
        <Lock size={12} className="text-emerald-400 flex-shrink-0" />
        <span className="text-xs text-white/60 truncate font-mono">{url}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              size={14}
              className={cn('text-white/60', isLoading && 'animate-spin')}
            />
          </button>
        )}
        {onFullscreen && (
          <button
            onClick={onFullscreen}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="Fullscreen"
          >
            <Maximize2 size={14} className="text-white/60" />
          </button>
        )}
      </div>
    </div>
  );
});

const HighlightOverlay = memo(function HighlightOverlay({
  highlight,
}: {
  highlight: ElementHighlight;
}) {
  if (!highlight.x || !highlight.y || !highlight.width || !highlight.height) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute pointer-events-none"
      style={{
        left: highlight.x,
        top: highlight.y,
        width: highlight.width,
        height: highlight.height,
      }}
    >
      {/* Highlight box */}
      <div className="absolute inset-0 border-2 border-indigo-400 bg-indigo-500/10 rounded" />

      {/* Label */}
      <div className="absolute -top-6 left-0 flex items-center gap-1 px-2 py-0.5 bg-indigo-500 text-white text-xs rounded whitespace-nowrap">
        <MousePointer2 size={10} />
        {highlight.label}
      </div>

      {/* Selector tooltip */}
      <div className="absolute -bottom-6 left-0 px-2 py-0.5 bg-black/80 text-white/80 text-xs font-mono rounded truncate max-w-[200px]">
        {highlight.selector}
      </div>
    </motion.div>
  );
});

const LoadingOverlay = memo(function LoadingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="text-indigo-400 animate-spin" />
        <span className="text-sm text-white/60">Loading browser...</span>
      </div>
    </motion.div>
  );
});

const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <ImageIcon size={32} className="text-white/20" />
      </div>
      <p className="text-sm text-white/40">No screenshot available</p>
      <p className="text-xs text-white/30 mt-1">
        Run a test to capture browser state
      </p>
    </div>
  );
});

const ErrorState = memo(function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertCircle size={32} className="text-red-400" />
      </div>
      <p className="text-sm text-red-400">Failed to load</p>
      <p className="text-xs text-white/40 mt-1 max-w-[200px]">{message}</p>
    </div>
  );
});

// =============================================================================
// LOADING SKELETON
// =============================================================================

const BrowserPreviewSkeleton = memo(function BrowserPreviewSkeleton() {
  return (
    <div className="space-y-0 animate-pulse">
      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-t-2xl">
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-3 h-3 rounded-full bg-white/10" />
          ))}
        </div>
        <div className="flex-1 h-7 bg-white/10 rounded-lg ml-2" />
      </div>
      <div className="h-64 bg-white/5 rounded-b-2xl" />
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const BrowserPreviewPanel = memo(function BrowserPreviewPanel({
  url,
  screenshot,
  highlights = [],
  isLoading = false,
  error,
  onRefresh,
  onFullscreen,
  className,
}: BrowserPreviewPanelProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <GlassCard variant="medium" padding="none" className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-indigo-400" />
          <h3 className="text-sm font-medium text-white">Browser Preview</h3>
          {isLoading && (
            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" />
              Loading
            </span>
          )}
        </div>
      </div>

      {/* Browser Chrome */}
      <BrowserChrome
        url={url}
        isLoading={isLoading}
        onRefresh={onRefresh}
        onFullscreen={onFullscreen}
      />

      {/* Content Area */}
      <div className="relative min-h-[250px] bg-[#1a1a2e]">
        {error ? (
          <ErrorState message={error} />
        ) : screenshot && !imageError ? (
          <div className="relative">
            {/* Screenshot */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshot}
              alt="Browser screenshot"
              className="w-full h-auto"
              onError={() => setImageError(true)}
              draggable={false}
            />

            {/* Highlight Overlays */}
            {highlights.map((highlight, index) => (
              <HighlightOverlay key={index} highlight={highlight} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}

        {/* Loading Overlay */}
        <AnimatePresence>
          {isLoading && <LoadingOverlay />}
        </AnimatePresence>
      </div>

      {/* Footer with highlights list */}
      {highlights.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5 bg-white/[0.02]">
          <div className="text-xs text-white/40 mb-1">Highlighted Elements</div>
          <div className="flex flex-wrap gap-1.5">
            {highlights.map((highlight, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded flex items-center gap-1"
              >
                <MousePointer2 size={10} />
                {highlight.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
});

export { BrowserPreviewSkeleton };
export default BrowserPreviewPanel;
