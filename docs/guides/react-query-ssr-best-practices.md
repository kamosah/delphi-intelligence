# React Query SSR Best Practices Guide

**Last Updated**: 2025-11-10
**Target**: Olympus MVP (Next.js 14 + React Query)

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Setup](#setup)
3. [Common Patterns](#common-patterns)
4. [Performance Optimization](#performance-optimization)
5. [Anti-Patterns](#anti-patterns)
6. [Troubleshooting](#troubleshooting)
7. [Examples](#examples)

---

## Quick Reference

### When to Use SSR vs CSR

| **Feature Type**            | **Rendering Strategy**   | **Reason**                            |
| --------------------------- | ------------------------ | ------------------------------------- |
| Static lists (spaces, docs) | SSR (prefetch + hydrate) | Instant load, SEO benefits            |
| Real-time data (chat)       | CSR (client-only)        | Polling/SSE, user-specific            |
| Forms                       | CSR (client-only)        | Heavy interactivity, no SSR benefit   |
| SEO pages (public docs)     | SSR (prefetch + hydrate) | Search engines need pre-rendered HTML |
| User settings               | CSR (client-only)        | Authenticated, no SEO value           |
| Dashboard landing           | SSR (parallel prefetch)  | High traffic, critical for FCP        |

### Key Patterns Cheat Sheet

```tsx
// ✅ Server Component (prefetch)
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';

export default async function Page() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({ queryKey: ['data'], queryFn: fetchData });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClientComponent />
    </HydrationBoundary>
  );
}

// ✅ Client Component (consume)
('use client');
import { useQuery } from '@tanstack/react-query';

export function ClientComponent() {
  const { data } = useQuery({ queryKey: ['data'], queryFn: fetchData });
  return <div>{data}</div>;
}
```

---

## Setup

### 1. Install Dependencies

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

### 2. Create Providers File

**File**: `apps/web/app/providers.tsx`

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Avoid immediate refetch after SSR hydration
        staleTime: 60 * 1000, // 60 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create a new QueryClient
    return makeQueryClient();
  } else {
    // Browser: use singleton pattern to avoid re-creating
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 3. Update Root Layout

**File**: `apps/web/app/layout.tsx`

```tsx
import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## Common Patterns

### Pattern 1: Simple Prefetch + Hydrate

**Use Case**: Single query, instant initial load.

**Server Component** (`app/(dashboard)/spaces/page.tsx`):

```tsx
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { SpacesList } from '@/components/spaces/SpacesList';
import { fetchSpaces } from '@/lib/api/spaces';

export default async function SpacesPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['spaces'],
    queryFn: fetchSpaces,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SpacesList />
    </HydrationBoundary>
  );
}
```

**Client Component** (`components/spaces/SpacesList.tsx`):

```tsx
'use client';

import { useSpaces } from '@/hooks/queries/useSpaces';

export function SpacesList() {
  const { data: spaces } = useSpaces();

  return (
    <ul>
      {spaces.map((space) => (
        <li key={space.id}>{space.name}</li>
      ))}
    </ul>
  );
}
```

**Hook** (`hooks/queries/useSpaces.ts`):

```tsx
import { useQuery } from '@tanstack/react-query';
import { fetchSpaces } from '@/lib/api/spaces';

export function useSpaces() {
  return useQuery({
    queryKey: ['spaces'],
    queryFn: fetchSpaces,
  });
}
```

---

### Pattern 2: Parallel Prefetching

**Use Case**: Multiple independent queries, avoid request waterfalls.

**Server Component** (`app/(dashboard)/page.tsx`):

```tsx
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { fetchSpaces, fetchDocuments, fetchProjects } from '@/lib/api';

export default async function DashboardPage() {
  const queryClient = new QueryClient();

  // ✅ Parallel prefetching
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: ['spaces'], queryFn: fetchSpaces }),
    queryClient.prefetchQuery({
      queryKey: ['documents'],
      queryFn: fetchDocuments,
    }),
    queryClient.prefetchQuery({
      queryKey: ['projects'],
      queryFn: fetchProjects,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardShell />
    </HydrationBoundary>
  );
}
```

**Client Component** (`components/dashboard/DashboardShell.tsx`):

```tsx
'use client';

import { useSpaces } from '@/hooks/queries/useSpaces';
import { useDocuments } from '@/hooks/queries/useDocuments';
import { useProjects } from '@/hooks/queries/useProjects';

export function DashboardShell() {
  const { data: spaces } = useSpaces();
  const { data: documents } = useDocuments();
  const { data: projects } = useProjects();

  return (
    <div>
      <SpacesWidget spaces={spaces} />
      <DocumentsWidget documents={documents} />
      <ProjectsWidget projects={projects} />
    </div>
  );
}
```

---

### Pattern 3: Streaming with Suspense

**Use Case**: Fast initial render, stream slower data progressively.

**Server Component** (`app/(dashboard)/documents/[id]/page.tsx`):

```tsx
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { Suspense } from 'react';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { DocumentSkeleton } from '@/components/documents/DocumentSkeleton';

export default async function DocumentPage({
  params,
}: {
  params: { id: string };
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      dehydrate: {
        // Include pending queries for streaming
        shouldDehydrateQuery: (query) =>
          query.state.status === 'success' || query.state.status === 'pending',
      },
    },
  });

  // ✅ Don't await - allows streaming
  queryClient.prefetchQuery({
    queryKey: ['document', params.id],
    queryFn: () => fetchDocument(params.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<DocumentSkeleton />}>
        <DocumentViewer documentId={params.id} />
      </Suspense>
    </HydrationBoundary>
  );
}
```

---

### Pattern 4: Client-Side Only (No SSR)

**Use Case**: Real-time data, user interactions, forms.

**Client Component** (`components/threads/ThreadsChat.tsx`):

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchThreadMessages } from '@/lib/api/threads';

export function ThreadsChat({ threadId }: { threadId: string }) {
  const { data: messages, isLoading } = useQuery({
    queryKey: ['threads', threadId, 'messages'],
    queryFn: () => fetchThreadMessages(threadId),
    refetchInterval: 5000, // Poll every 5 seconds
  });

  if (isLoading) return <ChatSkeleton />;

  return <MessageList messages={messages} />;
}
```

---

### Pattern 5: Infinite Scroll with SSR

**Use Case**: Paginated lists, prefetch first page on server.

> **Note**: When using `prefetchInfiniteQuery`, you must include the `initialPageParam` parameter. Regular `prefetchQuery` (as shown in Patterns 1-3) does not require this parameter.

**Server Component** (`app/(dashboard)/documents/page.tsx`):

```tsx
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { DocumentsList } from '@/components/documents/DocumentsList';
import { fetchDocuments } from '@/lib/api/documents';

export default async function DocumentsPage() {
  const queryClient = new QueryClient();

  // Prefetch first page only
  await queryClient.prefetchInfiniteQuery({
    queryKey: ['documents'],
    queryFn: ({ pageParam = 0 }) => fetchDocuments({ page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => lastPage.nextPage,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DocumentsList />
    </HydrationBoundary>
  );
}
```

**Client Component** (`components/documents/DocumentsList.tsx`):

```tsx
'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import { fetchDocuments } from '@/lib/api/documents';

export function DocumentsList() {
  const { ref, inView } = useInView();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['documents'],
      queryFn: ({ pageParam = 0 }) => fetchDocuments({ page: pageParam }),
      initialPageParam: 0,
      getNextPageParam: (lastPage, pages) => lastPage.nextPage,
    });

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  return (
    <div>
      {data.pages.map((page) =>
        page.documents.map((doc) => (
          <DocumentCard key={doc.id} document={doc} />
        ))
      )}
      {hasNextPage && (
        <div ref={ref}>{isFetchingNextPage ? 'Loading...' : 'Load more'}</div>
      )}
    </div>
  );
}
```

---

### Pattern 6: Prefetch on Hover

**Use Case**: Instant navigation, anticipate user actions.

**Client Component** (`components/spaces/SpaceCard.tsx`):

```tsx
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { fetchSpaceDetails } from '@/lib/api/spaces';
import Link from 'next/link';

export function SpaceCard({ space }: { space: Space }) {
  const queryClient = useQueryClient();

  const prefetchSpaceDetails = () => {
    queryClient.prefetchQuery({
      queryKey: ['spaces', space.id],
      queryFn: () => fetchSpaceDetails(space.id),
      staleTime: 60 * 1000, // Cache for 60s
    });
  };

  return (
    <Link
      href={`/spaces/${space.id}`}
      onMouseEnter={prefetchSpaceDetails} // ✅ Prefetch on hover
      onFocus={prefetchSpaceDetails} // ✅ Prefetch on keyboard focus
    >
      <div className="space-card">
        <h3>{space.name}</h3>
        <p>{space.description}</p>
      </div>
    </Link>
  );
}
```

---

## Performance Optimization

### 1. Set Appropriate staleTime

**Problem**: Immediate refetch after hydration wastes server prefetch.

**Solution**:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 60 seconds
    },
  },
});
```

**Guideline**:

- Static content (spaces, projects): `staleTime: 5 * 60 * 1000` (5 minutes)
- Frequently updated (documents list): `staleTime: 60 * 1000` (60 seconds)
- Real-time (chat messages): `staleTime: 0` (always refetch)

---

### 2. Use Parallel Queries

**Anti-Pattern**:

```tsx
// ❌ Sequential fetching
await queryClient.prefetchQuery(['spaces'], fetchSpaces);
await queryClient.prefetchQuery(['documents'], fetchDocuments);
await queryClient.prefetchQuery(['projects'], fetchProjects);
```

**Best Practice**:

```tsx
// ✅ Parallel fetching
await Promise.all([
  queryClient.prefetchQuery(['spaces'], fetchSpaces),
  queryClient.prefetchQuery(['documents'], fetchDocuments),
  queryClient.prefetchQuery(['projects'], fetchProjects),
]);
```

---

### 3. Avoid Dependent Queries on Server

**Anti-Pattern**:

```tsx
// ❌ Sequential dependency
const user = await fetchUser();
const projects = await fetchProjects(user.id); // Depends on user
```

**Best Practice**:

```tsx
// ✅ Fetch all user's projects in one query
const projects = await fetchAllProjects(); // Backend handles filtering
```

Or use client-side dependent queries:

```tsx
'use client';

