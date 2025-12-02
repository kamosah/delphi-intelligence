'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User, Settings, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Badge,
  Kbd,
} from '@olympus/ui';
import { useAuth } from '@/hooks/useAuth';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAuthStore } from '@/lib/stores/auth-store';

interface UserMenuProps {
  iconMode?: boolean;
}

/**
 * User menu dropdown component for the dashboard.
 * Shows user info and provides logout functionality.
 */
export function UserMenu({ iconMode = false }: UserMenuProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useAuthStore();

  // Global keyboard shortcut: ⇧⌘, (Shift+Command+Comma) to navigate to settings
  useKeyboardShortcuts({
    key: ',',
    metaKey: true,
    shiftKey: true,
    callback: () => router.push('/settings/preferences'),
  });

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.full_name) {
      return user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center space-x-3 text-sm text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg px-2 py-1 w-full">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {getUserInitials()}
            </span>
          </div>
          {!iconMode && (
            <>
              <div className="flex-1 text-left">
                <div className="font-medium">{user?.full_name || 'User'}</div>
              </div>
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            {user?.email_confirmed && (
              <Badge className="w-fit bg-green-100 text-green-800 hover:bg-green-100">
                Verified
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push('/settings/preferences')}
          className="justify-between"
        >
          <div className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </div>
          <Kbd className="text-[10px]">⇧⌘,</Kbd>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-700">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
