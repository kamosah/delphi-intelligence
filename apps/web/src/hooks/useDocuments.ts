'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useClientToken } from '@/hooks/useClientToken';
import {
  documentsApi,
  type Document,
  type UploadDocumentRequest,
} from '@/lib/api/documents-client';
import type {
  DocumentSortInput,
  DocumentFilterInput,
} from '@/lib/api/generated';
import {
  useGetDocumentsQuery,
  type GetDocumentsQuery,
  useDeleteDocumentMutation,
  useBulkDeleteDocumentsMutation,
} from '@/lib/api/hooks.generated';
import { queryKeys } from '@/lib/query/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';

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
  const { clientToken } = useClientToken();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );

  const mutation = useMutation({
    mutationFn: async (
      request: UploadDocumentRequest & { fileId?: string }
    ) => {
      if (!clientToken) {
        throw new Error('Authentication required');
      }

      const fileId = request.fileId || request.file.name;

      return documentsApi.upload(request, clientToken, (progress) => {
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
        filePath: data.file_path,
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
        (oldData: GetDocumentsQuery | undefined) => {
          if (!oldData) {
            return { documents: [document] };
          }

          // Check if document already exists (shouldn't, but defensive)
          const exists = (oldData.documents || []).some(
            (doc) => doc.id === document.id
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
 * React Query hook for listing documents in a space or organization via GraphQL.
 *
 * Returns documents with camelCase fields (GraphQL convention).
 * Now supports server-side filtering and sorting.
 *
 * @example
 * const { documents, isLoading } = useDocuments({ spaceId });
 *
 * @example
 * const { documents, isLoading } = useDocuments({
 *   organizationId,
 *   filters: { search: 'report', statuses: ['processed'] },
 *   sort: { field: 'NAME', order: 'ASC' }
 * });
 *
 * @example
 * const { documents, isLoading } = useDocuments({ limit: 3 }); // All accessible documents, top 3
 */
export function useDocuments(options?: {
  spaceId?: string;
  organizationId?: string;
  limit?: number;
  offset?: number;
  filters?: DocumentFilterInput;
  sort?: DocumentSortInput;
}) {
  const { clientToken } = useClientToken();
  const { currentOrganization } = useAuthStore();
  const spaceId = options?.spaceId;
  const orgId = options?.organizationId ?? currentOrganization?.id;
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  const query = useGetDocumentsQuery(
    {
      spaceId: spaceId || null,
      organizationId: orgId || null,
      limit,
      offset,
      sort: options?.sort || null,
      filters: options?.filters || null,
    },
    {
      enabled: !!clientToken,
      queryKey: queryKeys.documents.list(spaceId || null, {
        limit,
        offset,
        organizationId: orgId,
        filters: options?.filters,
        sort: options?.sort,
      }),
      placeholderData: (previousData) => previousData, // Keep previous data while refetching
    }
  );

  return {
    documents: query.data?.documents || [],
    total: query.data?.documents?.length || 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
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
  const { clientToken } = useClientToken();

  const query = useQuery({
    queryKey: queryKeys.documents.detail(documentId),
    queryFn: async () => {
      if (!clientToken) {
        throw new Error('Authentication required');
      }
      return documentsApi.get(documentId, clientToken);
    },
    enabled: !!clientToken && !!documentId,
  });

  return {
    document: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * React Query hook for deleting a document via GraphQL.
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

  const mutation = useDeleteDocumentMutation<
    Error,
    { previousDocuments: GetDocumentsQuery | undefined }
  >({
    onMutate: async (variables) => {
      const queryKeyPrefix = [
        ...queryKeys.documents.lists(),
        variables.input.spaceId,
      ];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queryKeyPrefix });

      // Snapshot the current documents for this specific query
      const previousDocuments =
        queryClient.getQueryData<GetDocumentsQuery>(queryKeyPrefix);

      // Optimistically remove the document
      queryClient.setQueryData<GetDocumentsQuery>(queryKeyPrefix, (oldData) => {
        if (!oldData) return oldData;
        return {
          documents: (oldData.documents || []).filter(
            (doc) => doc.id !== variables.input.documentId
          ),
        };
      });

      // Return snapshot for rollback
      return { previousDocuments };
    },
    // Rollback on error
    onError: (error, variables, context) => {
      // Restore previous state
      if (context?.previousDocuments) {
        queryClient.setQueryData(
          [...queryKeys.documents.lists(), variables.input.spaceId],
          context.previousDocuments
        );
      }
    },
    // Always refetch after error or success to ensure consistency
    onSettled: (data, error, variables) => {
      // Invalidate all document list queries for this space
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.documents.lists(), variables.input.spaceId],
      });

      // Remove from detail cache
      queryClient.removeQueries({
        queryKey: queryKeys.documents.detail(variables.input.documentId),
      });
    },
  });

  return {
    deleteDocument: (variables: { documentId: string; spaceId: string }) =>
      mutation.mutateAsync({
        input: {
          documentId: variables.documentId,
          spaceId: variables.spaceId,
        },
      }),
    deleteDocumentSync: (variables: { documentId: string; spaceId: string }) =>
      mutation.mutate({
        input: {
          documentId: variables.documentId,
          spaceId: variables.spaceId,
        },
      }),
    isDeleting: mutation.isPending,
    deleteError: mutation.error,
  };
}

/**
 * React Query hook for bulk deleting documents via GraphQL.
 *
 * @example
 * const { bulkDeleteDocuments } = useBulkDeleteDocuments();
 *
 * const handleBulkDelete = async (documentIds: string[], spaceId: string) => {
 *   const result = await bulkDeleteDocuments({ documentIds });
 *   console.log(`Deleted ${result.deletedCount} documents`);
 *   if (result.failedIds.length > 0) {
 *     console.warn(`Failed to delete: ${result.failedIds.join(', ')}`);
 *   }
 * };
 */
export function useBulkDeleteDocuments() {
  const queryClient = useQueryClient();

  const mutation = useBulkDeleteDocumentsMutation<Error>({
    onSuccess: (data, variables) => {
      // Invalidate all document list queries to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.lists(),
      });

      // Remove deleted documents from detail cache
      variables.input.documentIds.forEach((id) => {
        // Only remove if it was successfully deleted
        if (!data.bulkDeleteDocuments.failedIds.includes(id)) {
          queryClient.removeQueries({
            queryKey: queryKeys.documents.detail(id),
          });
        }
      });
    },
  });

  return {
    bulkDeleteDocuments: (variables: { documentIds: string[] }) =>
      mutation.mutateAsync({
        input: {
          documentIds: variables.documentIds,
        },
      }),
    bulkDeleteDocumentsSync: (variables: { documentIds: string[] }) =>
      mutation.mutate({
        input: {
          documentIds: variables.documentIds,
        },
      }),
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
  const { clientToken } = useClientToken();

  const mutation = useMutation({
    mutationFn: async ({
      documentId,
      fileName,
    }: {
      documentId: string;
      fileName: string;
    }) => {
      if (!clientToken) {
        throw new Error('Authentication required');
      }

      // Download file as blob
      const blob = await documentsApi.download(documentId, clientToken);

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
