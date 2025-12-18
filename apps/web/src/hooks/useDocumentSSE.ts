'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useClientToken } from '@/hooks/useClientToken';
import { queryKeys } from '@/lib/query/query-keys';
import { handleAuthError } from '@/lib/utils/auth-error-handler';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// SSE configuration constants
const SSE_TOKEN_REFRESH_BUFFER = 60; // seconds - refresh token before expiry (increased from 30s to 1 minute)
const SSE_RECONNECT_DELAY = 2000; // milliseconds - delay before reconnect on error
const SSE_ERROR_RETRY_DELAY = 5000; // milliseconds - delay before retry on connection error
const MAX_RECONNECT_ATTEMPTS = 3; // max reconnection attempts before showing error

interface SSEMessage {
  event: string;
  document_id: string;
  data: {
    status?: string;
    updated_at?: string;
    processing_error?: string;
    chunks_count?: number;
  };
}

/**
 * React hook for subscribing to real-time document status updates via Server-Sent Events.
 *
 * This hook:
 * 1. Exchanges access token for short-lived SSE token (5-minute TTL)
 * 2. Establishes an SSE connection to the backend for a specific space
 * 3. Listens for document status updates (processing -> processed)
 * 4. Automatically invalidates React Query cache to trigger UI updates
 * 5. Handles connection lifecycle (connect, disconnect, reconnect)
 * 6. Automatically re-exchanges tokens before expiry
 * 7. Cleans up connection when component unmounts
 *
 * @param spaceId - UUID of the space to monitor for document updates
 * @param enabled - Whether to enable the SSE connection (default: true)
 *
 * @example
 * ```tsx
 * function DocumentList({ spaceId }: { spaceId: string }) {
 *   // Subscribe to real-time updates
 *   useDocumentSSE(spaceId);
 *
 *   const { documents } = useDocuments(spaceId);
 *
 *   return (
 *     <div>
 *       {documents.map(doc => (
 *         <DocumentListItem key={doc.id} document={doc} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDocumentSSE(spaceId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const { clientToken } = useClientToken();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const [isConnected, setIsConnected] = useState(false);

  // Note: SSE automatically reconnects when tab becomes active because:
  // 1. QueryProvider's visibility handler refreshes clientToken when stale
  // 2. This useEffect has clientToken as a dependency
  // 3. When clientToken changes, connectSSE() runs and reconnects
  // No need for a separate visibility handler here!

  useEffect(() => {
    // Only connect if enabled and we have a client token
    if (!enabled || !clientToken || !spaceId) {
      return;
    }

    let isCancelled = false;

    async function connectSSE() {
      if (isCancelled) return;

      try {
        // Step 1: Exchange client token for short-lived SSE token
        const response = await fetch(`${API_BASE_URL}/auth/sse-token`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${clientToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to get SSE token: ${response.statusText}`);
        }

        const { sse_token, expires_in } = await response.json();

        if (isCancelled) return;

        // Step 2: Connect to SSE endpoint with short-lived token
        const sseUrl = `${API_BASE_URL}/api/documents/stream/${spaceId}?token=${encodeURIComponent(sse_token)}`;
        const eventSource = new EventSource(sseUrl);

        eventSourceRef.current = eventSource;

        // Handle connection open
        eventSource.addEventListener('open', () => {
          console.log('[SSE] Connected to document updates stream');
          setIsConnected(true);
          // Reset reconnect attempts on successful connection
          reconnectAttemptsRef.current = 0;
        });

        // Handle connection established event
        eventSource.addEventListener('connected', (event: MessageEvent) => {
          const data = JSON.parse(event.data);
          console.log('[SSE] Connection established for space:', data.space_id);
        });

        // Handle status update events
        eventSource.addEventListener('status_update', (event: MessageEvent) => {
          const message: SSEMessage = JSON.parse(event.data);
          console.log('[SSE] Document status update:', message);

          // Invalidate ALL document list queries for this space (prefix matching)
          // This will trigger a refetch and update the document status in the UI
          queryClient.invalidateQueries({
            queryKey: [...queryKeys.documents.lists(), spaceId],
          });

          // If we have a document ID, also invalidate the detail query
          if (message.document_id) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.documents.detail(message.document_id),
            });
          }
        });

        // Handle heartbeat events (keep-alive)
        eventSource.addEventListener('heartbeat', () => {
          console.log('[SSE] Heartbeat received');
        });

        // Handle errors
        eventSource.addEventListener('error', (error) => {
          console.error('[SSE] Connection error:', error);
          setIsConnected(false);

          // EventSource automatically attempts to reconnect on error
          if (eventSource.readyState === EventSource.CLOSED) {
            console.log('[SSE] Connection closed, will reconnect...');
            eventSource.close();
            eventSourceRef.current = null;

            // Check reconnection attempts
            reconnectAttemptsRef.current += 1;

            if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
              // Max attempts reached - likely true session expiration
              console.error(
                '[SSE] Max reconnection attempts reached, triggering logout'
              );
              toast.error('Session Expired', {
                description: 'Please log in again to continue.',
                duration: 5000,
              });
              handleAuthError(
                new Error('SSE connection failed: session expired')
              );
              return;
            }

            // Reconnect after a short delay
            if (!isCancelled) {
              reconnectTimeoutRef.current = setTimeout(() => {
                connectSSE();
              }, SSE_RECONNECT_DELAY);
            }
          }
        });

        // Step 3: Schedule token refresh before expiry
        // Refresh before expiry (expires_in is 300 seconds = 5 minutes)
        const refreshDelay = (expires_in - SSE_TOKEN_REFRESH_BUFFER) * 1000;
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isCancelled && eventSource.readyState !== EventSource.CLOSED) {
            console.log('[SSE] Refreshing SSE token...');
            eventSource.close();
            eventSourceRef.current = null;
            connectSSE(); // Reconnect with new token
          }
        }, refreshDelay);
      } catch (error) {
        console.error('[SSE] Failed to connect:', error);
        setIsConnected(false);

        // Retry connection after delay
        if (!isCancelled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSSE();
          }, SSE_ERROR_RETRY_DELAY);
        }
      }
    }

    // Initial connection
    connectSSE();

    // Cleanup: Close connection when component unmounts or dependencies change
    return () => {
      console.log('[SSE] Cleaning up connection');
      isCancelled = true;
      setIsConnected(false);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [spaceId, enabled, clientToken, queryClient]);

  return {
    isConnected,
  };
}
