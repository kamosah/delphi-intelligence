'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { AnimatedPageLoader, Button } from '@olympus/ui';

type VerificationStatus = 'loading' | 'success' | 'error';

/**
 * Email confirmation content component.
 * Wrapped in Suspense to support useSearchParams.
 */
function ConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [redirectSeconds, setRedirectSeconds] = useState(3);

  useEffect(() => {
    // Check for Supabase auth tokens in URL
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error || errorDescription) {
      // Handle verification error
      setStatus('error');
      setErrorMessage(
        errorDescription || 'Verification link is invalid or has expired.'
      );
    } else if (token && type === 'signup') {
      // Verification successful
      setStatus('success');

      // Start countdown and redirect to dashboard
      const countdownInterval = setInterval(() => {
        setRedirectSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            router.push('/dashboard');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    } else {
      // No clear success or error - possible invalid link
      setStatus('error');
      setErrorMessage('Invalid verification link.');
    }
  }, [searchParams, router]);

  return (
    <div className="space-y-6">
      {status === 'loading' && (
        <>
          {/* Icon and Title */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Verifying your email
              </h2>
              <p className="mt-2 text-base text-muted-foreground">
                Please wait while we confirm your email address...
              </p>
            </div>
          </div>
        </>
      )}

      {status === 'success' && (
        <>
          {/* Icon and Title */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Email verified!
              </h2>
              <p className="mt-2 text-base text-muted-foreground">
                Your account is now active.
              </p>
            </div>
          </div>

          {/* Redirect Message */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard in {redirectSeconds} seconds...
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Button asChild className="w-full">
              <Link href="/dashboard">Continue to Dashboard</Link>
            </Button>
          </div>
        </>
      )}

      {status === 'error' && (
        <>
          {/* Icon and Title */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Verification failed
              </h2>
              <p className="mt-2 text-base text-muted-foreground">
                {errorMessage}
              </p>
            </div>
          </div>

          {/* Error Details */}
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>This verification link may have:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Expired (links are valid for 24 hours)</li>
                <li>Already been used</li>
                <li>Been copied incorrectly</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-3 pt-2">
            <Button asChild variant="default" className="w-full">
              <Link href="/verify-email">Request new verification email</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Back to login</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Email confirmation callback page.
 * Handles Supabase email verification redirects and displays success/error states.
 */
export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <AnimatedPageLoader
          title="Verifying your email"
          description="Please wait while we confirm your email address..."
        />
      }
    >
      <ConfirmContent />
    </Suspense>
  );
}
