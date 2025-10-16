'use client';

import {
  DocumentUploadFileItem,
  type FileUploadState,
} from './DocumentUploadFileItem';

interface DocumentUploadFileListProps {
  files: FileUploadState[];
  onRetry: (fileId: string) => void;
  onRemove: (fileId: string) => void;
}

/**
 * List of files being uploaded with summary statistics.
 */
export function DocumentUploadFileList({
  files,
  onRetry,
  onRemove,
}: DocumentUploadFileListProps) {
  if (files.length === 0) {
    return null;
  }

  const successCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  return (
    <div className="mt-6">
      <div className="space-y-3">
        {files.map((fileState) => (
          <DocumentUploadFileItem
            key={fileState.id}
            fileState={fileState}
            onRetry={onRetry}
            onRemove={onRemove}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>
          {successCount} of {files.length} uploaded
        </span>
        {errorCount > 0 && (
          <span className="text-red-600">{errorCount} failed</span>
        )}
      </div>
    </div>
  );
}
