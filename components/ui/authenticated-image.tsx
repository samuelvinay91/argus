'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Loader2, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getSignedScreenshotUrl,
  extractArtifactId,
  resolveScreenshotUrl,
} from '@/lib/screenshot-utils';

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  loading?: 'eager' | 'lazy';
  onLoad?: () => void;
  onError?: (error: Error) => void;
  /**
   * If true, fetch a signed URL from the API for authenticated access.
   * Default: true for artifact IDs and Worker URLs.
   */
  useSignedUrl?: boolean;
}

/**
 * AuthenticatedImage component that renders images with proper authentication.
 *
 * Uses signed URLs for secure, CDN-cacheable image access:
 * 1. Extracts artifact ID from src (if applicable)
 * 2. Fetches signed URL from API (with auth)
 * 3. Renders signed URL directly in <img> tag (CDN cached)
 *
 * For data URLs and external URLs, renders directly without signing.
 *
 * Benefits of signed URLs over blob URLs:
 * - CDN caching works (same signed URL reused across page loads)
 * - Lower memory usage (no blob storage)
 * - Better browser caching
 * - Parallel loading (no auth header blocking)
 */
export function AuthenticatedImage({
  src,
  alt,
  className,
  fallbackSrc = '/placeholder-screenshot.svg',
  loading = 'lazy',
  onLoad,
  onError,
  useSignedUrl = true,
}: AuthenticatedImageProps) {
  const { getToken, isSignedIn } = useAuth();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Determine if the URL should use signed URL access
  const shouldUseSignedUrl = useCallback((url: string): boolean => {
    if (!useSignedUrl) return false;
    // Data URLs don't need signing
    if (url.startsWith('data:')) return false;
    // Placeholder images don't need signing
    if (url.startsWith('/')) return false;
    // Artifact IDs need signing
    if (url.startsWith('screenshot_') || url.startsWith('video_')) return true;
    // Worker URLs need signing (when MEDIA_SIGNING_SECRET is configured)
    if (url.includes('workers.dev/screenshots/')) return true;
    // External URLs don't need signing
    return false;
  }, [useSignedUrl]);

  useEffect(() => {
    let isMounted = true;

    async function resolveImage() {
      if (!src) {
        setImageSrc(fallbackSrc);
        setIsLoading(false);
        return;
      }

      // If the URL doesn't need signed access, use directly
      if (!shouldUseSignedUrl(src)) {
        // Still apply URL transformations (e.g., fix broken R2 URLs)
        setImageSrc(resolveScreenshotUrl(src));
        setIsLoading(false);
        return;
      }

      // Extract artifact ID and fetch signed URL
      try {
        setIsLoading(true);
        setHasError(false);

        const artifactId = extractArtifactId(src);
        if (!artifactId) {
          // Can't extract artifact ID - fall back to resolved URL
          setImageSrc(resolveScreenshotUrl(src));
          setIsLoading(false);
          return;
        }

        const token = await getToken();
        if (!token) {
          console.warn('[AuthenticatedImage] No auth token available, using unsigned URL');
          // Fall back to unsigned URL (will work during public access rollout)
          setImageSrc(resolveScreenshotUrl(src));
          setIsLoading(false);
          return;
        }

        // Fetch signed URL from API
        const signedUrl = await getSignedScreenshotUrl(
          artifactId,
          token,
          process.env.NEXT_PUBLIC_API_URL
        );

        if (isMounted) {
          if (signedUrl) {
            setImageSrc(signedUrl);
          } else {
            // Signed URL fetch failed - fall back to unsigned URL
            console.warn('[AuthenticatedImage] Failed to get signed URL, using unsigned');
            setImageSrc(resolveScreenshotUrl(src));
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[AuthenticatedImage] Error resolving image:', error);
        if (isMounted) {
          // Fall back to resolved URL on error
          setImageSrc(resolveScreenshotUrl(src));
          setHasError(true);
          setIsLoading(false);
          onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    resolveImage();

    return () => {
      isMounted = false;
    };
  }, [src, fallbackSrc, getToken, shouldUseSignedUrl, onError]);

  // Handle image load
  const handleLoad = useCallback(() => {
    onLoad?.();
  }, [onLoad]);

  // Handle image error (for direct URLs that fail)
  const handleError = useCallback(() => {
    setImageSrc(fallbackSrc);
    setHasError(true);
    onError?.(new Error('Image failed to load'));
  }, [fallbackSrc, onError]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center bg-muted', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasError && !imageSrc) {
    return (
      <div className={cn('flex items-center justify-center bg-muted', className)}>
        <ImageOff className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSrc || fallbackSrc}
      alt={alt}
      className={className}
      loading={loading}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
