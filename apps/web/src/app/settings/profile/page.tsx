'use client';

import Link from 'next/link';
import { Button } from '@olympus/ui';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Profile settings page
 *
 * Features (planned):
 * - Avatar upload
 * - Full name and email management
 * - Password change
 * - Account deletion
 *
 * TODO: Implement profile management (see LOG-TBD)
 */
export default function ProfilePage() {
  const { currentOrganization } = useAuthStore();

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-1">
          Manage your personal profile and account settings
        </p>
      </div>

      {!currentOrganization && (
        <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h3 className="text-lg font-semibold text-blue-900">
            Create Your Organization
          </h3>
          <p className="mt-2 text-sm text-blue-700">
            Organizations help you collaborate with your team. Create one to
            access workspace settings and invite members.
          </p>
          <Button asChild className="mt-4">
            <Link href="/onboarding">Create Organization</Link>
          </Button>
        </div>
      )}

      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Profile management coming soon</p>
        </div>
      </div>
    </div>
  );
}
