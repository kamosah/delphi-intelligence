# Quick Reference - Coding Preferences

## State Management (per ADR-001)

- **React Query**: Server state, API calls, caching
- **Zustand**: Client state, UI state, auth state
- **React Hook Form**: Forms and validation
- **useState**: Component-local state only

## TypeScript

```typescript
// Imports: React → External → Internal → Relative
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/stores'
import './component.css'

// Interfaces for objects, types for unions
interface User { id: string; email: string }
type Theme = 'light' | 'dark' | 'system'

// Function components with props interface
interface Props {
  title: string
  onClick: (id: string) => void
}

export function Component({ title, onClick }: Props) {
  return <button onClick={() => onClick('123')}>{title}</button>
}
```

## File Structure

```
src/
├── lib/
│   ├── stores/         # Zustand stores (auth-store.ts, app-store.ts)
│   ├── query/          # React Query setup (client.ts, provider.tsx)
│   └── utils/          # Utility functions
├── components/
│   ├── ui/             # Reusable components (button.tsx, input.tsx)
│   ├── forms/          # Form components (login-form.tsx)
│   └── layout/         # Layout components (sidebar.tsx)
└── app/                # Next.js pages
```

## Naming Conventions

- **Files**: kebab-case (`auth-store.ts`, `login-form.tsx`)
- **Components**: PascalCase (`LoginForm`, `UserProfile`)
- **Functions**: camelCase (`fetchUser`, `handleSubmit`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)

## Git Commits

```
feat(auth): add login with email verification
fix(ui): resolve sidebar toggle issue
docs(adr): add state management decision
refactor(stores): migrate from Redux to Zustand
```

## Quick Commands

```bash
# Development
npm run dev              # Start dev server
npm run type-check       # Check TypeScript
npm run lint             # Run ESLint
npm run build            # Build for production

# Testing
npm run test             # Run tests
npm run test:watch       # Watch mode
```

## State Usage Examples

```typescript
// Zustand stores
const { sidebarOpen, toggleSidebar } = useAppStore();
const { user, isAuthenticated, logout } = useAuthStore();

// React Query
const { data, isLoading, error } = useQuery({
  queryKey: ['users', userId],
  queryFn: () => fetchUser(userId),
});

const mutation = useMutation({
  mutationFn: createUser,
  onSuccess: () => queryClient.invalidateQueries(['users']),
});
```

## Common Patterns

```typescript
// Error boundaries
const { data, error } = useQuery(...)
if (error) return <ErrorComponent error={error} />

// Loading states
if (isLoading) return <LoadingSpinner />

// Conditional rendering
{isAuthenticated ? <Dashboard /> : <LoginForm />}

// Event handlers
const handleSubmit = useCallback((data: FormData) => {
  mutation.mutate(data)
}, [mutation])
```
