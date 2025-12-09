import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/auth-store';

// Create a client for Storybook
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

interface AuthDecoratorProps {
  children: ReactNode;
  authenticated?: boolean;
}

/**
 * Decorator component that sets up authentication state for Storybook stories.
 */
function AuthDecorator({ children, authenticated = true }: AuthDecoratorProps) {
  useEffect(() => {
    if (authenticated) {
      // Set mock user (tokens are HTTP-only cookies, not managed here)
      useAuthStore.getState().setUser({
        id: 'user-123',
        email: 'demo@olympus.com',
        full_name: 'Demo User',
        role: 'user',
        is_active: true,
        email_confirmed: true,
      });
    } else {
      // Clear authentication
      useAuthStore.getState().logout();
    }

    // Cleanup on unmount
    return () => {
      useAuthStore.getState().logout();
    };
  }, [authenticated]);

  return <>{children}</>;
}

/**
 * Storybook decorator that provides React Query context.
 */
export const withQueryClient = (Story: () => ReactNode) => (
  <QueryClientProvider client={queryClient}>
    <Story />
  </QueryClientProvider>
);

/**
 * Storybook decorator that provides authenticated context.
 */
export const withAuth = (Story: () => ReactNode) => (
  <QueryClientProvider client={queryClient}>
    <AuthDecorator authenticated={true}>
      <Story />
    </AuthDecorator>
  </QueryClientProvider>
);

/**
 * Storybook decorator that provides unauthenticated context.
 */
export const withoutAuth = (Story: () => ReactNode) => (
  <QueryClientProvider client={queryClient}>
    <AuthDecorator authenticated={false}>
      <Story />
    </AuthDecorator>
  </QueryClientProvider>
);
