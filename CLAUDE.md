# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Olympus MVP (codenamed "Athena") is an AI-powered document intelligence platform built as a Turborepo monorepo with a Next.js 14 frontend and FastAPI backend. The project follows a modern tech stack with hybrid authentication, GraphQL data layer, and a sophisticated state management architecture.

## Project Context

**Inspiration**: This project is a recreation of [Athena Intelligence](https://www.athenaintel.com/), an enterprise AI platform that provides:

- **Olympus Platform**: AI-native infrastructure with integrated analysis tools
- **Athena AI Agent**: An autonomous "artificial data analyst" that functions like a remote hire

**Our Goal**: Build an MVP with ~70% feature parity, focusing on:

1. Document intelligence (upload, processing, extraction)
2. AI-powered natural language queries with citations
3. Collaborative workspaces (Spaces)
4. Enterprise-ready security and audit trails

**Key References**:

- [Product Requirements Document](./docs/PRODUCT_REQUIREMENTS.md)
- [Feature Alignment](./docs/FEATURE_ALIGNMENT.md)
- [Decisions to Make](./docs/DECISIONS_TO_MAKE.md)

When working on features, refer to these documents to ensure alignment with Athena Intelligence's capabilities.

## Architecture

### Monorepo Structure

- **`apps/web/`** - Next.js 14 frontend with App Router
- **`apps/api/`** - FastAPI backend with Strawberry GraphQL
- **`packages/ui/`** - Shared React components
- **`packages/types/`** - Shared TypeScript types
- **`packages/config/`** - Shared ESLint/Prettier configs

### State Management (ADR-001)

The frontend uses a **hybrid state management approach** rather than Redux:

- **React Query (TanStack Query)** - Server state from GraphQL API (spaces, documents, queries)
- **Zustand** - Client state (UI, theme, navigation, auth tokens)
- **React Hook Form** - Form state and validation
- **Yjs** (planned) - Real-time collaborative state
- **useState/useReducer** - Component-local state

**Key principle**: Never put server data in Zustand. Use React Query for all API data.

### Authentication Flow

**Hybrid architecture** (REST + GraphQL):

1. **REST endpoints** for auth operations:
   - `POST /auth/login` - User login
   - `POST /auth/register` - User registration
   - `POST /auth/refresh` - Token refresh
   - `POST /auth/logout` - User logout
   - `GET /auth/me` - Current user profile

2. **GraphQL endpoint** (`/graphql`) for all data operations (spaces, documents, queries)

3. **JWT tokens** stored in:
   - Zustand auth store (`apps/web/src/lib/stores/auth-store.ts`)
   - HTTP-only cookies (via backend)

4. **Token injection**: GraphQL client automatically adds JWT to headers via auth store

### Database Architecture

**Primary**: Supabase PostgreSQL with Row Level Security (RLS)
**Sessions**: Redis for JWT token management
**Migrations**: Hybrid Alembic + Supabase MCP system

Database switching is controlled via environment variables:

- `USE_LOCAL_DB=true` - Use Docker PostgreSQL
- `USE_LOCAL_DB=false` - Use Supabase (default)

## Development Commands

### Root Commands (Turborepo)

```bash
# Start all dev servers (frontend + backend)
npm run dev

# Build all packages
npm run build

# Run all tests
npm run test

# Lint all workspaces
npm run lint

# Format code with Prettier
npm run format
```

### Frontend (apps/web)

```bash
cd apps/web

# Development server
npm run dev                  # Standard Next.js dev server
npm run dev:turbo           # Next.js with Turbo mode

# Type checking
npm run type-check          # Single run
npm run type-check:watch    # Watch mode

# GraphQL code generation
npm run graphql:introspect  # Introspect backend schema
npm run graphql:generate    # Generate TypeScript types
npm run graphql:watch       # Watch mode for codegen

# Storybook
npm run storybook           # Start Storybook dev server (port 6006)
npm run build-storybook     # Build static Storybook

# Build
npm run build               # Production build
npm run start               # Start production server

# Clean
npm run clean               # Remove .next, dist, and caches
```

### Backend (apps/api)

**Docker development (recommended)**:

```bash
cd apps/api

# Start all services (PostgreSQL + Redis + API)
docker-compose up -d

# View API logs
docker-compose logs -f api

# Run tests in Docker
docker-compose exec api poetry run pytest
docker-compose exec api poetry run pytest tests/test_auth.py::test_login

# Linting and formatting
docker-compose exec api poetry run ruff format
docker-compose exec api poetry run ruff check
docker-compose exec api poetry run ruff check --fix

# Type checking
docker-compose exec api poetry run mypy app/

# Database migrations
docker-compose exec api poetry run alembic upgrade head
docker-compose exec api poetry run alembic revision --autogenerate -m "description"

# Access PostgreSQL
docker-compose exec postgres psql -U olympus -d olympus_mvp

# Stop services
docker-compose down
```

**Local development** (without Docker):

```bash
cd apps/api

# Activate Poetry environment
poetry shell

# Start dev server (with hot reload)
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
poetry run pytest
poetry run pytest tests/test_auth.py::test_login -v
poetry run pytest --cov=app tests/

# Linting
poetry run ruff format
poetry run ruff check --fix

# Migrations
poetry run alembic upgrade head
poetry run alembic revision --autogenerate -m "description"

# Custom test runner (with detailed output)
python run_tests.py
```

### Database Migrations

**Migration workflow**:

```bash
cd apps/api

# Using Docker
docker-compose exec api poetry run alembic upgrade head  # Apply migrations
docker-compose exec api poetry run alembic downgrade -1  # Rollback one
docker-compose exec api poetry run alembic current       # Show current version
docker-compose exec api poetry run alembic history       # Show all migrations

# Using convenience script
./scripts/migrate.sh status                              # Check status
./scripts/migrate.sh --local generate "Add new feature"  # Local DB
./scripts/migrate.sh --supabase generate "Add feature"   # Supabase

# Using Python utility
python scripts/migrate.py --local upgrade head
python scripts/migrate.py --supabase status
```

**Important**: Migrations for Supabase use MCP server to bypass connection pooler limitations. See `apps/api/MIGRATION_AUTOMATION.md` for details.

## Backend Architecture

### Application Structure

```
apps/api/app/
├── auth/           # JWT authentication (JWTManager, TokenManager)
├── db/             # Database session and connection (get_db dependency)
├── graphql/        # Strawberry GraphQL (query.py, mutation.py, schema.py)
├── middleware/     # CORS, auth injection (AuthenticationMiddleware)
├── models/         # SQLAlchemy models (User, Space, Document, Query)
├── routes/         # REST endpoints (auth.py, health.py)
├── services/       # Business logic layer
├── utils/          # Utility functions
├── config.py       # Pydantic settings (database, JWT, CORS)
└── main.py         # FastAPI app factory (create_app)
```

### Key Backend Patterns

**Configuration**: Environment-based settings via Pydantic (`app/config.py`)

- Access settings: `from app.config import settings`
- Database URL logic: `settings.db_url` property handles Docker/Supabase switching

**Database sessions**: Async SQLAlchemy with dependency injection

```python
from app.db.session import get_db

async def my_route(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
```

**Authentication middleware**: JWT tokens injected into `request.state.user`

```python
from fastapi import Request

async def protected_route(request: Request):
    user = request.state.user  # Available after AuthenticationMiddleware
```

**GraphQL context**: Strawberry resolvers receive FastAPI request

```python
@strawberry.type
class Query:
    @strawberry.field
    async def me(self, info: Info) -> User:
        request = info.context["request"]
        user = request.state.user  # From middleware
```

### Testing Strategy

Tests are located in `apps/api/tests/`:

- `test_jwt.py` - JWT token generation and validation (9 tests)
- `test_redis.py` - Redis session management (14 tests)
- `test_routes.py` - API endpoint testing
- `test_models_simple.py` - SQLAlchemy model testing

All tests use `pytest` with `pytest-asyncio` for async support.

## Frontend Architecture

### Application Structure

```
apps/web/src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group (login, signup)
│   ├── (dashboard)/       # Dashboard routes (spaces, documents, queries)
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles + Tailwind
├── components/
│   ├── ui/                # Shadcn components (button, input, etc.)
│   ├── forms/             # Form components
│   └── layout/            # Layout components (sidebar, navbar)
├── lib/
│   ├── stores/            # Zustand stores (auth-store.ts, app-store.ts)
│   ├── query/             # React Query setup (client.ts, provider.tsx)
│   ├── api/               # API clients (auth-client.ts, graphql-client.ts)
│   └── utils/             # Utility functions
├── hooks/                 # Custom React hooks (useAuth.ts)
└── store/                 # Additional stores (ui-store.ts)
```

### Key Frontend Patterns

**Data fetching**: Use React Query with GraphQL

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/client';

// In component
const { data, isLoading, error } = useQuery({
  queryKey: queryKeys.spaces.list({}),
  queryFn: () => fetchSpaces(),
});
```

**Authentication**: Access auth state via Zustand

```typescript
import { useAuthStore } from '@/lib/stores/auth-store';

const { user, isAuthenticated, logout } = useAuthStore();
```

**Query keys factory**: Use centralized query keys (`apps/web/src/lib/query/client.ts`)

```typescript
queryKeys.auth.user(); // ['auth', 'user']
queryKeys.spaces.detail('space-123'); // ['spaces', 'detail', 'space-123']
queryKeys.documents.list('space-123'); // ['documents', 'list', 'space-123']
```

**GraphQL code generation**: Run `npm run graphql:generate` after backend schema changes

- Input: `apps/api` GraphQL schema
- Output: `apps/web/src/lib/api/generated.ts` (TypeScript types)
- Config: `codegen.yml` and `codegen.introspect.yml`

### Styling

**Tailwind CSS** with design system configuration:

- Theme defined in `tailwind.config.ts`
- CSS variables for theming in `app/globals.css`
- Shadcn components in `packages/ui` and `apps/web/src/components/ui`

**Class organization**: Group by type

```tsx
className="
  flex items-center justify-between  // Layout
  px-4 py-2 rounded-lg              // Spacing & borders
  bg-white shadow-sm                // Background & effects
  text-lg font-semibold             // Typography
  hover:bg-gray-50                  // Interactive states
"
```

## Component Development Best Practices

### Component Architecture Philosophy

**Core Principle**: Build composable, reusable components rather than monolithic page components. Favor composition over large, single-file components.

**Component Hierarchy**:

1. **Design System Components** (`packages/ui/src/components/`) - Base primitives (Button, Input, Card, etc.)
2. **Layout Components** (`apps/web/src/components/layout/`) - Application structure (Header, Sidebar, Footer)
3. **Feature Components** (`apps/web/src/components/[feature]/`) - Domain-specific components
4. **Page Components** (`apps/web/src/app/`) - Composition of all above

### Component Location Strategy

**Where to place components**:

```
packages/ui/src/components/     # Shadcn + Design System primitives
├── button.tsx                  # Base components with Storybook stories
├── button.stories.tsx          # Always include stories for design system
├── card.tsx
└── ...

apps/web/src/components/
├── ui/                         # App-specific UI overrides (if needed)
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

### Component Creation Rules

**ALWAYS follow these rules when creating components**:

#### Rule 1: Prefer Composition Over Monoliths

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

#### Rule 2: Use Design System Components First

**Priority order for creating components**:

1. Check if component exists in `packages/ui` (Shadcn/Design System)
2. Compose existing components to create new ones
3. Only create new primitive components if absolutely necessary

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
// Good: Using design system component
import { Button } from '@/components/ui/button';

export function CTAButton({ children }: { children: React.ReactNode }) {
  return (
    <Button size="lg" variant="default" className="shadow-lg">
      {children}
    </Button>
  );
}
```

#### Rule 3: Component File Structure

Each feature component should follow this structure:

```tsx
// apps/web/src/components/landing/HeroSection.tsx

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

- ✅ Import design system components first
- ✅ Define TypeScript interfaces for props
- ✅ Include JSDoc comments describing the component
- ✅ Provide sensible default props
- ✅ Export named function (not default export for feature components)
- ✅ Use semantic HTML elements

#### Rule 4: Create Storybook Stories for Reusable Components

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

#### Rule 5: Animations with Framer Motion

When adding animations, use Framer Motion with design system components:

```tsx
// Good: Animated component with Framer Motion
'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

#### Rule 6: TypeScript and Props

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

#### Rule 7: Avoid Tailwind Class Overload

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
// Good: Using design system Card
import { Card, CardContent } from '@/components/ui/card';
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

### Component Development Workflow

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
- Button (exists in packages/ui)
- Card (exists in packages/ui)
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

### Code Review Checklist

Before considering a component complete:

- [ ] Component is broken into logical, reusable pieces
- [ ] Using design system components (Button, Card, Input, etc.) instead of custom ones
- [ ] Props are properly typed with TypeScript interfaces
- [ ] Component has sensible default props
- [ ] JSDoc comments explain component purpose
- [ ] Tailwind classes are organized by category (layout, spacing, colors, etc.)
- [ ] No excessive inline Tailwind (10+ classes suggests refactoring needed)
- [ ] Framer Motion animations use 'use client' directive
- [ ] Storybook stories created for reusable components
- [ ] Component location follows project structure conventions
- [ ] Component is exported with named export (not default)

### Common Patterns

**Pattern 1: Section Wrapper**

```tsx
// Reusable section wrapper for consistent spacing
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

**Pattern 2: Feature Card Grid**

```tsx
// Grid pattern for feature cards
import { Card, CardContent } from '@/components/ui/card';

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

**Pattern 3: Animated Entrance**

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

## Environment Configuration

### Backend (.env in apps/api)

```bash
# Application
APP_NAME=Olympus MVP API
ENV=development
DEBUG=true

# Database (choose one approach)
USE_LOCAL_DB=true                           # For Docker PostgreSQL
DATABASE_URL=postgresql+asyncpg://...       # OR explicit connection

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_DB_URL=postgresql+asyncpg://postgres.xxx...  # Direct connection

# Redis
REDIS_URL=redis://localhost:6379
# REDIS_URL=redis://redis:6379  # Docker environment

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# CORS
CORS_ORIGINS=["http://localhost:3000"]
```

### Frontend (.env.local in apps/web)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8000/graphql
```

## Code Quality

### Linting

**Backend (Ruff)**:

- Configuration: `apps/api/pyproject.toml` (comprehensive rule set)
- Enabled rules: pycodestyle, pyflakes, isort, pep8-naming, flake8-\*, pylint, security
- Run: `poetry run ruff check --fix` or `docker-compose exec api poetry run ruff check --fix`

**Frontend (ESLint)**:

- Configuration: `apps/web/.eslintrc.json`
- Extends: `next/core-web-vitals`
- Run: `npm run lint`

### Type Checking

**Backend**: MyPy with strict mode (`pyproject.toml`)

```bash
poetry run mypy app/
```

**Frontend**: TypeScript strict mode (`tsconfig.json`)

```bash
npm run type-check
```

### Pre-commit Hooks

Husky + lint-staged automatically:

1. Formats code with Prettier on staged files
2. Runs ESLint on frontend changes

## Common Workflows

### Adding a New GraphQL Endpoint

1. **Define GraphQL type** in `apps/api/app/graphql/types.py`
2. **Add resolver** in `apps/api/app/graphql/query.py` or `mutation.py`
3. **Regenerate frontend types**:
   ```bash
   cd apps/web
   npm run graphql:generate
   ```
4. **Use in frontend** with React Query

### Adding a New REST Endpoint

1. **Create route** in `apps/api/app/routes/`
2. **Register router** in `apps/api/app/main.py`:
   ```python
   app.include_router(your_router)
   ```
3. **Create API client** in `apps/web/src/lib/api/`
4. **Use with React Query** or direct fetch

### Adding a Database Model

1. **Create model** in `apps/api/app/models/`
2. **Generate migration**:
   ```bash
   docker-compose exec api poetry run alembic revision --autogenerate -m "Add table"
   ```
3. **Review migration** in `apps/api/alembic/versions/`
4. **Apply migration**:
   ```bash
   docker-compose exec api poetry run alembic upgrade head
   ```
5. **Add GraphQL types and resolvers** if needed

### Adding a New Zustand Store

1. **Create store** in `apps/web/src/lib/stores/` or `apps/web/src/store/`
2. **Use devtools and persist middleware** for debugging and persistence
3. **Export from index**: `apps/web/src/lib/stores/index.ts`
4. **Never store server data** - use React Query instead

### Environment Switching

**Switch from Docker to Supabase**:

1. Update `apps/api/.env`: `USE_LOCAL_DB=false`
2. Ensure `SUPABASE_DB_URL` is set
3. Restart: `docker-compose restart api`

**Switch from Supabase to Docker**:

1. Update `apps/api/.env`: `USE_LOCAL_DB=true`
2. Restart: `docker-compose restart api`

## Important Notes

### Git Commit Guidelines

- **Never add "Co-Authored-By: Claude" to commit messages**
- Keep commit messages professional and project-focused
- Follow conventional commit format when applicable (e.g., `feat:`, `fix:`, `docs:`)

### Database Migrations

- **Always review** auto-generated migrations before applying
- **Test migrations** on development data first
- **Supabase pooler issues**: Use MCP server for migrations (see `MIGRATION_AUTOMATION.md`)
- **Migration tracking**: Alembic version table must be manually updated for MCP migrations

### Authentication

- **JWT tokens** have 24-hour expiration (configurable via `JWT_EXPIRATION_HOURS`)
- **Refresh tokens** stored in Redis with 30-day TTL
- **Token blacklisting** on logout prevents reuse
- **GraphQL requests** automatically include JWT via client configuration

### State Management Rules

1. **Server data → React Query** (spaces, documents, users, queries)
2. **UI state → Zustand** (theme, sidebar open/closed, current selections)
3. **Form inputs → React Hook Form** (login form, document upload form)
4. **Component state → useState** (dropdown open, hover state)

Never duplicate server data in Zustand. If it comes from the API, use React Query.

### GraphQL Code Generation

After any backend GraphQL schema changes:

```bash
cd apps/web
npm run graphql:introspect  # Fetch schema
npm run graphql:generate    # Generate TypeScript types
```

Generated files are committed to version control for consistency.

## MCP Server Configuration

This project uses Model Context Protocol (MCP) servers to enhance Claude Code capabilities. The configuration follows a **hybrid approach**: global servers for universal tools, project-specific servers for project tools.

### Project-Specific Servers (.mcp.json)

These servers are automatically available when working in this project:

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    },
    "linear": {
      "type": "stdio",
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.linear.app/sse"]
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=mvqjahridaytxfsuzljy"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_72251866901920fec086e4fc7ff81ff4993b3f17"
      }
    }
  }
}
```

**Purpose**:

- **shadcn**: Access to Shadcn UI component registry for adding/searching design system components
- **linear**: Integration with Linear for issue tracking, project management, and task creation
- **supabase**: Direct access to Supabase management API (database operations, auth, storage)

**Setup**:

- **shadcn**: No additional configuration required
- **linear**: Requires `LINEAR_API_KEY` environment variable (see setup instructions below)
- **supabase**: Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (see setup instructions below)

### Global Servers (Recommended Setup)

These servers should be configured in your **global Claude Code config** (`~/.claude.json`):

#### Required for Full Functionality

**filesystem** (Enhanced file operations):

```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/athena"]
}
```

**memory** (Knowledge graph for project context):

```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"]
}
```

**postgres** (Database query access for Olympus DB):

```json
{
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-postgres",
    "postgresql://olympus:password@localhost:5432/olympus_mvp"
  ]
}
```

**Note**: Replace database credentials with your local setup. Use `USE_LOCAL_DB=true` for Docker PostgreSQL or Supabase connection string for cloud database.

#### Optional but Recommended

**ide** (VS Code integration):

- Usually auto-configured by Claude Code
- Provides enhanced IDE integration (diagnostics, Jupyter kernel for notebooks)

### Why Hybrid Configuration?

| Configuration                      | Purpose                                                      | Location                           |
| ---------------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| **Project-specific** (`.mcp.json`) | Tools specific to Olympus project (shadcn, linear, supabase) | Committed to git, shared with team |
| **Global** (`~/.claude.json`)      | Universal tools (filesystem, memory, postgres, ide)          | Personal config with credentials   |

**Benefits**:

- ✅ Team members automatically get project-specific tools (shadcn, linear, supabase)
- ✅ Database credentials stay out of version control
- ✅ Personal development setup (database, file paths) stays private
- ✅ Universal tools (filesystem, memory) available across all projects

### First-Time Setup

**For new team members**:

1. Project-specific servers (shadcn, linear, supabase) work automatically
2. Configure global servers in `~/.claude.json`:
   - Add **postgres** with your local database connection string
   - Add **filesystem** with path to this repository
   - Add **memory** for knowledge graph (no configuration needed)

3. Verify setup:

   ```bash
   # Test postgres connection
   # Claude Code should be able to query the database

   # Test shadcn
   # Claude Code should be able to search/add components
   ```

### Troubleshooting

**"MCP server not found" error**:

- Check that `~/.claude.json` exists and has correct server configuration
- Restart Claude Code after modifying `.claude.json` or `.mcp.json`

**Postgres connection issues**:

- Verify database is running: `docker-compose ps` (if using Docker)
- Check connection string matches your local setup
- Ensure database exists: `olympus_mvp` for local Docker

**Shadcn not working**:

- This should work automatically via `.mcp.json`
- Try restarting Claude Code if just added

## Documentation

- **Root README**: `README.md` - Quick start and project overview
- **Backend docs**: `apps/api/` - DEVELOPMENT_WORKFLOW.md, DOCKER_SETUP.md, MIGRATION_AUTOMATION.md, LINTING.md
- **ADRs**: `docs/adr/` - Architecture Decision Records (e.g., 001-state-management.md)
- **Frontend docs**: `apps/web/` - DESIGN_SYSTEM.md, STORYBOOK_LAYOUT_COMPONENTS.md
- **Development guide**: `DEVELOPMENT.md` - Coding standards and conventions

## Tech Stack Summary

**Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Shadcn-ui, React Query, Zustand, GraphQL Request
**Backend**: FastAPI, Strawberry GraphQL, SQLAlchemy, Alembic, Redis, Pydantic
**Database**: Supabase PostgreSQL (or Docker PostgreSQL for local dev)
**Testing**: Pytest (backend), Vitest/Playwright (frontend - planned)
**Tooling**: Turborepo, Poetry, Docker, Ruff, ESLint, Prettier
**Deployment**: Vercel (frontend - planned), Render/Fly.io (backend - planned)

## API Documentation

**Development environment**:

- OpenAPI docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- GraphQL playground: http://localhost:8000/graphql (when `DEBUG=true`)

**Production**: Documentation endpoints disabled when `DEBUG=false`
