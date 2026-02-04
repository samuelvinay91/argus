'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Check, ChevronDown, Loader2, Zap, Sparkles, Eye, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIPreferences, useAvailableModels, useUpdateAIPreferences, type ModelInfo } from '@/lib/hooks/use-ai-settings';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

// Provider display names
const PROVIDER_NAMES: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  groq: 'Groq',
  together: 'Together AI',
  fireworks: 'Fireworks',
  cerebras: 'Cerebras',
  openrouter: 'OpenRouter',
  deepseek: 'DeepSeek',
  mistral: 'Mistral',
  perplexity: 'Perplexity',
  cohere: 'Cohere',
  xai: 'xAI',
  azure_openai: 'Azure OpenAI',
  aws_bedrock: 'AWS Bedrock',
  google_vertex: 'Google Vertex',
};

// Map our provider IDs to models.dev logo IDs
const PROVIDER_LOGO_MAP: Record<string, string> = {
  anthropic: 'anthropic',
  openai: 'openai',
  google: 'google',
  groq: 'groq',
  together: 'togetherai',
  fireworks: 'fireworks-ai',
  cerebras: 'cerebras',
  openrouter: 'openrouter',
  deepseek: 'deepseek',
  mistral: 'mistral',
  perplexity: 'perplexity',
  cohere: 'inference',
  xai: 'xai',
  azure_openai: 'azure',
  aws_bedrock: 'amazon-bedrock',
  google_vertex: 'google-vertex',
};

// Short model names for display
const MODEL_SHORT_NAMES: Record<string, string> = {
  'claude-opus-4-5': 'Claude Opus 4.5',
  'claude-sonnet-4-5': 'Claude Sonnet 4.5',
  'claude-haiku-4-5': 'Claude Haiku 4.5',
  'claude-3-5-sonnet': 'Claude 3.5 Sonnet',
  'claude-3-5-haiku': 'Claude 3.5 Haiku',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'gpt-4-turbo': 'GPT-4 Turbo',
  'o1': 'o1',
  'o1-mini': 'o1 Mini',
  'o1-preview': 'o1 Preview',
  'o3-mini': 'o3 Mini',
  'gemini-2.0-pro': 'Gemini 2.0 Pro',
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
  'gemini-1.5-pro': 'Gemini 1.5 Pro',
  'gemini-1.5-flash': 'Gemini 1.5 Flash',
  'llama-3.3-70b': 'Llama 3.3 70B',
  'llama-3.1-70b': 'Llama 3.1 70B',
  'llama-3.1-8b': 'Llama 3.1 8B',
  'deepseek-v3': 'DeepSeek V3',
  'deepseek-r1': 'DeepSeek R1',
  'mixtral-8x7b': 'Mixtral 8x7B',
  'mistral-large': 'Mistral Large',
  'qwen-2.5-72b': 'Qwen 2.5 72B',
};

