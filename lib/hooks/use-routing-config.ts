'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './use-auth-api';

// ============================================================================
// Types
// ============================================================================

/**
 * Routing mode - Auto (AI decides) or Manual (user-defined rules)
 */
export type RoutingMode = 'auto' | 'manual';

/**
 * Auto mode preset configurations
 */
export type AutoModePreset = 'quality_first' | 'balanced' | 'cost_optimized';

/**
 * Task types that can be routed to different models
 */
export type TaskType =
  | 'classification'
  | 'code_analysis'
  | 'test_generation'
  | 'self_healing'
  | 'computer_use'
  | 'summarization'
  | 'extraction'
  | 'chat'
  | 'embedding'
  | 'validation';

/**
 * A single routing rule for manual mode
 */
export interface RoutingRule {
  id: string;
  taskType: TaskType;
  modelId: string;
  provider: string;
  maxCostPerRequest: number;
  priority: number;
  enabled: boolean;
}

/**
 * A provider in the fallback chain
 */
export interface FallbackProvider {
  id: string;
  provider: string;
  displayName: string;
  enabled: boolean;
  order: number;
}

/**
 * Complete routing configuration
 * Note: Properties use camelCase because API responses are converted from snake_case
 */
export interface RoutingConfig {
  mode: RoutingMode;
  autoSettings: {
    preset: AutoModePreset;
    qualityCostBalance: number; // 0-100 slider value (0=cost, 100=quality)
    letAiDecide: boolean;
  };
  manualRules: RoutingRule[];
  fallbackChain: FallbackProvider[];
  usePlatformKeysFallback: boolean;
  updatedAt: string;
}

/**
 * Task type metadata for display
 */
export interface TaskTypeInfo {
  id: TaskType;
  name: string;
  description: string;
  recommendedModels: string[];
}

// ============================================================================
// Constants
// ============================================================================

export const TASK_TYPES: TaskTypeInfo[] = [
  {
    id: 'classification',
    name: 'Classification',
    description: 'Categorize inputs, sentiment analysis, intent detection',
    recommendedModels: ['claude-haiku-4', 'gpt-4o-mini', 'gemini-flash'],
  },
  {
    id: 'code_analysis',
    name: 'Code Analysis',
    description: 'Parse code, identify patterns, analyze complexity',
    recommendedModels: ['claude-sonnet-4-5', 'gpt-4o', 'deepseek-chat'],
  },
  {
    id: 'test_generation',
    name: 'Test Generation',
    description: 'Generate test cases, assertions, and test plans',
    recommendedModels: ['claude-sonnet-4-5', 'gpt-4o', 'claude-opus-4'],
  },
  {
    id: 'self_healing',
    name: 'Self-Healing',
    description: 'Analyze failures, fix selectors, update assertions',
    recommendedModels: ['claude-opus-4', 'claude-sonnet-4-5', 'gpt-4o'],
  },
  {
    id: 'computer_use',
    name: 'Computer Use',
    description: 'Browser automation, UI interactions, visual testing',
    recommendedModels: ['claude-sonnet-4-5', 'claude-opus-4'],
  },
  {
    id: 'summarization',
    name: 'Summarization',
    description: 'Generate summaries, reports, and digests',
    recommendedModels: ['claude-haiku-4', 'gpt-4o-mini', 'gemini-flash'],
  },
  {
    id: 'extraction',
    name: 'Data Extraction',
    description: 'Extract structured data from unstructured text',
    recommendedModels: ['claude-sonnet-4-5', 'gpt-4o', 'gemini-pro'],
  },
  {
    id: 'chat',
    name: 'Chat / Conversation',
    description: 'Interactive chat, Q&A, conversational tasks',
    recommendedModels: ['claude-sonnet-4-5', 'gpt-4o', 'claude-haiku-4'],
  },
  {
    id: 'embedding',
    name: 'Embeddings',
    description: 'Generate vector embeddings for semantic search',
    recommendedModels: ['text-embedding-3-large', 'voyage-3', 'bge-large'],
  },
  {
    id: 'validation',
    name: 'Validation',
    description: 'Validate outputs, check correctness, verify results',
    recommendedModels: ['claude-haiku-4', 'gpt-4o-mini', 'gemini-flash'],
  },
];

