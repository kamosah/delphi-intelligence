'use client';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useClientToken } from '@/hooks/useClientToken';
import {
  useAcceptInvitationMutation,
  useGetMyPendingInvitationsQuery,
  useGetOrganizationInvitationsQuery,
  useInviteOrganizationMemberMutation,
  useRevokeInvitationMutation,
  type AcceptInvitationMutationVariables,
  type GetOrganizationInvitationsQueryVariables,
  type InviteOrganizationMemberMutationVariables,
  type RevokeInvitationMutationVariables,
} from '@/lib/api/hooks.generated';
import { queryKeys } from '@/lib/query/query-keys';

// Re-export generated types
export type {
  InvitationStatus,
  InviteOrganizationMemberInput,
  OrganizationInvitation,
} from '@/lib/api/generated';

/**
 * Fetch invitations for an organization.
 *
 * Requires manage_settings permission on the organization.
 */
export function useOrganizationInvitations(
  organizationId: string | undefined,
  status?: GetOrganizationInvitationsQueryVariables['status']
) {
  const { clientToken } = useClientToken();

  const query = useGetOrganizationInvitationsQuery(
    {
      organizationId: organizationId || '',
      status,
    },
    {
      enabled: !!clientToken && !!organizationId,
      queryKey: organizationId
        ? queryKeys.organizations.invitations(organizationId, status)
        : undefined,
    }
  );

  return {
    invitations: query.data?.organizationInvitations || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Fetch pending invitations for the authenticated user.
 *
 * Only returns non-expired pending invitations for the user's email.
 */
export function useMyPendingInvitations() {
  const { clientToken } = useClientToken();

  const query = useGetMyPendingInvitationsQuery(undefined, {
    enabled: !!clientToken,
    queryKey: queryKeys.invitations.myPending(),
  });

  return {
    invitations: query.data?.myPendingInvitations || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Invite a user to join an organization via email.
 *
 * Requires invite_member permission on the organization.
 */
export function useInviteOrganizationMember() {
  const queryClient = useQueryClient();

  const mutation = useInviteOrganizationMemberMutation({
    onSuccess: (data, variables) => {
      // Invalidate organization invitations to show new invitation
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.invitations(
          variables.input.organizationId
        ),
      });

      toast.success('Invitation sent successfully', {
        description: `Invitation email sent to ${variables.input.inviteeEmail}`,
      });
    },
    onError: (error) => {
      toast.error('Failed to send invitation', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    },
  });

  return {
    inviteOrganizationMember: (
      variables: InviteOrganizationMemberMutationVariables
    ) => mutation.mutateAsync(variables),
    isInviting: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Accept an organization invitation.
 *
 * Email must match authenticated user (verified on backend).
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  const mutation = useAcceptInvitationMutation({
    onSuccess: () => {
      // Invalidate pending invitations to remove accepted invitation
      queryClient.invalidateQueries({
        queryKey: queryKeys.invitations.myPending(),
      });

      // Invalidate organizations list to show new membership
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.lists(),
      });

      toast.success('Invitation accepted successfully', {
        description: 'You are now a member of the organization',
      });
    },
    onError: (error) => {
      toast.error('Failed to accept invitation', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    },
  });

  return {
    acceptInvitation: (variables: AcceptInvitationMutationVariables) =>
      mutation.mutateAsync(variables),
    isAccepting: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Revoke a pending organization invitation.
 *
 * Requires manage_settings permission on the organization.
 */
export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  const mutation = useRevokeInvitationMutation({
    onSuccess: () => {
      // Invalidate all organization invitations queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.all,
      });

      toast.success('Invitation revoked successfully');
    },
    onError: (error) => {
      toast.error('Failed to revoke invitation', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    },
  });

  return {
    revokeInvitation: (variables: RevokeInvitationMutationVariables) =>
      mutation.mutateAsync(variables),
    isRevoking: mutation.isPending,
    error: mutation.error,
  };
}
