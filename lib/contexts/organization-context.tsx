'use client';

/**
 * Organization Context
 *
 * Unified organization management that bridges Clerk authentication
 * with backend organization data. This is the SINGLE SOURCE OF TRUTH
 * for organization context throughout the dashboard.
 *
 * Key principles:
 * - Clerk handles authentication (JWT tokens)
 * - This context handles authorization (org membership, permissions)
 * - All org IDs are backend UUIDs, never Clerk org_xxx format
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useAuth } from '@clerk/nextjs';
import { useAuthApi } from '@/lib/hooks/use-auth-api';
import { setGlobalOrgIdGetter, clearGlobalOrgIdGetter } from '@/lib/api-client';

// Storage key for persisting selected organization
const CURRENT_ORG_KEY = 'skopaq_current_org_id';

export interface Organization {
  id: string; // Backend UUID - NEVER Clerk org_xxx format
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  plan: string;
  member_count: number;
  is_default?: boolean;
  is_personal?: boolean;
  logo_url?: string;
}

interface OrganizationContextValue {
  // Current selected organization (backend UUID format)
  currentOrg: Organization | null;

  // All organizations the user belongs to
  organizations: Organization[];

  // Loading state
  isLoading: boolean;

  // Error state
  error: string | null;

  // Switch to a different organization
  switchOrganization: (orgId: string) => void;

  // Refresh organizations from backend
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { fetchJson } = useAuthApi();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch organizations from backend
  const fetchOrganizations = useCallback(async () => {
    if (!authLoaded || !isSignedIn) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      // Try new multi-tenant endpoint first, fall back to legacy endpoint
      // New endpoint: /api/v1/orgs - returns organizations with full details
      // Legacy endpoint: /api/v1/users/me/organizations
      let response = await fetchJson<Organization[]>('/api/v1/orgs');

      // Fall back to legacy endpoint if new one fails
      if (response.error && response.status === 404) {
        response = await fetchJson<Organization[]>('/api/v1/users/me/organizations');
      }

      if (response.error) {
        throw new Error(response.error);
      }

      const orgs = response.data || [];
      setOrganizations(orgs);

      // Determine which org to select
      const savedOrgId = typeof window !== 'undefined'
        ? localStorage.getItem(CURRENT_ORG_KEY)
        : null;

      // Priority: saved org > default org > first org
      let selectedOrg: Organization | null = null;

      if (savedOrgId) {
        selectedOrg = orgs.find((o) => o.id === savedOrgId) || null;
      }

      if (!selectedOrg) {
        selectedOrg = orgs.find((o) => o.is_default) || orgs[0] || null;
      }

      if (selectedOrg) {
        setCurrentOrg(selectedOrg);
        if (typeof window !== 'undefined') {
          localStorage.setItem(CURRENT_ORG_KEY, selectedOrg.id);
        }
      }
    } catch (err) {
      console.error('[OrganizationProvider] Failed to fetch organizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  }, [authLoaded, isSignedIn, fetchJson]);

  // Fetch on mount and when auth state changes
  useEffect(() => {
    if (authLoaded && isSignedIn) {
      fetchOrganizations();
    } else if (authLoaded && !isSignedIn) {
      // Clear state when signed out
      setOrganizations([]);
      setCurrentOrg(null);
      setIsLoading(false);
    }
  }, [authLoaded, isSignedIn, fetchOrganizations]);

  // Switch organization
  const switchOrganization = useCallback((orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      if (typeof window !== 'undefined') {
        localStorage.setItem(CURRENT_ORG_KEY, orgId);
      }
    }
  }, [organizations]);

  // Refresh organizations
  const refreshOrganizations = useCallback(async () => {
    setIsLoading(true);
    await fetchOrganizations();
  }, [fetchOrganizations]);

  // Track current org ID for the getter
  const currentOrgIdRef = useRef<string | null>(null);
  currentOrgIdRef.current = currentOrg?.id ?? null;

  // Inject org ID getter into global api-client for multi-tenant requests
  // This ensures all API calls include X-Organization-ID header
  useEffect(() => {
    setGlobalOrgIdGetter(() => currentOrgIdRef.current);

    return () => {
      clearGlobalOrgIdGetter();
    };
  }, []); // Only run once on mount - getter uses ref for current value

  // Memoize context value
  const value = useMemo<OrganizationContextValue>(() => ({
    currentOrg,
    organizations,
    isLoading,
    error,
    switchOrganization,
    refreshOrganizations,
  }), [currentOrg, organizations, isLoading, error, switchOrganization, refreshOrganizations]);

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

/**
 * Hook to access current organization context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currentOrg, organizations, switchOrganization } = useCurrentOrg();
 *
 *   // currentOrg.id is ALWAYS a backend UUID, never Clerk org_xxx
 *   const orgId = currentOrg?.id;
 *
 *   return <div>Current org: {currentOrg?.name}</div>;
 * }
 * ```
 */
export function useCurrentOrg(): OrganizationContextValue {
  const context = useContext(OrganizationContext);

  if (!context) {
    throw new Error(
      'useCurrentOrg must be used within an OrganizationProvider. ' +
      'Make sure OrganizationProvider is in your component tree.'
    );
  }

  return context;
}

/**
 * Hook that returns just the org ID (convenience for common use case)
 */
export function useCurrentOrgId(): string | null {
  const { currentOrg } = useCurrentOrg();
  return currentOrg?.id ?? null;
}