export const AUTO_MODE_PRESETS: Record<AutoModePreset, { name: string; description: string; balance: number }> = {
  quality_first: {
    name: 'Quality First',
    description: 'Prioritize output quality over cost. Best for critical tasks.',
    balance: 85,
  },
  balanced: {
    name: 'Balanced',
    description: 'Balance between quality and cost. Good for most use cases.',
    balance: 50,
  },
  cost_optimized: {
    name: 'Cost Optimized',
    description: 'Minimize costs while maintaining acceptable quality.',
    balance: 20,
  },
};

export const DEFAULT_FALLBACK_PROVIDERS: FallbackProvider[] = [
  { id: '1', provider: 'anthropic', displayName: 'Anthropic', enabled: true, order: 1 },
  { id: '2', provider: 'openai', displayName: 'OpenAI', enabled: true, order: 2 },
  { id: '3', provider: 'google', displayName: 'Google AI', enabled: true, order: 3 },
  { id: '4', provider: 'openrouter', displayName: 'OpenRouter', enabled: false, order: 4 },
  { id: '5', provider: 'groq', displayName: 'Groq', enabled: false, order: 5 },
  { id: '6', provider: 'together', displayName: 'Together AI', enabled: false, order: 6 },
];

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch the current routing configuration.
 *
 * @returns Query result with routing configuration
 */
export function useRoutingConfig() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useQuery({
    queryKey: ['routing-config'],
    queryFn: async () => {
      const response = await fetchJson<RoutingConfig>('/api/v1/users/me/routing-config');

      if (response.error) {
        // Return default config if none exists
        if (response.status === 404) {
          return getDefaultRoutingConfig();
        }
        throw new Error(response.error);
      }

      return response.data || getDefaultRoutingConfig();
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Hook to update the routing configuration.
 *
 * @returns Mutation for updating routing configuration
 */
export function useUpdateRoutingConfig() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<RoutingConfig>): Promise<RoutingConfig> => {
      const response = await fetchJson<RoutingConfig>('/api/v1/users/me/routing-config', {
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
      queryClient.setQueryData(['routing-config'], data);
    },
  });
}

/**
 * Hook to add a new routing rule.
 *
 * @returns Mutation for adding a routing rule
 */
export function useAddRoutingRule() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Omit<RoutingRule, 'id'>): Promise<RoutingRule> => {
      const response = await fetchJson<RoutingRule>('/api/v1/users/me/routing-rules', {
        method: 'POST',
        body: JSON.stringify(rule),
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
      queryClient.invalidateQueries({ queryKey: ['routing-config'] });
    },
  });
}

/**
 * Hook to update an existing routing rule.
 *
 * @returns Mutation for updating a routing rule
 */
export function useUpdateRoutingRule() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...rule }: RoutingRule): Promise<RoutingRule> => {
      const response = await fetchJson<RoutingRule>(`/api/v1/users/me/routing-rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(rule),
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
      queryClient.invalidateQueries({ queryKey: ['routing-config'] });
    },
  });
}

/**
 * Hook to delete a routing rule.
 *
 * @returns Mutation for deleting a routing rule
 */
export function useDeleteRoutingRule() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleId: string): Promise<{ success: boolean }> => {
      const response = await fetchJson<{ success: boolean }>(
        `/api/v1/users/me/routing-rules/${ruleId}`,
        { method: 'DELETE' }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-config'] });
    },
  });
}

/**
 * Hook to update the fallback chain order.
 *
 * @returns Mutation for updating the fallback chain
 */
export function useUpdateFallbackChain() {
  const { fetchJson } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chain: FallbackProvider[]): Promise<FallbackProvider[]> => {
      const response = await fetchJson<FallbackProvider[]>('/api/v1/users/me/fallback-chain', {
        method: 'PUT',
        body: JSON.stringify({ chain }),
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
      queryClient.invalidateQueries({ queryKey: ['routing-config'] });
    },
  });
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get default routing configuration
 */
export function getDefaultRoutingConfig(): RoutingConfig {
  return {
    mode: 'auto',
    autoSettings: {
      preset: 'balanced',
      qualityCostBalance: 50,
      letAiDecide: true,
    },
    manualRules: [],
    fallbackChain: DEFAULT_FALLBACK_PROVIDERS,
    usePlatformKeysFallback: true,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Generate a unique ID for new rules
 */
export function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
