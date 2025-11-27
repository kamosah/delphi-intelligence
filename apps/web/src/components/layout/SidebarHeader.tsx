'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { OrganizationSwitcher } from '@/components/layout/OrganizationSwitcher';

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
  // Threads: Back Button (similar to Settings)
  if (isThreadsRoute) {
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
            Threads
          </Link>
        )}
      </motion.div>
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
