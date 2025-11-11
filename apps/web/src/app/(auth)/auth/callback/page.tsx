'use client';

import { authApi } from '@/lib/api/auth-client';
import { setAuthCookies } from '@/lib/auth-cookies';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Client-side auth callback page for Supabase.
 * Handles hash-based parameters that server-side routes cannot access.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      // Parse hash parameters (Supabase sends params in hash, not query string)
      const hash = window.location.hash.substring(1); // Remove the '#'
      const params = new URLSearchParams(hash);

      const type = params.get('type');
      const error = params.get('error');
      const errorDescription = params.get('error_description');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      // Handle errors
      if (error) {
        console.error('Auth callback error:', error, errorDescription);
        router.push(
          `/confirm?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`
        );
        return;
      }

      // Handle email verification with auto-login
      if (type === 'signup' || type === 'email') {
        if (accessToken) {
          try {
            // Exchange Supabase token for our backend tokens
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/auth/exchange-token`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ supabase_token: accessToken }),
              }
            );

            if (!response.ok) {
              throw new Error('Token exchange failed');
            }

            const tokenResponse = await response.json();

            // Auto-login: Set our backend tokens
            setTokens(tokenResponse.access_token, tokenResponse.refresh_token);
            setAuthCookies(
              tokenResponse.access_token,
              tokenResponse.refresh_token
            );
            // Token auto-injected via GraphQL client middleware

            // Get user profile with our backend token
            const userProfile = await authApi.me(tokenResponse.access_token);
            setUser(userProfile);

            // Redirect to dashboard with success message
            router.push('/dashboard?verified=true');
            return;
          } catch (error) {
            console.error('Failed to auto-login after verification:', error);
            // Fall back to showing success page without auto-login
            router.push('/confirm?type=signup&verified=true');
            return;
          }
        } else {
          // No tokens available, just show success
          router.push('/confirm?type=signup&verified=true');
          return;
        }
      }

      if (type === 'recovery') {
        // Password reset - redirect to reset password page with token
        if (accessToken) {
          router.push(`/reset-password?token=${accessToken}`);
          return;
        } else {
          console.error('Password reset callback missing access token');
        }
      }

      // Default: redirect to login
      router.push('/login');
    };

    handleCallback().finally(() => setIsProcessing(false));
  }, [router, setTokens, setUser]);

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
}
