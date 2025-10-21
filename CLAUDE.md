# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Note**: This documentation is modular for performance. See the [Guides](#detailed-guides) section below for topic-specific documentation.

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

## Quick Start

### Start Development

```bash
# From project root - start all services
npm run dev

# Or start individually
cd apps/web && npm run dev           # Frontend (port 3000)
cd apps/api && docker compose up -d  # Backend (port 8000)
```

### Common Commands

```bash
# Frontend
cd apps/web
npm run dev                     # Dev server
npm run graphql:generate       # Generate types after backend changes
npm run storybook              # Component development (port 6006)

# Backend
cd apps/api
docker compose up -d                                 # Start services
docker compose exec api poetry run pytest           # Run tests
docker compose exec api poetry run alembic upgrade head # Apply migrations
```

See [Development Commands Guide](./docs/guides/development-commands.md) for complete reference.

## Architecture

### Monorepo Structure

- **`apps/web/`** - Next.js 14 frontend with App Router
- **`apps/api/`** - FastAPI backend with Strawberry GraphQL
- **`packages/ui/`** - Shared React components (import as `@olympus/ui`)
- **`packages/types/`** - Shared TypeScript types
- **`packages/config/`** - Shared ESLint/Prettier configs

### State Management (ADR-001)

The frontend uses a **hybrid state management approach**:

- **React Query (TanStack Query)** - Server state from GraphQL API (spaces, documents, queries)
- **Zustand** - Client state (UI, theme, navigation, auth tokens)
- **React Hook Form** - Form state and validation
- **Yjs** (planned) - Real-time collaborative state
- **useState/useReducer** - Component-local state

**Key principle**: Never put server data in Zustand. Use React Query for all API data.

See [Frontend Guide](./docs/guides/frontend-guide.md) for detailed patterns.

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

See [Environment Setup Guide](./docs/guides/environment-setup.md) for configuration.

## Component Development Philosophy

**Core Principle**: Build composable, reusable components rather than monolithic page components.

**Component Hierarchy**:

1. **Design System Components** (`packages/ui`) - Base primitives imported as `@olympus/ui`
2. **Layout Components** (`apps/web/src/components/layout/`) - Application structure
3. **Feature Components** (`apps/web/src/components/[feature]/`) - Domain-specific components
4. **Page Components** (`apps/web/src/app/`) - Composition of all above

**Key Rules**:

- ✅ **Always import design system components from `@olympus/ui`** (Button, Card, Input, etc.)
- ✅ Prefer composition over monolithic components
- ✅ Use TypeScript with proper interfaces
- ✅ Create Storybook stories for reusable components
- ❌ Never create custom buttons/cards when design system components exist

**Example**:

```tsx
// Good: Using design system component
import { Button, Card } from '@olympus/ui';

export function FeatureSection() {
  return (
    <Card>
      <Button size="lg">Get Started</Button>
    </Card>
  );
}
```

See [Component Development Guide](./docs/guides/component-development.md) for complete best practices.

## Backend Development

### Application Structure

```
apps/api/app/
├── auth/           # JWT authentication
├── db/             # Database session and connection
├── graphql/        # Strawberry GraphQL
├── middleware/     # CORS, auth injection
├── models/         # SQLAlchemy models
├── routes/         # REST endpoints
├── services/       # Business logic layer
├── config.py       # Pydantic settings
└── main.py         # FastAPI app factory
```

### Key Patterns

**Configuration**: Environment-based settings via Pydantic

```python
from app.config import settings
# settings.db_url handles Docker/Supabase switching
```

**Database sessions**: Async SQLAlchemy with dependency injection

```python
from app.db.session import get_db

async def my_route(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
```

**GraphQL context**: Strawberry resolvers receive FastAPI request

```python
@strawberry.field
async def me(self, info: Info) -> User:
    request = info.context["request"]
    user = request.state.user  # From AuthenticationMiddleware
```

See [Backend Guide](./docs/guides/backend-guide.md) for complete patterns.

## Tech Stack Summary

**Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Shadcn-ui (`@olympus/ui`), React Query, Zustand, GraphQL Request
**Backend**: FastAPI, Strawberry GraphQL, SQLAlchemy, Alembic, Redis, Pydantic
**AI/ML Layer**: LangChain, LangGraph (simple queries), CrewAI (multi-agent - Phase 3+), pgvector, LangSmith
**Database**: Supabase PostgreSQL (or Docker PostgreSQL for local dev)
**Testing**: Pytest (backend), Vitest/Playwright (frontend - planned)
**Tooling**: Turborepo, Poetry, Docker, Ruff, ESLint, Prettier
**Deployment**: Vercel (frontend - planned), Render/Fly.io (backend - planned)

