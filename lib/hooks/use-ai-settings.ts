'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './use-auth-api';

// ============================================================================
// Types
// ============================================================================

/**
 * User AI preferences for model selection and display.
 */
export interface AIPreferences {
  default_provider: string;
  default_model: string;
  cost_limit_per_day: number;
  cost_limit_per_message: number;
  use_platform_key_fallback: boolean;
  show_token_costs: boolean;
  show_model_in_chat: boolean;
  preferred_models_by_task?: Record<string, string>;
}

/**
 * Provider API key information (masked for display).
 */
export interface ProviderKey {
  id: string;
  provider: string;
  key_display: string;
  is_valid: boolean;
  last_validated_at: string | null;
  validation_error: string | null;
  created_at: string;
}

/**
 * Model information with pricing and capabilities.
 */
export interface ModelInfo {
  model_id: string;
  display_name: string;
  provider: string;
  input_price: number;
  output_price: number;
  capabilities: string[];
  is_available: boolean;
  tier?: ModelTier;
  context_window?: number;
  max_output_tokens?: number;
  supports_vision?: boolean;
  supports_function_calling?: boolean;
  supports_streaming?: boolean;
  deprecated?: boolean;
  deprecation_date?: string | null;
}

/**
 * Model tier for categorization.
 */
export type ModelTier = 'free' | 'standard' | 'premium' | 'enterprise';

/**
 * Model capability types for filtering.
 */
export type ModelCapability =
  | 'chat'
  | 'completion'
  | 'embedding'
  | 'vision'
  | 'function_calling'
  | 'streaming'
  | 'code'
  | 'reasoning';

/**
 * Filters for querying models.
 */
export interface ModelFilters {
  provider?: string;
  capability?: ModelCapability;
  tier?: ModelTier;
  search?: string;
}

/**
 * Provider information with status.
 */
export interface ProviderInfo {
  id: string;
  name: string;
  display_name: string;
  status: ProviderStatus;
  is_enabled: boolean;
  requires_api_key: boolean;
  supports_byok: boolean;
  models_count: number;
  base_url?: string;
  documentation_url?: string;
  icon_url?: string;
}

/**
 * Provider operational status.
 */
export type ProviderStatus = 'operational' | 'degraded' | 'outage' | 'maintenance' | 'unknown';

/**
 * Detailed provider status response.
 */
export interface ProviderStatusResponse {
  provider_id: string;
  status: ProviderStatus;
  latency_ms: number | null;
  last_checked_at: string;
  error_rate_percent: number;
  uptime_percent_24h: number;
  incidents: ProviderIncident[];
}

/**
 * Provider incident information.
 */
export interface ProviderIncident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  started_at: string;
  resolved_at: string | null;
  description: string;
}

/**
 * AI usage summary for billing dashboard.
 */
export interface UsageSummary {
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  platform_key_cost: number;
  byok_cost: number;
  usage_by_model: Record<string, { requests: number; tokens: number; cost: number }>;
  usage_by_provider: Record<string, { requests: number; cost: number }>;
}

/**
 * Daily usage record.
 */
export interface DailyUsage {
  date: string;
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
}

/**
 * Individual usage record.
 */
export interface UsageRecord {
  id: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  key_source: string;
  thread_id: string | null;
  created_at: string;
}

/**
 * Full usage response with summary and records.
 */
export interface UsageResponse {
  summary: UsageSummary;
  daily: DailyUsage[];
  records: UsageRecord[];
}

/**
 * User's current AI budget status.
 */
export interface BudgetStatus {
  has_budget: boolean;
  daily_limit: number;
  daily_spent: number;
  daily_remaining: number;
  message_limit: number;
}

/**
 * Available models response.
 */
export interface AvailableModelsResponse {
  models: ModelInfo[];
  user_providers: string[];
}

/**
 * Key validation response.
 */
export interface ValidateKeyResponse {
  is_valid: boolean;
  error: string | null;
  provider: string;
}

