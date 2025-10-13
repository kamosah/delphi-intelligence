'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Client-side auth callback page for Supabase.
 * Handles hash-based parameters that server-side routes cannot access.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
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

    // Handle different auth types
    if (type === 'signup' || type === 'email') {
      // Email verification successful
      router.push('/confirm?type=signup&verified=true');
      return;
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
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
}
