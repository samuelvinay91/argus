'use client';

import { useState, useCallback, useMemo } from 'react';
import { ChevronDown, Cpu, Check, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIPreferences, useAvailableModels, useUpdateAIPreferences } from '@/lib/hooks/use-ai-settings';

interface ModelBadgeProps {
  className?: string;
  showCost?: boolean;
  compact?: boolean;
}

// Provider colors for visual differentiation
const PROVIDER_COLORS: Record<string, string> = {
  anthropic: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  openai: 'text-green-500 bg-green-500/10 border-green-500/20',
  google: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  groq: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  together: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
};

// Short model names for display
const MODEL_SHORT_NAMES: Record<string, string> = {
  'claude-opus-4-5': 'Opus 4.5',
  'claude-sonnet-4-5': 'Sonnet 4.5',
  'claude-haiku-4-5': 'Haiku 4.5',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'o1': 'o1',
  'o1-mini': 'o1 Mini',
  'gemini-2.0-pro': 'Gemini 2.0 Pro',
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
  'llama-3.3-70b': 'Llama 3.3 70B',
  'deepseek-v3': 'DeepSeek V3',
};

export function ModelBadge({ className, showCost = true, compact = false }: ModelBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: preferences, isLoading: prefsLoading } = useAIPreferences();
  const { data: modelsData, isLoading: modelsLoading } = useAvailableModels();
  const { mutateAsync: updatePreferences, isPending: isUpdating } = useUpdateAIPreferences();

  const currentModel = preferences?.default_model || 'claude-sonnet-4-5';
  const currentProvider = preferences?.default_provider || 'anthropic';

  // Get current model details
  const currentModelInfo = useMemo(() => {
    if (!modelsData?.models) return null;
    return modelsData.models.find((m) => m.model_id === currentModel);
  }, [modelsData?.models, currentModel]);

  // Group available models by provider
  const modelsByProvider = useMemo(() => {
    if (!modelsData?.models) return {};
    return modelsData.models.reduce((acc, model) => {
      if (model.is_available) {
        if (!acc[model.provider]) acc[model.provider] = [];
        acc[model.provider].push(model);
      }
      return acc;
    }, {} as Record<string, typeof modelsData.models>);
  }, [modelsData?.models]);

  const handleSelectModel = useCallback(
    async (modelId: string) => {
      const model = modelsData?.models.find((m) => m.model_id === modelId);
      if (!model) return;

      await updatePreferences({
        default_model: modelId,
        default_provider: model.provider,
      });
      setIsOpen(false);
    },
    [modelsData?.models, updatePreferences]
  );

  const shortName = MODEL_SHORT_NAMES[currentModel] || currentModel;
  const providerColor = PROVIDER_COLORS[currentProvider] || PROVIDER_COLORS.anthropic;

  if (prefsLoading || modelsLoading) {
    return (
      <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-md', className)}>
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Badge Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium',
          'transition-colors hover:bg-accent',
          providerColor
        )}
      >
        {isUpdating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Cpu className="h-3 w-3" />
        )}
        {!compact && <span>{shortName}</span>}
        {showCost && currentModelInfo && !compact && (
          <span className="text-muted-foreground">
            ${currentModelInfo.input_price}/{currentModelInfo.output_price}
          </span>
        )}
        <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            {/* Dropdown Menu */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 z-50 min-w-[240px] max-h-[320px] overflow-y-auto rounded-lg border bg-popover shadow-lg"
            >
              <div className="p-1">
                {Object.entries(modelsByProvider).map(([provider, models]) => (
                  <div key={provider} className="mb-1 last:mb-0">
                    <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {provider}
                    </div>
                    {models.map((model) => {
                      const isSelected = model.model_id === currentModel;
                      const modelShortName = MODEL_SHORT_NAMES[model.model_id] || model.display_name;

                      return (
                        <button
                          key={model.model_id}
                          onClick={() => handleSelectModel(model.model_id)}
                          className={cn(
                            'w-full flex items-center justify-between px-2 py-1.5 rounded text-xs',
                            'transition-colors hover:bg-accent',
                            isSelected && 'bg-accent'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected && <Check className="h-3 w-3 text-primary" />}
                            <span className={cn(!isSelected && 'ml-5')}>{modelShortName}</span>
                            {model.capabilities.includes('fast') && (
                              <Zap className="h-3 w-3 text-yellow-500" />
                            )}
                          </div>
                          <span className="text-muted-foreground">
                            ${model.input_price}/${model.output_price}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}

                {Object.keys(modelsByProvider).length === 0 && (
                  <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                    No models available. Add your API keys in Settings.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Token cost display for chat messages.
 * Shows the model used, token count, and cost for a message.
 */
interface TokenCostDisplayProps {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  className?: string;
}

export function TokenCostDisplay({
  model,
  inputTokens,
  outputTokens,
  cost,
  className,
}: TokenCostDisplayProps) {
  if (!model && !inputTokens && !outputTokens && cost === undefined) {
    return null;
  }

  const shortName = model ? MODEL_SHORT_NAMES[model] || model : undefined;
  const totalTokens = (inputTokens || 0) + (outputTokens || 0);

  return (
    <div className={cn('flex items-center gap-2 text-[10px] text-muted-foreground', className)}>
      {shortName && <span>{shortName}</span>}
      {totalTokens > 0 && (
        <>
          {shortName && <span>·</span>}
          <span>{totalTokens.toLocaleString()} tokens</span>
        </>
      )}
      {cost !== undefined && (
        <>
          <span>·</span>
          <span>${cost.toFixed(4)}</span>
        </>
      )}
    </div>
  );
}
