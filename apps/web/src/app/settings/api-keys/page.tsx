'use client';

/**
 * API keys settings page
 *
 * Features (planned):
 * - Create/revoke API keys
 * - Key permissions and scopes
 * - Usage statistics
 * - Key expiration settings
 *
 * TODO: Implement API key management (see LOG-TBD)
 */
export default function ApiKeysPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">API Keys</h1>
        <p className="text-gray-600 mt-1">
          Manage your API credentials and access tokens
        </p>
      </div>

      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">API key management coming soon</p>
        </div>
      </div>
    </div>
  );
}
