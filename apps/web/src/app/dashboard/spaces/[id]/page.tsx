'use client';

import { useParams } from 'next/navigation';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { DocumentList } from '@/components/documents/DocumentList';
import { useDocuments } from '@/hooks/useDocuments';
import { useDocumentSSE } from '@/hooks/useDocumentSSE';
import { useSpace } from '@/hooks/useSpaces';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@olympus/ui';

export default function SpaceDetailPage() {
  const params = useParams();
  const spaceId = params.id as string;

  const { space } = useSpace(spaceId);
  const { documents, isLoading } = useDocuments({ spaceId });

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

      {/* Document List Section */}
      <DocumentList
        documents={documents}
        spaceId={spaceId}
        isLoading={isLoading}
        emptyMessage="No documents uploaded yet. Start by uploading files above."
      />
    </div>
  );
}
