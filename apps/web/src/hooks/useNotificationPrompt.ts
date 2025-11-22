'use client';

import { useEffect, useRef, useState } from 'react';
import { useBrowserNotifications } from './useBrowserNotifications';
import { useUserPreferences } from './useUserPreferences';

interface UseNotificationPromptOptions {
  /** Whether streaming is currently active */
  isStreaming: boolean;
}

/**
 * Hook for managing the auto-prompt dialog for browser notifications.
 *
 * Automatically shows the permission dialog after the first streaming completion
 * if the user hasn't been prompted yet (browser_notifications_enabled is NULL).
 *
 * Handles streaming completion detection internally by tracking the transition
 * from isStreaming=true to isStreaming=false.
 *
 * @example
 * const { showPermissionDialog, setShowPermissionDialog } = useNotificationPrompt({
 *   isStreaming
 * });
 *
 * <NotificationPermissionDialog
 *   open={showPermissionDialog}
 *   onOpenChange={setShowPermissionDialog}
 * />
 */
export function useNotificationPrompt({
  isStreaming,
}: UseNotificationPromptOptions) {
  const { userPreferences } = useUserPreferences();
  const { isSupported } = useBrowserNotifications();
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  // Track if we've already prompted this session to avoid showing multiple times
  const hasPromptedRef = useRef(false);

  // Detect when streaming just completed (transition from true to false)
  const prevStreamingRef = useRef(isStreaming);
  const hasCompletedStreaming = prevStreamingRef.current && !isStreaming;

  useEffect(() => {
    prevStreamingRef.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    // Only auto-prompt once per session after streaming completes
    // Conditions:
    // 1. Browser supports notifications
    // 2. User hasn't been prompted yet (NULL in database)
    // 3. Streaming just completed successfully
    // 4. We haven't already shown the dialog this session
    const shouldPrompt =
      isSupported &&
      userPreferences?.browserNotificationsEnabled === null &&
      hasCompletedStreaming &&
      !hasPromptedRef.current;

    if (shouldPrompt) {
      setShowPermissionDialog(true);
      hasPromptedRef.current = true;
    }
  }, [isSupported, userPreferences, hasCompletedStreaming]);

  return {
    /** Whether to show the permission dialog */
    showPermissionDialog,
    /** Function to control dialog visibility */
    setShowPermissionDialog,
  };
}
