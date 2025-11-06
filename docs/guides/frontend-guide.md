# Frontend Development Guide

This guide covers the Next.js 14 frontend architecture, state management, and data fetching patterns for the Olympus MVP project.

## Application Structure

```
apps/web/src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group (login, signup)
│   ├── (dashboard)/       # Dashboard routes (spaces, documents, queries)
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles + Tailwind
├── components/
│   ├── ui/                # Shadcn components (button, input, etc.)
│   ├── forms/             # Form components
│   └── layout/            # Layout components (sidebar, navbar)
├── lib/
│   ├── stores/            # Zustand stores (auth-store.ts, app-store.ts)
│   ├── query/             # React Query setup (client.ts, provider.tsx)
│   ├── api/               # API clients (auth-client.ts, graphql-client.ts)
│   └── utils/             # Utility functions
├── hooks/                 # Custom React hooks (useAuth.ts)
└── store/                 # Additional stores (ui-store.ts)
```

## State Management (ADR-001)

The frontend uses a **hybrid state management approach** rather than Redux:

- **React Query (TanStack Query)** - Server state from GraphQL API (spaces, documents, queries)
- **Zustand** - Client state (UI, theme, navigation, auth tokens)
- **React Hook Form** - Form state and validation
- **Yjs** (planned) - Real-time collaborative state
- **useState/useReducer** - Component-local state

**Key principle**: Never put server data in Zustand. Use React Query for all API data.

### State Management Rules

1. **Server data → React Query** (spaces, documents, users, queries)
2. **Streaming data → Custom hooks** (SSE streams for AI responses)
3. **UI state → Zustand** (theme, sidebar open/closed, current selections)
4. **Form inputs → React Hook Form** (login form, document upload form)
5. **Component state → useState** (dropdown open, hover state)

**Important distinctions**:

- **React Query**: Request/response patterns (fetch, mutations) - most API calls
- **Custom hooks with EventSource**: Streaming patterns (SSE) - AI query responses, real-time updates
- After SSE streaming completes, optionally cache result in React Query for history/persistence

Never duplicate server data in Zustand. If it comes from the API, use React Query (or custom hook for streaming).

## Key Frontend Patterns

### Data Fetching with React Query

Use React Query with GraphQL

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/client';

// In component
const { data, isLoading, error } = useQuery({
  queryKey: queryKeys.spaces.list({}),
  queryFn: () => fetchSpaces(),
});
```

### Authentication

Access auth state via Zustand

```typescript
import { useAuthStore } from '@/lib/stores/auth-store';

