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
// Note: Properties use camelCase because API responses are converted from snake_case
export interface HealingConfig {
  id?: string;
  organizationId?: string;
  enabled: boolean;
  autoApply: boolean;
  minConfidenceAuto: number;
  minConfidenceSuggest: number;
  healSelectors: boolean;
  maxSelectorVariations: number;
  preferredSelectorStrategies: string[];
  healTimeouts: boolean;
  maxWaitTimeMs: number;
  healTextContent: boolean;
  textSimilarityThreshold: number;
  learnFromSuccess: boolean;
  learnFromManualFixes: boolean;
  sharePatternsAcrossProjects: boolean;
  notifyOnHeal: boolean;
  notifyOnSuggestion: boolean;
  requireApproval: boolean;
  autoApproveAfterHours: number | null;
  maxHealsPerHour: number;
  maxHealsPerTest: number;
}

export interface RecentHeal {
  id: string;
  original: string;
  healed: string;
  errorType: string;
  confidence: number;
  createdAt: string;
}

export interface HealingStats {
  totalPatterns: number;
  totalHealsApplied: number;
  totalHealsSuggested: number;
  successRate: number;
  healsLast24h: number;
  healsLast7d: number;
  healsLast30d: number;
  avgConfidence: number;
  topErrorTypes: Record<string, number>;
  patternsByProject: Record<string, number>;
  recentHeals: RecentHeal[];
}

// Default values
export const DEFAULT_HEALING_CONFIG: HealingConfig = {
  enabled: true,
  autoApply: false,
  minConfidenceAuto: 0.95,
  minConfidenceSuggest: 0.70,
  healSelectors: true,
  maxSelectorVariations: 9,
  preferredSelectorStrategies: ['id', 'data-testid', 'role', 'text', 'css'],
  healTimeouts: true,
  maxWaitTimeMs: 30000,
  healTextContent: true,
  textSimilarityThreshold: 0.85,
  learnFromSuccess: true,
  learnFromManualFixes: true,
  sharePatternsAcrossProjects: false,
  notifyOnHeal: true,
  notifyOnSuggestion: true,
  requireApproval: true,
  autoApproveAfterHours: null,
  maxHealsPerHour: 50,
  maxHealsPerTest: 5,
};

export const DEFAULT_HEALING_STATS: HealingStats = {
  totalPatterns: 0,
  totalHealsApplied: 0,
  totalHealsSuggested: 0,
  successRate: 0,
  healsLast24h: 0,
  healsLast7d: 0,
  healsLast30d: 0,
  avgConfidence: 0,
  topErrorTypes: {},
  patternsByProject: {},
  recentHeals: [],
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
