import type { Citation } from '@/lib/api/queries-client';

/**
 * Type-safe definition for message metadata stored in the database.
 *
 * The backend stores messageMetadata as JSON (Scalars['JSON']), but we know
 * the structure at the application level. This type provides type safety
 * when creating and reading message metadata.
 *
 * @example
 * const metadata: MessageMetadata = {
 *   citations: [...],
 *   confidence_score: 0.95,
 * };
 */
export interface MessageMetadata {
  /** Citations/sources for the message content */
  citations?: Citation[];

  /** AI confidence score (0-1) for the response */
  confidence_score?: number;

  /** Allow other metadata fields for extensibility */
  [key: string]: unknown;
}
