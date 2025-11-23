'use client';

/**
 * Thread settings page
 *
 * Features (planned):
 * - Default thread visibility
 * - Thread retention policies
 * - Thread archiving rules
 * - AI model preferences for threads
 *
 * TODO: Implement thread settings (see LOG-TBD)
 */
export default function ThreadSettingsPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Thread Settings
        </h1>
        <p className="text-gray-600 mt-1">
          Configure thread defaults and policies
        </p>
      </div>

      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Thread settings coming soon</p>
        </div>
      </div>
    </div>
  );
}
