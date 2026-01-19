'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import { Button, Card } from '@olympus/ui';
import {
  useMyPendingInvitations,
  useAcceptInvitation,
} from '@/hooks/useInvitations';

interface AcceptInviteContentProps {
  invitationIdParam: string | null;
}

export function AcceptInviteContent({
  invitationIdParam,
}: AcceptInviteContentProps) {
  const router = useRouter();
  const { invitations, isLoading } = useMyPendingInvitations();
  const { acceptInvitation, isAccepting } = useAcceptInvitation();

  const [selectedId, setSelectedId] = useState<string | null>(
    invitationIdParam
  );

  // Update selected ID when invitations load
  useEffect(() => {
    if (invitations.length > 0) {
      // If there's a param, use it if it exists in invitations
      if (invitationIdParam) {
        const exists = invitations.some((inv) => inv.id === invitationIdParam);
        if (exists) {
          setSelectedId(invitationIdParam);
        } else {
          setSelectedId(invitations[0].id);
        }
      } else {
        // Default to first invitation
        setSelectedId(invitations[0].id);
      }
    }
  }, [invitations, invitationIdParam]);

  const selectedInvitation = invitations.find((inv) => inv.id === selectedId);

  const handleAccept = async () => {
    if (!selectedId) return;

    try {
      const result = await acceptInvitation({ invitationId: selectedId });

      if (result.acceptInvitation) {
        // Redirect to organization dashboard
        router.push(`/dashboard?org=${result.acceptInvitation.organizationId}`);
      }
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      // Error toast is handled by the hook
    }
  };

  const handleDecline = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading invitations...</div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Mail className="w-8 h-8 text-gray-400" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              No Pending Invitations
            </h1>
            <p className="text-gray-600 mb-6">
              You don't have any pending organization invitations at this time.
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Organization Invitation
          </h1>
          <p className="text-gray-600">
            You've been invited to join an organization
          </p>
        </div>

        {/* Invitation Card */}
        <Card className="p-8">
          {selectedInvitation && (
            <>
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-1">Role</p>
                  <p className="font-medium capitalize">
                    {selectedInvitation.invitationRole.toLowerCase()}
                  </p>
                </div>

                {selectedInvitation.customMessage && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Message</p>
                    <p className="text-gray-800">
                      {selectedInvitation.customMessage}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-500">
                    Expires:{' '}
                    {new Date(
                      selectedInvitation.expiresAt
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {invitations.length > 1 && (
                <div className="mb-6">
                  <label
                    htmlFor="invitation-select"
                    className="text-sm text-gray-600 block mb-2"
                  >
                    Select invitation ({invitations.length} pending)
                  </label>
                  <select
                    id="invitation-select"
                    value={selectedId || ''}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {invitations.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invitationRole} - Expires{' '}
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {isAccepting ? 'Accepting...' : 'Accept Invitation'}
                </Button>
                <Button
                  onClick={handleDecline}
                  variant="outline"
                  disabled={isAccepting}
                  className="flex-1"
                >
                  Decline
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* Additional Info */}
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>
            By accepting, you'll become a member of this organization and gain
            access to its spaces and documents
          </p>
        </div>
      </div>
    </div>
  );
}
