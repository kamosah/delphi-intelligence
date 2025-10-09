# State Management Guide: React Query + Zustand + JWT Authentication

A comprehensive guide to using React Query with Zustand for the Athena AI platform, featuring hybrid authentication architecture.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication System](#authentication-system)
3. [Zustand Core Concepts](#zustand-core-concepts)
4. [React Query Integration](#react-query-integration)
5. [GraphQL Client Setup](#graphql-client-setup)
6. [Best Practices](#best-practices)
7. [Common Patterns](#common-patterns)

---

## Architecture Overview

### Hybrid Authentication Approach

Our authentication system uses a **hybrid architecture** that separates concerns:

- **REST endpoints** for authentication operations (`/auth/login`, `/auth/refresh`, `/auth/logout`)
- **GraphQL endpoint** for all data operations (`/graphql`)
- **JWT tokens** stored in Zustand store + HTTP-only cookies
- **React Query** wraps GraphQL operations with automatic auth headers

This approach leverages our production-ready backend JWT system while maintaining the benefits of GraphQL for data operations.

### State Management Strategy

```typescript
// Server State (React Query)
const { data: spaces } = useSpaces(); // GraphQL data
const { data: documents } = useDocuments(); // GraphQL data

// Client State (Zustand)
const { user, tokens } = useAuthStore(); // JWT auth state
const { sidebarOpen, theme } = useUIStore(); // UI preferences
const { activeQuery } = useQueryStore(); // Query interface state

// Combined Usage
const currentSpace = spaces?.find((s) => s.id === currentSpaceId);
```

---

## Authentication System

### Auth Store (Zustand)

```typescript
// lib/stores/auth-store.ts
interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User) => void;
  setTokens: (tokens: TokenResponse) => void;
  logout: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),
      setTokens: ({ access_token, refresh_token }) =>
        set({
          accessToken: access_token,
          refreshToken: refresh_token,
        }),
      logout: () => {
        // Clear cookies
        deleteCookie('access_token');
        deleteCookie('refresh_token');
        // Clear store
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

### Auth Client (REST)

```typescript
// lib/api/auth-client.ts
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  },

  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    return response.json();
  },

  logout: async (accessToken: string): Promise<void> => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  },
};
```

---

## Zustand Core Concepts

### Simple Store Creation

```typescript
// store/ui-store.ts
interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  currentSpaceId: string | null;

  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setCurrentSpace: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'light',
  sidebarOpen: true,
  currentSpaceId: null,

  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setCurrentSpace: (currentSpaceId) => set({ currentSpaceId }),
}));
```

### Using Stores (No Prop Drilling!)

```typescript
// components/ThemeToggle.tsx
export function ThemeToggle() {
  const { theme, setTheme } = useUIStore()

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      {theme} mode
    </button>
  )
}

// components/Sidebar.tsx
export function Sidebar() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)

  return (
    <aside className={sidebarOpen ? 'w-64' : 'w-0'}>
      {/* Sidebar content */}
    </aside>
  )
}
```

---

## React Query Integration

### Query Client Setup

```typescript
// lib/react-query.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (
          error?.message?.includes('401') ||
          error?.message?.includes('403')
        ) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});
```

### Query Hooks with GraphQL

```typescript
// hooks/useSpaces.ts
import { useQuery } from '@tanstack/react-query'
import { makeGraphQLRequest } from '@/lib/api/graphql-client'

const SPACES_QUERY = `
  query GetSpaces {
    spaces {
      id
      name
      description
      createdAt
    }
  }
`

export function useSpaces() {
  return useQuery({
    queryKey: ['spaces'],
    queryFn: async () => {
      const response = await makeGraphQLRequest(SPACES_QUERY)
      return response.spaces
    },
  })
}

// Usage in components
export function SpacesList() {
  const { data: spaces, isLoading, error } = useSpaces()

  if (isLoading) return <div>Loading spaces...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul>
      {spaces?.map(space => (
        <li key={space.id}>{space.name}</li>
      ))}
    </ul>
  )
}
```

### Mutations with GraphQL

```typescript
// hooks/useCreateSpace.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { makeGraphQLRequest } from '@/lib/api/graphql-client'

