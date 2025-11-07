# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Note**: This documentation is modular for performance. See the [Guides](#detailed-guides) section below for topic-specific documentation.

## Project Overview

Olympus MVP (codenamed "Athena") is an AI-powered document intelligence platform built as a Turborepo monorepo with a Next.js 14 frontend and FastAPI backend. The project follows a modern tech stack with hybrid authentication, GraphQL data layer, and a sophisticated state management architecture.

## Project Context

**Inspiration**: This project combines two enterprise AI platforms:

1. **[Athena Intelligence](https://www.athenaintel.com/)** - Document intelligence and AI-powered analysis
   - **Olympus Platform**: AI-native infrastructure with integrated analysis tools
   - **Athena AI Agent**: An autonomous "artificial data analyst"

2. **[Hex](https://hex.tech/)** - Data analytics and notebook platform (UI/UX inspiration)
   - **Threads**: Conversational analytics interface
   - **Notebook Agent**: AI-assisted SQL and Python notebooks
   - **Semantic Modeling**: Business logic layer for databases

**Our Goal**: Build a **hybrid intelligence platform** that combines:

1. **Document Intelligence** (Athena-inspired): Upload, processing, extraction, Q&A
2. **Database Analytics** (Hex-inspired): SQL queries, data visualization, semantic modeling
3. **Unified AI Agent**: Single conversational interface for both SQL and document queries
4. **Collaborative Workspaces** (Spaces): Team collaboration with access controls
5. **Enterprise Security**: Audit trails, RLS, credential encryption

**Design Direction**: **100% Hex aesthetic** across all features (document + database) for a unified, professional, data-first user experience.

**Key References**:

- [Product Requirements Document](./docs/PRODUCT_REQUIREMENTS.md) - Full product spec with hybrid approach
- [Hybrid Architecture](./docs/HYBRID_ARCHITECTURE.md) - Technical architecture for unified platform
- [Feature Alignment](./docs/FEATURE_ALIGNMENT.md) - 3-way comparison (Athena/Hex/Olympus)
- [Database Integration](./docs/DATABASE_INTEGRATION.md) - Connector roadmap and implementation
- [HEX_DESIGN_SYSTEM.md](./docs/HEX_DESIGN_SYSTEM.md) - Complete design patterns reference
- [hex-component-mapping.md](./docs/guides/hex-component-mapping.md) - Component implementation guide

When working on features, refer to these documents to ensure alignment with both platforms' capabilities and the unified design aesthetic.

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

### Vector Search & RAG Pipeline

**Semantic Search Infrastructure** (pgvector + OpenAI Embeddings):

The platform uses **pgvector** for semantic document search, enabling AI-powered retrieval based on meaning rather than keywords.

**Architecture:**

```
Upload → Extract Text → Chunk (750 tokens) → Embed (OpenAI) → Store (pgvector) → Search (cosine similarity)
```

**Key Components:**

1. **ChunkingService** (`apps/api/app/services/chunking_service.py`)
   - Splits documents into ~750 token chunks
   - Preserves sentence boundaries (NLTK)
   - 100 token overlap between chunks

2. **EmbeddingService** (`apps/api/app/services/embedding_service.py`)
   - Generates embeddings via OpenAI `text-embedding-3-small` (1536 dimensions)
   - Batch processing (100 chunks per call)
   - Retry logic for rate limits (exponential backoff)

3. **VectorSearchService** (`apps/api/app/services/vector_search_service.py`)
   - Semantic similarity search using cosine distance
   - Filters by space_id, document_ids
   - Configurable top-k and similarity threshold

4. **Query Agent** (`apps/api/app/agents/query_agent.py`)
   - RAG (Retrieval-Augmented Generation) pipeline using LangGraph
   - Workflow: retrieve_context → generate_response → add_citations
   - Automatically uses vector search when users ask questions in Threads

**Frontend Integration:**

- GraphQL query: `searchDocuments(input: SearchDocumentsInput!)`
- React Query hook: `useSearchDocuments()` from `@/hooks/useVectorSearch`
- VectorSearchDebugger: `/debug/vector-search` (dev-only tool for tuning)

**Database Schema:**

```sql
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    embedding vector(1536),  -- pgvector type
    chunk_index INTEGER NOT NULL,
    token_count INTEGER NOT NULL,
    start_char BIGINT,
    end_char BIGINT,
    chunk_metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- IVFFlat index for fast similarity search
CREATE INDEX idx_document_chunks_embedding_cosine
    ON document_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

**Performance:**

- Target latency: <500ms per query
- Embedding cost: ~$0.02 per 1M tokens (text-embedding-3-small)
- Index type: IVFFlat (lists=100 for ~10K chunks)

**Important Notes:**

- Vector search is **backend-only** - users don't directly "search", they ask questions in Threads
- The AI agent automatically uses vector search for document-related queries
- VectorSearchDebugger is for development/tuning only, not exposed to end users
- All documents are automatically chunked and embedded during upload processing

See [Vector Search Guide](./docs/guides/vector-search-guide.md) for complete architecture, API reference, and performance tuning.

## Component Development Philosophy

**Core Principle**: Build composable, reusable components following the Hex design aesthetic rather than monolithic page components.

**Design System**: All UI components follow **100% Hex aesthetic** for a unified, professional, data-first user experience. See:

- **[HEX_DESIGN_SYSTEM.md](./docs/HEX_DESIGN_SYSTEM.md)** - Complete design patterns and visual reference
- **[hex-component-mapping.md](./docs/guides/hex-component-mapping.md)** - Component implementation guide
- **[apps/web/DESIGN_SYSTEM.md](./apps/web/DESIGN_SYSTEM.md)** - Frontend design system documentation

**Component Hierarchy**:

1. **Design System Components** (`packages/ui`) - Shadcn-ui base components styled with Hex aesthetic, imported as `@olympus/ui`
2. **Layout Components** (`apps/web/src/components/layout/`) - Application structure (Threads chat, notebook cells, etc.)
3. **Feature Components** (`apps/web/src/components/[feature]/`) - Domain-specific components (database connections, source badges, etc.)
4. **Page Components** (`apps/web/src/app/`) - Composition of all above

**Key Rules**:

- ✅ **Always import design system components from `@olympus/ui`** (Button, Card, Input, etc.)
- ✅ **Check [hex-component-mapping.md](./docs/guides/hex-component-mapping.md) before building new components** to ensure Hex aesthetic alignment
- ✅ Use Hex design patterns (gradients for primary actions, source badges for SQL/document results, rounded corners, etc.)
- ✅ Prefer composition over monolithic components
- ✅ Use TypeScript with proper interfaces
- ✅ Create Storybook stories for reusable components
- ❌ Never create custom primitives when design system components exist
- ❌ Never deviate from Hex aesthetic without explicit user approval

**Frontend Code Quality Rules**:

- ❌ **No nested ternaries** - Use early returns, intermediate variables, or helper functions for clarity
- ✅ **Separate concerns** - Split multi-component files into individual files
- ✅ **Extract shared utilities** - Place reusable logic in `lib/utils/` or `lib/helpers/`
- ✅ **Extract shared types** - Place reusable types in `types/ui/` or `types/domain/`
- ✅ **Maximize reusability** - Consider shareability when creating utilities and types

**Example**:

```tsx
// Good: Using design system components with Hex aesthetic
import { Button, Card, Badge } from '@olympus/ui';

export function DatabaseConnectionCard({ connection }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      {' '}
      {/* Hex: shadow on hover */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{connection.name}</h3>
        <Badge className="bg-green-100 text-green-700">Connected</Badge>
      </div>
      <Button className="bg-gradient-to-r from-blue-500 to-blue-600">
        {' '}
        {/* Hex: gradient */}
        Test Connection
      </Button>
    </Card>
  );
}
```

See [Component Development Guide](./docs/guides/component-development.md) and [hex-component-mapping.md](./docs/guides/hex-component-mapping.md) for complete best practices.

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

## Linear Workspace

**Team**: Logarithmic
**Team ID**: `c82a64d5-68cb-4728-bf2f-7567c5a27777`

**Project**: Olympus MVP
**Project ID**: `f38a33af-fdc7-42c8-aa23-dd3ddc6f4e4c`

**Story Point Scale**: Modified Fibonacci (0.5, 1, 2, 3, 5, 8, 13, 20)

- 0.5 points = ~1 hour
- 1 point = ~2 hours
- 2 points = ~3-4 hours
- 3 points = ~4-6 hours
- 5 points = ~6-10 hours
- 8 points = ~10-15 hours
- 13 points = ~15-20 hours
- 20 points = 20+ hours (should break down)

**Usage**: When creating Linear tickets, use the team ID and project ID for proper organization. All tickets should use story points for estimation following the Modified Fibonacci scale.

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

### GitHub Operations

**IMPORTANT**: Use GitHub MCP tools instead of `gh` CLI for all GitHub operations:

- **PR operations**: Use `mcp__github__get_pull_request`, `mcp__github__get_pull_request_comments`, `mcp__github__create_pull_request`, etc.
- **Issue management**: Use `mcp__github__create_issue`, `mcp__github__list_issues`, `mcp__github__get_issue`, etc.
- **Repository operations**: Use `mcp__github__get_file_contents`, `mcp__github__push_files`, `mcp__github__create_branch`, etc.
- **Code review**: Use `mcp__github__create_pull_request_review`, `mcp__github__get_pull_request_files`, etc.

**Rationale**: GitHub MCP provides better integration and doesn't require `gh` CLI to be installed in the Docker environment.

**Example PR review workflow**:

```bash
# Fetch PR details
mcp__github__get_pull_request(owner="kamosah", repo="olympus", pull_number=11)

# Get PR comments
mcp__github__get_pull_request_comments(owner="kamosah", repo="olympus", pull_number=11)
```

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
npm run type-check && npm run lint
```

> **Note:** Formatting is handled automatically by lint-staged on commit.

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
