'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

/**
 * Client component that redirects authenticated users to the dashboard.
 * Used on public pages like landing page to redirect logged-in users.
 */
export function AuthenticatedRedirect() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Only redirect if authentication is confirmed and not loading
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // This component doesn't render anything
  return null;
}