const CREATE_SPACE_MUTATION = `
  mutation CreateSpace($input: CreateSpaceInput!) {
    createSpace(input: $input) {
      id
      name
      description
    }
  }
`

export function useCreateSpace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSpaceInput) => {
      const response = await makeGraphQLRequest(CREATE_SPACE_MUTATION, { input })
      return response.createSpace
    },
    onSuccess: () => {
      // Invalidate and refetch spaces
      queryClient.invalidateQueries({ queryKey: ['spaces'] })
    },
  })
}

// Usage in components
export function CreateSpaceForm() {
  const createSpace = useCreateSpace()

  const handleSubmit = async (formData: CreateSpaceInput) => {
    try {
      await createSpace.mutateAsync(formData)
      toast.success('Space created successfully!')
    } catch (error) {
      toast.error('Failed to create space')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button
        type="submit"
        disabled={createSpace.isPending}
      >
        {createSpace.isPending ? 'Creating...' : 'Create Space'}
      </button>
    </form>
  )
}
```

---

## GraphQL Client Setup

### Authenticated GraphQL Client

```typescript
// lib/api/graphql-client.ts
import { GraphQLClient } from 'graphql-request';
import { useAuthStore } from '@/lib/stores/auth-store';

let graphqlClient: GraphQLClient;

function createGraphQLClient() {
  return new GraphQLClient(process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT!, {
    headers: {},
  });
}

export function setAuthToken(token: string | null) {
  if (!graphqlClient) {
    graphqlClient = createGraphQLClient();
  }

  if (token) {
    graphqlClient.setHeader('authorization', `Bearer ${token}`);
  } else {
    graphqlClient.setHeader('authorization', '');
  }
}

export async function makeGraphQLRequest<T = any>(
  query: string,
  variables?: any
): Promise<T> {
  if (!graphqlClient) {
    graphqlClient = createGraphQLClient();

    // Auto-set auth token if available
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      setAuthToken(accessToken);
    }
  }

  try {
    return await graphqlClient.request<T>(query, variables);
  } catch (error) {
    // Handle auth errors
    if (error?.response?.status === 401) {
      // Attempt token refresh
      const { refreshToken } = useAuthStore.getState();
      if (refreshToken) {
        try {
          const newTokens = await authApi.refresh(refreshToken);
          useAuthStore.getState().setTokens(newTokens);
          setAuthToken(newTokens.access_token);

          // Retry the request
          return await graphqlClient.request<T>(query, variables);
        } catch (refreshError) {
          // Refresh failed, logout user
          useAuthStore.getState().logout();
          throw new Error('Session expired. Please login again.');
        }
      }
    }

    throw error;
  }
}
```

---

## Best Practices

### 1. Separate Server and Client State

```typescript
// ✅ GOOD: Clear separation
// Server State (React Query)
const { data: spaces } = useSpaces(); // From API
const { data: documents } = useDocuments(); // From API

// Client State (Zustand)
const currentSpaceId = useUIStore((state) => state.currentSpaceId); // UI state
const sidebarOpen = useUIStore((state) => state.sidebarOpen); // UI state

// Combine them
const currentSpace = spaces?.find((s) => s.id === currentSpaceId);

// ❌ BAD: Duplicating server state
const useSpaceStore = create((set) => ({
  spaces: [], // This should be in React Query!
  currentSpaceId: null, // This is OK (UI state)
}));
```

### 2. Use Multiple Small Stores

```typescript
// ✅ GOOD: Small, focused stores
useAuthStore(); // Authentication state
useUIStore(); // Theme, sidebar, navigation
useQueryStore(); // Query interface state
useEditorStore(); // Document editor state
useModalStore(); // Modal management

