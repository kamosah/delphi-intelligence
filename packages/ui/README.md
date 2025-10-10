# @olympus/ui

Shared UI component library and design system for the Olympus platform.

## Overview

This package contains all reusable UI components built with:

- **React 18** - Component library
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first styling
- **CVA** - Class variance authority for component variants
- **Storybook** - Component documentation and development

## Components

### Form Components

- `Button` - Interactive button with multiple variants
- `Input` - Text input field
- `Label` - Form labels

### Layout Components

- `Card` - Container with header, content, and footer
- `Separator` - Visual divider
- `ScrollArea` - Scrollable container with custom scrollbars

### Feedback Components

- `Avatar` - User avatars with fallbacks
- `Badge` - Status indicators
- `Skeleton` - Loading placeholders
- `Tooltip` - Contextual information on hover

### Overlay Components

- `Dialog` - Modal dialogs
- `DropdownMenu` - Dropdown menus with submenus

## Installation

This package is part of the Olympus monorepo and is automatically linked via npm workspaces.

```bash
# Install dependencies from root
npm install

# The package is automatically available as @olympus/ui in other workspace packages
```

## Usage

### In Web App

```tsx
import { Button, Card, Input } from '@olympus/ui';
import '@olympus/ui/styles.css'; // Import in your root layout

function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter text" />
      <Button>Submit</Button>
    </Card>
  );
}
```

### Styling

All components use Tailwind CSS and support dark mode via the `dark` class on the document root.

The package exports a `styles.css` file that includes:

- Tailwind base, components, and utilities
- CSS custom properties for theming
- Dark mode variables

## Development

### Run Storybook

```bash
cd packages/ui
npm run storybook
```

This starts Storybook at `http://localhost:6006` where you can:

- View all components in isolation
- Test dark/light mode toggle
- Interact with component props
- Check accessibility with the a11y addon

### Available Scripts

- `npm run storybook` - Start Storybook dev server
- `npm run build-storybook` - Build static Storybook
- `npm run lint` - Lint component files
- `npm run type-check` - Type check with TypeScript

## Component Guidelines

### Creating New Components

1. Create the component file in `src/components/`
2. Export it from `src/index.ts`
3. Create a `.stories.tsx` file with examples
4. Test in Storybook before using in apps

### Component Structure

```tsx
// button.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva('inline-flex items-center justify-center...', {
  variants: {
    variant: { default: '...', destructive: '...' },
    size: { default: '...', sm: '...', lg: '...' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

### Story Structure

```tsx
// button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Button' },
};
```

## Architecture

### Package Structure

```
packages/ui/
├── .storybook/          # Storybook configuration
│   ├── main.ts         # Storybook config
│   └── preview.tsx     # Global decorators & theme toggle
├── src/
│   ├── components/     # All UI components
│   │   ├── button.tsx
│   │   ├── button.stories.tsx
│   │   └── ...
│   ├── lib/
│   │   └── utils.ts    # Utility functions (cn, etc.)
│   ├── styles.css      # Tailwind CSS + theme variables
│   └── index.ts        # Barrel exports
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts      # Vite config for Storybook
└── README.md
```

### Design Tokens

Theme colors and spacing are defined in `tailwind.config.ts` and available as CSS custom properties:

- Primary colors with shades (50-950)
- Semantic colors (background, foreground, muted, accent, etc.)
- Agent-specific colors for AI interactions
- Border radius variables
- Custom animations

## Accessibility

All components are built with accessibility in mind:

- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- Tested with `@storybook/addon-a11y`

## Dark Mode

Dark mode is supported via Tailwind's `dark:` variant. Toggle it in Storybook using the theme toolbar button.

The theme is controlled by adding/removing the `dark` class on `<html>`:

```tsx
// Toggle dark mode
document.documentElement.classList.toggle('dark');
```

## Future Enhancements

- [ ] Add more complex components (DataTable, Select, Combobox)
- [ ] Add form components (Checkbox, Radio, Switch)
- [ ] Add animation utilities
- [ ] Publish to npm for external use
- [ ] Add Chromatic for visual regression testing
- [ ] Document design patterns and best practices

## License

Private package - Part of Olympus MVP
