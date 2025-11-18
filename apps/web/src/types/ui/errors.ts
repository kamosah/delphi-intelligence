/**
 * Error types for UI error handling
 */

/**
 * HTTP error with status code
 * Used for errors from fetch, GraphQL, and other HTTP sources
 */
export interface HttpError {
  status: number;
  message?: string;
}

/**
 * Generic error with message
 */
export interface ErrorWithMessage {
  message: string;
}
