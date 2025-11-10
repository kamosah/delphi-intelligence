# Frontend Component Organization Best Practices

This guide establishes **general patterns** for organizing complex components in the Olympus frontend, applicable to tables, navigation, forms, modals, and any feature with multiple moving parts.

## Core Principles

### 1. Feature-Based Colocation

**Keep related code together.** All files for a feature should live in the same directory.

### 2. Shared Types in Packages

**Common interfaces belong in `@olympus/types`.** This enables reuse across web, mobile, and other apps in the monorepo.

### 3. Composable Components

**Break down complexity into smaller, reusable pieces.** Build atomic components that compose into larger features.

### 4. Colocated Utilities

**Keep helper functions with the components that use them.** No need for centralized utility folders unless the utility is truly global.

### 5. Configuration-Driven

**Separate data from UI logic.** Use configuration objects/arrays for declarative component structures.

---

## File Organization Pattern

### General Structure

```
apps/web/src/components/[feature]/
├── [Feature].tsx                    # Main feature component (PascalCase)
├── [Feature]Item.tsx                # Composable sub-component (PascalCase)
├── [Feature]Section.tsx             # Composable grouping component (PascalCase)
├── [feature]-config.ts              # Configuration data (kebab-case)
├── [feature]-utils.ts               # Utility functions (kebab-case)
├── [feature]-types.ts               # Feature-specific types (kebab-case, optional)
└── [feature]-actions.tsx            # Extracted actions/menus (kebab-case, if needed)

packages/types/src/
├── [feature].ts                     # Shared types for reuse
└── index.ts                         # Re-export
```

### Naming Conventions

| File Type      | Convention | Example                                     |
| -------------- | ---------- | ------------------------------------------- |
| Main component | PascalCase | `AppSidebar.tsx`, `OrganizationMembers.tsx` |
| Sub-components | PascalCase | `NavItem.tsx`, `TableRow.tsx`               |
| Configuration  | kebab-case | `sidebar-navigation.ts`, `table-columns.ts` |
| Utilities      | kebab-case | `sidebar-utils.ts`, `form-validation.ts`    |
| Types (local)  | kebab-case | `form-types.ts`                             |
| Types (shared) | kebab-case | `packages/types/src/navigation.ts`          |

**Rationale**:

- PascalCase for React components (standard convention)
- kebab-case for configs/utils (semantic distinction, cross-platform safe)

---

## Pattern Examples

### Example 1: Navigation Components (Current Implementation)

```
apps/web/src/components/layout/
├── AppSidebar.tsx                   # Main sidebar (169 lines)
├── NavItem.tsx                      # Composable nav item
├── NavSection.tsx                   # Composable nav section
├── sidebar-navigation.ts            # Nav configs (DASHBOARD_NAV_ITEMS, etc.)
└── sidebar-utils.ts                 # resolveHref(), isNavItemActive()

packages/types/src/
├── navigation.ts                    # NavItem, NavSection interfaces
└── index.ts                         # Export types
```

**Benefits:**

- Everything navigation-related in `components/layout/`
- NavItem/NavSection reusable in mobile nav, breadcrumbs
- Types shared across apps via `@olympus/types`
- AppSidebar is clean and composable (54% smaller)

---

### Example 2: Table Components (Current Implementation)

```
apps/web/src/components/organizations/
├── OrganizationMembers.tsx                    # Main table component
├── organization-members-columns.tsx           # Column definitions
├── organization-members-row-actions.tsx       # Extracted row actions
└── organization-members-utils.ts              # (Future) Utility functions

packages/types/src/
├── tables.ts                                  # (Future) Shared table types
└── index.ts
```

**Benefits:**

- All org members table code in one place
- Column definitions separate from component logic
- Row actions extracted when >50 lines (composability)
- Easy to add utils when needed

---

### Example 3: Form Components (Recommended Pattern)

```
apps/web/src/components/forms/
├── CreateSpaceForm.tsx                        # Main form component
├── FormField.tsx                              # Reusable form field
├── FormSection.tsx                            # Reusable form section
├── space-form-schema.ts                       # Zod validation schema
└── space-form-utils.ts                        # Utility functions

packages/types/src/
├── forms.ts                                   # FormField, FormSection types
└── index.ts
```

**Example Implementation:**

```typescript
// space-form-schema.ts
import { z } from 'zod';

export const createSpaceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  visibility: z.enum(['public', 'private']),
});

export type CreateSpaceFormData = z.infer<typeof createSpaceSchema>;
```

