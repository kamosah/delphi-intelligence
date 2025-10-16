'use client';

import { Upload } from 'lucide-react';

interface DocumentUploadDropZoneProps {
  isDragging: boolean;
  isUploading: boolean;
  acceptedFileTypes: string[];
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Drop zone for document uploads with drag-and-drop support.
 */
export function DocumentUploadDropZone({
  isDragging,
  isUploading,
  acceptedFileTypes,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput,
}: DocumentUploadDropZoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`
        relative border-2 border-dashed rounded-lg p-8 transition-colors
        ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }
      `}
    >
      <input
        type="file"
        id="file-input"
        multiple
        accept={acceptedFileTypes.join(',')}
        onChange={onFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isUploading}
      />

      <div className="flex flex-col items-center justify-center text-center">
        <Upload className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drop files here or click to browse
        </p>
        <p className="text-sm text-gray-500">
          Supported formats: {acceptedFileTypes.join(', ')}
        </p>
      </div>
    </div>
  );
}
