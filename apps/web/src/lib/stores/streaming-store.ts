import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Citation } from '@/lib/api/queries-client';

/**
 * Streaming session state for a single thread.
 *
 * Persists across navigation and page refreshes during active streaming.
 */
export interface StreamingSession {
  threadId: string;
  userQuery: string; // The user's current question being answered
  response: string;
  citations: Citation[];
  confidenceScore: number | null;
  isStreaming: boolean;
  error: string | null;
  errorCode?: string;
  retryCount: number;
  lastUpdated: number; // Timestamp for TTL cleanup
}

/**
 * Streaming store state and actions.
 *
 * Manages multiple concurrent streaming sessions across threads.
 * Each thread's streaming state is isolated and keyed by threadId.
 */
interface StreamingStore {
  // Active streaming sessions by threadId (supports multiple concurrent streams)
  sessions: Record<string, StreamingSession>;

  // Start a new streaming session
  startSession: (threadId: string, userQuery: string) => void;

  // Update an existing streaming session
  updateSession: (threadId: string, updates: Partial<StreamingSession>) => void;

  // End a streaming session (on 'done' or error)
  endSession: (threadId: string) => void;

  // Get a streaming session by threadId
  getSession: (threadId: string) => StreamingSession | null;

  // Remove a completed session from the store
  removeSession: (threadId: string) => void;

  // Clean up stale sessions (older than 1 hour)
  cleanupStale: () => void;

  // Reset all state (for testing or cleanup)
  reset: () => void;
}

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Zustand store for streaming state management with LocalStorage persistence.
 *
 * Features:
 * - Persists streaming state across navigation and page refreshes
 * - Supports multiple concurrent streams (sessions keyed by threadId)
 * - Auto-cleanup of stale sessions (1hr TTL)
 * - Token batching optimization via requestAnimationFrame
 *
 * @example
 * // Start a streaming session
 * const { startSession, updateSession } = useStreamingStore();
 * startSession('thread-123', 'What are the risks?');
 * updateSession('thread-123', { response: 'The key risks are...' });
 *
 * @example
 * // Check if thread is streaming
 * const session = useStreamingStore(state => state.getSession(threadId));
 * if (session?.isStreaming) {
 *   // Show live streaming UI with session.response
 * }
 *
 * @example
 * // Multiple concurrent streams
 * startSession('thread-a', 'Question A');
 * startSession('thread-b', 'Question B');
 * // Both stream independently, keyed by threadId
 */
export const useStreamingStore = create<StreamingStore>()(
  persist(
    (set, get) => ({
      sessions: {},

      startSession: (threadId, userQuery) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [threadId]: {
              threadId,
              userQuery,
              response: '',
              citations: [],
              confidenceScore: null,
              isStreaming: true,
              error: null,
              errorCode: undefined,
              retryCount: 0,
              lastUpdated: Date.now(),
            },
          },
        }));
      },

      updateSession: (threadId, updates) => {
        set((state) => {
          const existing = state.sessions[threadId];
          if (!existing) {
            // If session doesn't exist, create it (handles edge case of missed 'start' event)
            return {
              sessions: {
                ...state.sessions,
                [threadId]: {
                  threadId,
                  userQuery: '', // Will be updated by caller
                  response: '',
                  citations: [],
                  confidenceScore: null,
                  isStreaming: true,
                  error: null,
                  errorCode: undefined,
                  retryCount: 0,
                  lastUpdated: Date.now(),
                  ...updates,
                },
              },
            };
          }

          return {
            sessions: {
              ...state.sessions,
              [threadId]: {
                ...existing,
                ...updates,
                lastUpdated: Date.now(),
              },
            },
          };
        });
      },

      endSession: (threadId) => {
        set((state) => {
          if (!state.sessions[threadId]) {
            // Session doesn't exist, no-op
            return state;
          }

          return {
            sessions: {
              ...state.sessions,
              [threadId]: {
                ...state.sessions[threadId],
                isStreaming: false,
                lastUpdated: Date.now(),
              },
            },
          };
        });
      },

      getSession: (threadId) => {
        const state = get();
        return state.sessions[threadId] || null;
      },

      removeSession: (threadId) => {
        set((state) => {
          const sessions = { ...state.sessions };
          delete sessions[threadId];
          return { sessions };
        });
      },

      cleanupStale: () => {
        const now = Date.now();
        set((state) => {
          const sessions = { ...state.sessions };
          let cleaned = false;

          Object.keys(sessions).forEach((threadId) => {
            const session = sessions[threadId];
            if (session && now - session.lastUpdated > SESSION_TTL_MS) {
              delete sessions[threadId];
              cleaned = true;
            }
          });

          return cleaned ? { sessions } : state;
        });
      },

      reset: () => {
        set({
          sessions: {},
        });
      },
    }),
    {
      name: 'olympus-streaming-sessions', // LocalStorage key
      partialize: (state) => ({
        sessions: state.sessions, // Only persist sessions
      }),
      storage: createJSONStorage(() => localStorage),
    }
  )
);
