'use client';

import { Alert, AlertDescription, Button, Progress } from '@olympus/ui';
import { AlertCircle, CheckCircle2, File, X } from 'lucide-react';

export interface FileUploadState {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface DocumentUploadFileItemProps {
  fileState: FileUploadState;
  onRetry: (fileId: string) => void;
  onRemove: (fileId: string) => void;
}

/**
 * Individual file item in the upload list with progress tracking.
 */
export function DocumentUploadFileItem({
  fileState,
  onRetry,
  onRemove,
}: DocumentUploadFileItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-white">
      <div className="flex-shrink-0">
        {fileState.status === 'success' ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : fileState.status === 'error' ? (
          <AlertCircle className="w-5 h-5 text-red-500" />
        ) : (
          <File className="w-5 h-5 text-gray-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {fileState.file.name}
        </p>
        <p className="text-xs text-gray-500">
          {(fileState.file.size / 1024 / 1024).toFixed(2)} MB
        </p>

        {fileState.status === 'uploading' && (
          <div className="mt-2">
            <Progress value={fileState.progress} className="h-1" />
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(fileState.progress)}%
            </p>
          </div>
        )}

        {fileState.status === 'error' && fileState.error && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {fileState.error}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex-shrink-0">
        {fileState.status === 'error' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRetry(fileState.id)}
          >
            Retry
          </Button>
        )}
        {fileState.status !== 'uploading' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRemove(fileState.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
