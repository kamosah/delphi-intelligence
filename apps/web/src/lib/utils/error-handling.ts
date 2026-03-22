/**
 * Error handling utilities for extracting user-friendly messages from API errors.
 */

/**
 * Extract a user-friendly error message from various error types.
 *
 * Handles:
 * - GraphQL errors (ClientError with response.errors array)
 * - Standard Error objects
 * - String errors
 * - Unknown error types
 *
 * @param error - The error to extract a message from
 * @param fallbackMessage - Default message if extraction fails
 * @returns User-friendly error message
 */
export function getErrorMessage(
  error: unknown,
  fallbackMessage = 'An unexpected error occurred'
): string {
  // Handle null/undefined
  if (!error) {
    return fallbackMessage;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle Error objects
  if (error instanceof Error) {
    // Check if it's a GraphQL ClientError with response.errors
    if ('response' in error && error.response) {
      const response = error.response as {
        errors?: Array<{ message: string }>;
      };

      if (response.errors && Array.isArray(response.errors)) {
        // Extract first error message from GraphQL errors array
        const firstError = response.errors[0];
        if (firstError && firstError.message) {
          // Clean up the message (remove technical details)
          return cleanErrorMessage(firstError.message);
        }
      }
    }

    // Fall back to error.message
    if (error.message) {
      return cleanErrorMessage(error.message);
    }
  }

  // Handle objects with message property
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return cleanErrorMessage((error as { message: string }).message);
  }

  return fallbackMessage;
}

/**
 * Clean up error message by removing technical details.
 *
 * - Removes JSON blobs
 * - Removes stack traces
 * - Trims whitespace
 *
 * @param message - Raw error message
 * @returns Cleaned message
 */
function cleanErrorMessage(message: string): string {
  // Remove everything after first occurrence of JSON-like structure
  const jsonMatch = message.match(/^(.*?)(?:\s*[:{[])/);
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim();
  }

  // Remove everything after newline (stack traces, etc.)
  const firstLine = message.split('\n')[0];

  return firstLine.trim();
}

/**
 * Get user-friendly error message with custom context.
 *
 * @param error - The error to extract a message from
 * @param context - Context object with action and fallback message
 * @returns User-friendly error message
 *
 * @example
 * ```ts
 * getErrorMessageWithContext(error, {
 *   action: 'send invitation',
 *   fallback: 'Failed to send invitation. Please try again.'
 * });
 * // Returns: "Failed to send invitation: <actual error>"
 * ```
 */
export function getErrorMessageWithContext(
  error: unknown,
  context: {
    action: string;
    fallback: string;
  }
): string {
  const errorMessage = getErrorMessage(error, '');

  // If we got a specific error message, use it
  if (errorMessage && errorMessage !== context.fallback) {
    return errorMessage;
  }

  // Otherwise, use the fallback
  return context.fallback;
}
