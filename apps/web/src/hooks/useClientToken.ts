'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/query-keys';
import { createClient } from '@/lib/supabase/client';
import { handleAuthError } from '@/lib/utils/auth-error-handler';

interface ClientTokenResponse {
  client_token: string;
  expires_in: number;
}

/**
 * Hook to fetch short-lived client tokens for REST API calls.
 *
 * This hook implements the client-side authentication pattern for HTTP-only cookie auth:
 * 1. User authenticated via Supabase (HTTP-only cookies set)
 * 2. Reads Supabase session from HTTP-only cookies
 * 3. Calls `/auth/client-token` with Supabase token in Authorization header
 * 4. Backend verifies Supabase token, returns short-lived Olympus JWT (5-min TTL)
 * 5. React Query caches token and auto-refetches before expiry (4-min staleTime)
 *
 * Security:
 * - Tokens are short-lived (5 minutes)
 * - Automatic refresh before expiry
 * - No manual token storage (React Query cache only)
 * - Uses HTTP-only cookies for Supabase auth
 * - Can be revoked on logout/password change
 *
 * Usage:
 * ```tsx
 * const { clientToken, isLoading } = useClientToken();
 *
 * // Use in API calls
 * if (clientToken) {
 *   await documentsApi.upload(request, clientToken);
 * }
 * ```
 */
export function useClientToken() {
  const query = useQuery({
    queryKey: queryKeys.auth.clientToken(),
    queryFn: async (): Promise<string> => {
      try {
        // Get Supabase session from HTTP-only cookies
        const supabase = createClient();
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          throw new Error('No active session');
        }

        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_URL}/auth/client-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch client token: ${errorText}`);
        }

        const data: ClientTokenResponse = await response.json();

        return data.client_token;
      } catch (error) {
        // Trigger auto-logout on token fetch failure
        await handleAuthError(error);
        throw error;
      }
    },
    // Refetch before token expires (5 min = 300s, refetch at 4 min = 240s)
    staleTime: 240 * 1000, // 4 minutes
    gcTime: 300 * 1000, // 5 minutes
    // Don't retry on auth failures
    retry: false,
  });

  return {
    clientToken: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
