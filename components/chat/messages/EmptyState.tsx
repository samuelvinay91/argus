/**
 * EmptyState - Welcome state when no messages exist
 *
 * Shows greeting, description, and suggestion cards.
 */

'use client';

import { memo, useCallback } from 'react';
import { motion, type Variants } from 'framer-motion';
import { TestTube, Eye, Compass, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatContext } from '../core/ChatProvider';
import { AIAvatar } from './AIAvatar';

// =============================================================================
// TYPES
// =============================================================================

export interface EmptyStateProps {
  title?: string;
  description?: string;
  className?: string;
}

// =============================================================================
// SUGGESTIONS
// =============================================================================

const SUGGESTIONS = [
  {
    icon: TestTube,
    text: 'Create a login test',
    fullText: 'Create a login test for email test@example.com',
    color: 'text-green-500',
  },
  {
    icon: Eye,
    text: 'Discover elements',
    fullText: 'Discover all interactive elements on https://demo.vercel.store',
    color: 'text-blue-500',
  },
  {
    icon: Compass,
    text: 'Run e-commerce test',
    fullText: 'Run a test: Go to demo.vercel.store, click on a product, add to cart',
    color: 'text-purple-500',
  },
  {
    icon: Sparkles,
    text: 'Extract product data',
    fullText: 'Extract all product names from https://demo.vercel.store',
    color: 'text-orange-500',
  },
];

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

// =============================================================================
// SUGGESTION CARD
// =============================================================================

interface SuggestionCardProps {
  icon: typeof TestTube;
  text: string;
  fullText: string;
  color: string;
  onClick: (text: string) => void;
}

const SuggestionCard = memo(function SuggestionCard({
  icon: Icon,
  text,
  fullText,
  color,
  onClick,
}: SuggestionCardProps) {
  return (
    <motion.button
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(fullText)}
      className={cn(
        'flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3',
        'p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent',
        'transition-colors text-center sm:text-left group'
      )}
    >
      <div
        className={cn(
          'p-2 rounded-md bg-muted group-hover:bg-primary/10 transition-colors flex-shrink-0',
          color
        )}
      >
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <span className="text-xs sm:text-sm leading-tight">{text}</span>
    </motion.button>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const EmptyState = memo(function EmptyState({
  title = "Hey Skopaq",
  description = "Your autonomous quality companion. Describe what you want to test in plain English.",
  className,
}: EmptyStateProps) {
  const { setInput, inputRef } = useChatContext();

  const handleSuggestionClick = useCallback((text: string) => {
    setInput(text);
    inputRef.current?.focus();
  }, [setInput, inputRef]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'flex flex-col items-center justify-center h-full',
        'space-y-4 sm:space-y-8 px-2',
        className
      )}
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <AIAvatar status="ready" size="lg" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md">
          {description}
        </p>
      </div>

      {/* Suggestions Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-2 sm:gap-3 max-w-2xl w-full"
      >
        {SUGGESTIONS.map((suggestion, index) => (
          <SuggestionCard
            key={index}
            {...suggestion}
            onClick={handleSuggestionClick}
          />
        ))}
      </motion.div>
    </motion.div>
  );
});

export default EmptyState;