```typescript
// space-form-utils.ts
export function formatSpaceData(data: CreateSpaceFormData) {
  return {
    ...data,
    slug: data.name.toLowerCase().replace(/\s+/g, '-'),
  };
}
```

```tsx
// CreateSpaceForm.tsx
import { FormField, FormSection } from './FormField';
import { createSpaceSchema } from './space-form-schema';
import { formatSpaceData } from './space-form-utils';

export function CreateSpaceForm() {
  // Form logic using extracted schema and utils
}
```

---

### Example 4: Modal/Dialog Components (Recommended Pattern)

```
apps/web/src/components/dialogs/
├── ConfirmDialog.tsx                          # Reusable confirm dialog
├── CreateItemDialog.tsx                       # Specific dialog
├── dialog-content.ts                          # Dialog content configs
└── dialog-utils.ts                            # Dialog helpers

packages/types/src/
├── dialogs.ts                                 # DialogConfig, DialogAction types
└── index.ts
```

**Example Implementation:**

```typescript
// dialog-content.ts
import type { DialogConfig } from '@olympus/types';

export const DELETE_SPACE_DIALOG: DialogConfig = {
  id: 'delete-space',
  title: 'Delete Space',
  description:
    'Are you sure you want to delete this space? This action cannot be undone.',
  confirmLabel: 'Delete',
  confirmVariant: 'destructive',
  cancelLabel: 'Cancel',
};
```

```tsx
// ConfirmDialog.tsx
import type { DialogConfig } from '@olympus/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  Button,
} from '@olympus/ui';

interface ConfirmDialogProps {
  config: DialogConfig;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  config,
  open,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {config.cancelLabel}
          </Button>
          <Button variant={config.confirmVariant} onClick={onConfirm}>
            {config.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## When to Extract Components

### Extract When:

1. **Component >200 lines**: Break into smaller pieces
2. **Logic repeated 2+ times**: Extract reusable component
3. **Complex sub-section**: Extract for clarity (e.g., row actions)
4. **Multiple render paths**: Extract variants into separate components

### Don't Extract When:

1. **Only used once**: Keep inline unless it helps readability
2. **Tightly coupled**: If extraction creates more complexity than it solves
3. **Simple JSX**: A few lines of JSX don't need extraction

**Example - When to Extract:**

```tsx
// ❌ Bad: Inline, repeated, complex
export function UserProfile() {
  return (
    <div>
      {/* 50 lines of avatar rendering */}
      {/* 40 lines of user stats */}
      {/* 60 lines of activity feed */}
    </div>
  );
}

// ✅ Good: Extracted, composable, clear
export function UserProfile() {
  return (
    <div>
      <UserAvatar />
      <UserStats />
      <ActivityFeed />
    </div>
  );
}
```

---

## When to Extract Configs

### Extract When:

1. **Array/object >20 lines**: Move to separate file
2. **Used in multiple places**: Centralize configuration
3. **Frequently changes**: Easier to find/modify in dedicated file
4. **Business logic**: Separate from UI rendering

### Example - Config Extraction:

```tsx
// ❌ Bad: Config inline, mixed with UI
export function Sidebar() {
  const items = [
    { id: 'spaces', icon: Database, label: 'Spaces', href: '/spaces' },
    { id: 'threads', icon: MessageSquare, label: 'Threads', href: '/threads' },
    // ... 20 more items
  ];

  return (
    <nav>
      {items.map((item) => (
        <NavItem key={item.id} {...item} />
      ))}
    </nav>
  );
}

// ✅ Good: Config extracted, UI clean
import { SIDEBAR_ITEMS } from './sidebar-navigation';

export function Sidebar() {
  return (
    <nav>
      {SIDEBAR_ITEMS.map((item) => (
        <NavItem key={item.id} {...item} />
      ))}
    </nav>
  );
}
```

---

## When to Extract Utilities

### Extract When:

1. **Function used 2+ times**: DRY principle
2. **Complex logic**: Easier to test in isolation
3. **Pure function**: No dependencies on component state
4. **Domain logic**: Business rules separate from UI

### Example - Utility Extraction:

```tsx
// ❌ Bad: Logic scattered, duplicated
export function NavItem({ href, orgId }) {
  const resolved = typeof href === 'function' ? href(orgId) : href;
  // Used in 5 different places
}

// ✅ Good: Utility extracted, reusable, testable
import { resolveHref } from './sidebar-utils';

