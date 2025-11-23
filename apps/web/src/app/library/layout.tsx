'use client';

import type { ReactNode } from 'react';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';

interface LibraryLayoutProps {
  children: ReactNode;
}

/**
 * LibraryLayout - Layout for thread library/search page
 *
 * Features:
 * - AppSidebar with thread navigation (Recent + Bookmarks)
 * - AppHeader for top navigation
 * - Same structure as ThreadsLayout for consistency
 */
export default function LibraryLayout({ children }: LibraryLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top Navigation */}
      <AppHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* AppSidebar - Shows threads navigation on /library route */}
        <AppSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto min-h-0">
          <EmailVerificationBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
