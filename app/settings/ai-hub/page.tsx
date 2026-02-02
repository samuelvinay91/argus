'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Plug,
  DollarSign,
  Activity,
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Zap,
  Brain,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useAISettings,
  useProviders,
  useAIUsageSummary,
} from '@/lib/hooks/use-ai-settings';

// Quick stat card component
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  loading?: boolean;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default',
  loading = false,
}: StatCardProps) {
  const variantStyles = {
    default: 'border-border',
    success: 'border-green-500/30 bg-green-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    error: 'border-red-500/30 bg-red-500/5',
  };

  const iconVariantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-500',
    warning: 'bg-yellow-500/10 text-yellow-500',
    error: 'bg-red-500/10 text-red-500',
  };

  if (loading) {
    return (
      <Card className={cn('relative overflow-hidden', variantStyles[variant])}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('relative overflow-hidden transition-all hover:shadow-md', variantStyles[variant])}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {trend && trendValue && (
                <span
                  className={cn(
                    'flex items-center text-xs font-medium',
                    trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
                  )}
                >
                  {trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                  ) : trend === 'down' ? (
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                  ) : null}
                  {trendValue}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', iconVariantStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Smart recommendation component
interface RecommendationProps {
  title: string;
  description: string;
  action: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  priority: 'high' | 'medium' | 'low';
}

function RecommendationCard({
  title,
  description,
  action,
  href,
  icon: Icon,
  priority,
}: RecommendationProps) {
  const priorityStyles = {
    high: 'border-l-red-500',
    medium: 'border-l-yellow-500',
    low: 'border-l-blue-500',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 rounded-lg border border-l-4 bg-card hover:bg-accent/50 transition-colors',
        priorityStyles[priority]
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Button variant="ghost" size="sm" asChild className="shrink-0">
        <Link href={href}>
          {action}
          <ChevronRight className="h-3 w-3 ml-1" />
        </Link>
      </Button>
    </div>
  );
}

// Mini usage chart placeholder
function UsagePreviewChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);

  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((value, index) => (
        <div
          key={index}
          className="flex-1 bg-primary/20 rounded-t transition-all hover:bg-primary/40"
          style={{ height: `${(value / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

export default function AIHubDashboard() {
  // Fetch AI settings data
  const {
    preferences,
    providerKeys,
    models,
    usageSummary,
    budgetStatus,
    isLoading: aiSettingsLoading,
  } = useAISettings();

  const { data: providers = [], isLoading: providersLoading } = useProviders();
  const { data: dailyUsage, isLoading: usageLoading } = useAIUsageSummary('day');

  const isLoading = aiSettingsLoading || providersLoading || usageLoading;

  // Calculate stats - use defensive array checks
  const stats = useMemo(() => {
    const modelsArray = Array.isArray(models) ? models : [];
    const providerKeysArray = Array.isArray(providerKeys) ? providerKeys : [];
    const providersArray = Array.isArray(providers) ? providers : [];

    const availableModels = modelsArray.filter((m) => m.isAvailable).length;
    const totalModels = modelsArray.length;
    const connectedProviders = providerKeysArray.filter((k) => k.isValid).length;
    const totalProviders = providersArray.length;
    const todaySpend = dailyUsage?.totalCostUsd ?? 0;
    const dailyBudget = budgetStatus?.dailyLimit ?? 10;
    const budgetUsedPercent = dailyBudget > 0 ? (todaySpend / dailyBudget) * 100 : 0;

    // System availability (based on provider status)
    const operationalProviders = providersArray.filter((p) => p.status === 'operational').length;
    const systemAvailability = totalProviders > 0
      ? Math.round((operationalProviders / totalProviders) * 100)
      : 100;

    return {
      availableModels,
      totalModels,
      connectedProviders,
      totalProviders,
      todaySpend,
      dailyBudget,
      budgetUsedPercent,
      systemAvailability,
    };
  }, [models, providerKeys, providers, dailyUsage, budgetStatus]);

  // Generate recommendations based on current state
  const recommendations = useMemo(() => {
    const recs: RecommendationProps[] = [];
    const providerKeysArray = Array.isArray(providerKeys) ? providerKeys : [];
    const modelsArray = Array.isArray(models) ? models : [];

    // No provider keys configured
    if (providerKeysArray.length === 0) {
      recs.push({
        title: 'Add your first API key',
        description: 'Connect a provider like OpenAI or Anthropic to unlock all AI features.',
        action: 'Add Key',
        href: '/settings/ai-hub/providers',
        icon: Plug,
        priority: 'high',
      });
    }

    // Budget running low
    if (stats.budgetUsedPercent > 80) {
      recs.push({
        title: 'Budget running low',
        description: `You've used ${stats.budgetUsedPercent.toFixed(0)}% of today's budget.`,
        action: 'Adjust',
        href: '/settings/ai-hub/budget',
        icon: DollarSign,
        priority: stats.budgetUsedPercent > 95 ? 'high' : 'medium',
      });
    }

    // Invalid provider keys
    const invalidKeys = providerKeysArray.filter((k) => !k.isValid);
    if (invalidKeys.length > 0) {
      recs.push({
        title: 'Fix invalid API keys',
        description: `${invalidKeys.length} API key${invalidKeys.length > 1 ? 's' : ''} need${invalidKeys.length === 1 ? 's' : ''} attention.`,
        action: 'Review',
        href: '/settings/ai-hub/providers',
        icon: AlertCircle,
        priority: 'high',
      });
    }

    // Suggest optimizing model selection
    if (modelsArray.length > 0 && !preferences?.defaultModel) {
      recs.push({
        title: 'Set a default model',
        description: 'Choose your preferred AI model for faster interactions.',
        action: 'Configure',
        href: '/settings/ai-hub/models',
        icon: Brain,
        priority: 'medium',
      });
    }

    // Suggest routing rules if using multiple providers
    if (stats.connectedProviders > 1) {
      recs.push({
        title: 'Configure smart routing',
        description: 'Set up rules to optimize cost and performance across providers.',
        action: 'Setup',
        href: '/settings/ai-hub/routing',
        icon: Zap,
        priority: 'low',
      });
    }

    return recs.slice(0, 3); // Limit to 3 recommendations
  }, [providerKeys, stats, models, preferences]);

  // Get current active model info
  const activeModel = useMemo(() => {
    const defaultModelId = preferences?.defaultModel;
    if (!defaultModelId) return null;
    return models.find((m) => m.modelId === defaultModelId);
  }, [preferences, models]);

  // Mock usage data for chart (last 7 days)
  const usageChartData = [12, 19, 15, 25, 22, 30, 28];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Models Available"
          value={isLoading ? '...' : stats.availableModels}
          subtitle={`of ${stats.totalModels} total`}
          icon={Cpu}
          loading={isLoading}
        />
        <StatCard
          title="Providers Connected"
          value={isLoading ? '...' : stats.connectedProviders}
          subtitle={`of ${stats.totalProviders} supported`}
          icon={Plug}
          variant={stats.connectedProviders === 0 ? 'warning' : 'default'}
          loading={isLoading}
        />
        <StatCard
          title="Today's Spend"
          value={isLoading ? '...' : `$${stats.todaySpend.toFixed(2)}`}
          subtitle={`of $${stats.dailyBudget.toFixed(2)} budget`}
          icon={DollarSign}
          trend={stats.budgetUsedPercent > 80 ? 'up' : 'neutral'}
          trendValue={`${stats.budgetUsedPercent.toFixed(0)}%`}
          variant={stats.budgetUsedPercent > 90 ? 'error' : stats.budgetUsedPercent > 70 ? 'warning' : 'default'}
          loading={isLoading}
        />
        <StatCard
          title="System Availability"
          value={isLoading ? '...' : `${stats.systemAvailability}%`}
          subtitle="All providers operational"
          icon={Activity}
          variant={stats.systemAvailability < 100 ? 'warning' : 'success'}
          loading={isLoading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Smart Recommendations */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Smart Recommendations</CardTitle>
                </div>
                {recommendations.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {recommendations.length} action{recommendations.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <CardDescription>
                Personalized suggestions to optimize your AI setup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </>
              ) : recommendations.length > 0 ? (
                recommendations.map((rec, index) => (
                  <RecommendationCard key={index} {...rec} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 mb-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="text-sm font-medium">All set!</p>
                  <p className="text-xs text-muted-foreground">Your AI configuration looks great.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Active Model Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Active Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : activeModel ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">{activeModel.displayName}</p>
                    <p className="text-sm text-muted-foreground capitalize">{activeModel.provider}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-full bg-muted">
                      ${activeModel.inputPrice}/1M input
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-muted">
                      ${activeModel.outputPrice}/1M output
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {activeModel.capabilities?.slice(0, 4).map((cap) => (
                      <Badge key={cap} variant="outline" className="text-xs capitalize">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                    <Link href="/settings/ai-hub/models">
                      Change Model
                      <ArrowRight className="h-3 w-3 ml-2" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">No model selected</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/settings/ai-hub/models">
                      Select Model
                      <ArrowRight className="h-3 w-3 ml-2" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage Preview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Usage Preview
                </CardTitle>
                <Link
                  href="/settings/ai-hub/usage"
                  className="text-xs text-primary hover:underline"
                >
                  View details
                </Link>
              </div>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <>
                  <UsagePreviewChart data={usageChartData} />
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span>Mon</span>
                    <span>Today</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
