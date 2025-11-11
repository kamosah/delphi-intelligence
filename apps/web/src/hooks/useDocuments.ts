'use client';

import {
  documentsApi,
  type Document,
  type UploadDocumentRequest,
} from '@/lib/api/documents-client';
import { useGetDocumentsQuery } from '@/lib/api/hooks.generated';
import { queryKeys } from '@/lib/query/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Sanitize a filename to remove potentially problematic characters.
 * Removes path traversal sequences and special characters that could cause issues.
 *
 * @param filename - The filename to sanitize
 * @returns Sanitized filename safe for download attribute
 */
function sanitizeFilename(filename: string): string {
  return (
    filename
      // Remove path traversal sequences
      .replace(/\.\./g, '')
      // Remove path separators
      .replace(/[/\\]/g, '_')
      // Remove null bytes
      .replace(/\0/g, '')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Trim whitespace
      .trim() || 'download'
  ); // Fallback to 'download' if filename becomes empty
}

/**
 * React Query hook for uploading documents with progress tracking.
 *
 * @example
 * const { uploadDocument, uploadProgress } = useUploadDocument();
 *
 * const handleUpload = async (file: File, spaceId: string) => {
 *   await uploadDocument({ file, space_id: spaceId });
 * };
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );

  const mutation = useMutation({
    mutationFn: async (
      request: UploadDocumentRequest & { fileId?: string }
    ) => {
      if (!accessToken) {
        throw new Error('Authentication required');
      }

      const fileId = request.fileId || request.file.name;

      return documentsApi.upload(request, accessToken, (progress) => {
        setUploadProgress((prev) => ({
          ...prev,
          [fileId]: progress,
        }));
      });
    },
    onSuccess: (data: Document, variables) => {
      // Add the uploaded document with 'uploaded' status to DocumentList
      // SSE will handle transitions: uploaded → processing → processed
      const fileId = variables.fileId || variables.file.name;

      // Transform REST API response (snake_case) to match GraphQL format (camelCase)
      const document = {
        id: data.id,
        name: data.name,
        fileType: data.file_type,
        filePath: (data as any).file_path || '',
        sizeBytes: data.size_bytes,
        spaceId: data.space_id,
        uploadedBy: data.uploaded_by,
        status: data.status,
        extractedText: data.extracted_text || null,
        docMetadata: data.metadata || null,
        processedAt: data.processed_at || null,
        processingError: data.processing_error || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Optimistically add document to ALL matching document list queries for this space
      queryClient.setQueriesData(
        { queryKey: [...queryKeys.documents.lists(), variables.space_id] },
        (oldData: any) => {
          if (!oldData) {
            return { documents: [document] };
          }

          // Check if document already exists (shouldn't, but defensive)
          const exists = (oldData.documents || []).some(
            (doc: any) => doc.id === document.id
          );

          if (exists) {
            return oldData;
          }

          return {
            documents: [document, ...(oldData.documents || [])],
          };
        }
      );

      // Invalidate to ensure we have the latest data from server
      // This will refetch and pick up any server-side changes
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.documents.lists(), variables.space_id],
      });

      // Clear progress for this file
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
    },
    onError: (error, variables) => {
      // Clear progress on error (no placeholder to remove anymore)
      const fileId = variables.fileId || variables.file.name;

      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
    },
  });

  return {
    uploadDocument: mutation.mutateAsync,
    uploadDocumentSync: mutation.mutate,
    isUploading: mutation.isPending,
    uploadError: mutation.error,
    uploadProgress,
  };
}

/**
 * React Query hook for listing documents in a space via GraphQL.
 *
 * Returns documents with camelCase fields (GraphQL convention).
 *
 * @example
 * const { documents, isLoading } = useDocuments({ spaceId });
 *
 * @example
 * const { documents, isLoading } = useDocuments({ limit: 3 }); // All accessible documents, top 3
 *
 * @example
 * const { documents, isLoading } = useDocuments(); // All accessible documents
 */
