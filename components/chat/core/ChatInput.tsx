/**
 * ChatInput - Enhanced input component with slash commands and mentions
 *
 * Features:
 * - Slash command menu (/)
 * - @agent mentions (coming soon)
 * - Voice input
 * - File attachments
 * - Keyboard shortcuts
 */

'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, FileText, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useChatContext } from './ChatProvider';
import { SlashCommandMenu, useSlashCommands } from '../slash-command-menu';
import { VoiceInput } from '../voice-input';
import { AttachmentButton, type Attachment } from '../attachment-input';

// =============================================================================
// TYPES
// =============================================================================

export interface ChatInputProps {
  className?: string;
  placeholder?: string;
  maxAttachments?: number;
}

// =============================================================================
// ATTACHMENT PREVIEW
// =============================================================================

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove: (index: number) => void;
}

const AttachmentPreview = memo(function AttachmentPreview({
  attachments,
  onRemove,
}: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="max-w-4xl mx-auto mb-2 overflow-hidden"
    >
      <div className="flex items-center gap-2 flex-wrap p-2 bg-muted/50 rounded-lg">
        {attachments.map((attachment, index) => (
          <div key={`${attachment.name}-${index}`} className="relative group">
            <div className="w-12 h-12 rounded border bg-background overflow-hidden">
              {attachment.contentType.startsWith('image/') ? (
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <span className="text-xs text-muted-foreground">
          {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
        </span>
      </div>
    </motion.div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ChatInput = memo(function ChatInput({
  className,
  placeholder = "Describe what to test... (type / for commands)",
  maxAttachments = 5,
}: ChatInputProps) {
  const {
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    inputRef,
  } = useChatContext();

  // Local state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Slash command detection
  const { showMenu: showSlashMenu } = useSlashCommands(input);

  // Update slash menu state
  useEffect(() => {
    setSlashMenuOpen(showSlashMenu);
  }, [showSlashMenu]);

  // Handle file attachment
  const handleAttachFiles = useCallback(async (files: File[]) => {
    const newAttachments: Attachment[] = [];

    for (const file of files) {
      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          name: file.name,
          contentType: file.type,
          url: dataUrl,
        });
      } catch {
        console.error(`Failed to process file: ${file.name}`);
      }
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments].slice(0, maxAttachments));
    }
  }, [maxAttachments]);

  // Remove attachment
  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Clear attachments
  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  // Handle slash command selection
  const handleSlashCommandSelect = useCallback((transformedInput: string) => {
    setInput(transformedInput);
    setSlashMenuOpen(false);
  }, [setInput]);

  // Handle voice transcript
  const handleVoiceTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setInput(text);
    }
  }, [setInput]);

  // Handle form submit
  const handleFormSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const userInput = input.trim();
    if (!userInput && attachments.length === 0) return;

    // Submit with attachments
    if (attachments.length > 0) {
      handleSubmit(e, {
        experimental_attachments: attachments.map(a => ({
          name: a.name,
          contentType: a.contentType,
          url: a.url,
        })),
      });
      clearAttachments();
    } else {
      handleSubmit(e);
    }
  }, [input, attachments, handleSubmit, clearAttachments]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Submit on Enter (without shift)
    if (e.key === 'Enter' && !e.shiftKey && !slashMenuOpen) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }

    // Cancel on Escape
    if (e.key === 'Escape') {
      if (slashMenuOpen) {
        setSlashMenuOpen(false);
      } else if (isLoading) {
        stop();
      }
    }
  }, [slashMenuOpen, isLoading, stop]);

  return (
    <div className={className}>
      {/* Attachment Preview */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <AttachmentPreview
            attachments={attachments}
            onRemove={handleRemoveAttachment}
          />
        )}
      </AnimatePresence>

      <form ref={formRef} onSubmit={handleFormSubmit} className="flex gap-2 max-w-4xl mx-auto">
        {/* Attachment Button */}
        <AttachmentButton
          onFiles={handleAttachFiles}
          disabled={isLoading || attachments.length >= maxAttachments}
          className="h-10 sm:h-11"
        />

        {/* Input Container */}
        <div className="flex-1 relative">
          {/* Slash Command Menu */}
          <AnimatePresence>
            {slashMenuOpen && (
              <SlashCommandMenu
                input={input}
                onSelect={handleSlashCommandSelect}
                onClose={() => setSlashMenuOpen(false)}
              />
            )}
          </AnimatePresence>

          {/* Text Input */}
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className={cn(
              'w-full h-10 sm:h-11 px-3 sm:px-4 pr-12',
              'text-sm sm:text-base rounded-lg border bg-background',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />

          {/* Voice Input Button */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <VoiceInput
              onTranscript={handleVoiceTranscript}
              disabled={isLoading}
              className="h-7 w-7"
            />
          </div>
        </div>

        {/* Submit/Stop Button */}
        {isLoading ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 sm:h-11 px-3"
            onClick={stop}
          >
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
            Stop
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!input.trim() && attachments.length === 0}
            size="sm"
            className="h-10 sm:h-11 px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </form>

      {/* Help Text */}
      <p className="hidden sm:block text-xs text-muted-foreground text-center mt-2">
        Try: "Discover elements on https://demo.vercel.store" or "Run a login test"
      </p>
    </div>
  );
});

export default ChatInput;
