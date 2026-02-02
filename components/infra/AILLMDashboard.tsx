'use client';

import * as React from 'react';
import { useMemo } from 'react';
import Link from 'next/link';
import {
  Brain,
  Cpu,
  Sparkles,
  Database,
  Zap,
  TrendingUp,
  TrendingDown,
  Info,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ArrowRight,
  DollarSign,
  Activity,
  Gauge,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  useProviders,
  useProviderStatus,
  useAISettings,
  type ProviderInfo,
  type ProviderStatus,
} from '@/lib/hooks/use-ai-settings';

// ============================================================================
// Types
// ============================================================================

export interface LLMUsageData {
  models: {
    name: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    requests: number;
  }[];
  features: {
    name: string;
    cost: number;
    percentage: number;
    requests: number;
  }[];
  totalCost: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  period: string;
}

interface AILLMDashboardProps {
  usageData: LLMUsageData | null;
  isLoading?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const featureIcons: Record<string, React.ReactNode> = {
  'Test Generation': <Sparkles className="h-4 w-4" />,
  'Self-Healing': <Zap className="h-4 w-4" />,
  'Code Analysis': <Cpu className="h-4 w-4" />,
  'Infra Optimization': <TrendingUp className="h-4 w-4" />,
  'Embeddings': <Database className="h-4 w-4" />,
  'Computer Use': <Monitor className="h-4 w-4" />,
  'Chat': <Brain className="h-4 w-4" />,
};

const providerColors: Record<string, string> = {
  anthropic: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  openai: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  google: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  deepseek: 'bg-violet-500/10 text-violet-600 border-violet-500/30',
  cerebras: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
  groq: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  openrouter: 'bg-pink-500/10 text-pink-600 border-pink-500/30',
  mistral: 'bg-red-500/10 text-red-600 border-red-500/30',
  together: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
  fireworks: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  perplexity: 'bg-teal-500/10 text-teal-600 border-teal-500/30',
  cohere: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  xai: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
};

const statusColors: Record<ProviderStatus, string> = {
  operational: 'text-green-500',
  degraded: 'text-yellow-500',
  outage: 'text-red-500',
  maintenance: 'text-blue-500',
  unknown: 'text-gray-400',
};

const statusBgColors: Record<ProviderStatus, string> = {
  operational: 'bg-green-500',
  degraded: 'bg-yellow-500',
  outage: 'bg-red-500',
  maintenance: 'bg-blue-500',
  unknown: 'bg-gray-400',
};

// Provider pricing (per 1M tokens, approximate)
const PROVIDER_PRICING: Record<string, { input: number; output: number; highlight?: string }> = {
  openrouter: { input: 0, output: 0, highlight: '400+ models, pass-through pricing' },
  anthropic: { input: 3.0, output: 15.0, highlight: 'Best for Computer Use' },
  openai: { input: 2.5, output: 10.0, highlight: 'GPT-4o, o1 reasoning' },
  google: { input: 0.075, output: 0.30, highlight: 'Gemini Flash - very cheap' },
  groq: { input: 0.05, output: 0.08, highlight: 'Ultra-fast Llama' },
  together: { input: 0.20, output: 0.60, highlight: 'Open source models' },
  deepseek: { input: 0.14, output: 0.28, highlight: 'Best value for code' },
  mistral: { input: 0.04, output: 0.12, highlight: 'European, efficient' },
  fireworks: { input: 0.20, output: 0.80, highlight: 'Fast inference' },
  cerebras: { input: 0.10, output: 0.10, highlight: 'Fastest inference' },
  perplexity: { input: 0.20, output: 0.20, highlight: 'Built-in search' },
  cohere: { input: 0.50, output: 1.50, highlight: 'Enterprise RAG' },
  xai: { input: 2.0, output: 10.0, highlight: 'Real-time data' },
};

// ============================================================================
// Sub-components
// ============================================================================

function StatusDot({ status }: { status: ProviderStatus }) {
  return (
    <span className="relative flex h-2 w-2">
      {status === 'operational' && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      )}
      <span className={cn('relative inline-flex rounded-full h-2 w-2', statusBgColors[status])} />
    </span>
  );
}