export function ProjectsList() {
  const { data: user } = useUser();
  const { data: projects } = useProjects(user?.id, {
    enabled: !!user, // Only fetch when user loaded
  });
}
```

---

### 4. Optimize Bundle Size

**Use dynamic imports for heavy Client Components**:

```tsx
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Don't render on server (heavy lib)
});
```

---

### 5. Prefetch Only Critical Data

**Anti-Pattern**:

```tsx
// ❌ Prefetching everything blocks render
await queryClient.prefetchQuery(['spaces'], fetchSpaces);
await queryClient.prefetchQuery(['documents'], fetchDocuments);
await queryClient.prefetchQuery(['projects'], fetchProjects);
await queryClient.prefetchQuery(['teams'], fetchTeams);
await queryClient.prefetchQuery(['users'], fetchUsers);
```

**Best Practice**:

```tsx
// ✅ Prefetch only above-the-fold content
await Promise.all([
  queryClient.prefetchQuery(['spaces'], fetchSpaces), // Critical
  queryClient.prefetchQuery(['documents'], fetchDocuments), // Critical
]);

// Fetch below-the-fold content client-side (or stream)
```

---

## Anti-Patterns

### ❌ 1. Rendering Server Data in Both Server and Client Components

**Problem**: Data ownership conflict.

```tsx
// ❌ Bad
async function ServerComponent() {
  const spaces = await fetchSpaces();
  return <SpacesList spaces={spaces} />; // Prop drilling
}

