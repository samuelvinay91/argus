'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Check, ChevronDown, Loader2, Zap, Sparkles, Eye, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorLogo,
  ModelSelectorName,
} from '@/components/ai-elements/model-selector';
import { useAIPreferences, useAvailableModels, useUpdateAIPreferences, type ModelInfo } from '@/lib/hooks/use-ai-settings';
import { Button } from '@/components/ui/button';

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
  cohere: 'inference', // fallback
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

// Default platform models (always available via platform API key)
const DEFAULT_PLATFORM_MODELS: ModelInfo[] = [
  {
    model_id: 'claude-sonnet-4-5',
    display_name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    input_price: 3.0,
    output_price: 15.0,
    capabilities: ['vision', 'tool_use', 'computer_use', 'json_mode', 'code_generation'],
    is_available: true,
    tier: 'standard',
    context_window: 200000,
    max_output_tokens: 8192,
    supports_vision: true,
    supports_function_calling: true,
    supports_streaming: true,
  },
  {
    model_id: 'claude-haiku-4-5',
    display_name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    input_price: 0.80,
    output_price: 4.0,
    capabilities: ['vision', 'tool_use', 'json_mode', 'fast_inference'],
    is_available: true,
    tier: 'standard',
    context_window: 200000,
    max_output_tokens: 8192,
    supports_vision: true,
    supports_function_calling: true,
    supports_streaming: true,
  },
  {
    model_id: 'claude-opus-4-5',
    display_name: 'Claude Opus 4.5',
    provider: 'anthropic',
    input_price: 15.0,
    output_price: 75.0,
    capabilities: ['vision', 'tool_use', 'computer_use', 'json_mode', 'extended_context', 'code_generation'],
    is_available: true,
    tier: 'premium',
    context_window: 200000,
    max_output_tokens: 8192,
    supports_vision: true,
    supports_function_calling: true,
    supports_streaming: true,
  },
];

interface ChatModelSelectorProps {
  className?: string;
  compact?: boolean;
}