// ❌ BAD: One giant store
useAppStore(); // Everything mixed together!
```

### 3. Optimize with Selectors

```typescript
// ✅ GOOD: Only re-renders when theme changes
const theme = useUIStore((state) => state.theme);

// ❌ BAD: Re-renders on any UI store change
const uiStore = useUIStore();
const theme = uiStore.theme;
```

### 4. Handle Loading and Error States

```typescript
export function SpacesList() {
  const { data: spaces, isLoading, error, refetch } = useSpaces()

  if (isLoading) {
    return <SpacesListSkeleton />
  }

  if (error) {
    return (
      <div className="error-state">
        <p>Failed to load spaces: {error.message}</p>
        <button onClick={() => refetch()}>Try Again</button>
      </div>
    )
  }

  return (
    <div>
      {spaces?.map(space => (
        <SpaceCard key={space.id} space={space} />
      ))}
    </div>
  )
}
```

---

## Common Patterns

### Pattern 1: Auth Hook

```typescript
// hooks/useAuth.ts
export function useAuth() {
  const { user, isAuthenticated, setUser, setTokens, logout } = useAuthStore();

  const signIn = async (credentials: LoginCredentials) => {
    try {
      const response = await authApi.login(credentials);

      // Store tokens in cookies
      setCookie('access_token', response.tokens.access_token, {
        maxAge: 86400,
      });
      setCookie('refresh_token', response.tokens.refresh_token, {
        maxAge: 2592000,
      });

      // Update store
      setTokens(response.tokens);
      setUser(response.user);

      // Update GraphQL client
      setAuthToken(response.tokens.access_token);

      return response;
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const signOut = async () => {
    try {
      const { accessToken } = useAuthStore.getState();
      if (accessToken) {
        await authApi.logout(accessToken);
      }
    } finally {
      logout();
      setAuthToken(null);
    }
  };

  return {
    user,
    isAuthenticated,
    signIn,
    signOut,
  };
}
```

### Pattern 2: Optimistic Updates

```typescript
export function useUpdateSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSpaceApi,
    onMutate: async (updatedSpace) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['spaces'] });

      // Snapshot previous value
      const previousSpaces = queryClient.getQueryData(['spaces']);

      // Optimistically update
      queryClient.setQueryData(['spaces'], (old: Space[]) =>
        old?.map((space) =>
          space.id === updatedSpace.id ? { ...space, ...updatedSpace } : space
        )
      );

      return { previousSpaces };
    },
    onError: (err, updatedSpace, context) => {
      // Rollback on error
      queryClient.setQueryData(['spaces'], context?.previousSpaces);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
    },
  });
}
```

### Pattern 3: Conditional Queries

```typescript
export function useDocuments(spaceId?: string) {
  return useQuery({
    queryKey: ['documents', spaceId],
    queryFn: async () => {
      const response = await makeGraphQLRequest(DOCUMENTS_QUERY, { spaceId })
      return response.documents
    },
    enabled: !!spaceId, // Only run if spaceId exists
  })
}

// Usage
export function DocumentsList() {
  const currentSpaceId = useUIStore(state => state.currentSpaceId)
  const { data: documents, isLoading } = useDocuments(currentSpaceId)

  if (!currentSpaceId) {
    return <div>Select a space to view documents</div>
  }

  // ... rest of component
}
```

---

## Quick Reference

```typescript
// Auth Store
const { user, isAuthenticated } = useAuthStore();
const { signIn, signOut } = useAuth();

// UI Store
const theme = useUIStore((state) => state.theme);
const { setTheme, toggleSidebar } = useUIStore();

// React Query
const { data, isLoading, error } = useQuery({ queryKey, queryFn });
const mutation = useMutation({ mutationFn, onSuccess });

