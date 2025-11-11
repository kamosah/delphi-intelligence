'use client';

import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';

/**
 * Dashboard layout - provides AppHeader and AppSidebar for all dashboard pages.
 * Uses proper height constraints for correct scrolling behavior.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Navigation */}
      <AppHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* AppSidebar - Toggleable navigation (pushes content) */}
        <AppSidebar />

        {/* Main Content - scrollable area */}
        <main className="flex-1 overflow-y-auto p-8 min-h-0">
          <EmailVerificationBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
