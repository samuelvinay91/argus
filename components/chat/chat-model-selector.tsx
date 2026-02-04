'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Loader2, Zap, Sparkles, Eye, Wrench, Search, Settings, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIPreferences, useAvailableModels, useUpdateAIPreferences, type ModelInfo } from '@/lib/hooks/use-ai-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  meta: 'Meta',
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
  meta: 'meta',
  azure_openai: 'azure',
  aws_bedrock: 'amazon-bedrock',
  google_vertex: 'google-vertex',
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [configureDialog, setConfigureDialog] = useState<{ open: boolean; provider: string; model: ModelInfo | null }>({
    open: false,
    provider: '',
    model: null,
  });

  const { data: preferences, isLoading: prefsLoading, error: prefsError } = useAIPreferences();
  const { data: modelsData, isLoading: modelsLoading, error: modelsError } = useAvailableModels();
  const { mutateAsync: updatePreferences, isPending: isUpdating } = useUpdateAIPreferences();

  const currentModel = preferences?.defaultModel || 'claude-sonnet-4-5';
  const currentProvider = preferences?.defaultProvider || 'anthropic';
  const userProviders = useMemo(() => new Set(modelsData?.userProviders || []), [modelsData?.userProviders]);

  // Debug logging
  useEffect(() => {
    if (!modelsLoading) {
      const totalModels = modelsData?.models?.length || 0;
      const availableModels = modelsData?.models?.filter(m => m.isAvailable).length || 0;
      console.log('[ModelSelector] Data loaded:', {
        totalModels,
        availableModels,
        userProviders: Array.from(userProviders),
        prefsError: prefsError?.message,
        modelsError: modelsError?.message,
      });
    }
  }, [modelsLoading, modelsData, userProviders, prefsError, modelsError]);

  // Get current model info
  const currentModelInfo = useMemo(() => {
    if (!modelsData?.models) return null;
    return modelsData.models.find((m) => m.modelId === currentModel);
  }, [modelsData?.models, currentModel]);

  // Filter models by search query
  const filteredModels = useMemo(() => {
    if (!modelsData?.models) return [];
    if (!searchQuery.trim()) return modelsData.models.filter(m => m.isAvailable);

    const query = searchQuery.toLowerCase();
    return modelsData.models.filter(m =>
      m.isAvailable && (
        m.modelId.toLowerCase().includes(query) ||
        m.displayName.toLowerCase().includes(query) ||
        m.provider.toLowerCase().includes(query) ||
        PROVIDER_NAMES[m.provider]?.toLowerCase().includes(query)
      )
    );
  }, [modelsData?.models, searchQuery]);

  // Group models: configured providers first, then others
  const { configuredModels, otherModels } = useMemo(() => {
    const configured: Record<string, ModelInfo[]> = {};
    const other: Record<string, ModelInfo[]> = {};

    for (const model of filteredModels) {
      const isConfigured = userProviders.has(model.provider);
      const target = isConfigured ? configured : other;

      if (!target[model.provider]) target[model.provider] = [];
      target[model.provider].push(model);
    }

    // Sort models within each provider
    const sortModels = (models: ModelInfo[]) => {
      return models.sort((a, b) => {
        if (a.tier === 'premium' && b.tier !== 'premium') return -1;
        if (b.tier === 'premium' && a.tier !== 'premium') return 1;
        return (b.outputPrice || 0) - (a.outputPrice || 0);
      });
    };

    Object.values(configured).forEach(sortModels);
    Object.values(other).forEach(sortModels);

    return { configuredModels: configured, otherModels: other };
  }, [filteredModels, userProviders]);

  // Handle model selection
  const handleSelectModel = useCallback(
    async (model: ModelInfo) => {
      // Check if provider is configured by user (not just platform keys)
      const isUserConfigured = userProviders.has(model.provider);

      if (!isUserConfigured && userProviders.size > 0) {
        // User has some providers configured but not this one
        // Show configure dialog
        setConfigureDialog({ open: true, provider: model.provider, model });
        return;
      }

      // Proceed with selection
      console.log('[ModelSelector] Selecting model:', model.modelId, 'provider:', model.provider);
      try {
        const result = await updatePreferences({
          defaultModel: model.modelId,
          defaultProvider: model.provider,
        });
        console.log('[ModelSelector] Update success:', result);
        setOpen(false);
        setSearchQuery('');
      } catch (error) {
        console.error('[ModelSelector] Failed to update:', error);
        alert(`Failed to update model: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [updatePreferences, userProviders]
  );

  // Navigate to provider configuration
  const handleConfigureProvider = () => {
    setConfigureDialog({ open: false, provider: '', model: null });
    setOpen(false);
    router.push('/settings/ai-hub/providers');
  };

  // Select model anyway (uses platform keys)
  const handleSelectAnyway = async () => {
    if (configureDialog.model) {
      console.log('[ModelSelector] Selecting unconfigured model:', configureDialog.model.modelId);
      try {
        const result = await updatePreferences({
          defaultModel: configureDialog.model.modelId,
          defaultProvider: configureDialog.model.provider,
        });
        console.log('[ModelSelector] Update success:', result);
        setConfigureDialog({ open: false, provider: '', model: null });
        setOpen(false);
        setSearchQuery('');
      } catch (error) {
        console.error('[ModelSelector] Failed to update:', error);
        alert(`Failed to update model: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

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

  // Reset search when closing
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const displayName = currentModelInfo?.displayName || currentModel;
  const isLoading = prefsLoading || modelsLoading;

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className={cn('gap-2', className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        {!compact && <span className="text-xs">Loading...</span>}
      </Button>
    );
  }

  const hasConfiguredModels = Object.keys(configuredModels).length > 0;
  const hasOtherModels = Object.keys(otherModels).length > 0;
  const totalResults = filteredModels.length;

  const renderModelItem = (model: ModelInfo, showConfigBadge = false) => {
    const isSelected = model.modelId === currentModel;

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
          <span className="truncate">{model.displayName}</span>

          {/* Capability badges */}
          <div className="flex items-center gap-0.5 shrink-0">
            {model.tier === 'free' && (
              <Zap className="h-3 w-3 text-yellow-500" aria-label="Fast" />
            )}
            {model.contextWindow && model.contextWindow >= 100000 && (
              <Sparkles className="h-3 w-3 text-purple-500" aria-label="Extended context" />
            )}
            {model.supportsVision && (
              <Eye className="h-3 w-3 text-blue-500" aria-label="Vision" />
            )}
            {model.supportsFunctionCalling && (
              <Wrench className="h-3 w-3 text-green-500" aria-label="Tools" />
            )}
            {showConfigBadge && (
              <Settings className="h-3 w-3 text-orange-500" aria-label="Needs configuration" />
            )}
          </div>
        </div>

        {/* Pricing */}
        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
          ${model.inputPrice || 0}/${model.outputPrice || 0}
        </span>
      </button>
    );
  };

  const renderProviderGroup = (provider: string, models: ModelInfo[], showConfigBadge = false) => (
    <div key={provider} className="mb-3">
      <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
        <ProviderLogo provider={provider} className="h-3 w-3" />
        <span>{PROVIDER_NAMES[provider] || provider}</span>
        <span className="text-[10px] opacity-60">({models.length})</span>
      </div>
      {models.slice(0, 10).map((model) => renderModelItem(model, showConfigBadge))}
      {models.length > 10 && (
        <p className="px-2 py-1 text-[10px] text-muted-foreground">
          +{models.length - 10} more models
        </p>
      )}
    </div>
  );

  return (
    <>
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
                <span className="max-w-[120px] truncate text-xs">{displayName}</span>
              )}
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[380px] p-0" align="start" sideOffset={4}>
          {/* Header with search */}
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Select AI Model</h4>
                <p className="text-xs text-muted-foreground">⌘M to toggle</p>
              </div>
              <span className="text-xs text-muted-foreground">
                {totalResults} models
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
                autoFocus
              />
            </div>
          </div>

          <ScrollArea className="h-[350px]">
            {totalResults === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium">No models found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery ? 'Try a different search term' : 'Configure providers in AI Hub'}
                </p>
                <a
                  href="/settings/ai-hub/providers"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
                >
                  <Settings className="h-3 w-3" />
                  Configure AI Hub
                </a>
              </div>
            ) : (
              <div className="p-2">
                {/* Configured providers section */}
                {hasConfiguredModels && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-primary flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Your Configured Models
                    </div>
                    {Object.entries(configuredModels).map(([provider, models]) =>
                      renderProviderGroup(provider, models)
                    )}
                  </>
                )}

                {/* Other available models */}
                {hasOtherModels && (
                  <>
                    {hasConfiguredModels && (
                      <div className="px-2 py-2 text-xs font-semibold text-muted-foreground border-t mt-2 flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Other Available Models
                      </div>
                    )}
                    {Object.entries(otherModels).map(([provider, models]) =>
                      renderProviderGroup(provider, models, true)
                    )}
                  </>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="p-2 border-t">
            <a
              href="/settings/ai-hub/providers"
              className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
            >
              <Settings className="h-3 w-3" />
              Manage API Keys
            </a>
          </div>
        </PopoverContent>
      </Popover>

      {/* Configure Provider Dialog */}
      <Dialog open={configureDialog.open} onOpenChange={(open) => setConfigureDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure {PROVIDER_NAMES[configureDialog.provider] || configureDialog.provider}</DialogTitle>
            <DialogDescription>
              This model requires a {PROVIDER_NAMES[configureDialog.provider] || configureDialog.provider} API key.
              Would you like to configure it now?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <ProviderLogo provider={configureDialog.provider} className="h-8 w-8" />
            <div>
              <p className="font-medium">{configureDialog.model?.displayName}</p>
              <p className="text-sm text-muted-foreground">
                ${configureDialog.model?.inputPrice || 0} / ${configureDialog.model?.outputPrice || 0} per 1M tokens
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleSelectAnyway}>
              Use Platform Key
            </Button>
            <Button onClick={handleConfigureProvider}>
              <Settings className="h-4 w-4 mr-2" />
              Configure API Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Compact version for inline use in messages or toolbars
 */
export function ChatModelBadge({ className }: { className?: string }) {
  return <ChatModelSelector compact className={className} />;
}
