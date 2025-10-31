'use client';

import { useUploadDocument } from '@/hooks/useDocuments';
import {
  getValidationErrorMessage,
  parseUploadError,
  validateFilename,
} from '@/lib/utils/error-parser';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { DocumentUploadDropZone } from './DocumentUploadDropZone';
import { DocumentUploadFileList } from './DocumentUploadFileList';
import type { FileUploadState } from './DocumentUploadFileItem';

interface DocumentUploadProps {
  spaceId: string;
  onUploadComplete?: (documentId: string) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedFileTypes?: string[];
}

/**
 * Document upload component with drag-and-drop support and progress tracking.
 *
 * @example
 * <DocumentUpload
 *   spaceId="space-123"
 *   onUploadComplete={(id) => console.log('Uploaded:', id)}
 * />
 */
export function DocumentUpload({
  spaceId,
  onUploadComplete,
  maxFiles = 10,
  maxSizeMB = 50,
  acceptedFileTypes = [
    '.pdf',
    '.doc',
    '.docx',
    '.txt',
    '.csv',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
  ],
}: DocumentUploadProps) {
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { uploadDocument, uploadProgress } = useUploadDocument();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadFile = useCallback(
    async (fileState: FileUploadState) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileState.id ? { ...f, status: 'uploading' } : f
        )
      );

      try {
        const result = await uploadDocument({
          file: fileState.file,
          space_id: spaceId,
          fileId: fileState.id,
        });

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileState.id
              ? { ...f, status: 'success', progress: 100 }
              : f
          )
        );

        onUploadComplete?.(result.id);
      } catch (error) {
        const userMessage = parseUploadError(
          error instanceof Error ? error : new Error('Unknown error')
        );

        // Show toast notification
        toast.error('Upload failed', {
          description: `${fileState.file.name}: ${userMessage}`,
          duration: 5000,
        });

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileState.id
              ? {
                  ...f,
                  status: 'error',
                  error: userMessage,
                }
              : f
          )
        );
      }
    },
    [uploadDocument, spaceId, onUploadComplete]
  );

  const addFiles = useCallback(
    (newFiles: File[]) => {
      // Check file count limit
      if (files.length + newFiles.length > maxFiles) {
        toast.error(getValidationErrorMessage('count', { maxCount: maxFiles }));
        return;
      }

      const validFiles: FileUploadState[] = [];
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      for (const file of newFiles) {
        // Validate file size
        if (file.size > maxSizeBytes) {
          toast.error(
            getValidationErrorMessage('size', {
              filename: file.name,
              maxSize: maxSizeMB,
            })
          );
          continue;
        }

        // Validate file type
        const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
        if (!acceptedFileTypes.includes(fileExtension)) {
          toast.error(
            getValidationErrorMessage('type', { filename: file.name })
          );
          continue;
        }

        // Validate filename (check for emojis and special characters)
        const filenameValidation = validateFilename(file.name);
        if (!filenameValidation.valid && filenameValidation.message) {
          // Show warning but still allow upload (backend will sanitize)
          toast.warning(filenameValidation.message, {
            description: file.name,
          });
        }

        validFiles.push({
          file,
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          status: 'pending',
          progress: 0,
        });
      }

      setFiles((prev) => [...prev, ...validFiles]);
      validFiles.forEach((fileState) => {
        uploadFile(fileState);
      });
    },
    [files, maxFiles, maxSizeMB, acceptedFileTypes, uploadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    },
    [addFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
      addFiles(selectedFiles);
      e.target.value = '';
    },
    [addFiles]
  );

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const retryUpload = (fileId: string) => {
    const fileState = files.find((f) => f.id === fileId);
    if (fileState) {
      uploadFile(fileState);
    }
  };

  const filesWithProgress = files.map((f) => ({
    ...f,
    progress: uploadProgress[f.id] || f.progress,
  }));

  const isUploading = files.some((f) => f.status === 'uploading');

  return (
    <div className="space-y-4">
      <DocumentUploadDropZone
        isDragging={isDragging}
        isUploading={isUploading}
        acceptedFileTypes={acceptedFileTypes}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileInput={handleFileInput}
      />

      <DocumentUploadFileList
        files={filesWithProgress}
        onRetry={retryUpload}
        onRemove={removeFile}
      />
    </div>
  );
}
