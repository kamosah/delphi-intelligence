'use client';

import Link from 'next/link';
import { Button } from '@olympus/ui';
import { Menu, Search, Bell } from 'lucide-react';
import { UserMenu } from '@/components/layout/UserMenu';
import { useUIStore } from '@/store/ui-store';

export function AppHeader() {
  const { sidebarVisible, toggleSidebarVisibility } = useUIStore();

  return (
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
              <Search className="h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-gray-500"
          >
            <Bell className="h-4 w-4" />
          </Button>

          {/* User menu */}
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
