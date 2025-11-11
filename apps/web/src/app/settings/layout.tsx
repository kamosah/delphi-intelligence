'use client';

import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';

/**
 * Settings layout - provides AppHeader and AppSidebar for all settings pages.
 * Uses proper height constraints for correct scrolling behavior.
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Navigation */}
      <AppHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* AppSidebar - Context-aware (shows settings navigation) */}
        <AppSidebar />

        {/* Main Content - scrollable area */}
        <main className="flex-1 overflow-y-auto p-8 min-h-0">{children}</main>
      </div>
    </div>
  );
}
