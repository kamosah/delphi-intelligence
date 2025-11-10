'use client';

import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@olympus/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { Database, FileText, MessageSquare, Settings } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OrganizationSwitcher } from '@/components/layout/OrganizationSwitcher';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: Database, label: 'Spaces', href: '/dashboard/spaces' },
  { icon: MessageSquare, label: 'Threads', href: '/dashboard/threads' },
  { icon: FileText, label: 'Documents', href: '/dashboard/documents' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
];

export function AppSidebar() {
  const { sidebarIconMode, sidebarVisible, toggleSidebarIconMode } =
    useUIStore();
  const [mounted, setMounted] = useState(false);

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
            {/* Organization Switcher */}
            <div className="p-4 border-b border-gray-200">
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
            </div>

            {/* Navigation Items */}
            <nav className="space-y-2 p-4">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;

                return (
                  <Tooltip key={item.label} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size={sidebarIconMode ? 'icon' : 'default'}
                        className={cn(
                          'w-full',
                          !sidebarIconMode && 'justify-start gap-3'
                        )}
                        asChild
                      >
                        <Link href={item.href}>
                          <Icon className="h-5 w-5 shrink-0" />
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{
                              width: sidebarIconMode ? 0 : 'auto',
                              opacity: sidebarIconMode ? 0 : 1,
                            }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    {sidebarIconMode && (
                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
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
