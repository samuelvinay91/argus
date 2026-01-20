'use client';

/**
 * React Hook for Authenticated API Calls
 *
 * Uses Clerk's authentication to automatically include JWT tokens
 * in all requests to the Argus Python backend.
 */

import { useAuth } from '@clerk/nextjs';
import { useCallback, useMemo } from 'react';
import { createAuthenticatedClient } from '@/lib/auth-api';

// Backend URL (client-side needs NEXT_PUBLIC_ prefix)
// In production, use the Railway backend URL directly to avoid Vercel rewrite issues
const getBackendUrl = () => {
  // Explicit override from environment
  if (process.env.NEXT_PUBLIC_ARGUS_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_ARGUS_BACKEND_URL;
  }
  // Production default (Vercel rewrites may strip Authorization headers)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://argus-brain-production.up.railway.app';
  }
  // Local development
  return 'http://localhost:8000';
};

const BACKEND_URL = getBackendUrl();

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface FetchJsonOptions extends Omit<RequestInit, 'signal'> {
  /** AbortSignal for request cancellation */
  signal?: AbortSignal;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Hook for making authenticated API calls to Argus backend
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { api, isLoaded, isSignedIn } = useAuthApi();
 *
 *   const fetchTests = async () => {
 *     const response = await api.get('/api/v1/tests');
 *     if (response.ok) {
 *       const data = await response.json();
 *       console.log(data);
 *     }
 *   };
 *
 *   return <button onClick={fetchTests}>Fetch Tests</button>;
 * }
 * ```
 */
export function useAuthApi() {
  const { getToken, isLoaded, isSignedIn, userId, orgId } = useAuth();

  // Create authenticated client
  const api = useMemo(() => {
    return createAuthenticatedClient(async () => {
      // Use default Clerk token for backend authentication
      // The default token contains user_id and org_id which is all we need
      return getToken();
    });
  }, [getToken]);

  // Helper for JSON responses with abort and timeout support
  const fetchJson = useCallback(async <T>(
    endpoint: string,
    options?: FetchJsonOptions
  ): Promise<ApiResponse<T>> => {
    const { signal, timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options || {};

    // Create timeout controller
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);

    // Merge signals: external signal + timeout
    const mergedSignal = signal
      ? (signal.aborted
          ? timeoutController.signal
          : (() => {
              signal.addEventListener('abort', () => timeoutController.abort(signal.reason));
              return timeoutController.signal;
            })())
      : timeoutController.signal;

    try {
      // Use default Clerk token for backend authentication
      const token = await getToken();

      const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_URL}${endpoint}`;

      const response = await fetch(url, {
        ...fetchOptions,
        signal: mergedSignal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(fetchOptions?.headers || {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          data: null,
          error: errorText || `HTTP ${response.status}`,
          status: response.status,
        };
      }

      const data = await response.json();
      return { data, error: null, status: response.status };
    } catch (error) {
      // Handle abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          data: null,
          error: 'Request was cancelled',
          status: 0,
        };
      }
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 0,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }, [getToken]);

  // Stream fetch for SSE endpoints with abort support
  const fetchStream = useCallback(async (
    endpoint: string,
    body?: unknown,
    onMessage?: (event: string, data: unknown) => void,
    signal?: AbortSignal
  ): Promise<void> => {
    // Use default Clerk token for backend authentication
    const token = await getToken();
    const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_URL}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Stream request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        // Check if aborted
        if (signal?.aborted) {
          await reader.cancel();
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            const eventType = line.slice(6).trim();
            const nextLine = lines[lines.indexOf(line) + 1];
            if (nextLine?.startsWith('data:')) {
              try {
                const data = JSON.parse(nextLine.slice(5).trim());
                onMessage?.(eventType, data);
              } catch {
                onMessage?.(eventType, nextLine.slice(5).trim());
              }
            }
          } else if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.slice(5).trim());
              onMessage?.('message', data);
            } catch {
              onMessage?.('message', line.slice(5).trim());
            }
          }
        }
      }
    } finally {
      // Ensure reader is released
      try {
        await reader.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
  }, [getToken]);

  return {
    api,
    fetchJson,
    fetchStream,
    isLoaded,
    isSignedIn,
    userId,
    orgId,
    getToken,
    backendUrl: BACKEND_URL,
  };
}

/**
 * Hook for checking if the current user has specific permissions
 *
 * @param requiredPermissions - Array of permission strings to check
 * @returns Object with permission check results
 */
export function usePermissions(requiredPermissions: string[]) {
  const { orgRole, isLoaded, isSignedIn } = useAuth();

  const hasPermission = useCallback((permission: string): boolean => {
    if (!isLoaded || !isSignedIn) return false;

    // Map Clerk org roles to backend permissions
    const rolePermissions: Record<string, string[]> = {
      'org:admin': ['*'], // Full access
      'org:member': [
        'tests:read', 'tests:write', 'tests:execute',
        'projects:read',
        'reports:read',
      ],
      'org:viewer': [
        'tests:read',
        'projects:read',
        'reports:read',
      ],
    };

    const userPermissions = rolePermissions[orgRole || ''] || [];

    // Check for wildcard or specific permission
    return userPermissions.includes('*') || userPermissions.includes(permission);
  }, [orgRole, isLoaded, isSignedIn]);

  const permissions = useMemo(() => {
    return requiredPermissions.reduce((acc, perm) => {
      acc[perm] = hasPermission(perm);
      return acc;
    }, {} as Record<string, boolean>);
  }, [requiredPermissions, hasPermission]);

  const hasAllPermissions = useMemo(() => {
    return requiredPermissions.every(hasPermission);
  }, [requiredPermissions, hasPermission]);

  const hasAnyPermission = useMemo(() => {
    return requiredPermissions.some(hasPermission);
  }, [requiredPermissions, hasPermission]);

  return {
    permissions,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isLoaded,
    isSignedIn,
    role: orgRole,
  };
}
