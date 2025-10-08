# ADR-001: Client-Side State Management Strategy

**Status**: Accepted  
**Date**: 2025-10-08  
**Deciders**: Engineering Team  
**Technical Story**: LOG-69 - State Management Setup

---

## Context

The Olympus MVP requires a robust client-side state management solution to handle:

1. **Server state**: Data from GraphQL API (spaces, documents, queries, users)
2. **Client state**: UI-specific state (theme, sidebar, modals, current selections)
3. **Real-time state**: Collaborative editing with Yjs (document synchronization)
4. **Form state**: Temporary input values and validation

The traditional approach would be to use Redux Toolkit for all state management. However, modern React applications benefit from **separating concerns** between different types of state.

## Decision

We will adopt a **hybrid state management approach**:

### 1. React Query (TanStack Query) for Server State

- All data fetched from the GraphQL API
- Automatic caching, refetching, and invalidation
- Loading/error states built-in
- Optimistic updates for mutations

### 2. Zustand for Client State

- UI-specific state (theme, navigation, modals)
- Global application state that doesn't come from the server
- Minimal boilerplate compared to Redux
- Built-in persistence for localStorage

### 3. Yjs for Real-time Collaboration

- Document synchronization via CRDT
- WebSocket-based state updates
- Custom hooks for collaborative features

### 4. React Hook Form for Form State

- Form validation and submission
- Temporary input state
- Integration with Zod for schema validation

### 5. React useState/useReducer for Local State

- Component-specific state
- Temporary UI state that doesn't need to be global

## Architecture

```
┌─────────────────────────────────────────────┐
│           STATE MANAGEMENT LAYERS           │
├─────────────────────────────────────────────┤
│                                             │
│  SERVER STATE → React Query                 │
│  - Spaces, Documents, Queries, Users        │
│  - Automatic caching & refetching           │
│  - 10kb bundle size                         │
│                                             │
│  CLIENT STATE → Zustand                     │
│  - Theme, Sidebar, Navigation               │
│  - Current space/document IDs               │
│  - Modal visibility                         │
│  - 1kb bundle size                          │
│                                             │
│  REAL-TIME → Yjs + Custom Hooks             │
│  - Document collaboration                   │
│  - User presence & cursors                  │
│                                             │
│  FORMS → React Hook Form                    │
│  - Form validation                          │
│  - Temporary inputs                         │
│                                             │
│  LOCAL → useState/useReducer                │
│  - Component-specific state                 │
└─────────────────────────────────────────────┘
```

## Rationale

### Why NOT Redux Toolkit?

**Cons of Redux for this project:**

1. **Redundant with React Query**: Redux would duplicate server state that React Query already handles better
2. **Boilerplate overhead**: Requires slices, actions, reducers, and thunks even for simple state
3. **Manual cache management**: No automatic refetching or cache invalidation
4. **Larger bundle size**: 13kb for Redux + Redux Toolkit vs 11kb total for React Query + Zustand
5. **Learning curve**: More concepts to learn (dispatch, reducers, middleware)

**Pros of Redux we're giving up:**

1. ~~Redux DevTools~~ → React Query DevTools + Zustand DevTools available
2. ~~Time-travel debugging~~ → Less critical for this MVP
3. ~~Industry standard~~ → React Query + Zustand is now the modern standard (2024)

### Why React Query?

**Pros:**

1. **Built for API data**: Designed specifically for server state
2. **Automatic caching**: Smart cache invalidation and refetching
3. **Loading states**: Built-in loading/error/success states
4. **Optimistic updates**: Easy to implement without manual state management
5. **Devtools**: React Query Devtools for debugging
6. **Wide adoption**: Used by Vercel, Twitch, Google, and thousands of companies

**Cons:**

1. Requires learning new patterns (but simpler than Redux)
2. Another dependency (but smaller than Redux)

### Why Zustand?

**Pros:**

1. **Minimal boilerplate**: No providers, actions, or reducers required
2. **Simple API**: Just `create()` and `set()`
3. **TypeScript-first**: Excellent type inference
4. **Tiny bundle**: Only 1kb gzipped
5. **Built-in persistence**: localStorage/sessionStorage middleware included
6. **No Provider needed**: Direct hook consumption (though React Query still needs one)

**Cons:**

1. Less well-known than Redux (but growing rapidly)
2. Fewer middleware options (but we don't need many)

### Comparison with Alternatives

| Feature        | Redux Toolkit  | React Query + Zustand | Context API      |
| -------------- | -------------- | --------------------- | ---------------- |
| Server State   | Manual         | Automatic ✅          | Manual           |
| Client State   | Good           | Excellent ✅          | OK               |
| Boilerplate    | High           | Minimal ✅            | Low              |
| Bundle Size    | 13kb           | 11kb ✅               | 0kb              |
| TypeScript     | Good           | Excellent ✅          | Good             |
| DevTools       | Redux DevTools | RQ DevTools ✅        | None             |
| Learning Curve | Steep          | Gentle ✅             | Easy             |
| Performance    | Optimized      | Optimized ✅          | Re-render issues |

## Consequences

### Positive

- **70% less boilerplate** compared to Redux approach
- **Automatic cache management** for all API data
- **Better developer experience** with less code to write
- **Smaller bundle size** (11kb vs 13kb)
- **Modern best practice** aligned with 2024 standards
- **Easier onboarding** for new developers

### Negative

- **Team learning curve** for React Query patterns (mitigated by excellent docs)
- **Less time-travel debugging** (acceptable for MVP)
- **Two libraries instead of one** for state management (but both are tiny)

### Neutral

- **Migration path exists**: Can add Redux later if needed (unlikely)
- **Not appropriate for all apps**: But perfect for API-driven applications like Olympus

## Implementation Plan

1. **Week 1 (LOG-69)**: Set up React Query + Zustand
2. **Week 1 (LOG-70)**: Create auth store with Zustand
3. **Week 3**: Implement GraphQL query hooks with React Query
4. **Week 4 (LOG-99)**: Add UI stores for query, editor, and modals

## References

- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [When to Use Redux](https://redux.js.org/faq/general#when-should-i-use-redux) - Even Redux docs suggest alternatives
- [You Might Not Need Redux](https://medium.com/@dan_abramov/you-might-not-need-redux-be46360cf367) - By Redux creator

## Approval

**Decision**: ✅ Accepted  
**Date**: 2025-10-08  
**Revisit Date**: After MVP launch (if needed)

---

_This ADR supersedes any previous decisions to use Redux Toolkit for state management._
