'use client';

import { useParams } from 'next/navigation';
import { OrganizationMembers } from '@/components/organizations/OrganizationMembers';

export default function OrganizationMembersPage() {
  const params = useParams();
  const organizationId = params.orgId as string;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage who has access to this organization and their roles
        </p>
      </div>

      <OrganizationMembers organizationId={organizationId} />
    </div>
  );
}