function SpacesList({ spaces }) {
  const { data } = useSpaces(); // Also fetching
  return <ul>{data.map(...)}</ul>;
}
```

**Solution**:

```tsx
// ✅ Good
async function ServerComponent() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery(['spaces'], fetchSpaces); // Prefetch only

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SpacesList />
    </HydrationBoundary>
  );
}

function SpacesList() {
  const { data: spaces } = useSpaces(); // Single source of truth
  return <ul>{spaces.map(...)}</ul>;
}
```

---

### ❌ 2. Using initialData Instead of Hydration

**Problem**: Loses React Query features.

```tsx
// ❌ Bad
async function ServerComponent() {
  const spaces = await fetchSpaces();
  return <SpacesList initialSpaces={spaces} />;
}

function SpacesList({ initialSpaces }) {
  const { data } = useQuery({
    queryKey: ['spaces'],
    queryFn: fetchSpaces,
    initialData: initialSpaces, // Not recommended
  });
}
```

**Solution**: Use prefetch + hydration (see Pattern 1).

---

### ❌ 3. Creating QueryClient at Module Scope

**Problem**: Shares state across requests (memory leak).

```tsx
// ❌ Bad - shared across requests
const queryClient = new QueryClient();

export default async function Page() {
  await queryClient.prefetchQuery(...);
}
```

**Solution**:

```tsx
// ✅ Good - new client per request
export default async function Page() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery(...);
}
```

---

### ❌ 4. Awaiting Non-Critical Prefetch

**Problem**: Blocks render for data that could stream.

```tsx
// ❌ Bad
await queryClient.prefetchQuery(['heavyData'], fetchHeavyData);
```

**Solution**:

```tsx
// ✅ Good - don't await, use Suspense
queryClient.prefetchQuery(['heavyData'], fetchHeavyData);

