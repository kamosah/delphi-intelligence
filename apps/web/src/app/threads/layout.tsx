'use client';

import type { ReactNode } from 'react';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';

interface ThreadsLayoutProps {
  children: ReactNode;
}

/**
 * ThreadsLayout - Layout for org-wide threads interface
 *
 * Features:
 * - AppSidebar with thread navigation (Recent + Bookmarks)
 * - AppHeader for top navigation
 * - No SpaceContext needed (org-wide threads)
 * - Uses organization from Zustand auth store
 */
export default function ThreadsLayout({ children }: ThreadsLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top Navigation */}
      <AppHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* AppSidebar - Shows threads navigation on /threads routes */}
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
