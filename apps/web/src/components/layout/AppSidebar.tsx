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
import {
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  MessageSquare,
  Settings,
} from 'lucide-react';

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
  const { sidebarOpen, sidebarVisible, toggleSidebar } = useUIStore();

  return (
    <AnimatePresence mode="wait">
      {sidebarVisible && (
        <TooltipProvider>
          <motion.aside
            className={cn(
              'h-[calc(100vh-3.5rem)] bg-card border-r flex-shrink-0',
              'flex flex-col'
            )}
            initial={false}
            animate={{
              width: sidebarOpen ? 256 : 80,
            }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {/* Navigation Items */}
            <nav className="flex-1 space-y-2 p-4">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;

                return (
                  <Tooltip key={item.label} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size={sidebarOpen ? 'default' : 'icon'}
                        className={cn(
                          'w-full',
                          sidebarOpen && 'justify-start gap-3'
                        )}
                        asChild
                      >
                        <a href={item.href}>
                          <Icon className="h-5 w-5 shrink-0" />
                          <motion.span
                            initial={false}
                            animate={{
                              width: sidebarOpen ? 'auto' : 0,
                              opacity: sidebarOpen ? 1 : 0,
                            }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        </a>
                      </Button>
                    </TooltipTrigger>
                    {!sidebarOpen && (
                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </nav>

            {/* Footer - Toggle to collapse to icons (<<  / >>) */}
            <div className="p-2 border-t flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8"
                title={sidebarOpen ? 'Collapse to icons' : 'Expand sidebar'}
              >
                {sidebarOpen ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </motion.aside>
        </TooltipProvider>
      )}
    </AnimatePresence>
  );
}
