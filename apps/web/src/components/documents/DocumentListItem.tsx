'use client';

import type { Document } from '@/lib/api/generated';
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
import { motion } from 'framer-motion';
import { useState } from 'react';
import { DocumentActions } from './DocumentActions';
import { DocumentError } from './DocumentError';
import { DocumentIcon } from './DocumentIcon';
import { DocumentMetadata } from './DocumentMetadata';
import { DocumentStatusBadge } from './DocumentStatusBadge';

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
      <motion.div
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
        transition={{
          duration: 0.3,
          ease: 'easeOut',
        }}
        className={`flex items-center justify-between p-4 border border-gray-200 rounded-lg ${
          isDeleting
            ? 'bg-red-50 border-red-200 pointer-events-none'
            : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <DocumentIcon fileType={document.fileType} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {document.name}
              </h4>
              <DocumentStatusBadge status={document.status} />
              {isDeleting && (
                <span className="text-xs text-red-600 font-medium">
                  Deleting...
                </span>
              )}
            </div>

            <DocumentMetadata
              fileType={document.fileType}
              sizeBytes={document.sizeBytes}
              createdAt={document.createdAt}
            />

            {document.status === 'failed' && document.processingError && (
              <DocumentError error={document.processingError} />
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
      </motion.div>

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