return (
  <HydrationBoundary state={dehydrate(queryClient)}>
    <Suspense fallback={<Skeleton />}>
      <HeavyDataComponent />
    </Suspense>
  </HydrationBoundary>
);
```

---

## Troubleshooting

### Issue: Data Refetches Immediately After Hydration

**Symptom**: Network tab shows duplicate requests after page load.

**Cause**: `staleTime` is too low (default is 0).

**Fix**:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 60 seconds
    },
  },
});
```

---

### Issue: Loading Spinner Visible on Initial Load

**Symptom**: User sees loading state despite SSR.

**Cause**: Data wasn't prefetched on server.

**Fix**: Ensure `await queryClient.prefetchQuery()` in Server Component.

---

### Issue: "Hydration Mismatch" Error

**Symptom**: React error about mismatched server/client HTML.

**Cause**: Server and client render different content.

**Fix**:

1. Ensure `staleTime` is set (prevents immediate refetch)
2. Check that `queryKey` matches between server and client
3. Verify fetch function is the same on both sides

---

### Issue: Large Bundle Size

**Symptom**: Client bundle includes unnecessary Server Component code.

**Cause**: Mixing server and client logic in same file.

**Fix**: Split into separate files:

- `page.tsx` (Server Component, no `'use client'`)
- `ClientComponent.tsx` (`'use client'` directive)

---

### Issue: Queries Not Streaming with Suspense

**Symptom**: Page blocks render despite not awaiting prefetch.

**Cause**: `shouldDehydrateQuery` not configured for pending queries.

**Fix**:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    dehydrate: {
      shouldDehydrateQuery: (query) =>
        query.state.status === 'success' || query.state.status === 'pending',
    },
  },
});
```

---

## Examples

### Example 1: Dashboard with Parallel Prefetch

**File**: `apps/web/app/(dashboard)/page.tsx`

```tsx
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { fetchSpaces, fetchDocuments, fetchProjects } from '@/lib/api';

