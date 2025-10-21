# Component Development Best Practices

This guide covers component architecture, creation rules, and best practices for building UI components in the Olympus MVP project.

## Component Architecture Philosophy

**Core Principle**: Build composable, reusable components rather than monolithic page components. Favor composition over large, single-file components.

**Component Hierarchy**:

1. **Design System Components** (`packages/ui/src/components/`) - Base primitives (Button, Input, Card, etc.)
2. **Common/Shared Components** (`apps/web/src/components/common/`) - App-level reusable utilities (MarkdownContent, ErrorBoundary, etc.)
3. **Layout Components** (`apps/web/src/components/layout/`) - Application structure (Header, Sidebar, Footer)
4. **Feature Components** (`apps/web/src/components/[feature]/`) - Domain-specific components
5. **Page Components** (`apps/web/src/app/`) - Composition of all above

## Component Location Strategy

**Where to place components**:

```
packages/ui/src/components/     # Shadcn + Design System primitives
├── button.tsx                  # Base components with Storybook stories
├── button.stories.tsx          # Always include stories for design system
├── card.tsx
└── ...

apps/web/src/components/
├── ui/                         # App-specific UI overrides (if needed)
├── common/                     # App-level reusable utilities
│   ├── MarkdownContent.tsx     # Markdown rendering for rich text
│   ├── ErrorBoundary.tsx       # Error handling wrapper
│   ├── LoadingSpinner.tsx      # Loading states
│   └── EmptyState.tsx          # Empty state messages
├── layout/                     # Layout components (Header, Sidebar, Footer)
│   ├── Header.tsx
│   ├── Header.stories.tsx      # Include stories for layout components
│   ├── Sidebar.tsx
│   └── Sidebar.stories.tsx
├── landing/                    # Landing page feature components
│   ├── HeroSection.tsx
│   ├── SocialProof.tsx
│   ├── FeaturesGrid.tsx
│   ├── ProductShowcase.tsx
│   ├── UseCases.tsx
│   ├── Testimonials.tsx
│   └── FinalCTA.tsx
├── auth/                       # Authentication components
│   ├── LoginForm.tsx
│   ├── SignupForm.tsx
│   └── ...
└── documents/                  # Document feature components
    ├── DocumentList.tsx
    ├── DocumentCard.tsx
    └── ...
```

## Component Creation Rules

**ALWAYS follow these rules when creating components**:

### Rule 1: Prefer Composition Over Monoliths

❌ **AVOID**: Single-file page components with inline styles

```tsx
// Bad: Everything in one component with Tailwind classes
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        {/* 50+ lines of nav code */}
      </nav>
      <section className="pt-32 pb-20">{/* 100+ lines of hero code */}</section>
      <section className="py-20 bg-white">
        {/* 80+ lines of features code */}
      </section>
      {/* More sections... */}
    </div>
  );
}
```

✅ **PREFER**: Composed page with feature components

```tsx
// Good: Composition of feature components
import { HeroSection } from '@/components/landing/HeroSection';
import { SocialProof } from '@/components/landing/SocialProof';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { ProductShowcase } from '@/components/landing/ProductShowcase';
import { UseCases } from '@/components/landing/UseCases';
import { Testimonials } from '@/components/landing/Testimonials';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { Footer } from '@/components/layout/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <SocialProof />
      <FeaturesGrid />
      <ProductShowcase />
      <UseCases />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  );
}
```

### Rule 2: Use Design System Components First

**Priority order for creating components**:

1. Check if component exists in `packages/ui` (Shadcn/Design System)
2. Compose existing components to create new ones
3. Only create new primitive components if absolutely necessary

**Import design system components from `@olympus/ui`**:

❌ **AVOID**: Creating buttons with inline Tailwind classes

```tsx
// Bad: Custom button with inline styles
export function CTAButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg">
      {children}
    </button>
  );
}
```

✅ **PREFER**: Using design system Button component

```tsx
// Good: Using design system component from @olympus/ui
import { Button } from '@olympus/ui';

export function CTAButton({ children }: { children: React.ReactNode }) {
  return (
    <Button size="lg" variant="default" className="shadow-lg">
      {children}
    </Button>
  );
}
```

### Rule 3: Component File Structure

Each feature component should follow this structure:

```tsx
// apps/web/src/components/landing/HeroSection.tsx

import { Button } from '@olympus/ui';
import { Card } from '@olympus/ui';
import Link from 'next/link';

interface HeroSectionProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
}

/**
 * Hero section for the landing page.
 * Displays the main value proposition with CTA buttons.
 */
export function HeroSection({
  title = 'Transform documents into intelligent insights',
  subtitle = 'Olympus is an AI-powered document intelligence platform...',
  ctaText = 'Start for free',
  ctaLink = '/signup',
}: HeroSectionProps) {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            {title.split(' into ')[0]} into{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {title.split(' into ')[1]}
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            {subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="shadow-lg shadow-blue-600/20">
              <Link href={ctaLink}>{ctaText}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Component file structure checklist**:

- ✅ Import design system components first from `@olympus/ui`
- ✅ Define TypeScript interfaces for props
- ✅ Include JSDoc comments describing the component
- ✅ Provide sensible default props
- ✅ Export named function (not default export for feature components)
- ✅ Use semantic HTML elements

### Rule 4: Create Storybook Stories for Reusable Components

**When to create stories**:

- ✅ Design system components (`packages/ui`)
- ✅ Layout components (`apps/web/src/components/layout`)
- ✅ Highly reusable feature components
- ❌ Page-specific one-off components
- ❌ Simple wrapper components

**Story structure**:

```tsx
// apps/web/src/components/landing/HeroSection.stories.tsx

import type { Meta, StoryObj } from '@storybook/react';
import { HeroSection } from './HeroSection';