// GraphQL
const response = await makeGraphQLRequest(query, variables);
setAuthToken(token); // Set auth header
```

---

**Ready to build with our hybrid architecture!** 🚀

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Basic Store Creation](#basic-store-creation)
3. [Avoiding Prop Drilling](#avoiding-prop-drilling)
4. [State Updates (React Style)](#state-updates-react-style)
5. [State Updates (Immer Style)](#state-updates-immer-style)
6. [Selectors & Performance](#selectors--performance)
7. [Middleware (Persist, DevTools)](#middleware)
8. [Best Practices for Olympus](#best-practices)
9. [Common Patterns](#common-patterns)

---

## Core Concepts

### What is Zustand?

Zustand is a **small, fast, and scalable** state management solution. Unlike Redux:

- ❌ No providers needed (except React Query)
- ❌ No actions/reducers/dispatch
- ❌ No boilerplate
- ✅ Just hooks!

### Key Philosophy

```typescript
// Redux way (verbose)
dispatch({ type: 'INCREMENT', payload: 5 });

// Zustand way (simple)
increase(5);
```

---

## Basic Store Creation

### Simple Counter Example

```typescript
// store/counter-store.ts
import { create } from 'zustand';

interface CounterState {
  count: number;
  increase: (by: number) => void;
  decrease: (by: number) => void;
  reset: () => void;
}

export const useCounterStore = create<CounterState>((set) => ({
  // Initial state
  count: 0,

  // Actions (state updaters)
  increase: (by) => set((state) => ({ count: state.count + by })),
  decrease: (by) => set((state) => ({ count: state.count - by })),
  reset: () => set({ count: 0 }),
}));
```

### Using the Store (No Prop Drilling!)

```typescript
// components/Counter.tsx
import { useCounterStore } from '@/store/counter-store'

export function Counter() {
  const count = useCounterStore((state) => state.count)
  const increase = useCounterStore((state) => state.increase)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => increase(1)}>+1</button>
    </div>
  )
}

// components/ResetButton.tsx - Different component, same store!
import { useCounterStore } from '@/store/counter-store'

export function ResetButton() {
  const reset = useCounterStore((state) => state.reset)

  return <button onClick={reset}>Reset</button>
}
```

**No prop drilling needed!** Both components access the same store directly.

---

## Avoiding Prop Drilling

### Problem: Traditional Prop Drilling

```typescript
// ❌ Old way: Pass props through many levels
function App() {
  const [theme, setTheme] = useState('light')

  return <Layout theme={theme} setTheme={setTheme}>
    <Sidebar theme={theme} setTheme={setTheme}>
      <ThemeToggle theme={theme} setTheme={setTheme} />
    </Sidebar>
  </Layout>
}
```

### Solution: Zustand Store

```typescript
// ✅ Zustand way: No prop drilling
// store/ui-store.ts
export const useUIStore = create<UIState>((set) => ({
  theme: 'light',
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({
    theme: state.theme === 'light' ? 'dark' : 'light'
  })),
}))

// Any component can access it directly!
function ThemeToggle() {
  const { theme, toggleTheme } = useUIStore()
  return <button onClick={toggleTheme}>{theme}</button>
}
```

---

## State Updates (React Style)

### Direct Updates (Like useState)

```typescript
export const useUIStore = create<UIState>((set) => ({
  count: 0,
  name: 'Alice',

  // Direct replacement (like useState setter)
  setCount: (count) => set({ count }),
  setName: (name) => set({ name }),

  // Multiple fields at once
  updateUser: (count, name) => set({ count, name }),
}));
```

### Functional Updates (Access Previous State)

```typescript
export const useUIStore = create<UIState>((set) => ({
  count: 0,
  items: [],

  // Access previous state (like setState callback)
  increment: () => set((state) => ({ count: state.count + 1 })),
  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
    })),

  // Conditional updates based on current state
  incrementIfEven: () =>
    set((state) => {
      if (state.count % 2 === 0) {
        return { count: state.count + 1 };
      }
      return state; // No change
    }),
}));
```

### Nested Object Updates

```typescript
interface User {
  profile: {
    name: string;
    email: string;
    settings: {
      theme: string;
      notifications: boolean;
    };
  };
}