const { user, isAuthenticated, logout } = useAuthStore();
```

### Query Keys Factory

Use centralized query keys (`apps/web/src/lib/query/client.ts`)

```typescript
queryKeys.auth.user(); // ['auth', 'user']
queryKeys.spaces.detail('space-123'); // ['spaces', 'detail', 'space-123']
queryKeys.documents.list('space-123'); // ['documents', 'list', 'space-123']
```

### GraphQL Code Generation

Run `npm run graphql:generate` after backend schema changes

- Input: `apps/api` GraphQL schema
- Output: `apps/web/src/lib/api/generated.ts` (TypeScript types)
- Config: `codegen.yml` and `codegen.introspect.yml`

After any backend GraphQL schema changes:

```bash
cd apps/web
npm run graphql:introspect  # Fetch schema
npm run graphql:generate    # Generate TypeScript types
```

Generated files are committed to version control for consistency.

## GraphQL Queries & React Query Hooks Organization

Since we use GraphQL codegen, organizing queries and hooks properly is critical for maintainability, type safety, and avoiding cyclic dependencies.

### Directory Structure

```
apps/web/src/
├── graphql/
│   ├── queries/              # GraphQL query documents by entity
│   │   ├── spaces.graphql
│   │   ├── documents.graphql
│   │   ├── users.graphql
│   │   ├── query-history.graphql
│   │   └── health.graphql
│   ├── mutations/            # GraphQL mutation documents by entity
│   │   ├── spaces.graphql
│   │   ├── documents.graphql
│   │   ├── users.graphql
│   │   └── query-history.graphql
│   └── fragments/            # Shared GraphQL fragments
│       ├── space.graphql
│       ├── user.graphql
│       └── document.graphql
├── lib/
│   └── api/
│       └── generated.ts      # Level 0: GraphQL codegen output (no imports)
├── types/
│   └── ui/                   # Level 1: Extended types for UI (imports from generated only)
│       ├── spaces.ts
│       ├── documents.ts
│       └── index.ts
├── hooks/
│   └── queries/              # Level 2: React Query hooks (imports from generated & ui types)
│       ├── useSpaces.ts
│       ├── useDocuments.ts
│       ├── useQueryHistory.ts
│       └── index.ts
└── components/               # Level 3: Components (can import from all levels)
```

**Naming Convention:**

- **Entity files**: Use kebab-case for multi-word entity names
  - ✅ `query-history.graphql` (not `queryHistory.graphql` or `user-queries.graphql`)
  - ✅ `user-preferences.graphql` (not `userPreferences.graphql`)
  - ✅ `users.graphql` (single word entity)
  - ✅ `health.graphql` (system/diagnostic queries)
- **Directory separation**: Queries, mutations, and fragments in separate folders
  - No need for `.queries.graphql` or `.mutations.graphql` suffixes (directory already indicates type)
- **Fragment files**: Use singular entity name (e.g., `user.graphql`, not `users.graphql`)

### Dependency Flow (Safe from Cycles)

```
generated types → ui types → hooks → components
     ↑              ↑          ↑         ↑
     └──────────────┴──────────┴─────────┘
     (components can import from any layer, but layers don't cross-import)
```

**Rules to prevent cyclic dependencies:**

- **Level 0 (generated.ts)**: Imports nothing from your code
- **Level 1 (types/ui/\*)**: Only imports from `lib/api/generated`
- **Level 2 (hooks/\*)**: Imports from `generated` and `types/ui`, but **ONLY re-exports from `generated`**
- **Level 3 (components)**: Can import from all levels

### GraphQL Query Documents

Organize `.graphql` files by entity in `apps/web/src/graphql/queries/`:

```graphql
# apps/web/src/graphql/queries/spaces.graphql

query GetSpaces($limit: Int, $offset: Int) {
  spaces(limit: $limit, offset: $offset) {
    id
    name
    description
    createdAt
    updatedAt
    documentCount
    memberCount
  }
}

query GetSpace($id: ID!) {
  space(id: $id) {
    id
    name
    description
    createdAt
    updatedAt
    documents {
      id
      title
      status
    }
    members {
      id
      email
      role
    }
  }
}
```

```graphql
# apps/web/src/graphql/mutations/spaces.graphql

mutation CreateSpace($input: CreateSpaceInput!) {
  createSpace(input: $input) {
    id
    name
    description
    createdAt
  }
}

mutation UpdateSpace($id: ID!, $input: UpdateSpaceInput!) {
  updateSpace(id: $id, input: $input) {
    id
    name
    description
    updatedAt
  }
}

mutation DeleteSpace($id: ID!) {
  deleteSpace(id: $id) {
    success
    message
  }
}
```

### UI Type Extensions (Level 1)

Create UI-specific type extensions in `apps/web/src/types/ui/`:

```typescript
// apps/web/src/types/ui/spaces.ts

import type { Space, SpaceStatus } from '@/lib/api/generated';

/**
 * Space with UI-specific properties for list views
 */
export interface SpaceListItem extends Space {
  isSelected: boolean;
  isHovered: boolean;
}

/**
 * Space with computed properties for detail views
 */
export interface SpaceDetail extends Space {
  isOwner: boolean;
  canEdit: boolean;
  canDelete: boolean;
  memberEmails: string[];
}

/**
 * Space with optimistic update state
 */
export interface SpaceOptimistic extends Space {
  isPending: boolean;
  optimisticId?: string;
}
```

```typescript
// apps/web/src/types/ui/index.ts

// Barrel export for all UI type extensions
export * from './spaces';
export * from './documents';
export * from './users';
```

### React Query Hooks (Level 2)

Create entity-specific hooks in `apps/web/src/hooks/queries/`:

```typescript
// apps/web/src/hooks/queries/useSpaces.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/api/graphql-client';
import {
  GetSpacesDocument,
  GetSpaceDocument,
  CreateSpaceDocument,
  UpdateSpaceDocument,
  DeleteSpaceDocument,
  type GetSpacesQuery,
  type GetSpaceQuery,
  type CreateSpaceMutation,
  type Space,
  type SpaceStatus,
  type CreateSpaceInput,
  type UpdateSpaceInput,
} from '@/lib/api/generated';

// ✅ SAFE: Re-export base generated types (no cycle risk)
export type {
  Space,
  SpaceStatus,
  CreateSpaceInput,
  UpdateSpaceInput,
} from '@/lib/api/generated';

// ✅ SAFE: Import UI types for use in hooks (but DON'T re-export them)
import type { SpaceListItem, SpaceDetail } from '@/types/ui';

// Query keys factory for spaces
export const spaceKeys = {
  all: ['spaces'] as const,
  lists: () => [...spaceKeys.all, 'list'] as const,
  list: (filters: { limit?: number; offset?: number }) =>
    [...spaceKeys.lists(), filters] as const,
  details: () => [...spaceKeys.all, 'detail'] as const,
  detail: (id: string) => [...spaceKeys.details(), id] as const,
};

// Query: List all spaces
export function useSpaces(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: spaceKeys.list(params || {}),
    queryFn: async () => {
      const response = await graphqlClient.request<GetSpacesQuery>(
        GetSpacesDocument,
        params
      );
      return response.spaces;
    },
  });
}

