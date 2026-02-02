'use client';

import { useState } from 'react';
import {
  Cpu,
  Key,
  ChevronDown,
  Check,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingSpinner, ErrorMessage, Toggle, ToggleRow } from './settings-ui';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/hooks/useToast';

// Types
export interface AIPreferences {
  defaultProvider: string;
  defaultModel: string;
  costLimitPerDay: number;
  costLimitPerMessage: number;
  usePlatformKeyFallback: boolean;
  showTokenCosts: boolean;
  showModelInChat: boolean;
}

export interface ProviderKey {
  id: string;
  provider: string;
  keyDisplay: string;
  isValid: boolean;
  lastValidatedAt: string | null;
  validationError: string | null;
  createdAt: string;
}

export interface ModelInfo {
  modelId: string;
  displayName: string;
  provider: string;
  inputPrice: number;
  outputPrice: number;
  capabilities: string[];
  isAvailable: boolean;
}

export interface UsageSummary {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  platformKeyCost: number;
  byokCost: number;
  usageByModel: Record<string, { requests: number; tokens: number; cost: number }>;
  usageByProvider: Record<string, { requests: number; cost: number }>;
}

export interface BudgetStatus {
  hasBudget: boolean;
  dailyLimit: number;
  dailySpent: number;
  dailyRemaining: number;
  messageLimit: number;
}

interface AISettingsSectionProps {
  preferences: AIPreferences | null;
  providerKeys: ProviderKey[];
  models: ModelInfo[];
  userProviders: string[];
  usageSummary: UsageSummary | null;
  budgetStatus: BudgetStatus | null;
  loading: boolean;
  error: string | null;
  onUpdatePreferences: (prefs: Partial<AIPreferences>) => Promise<void>;
  onAddProviderKey: (provider: string, apiKey: string) => Promise<void>;
  onRemoveProviderKey: (provider: string) => Promise<void>;
  onValidateProviderKey: (provider: string) => Promise<{ isValid: boolean; error: string | null }>;
}

