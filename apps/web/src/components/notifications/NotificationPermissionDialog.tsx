'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@olympus/ui';
import { Button } from '@olympus/ui';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { useUpdateBrowserNotificationPreference } from '@/hooks/useUserPreferences';

interface NotificationPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for requesting browser notification permission.
 *
 * Shown to users who haven't been prompted yet (browserNotificationsEnabled === null).
 * Users can enable, dismiss, or explicitly decline notifications.
 *
 * @example
 * const [showDialog, setShowDialog] = useState(false);
 *
 * <NotificationPermissionDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 * />
 */
export function NotificationPermissionDialog({
  open,
  onOpenChange,
}: NotificationPermissionDialogProps) {
  const { requestPermission, isSupported } = useBrowserNotifications();
  const { updateBrowserNotifications } =
    useUpdateBrowserNotificationPreference();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnable = async () => {
    setIsRequesting(true);
    try {
      await requestPermission();
      onOpenChange(false);
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDecline = async () => {
    try {
      // User explicitly declined - save as false
      await updateBrowserNotifications(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving notification preference:', error);
    }
  };

  const handleDismiss = () => {
    // User dismissed without deciding - keep as null (ask again later)
    onOpenChange(false);
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enable Browser Notifications?</DialogTitle>
          <DialogDescription>
            Get notified when your AI queries finish processing, even when
            you're working in another tab or window.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Stay in the loop</p>
              <p className="text-sm text-muted-foreground">
                We'll only notify you when a query completes while you're
                working in another tab.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={handleDismiss}>
            Maybe Later
          </Button>
          <Button variant="outline" onClick={handleDecline}>
            No Thanks
          </Button>
          <Button
            onClick={handleEnable}
            disabled={isRequesting}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isRequesting ? 'Requesting...' : 'Enable Notifications'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
