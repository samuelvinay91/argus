'use client';

/**
 * VisualDiffPanel - Screenshot comparison panel
 *
 * Features:
 * - Three modes: side-by-side, overlay, slider
 * - Mode toggle buttons
 * - Zoom controls
 * - Highlight differences
 * - Before/After labels
 * - Approve/Reject buttons
 */

import * as React from 'react';
import { memo, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Columns2,
  Layers,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  X,
  Eye,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../glass';

// =============================================================================
// TYPES
// =============================================================================

export type ViewMode = 'side-by-side' | 'overlay' | 'slider';

export interface VisualComparison {
  before: string; // Base64 or URL
  after: string; // Base64 or URL
  diffPercentage: number;
  diffImage?: string; // Optional diff highlight image
}

export interface VisualDiffPanelProps {
  comparison: VisualComparison;
  onApprove?: () => void;
  onReject?: () => void;
  className?: string;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const ModeButton = memo(function ModeButton({
  mode,
  currentMode,
  icon: Icon,
  label,
  onClick,
}: {
  mode: ViewMode;
  currentMode: ViewMode;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  onClick: () => void;
}) {
  const isActive = mode === currentMode;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all',
        isActive
          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
          : 'text-white/60 hover:text-white hover:bg-white/10'
      )}
      title={label}
    >
      <Icon size={14} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
});

const ZoomControls = memo(function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
      <button
        onClick={onZoomOut}
        disabled={zoom <= 0.5}
        className="p-1 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Zoom out"
      >
        <ZoomOut size={14} className="text-white/60" />
      </button>
      <span className="text-xs text-white/60 w-12 text-center">{Math.round(zoom * 100)}%</span>
      <button
        onClick={onZoomIn}
        disabled={zoom >= 3}
        className="p-1 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Zoom in"
      >
        <ZoomIn size={14} className="text-white/60" />
      </button>
      <button
        onClick={onReset}
        className="p-1 hover:bg-white/10 rounded transition-colors"
        title="Reset zoom"
      >
        <RotateCcw size={14} className="text-white/60" />
      </button>
    </div>
  );
});

