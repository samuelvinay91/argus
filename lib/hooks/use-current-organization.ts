'use client';

/**
 * Hook for managing the current organization context
 *
 * Provides organization details, loading/error states, and functions
 * to switch organizations. Syncs with localStorage and the org-switcher component.
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';

// LocalStorage key - must match org-switcher.tsx
const CURRENT_ORG_KEY = 'argus_current_org_id';

// Backend URL
const BACKEND_URL =
  process.env.NEXT_PUBLIC_ARGUS_BACKEND_URL || 'http://localhost:8000';

/**
 * Organization interface matching the backend response
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logo_url?: string;
  created_at?: string;
  updated_at?: string;
  owner_id?: string;
  settings?: Record<string, unknown>;
}

/**
 * Get the current organization ID from localStorage
 * Safe to call on server-side (returns null)
 */
export function getCurrentOrgId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(CURRENT_ORG_KEY);
}

/**
 * Set the current organization ID in localStorage
 */
export function setCurrentOrgId(orgId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(CURRENT_ORG_KEY, orgId);
}

/**
 * Clear the current organization ID from localStorage
 */
export function clearCurrentOrgId(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(CURRENT_ORG_KEY);
}

/**
 * Hook return type
 */
export interface UseCurrentOrganizationReturn {
  /** Current organization details, null if not loaded or not set */
  organization: Organization | null;
  /** Organization ID from localStorage (may exist before org details are loaded) */
  organizationId: string | null;
  /** True while fetching organization details */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Switch to a different organization */
  switchOrganization: (orgId: string, options?: SwitchOptions) => void;
  /** Refetch organization details */
  refetch: () => Promise<void>;
  /** True if Clerk auth is loaded and user is signed in */
  isReady: boolean;
}

export interface SwitchOptions {
  /** If true, reload the page after switching (default: true) */
  reload?: boolean;
  /** If true, update server-side preference (default: false) */
  updateServer?: boolean;
}

/**
 * Hook for managing the current organization
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { organization, loading, error, switchOrganization } = useCurrentOrganization();
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *   if (!organization) return <NoOrganization />;
 *
 *   return (
 *     <div>
 *       <h1>{organization.name}</h1>
 *       <button onClick={() => switchOrganization('new-org-id')}>
 *         Switch Org
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCurrentOrganization(): UseCurrentOrganizationReturn {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  // Get org ID from localStorage (client-side only)
  const organizationId = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return getCurrentOrgId();
  }, []);

  // Fetch organization details
  const {
    data: organization,
    isLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ['current-organization', organizationId],
    queryFn: async (): Promise<Organization | null> => {
      if (!organizationId) {
        return null;
      }

      // Get auth token
      let token: string | null = null;
      try {
        token = await getToken({ template: 'argus-backend' });
      } catch {
        token = await getToken();
      }

      const response = await fetch(
        `${BACKEND_URL}/api/v1/organizations/${organizationId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        // If org not found or unauthorized, clear the stored ID
        if (response.status === 404 || response.status === 403) {
          clearCurrentOrgId();
          return null;
        }
        const errorText = await response.text();
        throw new Error(errorText || `Failed to fetch organization: ${response.status}`);
      }

      const data = await response.json();
      return data as Organization;
    },
    enabled: isLoaded && isSignedIn && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes - org details rarely change
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof Error && error.message.includes('403')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Switch organization function
  const switchOrganization = useCallback(
    (orgId: string, options: SwitchOptions = {}) => {
      const { reload = true, updateServer = false } = options;

      // Update localStorage
      setCurrentOrgId(orgId);

      // Invalidate queries to refetch with new org context
      queryClient.invalidateQueries({ queryKey: ['current-organization'] });

      // Optionally update server-side preference
      if (updateServer) {
        getToken({ template: 'argus-backend' })
          .catch(() => getToken())
          .then((token) => {
            if (token) {
              fetch(`${BACKEND_URL}/api/v1/users/me/organizations/${orgId}/switch`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              }).catch((err) => {
                console.error('Failed to update server-side organization preference:', err);
              });
            }
          });
      }

      // Reload page to refresh all data with new org context
      if (reload && typeof window !== 'undefined') {
        window.location.reload();
      }
    },
    [getToken, queryClient]
  );

  // Refetch function
  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  // Determine loading state
  const loading = !isLoaded || (isSignedIn && !!organizationId && isLoading);

  // Format error
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : 'Failed to fetch organization'
    : null;

  return {
    organization: organization ?? null,
    organizationId,
    loading,
    error,
    switchOrganization,
    refetch,
    isReady: isLoaded && isSignedIn === true,
  };
}

/**
 * Hook to get just the organization ID without fetching details
 * Useful for components that only need the ID for API calls
 */
export function useCurrentOrganizationId(): string | null {
  return useMemo(() => getCurrentOrgId(), []);
}

export default useCurrentOrganization;
