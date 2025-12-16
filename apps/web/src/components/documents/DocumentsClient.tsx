'use client';

import { Button } from '@olympus/ui';
import { DocumentTable } from '@/components/documents/DocumentTable';

export function DocumentsClient() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Documents</h1>
          <p className="text-gray-600">
            View and manage all documents across your spaces.
          </p>
        </div>
        <Button data-testid="upload-button">Upload Document</Button>
      </div>

      <DocumentTable showSpaceColumn={true} />
    </div>
  );
}
