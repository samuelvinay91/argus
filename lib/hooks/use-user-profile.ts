'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuthApi } from './use-auth-api';
// No conversion imports needed - backend CamelCaseMiddleware handles all case conversion

/**
 * User Profile Interface
 *
 * Represents the user profile data returned from the backend API.
 */
export interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  // Professional info
  jobTitle: string | null;
  company: string | null;
  department: string | null;
  phone: string | null;
  // Social links
  githubUsername: string | null;
  linkedinUrl: string | null;
  twitterHandle: string | null;
  websiteUrl: string | null;
  // Preferences
  defaultOrganizationId: string | null;
  defaultProjectId: string | null;
  onboardingCompleted: boolean;
  onboardingStep: number | null;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  loginCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * User Profile Update Payload
 *
 * Fields that can be updated via PUT /api/v1/users/me
 */
export interface UserProfileUpdate {
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  timezone?: string;
  language?: string;
  theme?: 'light' | 'dark' | 'system';
  // Professional info
  jobTitle?: string | null;
  company?: string | null;
  department?: string | null;
  phone?: string | null;
  // Social links
  githubUsername?: string | null;
  linkedinUrl?: string | null;
  twitterHandle?: string | null;
  websiteUrl?: string | null;
  defaultOrganizationId?: string | null;
}

/**
 * Avatar Upload Response
 */
export interface AvatarUploadResponse {
  success: boolean;
  avatarUrl: string;
  message: string;
}

/**
 * Account Activity Response
 * Note: Properties use camelCase because API responses are converted from snake_case
 */
export interface AccountActivity {
  memberSince: string;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  loginCount: number;
  organizationsCount: number;
  apiKeysCount: number;
  apiRequests30d: number;
  organizations: OrganizationSummary[];
}

/**
 * Organization Summary
 * Note: Properties use camelCase because API responses are converted from snake_case
 */
export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
  plan: string;
  memberCount: number;
  isDefault: boolean;
  isPersonal: boolean;
}

/**
 * Connected Account
 * Note: Properties use camelCase because API responses are converted from snake_case
 */
export interface ConnectedAccount {
  provider: string;
  providerName: string;
  email: string | null;
  connectedAt: string | null;
}

/**
 * Connected Accounts Response
 * Note: Properties use camelCase because API responses are converted from snake_case
 */
export interface ConnectedAccountsResponse {
  accounts: ConnectedAccount[];
  apiKeysActive: number;
  apiKeysTotal: number;
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
 *     await updateProfile({ displayName: 'New Name' });
 *   };
 *
 *   return (
 *     <div>
 *       <h1>{profile?.displayName}</h1>
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
    displayName: profile?.displayName ?? null,
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

/**
 * Hook to upload user avatar
 *
 * Provides a mutation for uploading avatar images via POST /api/v1/users/me/avatar
 *
 * @example
 * ```tsx
 * function AvatarUploader() {
 *   const { uploadAvatar, isUploading, error } = useUploadAvatar();
 *
 *   const handleFileChange = async (file: File) => {
 *     try {
 *       const result = await uploadAvatar(file);
 *       console.log('Avatar URL:', result.avatarUrl);
 *     } catch (err) {
 *       console.error('Upload failed:', err);
 *     }
 *   };
 *
 *   return <input type="file" onChange={(e) => handleFileChange(e.target.files[0])} />;
 * }
 * ```
 */
export function useUploadAvatar() {
  const { fetchJson, isLoaded, isSignedIn, userId, backendUrl, getToken } = useAuthApi();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<AvatarUploadResponse> => {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Get auth token
      const token = await getToken();

      // Use fetch directly for FormData (fetchJson adds Content-Type: application/json)
      const response = await fetch(`${backendUrl}/api/v1/users/me/avatar`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // Use default error message
        }
        throw new Error(errorMessage);
      }

      // Backend CamelCaseMiddleware returns camelCase already
      return await response.json() as AvatarUploadResponse;
    },
    onSuccess: (data) => {
      // Update the profile cache with the new avatar URL
      queryClient.setQueryData(['user-profile', userId], (old: UserProfile | undefined) => {
        if (old) {
          return { ...old, avatarUrl: data.avatarUrl };
        }
        return old;
      });
      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
    },
  });

  const uploadAvatar = useCallback(
    async (file: File) => {
      return uploadMutation.mutateAsync(file);
    },
    [uploadMutation]
  );

  return {
    /** Function to upload avatar file */
    uploadAvatar,
    /** Whether an upload is in progress */
    isUploading: uploadMutation.isPending,
    /** Whether the upload was successful */
    uploadSuccess: uploadMutation.isSuccess,
    /** Error from the last upload attempt */
    error: uploadMutation.error instanceof Error ? uploadMutation.error.message : null,
    /** Reset the mutation state */
    reset: uploadMutation.reset,
  };
}

