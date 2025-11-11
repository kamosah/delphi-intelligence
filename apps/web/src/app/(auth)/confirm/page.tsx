'use client';

import {
  AnimatedPageLoader,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@olympus/ui';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

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
    <div className="h-full overflow-y-auto flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/20 to-background">
      <Card className="w-full max-w-md">
        {status === 'loading' && (
          <>
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <CardTitle className="text-2xl">Verifying your email</CardTitle>
              <CardDescription className="text-base">
                Please wait while we confirm your email address...
              </CardDescription>
            </CardHeader>
          </>
        )}

        {status === 'success' && (
          <>
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Email verified!</CardTitle>
              <CardDescription className="text-base">
                Your account is now active.
              </CardDescription>
            </CardHeader>

            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Redirecting to dashboard in {redirectSeconds} seconds...
              </p>
            </CardContent>

            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/dashboard">Continue to Dashboard</Link>
              </Button>
            </CardFooter>
          </>
        )}

        {status === 'error' && (
          <>
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl">Verification failed</CardTitle>
              <CardDescription className="text-base">
                {errorMessage}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>This verification link may have:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Expired (links are valid for 24 hours)</li>
                  <li>Already been used</li>
                  <li>Been copied incorrectly</li>
                </ul>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3">
              <Button asChild variant="default" className="w-full">
                <Link href="/verify-email">Request new verification email</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Back to login</Link>
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
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
