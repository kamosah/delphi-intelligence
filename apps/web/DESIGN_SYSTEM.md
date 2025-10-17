# Design System Documentation

## Overview

Olympus MVP uses a modern, accessible design system built with:

- **Shadcn-ui** (New York style) - Component library
- **TailwindCSS** - Utility-first CSS framework
- **Assistant-UI** - AI chat interface primitives
- **Framer Motion** - Animation library
- **Zustand** - State management for UI state

## Color System

### Base Colors (CSS Variables)

The design system uses CSS variables for theming, supporting both light and dark modes:

```css
/* Light Mode */
--background: 0 0% 100% --foreground: 222.2 84% 4.9% --primary: 222.2 47.4%
  11.2% --secondary: 210 40% 96.1% --muted: 210 40% 96.1% --accent: 210 40%
  96.1% --destructive: 0 84.2% 60.2% /* Dark Mode */ --background: 222.2 84%
  4.9% --foreground: 210 40% 98% --primary: 210 40% 98% --secondary: 217.2 32.6%
  17.5% --muted: 217.2 32.6% 17.5% --accent: 217.2 32.6% 17.5% --destructive: 0
  62.8% 30.6%;
```

### AI-Specific Colors

Custom colors for AI agent interactions:

```typescript
agent: {
  primary: 'hsl(217, 91%, 60%)',   // Agent messages/actions
  secondary: 'hsl(142, 76%, 36%)',  // Success states
  tool: 'hsl(280, 65%, 60%)',       // Tool executions
}
```

## Typography

- **Font Family**: Inter, system-ui, sans-serif
- **Font Sizes**: Tailwind's default scale
- **Line Heights**: Optimized for readability

## Components

### Core Shadcn Components

Installed components (12+):

- `Button` - Primary interaction element
- `Card` - Container component
- `Input` - Form input
- `Label` - Form label
- `DropdownMenu` - Menu component
- `Avatar` - User/agent avatars
- `Separator` - Visual divider
- `Skeleton` - Loading states
- `Dialog` - Modal dialogs
- `Badge` - Status indicators
- `Tooltip` - Contextual help
- `ScrollArea` - Scrollable containers

### Layout Components

#### Header

Located: `src/components/layout/Header.tsx`

Features:

- Dark mode toggle (managed by Zustand)
- User avatar with dropdown menu
- Responsive mobile menu trigger
- Sticky positioning with backdrop blur

Usage:

```tsx
import { Header } from '@/components/layout';

<Header />;
```

#### Sidebar

Located: `src/components/layout/Sidebar.tsx`

Features:

- Animated expand/collapse (Framer Motion)
- Tooltips when collapsed
- Navigation items with icons
- Responsive design

Usage:

```tsx
import { Sidebar } from '@/components/layout';

<Sidebar />;
```

#### ToolCallBadge

Located: `src/components/query/ToolCallBadge.tsx`

Features:

- Status indicators (running/complete/error)
- Tool-specific icons
- Animated states
- List component for multiple tools

Usage:

```tsx
import { ToolCallBadge, ToolCallList } from '@/components/query';

<ToolCallBadge tool="search_documents" status="running" />

<ToolCallList
  tools={[
    { name: 'search', status: 'complete' },
    { name: 'generate', status: 'running' }
  ]}
/>
```

## State Management

### UI Store (Zustand)

Located: `src/store/ui-store.ts`

Manages:

- Dark mode state (persisted)
- Sidebar open/closed state
- Automatic dark mode class application

Usage:

```tsx
import { useUIStore } from '@/store/ui-store';

function Component() {
  const { isDarkMode, toggleDarkMode, sidebarOpen, toggleSidebar } =
    useUIStore();

  return (
    <button onClick={toggleDarkMode}>
      {isDarkMode ? 'Light' : 'Dark'} Mode
    </button>
  );
}
```

## Animations

### Framer Motion

Used for:

- Sidebar expand/collapse
- Page transitions
- Component entrances

