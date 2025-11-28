# Server-Side Fetchers Guide

**Last Updated**: 2025-11-27
**Target**: Olympus MVP - Next.js SSR with React Query

---

## Overview

Server-side fetchers are reusable functions for fetching data in Server Components. They mirror the structure of client-side React Query hooks but are designed for SSR prefetching.

**Location**: `apps/web/src/lib/api/server-fetchers/`

---

## Architecture

### File Organization

```
apps/web/src/lib/api/
├── server-fetchers/
│   ├── index.ts              # Re-exports all fetchers
│   ├── dashboard.ts          # Dashboard-related fetchers
│   ├── documents.ts          # Document-related fetchers
│   ├── threads.ts            # Thread-related fetchers
│   ├── spaces.ts             # Space-related fetchers
│   └── [entity].ts           # Additional entities as needed
├── graphql-server-client.ts  # Server-side GraphQL client
└── hooks.generated.ts        # Generated GraphQL queries/types
```

**Pattern**: One file per entity, matching the structure of client-side hooks and GraphQL files.

---

## Basic Usage

### 1. Import Server GraphQL Client and Fetchers

```typescript
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import { fetchDashboardStats, fetchDocuments } from '@/lib/api/server-fetchers';
```

### 2. Prefetch Data in Server Component

```typescript
// app/(dashboard)/page.tsx
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import { fetchDashboardStats } from '@/lib/api/server-fetchers';
import { queryKeys } from '@/lib/query/query-keys';

export default async function DashboardPage() {
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  // Prefetch data
  await queryClient.prefetchQuery({
    queryKey: queryKeys.dashboard.stats(null),
    queryFn: () => fetchDashboardStats(graphqlClient, { organizationId: null }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
```

### 3. Consume Prefetched Data in Client Component

```typescript
// components/dashboard/DashboardClient.tsx
'use client';

import { useDashboardStats } from '@/hooks/useDashboardStats';

export function DashboardClient() {
  const { stats } = useDashboardStats(); // Data is already prefetched - no loading state!

  return <div>{stats?.totalDocuments}</div>;
}
```

---

## Key Patterns

### Pattern 1: Single Query Prefetch

**Use Case**: Simple page with one data dependency.

```typescript
// Server Component
export default async function SpacesPage() {
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.spaces.list({}),
    queryFn: () => fetchSpaces(graphqlClient),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SpacesClient />
    </HydrationBoundary>
  );
}
```

---

### Pattern 2: Parallel Prefetching

**Use Case**: Dashboard with multiple independent queries.

```typescript
// Server Component
export default async function DashboardPage() {
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  // ✅ Fetch all queries in parallel - 66% faster than sequential
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.stats(null),
      queryFn: () => fetchDashboardStats(graphqlClient),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.documents.list(null, { limit: 3 }),
      queryFn: () => fetchDocuments(graphqlClient, { limit: 3 }),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.threads.list({ limit: 3 }),
      queryFn: () => fetchThreads(graphqlClient, { limit: 3 }),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
```

---

### Pattern 3: Conditional Prefetching

**Use Case**: Prefetch data based on route params or cookies.

```typescript
// Server Component with params
export default async function SpaceDetailPage({ params }: { params: { id: string } }) {
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  // Prefetch space-specific documents
  await queryClient.prefetchQuery({
    queryKey: queryKeys.documents.list(params.id, { limit: 50 }),
    queryFn: () => fetchDocuments(graphqlClient, { spaceId: params.id, limit: 50 }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SpaceDetailClient spaceId={params.id} />
    </HydrationBoundary>
  );
}
```

---

## Creating New Server Fetchers

### Step 1: Create Entity File

Create `apps/web/src/lib/api/server-fetchers/[entity].ts`:

````typescript
/**
 * Server-side fetchers for [entity] data.
 * Use in Server Components for SSR prefetching.
 */

import { GraphQLClient } from 'graphql-request';
import {
  Get[Entity]Document,
  type Get[Entity]Query,
} from '../hooks.generated';

export interface Fetch[Entity]Options {
  // Define options based on GraphQL variables
  id?: string;
  limit?: number;
}

/**
 * Fetch [entity] data.
 *
 * @example
 * ```typescript
 * const client = await getServerGraphQLClient();
 * const data = await fetch[Entity](client, { limit: 50 });
 * ```
 */
export async function fetch[Entity](
  client: GraphQLClient,
  options?: Fetch[Entity]Options
): Promise<Get[Entity]Query['[entity]']> {
  const result = await client.request<Get[Entity]Query>(
    Get[Entity]Document,
    {
      limit: options?.limit ?? 100,
    }
  );

  return result.[entity];
}
````

### Step 2: Export from Index

Add to `apps/web/src/lib/api/server-fetchers/index.ts`:

```typescript
export * from './[entity]';
```

### Step 3: Use in Server Component

```typescript
import { fetch[Entity] } from '@/lib/api/server-fetchers';

const data = await fetch[Entity](graphqlClient, { limit: 50 });
```

---

## Comparison: Client Hooks vs Server Fetchers

| **Aspect**         | **Client Hooks**                             | **Server Fetchers**                             |
| ------------------ | -------------------------------------------- | ----------------------------------------------- |
| **Location**       | `hooks/use[Entity].ts`                       | `lib/api/server-fetchers/[entity].ts`           |
| **Usage**          | Client Components (`'use client'`)           | Server Components (async)                       |
| **Return Type**    | `{ data, isLoading, error }`                 | `Promise<Data>`                                 |
| **Caching**        | React Query handles automatically            | Must prefetch via `queryClient.prefetchQuery()` |
| **Authentication** | Uses Zustand store via middleware            | Uses cookies via `getServerGraphQLClient()`     |
| **Purpose**        | Client-side data fetching + state management | Server-side prefetching for SSR                 |

