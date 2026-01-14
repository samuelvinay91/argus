'use client';

/**
 * Self-Healing Configuration Hooks
 *
 * Provides authenticated API calls for self-healing configuration.
 * Uses the global apiClient for consistent auth handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Types
export interface HealingConfig {
  id?: string;
  organization_id?: string;
  enabled: boolean;
  auto_apply: boolean;
  min_confidence_auto: number;
  min_confidence_suggest: number;
  heal_selectors: boolean;
  max_selector_variations: number;
  preferred_selector_strategies: string[];
  heal_timeouts: boolean;
  max_wait_time_ms: number;
  heal_text_content: boolean;
  text_similarity_threshold: number;
  learn_from_success: boolean;
  learn_from_manual_fixes: boolean;
  share_patterns_across_projects: boolean;
  notify_on_heal: boolean;
  notify_on_suggestion: boolean;
  require_approval: boolean;
  auto_approve_after_hours: number | null;
  max_heals_per_hour: number;
  max_heals_per_test: number;
}

export interface RecentHeal {
  id: string;
  original: string;
  healed: string;
  error_type: string;
  confidence: number;
  created_at: string;
}

export interface HealingStats {
  total_patterns: number;
  total_heals_applied: number;
  total_heals_suggested: number;
  success_rate: number;
  heals_last_24h: number;
  heals_last_7d: number;
  heals_last_30d: number;
  avg_confidence: number;
  top_error_types: Record<string, number>;
  patterns_by_project: Record<string, number>;
  recent_heals: RecentHeal[];
}

// Default values
export const DEFAULT_HEALING_CONFIG: HealingConfig = {
  enabled: true,
  auto_apply: false,
  min_confidence_auto: 0.95,
  min_confidence_suggest: 0.70,
  heal_selectors: true,
  max_selector_variations: 9,
  preferred_selector_strategies: ['id', 'data-testid', 'role', 'text', 'css'],
  heal_timeouts: true,
  max_wait_time_ms: 30000,
  heal_text_content: true,
  text_similarity_threshold: 0.85,
  learn_from_success: true,
  learn_from_manual_fixes: true,
  share_patterns_across_projects: false,
  notify_on_heal: true,
  notify_on_suggestion: true,
  require_approval: true,
  auto_approve_after_hours: null,
  max_heals_per_hour: 50,
  max_heals_per_test: 5,
};

export const DEFAULT_HEALING_STATS: HealingStats = {
  total_patterns: 0,
  total_heals_applied: 0,
  total_heals_suggested: 0,
  success_rate: 0,
  heals_last_24h: 0,
  heals_last_7d: 0,
  heals_last_30d: 0,
  avg_confidence: 0,
  top_error_types: {},
  patterns_by_project: {},
  recent_heals: [],
};

// Query keys factory
const healingKeys = {
  all: ['healing'] as const,
  config: (orgId: string) => [...healingKeys.all, 'config', orgId] as const,
  stats: (orgId: string) => [...healingKeys.all, 'stats', orgId] as const,
};

/**
 * Hook to fetch healing configuration
 */
export function useHealingConfig(orgId: string) {
  return useQuery({
    queryKey: healingKeys.config(orgId),
    queryFn: async () => {
      try {
        return await apiClient.get<HealingConfig>(`/api/v1/healing/organizations/${orgId}/config`);
      } catch (error) {
        // Return defaults if API fails
        console.error('Failed to fetch healing config:', error);
        return DEFAULT_HEALING_CONFIG;
      }
    },
    enabled: !!orgId,
    placeholderData: DEFAULT_HEALING_CONFIG,
  });
}

/**
 * Hook to fetch healing statistics
 */
export function useHealingStats(orgId: string) {
  return useQuery({
    queryKey: healingKeys.stats(orgId),
    queryFn: async () => {
      try {
        return await apiClient.get<HealingStats>(`/api/v1/healing/organizations/${orgId}/stats`);
      } catch (error) {
        // Return defaults if API fails
        console.error('Failed to fetch healing stats:', error);
        return DEFAULT_HEALING_STATS;
      }
    },
    enabled: !!orgId,
    placeholderData: DEFAULT_HEALING_STATS,
  });
}

/**
 * Hook to update healing configuration
 */
export function useUpdateHealingConfig(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: HealingConfig) => {
      return apiClient.put<HealingConfig>(
        `/api/v1/healing/organizations/${orgId}/config`,
        config
      );
    },
    onSuccess: (data) => {
      // Update the cache with the new config
      queryClient.setQueryData(healingKeys.config(orgId), data);
    },
  });
}
