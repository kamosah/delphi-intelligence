import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

// Mark as dynamic to support useSearchParams in LoginForm
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in',
  description:
    'Sign in to your Olympus account to access your AI-powered document intelligence platform.',
};

/**
 * Login page - Title and form content wrapped by (auth)/layout.tsx
 */
export default function LoginPage() {
  return (
    <div className="space-y-6">
      {/* Page-specific title and subtitle */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground">Sign in</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome back! Please sign in to your account
        </p>
      </div>

      {/* Form content */}
      <LoginForm />
    </div>
  );
}
