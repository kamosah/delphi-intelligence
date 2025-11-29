/**
 * Server-side data fetchers for SSR with React Query.
 *
 * These functions mirror the structure of client-side hooks but are designed
 * for use in Server Components to prefetch data before rendering.
 *
 * @example
 * ```typescript
 * import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
 * import { fetchDashboardStats, fetchDocuments } from '@/lib/api/server-fetchers';
 *
 * const client = await getServerGraphQLClient();
 * const stats = await fetchDashboardStats(client, { organizationId });
 * const documents = await fetchDocuments(client, { limit: 50 });
 * ```
 */

export * from './dashboard';
export * from './documents';
export * from './threads';
export * from './spaces';
export * from './user-preferences';
