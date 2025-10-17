import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';

// Mark as dynamic to support useSearchParams in LoginForm
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in',
  description:
    'Sign in to your Olympus account to access your AI-powered document intelligence platform.',
};

/**
 * Login page composed using AuthLayout and LoginForm components.
 * Follows component composition best practices.
 */
export default function LoginPage() {
  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back! Please sign in to your account"
    >
      <LoginForm />
    </AuthLayout>
  );
}
