'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { AuthenticatedRedirect } from './AuthenticatedRedirect';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  showBackButton?: boolean;
}

/**
 * Layout wrapper for authentication pages.
 * Provides consistent structure with centered card and branding.
 * Hex-inspired clean auth layout with subtle gradients.
 * Redirects authenticated users to dashboard.
 */
export function AuthLayout({
  children,
  title,
  subtitle,
  showBackButton = true,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <AuthenticatedRedirect />
      {showBackButton && (
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
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <h1 className="text-3xl font-bold text-foreground">Olympus</h1>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-bold text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {subtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-xl shadow-muted/20 sm:rounded-xl sm:px-10 border border-border">
          {children}
        </div>
      </div>
    </div>
  );
}
