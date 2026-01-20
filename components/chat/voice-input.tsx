'use client';

/**
 * Voice Input Component
 *
 * Uses the Web Speech API (SpeechRecognition) to capture voice input
 * and convert it to text for the chat interface.
 *
 * Browser support:
 * - Chrome/Edge: Full support (webkitSpeechRecognition)
 * - Firefox: Limited support
 * - Safari: Partial support (iOS 14.5+)
 */

import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Check if speech recognition is supported
function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Get speech recognition constructor
function getSpeechRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export interface VoiceInputProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  onListeningChange?: (isListening: boolean) => void;
  onError?: (error: string) => void;
  language?: string;
  continuous?: boolean;
  className?: string;
  disabled?: boolean;
}

export const VoiceInput = memo(function VoiceInput({
  onTranscript,
  onListeningChange,
  onError,
  language = 'en-US',
  continuous = false,
  className,
  disabled = false,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check support on mount
  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported());
  }, []);

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) {
      setError('Speech recognition not supported');
      return null;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      onListeningChange?.(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      onListeningChange?.(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);

      let errorMessage = 'Speech recognition error';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not available';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied';
          break;
        case 'network':
          errorMessage = 'Network error';
          break;
        case 'aborted':
          // User stopped, not an error
          return;
        default:
          errorMessage = `Error: ${event.error}`;
      }

      setError(errorMessage);
      onError?.(errorMessage);
      setIsListening(false);
      onListeningChange?.(false);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscriptLocal = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscriptLocal += transcript;
        }
      }

      // Update interim transcript for visual feedback
      setInterimTranscript(interimTranscriptLocal);

      // Send final transcript
      if (finalTranscript) {
        onTranscript(finalTranscript.trim(), true);
        setInterimTranscript('');
      } else if (interimTranscriptLocal) {
        // Send interim updates for real-time feedback
        onTranscript(interimTranscriptLocal, false);
      }
    };

    recognition.onspeechend = () => {
      if (!continuous) {
        recognition.stop();
      }
    };

    return recognition;
  }, [continuous, language, onListeningChange, onError, onTranscript]);

  // Start listening
  const startListening = useCallback(async () => {
    if (disabled || isListening) return;

    // Request microphone permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError('Microphone permission denied');
      onError?.('Microphone permission denied');
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = initRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      recognition.start();
    }
  }, [disabled, isListening, initRecognition, onError]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setInterimTranscript('');
    onListeningChange?.(false);
  }, [onListeningChange]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Clear error after delay
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Not supported - show tooltip or hide
  if (!isSupported) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled
        title="Speech recognition not supported in this browser"
        className={cn('h-10 w-10 p-0 opacity-50', className)}
      >
        <MicOff className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="relative">
      {/* Main button */}
      <Button
        type="button"
        variant={isListening ? 'default' : 'ghost'}
        size="sm"
        onClick={toggleListening}
        disabled={disabled}
        title={isListening ? 'Stop listening' : 'Start voice input'}
        className={cn(
          'h-10 w-10 p-0 relative overflow-hidden transition-colors',
          isListening && 'bg-red-500 hover:bg-red-600 text-white',
          className
        )}
      >
        {/* Listening animation */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              className="absolute inset-0 rounded-full bg-red-500/30"
            />
          )}
        </AnimatePresence>

        {isListening ? (
          <Mic className="h-4 w-4 relative z-10" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {/* Error indicator */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs whitespace-nowrap shadow-lg"
          >
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3" />
              {error}
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-destructive" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interim transcript indicator */}
      <AnimatePresence>
        {isListening && interimTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-popover border text-xs max-w-[200px] truncate shadow-lg"
          >
            <span className="text-muted-foreground italic">{interimTranscript}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Hook for using voice input programmatically
export function useVoiceInput(options: {
  language?: string;
  continuous?: boolean;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
} = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported());
  }, []);

  const start = useCallback(async () => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) {
      setError('Not supported');
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Permission denied');
      options.onError?.('Permission denied');
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = options.continuous ?? false;
    recognition.interimResults = true;
    recognition.lang = options.language ?? 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e) => {
      setError(e.error);
      options.onError?.(e.error);
      setIsListening(false);
    };
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        const isFinal = event.results[i].isFinal;

        if (isFinal) {
          setTranscript(text.trim());
          options.onTranscript?.(text.trim(), true);
        } else {
          options.onTranscript?.(text, false);
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [options]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    isListening,
    isSupported,
    error,
    transcript,
    start,
    stop,
    toggle,
  };
}

export default VoiceInput;
