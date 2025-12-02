'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { TooltipProvider } from '@olympus/ui';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useAuthStore } from '@/lib/stores/auth-store';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';
import { DashboardNavigation } from './DashboardNavigation';
import { SettingsNavigation } from './SettingsNavigation';
import { SidebarHeader } from './SidebarHeader';
import { ThreadsNavigation } from './ThreadsNavigation';
import { UserMenu } from './UserMenu';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarIconMode, sidebarVisible, toggleSidebarIconMode } =
    useUIStore();
  const { currentOrganization } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  const isThreadsRoute =
    pathname.startsWith('/threads') || pathname.startsWith('/library');
  const isSettingsRoute = pathname.startsWith('/settings');
  const orgId = currentOrganization?.id;

  // Only render after hydration to prevent flash of wrong state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Global keyboard shortcuts
  useKeyboardShortcut([
    {
      key: 'j',
      metaKey: true,
      callback: () => router.push('/threads'),
    },
    {
      key: '.',
      metaKey: true,
      callback: () => toggleSidebarIconMode(),
    },
  ]);

  // Determine which navigation to render
  let NavigationComponent;
  if (isThreadsRoute) {
    NavigationComponent = ThreadsNavigation;
  } else if (isSettingsRoute) {
    NavigationComponent = SettingsNavigation;
  } else {
    NavigationComponent = DashboardNavigation;
  }

  return (
    <AnimatePresence mode="wait">
      {sidebarVisible && mounted && (
        <TooltipProvider disableHoverableContent>
          <motion.aside
            className={cn(
              'h-[calc(100vh-3.5rem)] bg-card border-r flex-shrink-0',
              'flex flex-col overflow-hidden'
            )}
            initial={{
              opacity: 0,
              scaleX: 0,
              width: 0,
            }}
            animate={{
              opacity: 1,
              pointerEvents: 'auto',
              scaleX: 1,
              width: sidebarIconMode ? 80 : 256,
            }}
            exit={{
              opacity: 0,
              pointerEvents: 'none',
              scaleX: 0,
              width: 0,
            }}
            transition={{
              duration: 0.3,
              ease: 'easeInOut',
            }}
          >
            {/* Header - changes based on route */}
            <div className="border-b border-gray-200 p-4">
              <SidebarHeader
                isThreadsRoute={isThreadsRoute}
                isSettingsRoute={isSettingsRoute}
                iconMode={sidebarIconMode}
              />
            </div>

            {/* Navigation - changes based on route */}
            <nav className="flex-1 overflow-y-auto p-4">
              <NavigationComponent iconMode={sidebarIconMode} orgId={orgId} />
            </nav>

            {/* User Menu */}
            <div className="border-t border-gray-200 p-4">
              <UserMenu iconMode={sidebarIconMode} />
            </div>
          </motion.aside>
        </TooltipProvider>
      )}
    </AnimatePresence>
  );
}