// Provider metadata
const PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    description: 'Access 300+ models with one API key',
    logo: '/logos/openrouter.svg',
    keyPlaceholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
    websiteUrl: 'https://openrouter.ai',
    modelCount: 300,
    authType: 'api_key' as const,
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Claude models (Opus, Sonnet, Haiku)',
    logo: '/logos/anthropic.svg',
    keyPlaceholder: 'sk-ant-api...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    websiteUrl: 'https://anthropic.com',
    modelCount: 6,
    authType: 'api_key' as const,
  },
  openai: {
    name: 'OpenAI',
    description: 'GPT-4o, o1, and more',
    logo: '/logos/openai.svg',
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    websiteUrl: 'https://openai.com',
    modelCount: 12,
    authType: 'api_key' as const,
  },
  google: {
    name: 'Google AI',
    description: 'Gemini 2.0 models',
    logo: '/logos/google.svg',
    keyPlaceholder: 'AIza...',
    docsUrl: 'https://makersuite.google.com/app/apikey',
    websiteUrl: 'https://ai.google.dev',
    modelCount: 8,
    authType: 'api_key' as const,
  },
  groq: {
    name: 'Groq',
    description: 'Ultra-fast Llama inference',
    logo: '/logos/groq.svg',
    keyPlaceholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    websiteUrl: 'https://groq.com',
    modelCount: 10,
    authType: 'api_key' as const,
  },
  together: {
    name: 'Together AI',
    description: 'DeepSeek, open-source models',
    logo: '/logos/together.svg',
    keyPlaceholder: 'togeth...',
    docsUrl: 'https://api.together.xyz/settings/api-keys',
    websiteUrl: 'https://together.ai',
    modelCount: 50,
    authType: 'api_key' as const,
  },
  azure_openai: {
    name: 'Azure OpenAI',
    description: 'Enterprise-grade OpenAI on Azure',
    logo: '/logos/azure.svg',
    keyPlaceholder: 'azure-key...',
    docsUrl: 'https://portal.azure.com',
    websiteUrl: 'https://azure.microsoft.com/products/ai-services/openai-service',
    modelCount: 8,
    authType: 'enterprise' as const,
  },
  aws_bedrock: {
    name: 'AWS Bedrock',
    description: 'AWS-hosted AI models',
    logo: '/logos/aws.svg',
    keyPlaceholder: 'aws-access-key...',
    docsUrl: 'https://console.aws.amazon.com/bedrock',
    websiteUrl: 'https://aws.amazon.com/bedrock',
    modelCount: 25,
    authType: 'enterprise' as const,
  },
  google_vertex: {
    name: 'Google Vertex AI',
    description: 'GCP-hosted AI models',
    logo: '/logos/gcp.svg',
    keyPlaceholder: 'gcp-service-account...',
    docsUrl: 'https://console.cloud.google.com/vertex-ai',
    websiteUrl: 'https://cloud.google.com/vertex-ai',
    modelCount: 15,
    authType: 'enterprise' as const,
  },
  deepseek: {
    name: 'DeepSeek',
    description: 'Best reasoning per dollar',
    logo: '/logos/deepseek.svg',
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    websiteUrl: 'https://platform.deepseek.com',
    modelCount: 4,
    authType: 'api_key' as const,
  },
  mistral: {
    name: 'Mistral AI',
    description: 'European AI efficiency',
    logo: '/logos/mistral.svg',
    keyPlaceholder: 'mistral-...',
    docsUrl: 'https://console.mistral.ai/api-keys',
    websiteUrl: 'https://console.mistral.ai',
    modelCount: 8,
    authType: 'api_key' as const,
  },
  fireworks: {
    name: 'Fireworks AI',
    description: 'Fast inference',
    logo: '/logos/fireworks.svg',
    keyPlaceholder: 'fw_...',
    docsUrl: 'https://fireworks.ai/account/api-keys',
    websiteUrl: 'https://fireworks.ai',
    modelCount: 30,
    authType: 'api_key' as const,
  },
  perplexity: {
    name: 'Perplexity',
    description: 'AI with built-in search',
    logo: '/logos/perplexity.svg',
    keyPlaceholder: 'pplx-...',
    docsUrl: 'https://perplexity.ai/settings/api',
    websiteUrl: 'https://perplexity.ai',
    modelCount: 4,
    authType: 'api_key' as const,
  },
  cohere: {
    name: 'Cohere',
    description: 'Enterprise RAG',
    logo: '/logos/cohere.svg',
    keyPlaceholder: 'co-...',
    docsUrl: 'https://dashboard.cohere.ai/api-keys',
    websiteUrl: 'https://dashboard.cohere.ai',
    modelCount: 6,
    authType: 'api_key' as const,
  },
  xai: {
    name: 'xAI',
    description: 'Grok models',
    logo: '/logos/xai.svg',
    keyPlaceholder: 'xai-...',
    docsUrl: 'https://x.ai/api',
    websiteUrl: 'https://x.ai',
    modelCount: 3,
    authType: 'api_key' as const,
  },
  cerebras: {
    name: 'Cerebras',
    description: 'Ultra-fast inference',
    logo: '/logos/cerebras.svg',
    keyPlaceholder: 'csk-...',
    docsUrl: 'https://cloud.cerebras.ai/platform',
    websiteUrl: 'https://cerebras.ai',
    modelCount: 2,
    authType: 'api_key' as const,
  },
};

