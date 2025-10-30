'use client';

import { Button } from '@olympus/ui';
import { Trash2, Download } from 'lucide-react';

interface DocumentActionsProps {
  onDelete: () => void;
  onDownload?: () => void;
  isDeleting?: boolean;
  isDownloading?: boolean;
}

/**
 * Action buttons for document operations.
 * Provides download and delete functionality.
 */
export function DocumentActions({
  onDelete,
  onDownload,
  isDeleting = false,
  isDownloading = false,
}: DocumentActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onDownload}
        disabled={isDownloading}
        className="text-gray-600 hover:text-gray-900"
        title="Download document"
      >
        <Download className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={isDeleting}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
        title="Delete document"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
