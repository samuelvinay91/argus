'use client';

/**
 * CommandStrip - Glassmorphic Input Bar
 *
 * A sophisticated chat input with glass styling, contextual suggestions,
 * and smooth focus/blur animations. Detects slash commands and @mentions.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  Mic,
  Slash,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { GlassCard } from '../glass';
import { ModelBadge } from './ModelBadge';

export interface Suggestion {
  id: string;
  label: string;
  icon?: React.ReactNode;
  command: string;
}

export interface CommandStripProps {
  /** Current input value */
  value: string;
  /** Called when input value changes */
  onChange: (value: string) => void;
  /** Called when user submits */
  onSubmit: () => void;
  /** Whether AI is processing */
  isLoading: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Contextual suggestion chips */
  suggestions?: Suggestion[];
  /** Called when "/" is typed - opens command menu */
  onSlashCommand?: (filter: string) => void;
  /** Called when @mention detected */
  onMention?: (query: string) => void;
  /** Called when attachment button clicked */
  onAttach?: () => void;
  /** Called when voice button clicked */
  onVoice?: () => void;
  /** Current model name */
  currentModel?: string;
  /** Available models for selection */
  availableModels?: Array<{ id: string; name: string; provider?: string }>;
  /** Called when model changes */
  onModelChange?: (modelId: string) => void;
  /** Whether to show model badge */
  showModelBadge?: boolean;
  /** Additional class names */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

