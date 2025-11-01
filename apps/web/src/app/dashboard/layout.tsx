'use client';

import Link from 'next/link';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { UserMenu } from '@/components/layout/UserMenu';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { useUIStore } from '@/store/ui-store';
import { Button } from '@olympus/ui';
import { Menu } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarVisible, toggleSidebarVisibility } = useUIStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation - Compact Hex-style */}
      <nav className="bg-white border-b border-gray-200">
        <div className="flex justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            {/* Sidebar Toggle - Always Hamburger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebarVisibility}
              className="h-8 w-8"
              title={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
            >
              <Menu className="h-4 w-4" />
            </Button>

            {/* Logo / Brand */}
            <Link href="/dashboard" className="flex-shrink-0">
              <h1 className="text-base font-semibold text-gray-900 hover:text-gray-700 transition-colors">
                Olympus MVP
              </h1>
            </Link>
          </div>

          <div className="flex items-center space-x-2">
            {/* Search */}
            <div className="relative hidden md:block">
              <input
                type="search"
                placeholder="Search..."
                className="w-48 px-3 py-1.5 pl-9 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-3.5 w-3.5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Notifications */}
            <button className="p-1.5 text-gray-400 hover:text-gray-500 rounded-md hover:bg-gray-100">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>

            {/* User menu */}
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* AppSidebar - Toggleable navigation (pushes content) */}
        <AppSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-8">
          <EmailVerificationBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
