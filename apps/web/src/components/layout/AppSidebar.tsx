'use client';

import { OrganizationSwitcher } from '@/components/layout/OrganizationSwitcher';
import { useAuthStore } from '@/lib/stores/auth-store';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';
import { TooltipProvider } from '@olympus/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NavItem } from './NavItem';
import { NavSection } from './NavSection';
import {
  DASHBOARD_NAV_ITEMS,
  SETTINGS_NAV_ITEM,
  SETTINGS_NAV_SECTIONS,
} from './sidebar-navigation';
import { isNavItemActive, resolveHref } from './sidebar-utils';

export function AppSidebar() {
  const pathname = usePathname();
  const { sidebarIconMode, sidebarVisible, toggleSidebarIconMode } =
    useUIStore();
  const { currentOrganization } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  const isSettingsRoute = pathname.startsWith('/settings');
  const orgId = currentOrganization?.id;

  // Only render after hydration to prevent flash of wrong state
  useEffect(() => {
    setMounted(true);
  }, []);

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
            {/* Header: Back button (Settings) or Org Switcher (Dashboard) */}
            <div className="border-b border-gray-200 p-4">
              {isSettingsRoute ? (
                // Settings: Back button
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{
                    width: sidebarIconMode ? 0 : 'auto',
                    opacity: sidebarIconMode ? 0 : 1,
                  }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  {!sidebarIconMode && (
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Settings
                    </Link>
                  )}
                </motion.div>
              ) : (
                // Dashboard: Organization Switcher
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{
                    width: sidebarIconMode ? 0 : 'auto',
                    opacity: sidebarIconMode ? 0 : 1,
                  }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  {!sidebarIconMode && <OrganizationSwitcher />}
                </motion.div>
              )}
            </div>

            {/* Navigation */}
            <nav className="overflow-y-auto p-4">
              {isSettingsRoute ? (
                // Settings Navigation (grouped sections)
                <div className="space-y-6">
                  {SETTINGS_NAV_SECTIONS.map((section) => (
                    <NavSection
                      key={section.id}
                      section={section}
                      iconMode={sidebarIconMode}
                      orgId={orgId}
                    />
                  ))}
                </div>
              ) : (
                // Dashboard Navigation (flat list + Settings link)
                <div className="space-y-2">
                  {DASHBOARD_NAV_ITEMS.map((item) => {
                    const href = resolveHref(item.href, orgId);
                    const isActive = isNavItemActive(item, pathname, orgId);

                    return (
                      <NavItem
                        key={item.id}
                        item={item}
                        isActive={isActive}
                        iconMode={sidebarIconMode}
                        href={href}
                      />
                    );
                  })}

                  {/* Divider */}
                  <div className="my-2 h-px bg-gray-200" />

                  {/* Settings Link */}
                  <NavItem
                    item={SETTINGS_NAV_ITEM}
                    isActive={false}
                    iconMode={sidebarIconMode}
                    href={
                      orgId
                        ? resolveHref(SETTINGS_NAV_ITEM.href, orgId)
                        : '/settings/profile'
                    }
                  />
                </div>
              )}
            </nav>

            {/* Clickable space to toggle icon-only mode */}
            <div
              className="flex-1 cursor-pointer"
              onClick={toggleSidebarIconMode}
              title={sidebarIconMode ? 'Expand sidebar' : 'Collapse to icons'}
            />
          </motion.aside>
        </TooltipProvider>
      )}
    </AnimatePresence>
  );
}
