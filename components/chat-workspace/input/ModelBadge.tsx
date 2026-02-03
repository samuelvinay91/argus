'use client';

/**
 * ModelBadge - Compact Model Selector
 *
 * A small, glassmorphic badge that displays the current AI model
 * and expands into a dropdown for model selection.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ChevronDown,
  Check,
  Zap,
  Brain,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../glass';

// =============================================================================
// TYPES
// =============================================================================

export interface Model {
  id: string;
  name: string;
  provider?: string;
  description?: string;
  speed?: 'fast' | 'medium' | 'slow';
  capability?: 'basic' | 'standard' | 'advanced';
}

export interface ModelBadgeProps {
  /** Current model name or ID */
  currentModel: string;
  /** Available models for selection */
  availableModels: Model[];
  /** Called when a model is selected */
  onModelChange: (modelId: string) => void;
  /** Additional class names */
  className?: string;
  /** Whether selection is disabled */
  disabled?: boolean;
}

// =============================================================================
// DEFAULT MODELS (fallback when none provided)
// =============================================================================

const DEFAULT_MODELS: Model[] = [
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    description: 'Best balance of speed and quality',
    speed: 'medium',
    capability: 'advanced',
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    description: 'Fast responses for simple tasks',
    speed: 'fast',
    capability: 'standard',
  },
  {
    id: 'claude-opus-4-5',
    name: 'Claude Opus 4.5',
    provider: 'Anthropic',
    description: 'Most capable for complex analysis',
    speed: 'slow',
    capability: 'advanced',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'OpenAI flagship model',
    speed: 'medium',
    capability: 'advanced',
  },
];

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function SpeedIndicator({ speed }: { speed?: Model['speed'] }) {
  const dots = speed === 'fast' ? 3 : speed === 'medium' ? 2 : 1;

  return (
    <div className="flex items-center gap-0.5" title={`Speed: ${speed || 'unknown'}`}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'w-1 h-1 rounded-full',
            i <= dots ? 'bg-green-500' : 'bg-white/20'
          )}
        />
      ))}
    </div>
  );
}

function CapabilityIcon({ capability }: { capability?: Model['capability'] }) {
  switch (capability) {
    case 'advanced':
      return <Brain className="w-3 h-3 text-purple-400" />;
    case 'standard':
      return <Cpu className="w-3 h-3 text-blue-400" />;
    default:
      return <Zap className="w-3 h-3 text-amber-400" />;
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

const ModelBadge = React.forwardRef<HTMLDivElement, ModelBadgeProps>(
  (
    {
      currentModel,
      availableModels,
      onModelChange,
      className,
      disabled = false,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Use default models if none provided
    const models = availableModels.length > 0 ? availableModels : DEFAULT_MODELS;

    // Find current model info
    const currentModelInfo = models.find(
      (m) => m.id === currentModel || m.name === currentModel
    );

    // Truncate model name for display
    const displayName = React.useMemo(() => {
      const name = currentModelInfo?.name || currentModel;
      return name.length > 20 ? `${name.slice(0, 17)}...` : name;
    }, [currentModelInfo, currentModel]);

    // Close on click outside
    React.useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Close on Escape
    React.useEffect(() => {
      if (!isOpen) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    const handleSelect = (model: Model) => {
      onModelChange(model.id);
      setIsOpen(false);
    };

    return (
      <div
        ref={containerRef}
        className={cn('relative', className)}
      >
        {/* Badge button */}
        <motion.button
          ref={ref as React.Ref<HTMLButtonElement>}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'inline-flex items-center gap-1.5',
            'px-2 py-1 rounded-lg',
            'bg-white/[0.06] hover:bg-white/[0.10]',
            'border border-white/[0.08] hover:border-white/[0.12]',
            'text-xs text-muted-foreground hover:text-foreground',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isOpen && 'bg-white/[0.10] border-white/[0.12]'
          )}
          aria-label={`Current model: ${currentModel}. Click to change.`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="font-medium">{displayName}</span>
          <ChevronDown
            className={cn(
              'w-3 h-3 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </motion.button>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              transition={{ duration: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
              className="absolute bottom-full left-0 mb-2 z-50 min-w-[280px]"
            >
              <GlassCard
                variant="prominent"
                padding="none"
                className="overflow-hidden shadow-xl"
              >
                {/* Header */}
                <div className="px-3 py-2 border-b border-white/[0.06]">
                  <div className="text-xs font-medium text-muted-foreground">
                    Select AI Model
                  </div>
                </div>

                {/* Model list */}
                <div
                  className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
                  role="listbox"
                  aria-label="Available models"
                >
                  {models.map((model) => {
                    const isSelected =
                      model.id === currentModel || model.name === currentModel;

                    return (
                      <motion.button
                        key={model.id}
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                        onClick={() => handleSelect(model)}
                        className={cn(
                          'w-full flex items-start gap-3',
                          'px-3 py-3',
                          'text-left',
                          'transition-colors duration-150',
                          isSelected && 'bg-primary/10'
                        )}
                        role="option"
                        aria-selected={isSelected}
                      >
                        {/* Selection indicator */}
                        <div className="flex-shrink-0 pt-0.5">
                          {isSelected ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <div className="w-4 h-4" />
                          )}
                        </div>

                        {/* Model info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">
                              {model.name}
                            </span>
                            {model.provider && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-muted-foreground">
                                {model.provider}
                              </span>
                            )}
                          </div>
                          {model.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {model.description}
                            </p>
                          )}
                        </div>

                        {/* Speed and capability indicators */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <SpeedIndicator speed={model.speed} />
                          <CapabilityIcon capability={model.capability} />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Footer hint */}
                <div className="px-3 py-2 border-t border-white/[0.06] text-[10px] text-muted-foreground/50">
                  Models are routed automatically based on task complexity
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

ModelBadge.displayName = 'ModelBadge';

// =============================================================================
// EXPORTS
// =============================================================================

export { ModelBadge, DEFAULT_MODELS };
