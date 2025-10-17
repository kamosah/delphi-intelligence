'use client';

import { formatDistanceToNow } from 'date-fns';

interface DocumentMetadataProps {
  fileType: string;
  sizeBytes: number;
  createdAt: string;
}

/**
 * Document metadata display component.
 * Shows file type, size, and upload time in a compact format.
 */
export function DocumentMetadata({
  fileType,
  sizeBytes,
  createdAt,
}: DocumentMetadataProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  return (
    <div className="flex items-center gap-3 text-xs text-gray-500">
      <span>{fileType.toUpperCase()}</span>
      <span>•</span>
      <span>{formatFileSize(sizeBytes)}</span>
      <span>•</span>
      <span>
        {formatDistanceToNow(new Date(createdAt), {
          addSuffix: true,
        })}
      </span>
    </div>
  );
}
