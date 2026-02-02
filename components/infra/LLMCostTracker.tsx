'use client';

import * as React from 'react';
import { Brain, Cpu, Sparkles, Database, Zap, TrendingUp, Info, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface LLMUsageData {
  // Models used
  models: {
    name: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    requests: number;
  }[];

  // Usage by feature
  features: {
    name: string;
    cost: number;
    percentage: number;
    requests: number;
  }[];

  // Totals
  totalCost: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;

  // Period
  period: string;
}

interface LLMCostTrackerProps {
  data: LLMUsageData | null;
  isLoading?: boolean;
}

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
};

export function LLMCostTracker({ data, isLoading = false }: LLMCostTrackerProps) {
  if (isLoading) {
    return <LLMCostTrackerSkeleton />;
  }

  if (!data) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatTokens = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
    return value.toString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-info" />
              AI / LLM Cost Tracking
            </CardTitle>
            <CardDescription>
              Token usage and costs across all AI features ({data.period})
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total AI Cost</p>
            <p className="text-2xl font-bold text-info">
              {formatCurrency(data.totalCost)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Total Requests</p>
            <p className="text-xl font-bold">{data.totalRequests.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Input Tokens</p>
            <p className="text-xl font-bold">{formatTokens(data.totalInputTokens)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Output Tokens</p>
            <p className="text-xl font-bold">{formatTokens(data.totalOutputTokens)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Avg Cost/Request</p>
            <p className="text-xl font-bold">
              {formatCurrency(data.totalCost / Math.max(data.totalRequests, 1))}
            </p>
          </div>
        </div>

        {/* Model Usage */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Usage by Model
          </h4>
          <div className="space-y-2">
            {data.models.map((model) => (
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
                    {formatTokens(model.inputTokens)} in / {formatTokens(model.outputTokens)} out
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Usage */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Usage by Feature
          </h4>
          <div className="space-y-2">
            {data.features.map((feature) => (
              <div key={feature.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {featureIcons[feature.name] || <Info className="h-4 w-4" />}
                    <span className="text-sm">{feature.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {feature.requests.toLocaleString()} requests
                    </span>
                    <span className="font-medium">{formatCurrency(feature.cost)}</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-info/70 rounded-full transition-all duration-500"
                    style={{ width: `${feature.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Tips */}
        <div className="p-4 rounded-lg bg-info/5 border border-info/20">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-info">
            <Info className="h-4 w-4" />
            OpenRouter: One API, All Models
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• <strong>Single API key</strong> for 300+ models (no provider juggling)</li>
            <li>• <strong>DeepSeek</strong> for code/tests ($0.14/1M - 95% cheaper than Claude)</li>
            <li>• <strong>DeepSeek R1</strong> for reasoning (10% cost of o1)</li>
            <li>• <strong>Qwen/Gemini Flash-Lite</strong> for trivial tasks ($0.10/1M)</li>
            <li>• <strong>Claude</strong> only for Computer Use (browser automation)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export function LLMCostTrackerSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-72 bg-muted animate-pulse rounded mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/50">
              <div className="h-3 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-6 w-20 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