export const useUserStore = create<User>((set) => ({
  profile: {
    name: 'Alice',
    email: 'alice@example.com',
    settings: {
      theme: 'light',
      notifications: true,
    },
  },

  // Update nested field (manual spreading)
  updateTheme: (theme) =>
    set((state) => ({
      profile: {
        ...state.profile,
        settings: {
          ...state.profile.settings,
          theme,
        },
      },
    })),
}));
```

**Problem**: Manual spreading gets messy! Enter Immer...

---

## State Updates (Immer Style)

Zustand includes **Immer** for mutable-looking updates (like Redux Toolkit's createSlice).

### Basic Immer Updates

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface TodoState {
  todos: Array<{ id: string; text: string; done: boolean }>;
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  updateTodo: (id: string, text: string) => void;
}

export const useTodoStore = create<TodoState>()(
  immer((set) => ({
    todos: [],

    // Write "mutations" like you would in Redux Toolkit!
    addTodo: (text) =>
      set((state) => {
        state.todos.push({
          id: Math.random().toString(),
          text,
          done: false,
        });
      }),

    toggleTodo: (id) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === id);
        if (todo) {
          todo.done = !todo.done; // Direct mutation!
        }
      }),

    updateTodo: (id, text) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === id);
        if (todo) {
          todo.text = text; // Direct mutation!
        }
      }),
  }))
);
```

### Nested Updates with Immer (Easy!)

```typescript
export const useUserStore = create<User>()(
  immer((set) => ({
    profile: {
      name: 'Alice',
      email: 'alice@example.com',
      settings: {
        theme: 'light',
        notifications: true,
      },
    },

    // No spreading needed! Just mutate directly
    updateTheme: (theme) =>
      set((state) => {
        state.profile.settings.theme = theme;
      }),

    updateNotifications: (enabled) =>
      set((state) => {
        state.profile.settings.notifications = enabled;
      }),
  }))
);
```

### When to Use Immer vs. Regular Updates?

| Use Case                  | Recommendation  |
| ------------------------- | --------------- |
| Simple state (primitives) | Regular `set()` |
| Flat objects              | Regular `set()` |
| Nested objects            | **Immer**       |
| Arrays with mutations     | **Immer**       |
| Complex updates           | **Immer**       |

---

## Selectors & Performance

### Problem: Unnecessary Re-renders

```typescript
// ❌ BAD: Re-renders on ANY state change
function Component() {
  const store = useUIStore() // Gets entire store!
  return <div>{store.count}</div>
}
```

### Solution: Use Selectors

```typescript
// ✅ GOOD: Only re-renders when 'count' changes
function Component() {
  const count = useUIStore((state) => state.count)
  return <div>{count}</div>
}
```

### Multiple Values: Two Approaches

#### Approach 1: Separate Selectors (More Re-renders)

```typescript
function Component() {
  const count = useUIStore((state) => state.count)
  const theme = useUIStore((state) => state.theme)

  // Re-renders when count OR theme changes
  return <div className={theme}>{count}</div>
}
```

#### Approach 2: Object Selector with Shallow Compare

```typescript
import { shallow } from 'zustand/shallow'

function Component() {
  const { count, theme } = useUIStore(
    (state) => ({ count: state.count, theme: state.theme }),
    shallow // Only re-render if count OR theme changes
  )

  return <div className={theme}>{count}</div>
}
```

### Computed Values

```typescript
// In your store
export const useUIStore = create<UIState>((set, get) => ({
  count: 0,
  multiplier: 2,

  // Computed value (getter)
  get result() {
    return get().count * get().multiplier
  },

  increment: () => set((state) => ({ count: state.count + 1 })),
}))

// Usage
function Component() {
  const result = useUIStore((state) => state.result)
  return <div>{result}</div>
}
```

---

## Middleware