## Detailed Guides

For in-depth information, refer to these topic-specific guides:

### Development Guides

- **[Development Commands](./docs/guides/development-commands.md)** - Complete command reference for frontend, backend, and database operations
- **[Environment Setup](./docs/guides/environment-setup.md)** - Environment variables, MCP server configuration, database setup
- **[Component Development](./docs/guides/component-development.md)** - Component architecture, creation rules, best practices, Storybook

### Architecture Guides

- **[Frontend Guide](./docs/guides/frontend-guide.md)** - State management, data fetching, GraphQL, SSE streaming
- **[Backend Guide](./docs/guides/backend-guide.md)** - FastAPI patterns, GraphQL, authentication, AI agents

### Project Documentation

- **Root README**: `README.md` - Quick start and project overview
- **Backend docs**: `apps/api/` - DEVELOPMENT_WORKFLOW.md, DOCKER_SETUP.md, MIGRATION_AUTOMATION.md, LINTING.md
- **ADRs**: `docs/adr/` - Architecture Decision Records (e.g., 001-state-management.md, 002-ai-orchestration.md)
- **Frontend docs**: `apps/web/` - DESIGN_SYSTEM.md, STORYBOOK_LAYOUT_COMPONENTS.md

## API Documentation

**Development environment**:

- OpenAPI docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- GraphQL playground: http://localhost:8000/graphql (when `DEBUG=true`)

**Production**: Documentation endpoints disabled when `DEBUG=false`

## Important Reminders

### Component Imports

- **Always use `@olympus/ui`** for design system components (Button, Card, Input, etc.)
- Never create custom primitives when design system components exist
- Check `packages/ui` first before creating new components

### State Management

1. **Server data → React Query** (spaces, documents, users, queries)
2. **Streaming data → Custom hooks** (SSE streams for AI responses)
3. **UI state → Zustand** (theme, sidebar open/closed, current selections)
4. **Form inputs → React Hook Form** (login form, document upload form)
5. **Component state → useState** (dropdown open, hover state)

Never duplicate server data in Zustand.

### GraphQL & React Query Patterns

**Organization:** Create reusable React Query hooks organized by entity in `hooks/queries/`:

```typescript
// hooks/queries/useSpaces.ts
export function useSpaces() {
  /* ... */
}
export function useCreateSpace() {
  /* ... */
}

// Re-export generated types (safe from cycles)
export type { Space, CreateSpaceInput } from '@/lib/api/generated';
```

**Type Extensions:** Keep UI-specific type extensions in `types/ui/`:

```typescript
// types/ui/spaces.ts
import type { Space } from '@/lib/api/generated';

export interface SpaceListItem extends Space {
  isSelected: boolean;
}
```

**Avoiding Cycles:** Follow strict dependency layers:

- `generated.ts` → `types/ui/` → `hooks/queries/` → components
- ✅ Re-export generated types from hooks
- ❌ Never re-export UI types from hooks (creates cycle risk)

See [Frontend Guide - GraphQL Queries & React Query Hooks](./docs/guides/frontend-guide.md#graphql-queries--react-query-hooks-organization) for complete patterns.

### Git Commits

- **Never add "Co-Authored-By: Claude"** to commit messages
- Keep commit messages professional and project-focused
- Follow conventional commit format (e.g., `feat:`, `fix:`, `docs:`)

### GraphQL Workflow

After any backend GraphQL schema changes:

```bash
cd apps/web
npm run graphql:introspect  # Fetch schema
npm run graphql:generate    # Generate TypeScript types
```

### Database Migrations

- **Always review** auto-generated migrations before applying
- **Test migrations** on development data first
- **Supabase migrations**: Use MCP server (see `apps/api/MIGRATION_AUTOMATION.md`)

### Pre-Commit Checks

**IMPORTANT:** Run these checks before committing to prevent CI failures:

**Frontend:**

```bash
cd apps/web
npm run type-check && npm run lint && npm run format
```

**Backend:**

```bash
cd apps/api
docker compose exec api poetry run ruff format && \
docker compose exec api poetry run ruff check --fix && \
docker compose exec api poetry run mypy app/ && \
docker compose exec api poetry run pytest
```

**GraphQL schema changed?** Regenerate types: `npm run graphql:generate`

See [Development Commands - Pre-Commit Checklist](./docs/guides/development-commands.md#pre-commit-checklist) for complete workflows.

## Getting Help

If you need more details on any topic, refer to the appropriate guide in `docs/guides/` or ask for clarification.
