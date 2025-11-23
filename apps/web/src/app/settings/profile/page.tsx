'use client';

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
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-1">
          Manage your personal profile and account settings
        </p>
      </div>

      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Profile management coming soon</p>
        </div>
      </div>
    </div>
  );
}
