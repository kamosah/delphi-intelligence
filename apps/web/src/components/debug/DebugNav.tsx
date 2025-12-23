'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Lock, Search, BarChart3 } from 'lucide-react';
import { Button } from '@olympus/ui';

const debugPages = [
  { href: '/debug/auth', label: 'Auth', icon: Lock },
  { href: '/debug/vector-search', label: 'Vector Search', icon: Search },
  { href: '/debug/performance', label: 'Performance', icon: Activity },
  { href: '/debug/analytics', label: 'Analytics', icon: BarChart3 },
];

export function DebugNav() {
  const pathname = usePathname();

  return (
    <nav
      className="border-b border-gray-200 bg-white"
      aria-label="Debug navigation"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center space-x-1 py-2">
          <div className="flex items-center space-x-2 mr-4">
            <Activity className="h-5 w-5 text-gray-400" />
            <span className="font-semibold text-gray-700">Debug Tools</span>
          </div>
          {debugPages.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link key={href} href={href}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
