import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { SignupForm } from '@/components/auth/SignupForm';

export const metadata: Metadata = {
  title: 'Sign up',
  description:
    'Create your Olympus account to get started with AI-powered document intelligence.',
};

/**
 * Signup page composed using AuthLayout and SignupForm components.
 * Follows component composition best practices.
 */
export default function SignupPage() {
  return (
    <AuthLayout
      title="Create account"
      subtitle="Get started with your Olympus account"
    >
      <SignupForm />
    </AuthLayout>
  );
}
