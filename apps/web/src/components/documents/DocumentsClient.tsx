'use client';

import { Button } from '@olympus/ui';
import { DocumentList } from '@/components/documents/DocumentList';
import { useDocuments } from '@/hooks/useDocuments';

export function DocumentsClient() {
  const { documents, error } = useDocuments(); // No loading state - data is prefetched!

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Documents</h1>
          <p className="text-gray-600">
            View and manage all documents across your spaces.
          </p>
        </div>
        <Button>Upload Document</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            Failed to load documents. Please try again.
          </p>
        </div>
      )}

      {!error && (
        <DocumentList
          documents={documents}
          spaceId="" // Empty string for all-documents view
          emptyMessage="No documents found across all spaces"
        />
      )}
    </div>
  );
}