// Supported providers - matches backend VALID_PROVIDERS
export const AI_PROVIDERS = [
  // Primary providers
  'anthropic', 'openai', 'google',
  // Inference providers
  'groq', 'together', 'fireworks', 'cerebras',
  // Multi-model router (recommended)
  'openrouter',
  // Specialized providers
  'deepseek', 'mistral', 'perplexity', 'cohere', 'xai',
  // Enterprise providers
  'azure_openai', 'aws_bedrock', 'google_vertex',
] as const;
export type AIProvider = (typeof AI_PROVIDERS)[number];

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch user's AI preferences.
 *
 * @returns Query result with AI preferences
 *
 * @example
 * ```tsx
 * function ModelSelector() {
 *   const { data: prefs, isLoading } = useAIPreferences();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return <div>Default model: {prefs?.default_model}</div>;
 * }
 * ```
 */
export function useAIPreferences() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['ai-preferences'],
    queryFn: async () => {
      const response = await fetchJson<AIPreferences>('/api/v1/users/me/ai-preferences');

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Hook to update user's AI preferences.
 *
 * @returns Mutation for updating AI preferences
 *
 * @example
 * ```tsx
 * function ModelSelector() {
 *   const updatePrefs = useUpdateAIPreferences();
 *
 *   const handleChange = async (model: string) => {
 *     await updatePrefs.mutateAsync({ default_model: model });
 *   };
 *
 *   return <select onChange={(e) => handleChange(e.target.value)}>...</select>;
 * }
 * ```
 */
export function useUpdateAIPreferences() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<AIPreferences>): Promise<AIPreferences> => {
      const response = await fetchJson<AIPreferences>('/api/v1/users/me/ai-preferences', {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['ai-preferences'], data);
    },
  });
}

/**
 * Hook to fetch user's provider keys (BYOK).
 *
 * @returns Query result with list of provider keys
 */
export function useProviderKeys() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['provider-keys'],
    queryFn: async () => {
      try {
        const response = await fetchJson<ProviderKey[]>('/api/v1/users/me/provider-keys');

        if (response.error) {
          console.warn('Failed to fetch provider keys:', response.error);
          return [];
        }

        return response.data || [];
      } catch (error) {
        console.warn('Provider keys API unavailable:', error);
        return [];
      }
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: false,
  });
}

/**
 * Hook to add a provider API key.
 *
 * @returns Mutation for adding provider keys
 */
export function useAddProviderKey() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      provider,
      api_key,
      display_name,
    }: {
      provider: AIProvider;
      api_key: string;
      display_name?: string;
    }): Promise<ProviderKey> => {
      const response = await fetchJson<ProviderKey>('/api/v1/users/me/provider-keys', {
        method: 'POST',
        body: JSON.stringify({ provider, api_key, display_name }),
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-keys'] });
      queryClient.invalidateQueries({ queryKey: ['available-models'] });
    },
  });
}

/**
 * Hook to remove a provider API key.
 *
 * @returns Mutation for removing provider keys
 */
export function useRemoveProviderKey() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: AIProvider): Promise<{ success: boolean; message: string }> => {
      const response = await fetchJson<{ success: boolean; message: string }>(
        `/api/v1/users/me/provider-keys/${provider}`,
        { method: 'DELETE' }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || { success: true, message: 'Provider key removed' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-keys'] });
      queryClient.invalidateQueries({ queryKey: ['available-models'] });
    },
  });
}

/**
 * Hook to validate a stored provider key.
 *
 * @returns Mutation for validating provider keys
 */
export function useValidateProviderKey() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: AIProvider): Promise<ValidateKeyResponse> => {
      const response = await fetchJson<ValidateKeyResponse>(
        `/api/v1/users/me/provider-keys/${provider}/validate`,
        { method: 'POST' }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-keys'] });
    },
  });
}

/**
 * Hook to fetch available AI models.
 *
 * @returns Query result with available models and user's providers
 */
export function useAvailableModels() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['available-models'],
    queryFn: async () => {
      try {
        const response = await fetchJson<AvailableModelsResponse>(
          '/api/v1/users/me/available-models'
        );

        if (response.error) {
          console.warn('Failed to fetch available models:', response.error);
          return { models: [], user_providers: [] };
        }

        return response.data || { models: [], user_providers: [] };
      } catch (error) {
        console.warn('Available models API unavailable:', error);
        return { models: [], user_providers: [] };
      }
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: false,
  });
}

