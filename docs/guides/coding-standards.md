# Development Instructions & Coding Preferences

This document outlines the coding standards, preferences, and guidelines for the Olympus MVP project.

## 📁 Project Structure

```
apps/
├── api/          # Python FastAPI backend
└── web/          # Next.js frontend
docs/
├── adr/          # Architecture Decision Records
packages/
├── config/       # Shared configuration
├── types/        # Shared TypeScript types
└── ui/           # Shared UI components
```

## 🎯 State Management Architecture

**Status**: As per [ADR-001](./docs/adr/001-state-management.md), we use a hybrid approach:

- **React Query**: Server state, API data, caching
- **Zustand**: Client state, UI state, authentication
- **React Hook Form**: Form state and validation
- **Yjs**: Real-time collaborative state

### State Management Guidelines

1. **Use React Query for**:
   - API data fetching
   - Server state caching
   - Background refetching
   - Optimistic updates

2. **Use Zustand for**:
   - UI state (sidebar, theme, modals)
   - Authentication state
   - Navigation state
   - Global app preferences

3. **Use local useState for**:
   - Component-specific state
   - Temporary UI state

## 🔧 TypeScript Preferences

### Import Organization

```typescript
// 1. React/Next.js imports
import React from 'react';
import { NextPage } from 'next';

// 2. External libraries
import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';

// 3. Internal imports (absolute paths preferred)
import { useAppStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';

// 4. Relative imports (only for closely related files)
import './styles.css';
```

### Type Definitions

```typescript
// Prefer interfaces for object shapes
interface User {
  id: string;
  email: string;
  name?: string;
}

// Use types for unions, primitives, computed types
type Theme = 'light' | 'dark' | 'system';
type UserWithProfile = User & { profile: Profile };
```

### Component Patterns

```typescript
// Prefer function components with TypeScript
interface ComponentProps {
  title: string
  isLoading?: boolean
  onSubmit: (data: FormData) => void
}

export function Component({ title, isLoading = false, onSubmit }: ComponentProps) {
  return <div>{title}</div>
}

// Use default export for pages, named exports for components
export default Component
```

## 🎨 Styling Guidelines

### Tailwind CSS Preferences

1. **Class Organization**: Group by type

```tsx
<div className="
  flex items-center justify-between  // Layout
  px-4 py-2 rounded-lg             // Spacing & borders
  bg-white shadow-sm               // Background & effects
  text-lg font-semibold           // Typography
  hover:bg-gray-50                // Interactive states
">
```

2. **Custom Components**: Use CSS variables for theming

```css
.button {
  @apply px-4 py-2 rounded-md font-medium transition-colors;
  @apply bg-primary text-primary-foreground;
  @apply hover:bg-primary/90;
}
```

3. **Responsive Design**: Mobile-first approach

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

## 🗂️ File Naming Conventions

### Frontend (Next.js)

```
components/
├── ui/               # Reusable UI components
│   ├── button.tsx
│   └── input.tsx
├── forms/            # Form components
│   └── login-form.tsx
└── layout/           # Layout components
    └── sidebar.tsx

lib/
├── stores/           # Zustand stores
│   ├── auth-store.ts
│   └── app-store.ts
├── query/            # React Query setup
│   ├── client.ts
│   └── provider.tsx
└── utils/            # Utility functions
    └── format.ts

app/                  # Next.js App Router
├── (auth)/           # Route groups
│   ├── login/
│   └── signup/
└── dashboard/
    └── page.tsx
```

### Backend (Python)

```
app/
├── models/           # Database models
├── routes/           # API routes
├── services/         # Business logic
├── auth/             # Authentication
└── utils/            # Utilities
```

## 🔍 Code Quality Standards

### ESLint & Prettier

- Follow the configured ESLint rules
- Use Prettier for consistent formatting
- Run `npm run lint` before committing

### TypeScript Strictness

- Enable strict mode: `"strict": true`
- Avoid `any` type - use `unknown` or proper types
- Use type assertions sparingly with `as` keyword

### Error Handling