export function NavItem({ href, orgId }) {
  const resolved = resolveHref(href, orgId);
}
```

```typescript
// sidebar-utils.ts
export function resolveHref(
  href: string | ((orgId: string) => string),
  orgId?: string
): string {
  if (typeof href === 'function') {
    return orgId ? href(orgId) : '#';
  }
  return href;
}
```

---

## Shared Types in Packages

### What Belongs in `@olympus/types`:

1. **Interfaces used across apps**: Web, mobile, admin
2. **Common domain models**: User, Organization, Space
3. **Shared component props**: Form fields, nav items, table columns
4. **API response types**: GraphQL types (generated separately)

### What Stays Local:

1. **Component-specific props**: Only used in one component
2. **Internal state types**: Not exposed outside component
3. **Utility function types**: Colocated with the function

**Example:**

```typescript
// ✅ packages/types/src/navigation.ts (shared)
export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string | ((orgId: string) => string);
}

// ✅ apps/web/src/components/layout/NavItem.tsx (local)
interface NavItemProps {
  item: NavItem; // Uses shared type
  isActive: boolean; // Local prop
  iconMode: boolean; // Local prop
}
```

---

## Real-World Refactoring Example

### Before: Monolithic Component

```tsx
// AppSidebar.tsx (369 lines)
export function AppSidebar() {
  // 90 lines of navigation config arrays
  const DASHBOARD_ITEMS = [...];
  const SETTINGS_SECTIONS = [...];

  // 30 lines of utility functions
  const resolveHref = (href, orgId) => { ... };
  const isActive = (item, pathname) => { ... };

  // 249 lines of JSX rendering
  return (
    <aside>
      {/* Inline nav item rendering */}
      {items.map(item => (
        <Tooltip>
          <Button>
            <Icon />
            <span>{item.label}</span>
          </Button>
        </Tooltip>
      ))}
    </aside>
  );
}
```

**Problems:**

- Hard to find specific parts (config vs logic vs UI)
- Can't reuse nav items elsewhere
- Can't test utilities independently
- 369 lines is too long to scan quickly

### After: Composable Components

```tsx
// AppSidebar.tsx (169 lines - 54% smaller!)
import { NavItem } from './NavItem';
import { NavSection } from './NavSection';
import { DASHBOARD_NAV_ITEMS, SETTINGS_NAV_SECTIONS } from './sidebar-navigation';
import { resolveHref, isNavItemActive } from './sidebar-utils';

export function AppSidebar() {
  const orgId = currentOrganization?.id;

  return (
    <aside>
      {DASHBOARD_NAV_ITEMS.map(item => (
        <NavItem
          key={item.id}
          item={item}
          href={resolveHref(item.href, orgId)}
          isActive={isNavItemActive(item, pathname, orgId)}
        />
      ))}
    </aside>
  );
}

// NavItem.tsx (60 lines)
export function NavItem({ item, isActive, href }) {
  return (
    <Tooltip>
      <Button>
        <item.icon />
        <span>{item.label}</span>
      </Button>
    </Tooltip>
  );
}

// sidebar-navigation.ts (80 lines)
export const DASHBOARD_NAV_ITEMS: NavItem[] = [...];
export const SETTINGS_NAV_SECTIONS: NavSection[] = [...];

// sidebar-utils.ts (40 lines)
export function resolveHref(href, orgId) { ... }
export function isNavItemActive(item, pathname, orgId) { ... }
```

**Benefits:**

- AppSidebar is 54% smaller and easier to understand
- NavItem is reusable (mobile nav, breadcrumbs, etc.)
- Configs are easy to find and modify
- Utils are testable in isolation
- Everything related to sidebar is still in `components/layout/`

---

## Testing Strategy

### Component Tests

```typescript
// NavItem.test.tsx
import { render, screen } from '@testing-library/react';
import { NavItem } from './NavItem';
import { Database } from 'lucide-react';

