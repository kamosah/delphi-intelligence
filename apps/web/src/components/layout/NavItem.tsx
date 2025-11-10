'use client';

import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@olympus/ui';
import type { NavItem as NavItemType } from '@olympus/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface NavItemProps {
  /** Navigation item configuration */
  item: NavItemType;
  /** Whether this item is currently active */
  isActive: boolean;
  /** Whether to show icon-only mode */
  iconMode: boolean;
  /** Resolved href (already processed dynamic hrefs) */
  href: string;
}

/**
 * Reusable navigation item component with icon, label, tooltip, and animations
 * Used in both dashboard and settings navigation
 */
export function NavItem({ item, isActive, iconMode, href }: NavItemProps) {
  const Icon = item.icon;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={iconMode ? 'icon' : 'default'}
          className={cn(
            'w-full',
            !iconMode && 'justify-start gap-3',
            isActive &&
              'bg-blue-50 text-blue-700 hover:bg-blue-50 hover:text-blue-700'
          )}
          asChild
        >
          <Link href={href}>
            <Icon className="h-4 w-4 shrink-0" />
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{
                width: iconMode ? 0 : 'auto',
                opacity: iconMode ? 0 : 1,
              }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden whitespace-nowrap text-sm"
            >
              {item.label}
            </motion.span>
            {item.badge && !iconMode && (
              <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {item.badge}
              </span>
            )}
          </Link>
        </Button>
      </TooltipTrigger>
      {iconMode && (
        <TooltipContent side="right">
          <p>{item.description || item.label}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
