'use client';

import { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Lightbulb,
  Zap,
  AlertTriangle,
  Check,
  X,
  ChevronRight,
  PieChart as PieChartIcon,
  BarChart3,
  Settings,
  Sparkles,
  ArrowRight,
  Bell,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/hooks/useToast';
import { LoadingSpinner, Toggle, ToggleRow } from '../../components/settings-ui';
import {
  useAISettings,
  useAIUsageSummary,
  useAIUsage,
  type AIPreferences,
  type UsageSummary,
  type DailyUsage,
} from '@/lib/hooks/use-ai-settings';

// ============================================================================
// Types
// ============================================================================

interface OptimizationRecommendation {
  id: string;
  title: string;
  description: string;
  currentCost: number;
  projectedCost: number;
  savingsAmount: number;
  savingsPercent: number;
  impact: 'high' | 'medium' | 'low';
  category: 'model' | 'usage' | 'config';
  actionLabel: string;
  actionDetails?: {
    fromModel?: string;
    toModel?: string;
    fromProvider?: string;
    toProvider?: string;
    setting?: string;
    settingValue?: any;
  };
}

interface TierBreakdown {
  tier: 'premium' | 'standard' | 'value' | 'flash';
  name: string;
  cost: number;
  requests: number;
  color: string;
}

interface TaskTypeBreakdown {
  taskType: string;
  cost: number;
  requests: number;
  percentage: number;
}

interface BudgetControls {
  dailyLimit: number;
  perMessageLimit: number;
  alertThreshold: number;
  autoDowngrade: boolean;
  alertsEnabled: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const TIER_COLORS = {
  premium: '#8b5cf6',   // Purple - Claude Opus, GPT-4
  standard: '#3b82f6',  // Blue - Claude Sonnet, GPT-4o
  value: '#22c55e',     // Green - Claude Haiku, GPT-4o-mini
  flash: '#f59e0b',     // Amber - Flash/budget models
};

const TIER_NAMES = {
  premium: 'Premium',
  standard: 'Standard',
  value: 'Value',
  flash: 'Flash',
};

const TIER_MODELS: Record<string, 'premium' | 'standard' | 'value' | 'flash'> = {
  'claude-opus-4-5': 'premium',
  'claude-opus-4': 'premium',
  'gpt-4-turbo': 'premium',
  'gpt-4': 'premium',
  'o1-preview': 'premium',
  'o1': 'premium',
  'claude-sonnet-4-5': 'standard',
  'claude-sonnet-4': 'standard',
  'gpt-4o': 'standard',
  'gemini-2.0-pro': 'standard',
  'claude-haiku-4': 'value',
  'gpt-4o-mini': 'value',
  'gemini-2.0-flash': 'value',
  'gemini-1.5-flash': 'flash',
  'llama-3.1-8b': 'flash',
  'mixtral-8x7b': 'flash',
};

const IMPACT_BADGES = {
  high: { label: 'High Impact', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  medium: { label: 'Medium Impact', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  low: { label: 'Low Impact', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getModelTier(modelId: string): 'premium' | 'standard' | 'value' | 'flash' {
  // Check exact matches first
  if (TIER_MODELS[modelId]) {
    return TIER_MODELS[modelId];
  }

  // Check partial matches
  const modelLower = modelId.toLowerCase();
  if (modelLower.includes('opus') || modelLower.includes('o1')) return 'premium';
  if (modelLower.includes('sonnet') || modelLower.includes('4o') && !modelLower.includes('mini')) return 'standard';
  if (modelLower.includes('haiku') || modelLower.includes('mini') || modelLower.includes('flash')) return 'value';
  return 'flash';
}

function calculateTierBreakdown(usageByModel: Record<string, { requests: number; tokens: number; cost: number }>): TierBreakdown[] {
  const breakdown: Record<string, { cost: number; requests: number }> = {
    premium: { cost: 0, requests: 0 },
    standard: { cost: 0, requests: 0 },
    value: { cost: 0, requests: 0 },
    flash: { cost: 0, requests: 0 },
  };

  Object.entries(usageByModel).forEach(([model, stats]) => {
    const tier = getModelTier(model);
    breakdown[tier].cost += stats.cost;
    breakdown[tier].requests += stats.requests;
  });

  return Object.entries(breakdown)
    .filter(([_, data]) => data.cost > 0)
    .map(([tier, data]) => ({
      tier: tier as TierBreakdown['tier'],
      name: TIER_NAMES[tier as keyof typeof TIER_NAMES],
      cost: data.cost,
      requests: data.requests,
      color: TIER_COLORS[tier as keyof typeof TIER_COLORS],
    }))
    .sort((a, b) => b.cost - a.cost);
}

function generateRecommendations(
  usageSummary: UsageSummary | null,
  preferences: AIPreferences | null,
  dailyUsage: DailyUsage[]
): OptimizationRecommendation[] {
  if (!usageSummary || !preferences) return [];

  const recommendations: OptimizationRecommendation[] = [];
  const { usage_by_model, total_cost_usd } = usageSummary;

  // Recommendation 1: Switch from Premium to Standard tier for general tasks
  const premiumCost = Object.entries(usage_by_model)
    .filter(([model]) => getModelTier(model) === 'premium')
    .reduce((sum, [_, stats]) => sum + stats.cost, 0);

  if (premiumCost > total_cost_usd * 0.3) {
    const projectedSavings = premiumCost * 0.6; // Standard is ~40% of premium cost
    recommendations.push({
      id: 'switch-to-standard',
      title: 'Switch general tasks to Standard tier',
      description: 'You\'re using premium models (Opus, GPT-4) for tasks that could be handled by standard models (Sonnet, GPT-4o) with similar quality.',
      currentCost: premiumCost,
      projectedCost: premiumCost - projectedSavings,
      savingsAmount: projectedSavings,
      savingsPercent: (projectedSavings / premiumCost) * 100,
      impact: 'high',
      category: 'model',
      actionLabel: 'Update default model',
      actionDetails: {
        fromModel: 'claude-opus-4-5',
        toModel: 'claude-sonnet-4-5',
      },
    });
  }

  // Recommendation 2: Use Value tier for simple tasks
  const standardCost = Object.entries(usage_by_model)
    .filter(([model]) => getModelTier(model) === 'standard')
    .reduce((sum, [_, stats]) => sum + stats.cost, 0);

  if (standardCost > total_cost_usd * 0.4) {
    const projectedSavings = standardCost * 0.5; // Value is ~50% cheaper
    recommendations.push({
      id: 'use-value-for-simple',
      title: 'Use Value tier for simple queries',
      description: 'Enable auto-routing to use faster, cheaper models (Haiku, GPT-4o-mini) for straightforward questions and simple code tasks.',
      currentCost: standardCost,
      projectedCost: standardCost - projectedSavings,
      savingsAmount: projectedSavings,
      savingsPercent: (projectedSavings / standardCost) * 100,
      impact: 'medium',
      category: 'config',
      actionLabel: 'Enable smart routing',
      actionDetails: {
        setting: 'smart_routing',
        settingValue: true,
      },
    });
  }

  // Recommendation 3: Set daily budget limit if not set
  if (!preferences.cost_limit_per_day || preferences.cost_limit_per_day > 50) {
    const avgDailyCost = dailyUsage.length > 0
      ? dailyUsage.reduce((sum, d) => sum + d.total_cost_usd, 0) / dailyUsage.length
      : total_cost_usd / 30;

    const suggestedLimit = Math.ceil(avgDailyCost * 1.2);
    recommendations.push({
      id: 'set-daily-limit',
      title: 'Set a daily spending limit',
      description: `Based on your usage patterns, a daily limit of ${formatCurrency(suggestedLimit)} would prevent unexpected cost spikes while allowing normal usage.`,
      currentCost: avgDailyCost * 30,
      projectedCost: suggestedLimit * 30,
      savingsAmount: (avgDailyCost * 30) - (suggestedLimit * 30) > 0 ? (avgDailyCost * 30) - (suggestedLimit * 30) : avgDailyCost * 0.1 * 30,
      savingsPercent: 10,
      impact: 'low',
      category: 'config',
      actionLabel: 'Set daily limit',
      actionDetails: {
        setting: 'cost_limit_per_day',
        settingValue: suggestedLimit,
      },
    });
  }

  // Recommendation 4: Enable auto-downgrade when approaching limits
  if (total_cost_usd > 10 && !preferences.use_platform_key_fallback) {
    recommendations.push({
      id: 'enable-auto-downgrade',
      title: 'Enable automatic tier downgrade',
      description: 'Automatically switch to cheaper models when approaching your budget limit to ensure you can continue working.',
      currentCost: total_cost_usd,
      projectedCost: total_cost_usd * 0.85,
      savingsAmount: total_cost_usd * 0.15,
      savingsPercent: 15,
      impact: 'medium',
      category: 'config',
      actionLabel: 'Enable auto-downgrade',
      actionDetails: {
        setting: 'auto_downgrade',
        settingValue: true,
      },
    });
  }

  // Recommendation 5: Consolidate to a single provider for volume discounts
  const providerCount = Object.keys(usageSummary.usage_by_provider).length;
  if (providerCount > 2 && total_cost_usd > 50) {
    const topProvider = Object.entries(usageSummary.usage_by_provider)
      .sort((a, b) => b[1].cost - a[1].cost)[0];

    if (topProvider) {
      recommendations.push({
        id: 'consolidate-providers',
        title: 'Consolidate to fewer providers',
        description: `You're using ${providerCount} providers. Consolidating usage to ${topProvider[0]} could qualify you for volume discounts.`,
        currentCost: total_cost_usd,
        projectedCost: total_cost_usd * 0.95,
        savingsAmount: total_cost_usd * 0.05,
        savingsPercent: 5,
        impact: 'low',
        category: 'usage',
        actionLabel: 'View provider settings',
        actionDetails: {
          fromProvider: 'multiple',
          toProvider: topProvider[0],
        },
      });
    }
  }

  return recommendations.sort((a, b) => b.savingsAmount - a.savingsAmount);
}

// ============================================================================
// Components
// ============================================================================

function SpendingPieChart({ data, total }: { data: TierBreakdown[]; total: number }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <PieChartIcon className="h-12 w-12 mb-3 opacity-50" />
        <p>No spending data available</p>
        <p className="text-sm">Start using AI features to see your breakdown</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = ((item.cost / total) * 100).toFixed(1);
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium">{item.name} Tier</p>
          <p className="text-lg font-bold">{formatCurrency(item.cost)}</p>
          <p className="text-sm text-muted-foreground">
            {percentage}% of total ({item.requests.toLocaleString()} requests)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      <div className="w-full lg:w-1/2 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="cost"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full lg:w-1/2 space-y-3">
        {data.map((item) => (
          <div key={item.tier} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground">
                ({item.requests.toLocaleString()} requests)
              </span>
            </div>
            <div className="text-right">
              <span className="font-medium">{formatCurrency(item.cost)}</span>
              <span className="text-muted-foreground text-xs ml-2">
                ({formatPercent((item.cost / total) * 100)})
              </span>
            </div>
          </div>
        ))}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({
  recommendation,
  onApply,
  onDismiss,
  isApplying,
}: {
  recommendation: OptimizationRecommendation;
  onApply: () => void;
  onDismiss: () => void;
  isApplying: boolean;
}) {
  const impactBadge = IMPACT_BADGES[recommendation.impact];

  return (
    <Card className="relative overflow-hidden">
      <div
        className={cn(
          'absolute top-0 left-0 w-1 h-full',
          recommendation.impact === 'high' && 'bg-green-500',
          recommendation.impact === 'medium' && 'bg-yellow-500',
          recommendation.impact === 'low' && 'bg-gray-400'
        )}
      />
      <CardContent className="p-5 pl-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              <h4 className="font-semibold truncate">{recommendation.title}</h4>
              <Badge
                variant="outline"
                className={cn('flex-shrink-0', impactBadge.className)}
              >
                {impactBadge.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {recommendation.description}
            </p>

            {/* Cost comparison */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Current</div>
                <div className="font-medium">{formatCurrency(recommendation.currentCost)}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Projected</div>
                <div className="font-medium text-green-600">{formatCurrency(recommendation.projectedCost)}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-xs text-muted-foreground">Savings</div>
                <div className="font-bold text-green-600">
                  {formatCurrency(recommendation.savingsAmount)}
                  <span className="text-xs font-normal ml-1">
                    ({formatPercent(recommendation.savingsPercent)})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Dismiss
          </Button>
          <Button
            size="sm"
            onClick={onApply}
            disabled={isApplying}
            className="bg-green-600 hover:bg-green-700"
          >
            {isApplying ? (
              <span className="animate-spin mr-1">...</span>
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            {recommendation.actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetProgressBar({
  spent,
  limit,
  label,
}: {
  spent: number;
  limit: number;
  label: string;
}) {
  const percentage = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  const isWarning = percentage > 50;
  const isDanger = percentage > 80;

  // Determine status message for screen readers
  const statusMessage = isDanger
    ? 'Budget warning: approaching limit'
    : isWarning
    ? 'Budget caution: over 50% used'
    : 'Budget status: normal';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {formatCurrency(spent)} / {formatCurrency(limit)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${formatPercent(percentage)} used`}
        className="w-full h-2 bg-muted rounded-full overflow-hidden"
      >
        <div
          className={cn(
            'h-full transition-all duration-300',
            isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatPercent(percentage)} used</span>
        <span>{formatCurrency(limit - spent)} remaining</span>
      </div>
      {/* Screen reader announcement for budget changes */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage}. {formatPercent(percentage)} of budget used. {formatCurrency(limit - spent)} remaining.
      </span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function CostOptimizerPage() {
  // State for budget controls
  const [budgetControls, setBudgetControls] = useState<BudgetControls>({
    dailyLimit: 10,
    perMessageLimit: 1,
    alertThreshold: 80,
    autoDowngrade: false,
    alertsEnabled: true,
  });
  const [dismissedRecommendations, setDismissedRecommendations] = useState<Set<string>>(new Set());
  const [applyingRecommendation, setApplyingRecommendation] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'recommendations' | 'controls'>('analysis');

  // Fetch AI settings and usage data
  const {
    preferences,
    usageSummary,
    budgetStatus,
    isLoading,
    error,
    updatePreferences,
  } = useAISettings();

  const { data: usageData } = useAIUsage(30, 100);

  // Calculate tier breakdown
  const tierBreakdown = useMemo(() => {
    if (!usageSummary?.usage_by_model) return [];
    return calculateTierBreakdown(usageSummary.usage_by_model);
  }, [usageSummary]);

  // Generate recommendations
  const recommendations = useMemo(() => {
    const allRecs = generateRecommendations(
      usageSummary,
      preferences,
      usageData?.daily || []
    );
    return allRecs.filter((rec) => !dismissedRecommendations.has(rec.id));
  }, [usageSummary, preferences, usageData, dismissedRecommendations]);

  // Calculate total and potential savings
  const totalSpending = usageSummary?.total_cost_usd || 0;
  const potentialSavings = recommendations.reduce((sum, rec) => sum + rec.savingsAmount, 0);

  // Calculate spending trend
  const spendingTrend = useMemo(() => {
    if (!usageData?.daily || usageData.daily.length < 7) return null;
    const recent = usageData.daily.slice(-7);
    const previous = usageData.daily.slice(-14, -7);
    const recentAvg = recent.reduce((sum, d) => sum + d.total_cost_usd, 0) / recent.length;
    const previousAvg = previous.length > 0
      ? previous.reduce((sum, d) => sum + d.total_cost_usd, 0) / previous.length
      : recentAvg;
    const change = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
    return { direction: change >= 0 ? 'up' : 'down', percentage: Math.abs(change) };
  }, [usageData]);

  // Sync budget controls with preferences
  useMemo(() => {
    if (preferences) {
      setBudgetControls((prev) => ({
        ...prev,
        dailyLimit: preferences.cost_limit_per_day || 10,
        perMessageLimit: preferences.cost_limit_per_message || 1,
      }));
    }
  }, [preferences]);

  // Handlers
  const handleApplyRecommendation = async (recommendation: OptimizationRecommendation) => {
    setApplyingRecommendation(recommendation.id);
    try {
      if (recommendation.actionDetails?.setting) {
        await updatePreferences({
          [recommendation.actionDetails.setting]: recommendation.actionDetails.settingValue,
        });
      } else if (recommendation.actionDetails?.toModel) {
        await updatePreferences({
          default_model: recommendation.actionDetails.toModel,
        });
      }
      toast.success({
        title: 'Recommendation Applied',
        description: `Successfully applied: ${recommendation.title}`,
      });
      setDismissedRecommendations((prev) => new Set([...prev, recommendation.id]));
    } catch (err) {
      toast.error({
        title: 'Failed to apply recommendation',
        description: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setApplyingRecommendation(null);
    }
  };

  const handleDismissRecommendation = (id: string) => {
    setDismissedRecommendations((prev) => new Set([...prev, id]));
  };

  const handleUpdateBudgetControl = async (key: keyof BudgetControls, value: any) => {
    setBudgetControls((prev) => ({ ...prev, [key]: value }));

    // Persist to backend
    if (key === 'dailyLimit') {
      await updatePreferences({ cost_limit_per_day: value });
    } else if (key === 'perMessageLimit') {
      await updatePreferences({ cost_limit_per_message: value });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              <p>Failed to load cost data: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-500" />
            Cost Optimizer
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyze spending patterns and optimize your AI costs
          </p>
        </div>
        {potentialSavings > 0 && (
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-sm text-green-600">Potential Savings</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(potentialSavings)}/month
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Monthly Spend</div>
              {spendingTrend && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    spendingTrend.direction === 'up'
                      ? 'text-red-500 border-red-500/30'
                      : 'text-green-500 border-green-500/30'
                  )}
                >
                  {spendingTrend.direction === 'up' ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {formatPercent(spendingTrend.percentage)}
                </Badge>
              )}
            </div>
            <div className="text-2xl font-bold mt-1">{formatCurrency(totalSpending)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Requests</div>
            <div className="text-2xl font-bold mt-1">
              {(usageSummary?.total_requests || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Avg Cost/Request</div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(
                usageSummary?.total_requests
                  ? totalSpending / usageSummary.total_requests
                  : 0
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Recommendations</div>
            <div className="text-2xl font-bold mt-1 flex items-center gap-2">
              {recommendations.length}
              {recommendations.length > 0 && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  {formatCurrency(potentialSavings)} potential
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b pb-2">
        {[
          { id: 'analysis', label: 'Spending Analysis', icon: PieChartIcon },
          { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
          { id: 'controls', label: 'Budget Controls', icon: Settings },
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
            {tab.id === 'recommendations' && recommendations.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-green-500 text-white">
                {recommendations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Spending Analysis Tab */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Tier Breakdown
              </CardTitle>
              <CardDescription>
                See how your spending is distributed across model tiers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SpendingPieChart data={tierBreakdown} total={totalSpending} />
            </CardContent>
          </Card>

          {/* Task Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Usage by Provider
              </CardTitle>
              <CardDescription>
                Cost breakdown by AI provider
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usageSummary?.usage_by_provider && Object.keys(usageSummary.usage_by_provider).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(usageSummary.usage_by_provider)
                    .sort((a, b) => b[1].cost - a[1].cost)
                    .map(([provider, stats]) => (
                      <div key={provider}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium capitalize">{provider}</span>
                          <span className="text-sm">
                            {formatCurrency(stats.cost)} ({stats.requests} requests)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{
                              width: `${(stats.cost / totalSpending) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No provider usage data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {recommendations.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''} to reduce costs
                </p>
                <div className="text-sm">
                  <span className="text-muted-foreground">Total potential savings: </span>
                  <span className="font-bold text-green-600">{formatCurrency(potentialSavings)}/month</span>
                </div>
              </div>
              {recommendations.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onApply={() => handleApplyRecommendation(rec)}
                  onDismiss={() => handleDismissRecommendation(rec.id)}
                  isApplying={applyingRecommendation === rec.id}
                />
              ))}
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Great job!</h3>
                <p className="text-muted-foreground">
                  Your AI usage is already optimized. Check back later for new recommendations.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Budget Controls Tab */}
      {activeTab === 'controls' && (
        <div className="space-y-6">
          {/* Current Budget Status */}
          {budgetStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s Budget Status</CardTitle>
              </CardHeader>
              <CardContent>
                <BudgetProgressBar
                  spent={budgetStatus.daily_spent}
                  limit={budgetStatus.daily_limit}
                  label="Daily Spending"
                />
              </CardContent>
            </Card>
          )}

          {/* Daily Limit */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Daily Spending Limit
              </CardTitle>
              <CardDescription>
                Set a maximum daily spend to prevent unexpected costs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    step={0.5}
                    value={budgetControls.dailyLimit}
                    onChange={(e) => handleUpdateBudgetControl('dailyLimit', parseFloat(e.target.value) || 0)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">per day</span>
                </div>
                <div className="flex gap-2">
                  {[5, 10, 25, 50].map((preset) => (
                    <Button
                      key={preset}
                      variant={budgetControls.dailyLimit === preset ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleUpdateBudgetControl('dailyLimit', preset)}
                    >
                      ${preset}
                    </Button>
                  ))}
                </div>
              </div>
              <BudgetProgressBar
                spent={budgetStatus?.daily_spent || 0}
                limit={budgetControls.dailyLimit}
                label="Current Usage"
              />
            </CardContent>
          </Card>

          {/* Per-Message Limit */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Per-Message Limit
              </CardTitle>
              <CardDescription>
                Get warned before sending expensive messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={budgetControls.perMessageLimit}
                    onChange={(e) => handleUpdateBudgetControl('perMessageLimit', parseFloat(e.target.value) || 0)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">per message</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Messages exceeding this limit will show a confirmation dialog before sending
              </p>
            </CardContent>
          </Card>

          {/* Alert Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alert Settings
              </CardTitle>
              <CardDescription>
                Configure when and how you receive budget alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Alert Threshold</label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={50}
                    max={100}
                    step={5}
                    value={budgetControls.alertThreshold}
                    onChange={(e) => setBudgetControls((prev) => ({ ...prev, alertThreshold: parseInt(e.target.value) || 80 }))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">% of daily limit</span>
                  <div className="flex-1" />
                  <div className="flex gap-2">
                    {[50, 75, 90].map((preset) => (
                      <Button
                        key={preset}
                        variant={budgetControls.alertThreshold === preset ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBudgetControls((prev) => ({ ...prev, alertThreshold: preset }))}
                      >
                        {preset}%
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3 border-t">
                <ToggleRow
                  label="Enable budget alerts"
                  description="Receive notifications when approaching your daily limit"
                  checked={budgetControls.alertsEnabled}
                  onChange={(checked) => setBudgetControls((prev) => ({ ...prev, alertsEnabled: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Auto-Downgrade */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Auto-Downgrade
              </CardTitle>
              <CardDescription>
                Automatically switch to cheaper models when approaching budget limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ToggleRow
                label="Enable auto-downgrade"
                description="When you reach 90% of your daily limit, automatically use Value tier models (Haiku, GPT-4o-mini) to continue working"
                checked={budgetControls.autoDowngrade}
                onChange={(checked) => setBudgetControls((prev) => ({ ...prev, autoDowngrade: checked }))}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
