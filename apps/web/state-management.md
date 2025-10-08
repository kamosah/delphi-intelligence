# Zustand Tutorial: Essential Guide for Olympus MVP

A comprehensive guide to using Zustand for client-side state management in the Olympus MVP project.

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
