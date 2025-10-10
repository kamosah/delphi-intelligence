# Storybook Setup for Layout Components

## Overview

This document describes the Storybook setup for app-specific layout components in `apps/web`. These stories complement the design system component stories in `packages/ui` by documenting application-level components that use state management and routing.

## Components with Stories

### 1. Header Component

**Location**: `src/components/layout/Header.tsx`  
**Stories**: `src/components/layout/Header.stories.tsx`

The Header component includes:

- Olympus branding and logo
- Theme toggle (light/dark mode)
- User dropdown menu with account actions
- Mobile hamburger menu button
- Integration with `useUIStore` for state management

**Stories Created**:

- **Default**: Light mode header with all features
- **Dark Mode**: Header in dark theme (toggle in toolbar)
- **Mobile**: Responsive header on mobile viewport

### 2. Sidebar Component

**Location**: `src/components/layout/Sidebar.tsx`  
**Stories**: `src/components/layout/Sidebar.stories.tsx`

The Sidebar component includes:

- Animated expand/collapse functionality (using Framer Motion)
- Navigation items with icons and labels
- Tooltips for collapsed state
- Integration with `useUIStore` for open/closed state
- Smooth width transitions (256px expanded, 80px collapsed)

**Stories Created**:

- **Expanded**: Full sidebar with all labels visible
- **Dark Mode**: Sidebar in dark theme
- **Interactive**: Demo of interactive behavior and hover states

## Configuration

### Storybook Configuration

**Location**: `.storybook/main.ts`

```typescript
{
  framework: '@storybook/nextjs',
  addons: [
    '@storybook/addon-essentials',
    '@chromatic-com/storybook',
    '@storybook/addon-a11y'
  ],
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)']
}
```

### Preview Configuration

**Location**: `.storybook/preview.tsx`

Features:

- Global CSS import (`globals.css`)
- Dark mode toggle in toolbar
- Next.js App Router support
- Theme decorator for document class manipulation

## State Management

### Zustand Store Mock

The layout components use `useUIStore` from Zustand. In Storybook:

1. **Real State**: Stories use the actual Zustand store, allowing interactive demos
2. **Theme**: Controlled via Storybook's theme toolbar addon
3. **Sidebar State**: Reflects the default store state (expanded by default)

### Why Not Mock?

Unlike unit tests, Storybook stories benefit from using real state management:

- **Interactive demos**: Users can see actual behavior
- **State persistence**: State changes persist across story navigation
- **Realistic testing**: Closer to production behavior
- **Developer experience**: Easier to maintain without complex mocks

## Running Storybook

### Start Development Server

```bash
# From workspace root
npm run storybook --workspace=@olympus/web

# Or from apps/web
cd apps/web
npm run storybook
```

Storybook will start at: http://localhost:6006/

### Build Static Storybook

```bash
# From workspace root
npm run build-storybook --workspace=@olympus/web

# Or from apps/web
cd apps/web
npm run build-storybook
```

Output directory: `storybook-static/`

## Design Decisions

### 1. Framework-Specific Imports

✅ **Do**: Import from `@storybook/nextjs`
❌ **Don't**: Import from `@storybook/react`

```typescript
// Correct
import type { Meta, StoryObj } from '@storybook/nextjs';

// Incorrect - causes linting errors
import type { Meta, StoryObj } from '@storybook/react';
```

### 2. Story Documentation

All stories include JSDoc comments that appear in Storybook's docs panel:

```typescript
/**
 * Default header in light mode.
 * Shows the Olympus branding, theme toggle, and user menu.
 */
export const Default: Story = {};
```

### 3. Layout Decorator

The Sidebar stories use a decorator to simulate the layout:

```typescript
decorators: [
  (Story) => (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Story />
      <div style={{ flex: 1, padding: '20px' }}>
        <h1>Main Content Area</h1>
      </div>
    </div>
  ),
]
```

This provides context for how the sidebar appears in the actual app.

### 4. CSS Variables for Theming