// Query: Get single space
export function useSpace(id: string) {
  return useQuery({
    queryKey: spaceKeys.detail(id),
    queryFn: async () => {
      const response = await graphqlClient.request<GetSpaceQuery>(
        GetSpaceDocument,
        { id }
      );
      return response.space;
    },
    enabled: !!id, // Only run if id exists
  });
}

// Query with UI type transformation
export function useSpaces() {
  const { data, ...rest } = useSpaces();

  const listItems: SpaceListItem[] | undefined = data?.map((space) => ({
    ...space,
    isSelected: false,
    isHovered: false,
  }));

  return { data: listItems, ...rest };
}

// Mutation: Create space
export function useCreateSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSpaceInput) => {
      const response = await graphqlClient.request<CreateSpaceMutation>(
        CreateSpaceDocument,
        { input }
      );
      return response.createSpace;
    },
    onSuccess: () => {
      // Invalidate all space lists to refetch
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() });
    },
  });
}

// Mutation: Update space
export function useUpdateSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateSpaceInput;
    }) => {
      const response = await graphqlClient.request(UpdateSpaceDocument, {
        id,
        input,
      });
      return response.updateSpace;
    },
    onSuccess: (data) => {
      // Invalidate specific space and lists
      queryClient.invalidateQueries({ queryKey: spaceKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: spaceKeys.lists() });
    },
  });
}

// Mutation: Delete space
export function useDeleteSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await graphqlClient.request(DeleteSpaceDocument, { id });
      return response.deleteSpace;
    },
    onSuccess: () => {
      // Invalidate all space queries
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
    },
  });
}
```

```typescript
// apps/web/src/hooks/queries/index.ts

// Barrel export for all query hooks
export * from './useSpaces';
export * from './useDocuments';
export * from './useUserQueries';
```

### Component Usage (Level 3)

Components import from multiple sources safely:

```tsx
// apps/web/src/components/spaces/SpacesList.tsx

// Import hooks
import { useSpaces, useCreateSpace } from '@/hooks/queries/useSpaces';

// Import base types (re-exported from hooks for convenience)
import type { Space, CreateSpaceInput } from '@/hooks/queries/useSpaces';

// Import UI types separately
import type { SpaceListItem } from '@/types/ui';

export function SpacesList() {
  const { data: spaces, isLoading, error } = useSpaces({ limit: 20 });
  const createSpace = useCreateSpace();

  const handleCreate = async (input: CreateSpaceInput) => {
    await createSpace.mutateAsync(input);
  };

  // Transform to UI type if needed
  const listItems: SpaceListItem[] =
    spaces?.map((space) => ({
      ...space,
      isSelected: false,
      isHovered: false,
    })) || [];

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {listItems.map((space) => (
        <div key={space.id}>{space.name}</div>
      ))}
    </div>
  );
}
```

### Alternative: Using UI-transformed Hook

```tsx
// Import the hook that returns UI-extended type
import { useSpacesForList } from '@/hooks/queries/useSpaces';
import type { SpaceListItem } from '@/types/ui';

export function SpacesList() {
  // Already returns SpaceListItem[]
  const { data: listItems, isLoading } = useSpacesForList();

  return (
    <div>
      {listItems?.map((space) => (
        <div key={space.id}>{space.name}</div>
      ))}
    </div>
  );
}
```

### Query Keys Organization

Maintain a centralized query keys factory in `apps/web/src/lib/query/client.ts`:

```typescript
// apps/web/src/lib/query/client.ts

