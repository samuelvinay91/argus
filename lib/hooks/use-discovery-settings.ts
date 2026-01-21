'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuthApi } from './use-auth-api';

/**
 * Discovery Configuration Interface
 *
 * Represents the user's preferred discovery settings.
 */
export interface DiscoveryPreferences {
  mode: 'quick' | 'standard' | 'deep' | 'focused' | 'autonomous';
  strategy: 'bfs' | 'dfs' | 'priority' | 'ai-guided';
  maxPages: number;
  maxDepth: number;
  includePatterns: string;
  excludePatterns: string;
  focusAreas: string[];
  captureScreenshots: boolean;
  useVisionAi: boolean;
  authRequired?: boolean;
  authConfig?: {
    loginUrl?: string;
    username?: string;
    password?: string;
  };
}

/**
 * Default discovery preferences
 */
export const DEFAULT_DISCOVERY_PREFERENCES: DiscoveryPreferences = {
  mode: 'standard',
  strategy: 'bfs',
  maxPages: 50,
  maxDepth: 3,
  includePatterns: '',
  excludePatterns: '/api/*, /static/*, *.pdf, *.jpg, *.png',
  focusAreas: [],
  captureScreenshots: true,
  useVisionAi: false,
};

/**
 * Hook for managing discovery settings
 *
 * Provides functionality to:
 * - Fetch the current user's discovery preferences from the backend
 * - Update preferences with cloud persistence
 * - Handle loading, error, and success states
 *
 * @example
 * ```tsx
 * function DiscoveryPage() {
 *   const { preferences, loading, updatePreferences } = useDiscoverySettings();
 *
 *   const handleConfigChange = async (newConfig) => {
 *     await updatePreferences(newConfig);
 *   };
 *
 *   return (
 *     <ConfigPanel config={preferences} onChange={handleConfigChange} />
 *   );
 * }
 * ```
 */
export function useDiscoverySettings() {
  const { fetchJson, isLoaded, isSignedIn, userId } = useAuthApi();
  const queryClient = useQueryClient();

  // Fetch discovery preferences
  const {
    data: preferencesData,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['discovery-preferences', userId],
    queryFn: async () => {
      const response = await fetchJson<{ discovery_preferences: DiscoveryPreferences | null }>(
        '/api/v1/users/me'
      );

      if (response.error) {
        throw new Error(response.error);
      }

      // Return the discovery_preferences field, or default if not set
      const prefs = response.data?.discovery_preferences;
      if (prefs) {
        // Merge with defaults to handle any missing fields
        return { ...DEFAULT_DISCOVERY_PREFERENCES, ...prefs };
      }
      return DEFAULT_DISCOVERY_PREFERENCES;
    },
    enabled: isLoaded && isSignedIn && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    placeholderData: DEFAULT_DISCOVERY_PREFERENCES,
  });

  // Update discovery preferences mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<DiscoveryPreferences>) => {
      const response = await fetchJson<{ discovery_preferences: DiscoveryPreferences }>(
        '/api/v1/users/me/discovery-preferences',
        {
          method: 'PUT',
          body: JSON.stringify(updates),
        }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      // Return the discovery_preferences from the updated profile
      return response.data?.discovery_preferences ?? { ...preferencesData, ...updates };
    },
    onSuccess: (data) => {
      // Update the cache with the new preferences
      queryClient.setQueryData(['discovery-preferences', userId], data);
      // Also invalidate the user profile query to keep it in sync
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
    },
  });

  // Stable updatePreferences function
  const updatePreferences = useCallback(
    async (updates: Partial<DiscoveryPreferences>) => {
      return updateMutation.mutateAsync(updates);
    },
    [updateMutation]
  );

  // Replace all preferences at once
  const setPreferences = useCallback(
    async (preferences: DiscoveryPreferences) => {
      return updateMutation.mutateAsync(preferences);
    },
    [updateMutation]
  );

  // Compute loading state
  const loading = !isLoaded || isLoading;

  // Compute error state
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : 'Failed to load discovery settings'
    : updateMutation.error
      ? updateMutation.error instanceof Error
        ? updateMutation.error.message
        : 'Failed to update discovery settings'
      : null;

  return {
    /** The current discovery preferences, with defaults applied */
    preferences: preferencesData ?? DEFAULT_DISCOVERY_PREFERENCES,
    /** Whether the preferences are currently being loaded */
    loading,
    /** Error message if fetching or updating failed */
    error,
    /** Function to partially update preferences */
    updatePreferences,
    /** Function to replace all preferences */
    setPreferences,
    /** Function to refetch preferences from the server */
    refetch,
    /** Whether the update mutation is in progress */
    isUpdating: updateMutation.isPending,
    /** Whether the last update was successful */
    updateSuccess: updateMutation.isSuccess,
    /** Reset the mutation state */
    resetUpdateState: updateMutation.reset,
  };
}
