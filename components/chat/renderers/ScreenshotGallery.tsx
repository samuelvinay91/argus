/**
 * ScreenshotGallery - Display test screenshots with lightbox
 *
 * Handles R2 references, URLs, and base64 data.
 */

'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthenticatedImage } from '@/components/ui/authenticated-image';

// =============================================================================
// TYPES
// =============================================================================

interface ArtifactRef {
  artifact_id: string;
  type: string;
  storage: string;
  key?: string;
  url?: string;
}

export interface ScreenshotGalleryProps {
  screenshots: string[];
  label?: string;
  artifactRefs?: ArtifactRef[];
}

// =============================================================================
// URL RESOLVER
// =============================================================================

const WORKER_SCREENSHOT_URL = 'https://argus-api.samuelvinay-kumar.workers.dev/screenshots';

function resolveScreenshotUrl(
  screenshot: string,
  artifactRefs?: ArtifactRef[]
): string {
  if (!screenshot) {
    return '/placeholder-screenshot.svg';
  }

  // Already a data URL
  if (screenshot.startsWith('data:')) {
    return screenshot;
  }

  // HTTP(S) URL
  if (screenshot.startsWith('http://') || screenshot.startsWith('https://')) {
    // Fix broken R2 URLs
    if (screenshot.includes('r2.cloudflarestorage.com')) {
      const match = screenshot.match(/screenshots\/([^.]+)(?:\.png)?$/);
      if (match) {
        return `${WORKER_SCREENSHOT_URL}/${match[1]}`;
      }
    }
    return screenshot;
  }

  // R2 reference ID
  if (screenshot.startsWith('screenshot_')) {
    if (artifactRefs && artifactRefs.length > 0) {
      const ref = artifactRefs.find(r => r.artifact_id === screenshot);
      if (ref?.url && !ref.url.includes('r2.cloudflarestorage.com')) {
        return ref.url;
      }
    }
    return `${WORKER_SCREENSHOT_URL}/${screenshot}`;
  }

  // Assume base64 if long enough
  if (screenshot.length > 100) {
    return `data:image/png;base64,${screenshot}`;
  }

  return '/placeholder-screenshot.svg';
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ScreenshotGallery = memo(function ScreenshotGallery({
  screenshots,
  label,
  artifactRefs,
}: ScreenshotGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!screenshots || screenshots.length === 0) return null;

  const resolvedUrls = screenshots.map(s => resolveScreenshotUrl(s, artifactRefs));

  return (
    <div className="mt-3">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        {label || `Screenshots (${screenshots.length})`}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {resolvedUrls.map((resolvedUrl, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className="relative flex-shrink-0 w-24 h-16 rounded border hover:border-primary transition-colors overflow-hidden"
          >
            <AuthenticatedImage
              src={resolvedUrl}
              alt={`Step ${index + 1}`}
              className="w-full h-full object-cover"
              fallbackSrc="/placeholder-screenshot.svg"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1">
              Step {index + 1}
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox modal */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSelectedIndex(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-[80vh] overflow-hidden rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <AuthenticatedImage
                src={resolvedUrls[selectedIndex]}
                alt={`Step ${selectedIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain"
                fallbackSrc="/placeholder-screenshot.svg"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                {selectedIndex > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedIndex(selectedIndex - 1)}
                  >
                    Previous
                  </Button>
                )}
                {selectedIndex < screenshots.length - 1 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedIndex(selectedIndex + 1)}
                  >
                    Next
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedIndex(null)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded">
                Step {selectedIndex + 1} of {screenshots.length}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default ScreenshotGallery;
