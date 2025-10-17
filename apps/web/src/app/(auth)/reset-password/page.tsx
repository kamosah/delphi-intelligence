import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Set New Password',
  description: 'Set a new password for your Olympus account.',
};

/**
 * Reset password page content - Extracts token from URL and renders form.
 * This needs to be a separate component to use useSearchParams.
 */
async function ResetPasswordContent({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token || null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/20 to-background">
      <ResetPasswordForm token={token} />
    </div>
  );
}

/**
 * Reset password page - Set new password with token validation.
 * Server Component that renders the ResetPasswordForm client component.
 */
export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <ResetPasswordContent searchParams={searchParams} />
    </Suspense>
  );
}