function ProviderStatusCard({ provider }: { provider: ProviderInfo }) {
  const { data: statusData } = useProviderStatus(provider.id);
  const status = statusData?.status || provider.status || 'unknown';
  const latency = statusData?.latency_ms;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors">
      <div className="flex items-center gap-3">
        <StatusDot status={status} />
        <div>
          <p className="font-medium text-sm">{provider.display_name || provider.name}</p>
          <p className="text-xs text-muted-foreground">
            {provider.models_count}+ models
          </p>
        </div>
      </div>
      <div className="text-right">
        <Badge
          variant="outline"
          className={cn('text-xs capitalize', statusColors[status])}
        >
          {status}
        </Badge>
        {latency != null && (
          <p className="text-xs text-muted-foreground mt-1">
            {latency}ms
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AILLMDashboard({ usageData, isLoading = false }: AILLMDashboardProps) {
  const { data: providers, isLoading: providersLoading } = useProviders();
  const { providerKeys } = useAISettings();

  // Get connected providers
  const connectedProviderIds = useMemo(() => {
    const keys = Array.isArray(providerKeys) ? providerKeys : [];
    return new Set(keys.map((k) => k.provider));
  }, [providerKeys]);

  const providersArray = Array.isArray(providers) ? providers : [];

  const connectedProviders = providersArray.filter((p) => connectedProviderIds.has(p.id));
  const availableProviders = providersArray.filter((p) => !connectedProviderIds.has(p.id));

  // Calculate cost stats
  const costStats = useMemo(() => {
    if (!usageData) return null;

    const avgCostPerRequest = usageData.totalCost / Math.max(usageData.totalRequests, 1);
    const tokensPerDollar = (usageData.totalInputTokens + usageData.totalOutputTokens) / Math.max(usageData.totalCost, 0.01);

    // Find most expensive and cheapest models
    const sortedModels = [...usageData.models].sort((a, b) => b.cost - a.cost);
    const topModel = sortedModels[0];
    const cheapestModel = sortedModels[sortedModels.length - 1];

    return {
      avgCostPerRequest,
      tokensPerDollar,
      topModel,
      cheapestModel,
    };
  }, [usageData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatTokens = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toString();
  };

  if (isLoading || providersLoading) {
    return <AILLMDashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total AI Cost</p>
                <p className="text-2xl font-bold">{formatCurrency(usageData?.totalCost || 0)}</p>
                <p className="text-xs text-muted-foreground">{usageData?.period || 'This period'}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Connected Providers</p>
                <p className="text-2xl font-bold">{connectedProviders.length}</p>
                <p className="text-xs text-muted-foreground">of {providersArray.length} available</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{(usageData?.totalRequests || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(costStats?.avgCostPerRequest || 0)}/request
                </p>
              </div>
              <Gauge className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tokens Used</p>
                <p className="text-2xl font-bold">
                  {formatTokens((usageData?.totalInputTokens || 0) + (usageData?.totalOutputTokens || 0))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTokens(usageData?.totalInputTokens || 0)} in / {formatTokens(usageData?.totalOutputTokens || 0)} out
                </p>
              </div>
              <Brain className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Health Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Provider Status
              </CardTitle>
              <CardDescription>
                Real-time health monitoring of your connected AI providers
              </CardDescription>
            </div>
            <Link href="/settings/ai-hub/providers">
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-2" />
                Manage Providers
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {connectedProviders.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">No providers connected yet</p>
              <Link href="/settings/ai-hub/providers">
                <Button>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Add Your First Provider
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {connectedProviders.map((provider) => (
                <ProviderStatusCard key={provider.id} provider={provider} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Usage by Model
            </CardTitle>
            <CardDescription>Token usage and costs per model</CardDescription>
          </CardHeader>
          <CardContent>
            {!usageData?.models?.length ? (
              <p className="text-center text-muted-foreground py-4">No usage data yet</p>
            ) : (
              <div className="space-y-3">
                {usageData.models.slice(0, 5).map((model) => (
                  <div
                    key={model.name}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={cn('text-xs', providerColors[model.provider] || 'bg-muted')}
                      >
                        {model.provider}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{model.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {model.requests.toLocaleString()} requests
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(model.cost)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTokens(model.inputTokens + model.outputTokens)} tokens
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Usage by Feature
            </CardTitle>
            <CardDescription>AI cost breakdown by feature</CardDescription>
          </CardHeader>
          <CardContent>
            {!usageData?.features?.length ? (
              <p className="text-center text-muted-foreground py-4">No usage data yet</p>
            ) : (
              <div className="space-y-4">
                {usageData.features.map((feature) => (
                  <div key={feature.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {featureIcons[feature.name] || <Info className="h-4 w-4" />}
                        <span className="text-sm font-medium">{feature.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {feature.requests.toLocaleString()} requests
                        </span>
                        <span className="font-semibold">{formatCurrency(feature.cost)}</span>
                      </div>
                    </div>
                    <Progress value={feature.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Provider Pricing Comparison */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Provider Pricing Comparison
              </CardTitle>
              <CardDescription>
                Compare pricing across providers (per 1M tokens)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Provider</th>
                  <th className="text-right py-2 px-3 font-medium">Input</th>
                  <th className="text-right py-2 px-3 font-medium">Output</th>
                  <th className="text-left py-2 px-3 font-medium">Highlight</th>
                  <th className="text-center py-2 px-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(PROVIDER_PRICING).slice(0, 8).map(([id, pricing]) => {
                  const isConnected = connectedProviderIds.has(id);
                  const provider = providersArray.find((p) => p.id === id);

                  return (
                    <tr key={id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn('text-xs', providerColors[id] || 'bg-muted')}
                          >
                            {id}
                          </Badge>
                          {isConnected && (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {pricing.input === 0 ? 'varies' : `$${pricing.input.toFixed(2)}`}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {pricing.output === 0 ? 'varies' : `$${pricing.output.toFixed(2)}`}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">
                        {pricing.highlight}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {isConnected ? (
                          <Badge variant="outline" className="text-green-500 border-green-500/30">
                            Connected
                          </Badge>
                        ) : (
                          <Link href="/settings/ai-hub/providers">
                            <Button variant="ghost" size="sm" className="h-6 text-xs">
                              Add
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cost Optimization Tips */}
      <Card className="border-info/30 bg-info/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-info">
            <TrendingDown className="h-5 w-5" />
            Cost Optimization Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-background border">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-pink-500" />
                Use OpenRouter
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Single API key for 400+ models. No markup, automatic failover.
              </p>
              {!connectedProviderIds.has('openrouter') && (
                <Link href="/settings/ai-hub/providers">
                  <Button size="sm" variant="outline">
                    Add OpenRouter
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>

            <div className="p-4 rounded-lg bg-background border">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-violet-500" />
                DeepSeek for Code
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                95% cheaper than Claude for code generation. $0.14/1M tokens.
              </p>
              {!connectedProviderIds.has('deepseek') && !connectedProviderIds.has('openrouter') && (
                <Link href="/settings/ai-hub/providers">
                  <Button size="sm" variant="outline">
                    Add DeepSeek
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>

            <div className="p-4 rounded-lg bg-background border">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Gauge className="h-4 w-4 text-amber-500" />
                Groq for Speed
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Ultra-fast Llama inference. 10x faster than other providers.
              </p>
              {!connectedProviderIds.has('groq') && (
                <Link href="/settings/ai-hub/providers">
                  <Button size="sm" variant="outline">
                    Add Groq
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>

            <div className="p-4 rounded-lg bg-background border">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Monitor className="h-4 w-4 text-orange-500" />
                Claude for Computer Use
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Only Claude supports browser automation. Use cheaper models for other tasks.
              </p>
              {!connectedProviderIds.has('anthropic') && (
                <Link href="/settings/ai-hub/providers">
                  <Button size="sm" variant="outline">
                    Add Anthropic
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Link to AI Hub */}
      <div className="flex justify-center">
        <Link href="/settings/ai-hub">
          <Button variant="outline" size="lg">
            <Settings2 className="h-4 w-4 mr-2" />
            Advanced AI Configuration
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function AILLMDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-4 w-20 bg-muted animate-pulse rounded mb-2" />
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="h-6 w-40 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