const CommandStrip = React.forwardRef<HTMLDivElement, CommandStripProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      isLoading,
      placeholder = 'What would you like to do?',
      suggestions = [],
      onSlashCommand,
      onMention,
      onAttach,
      onVoice,
      currentModel = 'Claude Sonnet 4.5',
      availableModels = [],
      onModelChange,
      showModelBadge = true,
      className,
      disabled = false,
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Auto-resize textarea
    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        const maxHeight = 200; // Max height in pixels
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${newHeight}px`;
      }
    }, []);

    React.useEffect(() => {
      adjustHeight();
    }, [value, adjustHeight]);

    // Debounced value for detecting special patterns
    const debouncedValue = useDebouncedValue(value, 150);

    // Detect slash commands and @mentions when debounced value changes
    React.useEffect(() => {
      // Detect slash commands
      const slashMatch = debouncedValue.match(/^\/(\w*)$/);
      if (slashMatch && onSlashCommand) {
        onSlashCommand(slashMatch[1]);
      }

      // Detect @mentions
      const mentionMatch = debouncedValue.match(/@(\w*)$/);
      if (mentionMatch && onMention) {
        onMention(mentionMatch[1]);
      }
    }, [debouncedValue, onSlashCommand, onMention]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter to send (without shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (value.trim() && !isLoading && !disabled) {
          onSubmit();
        }
      }
    };

    const handleSubmit = () => {
      if (value.trim() && !isLoading && !disabled) {
        onSubmit();
      }
    };

    const isIdle = !isFocused && !value;

    return (
      <div ref={ref} className={cn('w-full', className)}>
        {/* Contextual chips - shown above input */}
        <AnimatePresence>
          {suggestions.length > 0 && isIdle && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="mb-3 flex flex-wrap gap-2"
            >
              {suggestions.map((suggestion) => (
                <motion.button
                  key={suggestion.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onChange(suggestion.command)}
                  className={cn(
                    'inline-flex items-center gap-1.5',
                    'px-3 py-1.5 rounded-full',
                    'bg-white/[0.06] hover:bg-white/[0.10]',
                    'border border-white/[0.08] hover:border-white/[0.12]',
                    'text-sm text-muted-foreground hover:text-foreground',
                    'transition-all duration-200',
                    'backdrop-blur-sm'
                  )}
                >
                  {suggestion.icon}
                  <span>{suggestion.label}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main input container */}
        <GlassCard
          ref={containerRef}
          variant={isFocused ? 'prominent' : 'medium'}
          padding="none"
          className={cn(
            'relative overflow-visible',
            'transition-all duration-300 ease-out',
            isFocused && 'shadow-lg shadow-primary/10 ring-1 ring-primary/20',
            disabled && 'opacity-50 pointer-events-none'
          )}
        >
          {/* Glow effect when focused */}
          <AnimatePresence>
            {isFocused && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/20 via-transparent to-primary/20 -z-10 blur-lg"
              />
            )}
          </AnimatePresence>

          <div className="flex flex-col">
            {/* Textarea */}
            <div className="relative px-4 pt-3">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                disabled={disabled || isLoading}
                rows={1}
                className={cn(
                  'w-full resize-none bg-transparent',
                  'text-foreground placeholder:text-muted-foreground/60',
                  'focus:outline-none',
                  'text-sm leading-relaxed',
                  'min-h-[24px]',
                  'scrollbar-thin scrollbar-thumb-white/10'
                )}
                aria-label="Message input"
              />
            </div>

            {/* Action bar - always visible but more prominent when focused */}
            <motion.div
              className={cn(
                'flex items-center justify-between',
                'px-3 py-2',
                'border-t border-white/[0.06]'
              )}
              animate={{
                opacity: isFocused || value ? 1 : 0.6,
              }}
              transition={{ duration: 0.2 }}
            >
              {/* Left actions */}
              <div className="flex items-center gap-1">
                {/* Attachment button */}
                {onAttach && (
                  <ActionButton
                    icon={<Paperclip className="w-4 h-4" />}
                    onClick={onAttach}
                    aria-label="Attach file"
                    tooltip="Attach"
                  />
                )}

                {/* Voice button */}
                {onVoice && (
                  <ActionButton
                    icon={<Mic className="w-4 h-4" />}
                    onClick={onVoice}
                    aria-label="Voice input"
                    tooltip="Voice"
                  />
                )}

                {/* Slash command button */}
                {onSlashCommand && (
                  <ActionButton
                    icon={<Slash className="w-4 h-4" />}
                    onClick={() => {
                      onChange('/');
                      textareaRef.current?.focus();
                      onSlashCommand('');
                    }}
                    aria-label="Show commands"
                    tooltip="Commands"
                  />
                )}

                {/* Model badge */}
                {showModelBadge && (
                  <ModelBadge
                    currentModel={currentModel}
                    availableModels={availableModels}
                    onModelChange={onModelChange || (() => {})}
                  />
                )}
              </div>

              {/* Send button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={!value.trim() || isLoading || disabled}
                className={cn(
                  'flex items-center justify-center',
                  'w-8 h-8 rounded-lg',
                  'transition-all duration-200',
                  value.trim() && !isLoading
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                    : 'bg-white/[0.06] text-muted-foreground',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
                aria-label={isLoading ? 'Processing' : 'Send message'}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </motion.button>
            </motion.div>
          </div>
        </GlassCard>

        {/* Keyboard hint */}
        <AnimatePresence>
          {isFocused && value && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-2 text-xs text-muted-foreground/50 text-center"
            >
              Press <kbd className="px-1 py-0.5 rounded bg-white/[0.06] text-[10px]">Enter</kbd> to send,{' '}
              <kbd className="px-1 py-0.5 rounded bg-white/[0.06] text-[10px]">Shift + Enter</kbd> for new line
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

CommandStrip.displayName = 'CommandStrip';

// Helper component for action buttons
interface ActionButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  'aria-label': string;
  tooltip?: string;
  active?: boolean;
}

function ActionButton({ icon, onClick, 'aria-label': ariaLabel, active }: ActionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center',
        'w-8 h-8 rounded-lg',
        'transition-colors duration-200',
        active
          ? 'bg-primary/20 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.06]'
      )}
      aria-label={ariaLabel}
    >
      {icon}
    </motion.button>
  );
}

export { CommandStrip };
