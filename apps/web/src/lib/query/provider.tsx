'use client';

import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query/query-keys';
import { createClient } from '@/lib/supabase/client';
import { handleAuthError } from '@/lib/utils/auth-error-handler';
import {
  getOrganizationErrorMessage,
  isOrganizationError,
} from '@/lib/utils/organization-errors';
import { isClientError } from '@/lib/utils/type-guards';

interface QueryProviderProps {
  children: React.ReactNode;
}

// Create client with same configuration but inside the provider
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time: How long data is considered fresh (5 minutes - suitable for mostly-static dashboard data)
        // For real-time data (threads, notifications), override per-query with shorter staleTime
        staleTime: 1000 * 60 * 5,

        // Cache time: How long data stays in cache after component unmounts (10 minutes)
        gcTime: 1000 * 60 * 10,

        // Retry configuration
        retry: (failureCount, error: unknown) => {
          // Check for auth errors and trigger auto-logout
          handleAuthError(error);

          // Don't retry on 4xx errors (client errors)
          if (isClientError(error)) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },

        // Retry delay with exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Refetch on window focus (useful for keeping data fresh)
        refetchOnWindowFocus: false,

        // Refetch on reconnect
        refetchOnReconnect: true,
      },
      mutations: {
        // Retry mutations once
        retry: 1,

        // Retry delay for mutations
        retryDelay: 1000,

        // Global error handler for mutations
        onError: (error: unknown) => {
          // Check for auth errors first and trigger auto-logout
          handleAuthError(error);

          // Show toast notification for organization-related errors
          if (isOrganizationError(error)) {
            toast.error('Organization Required', {
              description: getOrganizationErrorMessage(error),
              duration: 7000, // Show for 7 seconds (longer than default)
            });
          }
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function QueryProvider({ children }: QueryProviderProps) {
  // NOTE: Using a singleton pattern instead of useState to initialize the query client.
  //       This ensures the client persists across re-renders when React suspends,
  //       avoiding the client being thrown away on the initial render.
  const queryClient = getQueryClient();

  // Handle Supabase auth state changes (token refresh)
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // When Supabase refreshes its token, invalidate our cached Olympus token
      // so it gets re-exchanged with the new Supabase token
      if (event === 'TOKEN_REFRESHED') {
        queryClient.removeQueries({ queryKey: queryKeys.auth.clientToken() });
      }

      // When user signs out, clear all cached data
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Proactively refresh client token when tab becomes active after idle period
  // Centralized here to avoid multiple event listeners (one per useClientToken call)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check when client token was last fetched using React Query state
        const tokenState = queryClient.getQueryState(
          queryKeys.auth.clientToken()
        );

        if (tokenState?.dataUpdatedAt) {
          const now = Date.now();
          const timeSinceLastFetch = now - tokenState.dataUpdatedAt;

          // If token is likely stale (>4 minutes old), force refresh
          if (timeSinceLastFetch > 240 * 1000) {
            console.log(
              '[QueryProvider] Tab active after idle, refreshing client token...'
            );
            queryClient.invalidateQueries({
              queryKey: queryKeys.auth.clientToken(),
            });
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}
