'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getNotificationPermission,
  hasNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  showNotification,
} from '@/lib/utils/browser-notifications';
import { useUpdateBrowserNotificationPreference } from './useUserPreferences';

/**
 * Hook for managing browser notification permissions and state.
 *
 * Handles permission requests, tracks permission state, and synchronizes
 * with user preferences in the database.
 *
 * @example
 * const {
 *   permission,
 *   isSupported,
 *   isGranted,
 *   requestPermission,
 *   showNotification: notify
 * } = useBrowserNotifications();
 *
 * // Request permission
 * const handleEnable = async () => {
 *   const granted = await requestPermission();
 *   if (granted) {
 *     notify('Welcome!', { body: 'Notifications enabled' });
 *   }
 * };
 */
export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof window !== 'undefined' ? getNotificationPermission() : 'default'
  );
  const { updateBrowserNotifications } =
    useUpdateBrowserNotificationPreference();

  // Check for permission changes when tab becomes visible
  // Permission changes are rare and typically require page reload or user action
  useEffect(() => {
    if (!isNotificationSupported()) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const currentPermission = getNotificationPermission();
        if (currentPermission !== permission) {
          setPermission(currentPermission);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [permission]);

  /**
   * Request notification permission from the user.
   * Updates both local state and database preferences.
   *
   * @returns Promise<boolean> - true if granted, false otherwise
   */
  const requestPermission = useCallback(async () => {
    const newPermission = await requestNotificationPermission();
    setPermission(newPermission);

    // Update user preference in database (non-blocking)
    const enabled = newPermission === 'granted';
    updateBrowserNotifications(enabled).catch((error) => {
      console.error('Failed to update browser notification preference:', error);
    });

    return enabled;
  }, [updateBrowserNotifications]);

  /**
   * Show a browser notification (only if permission is granted).
   *
   * @param title - Notification title
   * @param options - Notification options
   * @returns The notification instance, or null if not granted
   */
  const notify = useCallback((title: string, options?: NotificationOptions) => {
    return showNotification(title, options);
  }, []);

  return {
    /** Current notification permission status */
    permission,
    /** Whether notifications are supported in this browser */
    isSupported: isNotificationSupported(),
    /** Whether permission is granted */
    isGranted: hasNotificationPermission(),
    /** Whether permission has been denied */
    isDenied: permission === 'denied',
    /** Whether user hasn't been asked yet */
    isDefault: permission === 'default',
    /** Request notification permission from user */
    requestPermission,
    /** Show a notification (convenience wrapper) */
    showNotification: notify,
  };
}