export default async function DashboardPage() {
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({ queryKey: ['spaces'], queryFn: fetchSpaces }),
    queryClient.prefetchQuery({
      queryKey: ['documents'],
      queryFn: fetchDocuments,
    }),
    queryClient.prefetchQuery({
      queryKey: ['projects'],
      queryFn: fetchProjects,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardShell />
    </HydrationBoundary>
  );
}
```

---

### Example 2: Spaces List with SSR

**File**: `apps/web/app/(dashboard)/spaces/page.tsx`

```tsx
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { SpacesList } from '@/components/spaces/SpacesList';
import { graphQLClient } from '@/lib/api/graphql-client';
import { SPACES_QUERY } from '@/lib/api/queries';

async function fetchSpaces() {
  const { spaces } = await graphQLClient.request(SPACES_QUERY);
  return spaces;
}

export default async function SpacesPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['spaces'],
    queryFn: fetchSpaces,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SpacesList />
    </HydrationBoundary>
  );
}
```

**File**: `apps/web/components/spaces/SpacesList.tsx`

```tsx
'use client';

import { useSpaces } from '@/hooks/queries/useSpaces';
import { SpaceCard } from './SpaceCard';

export function SpacesList() {
  const { data: spaces } = useSpaces();

  return (
    <div className="grid grid-cols-3 gap-4">
      {spaces.map((space) => (
        <SpaceCard key={space.id} space={space} />
      ))}
    </div>
  );
}
```

**File**: `apps/web/hooks/queries/useSpaces.ts`

```tsx
import { useQuery } from '@tanstack/react-query';
import { graphQLClient } from '@/lib/api/graphql-client';
import { SPACES_QUERY } from '@/lib/api/queries';

export function useSpaces() {
  return useQuery({
    queryKey: ['spaces'],
    queryFn: async () => {
      const { spaces } = await graphQLClient.request(SPACES_QUERY);
      return spaces;
    },
  });
}
```

---

### Example 3: Document Viewer with Streaming

**File**: `apps/web/app/(dashboard)/documents/[id]/page.tsx`

```tsx
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { Suspense } from 'react';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { DocumentSkeleton } from '@/components/documents/DocumentSkeleton';
import { fetchDocument } from '@/lib/api/documents';

export default async function DocumentPage({
  params,
}: {
  params: { id: string };
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          query.state.status === 'success' || query.state.status === 'pending',
      },
    },
  });

  // Don't await - allows streaming
  queryClient.prefetchQuery({
    queryKey: ['document', params.id],
    queryFn: () => fetchDocument(params.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<DocumentSkeleton />}>
        <DocumentViewer documentId={params.id} />
      </Suspense>
    </HydrationBoundary>
  );
}
```

---

## Checklist for Converting Existing Components

- [ ] Identify data dependencies (list all `useQuery` calls)
- [ ] Determine if SSR is beneficial (see [Quick Reference](#quick-reference))
- [ ] Create Server Component page file (remove `'use client'`)
- [ ] Add `async` to component function
- [ ] Initialize `QueryClient` inside component
- [ ] Call `queryClient.prefetchQuery()` for each query
- [ ] Use `Promise.all()` for parallel prefetching
- [ ] Wrap in `HydrationBoundary` with dehydrated state
- [ ] Keep `'use client'` in components using `useQuery`
- [ ] Remove loading states from Client Components (data is prefetched)
- [ ] Test: no loading spinner on initial load
- [ ] Test: no duplicate network requests
- [ ] Test: React Query features still work (refetch, mutations)

---

## Additional Resources

- [ADR-009: Next.js SSR with React Query](../adr/009-nextjs-ssr-react-query.md) - Full architecture decision record
- [TanStack Query SSR Guide](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Frontend Masters: React Query with Server Components](https://frontendmasters.com/blog/combining-react-server-components-with-react-query-for-easy-data-management/)

---

## Change Log

| **Date**   | **Change**    | **Author**       |
| ---------- | ------------- | ---------------- |
| 2025-11-10 | Initial guide | Engineering Team |
