'use client';

import { useParams } from 'next/navigation';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { DocumentList } from '@/components/documents/DocumentList';
import { useDocuments } from '@/hooks/useDocuments';
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

  const { documents, isLoading } = useDocuments(spaceId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Space Details</h1>
        <p className="text-gray-600">
          Upload and manage documents in this workspace.
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
