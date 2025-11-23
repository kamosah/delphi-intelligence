'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, SquarePen } from 'lucide-react';
import { Button, Kbd } from '@olympus/ui';
import { OrganizationSwitcher } from '@/components/layout/OrganizationSwitcher';
import { cn } from '@/lib/utils';

interface SidebarHeaderProps {
  isThreadsRoute: boolean;
  isSettingsRoute: boolean;
  iconMode: boolean;
}

export function SidebarHeader({
  isThreadsRoute,
  isSettingsRoute,
  iconMode,
}: SidebarHeaderProps) {
  const router = useRouter();

  const handleNewThread = () => {
    router.push('/threads');
  };

  // Threads: New Thread Button
  if (isThreadsRoute) {
    return (
      <Button
        variant="ghost"
        onClick={handleNewThread}
        className={cn(
          'w-full group',
          iconMode ? 'justify-center' : 'justify-between'
        )}
        size={iconMode ? 'icon' : 'default'}
      >
        <div className="flex items-center">
          <SquarePen className="h-4 w-4 shrink-0" />
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{
              width: iconMode ? 0 : 'auto',
              opacity: iconMode ? 0 : 1,
            }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="ml-2 overflow-hidden whitespace-nowrap"
          >
            New Thread
          </motion.span>
        </div>
        {!iconMode && (
          <Kbd className="hidden group-hover:inline-flex text-[10px] ml-2">
            ⌘J
          </Kbd>
        )}
      </Button>
    );
  }

  // Settings: Back Button
  if (isSettingsRoute) {
    return (
      <motion.div
        initial={{ opacity: 0, width: 0 }}
        animate={{
          width: iconMode ? 0 : 'auto',
          opacity: iconMode ? 0 : 1,
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        {!iconMode && (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Settings
          </Link>
        )}
      </motion.div>
    );
  }

  // Dashboard: Organization Switcher
  return (
    <motion.div
      initial={{ opacity: 0, width: 0 }}
      animate={{
        width: iconMode ? 0 : 'auto',
        opacity: iconMode ? 0 : 1,
      }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      {!iconMode && <OrganizationSwitcher />}
    </motion.div>
  );
}