export function ChatModelSelector({ className, compact = false }: ChatModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: preferences, isLoading: prefsLoading } = useAIPreferences();
  const { data: modelsData, isLoading: modelsLoading } = useAvailableModels();
  const { mutateAsync: updatePreferences, isPending: isUpdating } = useUpdateAIPreferences();

  const currentModel = preferences?.default_model || 'claude-sonnet-4-5';
  const currentProvider = preferences?.default_provider || 'anthropic';

  // Use API models if available, otherwise fall back to default platform models
  const availableModels = useMemo(() => {
    const apiModels = modelsData?.models?.filter(m => m.is_available) || [];
    if (apiModels.length > 0) {
      return apiModels;
    }
    // Fallback to default platform models
    return DEFAULT_PLATFORM_MODELS;
  }, [modelsData?.models]);

  // Get current model info
  const currentModelInfo = useMemo(() => {
    return availableModels.find((m) => m.model_id === currentModel) || null;
  }, [availableModels, currentModel]);

  // Group available models by provider
  const modelsByProvider = useMemo(() => {
    const grouped = availableModels.reduce((acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider].push(model);
      return acc;
    }, {} as Record<string, ModelInfo[]>);

    // Sort models within each provider by capability/price
    Object.keys(grouped).forEach((provider) => {
      grouped[provider].sort((a, b) => {
        // Premium models first
        if (a.tier === 'premium' && b.tier !== 'premium') return -1;
        if (b.tier === 'premium' && a.tier !== 'premium') return 1;
        // Then by output price descending (better models usually cost more)
        return (b.output_price ?? 0) - (a.output_price ?? 0);
      });
    });

    return grouped;
  }, [availableModels]);

  // Handle model selection
  const handleSelectModel = useCallback(
    async (model: ModelInfo) => {
      await updatePreferences({
        default_model: model.model_id,
        default_provider: model.provider,
      });
      setOpen(false);
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

  const displayName = MODEL_SHORT_NAMES[currentModel] || currentModelInfo?.display_name || currentModel;
  const providerLogoId = PROVIDER_LOGO_MAP[currentProvider] || currentProvider;
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
    <ModelSelector open={open} onOpenChange={setOpen}>
      <ModelSelectorTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-2 font-medium transition-all',
            'hover:bg-accent hover:border-primary/20',
            isUpdating && 'opacity-70',
            className
          )}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ModelSelectorLogo provider={providerLogoId} className="h-4 w-4" />
          )}
          {!compact && (
            <>
              <span className="max-w-[120px] truncate text-xs">{displayName}</span>
              {currentModelInfo && (
                <span className="text-[10px] text-muted-foreground">
                  ${currentModelInfo.input_price}/${currentModelInfo.output_price}
                </span>
              )}
            </>
          )}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </ModelSelectorTrigger>

      <ModelSelectorContent className="w-[400px]" title="Select AI Model">
        <ModelSelectorInput placeholder="Search models... (⌘M to toggle)" />
        <ModelSelectorList className="max-h-[400px]">
          <ModelSelectorEmpty>
            <div className="flex flex-col items-center gap-2 py-4">
              <p className="text-sm text-muted-foreground">No models found.</p>
              <p className="text-xs text-muted-foreground">
                Add API keys in Settings → AI Hub
              </p>
            </div>
          </ModelSelectorEmpty>

          {Object.entries(modelsByProvider).map(([provider, models]) => (
            <ModelSelectorGroup
              key={provider}
              heading={
                <div className="flex items-center gap-2">
                  <ModelSelectorLogo
                    provider={PROVIDER_LOGO_MAP[provider] || provider}
                    className="h-3 w-3"
                  />
                  <span>{PROVIDER_NAMES[provider] || provider}</span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {models.length} model{models.length !== 1 ? 's' : ''}
                  </span>
                </div>
              }
            >
              {models.map((model) => {
                const isSelected = model.model_id === currentModel;
                const modelName = MODEL_SHORT_NAMES[model.model_id] || model.display_name;

                return (
                  <ModelSelectorItem
                    key={model.model_id}
                    value={`${model.provider}-${model.model_id}-${model.display_name}`}
                    onSelect={() => handleSelectModel(model)}
                    className={cn(
                      'flex items-center justify-between py-2',
                      isSelected && 'bg-accent'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isSelected ? (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <div className="w-4 shrink-0" />
                      )}
                      <ModelSelectorName>{modelName}</ModelSelectorName>

                      {/* Capability badges */}
                      <div className="flex items-center gap-1 shrink-0">
                        {(model.capabilities?.includes('fast_inference') ||
                          model.capabilities?.includes('fast') ||
                          model.tier === 'free') && (
                          <span title="Fast inference">
                            <Zap className="h-3 w-3 text-yellow-500" />
                          </span>
                        )}
                        {(model.capabilities?.includes('extended_context') ||
                          (model.context_window && model.context_window >= 100000)) && (
                          <span title="Extended context">
                            <Sparkles className="h-3 w-3 text-purple-500" />
                          </span>
                        )}
                        {model.supports_vision && (
                          <span title="Vision capable">
                            <Eye className="h-3 w-3 text-blue-500" />
                          </span>
                        )}
                        {model.supports_function_calling && (
                          <span title="Tool use">
                            <Wrench className="h-3 w-3 text-green-500" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                      {model.context_window && (
                        <span className="text-[10px]">
                          {Math.round(model.context_window / 1000)}K
                        </span>
                      )}
                      <span>
                        ${model.input_price}/{model.output_price}
                      </span>
                    </div>
                  </ModelSelectorItem>
                );
              })}
            </ModelSelectorGroup>
          ))}

          {Object.keys(modelsByProvider).length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium">No models available</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add your API keys in Settings → AI Hub to unlock models
              </p>
            </div>
          )}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}

/**
 * Compact version for inline use in messages or toolbars
 */
export function ChatModelBadge({ className }: { className?: string }) {
  return <ChatModelSelector compact className={className} />;
}
