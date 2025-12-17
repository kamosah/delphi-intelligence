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
 * Check if an error is an authentication error (401, 403, unauthorized, etc.)
 */
function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('401') ||
      message.includes('403') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('authentication') ||
      (message.includes('token') && message.includes('expired'))
    );
  }
  return false;
}
