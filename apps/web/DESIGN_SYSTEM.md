# Design System Documentation

## Overview

Olympus MVP uses a modern, accessible design system built with:

- **Shadcn-ui** (New York style) - Component library foundation
- **TailwindCSS** - Utility-first CSS framework
- **Hex-Inspired Aesthetic** - **PRIMARY DESIGN DIRECTION** for all UI components
- **Assistant-UI** - AI chat interface primitives (deprecated in favor of Hex patterns)
- **Framer Motion** - Animation library
- **Zustand** - State management for UI state

---

## 🎨 Design System (Hex-Inspired)

**IMPORTANT**: As of 2025-10-25, Olympus has pivoted to adopt **100% Hex aesthetic** across all features (document intelligence + database analytics). This ensures a unified, professional, data-first user experience.

### Key Design Principles

1. **Data-First Design** - Results and visualizations are primary, UI chrome is secondary
2. **Conversational AI Integration** - Natural language as first-class input method
3. **Professional Tool Aesthetic** - Serious, business-oriented tone
4. **Source Transparency** - Clear visual indicators for SQL vs document results
5. **Mobile-First Responsive** - Adaptive layouts with touch-friendly targets

### Design System Documentation

- **[HEX_DESIGN_SYSTEM.md](../../docs/HEX_DESIGN_SYSTEM.md)** - Complete design patterns reference
- **[hex-component-mapping.md](../../docs/guides/hex-component-mapping.md)** - Component implementation guide
- **Visual References**: `docs/visual-references/hex/screenshots/` (8 screenshots)

### Custom Component Library

All components follow the Hex aesthetic, located in `packages/ui/`:

- `Button` - Primary (gradient), secondary (outline), icon variants
- `Card` - Connection cards, message bubbles, result containers
- `Input` - Text inputs with focus rings
- `Textarea` - Chat input with rounded corners
- `Badge` - Source badges (SQL/document), status indicators

**Component Development Rule**: When building new components, always check the [hex-component-mapping.md](../../docs/guides/hex-component-mapping.md) guide first to ensure aesthetic alignment.

---

## Color System

### Hex Brand Colors (Official from Media Kit)

**Status**: ✅ Complete - Official colors extracted from Hex media kit. See [HEX_DESIGN_SYSTEM.md](../../docs/HEX_DESIGN_SYSTEM.md) for complete design system.

**Brand Color Tokens** (Available as `hex-*` in Tailwind):

```typescript
hex: {
  obsidian: '#1d141c',    // Dark backgrounds, footer
  roseQuartz: '#f5cdc0',  // Data viz, warm accents
  jade: '#5cb196',        // Success, document citations
  amethyst: '#a477b2',    // Primary brand accent, AI features
  citrine: '#cda849',     // Warnings, highlights, data viz
  opal: '#fbf0f9',        // Light mode elevated surfaces
  sugilite: '#6f3f90',    // Computation badges, deep accents
  cement: '#717a94',      // Neutral UI, borders, disabled states
}
```

**Usage Guidelines**:

- Use **Jade** and **Amethyst** for primary brand accents
- **Obsidian** for dark mode backgrounds
- **Opal** for light mode elevated surfaces
- **Cement** for neutral UI elements and borders
- **Rose Quartz**, **Citrine**, and **Sugilite** for data visualization and accent highlights

---

### UI Color Palette

**Functional colors** for interactive UI elements. See [DESIGN_TOKENS.md](../../docs/DESIGN_TOKENS.md) for complete color system.

**Color Tokens**:

```typescript
colors: {
  // Primary actions (Hex blue)
  blue: {
    50: '#EBF2FF',
    100: '#D6E4FF',
    200: '#ADC9FF',
    300: '#85AEFF',
    400: '#5C93FF',
    500: '#4B7FFF',  // Primary action color
    600: '#3366FF',  // Primary hover state
    700: '#2952CC',  // Active/pressed state
    800: '#1F3D99',
    900: '#142966',
  },

  // Neutrals (Hex grays)
  gray: {
    50: '#F9FAFB',   // Panel backgrounds
    100: '#F3F4F6',  // Hover backgrounds
    200: '#E5E7EB',  // Borders
    300: '#D1D5DB',  // Input borders
    400: '#9CA3AF',  // Placeholder text
    500: '#6B7280',  // Secondary text, icons
    600: '#4B5563',  // Body text
    700: '#374151',  // Headings
    800: '#1F2937',  // Primary text
    900: '#111827',  // Darkest text
  },

  // Accent purple (AI features)
  purple: {
    500: '#8B5CF6',  // AI/Magic features
    600: '#7C3AED',  // Hover state
  },

  // Semantic colors
  green: {
    500: '#10B981',  // Success
    600: '#059669',  // Document badges
  },
  red: {
    500: '#EF4444',  // Error
    600: '#DC2626',  // Error hover
  },
  orange: {
    500: '#F97316',  // Warning
  },
  teal: {
    600: '#0D9488',  // Document badges (gradient)
  },

  // Source-type badges (gradient backgrounds)
  badges: {
    sql: 'linear-gradient(to right, #4B7FFF, #3366FF)',      // Blue gradient
    document: 'linear-gradient(to right, #10B981, #0D9488)', // Green/teal gradient
    computation: 'linear-gradient(to right, #8B5CF6, #7C3AED)', // Purple gradient
  },

  // Code syntax highlighting
  code: {
    background: '#F6F8FA',
    keyword: '#D73A49',   // SQL keywords
    string: '#032F62',    // String literals
    number: '#005CC5',    // Numeric values
    function: '#6F42C1',  // Function calls
  },
}
```

