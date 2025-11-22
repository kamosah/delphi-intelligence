'use client';

import { useEffect, useRef } from 'react';
import { showStreamingCompleteNotification } from '@/lib/utils/browser-notifications';
import { useBrowserNotifications } from './useBrowserNotifications';
import { useUserPreferences } from './useUserPreferences';

interface UseThreadNotificationsOptions {
  /** Whether streaming is currently active */
  isStreaming: boolean;
  /** Thread title for the notification */
  threadTitle?: string | null;
  /** Callback when notification is clicked */
  onNotificationClick?: () => void;
}

/**
 * Hook for showing browser notifications when AI streaming completes.
 *
 * Only shows notifications when:
 * 1. User has enabled browser notifications in preferences
 * 2. Browser permission is granted
 * 3. Tab is hidden/inactive (user is not watching)
 * 4. Streaming just completed (transitioned from true to false)
 *
 * @example
 * useThreadNotifications({
 *   isStreaming: streamingStore.isStreaming,
 *   threadTitle: thread?.title,
 *   onNotificationClick: () => {
 *     // Focus the thread or scroll to it
 *   }
 * });
 */
export function useThreadNotifications({
  isStreaming,
  threadTitle,
  onNotificationClick,
}: UseThreadNotificationsOptions) {
  const { userPreferences } = useUserPreferences();
  const { isGranted } = useBrowserNotifications();

  // Track previous streaming state to detect completion transition
  const prevStreamingRef = useRef(isStreaming);

  useEffect(() => {
    // Only show notifications if user has enabled them and browser permission is granted
    const notificationsEnabled =
      userPreferences?.browserNotificationsEnabled === true;

    if (!notificationsEnabled || !isGranted) {
      // Still update the ref to track state even if notifications are disabled
      prevStreamingRef.current = isStreaming;
      return;
    }

    // Detect streaming completion: was streaming (true), now stopped (false)
    const streamingJustCompleted = prevStreamingRef.current && !isStreaming;

    if (streamingJustCompleted) {
      // Show notification (only if tab is hidden - handled inside the utility)
      showStreamingCompleteNotification(
        threadTitle || null,
        onNotificationClick
      );
    }

    // Update ref with current state for next render
    prevStreamingRef.current = isStreaming;
  }, [
    isStreaming,
    threadTitle,
    onNotificationClick,
    userPreferences,
    isGranted,
  ]);
}
