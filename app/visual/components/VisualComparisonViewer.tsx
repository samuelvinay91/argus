'use client';

import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Columns2,
  Layers,
  SlidersHorizontal,
  Diff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Info,
  AlertCircle,
  Check,
  X,
  Crosshair,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ============================================================================
// Types
// ============================================================================

export interface VisualChange {
  id: string;
  type: 'added' | 'removed' | 'modified';
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  severity: 'low' | 'medium' | 'high';
  description?: string;
  pixelDifference?: number;
}

export interface VisualComparisonViewerProps {
  baselineScreenshot: string;
  currentScreenshot: string;
  diffImageUrl?: string;
  changes?: VisualChange[];
  onChangeSelect?: (changeId: string) => void;
  className?: string;
}

type ViewMode = 'side-by-side' | 'overlay' | 'slider' | 'diff-only';

interface ZoomLevel {
  value: number;
  label: string;
}

const ZOOM_LEVELS: ZoomLevel[] = [
  { value: 0.5, label: '50%' },
  { value: 0.75, label: '75%' },
  { value: 1, label: '100%' },
  { value: 1.5, label: '150%' },
  { value: 2, label: '200%' },
];

const VIEW_MODE_CONFIG = {
  'side-by-side': { icon: Columns2, label: 'Side by Side', shortcut: '1' },
  'overlay': { icon: Layers, label: 'Overlay', shortcut: '2' },
  'slider': { icon: SlidersHorizontal, label: 'Slider', shortcut: '3' },
  'diff-only': { icon: Diff, label: 'Diff Only', shortcut: '4' },
} as const;

// ============================================================================
// Helper Components
// ============================================================================

interface ViewModeButtonProps {
  mode: ViewMode;
  isActive: boolean;
  onClick: () => void;
}

const ViewModeButton = memo(function ViewModeButton({
  mode,
  isActive,
  onClick,
}: ViewModeButtonProps) {
  const config = VIEW_MODE_CONFIG[mode];
  const Icon = config.icon;

  return (
    <Button
      variant={isActive ? 'default' : 'ghost'}
      size="sm"
      onClick={onClick}
      className={cn(
        'gap-2 transition-all duration-200',
        isActive && 'shadow-sm'
      )}
      title={`${config.label} (${config.shortcut})`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{config.label}</span>
      <kbd className="hidden lg:inline-flex ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-background/50 rounded border">
        {config.shortcut}
      </kbd>
    </Button>
  );
});

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onZoomChange: (zoom: number) => void;
}

const ZoomControls = memo(function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onZoomChange,
}: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onZoomOut}
        disabled={zoom <= ZOOM_LEVELS[0].value}
        title="Zoom Out (-)"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>

      <select
        value={zoom}
        onChange={(e) => onZoomChange(parseFloat(e.target.value))}
        className="h-8 px-2 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer"
        title="Zoom Level"
      >
        {ZOOM_LEVELS.map((level) => (
          <option key={level.value} value={level.value}>
            {level.label}
          </option>
        ))}
      </select>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onZoomIn}
        disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1].value}
        title="Zoom In (+)"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onReset}
        title="Reset View (R)"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
});

interface ChangeRegionProps {
  change: VisualChange;
  isSelected: boolean;
  zoom: number;
  onClick: () => void;
}

