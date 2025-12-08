'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Auth callback content component.
 * Separated from page component to allow Suspense boundary wrapping.
 *
 * Note: useSearchParams() requires a Suspense boundary in Next.js App Router
 * to prevent build errors during static generation. This ensures the component
 * only renders on the client after search params are available.
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();

      // Check for error in query params
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        console.error('Auth callback error:', error, errorDescription);
        router.push(
          `/confirm?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`
        );
        return;
      }

      // Exchange the code for a session (Supabase SSR handles this automatically)
      const { error: sessionError } =
        await supabase.auth.exchangeCodeForSession(window.location.href);

      if (sessionError) {
        console.error('Session exchange error:', sessionError);
        router.push('/login?error=auth_failed');
        return;
      }

      // Get the session to check auth type
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // Check if this was an email verification
        const type = searchParams.get('type');

        if (type === 'signup' || type === 'email') {
          // Email verified - redirect to dashboard with success message
          router.push('/dashboard?verified=true');
          return;
        }

        if (type === 'recovery') {
          // Password reset - redirect to reset password page
          router.push('/reset-password');
          return;
        }

        // Default: redirect to dashboard
        router.push('/dashboard');
      } else {
        // No session - redirect to login
        router.push('/login');
      }
    };

    handleCallback().finally(() => setIsProcessing(false));
  }, [router, searchParams]);

  if (!isProcessing) {
    return null; // Redirect will happen, no need to show anything
  }

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4" />
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
}

/**
 * Auth callback page with Suspense boundary.
 *
 * Wraps AuthCallbackContent in Suspense to satisfy Next.js requirement
 * for useSearchParams() in App Router. This prevents build-time errors
 * during static generation.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full overflow-y-auto flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