/**
 * Hook to fetch AI usage history.
 *
 * @param days - Number of days to fetch (default: 30)
 * @param limit - Maximum number of records (default: 100)
 * @returns Query result with usage data
 */
export function useAIUsage(days = 30, limit = 100) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['ai-usage', days, limit],
    queryFn: async () => {
      try {
        const response = await fetchJson<UsageResponse>(
          `/api/v1/users/me/ai-usage?days=${days}&limit=${limit}`
        );

        if (response.error) {
          console.warn('Failed to fetch AI usage:', response.error);
          return null;
        }

        return response.data;
      } catch (error) {
        console.warn('AI usage API unavailable:', error);
        return null;
      }
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
  });
}

/**
 * Hook to fetch AI usage summary.
 *
 * @param period - Period for summary: 'day', 'week', or 'month' (default: 'month')
 * @returns Query result with usage summary
 */
export function useAIUsageSummary(period: 'day' | 'week' | 'month' = 'month') {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['ai-usage-summary', period],
    queryFn: async () => {
      try {
        const response = await fetchJson<UsageSummary>(
          `/api/v1/users/me/ai-usage/summary?period=${period}`
        );

        if (response.error) {
          console.warn('Failed to fetch AI usage summary:', response.error);
          return null;
        }

        return response.data;
      } catch (error) {
        console.warn('AI usage summary API unavailable:', error);
        return null;
      }
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });
}

/**
 * Hook to fetch user's AI budget status.
 *
 * @returns Query result with budget status
 */