export function AISettingsSection({
  preferences,
  providerKeys,
  models,
  userProviders,
  usageSummary,
  budgetStatus,
  loading,
  error,
  onUpdatePreferences,
  onAddProviderKey,
  onRemoveProviderKey,
  onValidateProviderKey,
}: AISettingsSectionProps) {
  const [activeTab, setActiveTab] = useState<'models' | 'keys' | 'limits' | 'usage'>('models');
  const [showKeyInput, setShowKeyInput] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [isValidating, setIsValidating] = useState<string | null>(null);

  // Get provider key status
  const getKeyForProvider = (provider: string): ProviderKey | undefined => {
    return providerKeys.find((k) => k.provider === provider);
  };

  // Handle adding a provider key
  const handleAddKey = async (provider: string) => {
    if (!newKeyValue.trim()) {
      toast.error({ title: 'Error', description: 'Please enter an API key' });
      return;
    }

    setIsAddingKey(true);
    try {
      await onAddProviderKey(provider, newKeyValue);
      setNewKeyValue('');
      setShowKeyInput(null);
      toast.success({
        title: 'API Key Added',
        description: `Your ${PROVIDERS[provider as keyof typeof PROVIDERS]?.name || provider} API key has been saved.`,
      });
    } catch (err) {
      toast.error({
        title: 'Failed to add API key',
        description: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setIsAddingKey(false);
    }
  };

  // Handle removing a provider key
  const handleRemoveKey = async (provider: string) => {
    try {
      await onRemoveProviderKey(provider);
      toast.success({
        title: 'API Key Removed',
        description: `Your ${PROVIDERS[provider as keyof typeof PROVIDERS]?.name || provider} API key has been removed.`,
      });
    } catch (err) {
      toast.error({
        title: 'Failed to remove API key',
        description: err instanceof Error ? err.message : 'An error occurred',
      });
    }
  };

  // Handle validating a provider key
  const handleValidateKey = async (provider: string) => {
    setIsValidating(provider);
    try {
      const result = await onValidateProviderKey(provider);
      if (result.isValid) {
        toast.success({
          title: 'Key Valid',
          description: `Your ${PROVIDERS[provider as keyof typeof PROVIDERS]?.name || provider} API key is working.`,
        });
      } else {
        toast.error({
          title: 'Key Invalid',
          description: result.error || 'The API key could not be validated.',
        });
      }
    } catch (err) {
      toast.error({
        title: 'Validation Failed',
        description: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setIsValidating(null);
    }
  };

  // Handle updating preferences
  const handleUpdatePrefs = async (key: keyof AIPreferences, value: any) => {
    try {
      await onUpdatePreferences({ [key]: value });
      toast.success({ title: 'Preferences Updated' });
    } catch (err) {
      toast.error({
        title: 'Failed to update preferences',
        description: err instanceof Error ? err.message : 'An error occurred',
      });
    }
  };

  // Group models by provider
  const modelsByProvider = models.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, ModelInfo[]>);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b pb-2">
        {[
          { id: 'models', label: 'Model Selection', icon: Cpu },
          { id: 'keys', label: 'API Keys (BYOK)', icon: Key },
          { id: 'limits', label: 'Cost Limits', icon: DollarSign },
          { id: 'usage', label: 'Usage', icon: TrendingUp },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Model Selection Tab */}
      {activeTab === 'models' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Default AI Model
            </CardTitle>
            <CardDescription>
              Choose your preferred AI model for chat and test generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Model Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Model</label>
              <select
                value={preferences?.defaultModel || 'claude-sonnet-4-5'}
                onChange={(e) => handleUpdatePrefs('defaultModel', e.target.value)}
                className="w-full p-2 rounded-md border bg-background"
              >
                {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
                  <optgroup
                    key={provider}
                    label={PROVIDERS[provider as keyof typeof PROVIDERS]?.name || provider}
                  >
                    {providerModels.map((model) => (
                      <option
                        key={model.modelId}
                        value={model.modelId}
                        disabled={!model.isAvailable}
                      >
                        {model.displayName} - ${model.inputPrice}/${model.outputPrice} per 1M
                        {!model.isAvailable && ' (No API key)'}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Display Options */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-medium">Display Options</h4>
              <ToggleRow
                label="Show model in chat"
                description="Display the current model name in the chat interface"
                checked={preferences?.showModelInChat ?? true}
                onChange={(checked) => handleUpdatePrefs('showModelInChat', checked)}
              />
              <ToggleRow
                label="Show token costs"
                description="Display token count and cost for each message"
                checked={preferences?.showTokenCosts ?? true}
                onChange={(checked) => handleUpdatePrefs('showTokenCosts', checked)}
              />
              <ToggleRow
                label="Use platform fallback"
                description="Fall back to Argus's API keys if your key is not configured"
                checked={preferences?.usePlatformKeyFallback ?? true}
                onChange={(checked) => handleUpdatePrefs('usePlatformKeyFallback', checked)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Keys Tab */}
      {activeTab === 'keys' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys (Bring Your Own Key)
            </CardTitle>
            <CardDescription>
              Add your own API keys to use your preferred providers directly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(PROVIDERS).map(([providerId, provider]) => {
              const existingKey = getKeyForProvider(providerId);
              const isShowingInput = showKeyInput === providerId;
              const isEnterprise = provider.authType === 'enterprise';

              return (
                <div
                  key={providerId}
                  className="p-4 rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Cpu className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{provider.name}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                            {provider.modelCount}+ models
                          </span>
                          {isEnterprise && (
                            <span className="px-1.5 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-500">
                              Enterprise
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {provider.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {existingKey ? (
                        <>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-xs',
                              existingKey.isValid
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-red-500/10 text-red-500'
                            )}
                          >
                            {existingKey.isValid ? 'Active' : 'Invalid'}
                          </span>
                          <code className="px-2 py-1 bg-muted rounded text-xs">
                            {existingKey.keyDisplay}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleValidateKey(providerId)}
                            disabled={isValidating === providerId}
                          >
                            {isValidating === providerId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500"
                            onClick={() => handleRemoveKey(providerId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowKeyInput(providerId)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {isEnterprise ? 'Configure' : 'Add Key'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Key Input Form */}
                  {isShowingInput && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {isEnterprise ? (
                        <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                          <p className="text-sm text-muted-foreground">
                            {provider.name} requires enterprise authentication.{' '}
                            <a
                              href={provider.docsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Visit the {provider.name} console
                            </a>{' '}
                            to set up credentials, then enter your API key or service account below.
                          </p>
                        </div>
                      ) : null}
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          value={newKeyValue}
                          onChange={(e) => setNewKeyValue(e.target.value)}
                          placeholder={provider.keyPlaceholder}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => handleAddKey(providerId)}
                          disabled={isAddingKey || !newKeyValue.trim()}
                        >
                          {isAddingKey ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowKeyInput(null);
                            setNewKeyValue('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                      {!isEnterprise && (
                        <p className="text-xs text-muted-foreground">
                          Get your API key from{' '}
                          <a
                            href={provider.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {provider.name} Console
                          </a>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Validation Error */}
                  {existingKey?.validationError && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      {existingKey.validationError}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Cost Limits Tab */}
      {activeTab === 'limits' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Limits
            </CardTitle>
            <CardDescription>
              Set spending limits to control your AI usage costs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Budget Status */}
            {budgetStatus && (
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Today&apos;s Spending</span>
                  <span className="text-lg font-bold">
                    ${budgetStatus.dailySpent.toFixed(2)} / ${budgetStatus.dailyLimit.toFixed(2)}
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      budgetStatus.dailySpent / budgetStatus.dailyLimit > 0.8
                        ? 'bg-red-500'
                        : budgetStatus.dailySpent / budgetStatus.dailyLimit > 0.5
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    )}
                    style={{
                      width: `${Math.min(100, (budgetStatus.dailySpent / budgetStatus.dailyLimit) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ${budgetStatus.dailyRemaining.toFixed(2)} remaining today
                </p>
              </div>
            )}

            {/* Limit Controls */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Daily Spending Limit</label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    step={0.5}
                    value={preferences?.costLimitPerDay ?? 10}
                    onChange={(e) => handleUpdatePrefs('costLimitPerDay', parseFloat(e.target.value))}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">per day</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Per-Message Limit</label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={preferences?.costLimitPerMessage ?? 1}
                    onChange={(e) => handleUpdatePrefs('costLimitPerMessage', parseFloat(e.target.value))}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">per message</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Messages exceeding this limit will show a warning before sending
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage Statistics
            </CardTitle>
            <CardDescription>
              View your AI usage and spending over the past 30 days
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {usageSummary ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold">
                      {usageSummary.totalRequests.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Requests</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold">
                      {((usageSummary.totalInputTokens + usageSummary.totalOutputTokens) / 1000).toFixed(1)}K
                    </div>
                    <div className="text-sm text-muted-foreground">Total Tokens</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-green-500">
                      ${usageSummary.totalCostUsd.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Cost</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-blue-500">
                      ${usageSummary.byokCost.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Your Keys Cost</div>
                  </div>
                </div>

                {/* Usage by Model */}
                {Object.keys(usageSummary.usageByModel).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Usage by Model</h4>
                    <div className="space-y-2">
                      {Object.entries(usageSummary.usageByModel)
                        .sort((a, b) => b[1].cost - a[1].cost)
                        .map(([model, stats]) => (
                          <div
                            key={model}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div>
                              <div className="font-medium">{model}</div>
                              <div className="text-sm text-muted-foreground">
                                {stats.requests.toLocaleString()} requests ·{' '}
                                {(stats.tokens / 1000).toFixed(1)}K tokens
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${stats.cost.toFixed(4)}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Usage by Provider */}
                {Object.keys(usageSummary.usageByProvider).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Usage by Provider</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(usageSummary.usageByProvider)
                        .sort((a, b) => b[1].cost - a[1].cost)
                        .map(([provider, stats]) => (
                          <div key={provider} className="p-3 rounded-lg border">
                            <div className="font-medium capitalize">{provider}</div>
                            <div className="text-sm text-muted-foreground">
                              {stats.requests.toLocaleString()} requests
                            </div>
                            <div className="text-lg font-bold mt-1">${stats.cost.toFixed(2)}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No usage data available yet</p>
                <p className="text-sm">Start using AI features to see your statistics</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
