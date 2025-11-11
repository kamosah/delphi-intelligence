# ADR-004: Next.js SSR with React Query Implementation Strategy

**Status**: Proposed
**Date**: 2025-11-10
**Authors**: Engineering Team
**Story Points**: 13 (requires breakdown by component type)

---

## Executive Summary

This ADR defines the strategy for implementing Server-Side Rendering (SSR) with React Query (TanStack Query) in the Olympus Next.js 14 application. We analyze:

1. **SSR Patterns**: Prefetching, hydration, dehydration strategies
2. **Component Architecture**: Server Components vs Client Components with React Query
3. **Performance Optimization**: Request waterfall elimination, parallel queries, streaming
4. **Use Case Analysis**: When to use SSR vs CSR for different features
5. **Implementation Roadmap**: Conversion process for existing components

**Recommendation**: Adopt a **hybrid Server + Client Component approach** with strategic SSR for:

- Initial page loads (Spaces list, Documents list)
- SEO-critical pages (public documents, shared content)
- Performance-sensitive routes (dashboard landing)

Maintain **client-side rendering** for:

- Real-time features (AI chat, live collaboration)
- Interactive components (forms, modals, infinite scroll)
- User-specific state (preferences, session data)

---

## Context

### Current Architecture

**Frontend**: Next.js 14 with App Router + React 18
**State Management**:

- React Query (TanStack Query) for server state
- Zustand for client state
- All data fetching currently happens **client-side only**

**Problem**: Current implementation uses Client Components exclusively with `useQuery`, missing SSR performance benefits:

- Slower First Contentful Paint (FCP)
- Visible loading states on initial render
- Request waterfalls (HTML → JS → API)
- No SEO benefits for dynamic content

### Goals

1. **Performance**: Reduce time-to-interactive (TTI) by 30-50%
2. **SEO**: Pre-render critical content for search engines
3. **UX**: Eliminate loading spinners on initial page loads
4. **Scalability**: Optimize for 100K+ MAU with efficient caching
5. **Developer Experience**: Maintain clean patterns, avoid complexity

### Constraints

- Must work with existing GraphQL backend (FastAPI + Strawberry)
- Must preserve React Query features (caching, mutations, optimistic updates)
- Must support streaming and Suspense where beneficial
- Team size: 2-5 developers (simple patterns preferred)

---

## Decision

### Hybrid SSR + CSR Architecture

**Phase 1**: Implement SSR with prefetching + hydration for high-impact routes
**Phase 2**: Add streaming for data-heavy pages
**Phase 3**: Optimize with parallel prefetching and request deduplication

**Pattern**:

- **Server Components** for data prefetching (loader phase)
- **Client Components** for interactivity (application phase)
- **HydrationBoundary** to bridge server and client state

---

## React Query SSR Patterns

### Pattern 1: Prefetch + Hydrate (Recommended for Most Cases)

**Use Case**: Initial page loads where you want instant content (no loading spinners).

**Server Component** (prefetch data):

```tsx
// app/(dashboard)/spaces/page.tsx
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { SpacesList } from '@/components/spaces/SpacesList';
import { fetchSpaces } from '@/lib/api/spaces';

export default async function SpacesPage() {
  const queryClient = new QueryClient();

  // Prefetch on server
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

**Client Component** (consume prefetched data):

```tsx
// components/spaces/SpacesList.tsx
'use client';

import { useSpaces } from '@/hooks/queries/useSpaces';

export function SpacesList() {
  const { data: spaces } = useSpaces(); // No loading state on initial render!

  return (
    <ul>
      {spaces.map((space) => (
        <li key={space.id}>{space.name}</li>
      ))}
    </ul>
  );
}
```

**Key Benefits**:

- ✅ Instant content (no loading spinner)
- ✅ SEO-friendly (pre-rendered HTML)
- ✅ React Query features work (refetching, mutations, optimistic updates)
- ✅ TypeScript works seamlessly

**Tradeoffs**:

- Blocks initial page render until data loads (use streaming to avoid)
- Server compute time increases TTFB (Time to First Byte)

---

### Pattern 2: Parallel Prefetching (Avoid Request Waterfalls)

**Use Case**: Multiple independent queries (spaces + documents + projects).

**Server Component**:

```tsx
// app/(dashboard)/page.tsx
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { fetchSpaces, fetchDocuments, fetchProjects } from '@/lib/api';

