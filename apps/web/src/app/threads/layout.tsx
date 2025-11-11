'use client';

import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ThreadsPanelProvider } from '@/contexts/ThreadsPanelContext';
import type { ReactNode } from 'react';

interface ThreadsLayoutProps {
  children: ReactNode;
}

/**
 * ThreadsLayout - Layout for org-wide threads interface
 *
 * Features:
 * - AppSidebar and AppHeader for navigation
 * - Wraps with ThreadsPanelProvider for bottom panel state management
 * - No SpaceContext needed (org-wide threads)
 * - Uses organization from Zustand auth store
 */
export default function ThreadsLayout({ children }: ThreadsLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Navigation */}
      <AppHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* AppSidebar - Toggleable navigation (pushes content) */}
        <AppSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto min-h-0">
          <EmailVerificationBanner />
          <ThreadsPanelProvider>{children}</ThreadsPanelProvider>
        </main>
      </div>
    </div>
  );
}
