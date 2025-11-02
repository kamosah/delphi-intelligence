/**
 * Shared constants for streaming query functionality
 */

/**
 * Maximum number of retry attempts for failed queries
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Initial retry delay in milliseconds
 */
export const RETRY_DELAY_MS = 1000;

/**
 * Maximum retry delay in milliseconds (cap for exponential backoff)
 */
export const MAX_RETRY_DELAY_MS = 10000;

/**
 * Error codes that should not trigger automatic retries
 */
export const NON_RETRYABLE_ERRORS = [
  'VALIDATION_ERROR',
  'PERMISSION_DENIED',
  'UNKNOWN',
];