Example:

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>;
```

### CSS Animations

Custom animations defined in `tailwind.config.ts`:

```typescript
animation: {
  'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
}
```

## Custom CSS Classes

### AI Components

```css
/* Agent message styling */
.agent-message {
  @apply relative p-4 rounded-lg bg-[hsl(217,91%,60%)]/10 
         border border-[hsl(217,91%,60%)]/20;
}

/* Tool execution badge */
.tool-execution {
  @apply inline-flex items-center gap-2 px-3 py-1 rounded-full 
         bg-[hsl(280,65%,60%)]/10 text-[hsl(280,65%,60%)] 
         text-sm font-medium;
}

/* Streaming cursor */
.streaming-cursor {
  @apply inline-block w-0.5 h-5 bg-primary animate-pulse;
}
```

### Assistant-UI Attributes

```css
/* Thread container */
[data-assistant-ui-thread] {
  @apply flex flex-col gap-4 p-4;
}

/* Message fade-in */
[data-assistant-ui-message] {
  @apply animate-in fade-in duration-300;
}

/* Streaming indicator */
[data-assistant-ui-streaming] {
  @apply after:content-[''] after:inline-block after:w-0.5 after:h-5 
         after:ml-1 after:bg-primary after:animate-pulse;
}

/* Tool call container */
[data-assistant-ui-tool-call] {
  @apply rounded-lg border border-[hsl(280,65%,60%)]/20 
         bg-[hsl(280,65%,60%)]/5 p-3;
}

/* Input composer */
[data-assistant-ui-composer-input] {
  @apply flex-1 resize-none rounded-lg border p-3 
         focus:outline-none focus:ring-2 focus:ring-primary
         disabled:opacity-50 disabled:cursor-not-allowed;
}
```

## Dark Mode

Dark mode is implemented using:

1. **Tailwind's class strategy**: `darkMode: ['class']`
2. **Zustand persistence**: State saved to localStorage
3. **Automatic class application**: Updates `document.documentElement` class

### Adding Dark Mode Styles

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Content
</div>
```

## File Structure

```
apps/web/
├── src/
│   ├── app/
│   │   └── globals.css              # Global styles & CSS variables
│   ├── components/
│   │   ├── ui/                      # Shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── layout/                  # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── index.ts
│   │   └── query/                   # AI chat components
│   │       ├── CustomMessage.tsx
│   │       ├── ToolCallBadge.tsx
│   │       └── index.ts
│   ├── store/
│   │   └── ui-store.ts              # Zustand UI state
│   └── lib/
│       └── utils.ts                 # cn() utility
└── tailwind.config.ts               # Tailwind configuration
```

## Best Practices

### Component Development

1. **Use Shadcn components as base**: Extend rather than replace
2. **Prefer composition**: Combine small components
3. **Keep styles in Tailwind**: Avoid custom CSS when possible
4. **Use CSS variables**: For theme-aware colors

### Styling

1. **Use `cn()` utility**: For conditional classes

   ```tsx
   import { cn } from '@/lib/utils';

   <div className={cn('base-class', condition && 'conditional-class')} />;
   ```

2. **Follow color system**: Use CSS variables, not hardcoded values
3. **Responsive design**: Mobile-first approach with Tailwind breakpoints
4. **Accessibility**: Use semantic HTML and ARIA attributes

### State Management

1. **Zustand for client state**: UI state, user preferences
2. **React Query for server state**: API data, caching (per ADR-001)
3. **React Hook Form for forms**: Form state management

## Adding New Components

### Shadcn Components

```bash
npx shadcn@latest add <component-name>
```

### Custom Components

1. Create in appropriate directory (`layout/`, `query/`, etc.)
2. Use TypeScript for type safety
3. Add to index.ts for easy imports
4. Follow naming conventions (PascalCase)
5. Include JSDoc comments

## Testing

Components should be tested for:

- Proper rendering in light/dark mode
- Accessibility (keyboard navigation, screen readers)
- Responsive behavior
- State management integration

## Resources

- [Shadcn-ui Documentation](https://ui.shadcn.com/)
- [TailwindCSS Documentation](https://tailwindcss.com/)
- [Assistant-UI Documentation](https://assistant-ui.com/)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)

## Version

Design System v1.0.0 - Olympus MVP Week 1
