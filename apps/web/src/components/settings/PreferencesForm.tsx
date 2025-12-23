'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { NotificationPermissionDialog } from '@/components/notifications/NotificationPermissionDialog';
import {
  SettingsSection,
  SettingsSectionDivider,
} from '@/components/settings/SettingsSection';
import { SettingsToggleRow } from '@/components/settings/SettingsToggleRow';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import {
  useUpdateBrowserNotificationPreference,
  useUpdateUserPreferences,
  useUserPreferences,
} from '@/hooks/useUserPreferences';

/**
 * User Preferences Form Component
 *
 * Allows users to manage their notification preferences and other settings.
 */
export function PreferencesForm() {
  const { userPreferences, isLoading } = useUserPreferences();
  const { isSupported, isGranted, isDenied } = useBrowserNotifications();
  const { updateUserPreferences, isUpdating } = useUpdateUserPreferences();
  const { updateBrowserNotifications } =
    useUpdateBrowserNotificationPreference();

  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  // Current state from database
  const notificationsEnabled = userPreferences?.notificationsEnabled ?? false;
  const emailNotificationsEnabled =
    userPreferences?.emailNotifications ?? false;
  const browserNotificationsEnabled =
    userPreferences?.browserNotificationsEnabled ?? false;

  const handleToggleNotifications = async (checked: boolean) => {
    // If enabling notifications
    if (checked) {
      // If browser permission is already granted, just enable in database
      if (isGranted) {
        try {
          await updateBrowserNotifications(true);
          toast.success('Browser notifications enabled');
        } catch (error) {
          toast.error('Failed to enable notifications');
          console.error(error);
        }
        return;
      }

      // If permission was denied, can't enable (user must change in browser settings)
      if (isDenied) {
        toast.error(
          'Browser notifications are blocked. Please enable them in your browser settings.'
        );
        return;
      }

      // Otherwise, show the permission dialog
      setShowPermissionDialog(true);
    } else {
      // Disabling notifications
      try {
        await updateBrowserNotifications(false);
        toast.success('Browser notifications disabled');
      } catch (error) {
        toast.error('Failed to disable notifications');
        console.error(error);
      }
    }
  };

  const handleToggleGeneralNotifications = async (checked: boolean) => {
    try {
      await updateUserPreferences({
        input: {
          notificationsEnabled: checked,
        },
      });
      toast.success(
        checked ? 'Notifications enabled' : 'Notifications disabled'
      );
    } catch (error) {
      toast.error('Failed to update notification settings');
      console.error(error);
    }
  };

  const handleToggleEmailNotifications = async (checked: boolean) => {
    try {
      await updateUserPreferences({
        input: {
          emailNotifications: checked,
        },
      });
      toast.success(
        checked ? 'Email notifications enabled' : 'Email notifications disabled'
      );
    } catch (error) {
      toast.error('Failed to update email notification settings');
      console.error(error);
    }
  };

  // Build description with status information for denied state
  const getNotificationDescription = () => {
    if (isDenied) {
      return "Get notified when your AI queries finish processing, even when you're working in another tab. Browser notifications are currently blocked - please enable them in your browser settings.";
    }
    return "Get notified when your AI queries finish processing, even when you're working in another tab";
  };

  return (
    <>
      {/* Notifications Section */}
      <SettingsSection
        title="Notifications"
        description="Control how you receive notifications about AI query completion"
      >
        <SettingsToggleRow
          label="Enable Notifications"
          description="Master toggle for all notification types"
          checked={notificationsEnabled}
          onCheckedChange={handleToggleGeneralNotifications}
          loading={isLoading}
          disabled={isUpdating}
        />

        <SettingsSectionDivider />

        <SettingsToggleRow
          label="Email Notifications"
          description="Receive email notifications when your queries complete"
          checked={emailNotificationsEnabled}
          onCheckedChange={handleToggleEmailNotifications}
          loading={isLoading}
          disabled={isUpdating}
        />

        {/* Browser Notifications - Only show if browser supports notifications */}
        {isSupported && (
          <>
            <SettingsSectionDivider />

            <SettingsToggleRow
              label="Browser Notifications"
              description={getNotificationDescription()}
              checked={browserNotificationsEnabled}
              onCheckedChange={handleToggleNotifications}
              loading={isLoading}
              disabled={isUpdating}
            />
          </>
        )}
      </SettingsSection>

      {/* Permission Dialog */}
      <NotificationPermissionDialog
        open={showPermissionDialog}
        onOpenChange={setShowPermissionDialog}
      />
    </>
  );
}
