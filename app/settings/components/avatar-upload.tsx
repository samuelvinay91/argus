'use client';

import { useRef, useState, useCallback } from 'react';
import { Camera, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  /** Current avatar URL */
  avatarUrl?: string | null;
  /** Display name for initials fallback */
  displayName?: string;
  /** Size of the avatar (default: 96) */
  size?: number;
  /** Callback when avatar is uploaded successfully */
  onUploadSuccess?: (avatarUrl: string) => void;
  /** Callback when upload fails */
  onUploadError?: (error: string) => void;
  /** Upload function that handles the file upload */
  onUpload: (file: File) => Promise<{ avatarUrl: string }>;
  /** Whether upload is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Get initials from a display name
 */
function getInitials(name: string | undefined): string {
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
}

/**
 * Validate a file for avatar upload
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 5MB.',
    };
  }

  return { valid: true };
}

/**
 * Avatar Upload Component
 *
 * A reusable component for uploading user avatars with:
 * - Hidden file input triggered by camera button
 * - File type and size validation
 * - Upload progress/loading state
 * - Current avatar display with initials fallback
 */
export function AvatarUpload({
  avatarUrl,
  displayName,
  size = 96,
  onUploadSuccess,
  onUploadError,
  onUpload,
  disabled = false,
  className,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Clear success/error state after timeout
  const clearStatus = useCallback(() => {
    setTimeout(() => {
      setUploadSuccess(false);
      setError(null);
    }, 3000);
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setError(null);
    setUploadSuccess(false);
    setPreviewUrl(null);

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      onUploadError?.(validation.error || 'Invalid file');
      clearStatus();
      return;
    }

    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload file
    setIsUploading(true);

    try {
      const result = await onUpload(file);

      setUploadSuccess(true);
      onUploadSuccess?.(result.avatarUrl);

      // Clean up preview URL after successful upload
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);

      clearStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onUploadError?.(errorMessage);

      // Revert preview on error
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);

      clearStatus();
    } finally {
      setIsUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onUpload, onUploadSuccess, onUploadError, clearStatus]);

  // Trigger file input click
  const handleButtonClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  // Determine which image to show
  const displayUrl = previewUrl || avatarUrl;
  const initials = getInitials(displayName);

  return (
    <div className={cn('relative inline-block', className)}>
      {/* Avatar Display */}
      <div
        className={cn(
          'relative rounded-full overflow-hidden',
          isUploading && 'opacity-50'
        )}
        style={{ width: size, height: size }}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={displayName || 'Avatar'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold"
            style={{ fontSize: size * 0.3 }}
          >
            {initials}
          </div>
        )}

        {/* Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Camera Button */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        className={cn(
          'absolute bottom-0 right-0 p-2 rounded-full bg-background border shadow-sm transition-colors',
          'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          (disabled || isUploading) && 'opacity-50 cursor-not-allowed',
          uploadSuccess && 'bg-green-50 border-green-500',
          error && 'bg-red-50 border-red-500'
        )}
        aria-label="Change avatar"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : uploadSuccess ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : error ? (
          <AlertCircle className="h-4 w-4 text-red-500" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
        aria-hidden="true"
      />

      {/* Error Message */}
      {error && (
        <div className="absolute -bottom-6 left-0 right-0 text-center">
          <span className="text-xs text-red-500">{error}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Avatar Upload with Upload Photo Button
 *
 * Extended version that includes an "Upload Photo" button below the avatar.
 */
export function AvatarUploadWithButton({
  avatarUrl,
  displayName,
  size = 96,
  onUploadSuccess,
  onUploadError,
  onUpload,
  disabled = false,
  className,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const clearStatus = useCallback(() => {
    setTimeout(() => {
      setUploadSuccess(false);
      setError(null);
    }, 3000);
  }, []);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadSuccess(false);
    setPreviewUrl(null);

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      onUploadError?.(validation.error || 'Invalid file');
      clearStatus();
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setIsUploading(true);

    try {
      const result = await onUpload(file);

      setUploadSuccess(true);
      onUploadSuccess?.(result.avatarUrl);

      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);

      clearStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onUploadError?.(errorMessage);

      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);

      clearStatus();
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onUpload, onUploadSuccess, onUploadError, clearStatus]);

  const handleButtonClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const displayUrl = previewUrl || avatarUrl;
  const initials = getInitials(displayName);

  return (
    <div className={cn('flex items-center gap-6', className)}>
      {/* Avatar */}
      <div className="relative">
        <div
          className={cn(
            'relative rounded-full overflow-hidden',
            isUploading && 'opacity-50'
          )}
          style={{ width: size, height: size }}
        >
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={displayName || 'Avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold"
              style={{ fontSize: size * 0.3 }}
            >
              {initials}
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Camera Button */}
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={disabled || isUploading}
          className={cn(
            'absolute bottom-0 right-0 p-2 rounded-full bg-background border shadow-sm transition-colors',
            'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            (disabled || isUploading) && 'opacity-50 cursor-not-allowed',
            uploadSuccess && 'bg-green-50 border-green-500',
            error && 'bg-red-50 border-red-500'
          )}
          aria-label="Change avatar"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : uploadSuccess ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : error ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Info and Button */}
      <div>
        <h3 className="font-medium">{displayName || 'Your Name'}</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Upload a photo (max 5MB)
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleButtonClick}
          disabled={disabled || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : uploadSuccess ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              Uploaded!
            </>
          ) : (
            'Upload Photo'
          )}
        </Button>

        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}

export default AvatarUpload;
