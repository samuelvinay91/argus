'use client';

/**
 * AI Hub Models Page
 *
 * Browse and manage available AI models across all configured providers.
 * Features:
 * - Search and filter models by name, provider, or capability
 * - View model details including pricing and context window
 * - Set default model for different task types
 *
 * This page is wrapped by the AI Hub layout which provides:
 * - Sidebar navigation
 * - Mode toggle (Simple/Expert)
 * - AIHubModeProvider context
 */

import { useState, useMemo } from 'react';
import {
  Cpu,
  Search,
  Filter,
  Star,
  StarOff,
  Eye,
  Zap,
  DollarSign,
  MessageSquare,
  Code,
  Image,
  Loader2,
  RefreshCw,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/hooks/useToast';
import {
  useAvailableModels,
  useProviders,
  type ModelInfo,
} from '@/lib/hooks/use-ai-settings';
import { useAIHubMode } from '@/components/ai-hub';

// ============================================================================
// Types
// ============================================================================

type CapabilityFilter = 'all' | 'vision' | 'tools' | 'streaming';
type TierFilter = 'all' | 'flash' | 'standard' | 'premium' | 'expert';
type SortOption = 'name' | 'price_asc' | 'price_desc' | 'context_window';

// ============================================================================
// Constants
// ============================================================================

const CAPABILITY_FILTERS: { value: CapabilityFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'all', label: 'All', icon: Cpu },
  { value: 'vision', label: 'Vision', icon: Image },
  { value: 'tools', label: 'Tool Use', icon: Code },
  { value: 'streaming', label: 'Streaming', icon: Zap },
];

const TIER_FILTERS: { value: TierFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All Tiers', color: 'bg-muted' },
  { value: 'flash', label: 'Flash', color: 'bg-green-500/20 text-green-600' },
  { value: 'standard', label: 'Standard', color: 'bg-blue-500/20 text-blue-600' },
  { value: 'premium', label: 'Premium', color: 'bg-purple-500/20 text-purple-600' },
  { value: 'expert', label: 'Expert', color: 'bg-orange-500/20 text-orange-600' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'price_asc', label: 'Price (Low to High)' },
  { value: 'price_desc', label: 'Price (High to Low)' },
  { value: 'context_window', label: 'Context Window' },
];

// ============================================================================
// Helper Functions
// ============================================================================

function formatPrice(price: number | undefined): string {
  if (price === undefined || price === null) return 'N/A';
  if (price < 0.01) return '<$0.01';
  return `$${price.toFixed(2)}`;
}

function formatContextWindow(tokens: number | undefined): string {
  if (!tokens) return 'N/A';
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
  return tokens.toString();
}

function getTierFromPrice(inputPrice: number, outputPrice: number): TierFilter {
  const avgPrice = (inputPrice + outputPrice) / 2;
  // Prices are per 1M tokens in the ModelInfo type
  if (avgPrice < 0.5) return 'flash';
  if (avgPrice < 5) return 'standard';
  if (avgPrice < 20) return 'premium';
  return 'expert';
}

function hasCapability(model: ModelInfo, capability: string): boolean {
  // Check capabilities array first
  if (model.capabilities?.includes(capability)) return true;
  // Check individual flags
  switch (capability) {
    case 'vision':
      return model.supportsVision === true;
    case 'tools':
      return model.supportsFunctionCalling === true;
    case 'streaming':
      return model.supportsStreaming === true;
    default:
      return false;
  }
}

// ============================================================================
// Components
// ============================================================================

/**
 * Model capability badge
 */
function CapabilityBadge({ capability }: { capability: string }) {
  const icons: Record<string, React.ReactNode> = {
    vision: <Image className="h-3 w-3" />,
    tools: <Code className="h-3 w-3" />,
    streaming: <Zap className="h-3 w-3" />,
    computer_use: <MessageSquare className="h-3 w-3" />,
  };

  return (
    <Badge variant="outline" className="text-xs gap-1 px-1.5 py-0">
      {icons[capability]}
      <span className="capitalize">{capability.replace('_', ' ')}</span>
    </Badge>
  );
}

/**
 * Model card component
 */
interface ModelCardProps {
  model: ModelInfo;
  isDefault?: boolean;
  onSetDefault?: () => void;
}