// Provider logo component
function ProviderLogo({ provider, className }: { provider: string; className?: string }) {
  const logoId = PROVIDER_LOGO_MAP[provider] || provider;
  return (
    <img
      src={`https://models.dev/logos/${logoId}.svg`}
      alt={`${provider} logo`}
      className={cn('h-4 w-4 dark:invert', className)}
      onError={(e) => {
        // Hide broken images
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

interface ChatModelSelectorProps {
  className?: string;
  compact?: boolean;
}

export function ChatModelSelector({ className, compact = false }: ChatModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: preferences, isLoading: prefsLoading, error: prefsError } = useAIPreferences();
  const { data: modelsData, isLoading: modelsLoading, error: modelsError } = useAvailableModels();
  const { mutateAsync: updatePreferences, isPending: isUpdating } = useUpdateAIPreferences();

  const currentModel = preferences?.defaultModel || 'claude-sonnet-4-5';
  const currentProvider = preferences?.defaultProvider || 'anthropic';

  // Debug logging
  useEffect(() => {
    if (!modelsLoading) {
      const totalModels = modelsData?.models?.length || 0;
      const availableModels = modelsData?.models?.filter(m => m.isAvailable).length || 0;
      const userProviders = modelsData?.userProviders || [];
      console.log('[ModelSelector] Data loaded:', {
        totalModels,
        availableModels,
        userProviders,
        prefsError: prefsError?.message,
        modelsError: modelsError?.message,
      });
    }
  }, [modelsLoading, modelsData, prefsError, modelsError]);

  // Get current model info
  const currentModelInfo = useMemo(() => {
    if (!modelsData?.models) return null;
    return modelsData.models.find((m) => m.modelId === currentModel);
  }, [modelsData?.models, currentModel]);

  // Group available models by provider
  const modelsByProvider = useMemo(() => {
    if (!modelsData?.models) return {};

    const grouped = modelsData.models.reduce((acc, model) => {
      if (model.isAvailable) {
        if (!acc[model.provider]) acc[model.provider] = [];
        acc[model.provider].push(model);
      }
      return acc;
    }, {} as Record<string, ModelInfo[]>);

    // Sort models within each provider by capability/price
    Object.keys(grouped).forEach((provider) => {
      grouped[provider].sort((a, b) => {
        if (a.tier === 'premium' && b.tier !== 'premium') return -1;
        if (b.tier === 'premium' && a.tier !== 'premium') return 1;
        return b.outputPrice - a.outputPrice;
      });
    });

    return grouped;
  }, [modelsData?.models]);

  // Handle model selection
  const handleSelectModel = useCallback(
    async (model: ModelInfo) => {
      console.log('[ModelSelector] Selecting model:', model.modelId);
      try {
        await updatePreferences({
          defaultModel: model.modelId,
          defaultProvider: model.provider,
        });
        setOpen(false);
      } catch (error) {
        console.error('[ModelSelector] Failed to update:', error);
      }
    },
    [updatePreferences]
  );

  // Keyboard shortcut to open (Cmd+M or Ctrl+M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const displayName = MODEL_SHORT_NAMES[currentModel] || currentModelInfo?.displayName || currentModel;
  const isLoading = prefsLoading || modelsLoading;

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className={cn('gap-2', className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        {!compact && <span className="text-xs">Loading...</span>}
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'gap-2 font-medium transition-all justify-between',
            'hover:bg-accent hover:border-primary/20',
            isUpdating && 'opacity-70',
            className
          )}
          disabled={isUpdating}
        >
          <div className="flex items-center gap-2">
            {isUpdating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ProviderLogo provider={currentProvider} className="h-4 w-4" />
            )}
            {!compact && (
              <span className="max-w-[100px] truncate text-xs">{displayName}</span>
            )}
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[340px] p-0"
        align="start"
        sideOffset={4}
      >
        <div className="px-3 py-2 border-b">
          <h4 className="text-sm font-medium">Select AI Model</h4>
          <p className="text-xs text-muted-foreground">⌘M to toggle</p>
        </div>

        <ScrollArea className="h-[300px]">
          {Object.keys(modelsByProvider).length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium">No models available</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                {modelsData?.models?.length
                  ? `${modelsData.models.length} models found, but none are available for your configured providers.`
                  : 'Unable to load models from the server.'}
              </p>
              <a
                href="/settings/ai-hub/providers"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Add API keys in AI Hub →
              </a>
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(modelsByProvider).map(([provider, models]) => (
                <div key={provider} className="mb-3">
                  {/* Provider header */}
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    <ProviderLogo provider={provider} className="h-3 w-3" />
                    <span>{PROVIDER_NAMES[provider] || provider}</span>
                    <span className="text-[10px] opacity-60">
                      ({models.length})
                    </span>
                  </div>

                  {/* Models */}
                  {models.map((model) => {
                    const isSelected = model.modelId === currentModel;
                    const modelName = MODEL_SHORT_NAMES[model.modelId] || model.displayName;

                    return (
                      <button
                        key={model.modelId}
                        onClick={() => handleSelectModel(model)}
                        className={cn(
                          'w-full flex items-center justify-between px-2 py-2 rounded-md text-sm',
                          'hover:bg-accent cursor-pointer transition-colors',
                          isSelected && 'bg-accent'
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isSelected ? (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <div className="w-4 shrink-0" />
                          )}
                          <span className="truncate">{modelName}</span>

                          {/* Capability badges */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            {(model.capabilities?.includes('fast_inference') ||
                              model.capabilities?.includes('fast') ||
                              model.tier === 'free') && (
                              <Zap className="h-3 w-3 text-yellow-500" aria-label="Fast" />
                            )}
                            {(model.capabilities?.includes('extended_context') ||
                              (model.contextWindow && model.contextWindow >= 100000)) && (
                              <Sparkles className="h-3 w-3 text-purple-500" aria-label="Extended context" />
                            )}
                            {model.supportsVision && (
                              <Eye className="h-3 w-3 text-blue-500" aria-label="Vision" />
                            )}
                            {model.supportsFunctionCalling && (
                              <Wrench className="h-3 w-3 text-green-500" aria-label="Tools" />
                            )}
                          </div>
                        </div>

                        {/* Pricing */}
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                          ${model.inputPrice}/${model.outputPrice}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Compact version for inline use in messages or toolbars
 */
export function ChatModelBadge({ className }: { className?: string }) {
  return <ChatModelSelector compact className={className} />;
}
