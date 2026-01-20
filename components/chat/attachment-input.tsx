'use client';

/**
 * Attachment Input Component
 *
 * Enables file and image attachments in the chat interface.
 * Uses Vercel AI SDK's experimental_attachments feature for
 * seamless integration with Claude's vision capabilities.
 *
 * Supported:
 * - Images: PNG, JPEG, GIF, WebP
 * - Documents: PDF, TXT, Markdown
 * - Drag and drop
 * - Paste from clipboard
 */

import {
  useState,
  useCallback,
  useRef,
  memo,
  useEffect,
  DragEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Paperclip,
  X,
  Image as ImageIcon,
  FileText,
  File,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Attachment types supported by Vercel AI SDK
export interface Attachment {
  name: string;
  contentType: string;
  url: string; // Data URL for the file content
}

// Accepted file types
const ACCEPTED_TYPES = {
  images: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
  documents: ['application/pdf', 'text/plain', 'text/markdown'],
};

const ALL_ACCEPTED = [...ACCEPTED_TYPES.images, ...ACCEPTED_TYPES.documents];
const ACCEPT_STRING = ALL_ACCEPTED.join(',');

// Max file size (4MB for images, 10MB for documents)
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

// Get file icon based on type
function getFileIcon(contentType: string) {
  if (contentType.startsWith('image/')) {
    return ImageIcon;
  }
  if (contentType === 'application/pdf') {
    return FileText;
  }
  return File;
}

// Convert File to Attachment (data URL)
async function fileToAttachment(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        contentType: file.type,
        url: reader.result as string,
      });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Validate file
function validateFile(file: File): string | null {
  if (!ALL_ACCEPTED.includes(file.type)) {
    return `Unsupported file type: ${file.type}`;
  }

  const maxSize = file.type.startsWith('image/') ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;
  if (file.size > maxSize) {
    const maxMB = maxSize / 1024 / 1024;
    return `File too large. Maximum size is ${maxMB}MB`;
  }

  return null;
}

export interface AttachmentInputProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  maxAttachments?: number;
  disabled?: boolean;
  className?: string;
}

// Attachment preview thumbnail
const AttachmentPreview = memo(function AttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  const Icon = getFileIcon(attachment.contentType);
  const isImage = attachment.contentType.startsWith('image/');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="relative group"
    >
      <div className="w-16 h-16 rounded-lg border bg-muted overflow-hidden">
        {isImage ? (
          <img
            src={attachment.url}
            alt={attachment.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-1">
            <Icon className="h-6 w-6 text-muted-foreground" />
            <span className="text-[8px] text-muted-foreground truncate w-full text-center mt-1">
              {attachment.name.slice(-8)}
            </span>
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>

      {/* File name tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-popover border text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap max-w-[150px] truncate">
        {attachment.name}
      </div>
    </motion.div>
  );
});

export const AttachmentInput = memo(function AttachmentInput({
  attachments,
  onAttachmentsChange,
  maxAttachments = 5,
  disabled = false,
  className,
}: AttachmentInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Handle file selection
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    const remainingSlots = maxAttachments - attachments.length;

    if (fileArray.length > remainingSlots) {
      setError(`Can only add ${remainingSlots} more file(s)`);
      return;
    }

    const newAttachments: Attachment[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
        continue;
      }

      try {
        const attachment = await fileToAttachment(file);
        newAttachments.push(attachment);
      } catch (err) {
        errors.push(`${file.name}: Failed to process`);
      }
    }

    if (errors.length > 0) {
      setError(errors[0]);
    }

    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments]);
    }
  }, [attachments, maxAttachments, disabled, onAttachmentsChange]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  }, [handleFiles]);

  // Handle drag events
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const { files } = e.dataTransfer;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, handleFiles]);

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (disabled) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        handleFiles(files);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [disabled, handleFiles]);

  // Remove attachment
  const handleRemove = useCallback((index: number) => {
    const updated = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(updated);
  }, [attachments, onAttachmentsChange]);

  // Clear error after delay
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const canAddMore = attachments.length < maxAttachments;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        multiple
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || !canAddMore}
      />

      {/* Drop zone (shown when dragging or no attachments) */}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-lg border-2 border-dashed transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted hover:border-muted-foreground/50',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        {/* Attachments preview grid */}
        {attachments.length > 0 && (
          <div className="p-3 flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {attachments.map((attachment, index) => (
                <AttachmentPreview
                  key={`${attachment.name}-${index}`}
                  attachment={attachment}
                  onRemove={() => handleRemove(index)}
                />
              ))}
            </AnimatePresence>

            {/* Add more button */}
            {canAddMore && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-muted hover:border-primary hover:bg-primary/5 flex items-center justify-center transition-colors"
              >
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              </motion.button>
            )}
          </div>
        )}

        {/* Empty state - click to add */}
        {attachments.length === 0 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="w-full p-4 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span className="text-sm">
              {isDragging ? 'Drop files here' : 'Add images or documents'}
            </span>
          </button>
        )}

        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/10 rounded-lg flex items-center justify-center pointer-events-none"
            >
              <div className="text-primary font-medium">Drop to attach</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 text-xs text-destructive"
          >
            <AlertCircle className="h-3 w-3" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info text */}
      <p className="text-[10px] text-muted-foreground">
        Images (PNG, JPEG, GIF, WebP) • Documents (PDF, TXT) • Max {maxAttachments} files
      </p>
    </div>
  );
});

// Compact attachment button (for inline use)
export const AttachmentButton = memo(function AttachmentButton({
  onFiles,
  disabled = false,
  className,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  }, [onFiles]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        multiple
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        title="Attach files"
        className={cn('h-10 w-10 p-0', className)}
      >
        <Paperclip className="h-4 w-4" />
      </Button>
    </>
  );
});

export default AttachmentInput;