export function useAIBudget() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['ai-budget'],
    queryFn: async () => {
      const response = await fetchJson<BudgetStatus>('/api/v1/users/me/ai-budget');

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 60 * 1000, // 1 minute (budget changes frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// Models API Hooks
// ============================================================================

/**
 * Hook to fetch models with optional filters.
 *
 * @param filters - Optional filters for provider, capability, tier, or search
 * @returns Query result with filtered models
 *
 * @example
 * ```tsx
 * function ModelList() {
 *   // Fetch all models
 *   const { data: allModels } = useModels();
 *
 *   // Fetch only Anthropic models with vision capability
 *   const { data: anthropicVision } = useModels({
 *     provider: 'anthropic',
 *     capability: 'vision',
 *   });
 *
 *   // Search for models by name
 *   const { data: searchResults } = useModels({ search: 'gpt-4' });
 *
 *   return <ModelGrid models={allModels} />;
 * }
 * ```
 */
export function useModels(filters?: ModelFilters) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  // Build query string from filters
  const queryParams = new URLSearchParams();
  if (filters?.provider) queryParams.append('provider', filters.provider);
  if (filters?.capability) queryParams.append('capability', filters.capability);
  if (filters?.tier) queryParams.append('tier', filters.tier);
  if (filters?.search) queryParams.append('search', filters.search);

  const queryString = queryParams.toString();
  const endpoint = `/api/v1/models${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['models', filters],
    queryFn: async () => {
      const response = await fetchJson<ModelInfo[]>(endpoint);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || [];
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 10 * 60 * 1000, // 10 minutes - models don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch all providers with their status.
 *
 * @returns Query result with list of providers and their status
 *
 * @example
 * ```tsx
 * function ProviderList() {
 *   const { data: providers, isLoading } = useProviders();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <ul>
 *       {providers?.map((p) => (
 *         <li key={p.id}>
 *           {p.display_name} - {p.status}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useProviders() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      try {
        const response = await fetchJson<ProviderInfo[]>('/api/v1/providers');

        if (response.error) {
          // Return empty array on error instead of throwing
          console.warn('Failed to fetch providers:', response.error);
          return [];
        }

        return response.data || [];
      } catch (error) {
        // Gracefully handle network/API errors
        console.warn('Provider API unavailable:', error);
        return [];
      }
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: false, // Don't retry on failure
  });
}

/**
 * Hook to fetch detailed status for a specific provider.
 *
 * @param providerId - The provider ID to check status for
 * @returns Query result with detailed provider status including latency and incidents
 *
 * @example
 * ```tsx
 * function ProviderStatusCard({ providerId }: { providerId: string }) {
 *   const { data: status, isLoading } = useProviderStatus(providerId);
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   return (
 *     <Card>
 *       <Badge color={status?.status === 'operational' ? 'green' : 'red'}>
 *         {status?.status}
 *       </Badge>
 *       <p>Latency: {status?.latency_ms}ms</p>
 *       <p>Uptime (24h): {status?.uptime_percent_24h}%</p>
 *     </Card>
 *   );
 * }
 * ```
 */
export function useProviderStatus(providerId: string | null | undefined) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['provider-status', providerId],
    queryFn: async () => {
      if (!providerId) {
        throw new Error('Provider ID is required');
      }

      const response = await fetchJson<ProviderStatusResponse>(
        `/api/v1/providers/${providerId}/status`
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn && !!providerId,
    staleTime: 60 * 1000, // 1 minute - status changes frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Auto-refresh every minute when visible
  });
}

/**
 * Hook to set the user's default model.
 * This is a convenience wrapper around useUpdateAIPreferences for setting just the default model.
 *
 * @returns Mutation for setting the default model
 *
 * @example
 * ```tsx
 * function ModelSelector() {
 *   const setDefaultModel = useSetDefaultModel();
 *   const { data: models } = useModels();
 *
 *   const handleSelect = async (modelId: string, provider: string) => {
 *     await setDefaultModel.mutateAsync({ modelId, provider });
 *   };
 *
 *   return (
 *     <select onChange={(e) => {
 *       const model = models?.find(m => m.model_id === e.target.value);
 *       if (model) handleSelect(model.model_id, model.provider);
 *     }}>
 *       {models?.map((m) => (
 *         <option key={m.model_id} value={m.model_id}>
 *           {m.display_name}
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useSetDefaultModel() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      modelId,
      provider,
    }: {
      modelId: string;
      provider: string;
    }): Promise<AIPreferences> => {
      const response = await fetchJson<AIPreferences>('/api/v1/users/me/ai-preferences', {
        method: 'PUT',
        body: JSON.stringify({
          default_model: modelId,
          default_provider: provider,
        }),
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      return response.data;
    },
    onSuccess: (data) => {
      // Update the preferences cache
      queryClient.setQueryData(['ai-preferences'], data);
    },
  });
}

// ============================================================================
// OpenRouter Models Hook
// ============================================================================

/**
 * OpenRouter model from their API (400+ models available).
 */
export interface OpenRouterModel {
  id: string;
  name: string;
  description: string | null;
  provider: string;
  context_length: number;
  pricing: {
    prompt: number;  // Per 1M tokens
    completion: number;
  };
  supports_vision: boolean;
  supports_tools: boolean;
  supports_json_mode: boolean;
}

/**
 * Hook to fetch models available via OpenRouter.
 *
 * OpenRouter provides access to 400+ models from all major providers
 * through a single API key.
 *
 * @param filters - Optional filters for provider, capabilities, etc.
 * @returns Query result with OpenRouter models
 *
 * @example
 * ```tsx
 * function OpenRouterModelList() {
 *   const { data, isLoading } = useOpenRouterModels();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <ul>
 *       {data?.models.map((m) => (
 *         <li key={m.id}>{m.name} - ${m.pricing.prompt}/1M</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useOpenRouterModels(filters?: {
  provider?: string;
  search?: string;
  supports_vision?: boolean;
  supports_tools?: boolean;
  min_context?: number;
}) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  // Build query string from filters
  const queryParams = new URLSearchParams();
  if (filters?.provider) queryParams.append('provider', filters.provider);
  if (filters?.search) queryParams.append('search', filters.search);
  if (filters?.supports_vision !== undefined) {
    queryParams.append('supports_vision', String(filters.supports_vision));
  }
  if (filters?.supports_tools !== undefined) {
    queryParams.append('supports_tools', String(filters.supports_tools));
  }
  if (filters?.min_context) queryParams.append('min_context', String(filters.min_context));

  const queryString = queryParams.toString();
  const endpoint = `/api/v1/openrouter/models${queryString ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['openrouter-models', filters],
    queryFn: async () => {
      try {
        const response = await fetchJson<{
          models: OpenRouterModel[];
          total: number;
          cached: boolean;
          cache_age_seconds: number | null;
        }>(endpoint);

        if (response.error) {
          console.warn('Failed to fetch OpenRouter models:', response.error);
          return { models: [], total: 0, cached: false, cache_age_seconds: null };
        }

        return response.data || { models: [], total: 0, cached: false, cache_age_seconds: null };
      } catch (error) {
        console.warn('OpenRouter models API unavailable:', error);
        return { models: [], total: 0, cached: false, cache_age_seconds: null };
      }
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 60 * 60 * 1000, // 1 hour - models don't change frequently
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: false,
  });
}

/**
 * Combined hook for AI settings page.
 * Fetches all AI-related data in one hook.
 *
 * @returns Combined AI settings data and mutations
 *
 * @example
 * ```tsx
 * function AISettingsPage() {
 *   const {
 *     preferences,
 *     providerKeys,
 *     models,
 *     usageSummary,
 *     budgetStatus,
 *     isLoading,
 *     error,
 *     updatePreferences,
 *     addProviderKey,
 *     removeProviderKey,
 *     validateProviderKey,
 *   } = useAISettings();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *
 *   return <AISettingsSection {...} />;
 * }
 * ```
 */
export function useAISettings() {
  // Queries
  const preferencesQuery = useAIPreferences();
  const providerKeysQuery = useProviderKeys();
  const modelsQuery = useAvailableModels();
  const usageQuery = useAIUsageSummary('month');
  const budgetQuery = useAIBudget();

  // Mutations
  const updatePreferencesMutation = useUpdateAIPreferences();
  const addProviderKeyMutation = useAddProviderKey();
  const removeProviderKeyMutation = useRemoveProviderKey();
  const validateProviderKeyMutation = useValidateProviderKey();

  // Combined loading state
  const isLoading =
    preferencesQuery.isLoading ||
    providerKeysQuery.isLoading ||
    modelsQuery.isLoading;

  // Combined error state
  const error =
    preferencesQuery.error?.message ||
    providerKeysQuery.error?.message ||
    modelsQuery.error?.message ||
    null;

  return {
    // Data
    preferences: preferencesQuery.data || null,
    providerKeys: providerKeysQuery.data || [],
    models: modelsQuery.data?.models || [],
    userProviders: modelsQuery.data?.user_providers || [],
    usageSummary: usageQuery.data || null,
    budgetStatus: budgetQuery.data || null,

    // Loading/Error states
    isLoading,
    error,

    // Mutations (wrapped for easier use)
    updatePreferences: async (prefs: Partial<AIPreferences>) => {
      await updatePreferencesMutation.mutateAsync(prefs);
    },
    addProviderKey: async (provider: string, apiKey: string) => {
      await addProviderKeyMutation.mutateAsync({
        provider: provider as AIProvider,
        api_key: apiKey,
      });
    },
    removeProviderKey: async (provider: string) => {
      await removeProviderKeyMutation.mutateAsync(provider as AIProvider);
    },
    validateProviderKey: async (provider: string) => {
      return await validateProviderKeyMutation.mutateAsync(provider as AIProvider);
    },

    // Mutation states
    isUpdatingPreferences: updatePreferencesMutation.isPending,
    isAddingKey: addProviderKeyMutation.isPending,
    isRemovingKey: removeProviderKeyMutation.isPending,
    isValidatingKey: validateProviderKeyMutation.isPending,

    // Refetch functions
    refetchPreferences: preferencesQuery.refetch,
    refetchProviderKeys: providerKeysQuery.refetch,
    refetchModels: modelsQuery.refetch,
    refetchUsage: usageQuery.refetch,
    refetchBudget: budgetQuery.refetch,
  };
}
