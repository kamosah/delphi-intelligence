'use client';

import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';
import {
  Button,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@olympus/ui';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Home,
  Search,
  Settings,
} from 'lucide-react';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: Search, label: 'Query', href: '/query' },
  { icon: FileText, label: 'Documents', href: '/documents' },
  { icon: Database, label: 'Spaces', href: '/spaces' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <TooltipProvider>
      <motion.aside
        className={cn(
          'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-card border-r z-40',
          'flex flex-col'
        )}
        initial={false}
        animate={{ width: sidebarOpen ? 256 : 80 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {/* Toggle Button */}
        <div className="flex items-center justify-end p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Separator />

        {/* Navigation Items */}
        <nav className="flex-1 space-y-2 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;

            if (!sidebarOpen) {
              return (
                <Tooltip key={item.label} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-full"
                      asChild
                    >
                      <a href={item.href}>
                        <Icon className="h-5 w-5" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Button
                key={item.label}
                variant="ghost"
                className="w-full justify-start gap-3"
                asChild
              >
                <a href={item.href}>
                  <Icon className="h-5 w-5" />
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    {item.label}
                  </motion.span>
                </a>
              </Button>
            );
          })}
        </nav>

        {/* Footer - Version or User Info */}
        <div className="p-4 border-t">
          {sidebarOpen ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xs text-muted-foreground"
            >
              <p>Olympus MVP</p>
              <p className="font-mono">v0.1.0</p>
            </motion.div>
          ) : (
            <div className="text-xs text-muted-foreground text-center font-mono">
              v0.1
            </div>
          )}
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
