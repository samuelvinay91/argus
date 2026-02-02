'use client';

/**
 * React Hook for User Settings/Preferences Management
 *
 * Provides hooks to fetch and update user preferences including:
 * - Notification preferences (email, Slack, in-app)
 * - Test defaults (browser, timeout, parallel execution)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuthApi } from './use-auth-api';

// ============================================================================
// Types
// ============================================================================

/**
 * Notification preferences matching backend NotificationPreferences model
 * Note: Properties use camelCase because API responses are converted from snake_case
 */
export interface NotificationPreferences {
  // Email notifications
  emailNotifications: boolean;
  emailTestFailures: boolean;
  emailTestCompletions: boolean;
  emailWeeklyDigest: boolean;

  // Slack notifications
  slackNotifications: boolean;
  slackTestFailures: boolean;
  slackTestCompletions: boolean;

  // In-app notifications
  inAppNotifications: boolean;
  inAppTestFailures: boolean;
  inAppTestCompletions: boolean;

  // Alert settings
  testFailureAlerts: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
  alertThreshold: number; // Percentage threshold for alerting (e.g., 80 means alert if pass rate < 80%)
}

/**
 * Test execution defaults
 * Note: Properties use camelCase because API responses are converted from snake_case
 */
export interface TestDefaults {
  defaultBrowser: 'chromium' | 'firefox' | 'webkit';
  defaultTimeout: number; // Timeout in milliseconds
  parallelExecution: boolean;
  retryFailedTests: boolean;
  maxRetries: number;
  screenshotOnFailure: boolean;
  videoRecording: boolean;
}

/**
 * Complete user settings combining notifications and test defaults
 */
export interface UserSettings {
  notifications: NotificationPreferences;
  testDefaults: TestDefaults;
}

/**
 * User profile response from the backend API
 * Note: Properties use camelCase because API responses are converted from snake_case
 */
