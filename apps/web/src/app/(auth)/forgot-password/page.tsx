import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Request a password reset link for your Olympus account.',
};

/**
 * Forgot password page - Wrapped by (auth)/layout.tsx
 * ForgotPasswordForm handles its own Card wrapper and title/subtitle
 * due to dual states (form vs success confirmation).
 */
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
