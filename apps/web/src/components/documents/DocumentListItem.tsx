'use client';

import { useState } from 'react';
import type { Document } from '@/lib/api/documents-client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@olympus/ui';
import { DocumentIcon } from './DocumentIcon';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { DocumentMetadata } from './DocumentMetadata';
import { DocumentActions } from './DocumentActions';
import { DocumentError } from './DocumentError';

interface DocumentListItemProps {
  document: Document;
  onDelete: (documentId: string) => void;
  onDownload?: (documentId: string) => void;
  isDeleting?: boolean;
  isDownloading?: boolean;
}

/**
 * Individual document list item component.
 * Composes smaller components to display document information and actions.
 */
export function DocumentListItem({
  document,
  onDelete,
  onDownload,
  isDeleting = false,
  isDownloading = false,
}: DocumentListItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    onDelete(document.id);
    setShowDeleteDialog(false);
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(document.id);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <DocumentIcon fileType={document.file_type} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {document.name}
              </h4>
              <DocumentStatusBadge status={document.status} />
            </div>

            <DocumentMetadata
              fileType={document.file_type}
              sizeBytes={document.size_bytes}
              createdAt={document.created_at}
            />

            {document.status === 'failed' && document.processing_error && (
              <DocumentError error={document.processing_error} />
            )}
          </div>
        </div>

        <div className="ml-4">
          <DocumentActions
            onDelete={handleDeleteClick}
            onDownload={handleDownload}
            isDeleting={isDeleting}
            isDownloading={isDownloading}
          />
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{document.name}&rdquo;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