export default async function DashboardPage() {
  const queryClient = new QueryClient();

  // Prefetch in parallel (not sequential!)
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['spaces'],
      queryFn: fetchSpaces,
    }),
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

**Performance Impact**:

- **Before**: 3 sequential requests (750ms total with 250ms latency each)
- **After**: 1 parallel request batch (250ms total)
- **Improvement**: 66% faster

---

### Pattern 3: Streaming with Suspense (Advanced)

**Use Case**: Fast initial render, then stream slower data as it arrives.

**Server Component** (don't await prefetch):

```tsx
// app/(dashboard)/documents/page.tsx
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { Suspense } from 'react';

export default async function DocumentsPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Enable streaming for pending queries
        staleTime: 60 * 1000,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) => {
          // Include pending queries in dehydration
          return (
            query.state.status === 'success' || query.state.status === 'pending'
          );
        },
      },
    },
  });

  // Don't await - allows streaming
  queryClient.prefetchQuery({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<DocumentsSkeleton />}>
        <DocumentsList />
      </Suspense>
    </HydrationBoundary>
  );
}
```

**Key Benefits**:

- Faster time-to-interactive (page shell loads immediately)
- Progressive enhancement (content streams in)
- Better perceived performance

**Tradeoffs**:

- More complex (requires Suspense boundaries)
- SEO considerations (loading state in initial HTML)

---

### Pattern 4: No SSR (Client-Side Only)

**Use Case**: Real-time features, user-specific data, interactive forms.

**Client Component** (standard `useQuery`):

```tsx
// components/threads/ThreadsChat.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchThreadMessages } from '@/lib/api/threads';

export function ThreadsChat({ threadId }: { threadId: string }) {
  const { data: messages, isLoading } = useQuery({
    queryKey: ['threads', threadId, 'messages'],
    queryFn: () => fetchThreadMessages(threadId),
    refetchInterval: 5000, // Poll every 5s for new messages
  });

  if (isLoading) return <Skeleton />;

  return <MessageList messages={messages} />;
}
```

**When to Use**:

- Real-time data (chat, notifications)
- User interactions (forms, modals)
- Authenticated routes (no SEO value)
- Infinite scroll (prefetch page 1, fetch rest client-side)

---

## Server Components vs Client Components Decision Matrix

| **Criteria**                | **Server Component**             | **Client Component**             | **Recommended**       |
| --------------------------- | -------------------------------- | -------------------------------- | --------------------- |
| **Static content**          | ✅ Pre-render on server          | ❌ Load after JS parses          | Server                |
| **SEO-critical**            | ✅ Searchable HTML               | ❌ Blank until hydration         | Server                |
| **User interactions**       | ❌ No event handlers             | ✅ onClick, onSubmit, etc.       | Client                |
| **Real-time data**          | ❌ Stale by definition           | ✅ Live updates (WebSocket, SSE) | Client                |
| **Forms**                   | ❌ No useState                   | ✅ useState, React Hook Form     | Client                |
| **API data (initial load)** | ✅ Prefetch + hydrate            | ❌ Loading spinner               | Server (prefetch)     |
| **API data (subsequent)**   | N/A                              | ✅ useQuery                      | Client                |
| **Large datasets**          | ⚠️ Blocks render                 | ✅ Stream or paginate            | Client (or streaming) |
| **Sensitive logic**         | ✅ Secure (never sent to client) | ❌ Exposed in bundle             | Server                |
| **Third-party libs**        | ⚠️ Many don't support SSR        | ✅ All work                      | Client                |
| **Context providers**       | ❌ No useContext                 | ✅ useContext                    | Client                |
| **Bundle size**             | ✅ 0 KB (no JS sent)             | ❌ Adds to bundle                | Server                |

---

## Use Case Analysis: Olympus Features

| **Feature**               | **SSR Strategy**                             | **Rationale**                                      | **Story Points** |
| ------------------------- | -------------------------------------------- | -------------------------------------------------- | ---------------- |
| **Spaces list**           | Prefetch + hydrate                           | Initial load should be instant, SEO beneficial     | 2                |
| **Documents list**        | Prefetch + hydrate                           | Large dataset, but page 1 should be instant        | 2                |
| **Threads list**          | Prefetch + hydrate                           | Shows recent conversations, SEO for public threads | 2                |
| **Thread chat**           | Client-side only                             | Real-time messages, polling/SSE, user-specific     | 0 (already CSR)  |
| **Document viewer**       | Prefetch metadata + stream content           | Fast initial render, content streams in            | 3                |
| **Settings pages**        | Client-side only                             | Authenticated, forms, no SEO value                 | 0 (already CSR)  |
| **Projects board**        | Prefetch + hydrate                           | Initial board state, then real-time updates        | 2                |
| **Notebook editor**       | Client-side only                             | Heavy interactivity, code editor, no SSR benefit   | 0 (already CSR)  |
| **Dashboard landing**     | Parallel prefetch (spaces + docs + projects) | High-traffic page, critical for FCP                | 3                |
| **Search results**        | Client-side only                             | User-initiated, dynamic, no SEO (private data)     | 0 (already CSR)  |
| **Public shared docs**    | Full SSR with streaming                      | SEO-critical, public access, high performance      | 5                |
| **Organization settings** | Client-side only                             | Forms, admin-only, no SEO                          | 0 (already CSR)  |

**Total Story Points**: 19 points (excluding already-CSR features)

---

## Performance Optimization Strategies

### 1. Avoiding Request Waterfalls

**Problem**: Sequential data fetching causes cumulative latency.

**Before** (3 roundtrips):

```
User requests page → HTML loads → JS loads → API call → Render
250ms              + 500ms       + 250ms    = 1000ms TTI
```

**After with SSR** (2 roundtrips):

```
User requests page → HTML with data loads → JS loads → Render
250ms (API prefetched on server)          + 500ms    = 750ms TTI
```

**Improvement**: 25% faster TTI

---

### 2. Parallel Query Execution

**Anti-pattern**:

```tsx
// ❌ Sequential fetching
const { data: user } = useQuery(['user'], fetchUser);
const { data: projects } = useQuery(
  ['projects', user?.id],
  () => fetchProjects(user.id),
  {
    enabled: !!user,
  }
);
```

**Best practice**:

```tsx
// ✅ Parallel prefetching on server
await Promise.all([
  queryClient.prefetchQuery(['user'], fetchUser),
  queryClient.prefetchQuery(['projects'], fetchProjects), // Fetch all projects
]);
```

Or use `useSuspenseQueries` for client-side parallelism:

```tsx
const [usersQuery, teamsQuery, projectsQuery] = useSuspenseQueries({
  queries: [
    { queryKey: ['users'], queryFn: fetchUsers },
    { queryKey: ['teams'], queryFn: fetchTeams },
    { queryKey: ['projects'], queryFn: fetchProjects },
  ],
});
```

---

### 3. Optimizing staleTime

**Problem**: React Query refetches immediately after hydration if `staleTime` is too low.

**Solution**: Set appropriate `staleTime` for SSR queries:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 60 seconds (avoid immediate refetch)
    },
  },
});
```

**Why**: Server data is already fresh, no need to refetch immediately on mount.

---

### 4. Server-Only Garbage Collection

**Optimization**: On the server, `gcTime` defaults to `Infinity` to prevent memory leaks during request processing.

**Manual cleanup**:

```tsx
// Server Component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: Infinity, // Default on server
    },
  },
});