**Reference**: Complete design token documentation available in [DESIGN_TOKENS.md](../../docs/DESIGN_TOKENS.md).

### CSS Variables

CSS variables for theming (to be updated with extracted colors):

```css
/* Light Mode */
--background: 0 0% 100% --foreground: 222.2 84% 4.9% --primary: 222.2 47.4%
  11.2% --secondary: 210 40% 96.1% --muted: 210 40% 96.1% --accent: 210 40%
  96.1% --destructive: 0 84.2% 60.2%;
```

**Note**: These will be updated to match the primary color palette once exact values are extracted.

## Typography

### Font Families (Hex-Inspired with Google Font Alternatives)

> **Hex's Official Fonts**: PP Formula (interface) and GT Cinetype (body/code)
>
> **Our Implementation**: DM Sans and IBM Plex Mono (free Google Font alternatives)

**Primary Interface Font** (Headings, navigation, buttons, UI labels):

```css
font-family:
  'DM Sans',
  Inter,
  -apple-system,
  BlinkMacSystemFont,
  'Segoe UI',
  'Helvetica Neue',
  Arial,
  sans-serif;
```

- **DM Sans**: Google Font alternative to PP Formula
- Geometric sans-serif with clean, modern aesthetic
- Optimized for UI text and headings

**Body & Code Font** (Body text, data tables, code blocks, SQL queries):

```css
font-family:
  'IBM Plex Mono', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas,
  monospace;
```

- **IBM Plex Mono**: Google Font alternative to GT Cinetype
- Geometric monospace with mechanical characteristics
- Excellent for code, data, and technical content

**Tailwind Usage**:

```tsx
// Interface elements (DM Sans)
<h1 className="font-sans">Page Title</h1>

// Code/data (IBM Plex Mono)
<code className="font-mono">SELECT * FROM users</code>
```

**Next.js Font Optimization**:
Both fonts are loaded via `next/font/google` for automatic optimization, subsetting, and self-hosting.

### Type Scale

| Element | Size | Weight | Line Height | Usage              |
| ------- | ---- | ------ | ----------- | ------------------ |
| H1      | 32px | 700    | 1.25        | Page titles        |
| H2      | 24px | 600    | 1.3         | Section headers    |
| H3      | 18px | 600    | 1.4         | Subsection headers |
| Body    | 14px | 400    | 1.5         | Main content       |
| Small   | 12px | 400    | 1.4         | Meta, labels       |
| Code    | 13px | 400    | 1.4         | Code blocks, SQL   |

### Text Styles

- **Bold**: `font-weight: 600` (not 700)
- **Monospace**: All code, table names, column names
- **Italic**: Used sparingly for emphasis

## Components

### Component Library

**Location**: `packages/ui/`

**Foundation**: Shadcn-ui components styled to match design system

Custom components (see [hex-component-mapping.md](../../docs/guides/hex-component-mapping.md) for implementation guide):

- `Button` - Primary (gradient), secondary (outline), icon, destructive variants
- `Card` - Connection cards, message bubbles, result containers
- `Input` - Text inputs with focus rings
- `Textarea` - Chat input with rounded corners
- `Badge` - Source badges (SQL/document), status pills
- `SourceBadge` - SQL/document source indicators with gradients
- `DatabaseConnectionCard` - Database connection UI
- `ChatInput` - Threads-style chat input with @mentions
- `ChatMessage` - User/AI message bubbles
- `SQLNotebookCell` - SQL cell with editor and results
- `QueryResultsTable` - SQL results table
- `ThreadsChatContainer` - Full chat layout

### Base Shadcn Components

Installed base components (12+):

- `Label` - Form labels
- `DropdownMenu` - Menus and actions
- `Avatar` - User/agent avatars
- `Separator` - Visual divider
- `Skeleton` - Loading states
- `Dialog` - Modal dialogs
- `Tooltip` - Contextual help
- `ScrollArea` - Scrollable containers
- `Select` - Dropdown selection
- `Table` - Data tables

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