const ImageContainer = memo(function ImageContainer({
  src,
  label,
  zoom,
  className,
}: {
  src: string;
  label: string;
  zoom: number;
  className?: string;
}) {
  return (
    <div className={cn('relative flex flex-col', className)}>
      <div className="text-xs text-white/50 mb-1.5 text-center">{label}</div>
      <div className="flex-1 overflow-auto rounded-lg bg-black/20 border border-white/5">
        <div
          className="min-h-full flex items-center justify-center p-2"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={label}
            className="max-w-full h-auto rounded shadow-lg"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
});

const SideBySideView = memo(function SideBySideView({
  before,
  after,
  zoom,
}: {
  before: string;
  after: string;
  zoom: number;
}) {
  return (
    <div className="flex gap-4 h-64">
      <ImageContainer src={before} label="Before" zoom={zoom} className="flex-1" />
      <ImageContainer src={after} label="After" zoom={zoom} className="flex-1" />
    </div>
  );
});

const OverlayView = memo(function OverlayView({
  before,
  after,
  zoom,
}: {
  before: string;
  after: string;
  zoom: number;
}) {
  const [opacity, setOpacity] = useState(0.5);

  return (
    <div className="space-y-2">
      <div className="relative h-64 overflow-auto rounded-lg bg-black/20 border border-white/5">
        <div
          className="relative min-h-full flex items-center justify-center p-2"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          {/* Before (bottom) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={before}
            alt="Before"
            className="max-w-full h-auto rounded shadow-lg"
            draggable={false}
          />
          {/* After (top, with opacity) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={after}
            alt="After"
            className="absolute inset-0 m-auto max-w-full h-auto rounded shadow-lg"
            style={{ opacity }}
            draggable={false}
          />
        </div>
      </div>
      <div className="flex items-center gap-3 px-2">
        <span className="text-xs text-white/50">Before</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
          className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:rounded-full"
        />
        <span className="text-xs text-white/50">After</span>
      </div>
    </div>
  );
});

const SliderView = memo(function SliderView({
  before,
  after,
  zoom,
}: {
  before: string;
  after: string;
  zoom: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    },
    []
  );

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-64 overflow-hidden rounded-lg bg-black/20 border border-white/5 cursor-ew-resize select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Before image (full) */}
      <div
        className="absolute inset-0 flex items-center justify-center p-2"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt="Before" className="max-w-full h-auto rounded" draggable={false} />
      </div>

      {/* After image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden flex items-center justify-center p-2"
        style={{
          clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after} alt="After" className="max-w-full h-auto rounded" draggable={false} />
      </div>

      {/* Slider handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
          <SlidersHorizontal size={14} className="text-gray-800" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 rounded text-xs text-white/70">
        Before
      </div>
      <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 rounded text-xs text-white/70">
        After
      </div>
    </div>
  );
});

// =============================================================================
// LOADING SKELETON
// =============================================================================

const VisualDiffSkeleton = memo(function VisualDiffSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-20 bg-white/10 rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-white/5 rounded-lg" />
      <div className="flex gap-2">
        <div className="h-8 flex-1 bg-white/10 rounded-lg" />
        <div className="h-8 flex-1 bg-white/10 rounded-lg" />
      </div>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const VisualDiffPanel = memo(function VisualDiffPanel({
  comparison,
  onApprove,
  onReject,
  className,
}: VisualDiffPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom((z) => Math.min(3, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, z - 0.25));
  const handleZoomReset = () => setZoom(1);

  const diffSeverity =
    comparison.diffPercentage <= 1
      ? 'low'
      : comparison.diffPercentage <= 10
        ? 'medium'
        : 'high';

  const severityColors = {
    low: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
    medium: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
    high: 'text-red-400 bg-red-500/20 border-red-500/30',
  };

  return (
    <GlassCard variant="medium" padding="none" className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-indigo-400" />
          <h3 className="text-sm font-medium text-white">Visual Comparison</h3>
          <span
            className={cn(
              'px-2 py-0.5 text-xs rounded-full border flex items-center gap-1',
              severityColors[diffSeverity]
            )}
          >
            {diffSeverity === 'high' && <AlertCircle size={10} />}
            {comparison.diffPercentage.toFixed(1)}% diff
          </span>
        </div>
        <ZoomControls
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleZoomReset}
        />
      </div>

      <div className="p-4 space-y-4">
        {/* Mode Toggle */}
        <div className="flex items-center justify-center gap-2">
          <ModeButton
            mode="side-by-side"
            currentMode={viewMode}
            icon={Columns2}
            label="Side by Side"
            onClick={() => setViewMode('side-by-side')}
          />
          <ModeButton
            mode="overlay"
            currentMode={viewMode}
            icon={Layers}
            label="Overlay"
            onClick={() => setViewMode('overlay')}
          />
          <ModeButton
            mode="slider"
            currentMode={viewMode}
            icon={SlidersHorizontal}
            label="Slider"
            onClick={() => setViewMode('slider')}
          />
        </div>

        {/* Comparison View */}
        <motion.div
          key={viewMode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {viewMode === 'side-by-side' && (
            <SideBySideView
              before={comparison.before}
              after={comparison.after}
              zoom={zoom}
            />
          )}
          {viewMode === 'overlay' && (
            <OverlayView
              before={comparison.before}
              after={comparison.after}
              zoom={zoom}
            />
          )}
          {viewMode === 'slider' && (
            <SliderView
              before={comparison.before}
              after={comparison.after}
              zoom={zoom}
            />
          )}
        </motion.div>

        {/* Action Buttons */}
        {(onApprove || onReject) && (
          <div className="flex gap-3 pt-2">
            {onReject && (
              <button
                onClick={onReject}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg transition-colors"
              >
                <X size={16} />
                <span className="text-sm font-medium">Reject</span>
              </button>
            )}
            {onApprove && (
              <button
                onClick={onApprove}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 rounded-lg transition-colors"
              >
                <Check size={16} />
                <span className="text-sm font-medium">Approve</span>
              </button>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
});

export { VisualDiffSkeleton };
export default VisualDiffPanel;
