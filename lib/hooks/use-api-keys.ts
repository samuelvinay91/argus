'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './use-auth-api';

// ============================================================================
// Types
// ============================================================================

/**
 * API Key response (without the secret key value).
 * This is what's returned when listing API keys.
 */
export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  request_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  is_active: boolean;
}

/**
 * API Key response with the secret key value.
 * Only returned when creating a new key (key is shown once).
 */
export interface ApiKeyCreated extends ApiKey {
  key: string;
}

/**
 * Response when rotating an API key.
 */
export interface RotateKeyResponse {
  old_key_id: string;
  new_key: ApiKeyCreated;
  message: string;
}

/**
 * Request payload for creating a new API key.
 */
export interface CreateApiKeyRequest {
  name: string;
  scopes?: string[];
  expires_in_days?: number | null;
}

// Valid scopes for API keys
export const API_KEY_SCOPES = ['read', 'write', 'admin', 'webhooks', 'tests'] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

// Default organization ID - uses 'default' which the backend resolves
const DEFAULT_ORG_ID = 'default';

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch all API keys for the current organization.
 *
 * @param includeRevoked - Whether to include revoked keys (default: false)
 * @returns Query result with list of API keys
 *
 * @example
 * ```tsx
 * function ApiKeyList() {
 *   const { data: apiKeys, isLoading, error } = useApiKeys();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return (
 *     <ul>
 *       {apiKeys?.map(key => (
 *         <li key={key.id}>{key.name} - {key.key_prefix}***</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useApiKeys(includeRevoked = false) {
  const { fetchJson, isLoaded, isSignedIn, orgId } = useAuthApi();

  return useQuery({
    queryKey: ['api-keys', orgId || DEFAULT_ORG_ID, includeRevoked],
    queryFn: async () => {
      const endpoint = `/api/v1/api-keys/organizations/${orgId || DEFAULT_ORG_ID}/keys${
        includeRevoked ? '?include_revoked=true' : ''
      }`;
      const response = await fetchJson<ApiKey[]>(endpoint);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || [];
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Hook to create a new API key.
 *
 * @returns Mutation for creating API keys
 *
 * @example
 * ```tsx
 * function CreateKeyButton() {
 *   const createKey = useCreateApiKey();
 *
 *   const handleCreate = async () => {
 *     try {
 *       const newKey = await createKey.mutateAsync({
 *         name: 'CI Pipeline Key',
 *         scopes: ['read', 'tests'],
 *         expires_in_days: 90,
 *       });
 *       // IMPORTANT: Save the key now - it won't be shown again!
 *       console.log('New API key:', newKey.key);
 *     } catch (error) {
 *       console.error('Failed to create key:', error);
 *     }
 *   };
 *
 *   return <button onClick={handleCreate}>Create Key</button>;
 * }
 * ```
 */
export function useCreateApiKey() {
  const { fetchJson, orgId } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateApiKeyRequest): Promise<ApiKeyCreated> => {
      const endpoint = `/api/v1/api-keys/organizations/${orgId || DEFAULT_ORG_ID}/keys`;
      const response = await fetchJson<ApiKeyCreated>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          scopes: data.scopes || ['read', 'write'],
          expires_in_days: data.expires_in_days || null,
        }),
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
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

/**
 * Hook to revoke (delete) an API key.
 *
 * @returns Mutation for revoking API keys
 *
 * @example
 * ```tsx
 * function RevokeKeyButton({ keyId }: { keyId: string }) {
 *   const revokeKey = useRevokeApiKey();
 *
 *   const handleRevoke = async () => {
 *     if (confirm('Are you sure you want to revoke this key?')) {
 *       await revokeKey.mutateAsync(keyId);
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleRevoke} disabled={revokeKey.isPending}>
 *       {revokeKey.isPending ? 'Revoking...' : 'Revoke'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useRevokeApiKey() {
  const { fetchJson, orgId } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string): Promise<{ success: boolean; message: string }> => {
      const endpoint = `/api/v1/api-keys/organizations/${orgId || DEFAULT_ORG_ID}/keys/${keyId}`;
      const response = await fetchJson<{ success: boolean; message: string }>(endpoint, {
        method: 'DELETE',
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || { success: true, message: 'API key revoked' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

/**
 * Hook to delete an API key.
 * This is an alias for useRevokeApiKey for semantic clarity.
 *
 * @returns Mutation for deleting API keys
 */
export function useDeleteApiKey() {
  return useRevokeApiKey();
}

/**
 * Hook to rotate an API key.
 * This revokes the old key and creates a new one with the same settings.
 *
 * @returns Mutation for rotating API keys
 *
 * @example
 * ```tsx
 * function RotateKeyButton({ keyId }: { keyId: string }) {
 *   const rotateKey = useRotateApiKey();
 *
 *   const handleRotate = async () => {
 *     try {
 *       const result = await rotateKey.mutateAsync(keyId);
 *       // IMPORTANT: Save the new key now!
 *       console.log('New API key:', result.new_key.key);
 *       console.log('Old key has been revoked:', result.old_key_id);
 *     } catch (error) {
 *       console.error('Failed to rotate key:', error);
 *     }
 *   };
 *
 *   return <button onClick={handleRotate}>Rotate Key</button>;
 * }
 * ```
 */
export function useRotateApiKey() {
  const { fetchJson, orgId } = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string): Promise<RotateKeyResponse> => {
      const endpoint = `/api/v1/api-keys/organizations/${orgId || DEFAULT_ORG_ID}/keys/${keyId}/rotate`;
      const response = await fetchJson<RotateKeyResponse>(endpoint, {
        method: 'POST',
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
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

/**
 * Hook to get API key statistics.
 *
 * @returns Object with API key statistics
 *
 * @example
 * ```tsx
 * function ApiKeyStats() {
 *   const stats = useApiKeyStats();
 *
 *   return (
 *     <div>
 *       <p>Total keys: {stats.total}</p>
 *       <p>Active keys: {stats.active}</p>
 *       <p>Total requests: {stats.totalRequests}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useApiKeyStats() {
  const { data: apiKeys = [], isLoading } = useApiKeys(true); // Include revoked for stats

  const stats = {
    total: apiKeys.length,
    active: apiKeys.filter((key) => key.is_active).length,
    revoked: apiKeys.filter((key) => key.revoked_at !== null).length,
    expired: apiKeys.filter((key) => {
      if (!key.expires_at) return false;
      return new Date(key.expires_at) < new Date();
    }).length,
    totalRequests: apiKeys.reduce((sum, key) => sum + key.request_count, 0),
    lastUsed: apiKeys.reduce((latest: string | null, key) => {
      if (!key.last_used_at) return latest;
      if (!latest) return key.last_used_at;
      return new Date(key.last_used_at) > new Date(latest) ? key.last_used_at : latest;
    }, null),
    isLoading,
  };

  return stats;
}