export interface UserProfile {
  id: string;
  userId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  timezone: string | null;
  language: string | null;
  theme: 'light' | 'dark' | 'system' | null;
  notificationPreferences: NotificationPreferences;
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
 * Update notification preferences request
 * Note: Properties use camelCase because API responses are converted from snake_case
 */
export interface UpdateNotificationPreferencesRequest {
  emailNotifications?: boolean;
  emailTestFailures?: boolean;
  emailTestCompletions?: boolean;
  emailWeeklyDigest?: boolean;
  slackNotifications?: boolean;
  slackTestFailures?: boolean;
  slackTestCompletions?: boolean;
  inAppNotifications?: boolean;
  inAppTestFailures?: boolean;
  inAppTestCompletions?: boolean;
  testFailureAlerts?: boolean;
  dailyDigest?: boolean;
  weeklyReport?: boolean;
  alertThreshold?: number;
}

/**
 * Update test defaults request
 * Note: Properties use camelCase because API responses are converted from snake_case
 */
export interface UpdateTestDefaultsRequest {
  defaultBrowser?: 'chromium' | 'firefox' | 'webkit';
  defaultTimeout?: number;
  parallelExecution?: boolean;
  retryFailedTests?: boolean;
  maxRetries?: number;
  screenshotOnFailure?: boolean;
  videoRecording?: boolean;
}

/**
 * Combined preferences update request
 */
export interface UpdatePreferencesRequest {
  notifications?: UpdateNotificationPreferencesRequest;
  testDefaults?: UpdateTestDefaultsRequest;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailNotifications: true,
  emailTestFailures: true,
  emailTestCompletions: false,
  emailWeeklyDigest: true,
  slackNotifications: false,
  slackTestFailures: false,
  slackTestCompletions: false,
  inAppNotifications: true,
  inAppTestFailures: true,
  inAppTestCompletions: true,
  testFailureAlerts: true,
  dailyDigest: false,
  weeklyReport: true,
  alertThreshold: 80,
};

const DEFAULT_TEST_DEFAULTS: TestDefaults = {
  defaultBrowser: 'chromium',
  defaultTimeout: 30000,
  parallelExecution: true,
  retryFailedTests: true,
  maxRetries: 2,
  screenshotOnFailure: true,
  videoRecording: false,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch and manage user settings/preferences
 *
 * @example
 * ```tsx
 * function SettingsPage() {
 *   const {
 *     settings,
 *     isLoading,
 *     error,
 *     updateNotificationPreferences,
 *     updateTestDefaults,
 *     isUpdating,
 *   } = useUserSettings();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return (
 *     <div>
 *       <Toggle
 *         checked={settings.notifications.email_notifications}
 *         onChange={(checked) =>
 *           updateNotificationPreferences({ email_notifications: checked })
 *         }
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserSettings() {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();
  const queryClient = useQueryClient();

  // Fetch user profile/preferences
  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const response = await fetchJson<UserProfile>('/api/v1/users/me');

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000, // 5 minutes - settings don't change frequently
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  // Merge backend notification preferences with defaults
  const notificationPreferences: NotificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(profile?.notificationPreferences || {}),
  };

  // For now, test defaults would come from user profile metadata or a separate endpoint
  // Using defaults until backend supports test defaults
  const testDefaults: TestDefaults = DEFAULT_TEST_DEFAULTS;

  // Combined settings object
  const settings: UserSettings = {
    notifications: notificationPreferences,
    testDefaults: testDefaults,
  };

  // Mutation for updating notification preferences
  const updateNotificationsMutation = useMutation({
    mutationFn: async (updates: UpdateNotificationPreferencesRequest) => {
      const response = await fetchJson<UserProfile>('/api/v1/users/me/preferences', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      // Update the cached user profile
      queryClient.setQueryData(['user-settings'], data);
    },
    onError: (error) => {
      console.error('Failed to update notification preferences:', error);
    },
  });

  // Mutation for updating test defaults
  const updateTestDefaultsMutation = useMutation({
    mutationFn: async (updates: UpdateTestDefaultsRequest) => {
      const response = await fetchJson<UserProfile>('/api/v1/users/me/test-defaults', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user-settings'], data);
    },
    onError: (error) => {
      console.error('Failed to update test defaults:', error);
    },
  });

  // Combined update function
  const updatePreferences = useCallback(
    async (updates: UpdatePreferencesRequest) => {
      const promises: Promise<UserProfile | null>[] = [];

      if (updates.notifications) {
        promises.push(updateNotificationsMutation.mutateAsync(updates.notifications));
      }

      if (updates.testDefaults) {
        promises.push(updateTestDefaultsMutation.mutateAsync(updates.testDefaults));
      }

      const results = await Promise.all(promises);
      return results[results.length - 1]; // Return the last updated profile
    },
    [updateNotificationsMutation, updateTestDefaultsMutation]
  );

  // Convenience function for updating a single notification preference
  const updateNotificationPreference = useCallback(
    <K extends keyof NotificationPreferences>(
      key: K,
      value: NotificationPreferences[K]
    ) => {
      return updateNotificationsMutation.mutateAsync({ [key]: value });
    },
    [updateNotificationsMutation]
  );

  // Convenience function for updating a single test default
  const updateTestDefault = useCallback(
    <K extends keyof TestDefaults>(key: K, value: TestDefaults[K]) => {
      return updateTestDefaultsMutation.mutateAsync({ [key]: value });
    },
    [updateTestDefaultsMutation]
  );

  return {
    // Data
    settings,
    profile,
    notificationPreferences,
    testDefaults,

    // Loading/error states
    isLoading,
    error: error as Error | null,
    isUpdating:
      updateNotificationsMutation.isPending || updateTestDefaultsMutation.isPending,
    updateNotificationsError: updateNotificationsMutation.error as Error | null,
    updateTestDefaultsError: updateTestDefaultsMutation.error as Error | null,

    // Actions
    updateNotificationPreferences: updateNotificationsMutation.mutate,
    updateNotificationPreferencesAsync: updateNotificationsMutation.mutateAsync,
    updateTestDefaults: updateTestDefaultsMutation.mutate,
    updateTestDefaultsAsync: updateTestDefaultsMutation.mutateAsync,
    updatePreferences,
    updateNotificationPreference,
    updateTestDefault,
    refetch,

    // Mutation states for fine-grained control
    notificationsMutation: updateNotificationsMutation,
    testDefaultsMutation: updateTestDefaultsMutation,
  };
}

/**
 * Hook to fetch only notification preferences (lighter weight)
 */
export function useNotificationPreferences() {
  const { settings, isLoading, error, updateNotificationPreferences, isUpdating } =
    useUserSettings();

  return {
    preferences: settings.notifications,
    isLoading,
    error,
    updatePreferences: updateNotificationPreferences,
    isUpdating,
  };
}

/**
 * Hook to fetch only test defaults (lighter weight)
 */
export function useTestDefaults() {
  const { settings, isLoading, error, updateTestDefaults, isUpdating } =
    useUserSettings();

  return {
    defaults: settings.testDefaults,
    isLoading,
    error,
    updateDefaults: updateTestDefaults,
    isUpdating,
  };
}

/**
 * Hook to check if a specific notification type is enabled
 */
export function useNotificationEnabled(
  notificationType: keyof NotificationPreferences
): boolean {
  const { settings, isLoading } = useUserSettings();

  if (isLoading) {
    return DEFAULT_NOTIFICATION_PREFERENCES[notificationType] as boolean;
  }

  return settings.notifications[notificationType] as boolean;
}

/**
 * Hook for toggling a notification preference with optimistic updates
 */
export function useToggleNotification(
  notificationType: keyof NotificationPreferences
) {
  const queryClient = useQueryClient();
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetchJson<UserProfile>('/api/v1/users/me/preferences', {
        method: 'PUT',
        body: JSON.stringify({ [notificationType]: enabled }),
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onMutate: async (enabled) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user-settings'] });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<UserProfile>(['user-settings']);

      // Optimistically update to the new value
      if (previousSettings) {
        queryClient.setQueryData<UserProfile>(['user-settings'], {
          ...previousSettings,
          notificationPreferences: {
            ...previousSettings.notificationPreferences,
            [notificationType]: enabled,
          },
        });
      }

      return { previousSettings };
    },
    onError: (_err, _enabled, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(['user-settings'], context.previousSettings);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
    },
  });
}
