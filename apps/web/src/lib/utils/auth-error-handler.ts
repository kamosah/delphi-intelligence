import { toast } from 'sonner';
import { useAuthStore } from '@/lib/stores/auth-store';
import { createClient } from '@/lib/supabase/client';

/**
 * Handle authentication errors by logging out the user and redirecting to login.
 *
 * @param error - The error to check for authentication issues
 * @param options - Optional configuration
 * @param options.silent - If true, don't show toast notification
 */
export async function handleAuthError(
  error: unknown,
  options?: { silent?: boolean }
): Promise<void> {
  // Check if error is 401/403
  if (!isAuthError(error)) return;

  console.error('Authentication error detected, logging out...', error);

  // Clear Zustand auth state
  useAuthStore.getState().logout();

  // Sign out from Supabase (clears HTTP-only cookies)
  const supabase = createClient();
  await supabase.auth.signOut();

  // Show user-friendly message (unless silent logout requested)
  if (!options?.silent) {
    toast.error('Session Expired', {
      description:
        'Your session has expired after 2 hours of inactivity. Please log in again.',
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
