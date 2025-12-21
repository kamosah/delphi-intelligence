import { toast } from 'sonner';
import { useAuthStore } from '@/lib/stores/auth-store';
import { createClient } from '@/lib/supabase/client';

export type AuthErrorType =
  | 'session_timeout' // User session exceeded max duration (2 hours)
  | 'token_revoked' // Token was revoked (admin action or logout on another device)
  | 'token_expired' // Token naturally expired
  | 'invalid_credentials' // Invalid or missing authentication
  | 'access_denied' // Insufficient permissions
  | 'sse_expired'; // SSE-specific token expired

/**
 * Handle authentication errors by logging out the user and redirecting to login.
 *
 * @param error - The error to check for authentication issues
 * @param options - Optional configuration
 * @param options.silent - If true, don't show toast notification
 * @param options.errorType - Explicit error type for custom messaging
 */
export async function handleAuthError(
  error: unknown,
  options?: { silent?: boolean; errorType?: AuthErrorType }
): Promise<void> {
  // Check if error is 401/403
  if (!isAuthError(error)) return;

  console.error('Authentication error detected, logging out...', error);

  // Clear Zustand auth state
  useAuthStore.getState().logout();

  // Sign out from Supabase (clears HTTP-only cookies)
  const supabase = createClient();
  await supabase.auth.signOut();

  // Determine error type and show appropriate message
  if (!options?.silent) {
    const errorType = options?.errorType || getAuthErrorType(error);
    const { title, description } = getErrorMessage(errorType);

    toast.error(title, {
      description,
      duration: 7000, // Longer duration for important message
    });
  }

  // ALWAYS redirect to login with current path preserved for post-login redirect
  const currentPath = window.location.pathname + window.location.search;
  const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;

  // Small delay to ensure toast is visible
  setTimeout(() => {
    window.location.href = redirectUrl;
  }, 500);
}

/**
 * Get user-friendly error message based on error type
 */
function getErrorMessage(errorType: AuthErrorType): {
  title: string;
  description: string;
} {
  switch (errorType) {
    case 'session_timeout':
      return {
        title: 'Session Expired',
        description: 'Please log in again to continue.',
      };
    case 'token_revoked':
    case 'token_expired':
    case 'invalid_credentials':
    case 'sse_expired':
      return {
        title: 'Session Expired',
        description: 'Please log in again to continue.',
      };
    case 'access_denied':
      return {
        title: 'Access Denied',
        description: 'Please contact your administrator for access.',
      };
    default:
      return {
        title: 'Session Expired',
        description: 'Please log in again to continue.',
      };
  }
}

/**
 * Determine the type of authentication error from the error message
 */
function getAuthErrorType(error: unknown): AuthErrorType {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Session timeout (explicit from our frontend check)
    if (
      message.includes('session expired after 2 hours') ||
      message.includes('2 hours of total time')
    ) {
      return 'session_timeout';
    }

    // Token revoked
    if (message.includes('token has been revoked')) {
      return 'token_revoked';
    }

    // SSE-specific errors
    if (
      message.includes('sse token') ||
      message.includes('sse connection failed')
    ) {
      return 'sse_expired';
    }

    // Invalid credentials
    if (message.includes('invalid authentication credentials')) {
      return 'invalid_credentials';
    }

    // Access denied / permission issues
    if (
      message.includes('access denied') ||
      message.includes('you do not have access')
    ) {
      return 'access_denied';
    }

    // Token validation failed / expired
    if (
      message.includes('token validation failed') ||
      message.includes('expired')
    ) {
      return 'token_expired';
    }
  }

  // Default to generic token expiration
  return 'token_expired';
}

/**
 * Check if an error is an authentication error from the backend.
 *
 * Matches ONLY specific error messages returned by the API when authentication fails.
 * Does NOT match client-side errors like "Authentication required" (waiting for token).
 *
 * Backend error messages (from app/middleware/auth.py and app/routes/*.py):
 * - "Token has been revoked"
 * - "Invalid authentication credentials"
 * - "User not found" (401 context)
 * - "Invalid or expired SSE token"
 * - "SSE token has been revoked or expired"
 * - "Token validation failed"
 * - "You do not have access to this space"
 */
function isAuthError(error: unknown): boolean {
  // Check if error has HTTP status code (from fetch responses)
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: number }).status;
    if (status === 401 || status === 403) {
      return true;
    }
  }

  // Check error message for specific backend auth failure messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // HTTP status codes in error message
    if (message.includes('http 401') || message.includes('http 403')) {
      return true;
    }

    // Exact backend error messages (case-insensitive)
    const authErrorPatterns = [
      'token has been revoked',
      'invalid authentication credentials',
      'invalid or expired sse token',
      'sse token has been revoked or expired',
      'token validation failed',
      'you do not have access to this space',
    ];

    return authErrorPatterns.some((pattern) => message.includes(pattern));
  }

  return false;
}