// Automatically cleared after request completes
```

---

## Implementation Roadmap

### Phase 1: High-Impact Routes (8 points, 1-2 sprints)

**Goal**: Convert 3 highest-traffic pages to SSR.

**Tasks**:

1. **Dashboard landing** (parallel prefetch) - 3 points
   - Prefetch spaces, documents, projects in parallel
   - Update `app/(dashboard)/page.tsx` to Server Component
   - Wrap in `HydrationBoundary`

2. **Spaces list** (prefetch + hydrate) - 2 points
   - Convert `app/(dashboard)/spaces/page.tsx` to Server Component
   - Prefetch spaces query
   - Keep `SpacesList` as Client Component

3. **Documents list** (prefetch + hydrate) - 2 points
   - Convert `app/(dashboard)/documents/page.tsx` to Server Component
   - Prefetch documents query (first page only)
   - Keep infinite scroll in Client Component

4. **Setup QueryClient provider** - 1 point
   - Create `app/providers.tsx` with `'use client'`
   - Implement singleton QueryClient pattern
   - Configure default `staleTime` for SSR

**Success Metrics**:

- Dashboard TTI reduced by 30%
- Lighthouse performance score +10 points
- Zero visible loading spinners on initial page load

---

### Phase 2: SEO-Critical Pages (5 points, 1 sprint)

**Goal**: Enable SSR for public-facing content.

**Tasks**:

1. **Public shared documents** - 5 points
   - Full SSR for document metadata + content
   - Streaming for large documents
   - Open Graph tags for social sharing

**Success Metrics**:

- Public docs fully indexed by Google (Search Console verification)
- Open Graph previews work on Twitter, Slack, Discord

---

### Phase 3: Advanced Optimizations (6 points, 1 sprint)

**Goal**: Eliminate remaining waterfalls, add streaming.

**Tasks**:

1. **Streaming for document viewer** - 3 points
   - Don't await document content prefetch
   - Use Suspense boundaries for progressive loading

2. **Prefetch on hover** - 2 points
   - Prefetch space details on sidebar hover
   - Prefetch document content on list item hover

3. **Parallel route prefetching** - 1 point
   - Use Next.js parallel routes for layout + content prefetching

**Success Metrics**:

- Document viewer FCP improved by 40%
- Navigation feels instant (prefetch on hover)

---

### Total: 19 Story Points (~3 sprints)

---

## Technical Implementation Guide

### Step 1: Setup QueryClient Provider

**Create** `app/providers.tsx`:

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 60s - avoid immediate refetch after SSR
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

**Update** `app/layout.tsx`:

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

### Step 2: Convert Page to Server Component with Prefetching

**Before** (Client-Side Only):

```tsx
// app/(dashboard)/spaces/page.tsx
'use client';

