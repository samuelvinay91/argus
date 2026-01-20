/**
 * Screenshot URL utility functions.
 *
 * Handles transformation of various screenshot URL formats to ensure they're accessible:
 * - Signed URLs (authenticated) -> Fetched from API
 * - Broken R2 URLs -> Worker proxy URLs
 * - Artifact IDs -> Worker proxy URLs or signed URLs
 * - Base64 data -> Data URLs
 * - Valid URLs -> Pass through
 */

// Worker URL for screenshot access
export const WORKER_SCREENSHOT_URL = 'https://argus-api.samuelvinay-kumar.workers.dev/screenshots';

// Cache for signed URLs (artifact_id -> { url, expiresAt })
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

// Cache TTL buffer - refresh URL 60 seconds before expiry
const CACHE_TTL_BUFFER_MS = 60 * 1000;

/**
 * Signed URL response from the API.
 */
interface SignedUrlResponse {
  artifact_id: string;
  url: string;
  expires_in: number;
  url_type: 'signed' | 'presigned';
}

/**
 * Fetch a signed URL for an artifact from the API.
 * Caches results to avoid excessive API calls.
 *
 * @param artifactId - The artifact ID (e.g., screenshot_xxx_yyy)
 * @param token - JWT authentication token
 * @param apiUrl - Base API URL (defaults to NEXT_PUBLIC_API_URL)
 * @returns Signed URL or null if failed
 */
export async function getSignedScreenshotUrl(
  artifactId: string,
  token: string,
  apiUrl?: string
): Promise<string | null> {
  // Check cache first
  const cached = signedUrlCache.get(artifactId);
  if (cached && cached.expiresAt > Date.now() + CACHE_TTL_BUFFER_MS) {
    return cached.url;
  }

  // Fetch from API
  const baseUrl = apiUrl || process.env.NEXT_PUBLIC_API_URL || '';
  if (!baseUrl) {
    console.warn('[getSignedScreenshotUrl] No API URL configured');
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}/api/v1/artifacts/${artifactId}/url`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`[getSignedScreenshotUrl] Failed to fetch signed URL: ${response.status}`);
      return null;
    }

    const data: SignedUrlResponse = await response.json();

    // Cache the result
    signedUrlCache.set(artifactId, {
      url: data.url,
      expiresAt: Date.now() + data.expires_in * 1000,
    });

    return data.url;
  } catch (error) {
    console.error('[getSignedScreenshotUrl] Error fetching signed URL:', error);
    return null;
  }
}

/**
 * Batch fetch signed URLs for multiple artifacts.
 * More efficient than individual requests when loading many screenshots.
 *
 * @param artifactIds - Array of artifact IDs
 * @param token - JWT authentication token
 * @param apiUrl - Base API URL
 * @returns Map of artifact_id -> signed_url
 */
export async function getSignedScreenshotUrls(
  artifactIds: string[],
  token: string,
  apiUrl?: string
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Separate cached and uncached
  const uncachedIds: string[] = [];

  for (const id of artifactIds) {
    const cached = signedUrlCache.get(id);
    if (cached && cached.expiresAt > Date.now() + CACHE_TTL_BUFFER_MS) {
      results.set(id, cached.url);
    } else {
      uncachedIds.push(id);
    }
  }

  // Fetch uncached URLs in parallel (limit concurrency)
  const batchSize = 5;
  for (let i = 0; i < uncachedIds.length; i += batchSize) {
    const batch = uncachedIds.slice(i, i + batchSize);
    const promises = batch.map((id) => getSignedScreenshotUrl(id, token, apiUrl));
    const urls = await Promise.all(promises);

    batch.forEach((id, index) => {
      const url = urls[index];
      if (url) {
        results.set(id, url);
      }
    });
  }

  return results;
}

/**
 * Clear the signed URL cache.
 * Call this when the user logs out or token changes.
 */
export function clearSignedUrlCache(): void {
  signedUrlCache.clear();
}

/**
 * Extract artifact ID from various URL formats.
 *
 * @param url - Screenshot URL or artifact ID
 * @returns Artifact ID or null if not extractable
 */
export function extractArtifactId(url: string): string | null {
  if (!url) return null;

  // Already an artifact ID
  if (url.startsWith('screenshot_') || url.startsWith('video_')) {
    return url;
  }

  // Extract from Worker URL
  const workerMatch = url.match(/\/screenshots\/([^?]+)/);
  if (workerMatch) {
    return workerMatch[1];
  }

  // Extract from R2 URL
  const r2Match = url.match(/screenshots\/([^.]+)(?:\.png)?$/);
  if (r2Match) {
    return r2Match[1];
  }

  return null;
}

/**
 * Transform a screenshot URL/reference to an accessible URL.
 *
 * NOTE: This is the synchronous fallback. For authenticated access,
 * use getSignedScreenshotUrl() instead.
 *
 * Handles:
 * - data: URLs (pass through)
 * - Valid HTTPS URLs (pass through, unless broken R2 URLs)
 * - Broken R2 URLs (transform to Worker proxy)
 * - Artifact IDs (screenshot_xxx format) (transform to Worker proxy)
 * - Raw base64 data (convert to data URL)
 */
export function resolveScreenshotUrl(src: string | null | undefined): string {
  if (!src) {
    return '/placeholder-screenshot.svg';
  }

  // Already a data URL - use directly
  if (src.startsWith('data:')) {
    return src;
  }

  // HTTP(S) URL - check for broken R2 URLs and transform
  if (src.startsWith('http://') || src.startsWith('https://')) {
    // Fix broken R2 URLs by routing through Worker proxy
    // Old format: https://argus-artifacts.r2.cloudflarestorage.com/screenshots/screenshot_xxx.png
    // New format: https://argus-api.samuelvinay-kumar.workers.dev/screenshots/screenshot_xxx
    if (src.includes('r2.cloudflarestorage.com')) {
      const match = src.match(/screenshots\/([^.]+)(?:\.png)?$/);
      if (match) {
        return `${WORKER_SCREENSHOT_URL}/${match[1]}`;
      }
    }
    return src;
  }

  // Artifact ID (format: screenshot_xxx_yyyymmdd_hhmmss)
  if (src.startsWith('screenshot_')) {
    return `${WORKER_SCREENSHOT_URL}/${src}`;
  }

  // Assume it's base64 data - only if it's long enough to be valid base64
  if (src.length > 100) {
    return `data:image/png;base64,${src}`;
  }

  // Short string that's not a valid reference - likely an error
  console.warn(`[resolveScreenshotUrl] Invalid screenshot value: ${src.substring(0, 50)}...`);
  return '/placeholder-screenshot.svg';
}