describe('NavItem', () => {
  it('renders item label', () => {
    const item = { id: 'test', label: 'Test', icon: Database, href: '/test' };
    render(<NavItem item={item} isActive={false} iconMode={false} href="/test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('applies active styles when active', () => {
    const item = { id: 'test', label: 'Test', icon: Database, href: '/test' };
    render(<NavItem item={item} isActive={true} iconMode={false} href="/test" />);
    expect(screen.getByRole('link')).toHaveClass('bg-blue-50');
  });
});
```

### Config Tests

```typescript
// sidebar-navigation.test.ts
import { DASHBOARD_NAV_ITEMS } from './sidebar-navigation';

describe('Dashboard Navigation Config', () => {
  it('should have unique IDs', () => {
    const ids = DASHBOARD_NAV_ITEMS.map((item) => item.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('should have icons for all items', () => {
    DASHBOARD_NAV_ITEMS.forEach((item) => {
      expect(item.icon).toBeDefined();
    });
  });
});
```

### Utility Tests

```typescript
// sidebar-utils.test.ts
import { resolveHref, isNavItemActive } from './sidebar-utils';

describe('resolveHref', () => {
  it('resolves static href', () => {
    expect(resolveHref('/dashboard', 'org-123')).toBe('/dashboard');
  });

  it('resolves dynamic href with orgId', () => {
    const dynamicHref = (orgId: string) => `/org/${orgId}`;
    expect(resolveHref(dynamicHref, 'org-123')).toBe('/org/org-123');
  });

  it('returns # for dynamic href without orgId', () => {
    const dynamicHref = (orgId: string) => `/org/${orgId}`;
    expect(resolveHref(dynamicHref, undefined)).toBe('#');
  });
});
```

---

## Migration Checklist

When refactoring an existing component, follow these steps:

### Phase 1: Extract Types (Low Risk)

- [ ] Create shared types in `packages/types/src/[feature].ts`
- [ ] Export from `packages/types/src/index.ts`
- [ ] Update component to import from `@olympus/types`

### Phase 2: Extract Configs (Low Risk)

- [ ] Create `[feature]-config.ts` in component directory
- [ ] Move configuration arrays/objects to config file
- [ ] Export named constants (SCREAMING_SNAKE_CASE)
- [ ] Import configs in main component

### Phase 3: Extract Utils (Low Risk)

- [ ] Create `[feature]-utils.ts` in component directory
- [ ] Move pure functions to utils file
- [ ] Add TypeScript types to functions
- [ ] Import utils in main component

### Phase 4: Extract Sub-Components (Medium Risk)

- [ ] Identify repeated JSX patterns
- [ ] Create `[Feature]Item.tsx`, `[Feature]Section.tsx`, etc.
- [ ] Move JSX to sub-components with proper props
- [ ] Update main component to use sub-components

### Phase 5: Test & Refine (Low Risk)

- [ ] Add tests for configs (structure validation)
- [ ] Add tests for utils (function behavior)
- [ ] Add tests for components (rendering, interactions)
- [ ] Verify no regressions in UI behavior

---

## Quick Reference

### Decision Tree: Should I Extract?

```
Is the code >100 lines?
├─ Yes → Extract into multiple files
└─ No → Is it used in 2+ places?
   ├─ Yes → Extract as reusable component/util
   └─ No → Is it a distinct concern (config vs logic vs UI)?
      ├─ Yes → Extract for clarity
      └─ No → Keep inline
```

### File Naming Quick Guide

| Type      | Pattern                 | Example                 |
| --------- | ----------------------- | ----------------------- |
| Component | PascalCase              | `NavItem.tsx`           |
| Config    | `[feature]-config.ts`   | `sidebar-navigation.ts` |
| Utils     | `[feature]-utils.ts`    | `sidebar-utils.ts`      |
| Types     | `[feature]-types.ts`    | `form-types.ts`         |
| Actions   | `[feature]-actions.tsx` | `table-row-actions.tsx` |

### Import Pattern

```tsx
// External dependencies
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// Internal shared packages
import { Button, Card } from '@olympus/ui';
import type { NavItem } from '@olympus/types';

// Relative imports (colocated)
import { NavItem } from './NavItem';
import { DASHBOARD_NAV_ITEMS } from './sidebar-navigation';
import { resolveHref } from './sidebar-utils';
```

---

## Summary

### Core Patterns

1. **Feature-based colocation** - Keep related code together
2. **Shared types in packages** - Reuse across apps via `@olympus/types`
3. **Composable components** - Build small, reusable pieces
4. **Configuration-driven** - Separate data from UI
5. **Colocated utilities** - Keep helpers with features

### File Organization

- **Components**: PascalCase (e.g., `NavItem.tsx`)
- **Configs**: kebab-case (e.g., `sidebar-navigation.ts`)
- **Utils**: kebab-case (e.g., `sidebar-utils.ts`)
- **Shared types**: `packages/types/src/`

### When to Extract

- **Extract configs**: Arrays/objects >20 lines
- **Extract utils**: Functions used 2+ times or complex logic
- **Extract components**: Sections >50 lines or repeated patterns
- **Extract types**: Interfaces used across multiple apps

### Benefits

- ✅ Easier to find and modify code
- ✅ Smaller, more maintainable files
- ✅ Reusable components and utilities
- ✅ Testable in isolation
- ✅ Type-safe across the codebase
- ✅ Scales as the app grows

This pattern applies to **all complex components**: navigation, tables, forms, modals, dashboards, and any feature with multiple moving parts.