import { useSpaces } from '@/hooks/queries/useSpaces';

export default function SpacesPage() {
  const { data: spaces, isLoading } = useSpaces();

  if (isLoading) return <LoadingSpinner />; // ❌ Visible loading state

  return <SpacesList spaces={spaces} />;
}
```

**After** (Server Component with Prefetch):

```tsx
// app/(dashboard)/spaces/page.tsx
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

**Client Component** (unchanged):

```tsx
// components/spaces/SpacesList.tsx
'use client';

import { useSpaces } from '@/hooks/queries/useSpaces';

export function SpacesList() {
  const { data: spaces } = useSpaces(); // ✅ No loading state needed!

  return (
    <ul>
      {spaces.map((space) => (
        <SpaceCard key={space.id} space={space} />
      ))}
    </ul>
  );
}
```

---

### Step 3: Implement Parallel Prefetching

**Dashboard with multiple queries**:

```tsx
// app/(dashboard)/page.tsx
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { fetchSpaces, fetchDocuments, fetchProjects } from '@/lib/api';

export default async function DashboardPage() {
  const queryClient = new QueryClient();

  // Prefetch all queries in parallel
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['spaces'],
      queryFn: fetchSpaces,
    }),
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

### Step 4: Add Streaming for Large Datasets

**Document viewer with streaming**:

```tsx
// app/(dashboard)/documents/[id]/page.tsx
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { Suspense } from 'react';
import { DocumentViewer } from '@/components/documents/DocumentViewer';

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

## Conversion Process (Step-by-Step)

### Checklist for Converting Existing Components

For each page/component to convert:

**1. Identify Data Dependencies**

- [ ] List all `useQuery` calls in the component tree
- [ ] Identify independent queries (can prefetch in parallel)
- [ ] Identify dependent queries (child depends on parent)

**2. Create Server Component**

- [ ] Remove `'use client'` from page file
- [ ] Create `async` function for page component
- [ ] Initialize `QueryClient` inside component

