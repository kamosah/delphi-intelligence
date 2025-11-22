'use client';

/**
 * Library page - Search and browse all threads
 *
 * Features (planned):
 * - Search threads by keyword
 * - Filter by date, bookmarks, spaces
 * - Grid/list view toggle
 * - Inspired by Perplexity's thread search UI
 *
 * TODO: Implement search functionality (see LOG-222)
 */
export default function LibraryPage() {
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
