import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Request a password reset link for your Olympus account.',
};

/**
 * Forgot password page - Request password reset email.
 * Server Component that renders the ForgotPasswordForm client component.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/20 to-background">
      <ForgotPasswordForm />
    </div>
  );
}