**3. Add Prefetching**

- [ ] Call `queryClient.prefetchQuery()` for each query
- [ ] Use `Promise.all()` for parallel prefetching
- [ ] Use `await` unless streaming is desired

**4. Wrap in HydrationBoundary**

- [ ] Import `HydrationBoundary` and `dehydrate`
- [ ] Wrap child components in `<HydrationBoundary state={dehydrate(queryClient)}>`

**5. Update Client Components**

- [ ] Keep `'use client'` in components using `useQuery`
- [ ] Remove loading states (data is pre-fetched)
- [ ] Keep error states and refetch logic

**6. Test**

- [ ] Verify no loading spinner on initial load
- [ ] Check Network tab: no duplicate requests
- [ ] Test React Query features (refetch, mutations)
- [ ] Verify SEO: view source shows pre-rendered data

---

## Reference: Key React Query Hooks for SSR

| **Hook**                | **Use Case**                          | **SSR-Compatible?** | **Notes**                                       |
| ----------------------- | ------------------------------------- | ------------------- | ----------------------------------------------- |
| `useQuery`              | Standard data fetching                | ✅ Yes              | Works with prefetched data via hydration        |
| `useSuspenseQuery`      | Data fetching with Suspense           | ✅ Yes              | Requires Suspense boundary, enables streaming   |
| `useSuspenseQueries`    | Multiple queries with Suspense        | ✅ Yes              | Maintains parallelism with Suspense             |
| `useMutation`           | Create/Update/Delete operations       | ❌ Client-only      | Always runs in Client Components                |
| `useInfiniteQuery`      | Infinite scroll, pagination           | ⚠️ Partial          | Prefetch page 1 on server, fetch rest on client |
| `prefetchQuery`         | Server-side prefetching               | ✅ Server-only      | Call in Server Components before rendering      |
| `prefetchInfiniteQuery` | Prefetch first page of infinite query | ✅ Server-only      | Useful for infinite scroll with SSR             |
| `HydrationBoundary`     | Bridge server and client state        | ✅ Yes              | Required for hydration                          |
| `dehydrate`             | Serialize QueryClient for hydration   | ✅ Server-only      | Pass to HydrationBoundary                       |

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Rendering Server Data in Both Server and Client Components

**Problem**: Data ownership conflict causes desyncs.

**Bad**:

```tsx
// Server Component
async function ServerComponent() {
  const spaces = await fetchSpaces();
  return <SpacesList spaces={spaces} />; // ❌ Prop drilling server data
}

// Client Component
function SpacesList({ spaces }) {
  const { data } = useSpaces(); // ❌ Also fetching same data
  return <ul>{data.map(...)}</ul>;
}
```

**Good**:

```tsx
// Server Component - prefetch only
async function ServerComponent() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery(['spaces'], fetchSpaces); // ✅ Prefetch only

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SpacesList /> {/* ✅ No props */}
    </HydrationBoundary>
  );
}

// Client Component - single source of truth
function SpacesList() {
  const { data: spaces } = useSpaces(); // ✅ Only data source
  return <ul>{spaces.map(...)}</ul>;
}
```

---

### ❌ Anti-Pattern 2: Using initialData Instead of Hydration

**Problem**: Loses React Query features (stale checks, background refetching).

**Bad**:

```tsx
// Server Component
async function ServerComponent() {
  const spaces = await fetchSpaces();
  return <SpacesList initialSpaces={spaces} />; // ❌ Prop drilling
}

// Client Component
function SpacesList({ initialSpaces }) {
  const { data } = useQuery({
    queryKey: ['spaces'],
    queryFn: fetchSpaces,
    initialData: initialSpaces, // ❌ Not recommended by React Query team
  });
}
```

**Good**: Use prefetch + hydration (see Pattern 1 above).

---

### ❌ Anti-Pattern 3: Awaiting Prefetch for Non-Critical Data

**Problem**: Blocks page render for data that could stream.

**Bad**:

```tsx
// ❌ Blocks render for slow API
await queryClient.prefetchQuery(['heavyData'], fetchHeavyData);
```

**Good**:

```tsx
// ✅ Start prefetch, don't block render
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

### ❌ Anti-Pattern 4: Setting staleTime Too Low

**Problem**: Immediate refetch after hydration wastes server prefetch.

**Bad**:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // ❌ Refetches immediately after hydration
    },
  },
});
```

**Good**:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // ✅ 60s - server data is fresh
    },
  },
});
```

---

## Success Metrics

### Phase 1 (High-Impact Routes)

- ✅ Dashboard TTI reduced by 30% (1000ms → 700ms)
- ✅ Lighthouse performance score +10 points (75 → 85)
- ✅ Zero loading spinners on initial page load
- ✅ No duplicate network requests (verified in DevTools)

### Phase 2 (SEO-Critical Pages)

- ✅ Public documents indexed by Google (100% coverage)
- ✅ Open Graph previews work (Twitter, Slack, Discord)
- ✅ First Contentful Paint (FCP) <1.5s

### Phase 3 (Advanced Optimizations)

- ✅ Document viewer FCP improved by 40% (1500ms → 900ms)
- ✅ Navigation feels instant (<100ms perceived latency)
- ✅ Largest Contentful Paint (LCP) <2.5s for all pages

---

## Alternatives Considered

### 1. SWR (Vercel's Data Fetching Library)

**Pros**: Built by Vercel, tight Next.js integration
**Cons**: Less feature-rich than React Query (no mutations API, less mature devtools)
**Verdict**: Rejected - React Query already in use, migration cost high

### 2. Apollo Client (GraphQL)

**Pros**: GraphQL-native SSR support
**Cons**: Heavy bundle size, overkill for REST/GraphQL hybrid
**Verdict**: Reconsidered if we move to 100% GraphQL backend

### 3. Next.js fetch() with App Router (No Library)

**Pros**: Zero dependencies, native Next.js caching
**Cons**: No client-side state management, no optimistic updates, no devtools
**Verdict**: Rejected - React Query provides essential features

### 4. Server Actions (Next.js 13+)

**Pros**: Native mutations, no API routes needed
**Cons**: Experimental, unclear patterns for complex state
**Verdict**: Deferred to Phase 4+ (monitor stability)

---

## Open Questions

1. **Streaming vs Blocking**: Which pages benefit most from streaming? (Need to measure)
2. **Cache Revalidation**: Should we use `revalidatePath()` or React Query's refetch? (Likely React Query)
3. **Error Boundaries**: How do we handle SSR errors gracefully? (Need error boundary strategy)
4. **TypeScript Types**: How do we share types between server fetch functions and client hooks? (Use generated GraphQL types)
5. **Testing**: How do we test SSR components with prefetched data? (Need MSW + Next.js test utils)

---

## Reference Links

### TanStack Query Documentation

- [Server Rendering & Hydration Guide](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)
- [Advanced SSR Patterns](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
- [Avoiding Request Waterfalls](https://tanstack.com/query/latest/docs/framework/react/guides/request-waterfalls)
- [Prefetching Strategies](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching)
- [Hydration API Reference](https://tanstack.com/query/latest/docs/framework/react/reference/hydration)

### Next.js Documentation

- [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Data Fetching Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns)
- [Streaming and Suspense](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)

### Community Resources

- [Combining React Server Components with React Query (Frontend Masters)](https://frontendmasters.com/blog/combining-react-server-components-with-react-query-for-easy-data-management/)
- [Mastering Data Fetching with React Query and Next.js](https://prateeksurana.me/blog/mastering-data-fetching-with-react-query-and-next-js/)
- [TkDodo's Blog: You Might Not Need React Query](https://tkdodo.eu/blog/you-might-not-need-react-query)
- [Next.js Server Components vs Client Components Best Practices](https://medium.com/@jigsz6391/next-js-server-components-vs-client-components-best-practices-2e735f4ad27c)

---

## Contributors

- Engineering Team (2025-11-10)
- Research sources: TanStack Query docs, Next.js docs, Frontend Masters, community blogs

---

## Change Log

| **Date**   | **Change**    | **Author**       |
| ---------- | ------------- | ---------------- |
| 2025-11-10 | Initial draft | Engineering Team |
