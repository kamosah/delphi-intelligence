'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Plus } from 'lucide-react';
import { Button } from '@olympus/ui';
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
        onClick={handleNewThread}
        className={cn(
          'w-full',
          iconMode
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600'
        )}
        size={iconMode ? 'icon' : 'default'}
      >
        <Plus className="h-4 w-4 shrink-0" />
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
