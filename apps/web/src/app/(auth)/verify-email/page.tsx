'use client';

import {
  Alert,
  AlertDescription,
  AnimatedPageLoader,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@olympus/ui';
import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

/**
 * Email verification page content component.
 * Wrapped in Suspense to support useSearchParams.
 */
function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const handleResend = async () => {
    if (cooldownSeconds > 0 || !email) return;

    setIsResending(true);
    setResendError('');
    setResendSuccess(false);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to resend verification email');
      }

      setResendSuccess(true);
      // Start 60-second cooldown
      setCooldownSeconds(60);
      const interval = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      setResendError('Failed to resend email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/20 to-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription className="text-base">
            We sent a verification link to:
            {email && (
              <span className="block mt-2 font-medium text-foreground">
                {email}
              </span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Click the link in the email to verify your account.</p>
            <p>The link will expire in 24 hours.</p>
          </div>

          {resendSuccess && (
            <Alert>
              <AlertDescription>
                Verification email sent successfully. Please check your inbox.
              </AlertDescription>
            </Alert>
          )}

          {resendError && (
            <Alert variant="destructive">
              <AlertDescription>{resendError}</AlertDescription>
            </Alert>
          )}

          <div className="pt-4 space-y-3 border-t">
            <p className="text-sm text-muted-foreground">
              Didn&apos;t receive the email?
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Check your spam or junk folder</li>
              <li>Make sure the email address is correct</li>
              <li>Wait a few minutes and try again</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3">
          <Button
            onClick={handleResend}
            disabled={isResending || cooldownSeconds > 0 || !email}
            variant="outline"
            className="w-full"
          >
            {isResending
              ? 'Sending...'
              : cooldownSeconds > 0
                ? `Resend available in ${cooldownSeconds}s`
                : 'Resend verification email'}
          </Button>

          <Button asChild variant="ghost" className="w-full">
            <Link href="/login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to login
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/**
 * Email verification page shown after signup.
 * Displays instructions to check email and provides resend functionality.
 */
export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AnimatedPageLoader
          title="Loading verification page..."
          description="Please wait while we load your email verification details"
          icon={<Mail className="w-8 h-8 text-primary animate-pulse" />}
        />
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
