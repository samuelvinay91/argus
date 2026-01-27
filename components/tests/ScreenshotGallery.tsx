'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Download,
  Maximize2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScreenshotLightbox } from './ScreenshotLightbox';

// ============================================================================
// Types
// ============================================================================

export interface Screenshot {
  /** Base64-encoded image data or URL */
  data: string;
  /** Step index (0-based) */
  stepIndex: number;
  /** Step instruction/description */
  instruction?: string;
  /** Whether the step succeeded */
  success?: boolean;
  /** Error message if step failed */
  error?: string;
  /** Timestamp when screenshot was taken */
  timestamp?: string;
  /** Duration of the step in milliseconds */
  duration?: number;
}

export interface ScreenshotGalleryProps {
  /** Array of screenshots from step results */
  screenshots: Screenshot[];
  /** Number of columns in the grid (default: 4) */
  columns?: 2 | 3 | 4;
  /** Whether to show step info overlay on thumbnails */
  showStepInfo?: boolean;
  /** Optional class name for the container */
  className?: string;
  /** Callback when a screenshot is selected */
  onScreenshotSelect?: (index: number) => void;
}

// ============================================================================
// Helper Components
// ============================================================================

interface ThumbnailProps {
  screenshot: Screenshot;
  index: number;
  onClick: () => void;
  showStepInfo: boolean;
}

function Thumbnail({ screenshot, index, onClick, showStepInfo }: ThumbnailProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const imageSrc = useMemo(() => {
    // Handle both base64 and URL formats
    if (screenshot.data.startsWith('data:') || screenshot.data.startsWith('http')) {
      return screenshot.data;
    }
    // Assume base64 PNG if no prefix
    return `data:image/png;base64,${screenshot.data}`;
  }, [screenshot.data]);

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `screenshot-step-${screenshot.stepIndex + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [imageSrc, screenshot.stepIndex]);

  if (imageError) {
    return (
      <div
        className={cn(
          'aspect-video rounded-lg border-2 border-dashed border-muted-foreground/30',
          'flex flex-col items-center justify-center gap-2 bg-muted/30 text-muted-foreground'
        )}
      >
        <AlertCircle className="h-6 w-6 opacity-50" />
        <span className="text-xs">Failed to load</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="group relative"
    >
      <button
        onClick={onClick}
        className={cn(
          'w-full aspect-video rounded-lg overflow-hidden border-2 transition-all duration-200',
          'hover:border-primary hover:shadow-lg hover:scale-[1.02]',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          screenshot.success === false
            ? 'border-red-500/50'
            : screenshot.success === true
            ? 'border-green-500/30'
            : 'border-border'
        )}
      >
        {/* Loading skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}

        {/* Image */}
        <img
          src={imageSrc}
          alt={`Step ${screenshot.stepIndex + 1} screenshot`}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-200',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          loading="lazy"
        />

        {/* Hover overlay */}
        <div
          className={cn(
            'absolute inset-0 bg-black/60 flex items-center justify-center',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
          )}
        >
          <Maximize2 className="h-8 w-8 text-white" />
        </div>

        {/* Step status indicator */}
        {screenshot.success !== undefined && (
          <div
            className={cn(
              'absolute top-2 left-2 rounded-full p-1',
              screenshot.success
                ? 'bg-green-500/90 text-white'
                : 'bg-red-500/90 text-white'
            )}
          >
            {screenshot.success ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
          </div>
        )}

        {/* Step info overlay */}
        {showStepInfo && (
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent',
              'text-white text-xs'
            )}
          >
            <div className="font-medium">Step {screenshot.stepIndex + 1}</div>
            {screenshot.instruction && (
              <div className="truncate opacity-80 text-[10px]">
                {screenshot.instruction}
              </div>
            )}
          </div>
        )}
      </button>

      {/* Download button */}
      <Button
        variant="secondary"
        size="icon"
        className={cn(
          'absolute top-2 right-2 h-7 w-7 shadow-lg',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
        )}
        onClick={handleDownload}
        title="Download screenshot"
      >
        <Download className="h-3.5 w-3.5" />
      </Button>

      {/* Duration badge */}
      {screenshot.duration !== undefined && (
        <div
          className={cn(
            'absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium',
            'bg-black/70 text-white flex items-center gap-1',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
          )}
        >
          <Clock className="h-2.5 w-2.5" />
          {(screenshot.duration / 1000).toFixed(1)}s
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">
        No screenshots available
      </h3>
      <p className="text-xs text-muted-foreground/70 max-w-xs">
        Screenshots will appear here when test steps are executed with screenshot capture enabled.
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ScreenshotGallery({
  screenshots,
  columns = 4,
  showStepInfo = true,
  className,
  onScreenshotSelect,
}: ScreenshotGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter out screenshots with no data
  const validScreenshots = useMemo(
    () => screenshots.filter((s) => s.data && s.data.length > 0),
    [screenshots]
  );

  const handleThumbnailClick = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      setLightboxOpen(true);
      onScreenshotSelect?.(index);
    },
    [onScreenshotSelect]
  );

  const handleLightboxClose = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const handleLightboxNavigate = useCallback((newIndex: number) => {
    setSelectedIndex(newIndex);
    onScreenshotSelect?.(newIndex);
  }, [onScreenshotSelect]);

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  };

  if (validScreenshots.length === 0) {
    return (
      <div className={cn('rounded-lg border bg-card', className)}>
        <EmptyState />
      </div>
    );
  }

  return (
    <>
      <div className={cn('rounded-lg border bg-card p-4', className)}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">
              Screenshots ({validScreenshots.length})
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {validScreenshots.filter((s) => s.success === true).length > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-3 w-3" />
                {validScreenshots.filter((s) => s.success === true).length} passed
              </span>
            )}
            {validScreenshots.filter((s) => s.success === false).length > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="h-3 w-3" />
                {validScreenshots.filter((s) => s.success === false).length} failed
              </span>
            )}
          </div>
        </div>

        {/* Grid */}
        <AnimatePresence mode="popLayout">
          <div className={cn('grid gap-3', gridCols[columns])}>
            {validScreenshots.map((screenshot, index) => (
              <Thumbnail
                key={`${screenshot.stepIndex}-${index}`}
                screenshot={screenshot}
                index={index}
                onClick={() => handleThumbnailClick(index)}
                showStepInfo={showStepInfo}
              />
            ))}
          </div>
        </AnimatePresence>
      </div>

      {/* Lightbox Modal */}
      <ScreenshotLightbox
        screenshots={validScreenshots}
        currentIndex={selectedIndex}
        open={lightboxOpen}
        onClose={handleLightboxClose}
        onNavigate={handleLightboxNavigate}
      />
    </>
  );
}

export default ScreenshotGallery;
