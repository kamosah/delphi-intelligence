/**
 * Browser Notifications Utility
 *
 * Utilities for working with the Browser Notification API.
 * Used for notifying users when AI streaming completes while tab is inactive.
 */

/**
 * Check if the browser supports notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get the current notification permission status
 * Returns: 'granted' | 'denied' | 'default'
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Check if notifications are currently granted
 */
export function hasNotificationPermission(): boolean {
  return getNotificationPermission() === 'granted';
}

/**
 * Request notification permission from the user
 * Returns the new permission status after the user responds
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Show a browser notification
 *
 * @param title - Notification title
 * @param options - Notification options (body, icon, etc.)
 * @returns The notification instance, or null if not supported/granted
 */
export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!hasNotificationPermission()) {
    console.warn('Cannot show notification: permission not granted');
    return null;
  }

  try {
    const notification = new Notification(title, {
      icon: '/olympus-icon.png', // Default icon
      badge: '/olympus-badge.png', // Badge for mobile
      ...options,
    });

    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
}

/**
 * Check if the current tab/window is visible to the user
 * Uses the Page Visibility API
 */
export function isTabVisible(): boolean {
  return !(document?.hidden ?? false);
}

/**
 * Show a notification when AI streaming completes (only if tab is hidden)
 *
 * @param threadTitle - Title of the thread that completed
 * @param onNotificationClick - Optional callback when notification is clicked
 */
export function showStreamingCompleteNotification(
  threadTitle: string | null,
  onNotificationClick?: () => void
): Notification | null {
  // Only show if tab is hidden (user is not actively viewing)
  if (isTabVisible()) {
    return null;
  }

  const title = 'AI Response Complete';
  const body = threadTitle
    ? `Your query "${threadTitle}" has finished processing.`
    : 'Your AI query has finished processing.';

  const notification = showNotification(title, {
    body,
    tag: 'olympus-streaming-complete', // Prevents duplicate notifications
    requireInteraction: false, // Auto-dismiss after a few seconds
  });

  if (notification && onNotificationClick) {
    notification.onclick = () => {
      window?.focus(); // Bring window to front
      onNotificationClick();
      notification.close();
    };
  }

  return notification;
}
