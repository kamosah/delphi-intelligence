'use client';

import type { Document } from '@/lib/api/documents-client';
import { useDeleteDocument, useDownloadDocument } from '@/hooks/useDocuments';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@olympus/ui';
import { DocumentListSkeleton } from './DocumentListSkeleton';
import { DocumentListEmpty } from './DocumentListEmpty';
import { DocumentListItem } from './DocumentListItem';

interface DocumentListProps {
  documents: Document[];
  spaceId: string;
  isLoading?: boolean;
  emptyMessage?: string;
}

/**
 * DocumentList component displays a list of uploaded documents with actions.
 *
 * Features:
 * - Document metadata display (name, size, type, upload date)
 * - Status badges (uploaded, processing, processed, failed)
 * - Delete functionality with confirmation
 * - Download capability
 * - Empty state handling
 * - Loading state with skeleton
 * - Responsive design
 *
 * @example
 * <DocumentList
 *   documents={documents}
 *   spaceId={spaceId}
 *   isLoading={isLoading}
 * />
 */
export function DocumentList({
  documents,
  spaceId,
  isLoading = false,
  emptyMessage = 'No documents uploaded yet',
}: DocumentListProps) {
  const { deleteDocument, isDeleting } = useDeleteDocument();
  const { downloadDocument, isDownloading } = useDownloadDocument();

  const handleDelete = async (documentId: string) => {
    await deleteDocument({ documentId, spaceId });
  };

  const handleDownload = async (documentId: string) => {
    const document = documents.find((doc) => doc.id === documentId);
    if (document) {
      await downloadDocument({ documentId, fileName: document.name });
    }
  };

  if (isLoading) {
    return <DocumentListSkeleton />;
  }

  if (documents.length === 0) {
    return <DocumentListEmpty message={emptyMessage} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>
          {documents.length} {documents.length === 1 ? 'document' : 'documents'}{' '}
          uploaded
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.map((document) => (
            <DocumentListItem
              key={document.id}
              document={document}
              onDelete={handleDelete}
              onDownload={handleDownload}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
