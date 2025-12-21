import { create } from 'zustand';

/**
 * Global fetching state store for manual operations.
 *
 * Used alongside React Query's `useIsFetching()` to track operations
 * that aren't automatically tracked by React Query (e.g., file uploads,
 * SSE streams, custom async operations).
 *
 * @example
 * ```tsx
 * const { startFetching, stopFetching } = useIsFetchingStore();
 *
 * const handleUpload = async (file: File) => {
 *   const uploadId = `upload-${Date.now()}`;
 *   startFetching(uploadId);
 *   try {
 *     await uploadFile(file);
 *   } finally {
 *     stopFetching(uploadId);
 *   }
 * };
 * ```
 */
interface IsFetchingStore {
  /**
   * Set of active manual operation IDs.
   * Use unique IDs to track multiple simultaneous operations.
   */
  manualOperations: Set<string>;

  /**
   * Start tracking a manual operation.
   * @param operationId - Unique identifier for the operation
   */
  startFetching: (operationId: string) => void;

  /**
   * Stop tracking a manual operation.
   * @param operationId - Unique identifier for the operation
   */
  stopFetching: (operationId: string) => void;
}

export const useIsFetchingStore = create<IsFetchingStore>((set) => ({
  manualOperations: new Set(),

  startFetching: (operationId) =>
    set((state) => {
      const ops = new Set(state.manualOperations);
      ops.add(operationId);
      return { manualOperations: ops };
    }),

  stopFetching: (operationId) =>
    set((state) => {
      const ops = new Set(state.manualOperations);
      ops.delete(operationId);
      return { manualOperations: ops };
    }),
}));
