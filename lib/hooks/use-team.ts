'use client';

/**
 * Team Management Hooks
 *
 * Provides authenticated API calls for team/organization management.
 * Uses the global apiClient for consistent auth handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Types
export interface Member {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending';
  invited_at?: string;
  accepted_at?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  member_count: number;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  invited_at: string;
  expires_at: string;
  inviter_email?: string;
  status?: string;
}

interface MembersResponse {
  members: Member[];
}

interface InvitationsResponse {
  invitations: PendingInvitation[];
}

interface InviteParams {
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

interface ChangeRoleParams {
  memberId: string;
  role: 'admin' | 'member' | 'viewer';
}

// Query keys factory
const teamKeys = {
  all: ['team'] as const,
  organization: (orgId: string) => [...teamKeys.all, 'organization', orgId] as const,
  members: (orgId: string) => [...teamKeys.all, 'members', orgId] as const,
  invitations: (orgId: string) => [...teamKeys.all, 'invitations', orgId] as const,
};

/**
 * Hook to fetch organization details
 */
export function useOrganization(orgId: string) {
  return useQuery({
    queryKey: teamKeys.organization(orgId),
    queryFn: async () => {
      return apiClient.get<Organization>(`/api/v1/teams/organizations/${orgId}`);
    },
    enabled: !!orgId,
  });
}

/**
 * Hook to fetch organization members
 */
export function useMembers(orgId: string) {
  return useQuery({
    queryKey: teamKeys.members(orgId),
    queryFn: async () => {
      const response = await apiClient.get<MembersResponse>(`/api/v1/teams/organizations/${orgId}/members`);
      return response.members || [];
    },
    enabled: !!orgId,
  });
}

/**
 * Hook to fetch pending invitations
 */
export function usePendingInvitations(orgId: string) {
  return useQuery({
    queryKey: teamKeys.invitations(orgId),
    queryFn: async () => {
      const response = await apiClient.get<InvitationsResponse | PendingInvitation[]>(
        `/api/v1/invitations/organizations/${orgId}/invitations`
      );
      // Handle both array and object response formats
      const invitations = Array.isArray(response) ? response : response.invitations || [];
      // Filter to only show pending invitations
      return invitations.filter(
        (inv: PendingInvitation) => inv.status === 'pending' || !inv.status
      );
    },
    enabled: !!orgId,
  });
}

/**
 * Hook to invite a new team member
 */
export function useInviteMember(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: InviteParams) => {
      return apiClient.post<Member>(
        `/api/v1/teams/organizations/${orgId}/members/invite`,
        params
      );
    },
    onSuccess: () => {
      // Invalidate both members and invitations queries
      queryClient.invalidateQueries({ queryKey: teamKeys.members(orgId) });
      queryClient.invalidateQueries({ queryKey: teamKeys.invitations(orgId) });
    },
  });
}

/**
 * Hook to remove a team member
 */
export function useRemoveMember(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      return apiClient.delete<void>(
        `/api/v1/teams/organizations/${orgId}/members/${memberId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members(orgId) });
    },
  });
}

/**
 * Hook to change a member's role
 */
export function useChangeMemberRole(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role }: ChangeRoleParams) => {
      return apiClient.put<Member>(
        `/api/v1/teams/organizations/${orgId}/members/${memberId}/role`,
        { role }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members(orgId) });
    },
  });
}

/**
 * Hook to resend an invitation
 */
export function useResendInvitation(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: InviteParams) => {
      // Resending is just creating a new invitation with the same email/role
      return apiClient.post<Member>(
        `/api/v1/teams/organizations/${orgId}/members/invite`,
        params
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.invitations(orgId) });
    },
  });
}

/**
 * Hook to revoke an invitation
 */
export function useRevokeInvitation(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      return apiClient.delete<void>(
        `/api/v1/invitations/organizations/${orgId}/invitations/${invitationId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.invitations(orgId) });
    },
  });
}
