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

// Supported providers
export const AI_PROVIDERS = ['anthropic', 'openai', 'google', 'groq', 'together'] as const;
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
      const response = await fetchJson<ProviderKey[]>('/api/v1/users/me/provider-keys');

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || [];
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
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
      const response = await fetchJson<AvailableModelsResponse>(
        '/api/v1/users/me/available-models'
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
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
      const response = await fetchJson<UsageResponse>(
        `/api/v1/users/me/ai-usage?days=${days}&limit=${limit}`
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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
      const response = await fetchJson<UsageSummary>(
        `/api/v1/users/me/ai-usage/summary?period=${period}`
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
