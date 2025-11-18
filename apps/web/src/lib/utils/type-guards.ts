/**
 * Type guard utilities for runtime type checking
 */

import type { ErrorWithMessage, HttpError } from '@/types/ui/errors';

/**
 * Type guard to check if an error has an HTTP status code
 */
export function isHttpError(error: unknown): error is HttpError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    typeof error.status === 'number'
  );
}

/**
 * Type guard to check if an error is an HTTP client error (4xx)
 */
export function isClientError(error: unknown): boolean {
  return isHttpError(error) && error.status >= 400 && error.status < 500;
}

/**
 * Type guard to check if an error is an HTTP server error (5xx)
 */
export function isServerError(error: unknown): boolean {
  return isHttpError(error) && error.status >= 500 && error.status < 600;
}

/**
 * Type guard to check if an error has a message property
 */
export function hasErrorMessage(error: unknown): error is ErrorWithMessage {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}
