'use client';

import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Alert, AlertDescription, Button } from '@olympus/ui';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Email verification banner component.
 * Shows a dismissible warning banner when user's email is not verified.
 * Includes a button to resend verification email with cooldown.
 * Automatically hidden if user dismisses or email is verified.
 *
 * @example
 * ```tsx
 * // In dashboard layout or main content area
 * <EmailVerificationBanner />
 * ```
 */
export function EmailVerificationBanner() {
  const { user } = useAuthStore();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Don't show if user is verified, not logged in, or dismissed
  if (!user || user.email_confirmed || isDismissed) {
    return null;
  }

  const handleResend = async () => {
    if (cooldownSeconds > 0 || !user?.email) return;

    setIsResending(true);
    setResendSuccess(false);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: user.email }),
        }
      );

      if (response.ok) {
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
      }
    } catch (error) {
      // Fail silently - user can try again
      console.error('Failed to resend verification email:', error);
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <Alert
      variant="default"
      className="mb-6 border-yellow-200 bg-yellow-50 text-yellow-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <p className="font-medium">Verify your email address</p>
                  <p className="text-sm mt-1">
                    We sent a verification email to{' '}
                    <strong>{user.email}</strong>. Please check your inbox and
                    click the verification link to activate your account.
                  </p>
                </div>

                {resendSuccess && (
                  <p className="text-sm text-green-700">
                    ✓ Verification email sent! Please check your inbox.
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResend}
                    disabled={isResending || cooldownSeconds > 0}
                    className="bg-white hover:bg-yellow-100 border-yellow-300"
                  >
                    {isResending
                      ? 'Sending...'
                      : cooldownSeconds > 0
                        ? `Resend in ${cooldownSeconds}s`
                        : 'Resend verification email'}
                  </Button>
                  <span className="text-xs text-yellow-700">
                    Didn&apos;t receive it? Check your spam folder.
                  </span>
                </div>
              </div>
            </AlertDescription>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-yellow-600 hover:text-yellow-800 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </Alert>
  );
}