Stories use CSS variables for colors instead of hardcoded values:

```typescript
// Respects theme
style={{ background: 'var(--background)', color: 'var(--foreground)' }}

// Don't use hardcoded colors
style={{ background: '#f5f5f5', color: '#000' }}
```

## Dependencies

### Required Packages

- `@storybook/nextjs`: ^9.1.10
- `@storybook/addon-essentials`: ^9.1.10
- `@chromatic-com/storybook`: ^3.3.3
- `@storybook/addon-a11y`: ^9.1.10
- `storybook`: ^9.1.10

### Component Dependencies

- `@olympus/ui`: Design system components
- `zustand`: State management
- `framer-motion`: Animations (Sidebar)
- `lucide-react`: Icons
- `next`: Framework

## Known Issues

### Framer Motion Emotion Peer Dependency

**Warning**: `Module not found: Error: Can't resolve '@emotion/is-prop-valid'`

**Impact**: No functional impact - Storybook still runs successfully  
**Cause**: Framer Motion's optional peer dependency on Emotion  
**Resolution**: Can be safely ignored or add `@emotion/is-prop-valid` to dependencies

```bash
npm install --save-dev @emotion/is-prop-valid
```

## Integration with Design System

### Component Hierarchy

```
apps/web/
├── src/components/layout/
│   ├── Header.tsx          → Uses @olympus/ui components
│   ├── Header.stories.tsx
│   ├── Sidebar.tsx         → Uses @olympus/ui components
│   └── Sidebar.stories.tsx

packages/ui/
├── src/components/         → Base design system components
│   ├── button.tsx
│   ├── dropdown-menu.tsx
│   ├── tooltip.tsx
│   └── ...
└── .storybook/             → Separate Storybook for UI components
```

### Import Pattern

Layout components import from `@olympus/ui`:

```typescript
import { Button, DropdownMenu, Tooltip } from '@olympus/ui';
```

This ensures:

- ✅ Single source of truth for UI components
- ✅ Consistent styling and behavior
- ✅ Shared theme variables
- ✅ Easier maintenance and updates

## Next Steps

### Optional Enhancements

1. **Add More Stories**
   - Header with notifications
   - Header with search bar
   - Sidebar with badges on nav items
   - Sidebar with nested navigation

2. **Add Interactions**
   - Use `@storybook/test` for play functions
   - Test user flows (click, hover, navigate)
   - Verify accessibility with keyboard navigation

3. **Add Controls**
   - Make username configurable
   - Toggle notification count
   - Customize navigation items

4. **Deploy to Chromatic**
   - Visual regression testing
   - Design review workflow
   - Publish component documentation

5. **Add Performance Stories**
   - Test animation performance
   - Measure render times
   - Optimize bundle size

## Related Documentation

- [Design System README](../../packages/ui/README.md)
- [LOG-112 Summary](../../LOG-112-SUMMARY.md)
- [State Management Guide](./state-management.md)
- [Design System Guide](./DESIGN_SYSTEM.md)

## Troubleshooting

### Stories Not Appearing

1. Check story file naming: `*.stories.tsx`
2. Verify stories path in `.storybook/main.ts`
3. Ensure default export with Meta type
4. Restart Storybook server

### TypeScript Errors

1. Import from `@storybook/nextjs`, not `@storybook/react`
2. Ensure `next.config.mjs` is properly configured
3. Check `tsconfig.json` paths for `@/` alias
4. Verify all dependencies are installed

### Styling Issues

1. Ensure `globals.css` is imported in `preview.tsx`
2. Check CSS variables are defined in theme
3. Verify Tailwind config includes story files
4. Use theme decorator for dark mode

### State Management Issues

1. Zustand store should work without mocking
2. Check store initialization in `src/store/ui.ts`
3. Verify `useUIStore` is imported correctly
4. Test with React DevTools in Storybook

---

**Last Updated**: 2024-01-XX  
**Storybook Version**: 9.1.10  
**Framework**: Next.js 14 with App Router
