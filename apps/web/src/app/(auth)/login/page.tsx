import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';

// Mark as dynamic to support useSearchParams in LoginForm
export const dynamic = 'force-dynamic';

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
