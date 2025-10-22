import type { Metadata } from 'next';
import { SignupForm } from '@/components/auth/SignupForm';

export const metadata: Metadata = {
  title: 'Sign up',
  description:
    'Create your Olympus account to get started with AI-powered document intelligence.',
};

/**
 * Signup page - Title and form content wrapped by (auth)/layout.tsx
 */
export default function SignupPage() {
  return (
    <div className="space-y-6">
      {/* Page-specific title and subtitle */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground">Create account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Get started with your Olympus account
        </p>
      </div>

      {/* Form content */}
      <SignupForm />
    </div>
  );
}
