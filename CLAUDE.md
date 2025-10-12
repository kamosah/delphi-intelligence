# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Olympus MVP (codenamed "Athena") is an AI-powered document intelligence platform built as a Turborepo monorepo with a Next.js 14 frontend and FastAPI backend. The project follows a modern tech stack with hybrid authentication, GraphQL data layer, and a sophisticated state management architecture.

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
