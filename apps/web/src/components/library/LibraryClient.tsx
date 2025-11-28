'use client';

/**
 * Client component for Library page.
 *
 * Threads data is prefetched via SSR for sidebar navigation.
 */
export function LibraryClient() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Thread Library
        </h1>
        <p className="text-gray-600">
          Search and browse functionality coming soon
        </p>
      </div>
    </div>
  );
}
