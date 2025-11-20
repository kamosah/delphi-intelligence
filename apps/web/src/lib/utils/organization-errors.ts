/**
 * Utility functions for detecting and handling organization-related errors
 */

/**
 * Extracts error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }

  return '';
}

/**
 * Checks if an error is related to missing organization context
 *
 * Detects errors like:
 * - "Either space_id or organization_id is required for new threads when save_to_db=true"
 * - Other organization-related validation errors from the backend
 *
 * @param error - The error object to check
 * @returns true if the error is organization-related, false otherwise
 */
export function isOrganizationError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage = getErrorMessage(error).toLowerCase();

  return (
    errorMessage.includes('organization') &&
    (errorMessage.includes('required') || errorMessage.includes('missing'))
  );
}

/**
 * Extracts a user-friendly error message for organization errors
 *
 * @param error - The organization error
 * @returns A user-friendly error message
 */
export function getOrganizationErrorMessage(error: unknown): string {
  // Default user-friendly message
  const defaultMessage =
    'Please select an organization from the dropdown in the top-right corner to continue.';

  if (!error) return defaultMessage;

  const errorMessage = getErrorMessage(error);

  // If we have a specific error message, use it
  if (errorMessage && errorMessage.length > 0) {
    return `${errorMessage}\n\n${defaultMessage}`;
  }

  return defaultMessage;
}
