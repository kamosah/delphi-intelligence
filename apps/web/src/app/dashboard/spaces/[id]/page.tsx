'use client';

import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@olympus/ui';
import { DocumentTable } from '@/components/documents/DocumentTable';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { useDocumentSSE } from '@/hooks/useDocumentSSE';
import { useSpace } from '@/hooks/useSpaces';

export default function SpaceDetailPage() {
  const params = useParams();
  const spaceId = params.id as string;

  const { space } = useSpace(spaceId);

  // Subscribe to real-time document status updates via SSE
  useDocumentSSE(spaceId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {space?.name || 'Space Details'}
        </h1>
        <p className="text-gray-600">
          {space?.description ||
            'Upload and manage documents in this workspace.'}
        </p>
      </div>

      {/* Document Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Upload PDFs, Word documents, spreadsheets, and more to your space.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUpload spaceId={spaceId} />
        </CardContent>
      </Card>

      {/* Document Table Section */}
      <DocumentTable spaceId={spaceId} showSpaceColumn={false} />
    </div>
  );
}