---

## Best Practices

### ✅ Do's

1. **Reuse Fetchers**: Use server fetchers in multiple Server Components
2. **Match Query Keys**: Ensure server `queryKey` matches client `queryKey` for hydration
3. **Parallel Prefetch**: Use `Promise.all()` for independent queries
4. **Type Safety**: Leverage TypeScript types from `hooks.generated.ts`
5. **Consistent Structure**: One file per entity, matching client hooks

### ❌ Don'ts

1. **Don't Use in Client Components**: Server fetchers are for Server Components only
2. **Don't Duplicate Logic**: Keep GraphQL queries in `hooks.generated.ts`, not in fetchers
3. **Don't Forget Authentication**: Always use `getServerGraphQLClient()` for auth
4. **Don't Block Render**: Avoid awaiting non-critical prefetch (use streaming instead)
5. **Don't Hardcode Values**: Use options parameters for flexibility

---

## Authentication

### ⚠️ Current Implementation (Vulnerable)

The `getServerGraphQLClient()` function reads the JWT token from cookies set via client-side JavaScript:

```typescript
// lib/api/graphql-server-client.ts
export async function getServerGraphQLClient() {
  const cookieStore = await cookies();
  const token = cookieStore.get('olympus-auth-token')?.value;

  const headers: Record<string, string> = {};
  if (token) {
    headers['authorization'] = `Bearer ${token}`;
  }

  return new GraphQLClient(GRAPHQL_ENDPOINT, { headers });
}
```

**Cookie Name**: `olympus-auth-token` (set by client-side auth via `setAuthCookies`)

**⚠️ Security Warning**: These cookies are set via `document.cookie` and are **NOT HTTP-only**. They are accessible to JavaScript, making them vulnerable to XSS attacks.

> **Recommended for Production**: Migrate to server-side cookie setting with the `HttpOnly` flag enabled. See [ADR-010: HTTP-Only Cookie Authentication Strategy](../adr/010-http-only-cookie-authentication.md) and the [HTTP-Only Cookie Migration Guide](./http-only-cookie-migration.md) for implementation details.

---

## Query Key Consistency

**Critical**: Server and client must use the **same query keys** for hydration to work.

### ✅ Correct

```typescript
// Server Component
await queryClient.prefetchQuery({
  queryKey: queryKeys.documents.list(null, { limit: 3 }), // ✅ Same key
  queryFn: () => fetchDocuments(graphqlClient, { limit: 3 }),
});

// Client Component
const { documents } = useDocuments({ limit: 3 }); // ✅ Same key via hook
```

### ❌ Incorrect

```typescript
// Server Component
await queryClient.prefetchQuery({
  queryKey: ['documents', { limit: 3 }], // ❌ Different key structure
  queryFn: () => fetchDocuments(graphqlClient, { limit: 3 }),
});

// Client Component
const { documents } = useDocuments({ limit: 3 }); // Uses queryKeys.documents.list()
```

**Result**: Client will refetch data (duplicate request) because keys don't match.

---

## Troubleshooting

### Issue: Data Refetches After SSR

**Symptom**: Duplicate network requests in DevTools after page load.

**Cause**: Query keys don't match between server and client.

**Fix**: Ensure both use `queryKeys` from `@/lib/query/query-keys`.

---

### Issue: Authentication Fails on Server

**Symptom**: Server fetchers return 401 Unauthorized.

**Cause**: Cookie not being read correctly or cookie name mismatch.

**Fix**:

1. Verify backend sets `access_token` cookie
2. Check cookie name in `getServerGraphQLClient()`
3. Ensure cookie is HTTP-only and same-site

---

### Issue: TypeScript Errors

**Symptom**: Type errors when using fetcher functions.

**Cause**: Missing or outdated generated types.

**Fix**:

```bash
cd apps/web
npm run graphql:introspect
npm run graphql:generate
```

---

## Example: Complete Flow

### 1. Server Fetcher

```typescript
// lib/api/server-fetchers/spaces.ts
export async function fetchSpaces(
  client: GraphQLClient,
  options?: FetchSpacesOptions
): Promise<GetSpacesQuery['spaces']> {
  const result = await client.request<GetSpacesQuery>(GetSpacesDocument, {
    limit: options?.limit ?? 100,
  });
  return result.spaces;
}
```

### 2. Server Component

```typescript
// app/(dashboard)/spaces/page.tsx
export default async function SpacesPage() {
  const queryClient = new QueryClient();
  const graphqlClient = await getServerGraphQLClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.spaces.list({}),
    queryFn: () => fetchSpaces(graphqlClient),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SpacesClient />
    </HydrationBoundary>
  );
}
```

### 3. Client Component

```typescript
// components/spaces/SpacesClient.tsx
'use client';

export function SpacesClient() {
  const { spaces } = useSpaces(); // No loading state - data is prefetched!

  return (
    <div>
      {spaces.map((space) => (
        <SpaceCard key={space.id} space={space} />
      ))}
    </div>
  );
}
```

---

## Reference

- **ADR**: `docs/adr/009-nextjs-ssr-react-query.md`
- **Best Practices**: `docs/guides/react-query-ssr-best-practices.md`
- **Frontend Guide**: `docs/guides/frontend-guide.md`

---

## Change Log

| **Date**   | **Change**                    | **Author** |
| ---------- | ----------------------------- | ---------- |
| 2025-11-27 | Initial server fetchers guide | Team       |