### Persist Middleware (localStorage)

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: true,
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),
    }),
    {
      name: 'olympus-ui-store', // localStorage key

      // Only persist specific fields
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
```

### DevTools Middleware

```typescript
import { devtools } from 'zustand/middleware';

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      count: 0,
      increment: () =>
        set((state) => ({ count: state.count + 1 }), false, 'increment'),
    }),
    { name: 'UI Store' }
  )
);
```

### Combine Multiple Middleware

```typescript
export const useUIStore = create<UIState>()(
  devtools(
    persist(
      immer((set) => ({
        // Your store here
      })),
      { name: 'olympus-ui-store' }
    ),
    { name: 'UI Store' }
  )
);
```

---

## Best Practices for Olympus

### 1. Separate Concerns (Multiple Small Stores)

```typescript
// ✅ GOOD: Small, focused stores
useUIStore(); // Theme, sidebar, navigation
useAuthStore(); // User, auth state
useQueryStore(); // Query UI state
useEditorStore(); // Editor UI state
useModalStore(); // Modal management

// ❌ BAD: One giant store
useAppStore(); // Everything in one store!
```

### 2. Never Duplicate Server State

```typescript
// ❌ BAD: Duplicating API data
const useSpaceStore = create((set) => ({
  spaces: [], // This should be in React Query!
  currentSpaceId: null, // This is OK (UI state)
}));

// ✅ GOOD: Separate concerns
// React Query handles server state
const { data: spaces } = useSpaces();

// Zustand handles UI state
const currentSpaceId = useUIStore((state) => state.currentSpaceId);

// Combine them
const currentSpace = spaces?.find((s) => s.id === currentSpaceId);
```

### 3. Use TypeScript

```typescript
// ✅ GOOD: Full type safety
interface UIState {
  theme: 'light' | 'dark' // Literal types
  count: number
  setTheme: (theme: 'light' | 'dark') => void
}

export const useUIStore = create<UIState>()(...)
```

### 4. Actions at the Store Level

```typescript
// ✅ GOOD: Actions in the store
export const useUIStore = create<UIState>((set) => ({
  theme: 'light',
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),
}));

// Usage
const toggleTheme = useUIStore((state) => state.toggleTheme);

// ❌ BAD: Logic in components
const theme = useUIStore((state) => state.theme);
const setTheme = useUIStore((state) => state.setTheme);
const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
```

---

## Common Patterns

### Pattern 1: Reset Store

```typescript
const initialState = {
  count: 0,
  name: '',
  items: [],
};

export const useStore = create<State>((set) => ({
  ...initialState,

  reset: () => set(initialState),
}));
```

### Pattern 2: Async Actions

```typescript
export const useStore = create<State>((set) => ({
  data: null,
  isLoading: false,
  error: null,

  fetchData: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      set({ data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
```

**Note**: For API data, prefer React Query! This is only for client-side async operations.

### Pattern 3: Subscribe to Store Changes

```typescript
// Outside React components
useStore.subscribe(
  (state) => state.theme,
  (theme) => {
    console.log('Theme changed to:', theme);
    document.body.className = theme;
  }
);
```

### Pattern 4: Get State Outside React

```typescript
// Get current state without subscribing
const currentTheme = useUIStore.getState().theme;

// Update state without React
useUIStore.setState({ theme: 'dark' });
```

---

## Quick Reference Card

```typescript
// Create store
const useStore = create<State>((set, get) => ({
  // State
  count: 0,

  // Actions
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 }),

  // Computed
  get double() {
    return get().count * 2;
  },
}));

// Use in components
const count = useStore((state) => state.count); // Selector
const { count, increment } = useStore(); // Get all (not recommended)
const increment = useStore((state) => state.increment); // Get action

// With middleware
create()(
  persist(
    immer((set) => ({
      // Your store
    })),
    { name: 'store-name' }
  )
);
```

---

## Next Steps

1. Start with **LOG-69** - Set up your first Zustand store (UI store)
2. Add **LOG-70** - Create auth store
3. Practice with simple counters/toggles
4. Build **LOG-99** - Query, Editor, and Modal stores
5. Read [Zustand docs](https://github.com/pmndrs/zustand) for advanced patterns

**You're ready to build with Zustand!** 🎉