```typescript
// Prefer Result types or explicit error handling
try {
  const result = await apiCall();
  return { success: true, data: result };
} catch (error) {
  return { success: false, error: error.message };
}

// Use React Query for API error handling
const { data, error, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
});
```

## 📝 Git Workflow

### Commit Messages

Follow Conventional Commits format:

```
feat(auth): add login with email verification
fix(ui): resolve sidebar toggle issue
docs(adr): add state management decision record
refactor(stores): migrate from Redux to Zustand
```

### Branch Naming

```
feature/auth-system
fix/sidebar-bug
docs/update-readme
refactor/state-management
```

### Pull Request Guidelines

1. Reference Linear issues: `Closes LOG-69`
2. Include ADR references when applicable
3. Add screenshots for UI changes
4. Ensure all tests pass
5. Request review from relevant team members

## 🧪 Testing Preferences

### Frontend Testing

```typescript
// Use React Testing Library patterns
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const renderWithQuery = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}
```

### Backend Testing

```python
# Use pytest with fixtures
import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def client():
    return TestClient(app)

def test_login_endpoint(client):
    response = client.post("/auth/login", json={
        "email": "test@example.com",
        "password": "password"
    })
    assert response.status_code == 200
```

## 📚 Documentation Standards

### Code Documentation

```typescript
/**
 * Fetches user data with caching and error handling
 * @param userId - The unique identifier for the user
 * @returns Promise resolving to user data or null if not found
 */
export async function fetchUser(userId: string): Promise<User | null> {
  // Implementation
}
```

### API Documentation

- Use OpenAPI/Swagger for API documentation
- Document all endpoints, parameters, and response types
- Include example requests and responses

### Component Documentation

```typescript
/**
 * Button component with loading and disabled states
 *
 * @example
 * <Button variant="primary" isLoading={true}>
 *   Save Changes
 * </Button>
 */
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  children: React.ReactNode;
}
```

## 🚀 Performance Guidelines

### React Performance

1. Use `React.memo` for expensive components
2. Implement proper key props for lists
3. Use `useCallback` and `useMemo` judiciously
4. Lazy load components with `React.lazy`

### Next.js Optimization

1. Use dynamic imports for code splitting
2. Optimize images with `next/image`
3. Implement proper caching strategies
4. Use ISR (Incremental Static Regeneration) when appropriate

### Bundle Size Management

1. Monitor bundle size with `npm run build`
2. Use tree shaking for unused code
3. Implement proper code splitting
4. Regular dependency audits

## 🔐 Security Guidelines

### Authentication

- Use JWT tokens with appropriate expiration
- Implement refresh token rotation
- Store tokens securely (httpOnly cookies for web)

### Data Validation

- Validate all inputs on both client and server
- Use Zod for TypeScript schema validation
- Sanitize user inputs to prevent XSS

### Environment Variables

- Never commit secrets to version control
- Use `.env.local` for local development
- Document required environment variables

## 📋 Development Workflow

### Before Starting Work

1. Check Linear for assigned issues
2. Create feature branch from `main`
3. Review relevant ADRs
4. Set up development environment

### During Development

1. Write tests alongside code
2. Run `npm run type-check` regularly
3. Follow commit message conventions
4. Update documentation as needed

### Before Submitting PR

1. Run full test suite
2. Check for TypeScript errors
3. Verify build passes
4. Update relevant documentation
5. Reference issue numbers in PR description

## 🎯 Code Review Checklist

### Reviewer Guidelines

- [ ] Code follows established patterns
- [ ] TypeScript types are properly defined
- [ ] Error handling is implemented
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] Performance implications considered
- [ ] Security considerations addressed
- [ ] Accessibility requirements met

---

## 📞 Getting Help

- **Technical Questions**: Ask in team chat or create GitHub discussion
- **Architecture Decisions**: Propose new ADR
- **Bug Reports**: Create Linear issue with reproduction steps
- **Documentation**: Update this file and relevant READMEs

---

_Last Updated: October 8, 2025_  
_Next Review: November 8, 2025_
