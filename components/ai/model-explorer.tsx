'use client';

import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Eye,
  Wrench,
  Zap,
  Monitor,
  ChevronDown,
  ChevronUp,
  Star,
  Check,
  X,
  ArrowUpDown,
  Loader2,
  RefreshCw,
  LayoutGrid,
  List,
  Columns3,
  Info,
  BarChart3,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, NoResultsEmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  type ModelInfo,
  type ModelTier,
  useAvailableModels,
  useUpdateAIPreferences,
  useAIPreferences,
  useAIUsageSummary,
} from '@/lib/hooks/use-ai-settings';
import { useToast } from '@/lib/hooks/useToast';

// ============================================================================
// Types
// ============================================================================

type SortOption = 'price-low' | 'price-high' | 'context' | 'name';

type Capability = 'vision' | 'tools' | 'streaming' | 'computer_use';

type ViewMode = 'grid' | 'list' | 'compare';

const MAX_COMPARE_MODELS = 4;

// Tier display configuration
const TIER_CONFIG: Record<string, { label: string; color: string; order: number }> = {
  flash: { label: 'Flash', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30', order: 1 },
  value: { label: 'Value', color: 'bg-green-500/10 text-green-600 border-green-500/30', order: 2 },
  standard: { label: 'Standard', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', order: 3 },
  premium: { label: 'Premium', color: 'bg-violet-500/10 text-violet-600 border-violet-500/30', order: 4 },
  expert: { label: 'Expert', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', order: 5 },
  free: { label: 'Free', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', order: 0 },
  enterprise: { label: 'Enterprise', color: 'bg-rose-500/10 text-rose-600 border-rose-500/30', order: 6 },
};

// Provider display configuration
const PROVIDER_CONFIG: Record<string, { label: string; color: string }> = {
  anthropic: { label: 'Anthropic', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
  openai: { label: 'OpenAI', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  google: { label: 'Google', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  deepseek: { label: 'DeepSeek', color: 'bg-violet-500/10 text-violet-600 border-violet-500/30' },
  groq: { label: 'Groq', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  together: { label: 'Together', color: 'bg-pink-500/10 text-pink-600 border-pink-500/30' },
  openrouter: { label: 'OpenRouter', color: 'bg-rose-500/10 text-rose-600 border-rose-500/30' },
  cerebras: { label: 'Cerebras', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30' },
  mistral: { label: 'Mistral', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30' },
  cohere: { label: 'Cohere', color: 'bg-teal-500/10 text-teal-600 border-teal-500/30' },
};

// Capability icons and labels
const CAPABILITY_CONFIG: Record<Capability, { icon: React.ReactNode; label: string }> = {
  vision: { icon: <Eye className="h-3.5 w-3.5" />, label: 'Vision' },
  tools: { icon: <Wrench className="h-3.5 w-3.5" />, label: 'Tools' },
  streaming: { icon: <Zap className="h-3.5 w-3.5" />, label: 'Streaming' },
  computer_use: { icon: <Monitor className="h-3.5 w-3.5" />, label: 'Computer Use' },
};

// ============================================================================
// Sub-components
// ============================================================================

interface FilterChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  count?: number;
}

function FilterChip({ label, selected, onClick, count }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
        'border hover:border-primary/50',
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-muted-foreground border-border hover:bg-accent'
      )}
    >
      {selected && <Check className="h-3 w-3" />}
      {label}
      {count !== undefined && (
        <span className={cn('text-xs', selected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
          ({count})
        </span>
      )}
    </button>
  );
}

interface CapabilityBadgeProps {
  capability: Capability;
  active?: boolean;
}

function CapabilityBadge({ capability, active = true }: CapabilityBadgeProps) {
  const config = CAPABILITY_CONFIG[capability];
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs',
        active
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'bg-muted text-muted-foreground'
      )}
      title={config.label}
    >
      {config.icon}
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  );
}

// View mode toggle component
interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  const modes: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'grid', icon: <LayoutGrid className="h-4 w-4" />, label: 'Grid' },
    { mode: 'list', icon: <List className="h-4 w-4" />, label: 'List' },
    { mode: 'compare', icon: <Columns3 className="h-4 w-4" />, label: 'Compare' },
  ];

  return (
    <div className="inline-flex items-center rounded-md border bg-muted p-1">
      {modes.map(({ mode, icon, label }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm font-medium transition-colors',
            value === mode
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          )}
          title={label}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

// Custom checkbox component
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

function Checkbox({ checked, onChange, disabled, className }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'h-5 w-5 rounded border-2 flex items-center justify-center transition-colors',
        checked
          ? 'bg-primary border-primary text-primary-foreground'
          : 'border-muted-foreground/40 hover:border-primary/60',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {checked && <Check className="h-3.5 w-3.5" />}
    </button>
  );
}

// Speed rating component (stars based on tier and pricing)
interface SpeedRatingProps {
  model: ModelInfo;
}

function SpeedRating({ model }: SpeedRatingProps) {
  // Calculate speed rating based on tier (flash/value = faster, premium/expert = slower but smarter)
  const getSpeedRating = (): number => {
    const tier = model.tier?.toLowerCase() || 'standard';
    switch (tier) {
      case 'flash':
        return 5;
      case 'free':
        return 4;
      case 'value':
        return 4;
      case 'standard':
        return 3;
      case 'premium':
        return 2;
      case 'expert':
        return 1;
      case 'enterprise':
        return 2;
      default:
        return 3;
    }
  };

  const rating = getSpeedRating();

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'h-3.5 w-3.5',
            i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
}

// Model list row component (for list view)
interface ModelListRowProps {
  model: ModelInfo;
  isDefault: boolean;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onSetDefault: (modelId: string) => void;
  onViewDetails: (model: ModelInfo) => void;
  isSettingDefault: boolean;
  viewMode: ViewMode;
  selectionDisabled: boolean;
}

function ModelListRow({
  model,
  isDefault,
  isSelected,
  onSelect,
  onSetDefault,
  onViewDetails,
  isSettingDefault,
  viewMode,
  selectionDisabled,
}: ModelListRowProps) {
  const providerConfig = PROVIDER_CONFIG[model.provider.toLowerCase()] || {
    label: model.provider,
    color: 'bg-muted text-muted-foreground',
  };

  const tierConfig = TIER_CONFIG[model.tier?.toLowerCase() || 'standard'] || TIER_CONFIG.standard;

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    if (price < 0.01) return `$${(price * 1000000).toFixed(2)}`;
    return `$${price.toFixed(2)}`;
  };

  const formatContextWindow = (tokens: number | undefined) => {
    if (!tokens) return 'N/A';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
    return tokens.toString();
  };

  const capabilities: Capability[] = [];
  if (model.supportsVision) capabilities.push('vision');
  if (model.supportsFunctionCalling) capabilities.push('tools');
  if (model.supportsStreaming) capabilities.push('streaming');
  if (model.capabilities?.includes('computer_use')) capabilities.push('computer_use');

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors',
        isDefault && 'bg-primary/5',
        !model.isAvailable && 'opacity-60'
      )}
    >
      {/* Checkbox for compare mode */}
      {viewMode === 'compare' && (
        <Checkbox
          checked={isSelected}
          onChange={onSelect}
          disabled={selectionDisabled && !isSelected}
        />
      )}

      {/* Model info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm truncate">{model.displayName}</h3>
          {isDefault && (
            <Badge variant="default" className="text-xs px-1.5 py-0">
              <Star className="h-3 w-3 mr-1" />
              Default
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className={cn('text-xs', providerConfig.color)}>
            {providerConfig.label}
          </Badge>
          {model.tier && (
            <Badge variant="outline" className={cn('text-xs', tierConfig.color)}>
              {tierConfig.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="hidden md:flex flex-col items-end text-sm">
        <span className="text-muted-foreground text-xs">Input/Output</span>
        <span className="font-medium">{formatPrice(model.inputPrice)} / {formatPrice(model.outputPrice)}</span>
      </div>

      {/* Context */}
      <div className="hidden lg:flex flex-col items-end text-sm min-w-[80px]">
        <span className="text-muted-foreground text-xs">Context</span>
        <span className="font-medium">{formatContextWindow(model.contextWindow)}</span>
      </div>

      {/* Speed */}
      <div className="hidden xl:flex flex-col items-end min-w-[80px]">
        <span className="text-muted-foreground text-xs mb-0.5">Speed</span>
        <SpeedRating model={model} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onViewDetails(model)}
          title="View Details"
        >
          <Info className="h-4 w-4" />
        </Button>
        {viewMode !== 'compare' && (
          <Button
            variant={isDefault ? 'outline' : 'default'}
            size="sm"
            disabled={isDefault || !model.isAvailable || isSettingDefault}
            onClick={() => onSetDefault(model.modelId)}
          >
            {isSettingDefault ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isDefault ? (
              'Default'
            ) : (
              'Set Default'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// Comparison table component
interface ComparisonTableProps {
  models: ModelInfo[];
  defaultModelId: string | undefined;
  onSetDefault: (modelId: string) => void;
  onRemoveFromCompare: (modelId: string) => void;
  onViewDetails: (model: ModelInfo) => void;
  isSettingDefault: boolean;
  settingDefaultId: string | null;
}

function ComparisonTable({
  models,
  defaultModelId,
  onSetDefault,
  onRemoveFromCompare,
  onViewDetails,
  isSettingDefault,
  settingDefaultId,
}: ComparisonTableProps) {
  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    if (price < 0.01) return `$${(price * 1000000).toFixed(2)}/1M`;
    return `$${price.toFixed(2)}/1M`;
  };

  const formatContextWindow = (tokens: number | undefined) => {
    if (!tokens) return 'N/A';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
    return tokens.toString();
  };

  // Find best values for highlighting
  const lowestInputPrice = Math.min(...models.map((m) => m.inputPrice));
  const lowestOutputPrice = Math.min(...models.map((m) => m.outputPrice));
  const largestContext = Math.max(...models.map((m) => m.contextWindow || 0));

  const getCapabilities = (model: ModelInfo): Capability[] => {
    const caps: Capability[] = [];
    if (model.supportsVision) caps.push('vision');
    if (model.supportsFunctionCalling) caps.push('tools');
    if (model.supportsStreaming) caps.push('streaming');
    if (model.capabilities?.includes('computer_use')) caps.push('computer_use');
    return caps;
  };

  if (models.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <Columns3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="font-semibold mb-2">Select models to compare</h3>
          <p className="text-sm">Choose up to {MAX_COMPARE_MODELS} models from the list above to see a side-by-side comparison.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 font-medium text-muted-foreground min-w-[120px]">Attribute</th>
              {models.map((model) => (
                <th key={model.modelId} className="text-left p-4 min-w-[180px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold truncate">{model.displayName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 -mr-2"
                      onClick={() => onRemoveFromCompare(model.modelId)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {defaultModelId === model.modelId && (
                    <Badge variant="default" className="mt-1 text-xs">Default</Badge>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Provider */}
            <tr className="border-b">
              <td className="p-4 font-medium text-muted-foreground">Provider</td>
              {models.map((model) => {
                const config = PROVIDER_CONFIG[model.provider.toLowerCase()];
                return (
                  <td key={model.modelId} className="p-4">
                    <Badge variant="outline" className={cn('text-xs', config?.color)}>
                      {config?.label || model.provider}
                    </Badge>
                  </td>
                );
              })}
            </tr>

            {/* Input Price */}
            <tr className="border-b">
              <td className="p-4 font-medium text-muted-foreground">Input Price</td>
              {models.map((model) => (
                <td key={model.modelId} className="p-4">
                  <span className={cn(
                    'font-medium',
                    model.inputPrice === lowestInputPrice && models.length > 1 && 'text-green-600'
                  )}>
                    {formatPrice(model.inputPrice)}
                    {model.inputPrice === lowestInputPrice && models.length > 1 && (
                      <Trophy className="h-3.5 w-3.5 inline ml-1 text-green-600" />
                    )}
                  </span>
                </td>
              ))}
            </tr>

            {/* Output Price */}
            <tr className="border-b">
              <td className="p-4 font-medium text-muted-foreground">Output Price</td>
              {models.map((model) => (
                <td key={model.modelId} className="p-4">
                  <span className={cn(
                    'font-medium',
                    model.outputPrice === lowestOutputPrice && models.length > 1 && 'text-green-600'
                  )}>
                    {formatPrice(model.outputPrice)}
                    {model.outputPrice === lowestOutputPrice && models.length > 1 && (
                      <Trophy className="h-3.5 w-3.5 inline ml-1 text-green-600" />
                    )}
                  </span>
                </td>
              ))}
            </tr>

            {/* Context Window */}
            <tr className="border-b">
              <td className="p-4 font-medium text-muted-foreground">Context Window</td>
              {models.map((model) => (
                <td key={model.modelId} className="p-4">
                  <span className={cn(
                    'font-medium',
                    model.contextWindow === largestContext && models.length > 1 && 'text-green-600'
                  )}>
                    {formatContextWindow(model.contextWindow)} tokens
                    {model.contextWindow === largestContext && models.length > 1 && (
                      <Trophy className="h-3.5 w-3.5 inline ml-1 text-green-600" />
                    )}
                  </span>
                </td>
              ))}
            </tr>

            {/* Capabilities */}
            {(Object.keys(CAPABILITY_CONFIG) as Capability[]).map((cap) => (
              <tr key={cap} className="border-b">
                <td className="p-4 font-medium text-muted-foreground flex items-center gap-2">
                  {CAPABILITY_CONFIG[cap].icon}
                  {CAPABILITY_CONFIG[cap].label}
                </td>
                {models.map((model) => {
                  const hasCap = getCapabilities(model).includes(cap);
                  return (
                    <td key={model.modelId} className="p-4">
                      {hasCap ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/30" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Speed Rating */}
            <tr className="border-b">
              <td className="p-4 font-medium text-muted-foreground">Speed Rating</td>
              {models.map((model) => (
                <td key={model.modelId} className="p-4">
                  <SpeedRating model={model} />
                </td>
              ))}
            </tr>

            {/* Actions */}
            <tr>
              <td className="p-4 font-medium text-muted-foreground">Actions</td>
              {models.map((model) => (
                <td key={model.modelId} className="p-4">
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => onViewDetails(model)}
                    >
                      <Info className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                    <Button
                      variant={defaultModelId === model.modelId ? 'outline' : 'default'}
                      size="sm"
                      className="w-full"
                      disabled={defaultModelId === model.modelId || !model.isAvailable || isSettingDefault}
                      onClick={() => onSetDefault(model.modelId)}
                    >
                      {settingDefaultId === model.modelId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : defaultModelId === model.modelId ? (
                        'Current Default'
                      ) : (
                        'Set as Default'
                      )}
                    </Button>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// Model details sheet component
interface ModelDetailsSheetProps {
  model: ModelInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDefault: boolean;
  onSetDefault: (modelId: string) => void;
  isSettingDefault: boolean;
  usageData: { requests: number; tokens: number; cost: number } | null;
}

function ModelDetailsSheet({
  model,
  open,
  onOpenChange,
  isDefault,
  onSetDefault,
  isSettingDefault,
  usageData,
}: ModelDetailsSheetProps) {
  if (!model) return null;

  const providerConfig = PROVIDER_CONFIG[model.provider.toLowerCase()] || {
    label: model.provider,
    color: 'bg-muted text-muted-foreground',
  };

  const tierConfig = TIER_CONFIG[model.tier?.toLowerCase() || 'standard'] || TIER_CONFIG.standard;

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    if (price < 0.01) return `$${(price * 1000000).toFixed(4)}/1M tokens`;
    return `$${price.toFixed(4)}/1M tokens`;
  };

  const formatContextWindow = (tokens: number | undefined) => {
    if (!tokens) return 'N/A';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M tokens`;
    if (tokens >= 1000) return `${Math.round(tokens / 1000)}K tokens`;
    return `${tokens} tokens`;
  };

  const capabilities: Capability[] = [];
  if (model.supportsVision) capabilities.push('vision');
  if (model.supportsFunctionCalling) capabilities.push('tools');
  if (model.supportsStreaming) capabilities.push('streaming');
  if (model.capabilities?.includes('computer_use')) capabilities.push('computer_use');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {model.displayName}
            {isDefault && (
              <Badge variant="default" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                Default
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="text-left">
            <span className="font-mono text-xs">{model.modelId}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Provider and Tier */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn('text-sm', providerConfig.color)}>
              {providerConfig.label}
            </Badge>
            {model.tier && (
              <Badge variant="outline" className={cn('text-sm', tierConfig.color)}>
                {tierConfig.label}
              </Badge>
            )}
            {model.deprecated && (
              <Badge variant="destructive" className="text-sm">
                Deprecated
              </Badge>
            )}
            {!model.isAvailable && (
              <Badge variant="secondary" className="text-sm">
                Unavailable
              </Badge>
            )}
          </div>

          {/* Pricing Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Input</span>
                <span className="font-semibold">{formatPrice(model.inputPrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Output</span>
                <span className="font-semibold">{formatPrice(model.outputPrice)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Technical Specs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Technical Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Context Window</span>
                <span className="font-semibold">{formatContextWindow(model.contextWindow)}</span>
              </div>
              {model.maxOutputTokens && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Max Output</span>
                  <span className="font-semibold">{formatContextWindow(model.maxOutputTokens)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Speed Rating</span>
                <SpeedRating model={model} />
              </div>
            </CardContent>
          </Card>

          {/* Capabilities */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(CAPABILITY_CONFIG) as Capability[]).map((cap) => {
                  const hasCap = capabilities.includes(cap);
                  return (
                    <div
                      key={cap}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-md',
                        hasCap ? 'bg-green-500/10' : 'bg-muted'
                      )}
                    >
                      {hasCap ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={cn('text-sm', !hasCap && 'text-muted-foreground')}>
                        {CAPABILITY_CONFIG[cap].label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Usage Stats (if available) */}
          {usageData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Your Usage (This Month)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Requests</span>
                  <span className="font-semibold">{usageData.requests.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tokens</span>
                  <span className="font-semibold">{usageData.tokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="font-semibold">${usageData.cost.toFixed(4)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deprecation warning */}
          {model.deprecated && model.deprecationDate && (
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardContent className="pt-4">
                <p className="text-sm text-amber-600">
                  This model is deprecated and will be removed on {new Date(model.deprecationDate).toLocaleDateString()}.
                  Please migrate to a newer model.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <SheetFooter className="mt-6">
          <Button
            variant={isDefault ? 'outline' : 'default'}
            className="w-full"
            disabled={isDefault || !model.isAvailable || isSettingDefault}
            onClick={() => onSetDefault(model.modelId)}
          >
            {isSettingDefault ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Setting...
              </>
            ) : isDefault ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Current Default
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                Set as Default
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface ModelCardProps {
  model: ModelInfo;
  isDefault: boolean;
  onSetDefault: (modelId: string) => void;
  isSettingDefault: boolean;
  viewMode: ViewMode;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  onViewDetails?: (model: ModelInfo) => void;
  selectionDisabled?: boolean;
}

function ModelCard({
  model,
  isDefault,
  onSetDefault,
  isSettingDefault,
  viewMode,
  isSelected = false,
  onSelect,
  onViewDetails,
  selectionDisabled = false,
}: ModelCardProps) {
  const providerConfig = PROVIDER_CONFIG[model.provider.toLowerCase()] || {
    label: model.provider,
    color: 'bg-muted text-muted-foreground',
  };

  const tierConfig = TIER_CONFIG[model.tier?.toLowerCase() || 'standard'] || TIER_CONFIG.standard;

  // Format price per 1M tokens
  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    if (price < 0.01) return `$${(price * 1000000).toFixed(2)}/1M`;
    return `$${price.toFixed(2)}/1M`;
  };

  // Format context window size
  const formatContextWindow = (tokens: number | undefined) => {
    if (!tokens) return 'N/A';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
    return tokens.toString();
  };

  // Determine capabilities from model info
  const capabilities: Capability[] = [];
  if (model.supportsVision) capabilities.push('vision');
  if (model.supportsFunctionCalling) capabilities.push('tools');
  if (model.supportsStreaming) capabilities.push('streaming');
  if (model.capabilities?.includes('computer_use')) capabilities.push('computer_use');

  return (
    <Card className={cn(
      'group relative overflow-hidden transition-all hover:shadow-md',
      isDefault && 'ring-2 ring-primary',
      isSelected && 'ring-2 ring-blue-500',
      !model.isAvailable && 'opacity-60'
    )}>
      {/* Default indicator */}
      {isDefault && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
      )}
      {/* Selection indicator for compare mode */}
      {isSelected && !isDefault && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
      )}

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Checkbox for compare mode */}
          {viewMode === 'compare' && onSelect && (
            <Checkbox
              checked={isSelected}
              onChange={onSelect}
              disabled={selectionDisabled && !isSelected}
              className="mt-0.5"
            />
          )}

          <div className="flex-1 min-w-0">
            {/* Model name and provider */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm truncate" title={model.displayName}>
                {model.displayName}
              </h3>
              {isDefault && (
                <Badge variant="default" className="text-xs px-1.5 py-0">
                  <Star className="h-3 w-3 mr-1" />
                  Default
                </Badge>
              )}
            </div>

            {/* Provider badge */}
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="outline" className={cn('text-xs', providerConfig.color)}>
                {providerConfig.label}
              </Badge>
              {model.tier && (
                <Badge variant="outline" className={cn('text-xs', tierConfig.color)}>
                  {tierConfig.label}
                </Badge>
              )}
              {model.deprecated && (
                <Badge variant="destructive" className="text-xs">
                  Deprecated
                </Badge>
              )}
            </div>
          </div>

          {/* Info button and availability indicator */}
          <div className="flex items-center gap-2">
            {onViewDetails && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onViewDetails(model)}
                title="View Details"
              >
                <Info className="h-4 w-4" />
              </Button>
            )}
            {!model.isAvailable && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <X className="h-3.5 w-3.5 text-destructive" />
              </div>
            )}
          </div>
        </div>

        {/* Pricing row */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="p-2 rounded-md bg-muted/50">
            <p className="text-xs text-muted-foreground">Input</p>
            <p className="font-semibold text-sm">{formatPrice(model.inputPrice)}</p>
          </div>
          <div className="p-2 rounded-md bg-muted/50">
            <p className="text-xs text-muted-foreground">Output</p>
            <p className="font-semibold text-sm">{formatPrice(model.outputPrice)}</p>
          </div>
        </div>

        {/* Context window */}
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Context Window</span>
          <span className="font-medium">{formatContextWindow(model.contextWindow)} tokens</span>
        </div>

        {/* Capabilities */}
        {capabilities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {capabilities.map((cap) => (
              <CapabilityBadge key={cap} capability={cap} />
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          variant={isDefault ? 'outline' : 'default'}
          size="sm"
          className="w-full"
          disabled={isDefault || !model.isAvailable || isSettingDefault}
          onClick={() => onSetDefault(model.modelId)}
        >
          {isSettingDefault ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Setting...
            </>
          ) : isDefault ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Current Default
            </>
          ) : (
            'Set as Default'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

function ModelCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
        </div>
        <div className="mt-2 flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="mt-3 flex gap-1.5">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-14" />
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const PAGE_SIZE = 12;

export interface ModelExplorerProps {
  className?: string;
}

export function ModelExplorer({ className }: ModelExplorerProps) {
  const { toast } = useToast();

  // Data fetching
  const { data: modelsData, isLoading, error, refetch } = useAvailableModels();
  const { data: preferences } = useAIPreferences();
  const { data: usageSummary } = useAIUsageSummary('month');
  const updatePreferences = useUpdateAIPreferences();

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedCapabilities, setSelectedCapabilities] = useState<Capability[]>([]);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [showFilters, setShowFilters] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Compare mode state
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  // Model details sheet state
  const [detailsModel, setDetailsModel] = useState<ModelInfo | null>(null);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);

  // Get unique providers and tiers from data
  const uniqueProviders = useMemo(() => {
    if (!modelsData?.models) return [];
    const providers = new Set(modelsData.models.map((m) => m.provider.toLowerCase()));
    return Array.from(providers).sort();
  }, [modelsData?.models]);

  const uniqueTiers = useMemo(() => {
    if (!modelsData?.models) return [];
    const tiers = new Set(
      modelsData.models
        .map((m) => m.tier?.toLowerCase())
        .filter((t): t is string => !!t)
    );
    return Array.from(tiers).sort((a, b) => {
      const orderA = TIER_CONFIG[a]?.order ?? 99;
      const orderB = TIER_CONFIG[b]?.order ?? 99;
      return orderA - orderB;
    });
  }, [modelsData?.models]);

  // Filter and sort models
  const filteredModels = useMemo(() => {
    if (!modelsData?.models) return [];

    let filtered = [...modelsData.models];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.displayName.toLowerCase().includes(query) ||
          m.modelId.toLowerCase().includes(query) ||
          m.provider.toLowerCase().includes(query)
      );
    }

    // Provider filter
    if (selectedProviders.length > 0) {
      filtered = filtered.filter((m) =>
        selectedProviders.includes(m.provider.toLowerCase())
      );
    }

    // Capability filter
    if (selectedCapabilities.length > 0) {
      filtered = filtered.filter((m) => {
        const modelCaps: Capability[] = [];
        if (m.supportsVision) modelCaps.push('vision');
        if (m.supportsFunctionCalling) modelCaps.push('tools');
        if (m.supportsStreaming) modelCaps.push('streaming');
        if (m.capabilities?.includes('computer_use')) modelCaps.push('computer_use');
        return selectedCapabilities.every((cap) => modelCaps.includes(cap));
      });
    }

    // Tier filter
    if (selectedTiers.length > 0) {
      filtered = filtered.filter((m) =>
        selectedTiers.includes(m.tier?.toLowerCase() || '')
      );
    }

    // Sort
    switch (sortOption) {
      case 'price-low':
        filtered.sort((a, b) => (a.inputPrice + a.outputPrice) - (b.inputPrice + b.outputPrice));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.inputPrice + b.outputPrice) - (a.inputPrice + a.outputPrice));
        break;
      case 'context':
        filtered.sort((a, b) => (b.contextWindow || 0) - (a.contextWindow || 0));
        break;
      case 'name':
      default:
        filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
        break;
    }

    return filtered;
  }, [modelsData?.models, searchQuery, selectedProviders, selectedCapabilities, selectedTiers, sortOption]);

  // Paginated models
  const paginatedModels = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredModels.slice(start, start + PAGE_SIZE);
  }, [filteredModels, currentPage]);

  const totalPages = Math.ceil(filteredModels.length / PAGE_SIZE);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedProviders, selectedCapabilities, selectedTiers, sortOption]);

  // Toggle functions
  const toggleProvider = useCallback((provider: string) => {
    setSelectedProviders((prev) =>
      prev.includes(provider)
        ? prev.filter((p) => p !== provider)
        : [...prev, provider]
    );
  }, []);

  const toggleCapability = useCallback((capability: Capability) => {
    setSelectedCapabilities((prev) =>
      prev.includes(capability)
        ? prev.filter((c) => c !== capability)
        : [...prev, capability]
    );
  }, []);

  const toggleTier = useCallback((tier: string) => {
    setSelectedTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]
    );
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedProviders([]);
    setSelectedCapabilities([]);
    setSelectedTiers([]);
    setSortOption('name');
  }, []);

  // Compare mode selection handlers
  const toggleCompareSelection = useCallback((modelId: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((id) => id !== modelId);
      }
      if (prev.length >= MAX_COMPARE_MODELS) {
        return prev;
      }
      return [...prev, modelId];
    });
  }, []);

  const removeFromCompare = useCallback((modelId: string) => {
    setSelectedForCompare((prev) => prev.filter((id) => id !== modelId));
  }, []);

  const clearCompareSelection = useCallback(() => {
    setSelectedForCompare([]);
  }, []);

  // Model details handlers
  const handleViewDetails = useCallback((model: ModelInfo) => {
    setDetailsModel(model);
    setDetailsSheetOpen(true);
  }, []);

  // Get models selected for comparison
  const modelsForCompare = useMemo(() => {
    return selectedForCompare
      .map((id) => modelsData?.models.find((m) => m.modelId === id))
      .filter((m): m is ModelInfo => m !== undefined);
  }, [selectedForCompare, modelsData?.models]);

  // Get usage data for a specific model
  const getModelUsageData = useCallback(
    (modelId: string) => {
      return usageSummary?.usageByModel?.[modelId] || null;
    },
    [usageSummary]
  );

  // Set model as default
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const handleSetDefault = useCallback(async (modelId: string) => {
    setSettingDefaultId(modelId);
    try {
      const model = modelsData?.models.find((m) => m.modelId === modelId);
      await updatePreferences.mutateAsync({
        defaultModel: modelId,
        defaultProvider: model?.provider || preferences?.defaultProvider || 'anthropic',
      });
      toast({
        title: 'Default model updated',
        description: `${model?.displayName || modelId} is now your default model.`,
      });
    } catch (err) {
      toast({
        title: 'Failed to update default model',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setSettingDefaultId(null);
    }
  }, [modelsData?.models, preferences?.defaultProvider, updatePreferences, toast]);

  // Count models by filter
  const getProviderCount = useCallback(
    (provider: string) =>
      modelsData?.models.filter((m) => m.provider.toLowerCase() === provider).length || 0,
    [modelsData?.models]
  );

  const getTierCount = useCallback(
    (tier: string) =>
      modelsData?.models.filter((m) => m.tier?.toLowerCase() === tier).length || 0,
    [modelsData?.models]
  );

  const hasActiveFilters =
    searchQuery ||
    selectedProviders.length > 0 ||
    selectedCapabilities.length > 0 ||
    selectedTiers.length > 0;

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1 max-w-md" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ModelCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <EmptyState
        variant="error"
        headline="Failed to load models"
        subtext={error instanceof Error ? error.message : 'An error occurred while fetching models.'}
        primaryAction={{
          label: 'Try Again',
          onClick: () => refetch(),
          icon: <RefreshCw className="h-4 w-4" />,
        }}
        className={className}
      />
    );
  }

  // Empty state (no models at all)
  if (!modelsData?.models || modelsData.models.length === 0) {
    return (
      <EmptyState
        variant="no-results"
        headline="No models available"
        subtext="No AI models are currently available. Please check your API key configuration or contact support."
        className={className}
      />
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Search and sort header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models by name, provider, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View mode toggle */}
            <ViewModeToggle value={viewMode} onChange={setViewMode} />

            <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
              <SelectTrigger className="w-44">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="price-low">Price (Low to High)</SelectItem>
                <SelectItem value="price-high">Price (High to Low)</SelectItem>
                <SelectItem value="context">Context Window</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && 'bg-accent')}
            >
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Compare mode selection info */}
        {viewMode === 'compare' && selectedForCompare.length > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg border bg-blue-500/5 border-blue-500/20">
            <span className="text-sm">
              <span className="font-medium">{selectedForCompare.length}</span> of {MAX_COMPARE_MODELS} models selected for comparison
            </span>
            <Button variant="ghost" size="sm" onClick={clearCompareSelection}>
              <X className="h-4 w-4 mr-2" />
              Clear selection
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="space-y-4 p-4 rounded-lg border bg-card">
          {/* Provider filters */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Provider</h4>
            <div className="flex flex-wrap gap-2">
              {uniqueProviders.map((provider) => (
                <FilterChip
                  key={provider}
                  label={PROVIDER_CONFIG[provider]?.label || provider}
                  selected={selectedProviders.includes(provider)}
                  onClick={() => toggleProvider(provider)}
                  count={getProviderCount(provider)}
                />
              ))}
            </div>
          </div>

          {/* Capability filters */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Capabilities</h4>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CAPABILITY_CONFIG) as Capability[]).map((cap) => (
                <FilterChip
                  key={cap}
                  label={CAPABILITY_CONFIG[cap].label}
                  selected={selectedCapabilities.includes(cap)}
                  onClick={() => toggleCapability(cap)}
                />
              ))}
            </div>
          </div>

          {/* Tier filters */}
          {uniqueTiers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">Tier</h4>
              <div className="flex flex-wrap gap-2">
                {uniqueTiers.map((tier) => (
                  <FilterChip
                    key={tier}
                    label={TIER_CONFIG[tier]?.label || tier}
                    selected={selectedTiers.includes(tier)}
                    onClick={() => toggleTier(tier)}
                    count={getTierCount(tier)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <div className="pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {paginatedModels.length} of {filteredModels.length} models
          {hasActiveFilters && ' (filtered)'}
        </span>
        {preferences?.defaultModel && (
          <span>
            Current default: <span className="font-medium text-foreground">{preferences.defaultModel}</span>
          </span>
        )}
      </div>

      {/* Comparison table (shown when in compare mode and models selected) */}
      {viewMode === 'compare' && modelsForCompare.length > 0 && (
        <ComparisonTable
          models={modelsForCompare}
          defaultModelId={preferences?.defaultModel}
          onSetDefault={handleSetDefault}
          onRemoveFromCompare={removeFromCompare}
          onViewDetails={handleViewDetails}
          isSettingDefault={!!settingDefaultId}
          settingDefaultId={settingDefaultId}
        />
      )}

      {/* Model grid/list */}
      {paginatedModels.length === 0 ? (
        <NoResultsEmptyState
          searchQuery={searchQuery}
          onClearSearch={clearAllFilters}
        />
      ) : viewMode === 'list' ? (
        // List view
        <Card className="overflow-hidden">
          {paginatedModels.map((model) => (
            <ModelListRow
              key={model.modelId}
              model={model}
              isDefault={preferences?.defaultModel === model.modelId}
              isSelected={selectedForCompare.includes(model.modelId)}
              onSelect={(selected) => {
                if (selected) {
                  toggleCompareSelection(model.modelId);
                } else {
                  removeFromCompare(model.modelId);
                }
              }}
              onSetDefault={handleSetDefault}
              onViewDetails={handleViewDetails}
              isSettingDefault={settingDefaultId === model.modelId}
              viewMode={viewMode}
              selectionDisabled={selectedForCompare.length >= MAX_COMPARE_MODELS}
            />
          ))}
        </Card>
      ) : (
        // Grid view (default) and Compare selection view
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedModels.map((model) => (
            <ModelCard
              key={model.modelId}
              model={model}
              isDefault={preferences?.defaultModel === model.modelId}
              onSetDefault={handleSetDefault}
              isSettingDefault={settingDefaultId === model.modelId}
              viewMode={viewMode}
              isSelected={selectedForCompare.includes(model.modelId)}
              onSelect={(selected) => {
                if (selected) {
                  toggleCompareSelection(model.modelId);
                } else {
                  removeFromCompare(model.modelId);
                }
              }}
              onViewDetails={handleViewDetails}
              selectionDisabled={selectedForCompare.length >= MAX_COMPARE_MODELS}
            />
          ))}
        </div>
      )}

      {/* Model Details Sheet */}
      <ModelDetailsSheet
        model={detailsModel}
        open={detailsSheetOpen}
        onOpenChange={setDetailsSheetOpen}
        isDefault={preferences?.defaultModel === detailsModel?.modelId}
        onSetDefault={handleSetDefault}
        isSettingDefault={settingDefaultId === detailsModel?.modelId}
        usageData={detailsModel ? getModelUsageData(detailsModel.modelId) : null}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first, last, current, and adjacent pages
              const shouldShow =
                page === 1 ||
                page === totalPages ||
                Math.abs(page - currentPage) <= 1;

              if (!shouldShow) {
                // Show ellipsis for gaps
                if (page === 2 || page === totalPages - 1) {
                  return (
                    <span key={page} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  );
                }
                return null;
              }

              return (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-9"
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default ModelExplorer;