/**
 * Hook to get user account activity
 *
 * Fetches account statistics from GET /api/v1/users/me/activity
 *
 * @example
 * ```tsx
 * function AccountStats() {
 *   const { activity, isLoading, error } = useAccountActivity();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *
 *   return (
 *     <div>
 *       <p>Member since: {activity?.member_since}</p>
 *       <p>Organizations: {activity?.organizations_count}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAccountActivity() {
  const { fetchJson, isLoaded, isSignedIn, userId } = useAuthApi();

  const {
    data: activity,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['account-activity', userId],
    queryFn: async () => {
      const response = await fetchJson<AccountActivity>('/api/v1/users/me/activity');

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  return {
    /** Account activity data */
    activity: activity ?? null,
    /** Whether data is loading */
    isLoading: !isLoaded || isLoading,
    /** Error message if fetch failed */
    error: queryError instanceof Error ? queryError.message : null,
    /** Refetch the data */
    refetch,
  };
}

/**
 * Hook to get connected accounts (OAuth providers and API keys summary)
 *
 * Fetches from GET /api/v1/users/me/connected-accounts
 *
 * @example
 * ```tsx
 * function ConnectedAccounts() {
 *   const { connectedAccounts, isLoading, error } = useConnectedAccounts();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <ul>
 *       {connectedAccounts?.accounts.map(account => (
 *         <li key={account.provider}>{account.provider_name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useConnectedAccounts() {
  const { fetchJson, isLoaded, isSignedIn, userId } = useAuthApi();

  const {
    data: connectedAccounts,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['connected-accounts', userId],
    queryFn: async () => {
      const response = await fetchJson<ConnectedAccountsResponse>('/api/v1/users/me/connected-accounts');

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  return {
    /** Connected accounts data */
    connectedAccounts: connectedAccounts ?? null,
    /** Whether data is loading */
    isLoading: !isLoaded || isLoading,
    /** Error message if fetch failed */
    error: queryError instanceof Error ? queryError.message : null,
    /** Refetch the data */
    refetch,
  };
}

/**
 * Hook to get user's organizations
 *
 * Fetches from GET /api/v1/users/me/organizations
 *
 * @example
 * ```tsx
 * function OrganizationList() {
 *   const { organizations, isLoading, error } = useUserOrganizations();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <ul>
 *       {organizations?.map(org => (
 *         <li key={org.id}>{org.name} ({org.role})</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useUserOrganizations() {
  const { fetchJson, isLoaded, isSignedIn, userId } = useAuthApi();

  const {
    data: organizations,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['user-organizations', userId],
    queryFn: async () => {
      const response = await fetchJson<OrganizationSummary[]>('/api/v1/users/me/organizations');

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  return {
    /** List of organizations */
    organizations: organizations ?? [],
    /** Whether data is loading */
    isLoading: !isLoaded || isLoading,
    /** Error message if fetch failed */
    error: queryError instanceof Error ? queryError.message : null,
    /** Refetch the data */
    refetch,
  };
}
