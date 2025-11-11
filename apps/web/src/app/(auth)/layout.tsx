import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthenticatedRedirect } from '@/components/auth/AuthenticatedRedirect';

export const metadata: Metadata = {
  description:
    'Sign in to Olympus - Your AI-powered document intelligence platform. Access your workspaces, documents, and AI analyst.',
};

/**
 * Auth layout - Provides shared chrome for all authentication pages.
 * Each page provides its own title, subtitle, and form as children.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-background via-muted/20 to-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <AuthenticatedRedirect />

      {/* Back button */}
      <div className="absolute top-4 left-4">
        <Link
          href="/"
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to home
        </Link>
      </div>

      {/* Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <h1 className="text-3xl font-bold text-foreground">Olympus</h1>
        </Link>
      </div>

      {/* Content card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-xl shadow-muted/20 sm:rounded-xl sm:px-10 border border-border">
          {children}
        </div>
      </div>
    </div>
  );
}
