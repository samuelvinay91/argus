'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Screenshot } from './ScreenshotGallery';

// ============================================================================
// Types
// ============================================================================

export interface ScreenshotLightboxProps {
  /** Array of screenshots */
  screenshots: Screenshot[];
  /** Current screenshot index */
  currentIndex: number;
  /** Whether the lightbox is open */
  open: boolean;
  /** Callback when lightbox closes */
  onClose: () => void;
  /** Callback when navigating to a different screenshot */
  onNavigate: (index: number) => void;
}

// ============================================================================
// Constants
// ============================================================================

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const;
const DEFAULT_ZOOM_INDEX = 2; // 100%

// ============================================================================
// Main Component
// ============================================================================

export function ScreenshotLightbox({
  screenshots,
  currentIndex,
  open,
  onClose,
  onNavigate,
}: ScreenshotLightboxProps) {
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentScreenshot = screenshots[currentIndex];
  const zoom = ZOOM_LEVELS[zoomIndex];
  const canZoomIn = zoomIndex < ZOOM_LEVELS.length - 1;
  const canZoomOut = zoomIndex > 0;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < screenshots.length - 1;

  // Generate image source
  const imageSrc = useMemo(() => {
    if (!currentScreenshot?.data) return '';
    if (
      currentScreenshot.data.startsWith('data:') ||
      currentScreenshot.data.startsWith('http')
    ) {
      return currentScreenshot.data;
    }
    return `data:image/png;base64,${currentScreenshot.data}`;
  }, [currentScreenshot?.data]);

  // Reset zoom when changing screenshots
  useEffect(() => {
    setZoomIndex(DEFAULT_ZOOM_INDEX);
    setImageLoaded(false);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (hasPrev) onNavigate(currentIndex - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (hasNext) onNavigate(currentIndex + 1);
          break;
        case 'Escape':
          e.preventDefault();
          if (isFullscreen) {
            document.exitFullscreen?.();
            setIsFullscreen(false);
          } else {
            onClose();
          }
          break;
        case '+':
        case '=':
          e.preventDefault();
          if (canZoomIn) setZoomIndex((prev) => prev + 1);
          break;
        case '-':
        case '_':
          e.preventDefault();
          if (canZoomOut) setZoomIndex((prev) => prev - 1);
          break;
        case '0':
          e.preventDefault();
          setZoomIndex(DEFAULT_ZOOM_INDEX);
          break;
        case 'Home':
          e.preventDefault();
          onNavigate(0);
          break;
        case 'End':
          e.preventDefault();
          onNavigate(screenshots.length - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    open,
    currentIndex,
    hasPrev,
    hasNext,
    canZoomIn,
    canZoomOut,
    isFullscreen,
    screenshots.length,
    onNavigate,
    onClose,
  ]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!imageSrc) return;

    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `screenshot-step-${(currentScreenshot?.stepIndex ?? 0) + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [imageSrc, currentScreenshot?.stepIndex]);

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen not supported or user denied
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    if (canZoomIn) setZoomIndex((prev) => prev + 1);
  }, [canZoomIn]);

  const handleZoomOut = useCallback(() => {
    if (canZoomOut) setZoomIndex((prev) => prev - 1);
  }, [canZoomOut]);

  const handleZoomReset = useCallback(() => {
    setZoomIndex(DEFAULT_ZOOM_INDEX);
  }, []);

  if (!currentScreenshot) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        ref={containerRef}
        className={cn(
          'max-w-[95vw] max-h-[95vh] w-full h-full p-0 gap-0 overflow-hidden',
          'bg-black/95 backdrop-blur-xl border-none',
          isFullscreen && 'max-w-none max-h-none rounded-none'
        )}
      >
        {/* Accessible title for screen readers */}
        <DialogTitle className="sr-only">
          Screenshot {currentIndex + 1} of {screenshots.length}
          {currentScreenshot.instruction && ` - ${currentScreenshot.instruction}`}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Full-size view of test step screenshot. Use arrow keys to navigate between screenshots.
        </DialogDescription>

        {/* Top toolbar */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
          {/* Left: Navigation info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-white">
              <span className="text-sm font-medium">
                Step {currentScreenshot.stepIndex + 1}
              </span>
              {currentScreenshot.success !== undefined && (
                <span
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    currentScreenshot.success
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  )}
                >
                  {currentScreenshot.success ? (
                    <>
                      <CheckCircle className="h-3 w-3" /> Passed
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" /> Failed
                    </>
                  )}
                </span>
              )}
              {currentScreenshot.duration !== undefined && (
                <span className="flex items-center gap-1 text-xs text-white/60">
                  <Clock className="h-3 w-3" />
                  {(currentScreenshot.duration / 1000).toFixed(1)}s
                </span>
              )}
            </div>
            <span className="text-sm text-white/60">
              {currentIndex + 1} of {screenshots.length}
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={handleZoomOut}
                disabled={!canZoomOut}
                title="Zoom Out (-)"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="px-2 text-xs text-white font-mono min-w-[50px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={handleZoomIn}
                disabled={!canZoomIn}
                title="Zoom In (+)"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-white/20 mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={handleZoomReset}
                title="Reset Zoom (0)"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Fullscreen toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>

            {/* Download */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={handleDownload}
              title="Download Screenshot"
            >
              <Download className="h-4 w-4" />
            </Button>

            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={onClose}
              title="Close (ESC)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main image area */}
        <div className="relative w-full h-full flex items-center justify-center overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-center justify-center min-h-full"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            >
              {/* Loading state */}
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                </div>
              )}

              {/* Image */}
              <img
                src={imageSrc}
                alt={`Step ${currentScreenshot.stepIndex + 1} screenshot`}
                className={cn(
                  'max-w-none select-none transition-opacity duration-200',
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                )}
                onLoad={() => setImageLoaded(true)}
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full',
            'bg-black/50 text-white hover:bg-black/70 transition-all',
            !hasPrev && 'opacity-30 cursor-not-allowed'
          )}
          onClick={() => hasPrev && onNavigate(currentIndex - 1)}
          disabled={!hasPrev}
          title="Previous (Left Arrow)"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full',
            'bg-black/50 text-white hover:bg-black/70 transition-all',
            !hasNext && 'opacity-30 cursor-not-allowed'
          )}
          onClick={() => hasNext && onNavigate(currentIndex + 1)}
          disabled={!hasNext}
          title="Next (Right Arrow)"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>

        {/* Bottom info bar */}
        <div className="absolute bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/70 to-transparent">
          <div className="max-w-3xl mx-auto">
            {/* Step instruction */}
            {currentScreenshot.instruction && (
              <p className="text-white text-sm text-center mb-2">
                {currentScreenshot.instruction}
              </p>
            )}

            {/* Error message */}
            {currentScreenshot.error && (
              <div className="flex items-center justify-center gap-2 text-red-400 text-xs mb-2">
                <XCircle className="h-3.5 w-3.5" />
                {currentScreenshot.error}
              </div>
            )}

            {/* Thumbnail strip */}
            {screenshots.length > 1 && (
              <div className="flex items-center justify-center gap-2 mt-3 overflow-x-auto py-2">
                {screenshots.map((screenshot, index) => (
                  <button
                    key={`thumb-${screenshot.stepIndex}-${index}`}
                    onClick={() => onNavigate(index)}
                    className={cn(
                      'relative flex-shrink-0 w-16 h-10 rounded overflow-hidden border-2 transition-all',
                      'hover:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/50',
                      index === currentIndex
                        ? 'border-white ring-2 ring-white/30'
                        : 'border-white/20 opacity-60 hover:opacity-100'
                    )}
                  >
                    <img
                      src={
                        screenshot.data.startsWith('data:') ||
                        screenshot.data.startsWith('http')
                          ? screenshot.data
                          : `data:image/png;base64,${screenshot.data}`
                      }
                      alt={`Step ${screenshot.stepIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {screenshot.success === false && (
                      <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                        <XCircle className="h-3 w-3 text-red-400" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Keyboard shortcuts hint */}
            <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-white/40">
              <span>
                <kbd className="px-1 py-0.5 bg-white/10 rounded">Arrow keys</kbd>{' '}
                Navigate
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-white/10 rounded">+/-</kbd> Zoom
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-white/10 rounded">0</kbd> Reset
                zoom
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-white/10 rounded">ESC</kbd> Close
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ScreenshotLightbox;