const ChangeRegion = memo(function ChangeRegion({
  change,
  isSelected,
  zoom,
  onClick,
}: ChangeRegionProps) {
  const severityColors = {
    low: 'border-yellow-500/70 bg-yellow-500/10',
    medium: 'border-orange-500/70 bg-orange-500/10',
    high: 'border-red-500/70 bg-red-500/10',
  };

  const typeIcons = {
    added: <span className="text-green-500 font-bold">+</span>,
    removed: <span className="text-red-500 font-bold">-</span>,
    modified: <span className="text-orange-500 font-bold">~</span>,
  };

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      style={{
        left: change.bounds.x * zoom,
        top: change.bounds.y * zoom,
        width: change.bounds.width * zoom,
        height: change.bounds.height * zoom,
      }}
      className={cn(
        'absolute border-2 rounded-sm cursor-pointer transition-all duration-200',
        'hover:shadow-lg',
        severityColors[change.severity],
        isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
      title={change.description || `${change.type} change`}
    >
      <div className="absolute -top-6 left-0 flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-background border rounded shadow-sm">
        {typeIcons[change.type]}
        <span className="capitalize">{change.type}</span>
      </div>
    </motion.button>
  );
});

interface ChangeListProps {
  changes: VisualChange[];
  selectedChangeId: string | null;
  onSelect: (changeId: string) => void;
}

const ChangeList = memo(function ChangeList({
  changes,
  selectedChangeId,
  onSelect,
}: ChangeListProps) {
  const groupedChanges = useMemo(() => {
    return {
      high: changes.filter((c) => c.severity === 'high'),
      medium: changes.filter((c) => c.severity === 'medium'),
      low: changes.filter((c) => c.severity === 'low'),
    };
  }, [changes]);

  if (changes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Check className="h-8 w-8 text-green-500 mb-2" />
        <p className="text-sm font-medium">No changes detected</p>
        <p className="text-xs text-muted-foreground">
          Screenshots match perfectly
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Changes ({changes.length})</h3>
        <div className="flex gap-1">
          {groupedChanges.high.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-500 rounded">
              {groupedChanges.high.length} critical
            </span>
          )}
          {groupedChanges.medium.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-500/10 text-orange-500 rounded">
              {groupedChanges.medium.length} medium
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        {changes.map((change, index) => (
          <motion.button
            key={change.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect(change.id)}
            className={cn(
              'w-full text-left p-2 rounded-lg border transition-all duration-200',
              'hover:bg-accent hover:border-accent-foreground/20',
              selectedChangeId === change.id
                ? 'bg-primary/10 border-primary/30'
                : 'bg-card border-border'
            )}
          >
            <div className="flex items-start gap-2">
              <div
                className={cn(
                  'mt-0.5 p-1 rounded',
                  change.severity === 'high' && 'bg-red-500/10 text-red-500',
                  change.severity === 'medium' && 'bg-orange-500/10 text-orange-500',
                  change.severity === 'low' && 'bg-yellow-500/10 text-yellow-500'
                )}
              >
                <AlertCircle className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium capitalize">{change.type}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {change.description || `Region at (${change.bounds.x}, ${change.bounds.y})`}
                </p>
                {change.pixelDifference !== undefined && (
                  <p className="text-[10px] text-muted-foreground">
                    {change.pixelDifference.toLocaleString()} pixels changed
                  </p>
                )}
              </div>
              <Crosshair className="h-3 w-3 text-muted-foreground" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
});

// ============================================================================
// View Mode Components
// ============================================================================

interface SideBySideViewProps {
  baselineUrl: string;
  currentUrl: string;
  zoom: number;
  pan: { x: number; y: number };
  changes: VisualChange[];
  selectedChangeId: string | null;
  onChangeClick: (changeId: string) => void;
}

const SideBySideView = memo(function SideBySideView({
  baselineUrl,
  currentUrl,
  zoom,
  pan,
  changes,
  selectedChangeId,
  onChangeClick,
}: SideBySideViewProps) {
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div className="relative overflow-hidden rounded-lg border bg-muted/20">
        <div className="absolute top-2 left-2 z-10 px-2 py-1 text-xs font-medium bg-background/90 backdrop-blur-sm rounded border">
          Baseline
        </div>
        <div
          className="absolute inset-0 overflow-auto"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          <motion.img
            src={baselineUrl}
            alt="Baseline screenshot"
            className="max-w-none origin-top-left"
            style={{ transform: `scale(${zoom})` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            draggable={false}
          />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg border bg-muted/20">
        <div className="absolute top-2 left-2 z-10 px-2 py-1 text-xs font-medium bg-background/90 backdrop-blur-sm rounded border">
          Current
        </div>
        <div
          className="absolute inset-0 overflow-auto"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          <div className="relative">
            <motion.img
              src={currentUrl}
              alt="Current screenshot"
              className="max-w-none origin-top-left"
              style={{ transform: `scale(${zoom})` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              draggable={false}
            />
            <AnimatePresence>
              {changes.map((change) => (
                <ChangeRegion
                  key={change.id}
                  change={change}
                  isSelected={selectedChangeId === change.id}
                  zoom={zoom}
                  onClick={() => onChangeClick(change.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
});

interface OverlayViewProps {
  baselineUrl: string;
  currentUrl: string;
  diffUrl?: string;
  zoom: number;
  pan: { x: number; y: number };
  changes: VisualChange[];
  selectedChangeId: string | null;
  onChangeClick: (changeId: string) => void;
}

const OverlayView = memo(function OverlayView({
  baselineUrl,
  currentUrl,
  diffUrl,
  zoom,
  pan,
  changes,
  selectedChangeId,
  onChangeClick,
}: OverlayViewProps) {
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);

  return (
    <div className="relative h-full">
      <div className="absolute top-2 right-2 z-20 flex items-center gap-2 px-3 py-2 bg-background/90 backdrop-blur-sm rounded-lg border">
        <span className="text-xs text-muted-foreground">Overlay:</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={overlayOpacity}
          onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
          className="w-24 h-1 accent-primary cursor-pointer"
        />
        <span className="text-xs font-mono w-8">{Math.round(overlayOpacity * 100)}%</span>
      </div>

      <div className="relative overflow-hidden rounded-lg border bg-muted/20 h-full">
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          <div className="relative">
            {/* Baseline layer */}
            <motion.img
              src={baselineUrl}
              alt="Baseline screenshot"
              className="max-w-none origin-top-left"
              style={{ transform: `scale(${zoom})` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              draggable={false}
            />

            {/* Current layer with overlay */}
            <motion.img
              src={currentUrl}
              alt="Current screenshot"
              className="absolute inset-0 max-w-none origin-top-left"
              style={{
                transform: `scale(${zoom})`,
                opacity: overlayOpacity,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: overlayOpacity }}
              transition={{ duration: 0.2 }}
              draggable={false}
            />

            {/* Diff overlay if available */}
            {diffUrl && (
              <motion.img
                src={diffUrl}
                alt="Diff heatmap"
                className="absolute inset-0 max-w-none origin-top-left mix-blend-multiply"
                style={{
                  transform: `scale(${zoom})`,
                  opacity: 0.6,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                draggable={false}
              />
            )}

            {/* Change regions */}
            <AnimatePresence>
              {changes.map((change) => (
                <ChangeRegion
                  key={change.id}
                  change={change}
                  isSelected={selectedChangeId === change.id}
                  zoom={zoom}
                  onClick={() => onChangeClick(change.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
});

interface SliderViewProps {
  baselineUrl: string;
  currentUrl: string;
  zoom: number;
  pan: { x: number; y: number };
}

const SliderView = memo(function SliderView({
  baselineUrl,
  currentUrl,
  zoom,
  pan,
}: SliderViewProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg border bg-muted/20 h-full cursor-col-resize select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Labels */}
      <div className="absolute top-2 left-2 z-10 px-2 py-1 text-xs font-medium bg-background/90 backdrop-blur-sm rounded border">
        Baseline
      </div>
      <div className="absolute top-2 right-2 z-10 px-2 py-1 text-xs font-medium bg-background/90 backdrop-blur-sm rounded border">
        Current
      </div>

      {/* Current image (full) */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        <motion.img
          src={currentUrl}
          alt="Current screenshot"
          className="max-w-none origin-top-left"
          style={{ transform: `scale(${zoom})` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          draggable={false}
        />
      </div>

      {/* Baseline image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
          transform: `translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        <motion.img
          src={baselineUrl}
          alt="Baseline screenshot"
          className="max-w-none origin-top-left"
          style={{ transform: `scale(${zoom})` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          draggable={false}
        />
      </div>

      {/* Slider handle */}
      <motion.div
        className="absolute top-0 bottom-0 w-1 bg-primary shadow-lg cursor-col-resize z-20"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        onMouseDown={handleMouseDown}
        whileHover={{ scaleX: 2 }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
          <div className="flex gap-0.5">
            <ChevronLeft className="h-3 w-3 text-primary-foreground" />
            <ChevronRight className="h-3 w-3 text-primary-foreground" />
          </div>
        </div>
      </motion.div>
    </div>
  );
});

interface DiffOnlyViewProps {
  diffUrl?: string;
  currentUrl: string;
  zoom: number;
  pan: { x: number; y: number };
  changes: VisualChange[];
  selectedChangeId: string | null;
  onChangeClick: (changeId: string) => void;
}

const DiffOnlyView = memo(function DiffOnlyView({
  diffUrl,
  currentUrl,
  zoom,
  pan,
  changes,
  selectedChangeId,
  onChangeClick,
}: DiffOnlyViewProps) {
  if (!diffUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Info className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">No diff image available</p>
        <p className="text-xs mt-1">
          A diff image highlights exact pixel differences between screenshots
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border bg-muted/20 h-full">
      <div className="absolute top-2 left-2 z-10 px-2 py-1 text-xs font-medium bg-background/90 backdrop-blur-sm rounded border">
        Difference Heatmap
      </div>

      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        <div className="relative">
          {/* Base current image faded */}
          <motion.img
            src={currentUrl}
            alt="Current screenshot"
            className="max-w-none origin-top-left opacity-30"
            style={{ transform: `scale(${zoom})` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ duration: 0.3 }}
            draggable={false}
          />

          {/* Diff overlay */}
          <motion.img
            src={diffUrl}
            alt="Diff heatmap"
            className="absolute inset-0 max-w-none origin-top-left"
            style={{ transform: `scale(${zoom})` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            draggable={false}
          />

          {/* Change regions */}
          <AnimatePresence>
            {changes.map((change) => (
              <ChangeRegion
                key={change.id}
                change={change}
                isSelected={selectedChangeId === change.id}
                zoom={zoom}
                onClick={() => onChangeClick(change.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export function VisualComparisonViewer({
  baselineScreenshot,
  currentScreenshot,
  diffImageUrl,
  changes = [],
  onChangeSelect,
  className,
}: VisualComparisonViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [showChangeList, setShowChangeList] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastPanPosition = useRef({ x: 0, y: 0 });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case '1':
          setViewMode('side-by-side');
          break;
        case '2':
          setViewMode('overlay');
          break;
        case '3':
          setViewMode('slider');
          break;
        case '4':
          setViewMode('diff-only');
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
        case '_':
          handleZoomOut();
          break;
        case 'r':
        case 'R':
          handleReset();
          break;
        case 'ArrowLeft':
          if (zoom > 1) {
            e.preventDefault();
            setPan((prev) => ({ ...prev, x: prev.x + 50 }));
          }
          break;
        case 'ArrowRight':
          if (zoom > 1) {
            e.preventDefault();
            setPan((prev) => ({ ...prev, x: prev.x - 50 }));
          }
          break;
        case 'ArrowUp':
          if (zoom > 1) {
            e.preventDefault();
            setPan((prev) => ({ ...prev, y: prev.y + 50 }));
          }
          break;
        case 'ArrowDown':
          if (zoom > 1) {
            e.preventDefault();
            setPan((prev) => ({ ...prev, y: prev.y - 50 }));
          }
          break;
        case 'Escape':
          setSelectedChangeId(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom]);

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1 && e.button === 0) {
        setIsPanning(true);
        lastPanPosition.current = { x: e.clientX, y: e.clientY };
      }
    },
    [zoom]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - lastPanPosition.current.x;
        const dy = e.clientY - lastPanPosition.current.y;
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        lastPanPosition.current = { x: e.clientX, y: e.clientY };
      }
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => {
      const currentIndex = ZOOM_LEVELS.findIndex((l) => l.value >= prev);
      const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1);
      return ZOOM_LEVELS[nextIndex].value;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const currentIndex = ZOOM_LEVELS.findIndex((l) => l.value >= prev);
      const prevIndex = Math.max(currentIndex - 1, 0);
      return ZOOM_LEVELS[prevIndex].value;
    });
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedChangeId(null);
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
    if (newZoom <= 1) {
      setPan({ x: 0, y: 0 });
    }
  }, []);

  // Change selection handler
  const handleChangeClick = useCallback(
    (changeId: string) => {
      setSelectedChangeId(changeId);
      onChangeSelect?.(changeId);

      // Zoom and pan to the selected change
      const change = changes.find((c) => c.id === changeId);
      if (change && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();

        // Calculate the center position of the change
        const changeCenterX = change.bounds.x + change.bounds.width / 2;
        const changeCenterY = change.bounds.y + change.bounds.height / 2;

        // Calculate the pan needed to center the change
        const targetZoom = Math.max(1.5, zoom);
        const panX =
          containerRect.width / 2 - changeCenterX * targetZoom;
        const panY =
          containerRect.height / 2 - changeCenterY * targetZoom;

        setZoom(targetZoom);
        setPan({ x: panX, y: panY });
      }
    },
    [changes, onChangeSelect, zoom]
  );

  // Render current view based on mode
  const renderView = () => {
    const viewProps = {
      baselineUrl: baselineScreenshot,
      currentUrl: currentScreenshot,
      diffUrl: diffImageUrl,
      zoom,
      pan,
      changes,
      selectedChangeId,
      onChangeClick: handleChangeClick,
    };

    switch (viewMode) {
      case 'side-by-side':
        return <SideBySideView {...viewProps} />;
      case 'overlay':
        return <OverlayView {...viewProps} />;
      case 'slider':
        return <SliderView {...viewProps} />;
      case 'diff-only':
        return <DiffOnlyView {...viewProps} />;
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background rounded-xl border overflow-hidden',
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {(Object.keys(VIEW_MODE_CONFIG) as ViewMode[]).map((mode) => (
            <ViewModeButton
              key={mode}
              mode={mode}
              isActive={viewMode === mode}
              onClick={() => setViewMode(mode)}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ZoomControls
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleReset}
            onZoomChange={handleZoomChange}
          />

          {changes.length > 0 && (
            <>
              <div className="w-px h-5 bg-border" />
              <Button
                variant={showChangeList ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShowChangeList(!showChangeList)}
                className="gap-2"
              >
                <AlertCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Changes</span>
                <span className="px-1.5 py-0.5 text-xs bg-background/50 rounded">
                  {changes.length}
                </span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Pan indicator */}
      {zoom > 1 && (
        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-3 py-2 text-xs bg-background/90 backdrop-blur-sm rounded-lg border shadow-sm">
          <Move className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Drag to pan or use arrow keys
          </span>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Viewer area */}
        <div
          ref={containerRef}
          className={cn(
            'flex-1 relative overflow-hidden p-4',
            zoom > 1 && 'cursor-grab',
            isPanning && 'cursor-grabbing'
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Change list sidebar */}
        <AnimatePresence>
          {showChangeList && changes.length > 0 && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l bg-card overflow-hidden"
            >
              <ChangeList
                changes={changes}
                selectedChangeId={selectedChangeId}
                onSelect={handleChangeClick}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="flex items-center justify-center gap-4 p-2 border-t bg-muted/20 text-[10px] text-muted-foreground">
        <span>
          <kbd className="px-1 py-0.5 bg-muted rounded border">1-4</kbd> View modes
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-muted rounded border">+/-</kbd> Zoom
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-muted rounded border">Arrows</kbd> Pan
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-muted rounded border">R</kbd> Reset
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-muted rounded border">Esc</kbd> Deselect
        </span>
      </div>
    </div>
  );
}

export default VisualComparisonViewer;
