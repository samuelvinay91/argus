'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuthApi } from './use-auth-api';

/**
 * User Profile Interface
 *
 * Represents the user profile data returned from the backend API.
 */
export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  default_organization_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * User Profile Update Payload
 *
 * Fields that can be updated via PUT /api/v1/users/me
 */
export interface UserProfileUpdate {
  display_name?: string;
  bio?: string | null;
  avatar_url?: string | null;
  timezone?: string;
  language?: string;
  theme?: 'light' | 'dark' | 'system';
  default_organization_id?: string | null;
}

/**
 * Hook for managing the current user's profile
 *
 * Provides functionality to:
 * - Fetch the current user's profile from GET /api/v1/users/me
 * - Update the profile via PUT /api/v1/users/me
 * - Handle loading, error, and success states
 *
 * @example
 * ```tsx
 * function ProfilePage() {
 *   const { profile, loading, error, updateProfile, refetch } = useUserProfile();
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *
 *   const handleSave = async () => {
 *     await updateProfile({ display_name: 'New Name' });
 *   };
 *
 *   return (
 *     <div>
 *       <h1>{profile?.display_name}</h1>
 *       <button onClick={handleSave}>Update Name</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserProfile() {
  const { fetchJson, isLoaded, isSignedIn, userId } = useAuthApi();
  const queryClient = useQueryClient();

  // Fetch user profile
  const {
    data: profileData,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const response = await fetchJson<UserProfile>('/api/v1/users/me');

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - profile rarely changes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  // Update user profile mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: UserProfileUpdate) => {
      const response = await fetchJson<UserProfile>('/api/v1/users/me', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      // Update the cache with the new profile data
      queryClient.setQueryData(['user-profile', userId], data);
      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
    },
  });

  // Stable updateProfile function
  const updateProfile = useCallback(
    async (updates: UserProfileUpdate) => {
      return updateMutation.mutateAsync(updates);
    },
    [updateMutation]
  );

  // Compute loading state - include initial auth loading
  const loading = !isLoaded || isLoading;

  // Compute error state
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : 'Failed to load profile'
    : updateMutation.error
      ? updateMutation.error instanceof Error
        ? updateMutation.error.message
        : 'Failed to update profile'
      : null;

  return {
    /** The current user's profile, or null if not loaded */
    profile: profileData ?? null,
    /** Whether the profile is currently being loaded */
    loading,
    /** Error message if fetching or updating failed */
    error,
    /** Function to update the user's profile */
    updateProfile,
    /** Function to refetch the profile from the server */
    refetch,
    /** Whether the update mutation is in progress */
    isUpdating: updateMutation.isPending,
    /** Whether the last update was successful */
    updateSuccess: updateMutation.isSuccess,
    /** Reset the mutation state (clear errors, success flags) */
    resetUpdateState: updateMutation.reset,
  };
}

/**
 * Hook to get just the user's display name
 *
 * Useful for components that only need the display name
 * and want to avoid re-renders from other profile changes.
 */
export function useUserDisplayName() {
  const { profile, loading } = useUserProfile();

  return {
    displayName: profile?.display_name ?? null,
    loading,
  };
}

/**
 * Hook to get user's theme preference
 *
 * Useful for theme providers and components that need
 * to react to theme changes.
 */
export function useUserTheme() {
  const { profile, loading, updateProfile } = useUserProfile();

  const setTheme = useCallback(
    async (theme: 'light' | 'dark' | 'system') => {
      await updateProfile({ theme });
    },
    [updateProfile]
  );

  return {
    theme: profile?.theme ?? 'system',
    loading,
    setTheme,
  };
}

/**
 * Hook to get user's timezone
 *
 * Useful for components that need to display dates/times
 * in the user's preferred timezone.
 */
export function useUserTimezone() {
  const { profile, loading } = useUserProfile();

  return {
    timezone: profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    loading,
  };
}
