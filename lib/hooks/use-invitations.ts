'use client';

/**
 * Invitation Hooks
 *
 * Provides API calls for invitation management.
 * Note: Invitation validation is intentionally unauthenticated
 * because users need to validate before signing in.
 * Accepting invitations requires authentication.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { authenticatedFetch, BACKEND_URL } from '@/lib/api-client';

// Types
export interface InvitationDetails {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  organization_id: string;
  organization_name: string;
  inviter_email: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

export type InvitationValidationResult =
  | { valid: true; invitation: InvitationDetails }
  | { valid: false; error: 'invalid' | 'expired' | 'accepted' | 'unknown'; message: string };

// Query keys factory
const invitationKeys = {
  all: ['invitations'] as const,
  validate: (token: string) => [...invitationKeys.all, 'validate', token] as const,
};

/**
 * Validate an invitation token
 * This is intentionally unauthenticated - users validate before signing in
 */
export async function validateInvitation(token: string): Promise<InvitationValidationResult> {
  try {
    // Use regular fetch since this endpoint should be public
    const response = await fetch(`${BACKEND_URL}/api/v1/invitations/validate/${token}`);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));

      if (response.status === 404) {
        return {
          valid: false,
          error: 'invalid',
          message: data.detail || 'This invitation link is invalid or does not exist.',
        };
      }

      if (response.status === 410 || data.detail?.toLowerCase().includes('expired')) {
        return {
          valid: false,
          error: 'expired',
          message: data.detail || 'This invitation has expired.',
        };
      }

      return {
        valid: false,
        error: 'unknown',
        message: data.detail || 'Unable to validate invitation.',
      };
    }

    const invitation = await response.json();

    // Check if invitation is already used
    if (invitation.status === 'accepted') {
      return {
        valid: false,
        error: 'accepted',
        message: 'This invitation has already been accepted.',
      };
    }

    // Check if expired or revoked
    if (invitation.status === 'expired' || invitation.status === 'revoked') {
      return {
        valid: false,
        error: 'expired',
        message: 'This invitation is no longer valid.',
      };
    }

    // Check expiration date
    if (new Date(invitation.expires_at) < new Date()) {
      return {
        valid: false,
        error: 'expired',
        message: 'This invitation has expired.',
      };
    }

    return { valid: true, invitation };
  } catch (error) {
    console.error('Failed to validate invitation:', error);
    return {
      valid: false,
      error: 'unknown',
      message: 'Unable to connect to the server. Please try again later.',
    };
  }
}

/**
 * Hook to validate an invitation token
 */
export function useValidateInvitation(token: string | null) {
  return useQuery({
    queryKey: invitationKeys.validate(token || ''),
    queryFn: () => validateInvitation(token!),
    enabled: !!token,
    staleTime: 30000, // Cache for 30 seconds
    retry: false, // Don't retry on failure
  });
}

/**
 * Hook to accept an invitation
 * This requires authentication
 */
export function useAcceptInvitation() {
  return useMutation({
    mutationFn: async (token: string) => {
      const response = await authenticatedFetch(
        `/api/v1/invitations/accept/${token}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to accept invitation');
      }

      return response.json();
    },
  });
}