const meta = {
  title: 'Landing/HeroSection',
  component: HeroSection,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HeroSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default hero section with standard content.
 */
export const Default: Story = {};

/**
 * Hero section with custom content.
 */
export const CustomContent: Story = {
  args: {
    title: 'Custom title with intelligent insights',
    subtitle: 'Custom subtitle describing the product',
    ctaText: 'Get Started',
    ctaLink: '/custom-link',
  },
};

/**
 * Hero section in dark mode.
 */
export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
};
```

### Rule 5: Animations with Framer Motion

When adding animations, use Framer Motion with design system components:

```tsx
// Good: Animated component with Framer Motion
'use client';

import { motion } from 'framer-motion';
import { Button, Card, CardContent } from '@olympus/ui';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function FeaturesGrid() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        variants={fadeInUp}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
```

**Animation best practices**:

- Use `'use client'` directive for Framer Motion components
- Define animation variants as constants outside component
- Use `whileInView` for scroll-triggered animations
- Add `viewport={{ once: true }}` to prevent re-triggering
- Keep animations subtle and performant (0.3-0.5s duration)

### Rule 6: TypeScript and Props

**Always use TypeScript with proper typing**:

```tsx
// Good: Well-typed component
interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  variant?: 'default' | 'highlighted';
  onClick?: () => void;
}

export function FeatureCard({
  title,
  description,
  icon,
  variant = 'default',
  onClick,
}: FeatureCardProps) {
  // Component implementation
}
```

**Props best practices**:

- ✅ Define interface for all props
- ✅ Use optional props with default values
- ✅ Use union types for variants
- ✅ Include React.ReactNode for children/icon props
- ✅ Use proper event handler types (e.g., `onClick?: () => void`)

### Rule 7: Avoid Tailwind Class Overload

When a component has 10+ Tailwind classes, consider:

1. **Extracting to design system component** (preferred)
2. **Using `cn()` utility with variants** (for design system components)
3. **Breaking into smaller components**

❌ **AVOID**: Component with excessive inline Tailwind classes

```tsx
// Bad: Too many inline classes
export function ComplexCard() {
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-gray-200 p-8 hover:shadow-3xl transition-all duration-300 hover:scale-105">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent to-blue-100 opacity-50 pointer-events-none" />
      {/* More content */}
    </div>
  );
}
```

✅ **PREFER**: Using Card component with composition

```tsx
// Good: Using design system Card from @olympus/ui
import { Card, CardContent } from '@olympus/ui';
import { cn } from '@/lib/utils';

export function ComplexCard({ className }: { className?: string }) {
  return (
    <Card
      className={cn(
        'hover:shadow-3xl transition-all hover:scale-105',
        className
      )}
    >
      <CardContent className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
        {/* Content */}
      </CardContent>
    </Card>
  );
}
```

## Component Development Workflow

When asked to create a new feature or page:

1. **Analyze the request** - Identify logical component boundaries
2. **Check existing components** - Review `packages/ui` and existing feature components
3. **Plan component structure** - Break down into composable pieces
4. **Create feature components** - One file per logical section
5. **Compose in page** - Import and compose feature components
6. **Add stories (if needed)** - Create Storybook stories for reusable components
7. **Test in Storybook** - Verify component works in isolation

**Example workflow for Landing Page**:

```
Request: "Create a landing page with hero, features, and CTA"

Step 1: Identify components needed
- HeroSection (new)
- FeaturesGrid (new)
- FinalCTA (new)
- Footer (check if exists)

Step 2: Check design system
- Button (exists in packages/ui, import from @olympus/ui)
- Card (exists in packages/ui, import from @olympus/ui)
- Use these instead of custom components

Step 3: Create feature components
- apps/web/src/components/landing/HeroSection.tsx
- apps/web/src/components/landing/FeaturesGrid.tsx
- apps/web/src/components/landing/FinalCTA.tsx

Step 4: Compose in page
- apps/web/src/app/page.tsx imports and composes all sections

Step 5: Add stories (optional for highly reusable components)
- apps/web/src/components/landing/HeroSection.stories.tsx

Step 6: Test in Storybook
- Run npm run storybook
- Verify components render correctly
```

## Code Review Checklist

Before considering a component complete:

- [ ] Component is broken into logical, reusable pieces
- [ ] Using design system components from `@olympus/ui` (Button, Card, Input, etc.) instead of custom ones
- [ ] Props are properly typed with TypeScript interfaces
- [ ] Component has sensible default props
- [ ] JSDoc comments explain component purpose
- [ ] Tailwind classes are organized by category (layout, spacing, colors, etc.)
- [ ] No excessive inline Tailwind (10+ classes suggests refactoring needed)
- [ ] Framer Motion animations use 'use client' directive
- [ ] Storybook stories created for reusable components
- [ ] Component location follows project structure conventions
- [ ] Component is exported with named export (not default)

## Common Patterns

### Pattern 1: Section Wrapper

```tsx
// Reusable section wrapper for consistent spacing
import { cn } from '@/lib/utils';

export function Section({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('py-20 px-4 sm:px-6 lg:px-8', className)}>
      <div className="max-w-7xl mx-auto">{children}</div>
    </section>
  );
}
```

### Pattern 2: Feature Card Grid

```tsx
// Grid pattern for feature cards
import { Card, CardContent } from '@olympus/ui';

export function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <div className="grid md:grid-cols-3 gap-8">
      {features.map((feature) => (
        <Card key={feature.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              {feature.icon}
            </div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Pattern 3: Animated Entrance

```tsx
// Reusable fade-in animation wrapper
'use client';

import { motion } from 'framer-motion';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function FadeInUp({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      variants={fadeInUp}
    >
      {children}
    </motion.div>
  );
}
```
