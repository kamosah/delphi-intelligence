'use client';

import { useState } from 'react';
import { Loader2, Mail, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Card,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@olympus/ui';
import {
  useOrganizationInvitations,
  useInviteOrganizationMember,
  useRevokeInvitation,
} from '@/hooks/useInvitations';
import { OrganizationRole } from '@/lib/api/generated';

interface OrganizationInvitationsProps {
  organizationId: string;
}

export function OrganizationInvitations({
  organizationId,
}: OrganizationInvitationsProps) {
  const { invitations, isLoading } = useOrganizationInvitations(organizationId);
  const { inviteOrganizationMember, isInviting } =
    useInviteOrganizationMember();
  const { revokeInvitation, isRevoking } = useRevokeInvitation();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>(OrganizationRole.Member);
  const [message, setMessage] = useState('');

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    try {
      await inviteOrganizationMember({
        input: {
          organizationId,
          inviteeEmail: email.trim(),
          role,
          customMessage: message.trim() || undefined,
        },
      });

      // Clear form on success
      setEmail('');
      setMessage('');
      setRole(OrganizationRole.Member);
    } catch (error) {
      console.error('Failed to send invitation:', error);
      // Error toast handled by hook
    }
  };

  const handleRevoke = async (invitationId: string) => {
    try {
      await revokeInvitation({ invitationId });
      // Success toast handled by hook
    } catch (error) {
      console.error('Failed to revoke invitation:', error);
      // Error toast handled by hook
    }
  };

  const pendingInvitations =
    invitations?.filter((inv) => inv.status === 'PENDING') || [];

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Invite New Member
          </h3>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isInviting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as OrganizationRole)}
                disabled={isInviting}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OrganizationRole.Member}>
                    Member
                  </SelectItem>
                  <SelectItem value={OrganizationRole.Admin}>Admin</SelectItem>
                  <SelectItem value={OrganizationRole.Viewer}>
                    Viewer
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Custom message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to the invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isInviting}
              rows={3}
            />
          </div>

          <Button
            onClick={handleInvite}
            disabled={!email.trim() || isInviting}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isInviting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Invitation
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Pending Invitations List */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Pending Invitations ({pendingInvitations.length})
        </h3>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : pendingInvitations.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
            <Mail className="mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-600">No pending invitations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">
                      {invitation.inviteeEmail}
                    </p>
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {invitation.invitationRole.toLowerCase()}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                    <span>
                      Invited{' '}
                      {new Date(invitation.invitedAt).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>
                      Expires{' '}
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </span>
                  </div>

                  {invitation.customMessage && (
                    <p className="mt-2 text-sm italic text-gray-600">
                      "{invitation.customMessage}"
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => handleRevoke(invitation.id)}
                  variant="outline"
                  size="sm"
                  disabled={isRevoking}
                  className="ml-4 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                  <span className="ml-1">Revoke</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