function ModelCard({ model, isDefault, onSetDefault }: ModelCardProps) {
  const [expanded, setExpanded] = useState(false);

  const tier = getTierFromPrice(
    model.inputPrice || 0,
    model.outputPrice || 0
  );

  const tierConfig = TIER_FILTERS.find((t) => t.value === tier) || TIER_FILTERS[0];

  const capabilities: string[] = [];
  if (hasCapability(model, 'vision')) capabilities.push('vision');
  if (hasCapability(model, 'tools')) capabilities.push('tools');
  if (hasCapability(model, 'streaming')) capabilities.push('streaming');

  return (
    <Card className={cn(
      'transition-all hover:border-primary/50',
      isDefault && 'ring-2 ring-primary'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium truncate" title={model.displayName || model.modelId}>
                {model.displayName || model.modelId}
              </h3>
              {isDefault && (
                <Badge className="bg-primary text-primary-foreground text-xs">
                  Default
                </Badge>
              )}
              <Badge className={cn('text-xs', tierConfig.color)}>
                {tierConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {model.provider}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onSetDefault}
            title={isDefault ? 'Current default' : 'Set as default'}
          >
            {isDefault ? (
              <Star className="h-4 w-4 fill-primary text-primary" />
            ) : (
              <StarOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="mt-3 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            <span>{formatPrice(model.inputPrice)}/1M in</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{formatContextWindow(model.contextWindow)} ctx</span>
          </div>
        </div>

        {/* Capabilities */}
        {capabilities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {capabilities.map((cap) => (
              <CapabilityBadge key={cap} capability={cap} />
            ))}
          </div>
        )}

        {/* Expandable Details */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 h-7 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Less details
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              More details
            </>
          )}
        </Button>
        {expanded && (
          <div className="mt-3 pt-3 border-t text-sm space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Model ID:</span>
                <p className="font-mono text-xs truncate" title={model.modelId}>
                  {model.modelId}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Max Output:</span>
                <p>{formatContextWindow(model.maxOutputTokens)} tokens</p>
              </div>
              <div>
                <span className="text-muted-foreground">Input Price:</span>
                <p>{formatPrice(model.inputPrice)}/1M tokens</p>
              </div>
              <div>
                <span className="text-muted-foreground">Output Price:</span>
                <p>{formatPrice(model.outputPrice)}/1M tokens</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for model cards
 */
function ModelCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
        <div className="mt-3 flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="mt-3 flex gap-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-14" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function ModelsPage() {
  const { isSimple } = useAIHubMode();

  // Data fetching
  const { data: modelsResponse, isLoading: modelsLoading, error: modelsError, refetch } = useAvailableModels();
  const { data: providers } = useProviders();

  // Extract models array from response
  const models = modelsResponse?.models ?? [];

  // Filter state
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [capabilityFilter, setCapabilityFilter] = useState<CapabilityFilter>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');

  // Default model state (would be persisted to user preferences)
  const [defaultModelId, setDefaultModelId] = useState<string | null>(null);

  // Get unique providers from models
  const availableProviders = useMemo(() => {
    if (models.length === 0) return [];
    const providerSet = new Set(models.map((m) => m.provider));
    return Array.from(providerSet).sort();
  }, [models]);

  // Filter and sort models
  const filteredModels = useMemo(() => {
    if (models.length === 0) return [];

    let result = [...models];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.modelId.toLowerCase().includes(searchLower) ||
          (m.displayName?.toLowerCase().includes(searchLower)) ||
          m.provider.toLowerCase().includes(searchLower)
      );
    }

    // Provider filter
    if (providerFilter !== 'all') {
      result = result.filter((m) => m.provider === providerFilter);
    }

    // Capability filter
    if (capabilityFilter !== 'all') {
      result = result.filter((m) => hasCapability(m, capabilityFilter));
    }

    // Tier filter
    if (tierFilter !== 'all') {
      result = result.filter((m) => {
        const tier = getTierFromPrice(
          m.inputPrice || 0,
          m.outputPrice || 0
        );
        return tier === tierFilter;
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.displayName || a.modelId).localeCompare(b.displayName || b.modelId);
        case 'price_asc':
          return (a.inputPrice || 0) - (b.inputPrice || 0);
        case 'price_desc':
          return (b.inputPrice || 0) - (a.inputPrice || 0);
        case 'context_window':
          return (b.contextWindow || 0) - (a.contextWindow || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [models, search, providerFilter, capabilityFilter, tierFilter, sortBy]);

  // Handle set default
  const handleSetDefault = (modelId: string) => {
    setDefaultModelId(modelId);
    const model = models.find((m) => m.modelId === modelId);
    toast.success({
      title: 'Default Model Updated',
      description: `${model?.displayName || modelId} is now your default model.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Available Models</h2>
          <p className="text-sm text-muted-foreground">
            Browse and select AI models from your connected providers
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Provider Filter */}
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {availableProviders.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Capability Filter */}
            {!isSimple && (
              <Select value={capabilityFilter} onValueChange={(v) => setCapabilityFilter(v as CapabilityFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Capabilities" />
                </SelectTrigger>
                <SelectContent>
                  {CAPABILITY_FILTERS.map((cap) => (
                    <SelectItem key={cap.value} value={cap.value}>
                      <div className="flex items-center gap-2">
                        <cap.icon className="h-4 w-4" />
                        {cap.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Tier Filter */}
            <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as TierFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                {TIER_FILTERS.map((tier) => (
                  <SelectItem key={tier.value} value={tier.value}>
                    {tier.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          {modelsLoading ? (
            <Skeleton className="h-4 w-24 inline-block" />
          ) : (
            <>
              <strong className="text-foreground">{filteredModels.length}</strong>{' '}
              models found
            </>
          )}
        </span>
        {!modelsLoading && models.length > 0 && filteredModels.length < models.length && (
          <span>
            (filtered from {models.length} total)
          </span>
        )}
      </div>

      {/* Error State */}
      {modelsError && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-3 text-red-500">
            <Info className="h-5 w-5" />
            <span>Failed to load models. Please try again.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Models Grid */}
      {modelsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ModelCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredModels.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredModels.map((model) => (
            <ModelCard
              key={model.modelId}
              model={model}
              isDefault={model.modelId === defaultModelId}
              onSetDefault={() => handleSetDefault(model.modelId)}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Cpu className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium text-lg mb-1">No models found</h3>
            <p className="text-sm">
              {search || providerFilter !== 'all' || capabilityFilter !== 'all' || tierFilter !== 'all'
                ? 'Try adjusting your filters to see more models.'
                : 'Connect a provider to see available models.'}
            </p>
            {(search || providerFilter !== 'all' || capabilityFilter !== 'all' || tierFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearch('');
                  setProviderFilter('all');
                  setCapabilityFilter('all');
                  setTierFilter('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Note */}
      <Card className="bg-muted/50">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Model Availability</p>
            <p className="mt-1">
              Models shown here are available through your connected providers.
              Pricing is per 1 million tokens and may vary. Connect more providers
              in the Providers tab to access additional models.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