export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },

  // Spaces
  spaces: {
    all: ['spaces'] as const,
    lists: () => [...queryKeys.spaces.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.spaces.lists(), filters] as const,
    details: () => [...queryKeys.spaces.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.spaces.details(), id] as const,
  },

  // Documents
  documents: {
    all: ['documents'] as const,
    lists: () => [...queryKeys.documents.all, 'list'] as const,
    list: (spaceId: string) =>
      [...queryKeys.documents.lists(), spaceId] as const,
    details: () => [...queryKeys.documents.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.documents.details(), id] as const,
  },
};
```

This provides type-safe, hierarchical query keys for cache management.

### Import/Export Best Practices

**✅ DO:**

- Organize GraphQL documents by entity (spaces.graphql, documents.graphql)
- Create one hook file per entity (useSpaces.ts, useDocuments.ts)
- Use query key factories for type-safe cache invalidation
- Re-export base generated types from hooks for convenience
- Import UI types in hooks, but DON'T re-export them
- Keep UI type extensions in `types/ui/` separate from hooks
- Import from multiple sources in components (hooks + ui types)
- Invalidate queries after mutations for automatic refetching
- Use `enabled` option to prevent queries from running prematurely

**❌ DON'T:**

- Re-export UI types from hooks (creates cycle risk)
- Mix multiple entities in a single .graphql file
- Create hooks that query multiple unrelated entities
- Duplicate GraphQL types by redefining them manually
- Store GraphQL query results in Zustand (use React Query cache)
- Forget to invalidate queries after mutations
- Over-extend types with properties that could be computed
- Import from hooks in UI type files (breaks dependency flow)

### Safe Export Patterns

**✅ SAFE: Re-export generated types from hooks**

```typescript
// hooks/queries/useSpaces.ts
export type { Space, SpaceStatus } from '@/lib/api/generated'; // ✅ Safe
```

**Why safe:** Generated types have no dependencies on your code, so no cycle possible.

**❌ RISKY: Re-export UI types from hooks**

```typescript
// hooks/queries/useSpaces.ts
export type { SpaceListItem } from '@/types/ui'; // ❌ Creates cycle risk
```

**Why risky:** If UI types ever need hook types (e.g., hook return types), you get a cycle.

**✅ SAFE: Separate imports in components**

```typescript
import { useSpaces } from '@/hooks/queries/useSpaces';
import type { Space } from '@/hooks/queries/useSpaces'; // or from '@/lib/api/generated'
import type { SpaceListItem } from '@/types/ui';
```

**Why safe:** No circular dependency because imports are from separate, layered sources.

### SSE Streaming with Custom Hook

**NOT React Query** - Use custom hooks for streaming:

```typescript
// apps/web/src/hooks/useStreamingQuery.ts
import { useState, useEffect, useCallback } from 'react';

