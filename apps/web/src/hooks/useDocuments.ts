'use client';

import {
  documentsApi,
  type Document,
  type UploadDocumentRequest,
} from '@/lib/api/documents-client';
import { queryKeys } from '@/lib/query/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

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
    onSuccess: (data, variables) => {
      // Invalidate document list for the space
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.list(variables.space_id),
      });

      // Clear progress for this file
      const fileId = variables.fileId || variables.file.name;
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
    },
    onError: (error, variables) => {
      // Clear progress on error
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
 * React Query hook for listing documents in a space.
 *
 * @example
 * const { documents, isLoading } = useDocuments(spaceId);
 */
export function useDocuments(spaceId?: string) {
  const { accessToken } = useAuthStore();

  const query = useQuery({
    queryKey: queryKeys.documents.list(spaceId || 'all'),
    queryFn: async () => {
      if (!accessToken) {
        throw new Error('Authentication required');
      }
      return documentsApi.list(accessToken, spaceId);
    },
    enabled: !!accessToken,
  });

  return {
    documents: query.data?.documents || [],
    total: query.data?.total || 0,
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
    onSuccess: (data, variables) => {
      // Invalidate document list for the space
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.list(variables.spaceId),
      });

      // Remove from cache
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
      link.download = fileName;
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