export function useDocuments(options?: {
  spaceId?: string;
  limit?: number;
  offset?: number;
}) {
  const { accessToken } = useAuthStore();
  const spaceId = options?.spaceId;
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  const query = useGetDocumentsQuery(
    {
      spaceId: spaceId || null,
      limit,
      offset,
    },
    {
      enabled: !!accessToken,
      queryKey: queryKeys.documents.list(spaceId || null, { limit, offset }),
    }
  );

  return {
    documents: query.data?.documents || [],
    total: query.data?.documents?.length || 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * React Query hook for getting a single document by ID.
 *
 * @example
 * const { document, isLoading } = useDocument(documentId);
 */
export function useDocument(documentId: string) {
  const { accessToken } = useAuthStore();

  const query = useQuery({
    queryKey: queryKeys.documents.detail(documentId),
    queryFn: async () => {
      if (!accessToken) {
        throw new Error('Authentication required');
      }
      return documentsApi.get(documentId, accessToken);
    },
    enabled: !!accessToken && !!documentId,
  });

  return {
    document: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * React Query hook for deleting a document.
 *
 * @example
 * const { deleteDocument } = useDeleteDocument();
 *
 * const handleDelete = async (documentId: string, spaceId: string) => {
 *   await deleteDocument({ documentId, spaceId });
 * };
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();

  const mutation = useMutation({
    mutationFn: async ({
      documentId,
      spaceId,
    }: {
      documentId: string;
      spaceId: string;
    }) => {
      if (!accessToken) {
        throw new Error('Authentication required');
      }
      return documentsApi.delete(documentId, accessToken);
    },
    // Optimistically update the cache before mutation runs
    onMutate: async (variables) => {
      const queryKeyPrefix = [
        ...queryKeys.documents.lists(),
        variables.spaceId,
      ];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queryKeyPrefix });

      // Snapshot all matching queries for rollback
      const previousQueries = queryClient.getQueriesData({
        queryKey: queryKeyPrefix,
      });

      // Optimistically remove the document from ALL matching cache entries
      queryClient.setQueriesData(
        { queryKey: queryKeyPrefix },
        (oldData: any) => {
          if (!oldData) return oldData;

          return {
            documents: (oldData.documents || []).filter(
              (doc: any) => doc.id !== variables.documentId
            ),
          };
        }
      );

      // Return context object with the snapshots
      return { previousQueries };
    },
    // Rollback on error
    onError: (error, variables, context) => {
      // Restore all previous states
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    // Always refetch after error or success to ensure consistency
    onSettled: (data, error, variables) => {
      // Invalidate all document list queries for this space
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.documents.lists(), variables.spaceId],
      });

      // Remove from detail cache
      queryClient.removeQueries({
        queryKey: queryKeys.documents.detail(variables.documentId),
      });
    },
  });

  return {
    deleteDocument: mutation.mutateAsync,
    deleteDocumentSync: mutation.mutate,
    isDeleting: mutation.isPending,
    deleteError: mutation.error,
  };
}

/**
 * React Query hook for downloading a document.
 *
 * @example
 * const { downloadDocument } = useDownloadDocument();
 *
 * const handleDownload = async (documentId: string, fileName: string) => {
 *   await downloadDocument({ documentId, fileName });
 * };
 */
export function useDownloadDocument() {
  const { accessToken } = useAuthStore();

  const mutation = useMutation({
    mutationFn: async ({
      documentId,
      fileName,
    }: {
      documentId: string;
      fileName: string;
    }) => {
      if (!accessToken) {
        throw new Error('Authentication required');
      }

      // Download file as blob
      const blob = await documentsApi.download(documentId, accessToken);

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = sanitizeFilename(fileName); // Sanitize filename for security
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    },
  });

  return {
    downloadDocument: mutation.mutateAsync,
    downloadDocumentSync: mutation.mutate,
    isDownloading: mutation.isPending,
    downloadError: mutation.error,
  };
}