interface UseStreamingQueryOptions {
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

export function useStreamingQuery(options?: UseStreamingQueryOptions) {
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startStreaming = useCallback((query: string) => {
    setResponse('');
    setError(null);
    setIsStreaming(true);

    const eventSource = new EventSource(
      `/api/query/stream?query=${encodeURIComponent(query)}`
    );

    eventSource.onmessage = (event) => {
      const token = event.data;
      setResponse((prev) => prev + token);
    };

    eventSource.onerror = (err) => {
      setIsStreaming(false);
      eventSource.close();
      const error = new Error('Stream error');
      setError(error);
      options?.onError?.(error);
    };

    // Custom "done" event from backend signals completion
    eventSource.addEventListener('done', () => {
      setIsStreaming(false);
      eventSource.close();
      options?.onComplete?.(response);
    });

    return () => {
      eventSource.close();
      setIsStreaming(false);
    };
  }, [options, response]);

  return { response, isStreaming, error, startStreaming };
}

// Usage in component
function ThreadInterface() {
  const { response, isStreaming, startStreaming } = useStreamingQuery({
    onComplete: (fullResponse) => {
      // Optionally save to React Query cache after streaming completes
      queryClient.setQueryData(['query', queryId], fullResponse);
    },
  });

  return (
    <div>
      <button onClick={() => startStreaming('What are the key risks?')}>
        Ask Question
      </button>
      <div>{response}</div>
      {isStreaming && <span>Typing...</span>}
    </div>
  );
}
```

**Key principle**: React Query is for request/response patterns. Use custom hooks for streaming, then optionally cache results in React Query after streaming completes.

### Frontend Integration (EventSource API)

Backend SSE streaming integration:

```typescript
const eventSource = new EventSource(`/api/query/stream?query=${query}`);
eventSource.onmessage = (event) => {
  const token = event.data;
  setResponse((prev) => prev + token);
};
```

## Styling

**Tailwind CSS** with design system configuration:

- Theme defined in `tailwind.config.ts`
- CSS variables for theming in `app/globals.css`
- Shadcn components in `packages/ui` and `apps/web/src/components/ui`

**Class organization**: Group by type

```tsx
className="
  flex items-center justify-between  // Layout
  px-4 py-2 rounded-lg              // Spacing & borders
  bg-white shadow-sm                // Background & effects
  text-lg font-semibold             // Typography
  hover:bg-gray-50                  // Interactive states
"
```

## Common Workflows

### Adding a New Zustand Store

1. **Create store** in `apps/web/src/lib/stores/` or `apps/web/src/store/`
2. **Use devtools and persist middleware** for debugging and persistence
3. **Export from index**: `apps/web/src/lib/stores/index.ts`
4. **Never store server data** - use React Query instead

## Visual Design Implementation

When implementing UI features, always reference **[VISUAL_REFERENCES.md](../VISUAL_REFERENCES.md)** for accurate visual recreation of Athena Intelligence's interface.

### Quick Reference by Feature

| Feature Being Built      | Visual Assets                               | Reference Link                                                                    |
| ------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------- |
| **Dashboard Layout**     | Main dashboard, workspace views             | [Platform Overview](../VISUAL_REFERENCES.md#platform-overview--dashboard)         |
| **Chat/Query Interface** | Chat UI, toolkits, personas, context panels | [Chat Interface](../VISUAL_REFERENCES.md#chat-application-interface)              |
| **Notebook UI**          | AI sidebar, code cells, SQL queries         | [Notebooks](../VISUAL_REFERENCES.md#notebooks--query-interface)                   |
| **Document Upload**      | Drag-and-drop, file types, citations        | [Document Intelligence](../VISUAL_REFERENCES.md#document-intelligence--citations) |
| **Navigation/Sidebar**   | Spaces, workbench, settings                 | [Workbench](../VISUAL_REFERENCES.md#workbench--context-management)                |

### Integration with React Query

When building data-driven UI components, combine visual references with React Query patterns:

```tsx
// STEP 1: Review visual reference (e.g., chat-step3-toolkits.png)
// STEP 2: Create React Query hook for data
import { useQuery } from '@tanstack/react-query';

export function useToolkits() {
  return useQuery({
    queryKey: ['toolkits'],
    queryFn: () => fetchToolkits(),
  });
}

// STEP 3: Build UI component matching visual reference
import { Button, Card } from '@olympus/ui';
import { useToolkits } from '@/hooks/queries/useToolkits';

export function ToolkitSelector() {
  const { data: toolkits, isLoading } = useToolkits();

  // Match layout from screenshot: 2-column grid with outline buttons
  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium mb-2">Select Toolkit</h3>
      <div className="grid grid-cols-2 gap-2">
        {isLoading ? <Skeleton count={4} /> : null}
        {toolkits?.map((toolkit) => (
          <Button key={toolkit.id} variant="outline" size="sm">
            {toolkit.name}
          </Button>
        ))}
      </div>
    </Card>
  );
}
```

### Extracting Design Tokens from Screenshots

Use browser DevTools on [Athena docs](https://resources.athenaintel.com/docs/) to extract:

- **Colors**: Primary blues/purples, grays, accent colors
- **Spacing**: Padding/margin values (likely 4px/8px/16px/24px scale)
- **Border Radius**: Card rounding, button shapes
- **Typography**: Font families, sizes, weights
- **Shadows**: Card elevations, dropdown shadows

Store extracted values in your Tailwind config or CSS variables for consistency.

### Visual Reference Workflow

1. **Before coding**: Find relevant screenshots in VISUAL_REFERENCES.md
2. **During coding**: Keep screenshots open for reference
3. **After coding**: Compare your implementation side-by-side with screenshots
4. **Missing screenshots**: Visit [Athena docs](https://resources.athenaintel.com/docs/) directly

## Code Quality

### Linting

**Frontend (ESLint)**:

- Configuration: `apps/web/.eslintrc.json`
- Extends: `next/core-web-vitals`
- Run: `npm run lint`

### Type Checking

**Frontend**: TypeScript strict mode (`tsconfig.json`)

```bash
npm run type-check
```

### Pre-commit Hooks

Husky + lint-staged automatically:

1. Formats code with Prettier on staged files
2. Runs ESLint on frontend changes
