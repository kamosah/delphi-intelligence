# Development Commands Reference

This guide provides a comprehensive reference of all development commands for the Olympus MVP project.

## Root Commands (Turborepo)

Run these commands from the project root:

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

## Frontend Commands (apps/web)

Navigate to the frontend directory first:

```bash
cd apps/web
```

### Development Server

```bash
npm run dev                  # Standard Next.js dev server
npm run dev:turbo           # Next.js with Turbo mode
```

### Type Checking

```bash
npm run type-check          # Single run
npm run type-check:watch    # Watch mode
```

### GraphQL Code Generation

```bash
npm run graphql:introspect  # Introspect backend schema
npm run graphql:generate    # Generate TypeScript types
npm run graphql:watch       # Watch mode for codegen
```

### Storybook

```bash
npm run storybook           # Start Storybook dev server (port 6006)
npm run build-storybook     # Build static Storybook
```

### Build & Production

```bash
npm run build               # Production build
npm run start               # Start production server
```

### Clean

```bash
npm run clean               # Remove .next, dist, and caches
```

## Backend Commands (apps/api)

Navigate to the backend directory first:

```bash
cd apps/api
```

### Docker Development (Recommended)

**Start services:**

```bash
# Start all services (PostgreSQL + Redis + API)
docker compose up -d

# View API logs
docker compose logs -f api

# Stop services
docker compose down
```

**Run tests:**

```bash
# Run all tests
docker compose exec api poetry run pytest

# Run specific test file
docker compose exec api poetry run pytest tests/test_auth.py

# Run specific test
docker compose exec api poetry run pytest tests/test_auth.py::test_login

# Run with coverage
docker compose exec api poetry run pytest --cov=app tests/
```

**Linting and formatting:**

```bash
# Format code with Ruff
docker compose exec api poetry run ruff format

# Check code with Ruff
docker compose exec api poetry run ruff check

# Auto-fix issues
docker compose exec api poetry run ruff check --fix
```

**Type checking:**

```bash
docker compose exec api poetry run mypy app/
```

**Database operations:**

```bash
# Apply migrations
docker compose exec api poetry run alembic upgrade head

# Generate new migration
docker compose exec api poetry run alembic revision --autogenerate -m "description"

# Rollback one migration
docker compose exec api poetry run alembic downgrade -1

# Show current migration version
docker compose exec api poetry run alembic current

# Show migration history
docker compose exec api poetry run alembic history

# Access PostgreSQL directly
docker compose exec postgres psql -U olympus -d olympus_mvp
```

### Local Development (Without Docker)

**Setup:**

```bash
# Activate Poetry environment
poetry shell
```

**Development server:**

```bash
# Start dev server (with hot reload)
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Run tests:**

```bash
# Run all tests
poetry run pytest

# Run specific test with verbose output
poetry run pytest tests/test_auth.py::test_login -v

# Run with coverage
poetry run pytest --cov=app tests/

# Custom test runner (with detailed output)
python run_tests.py
```

**Linting:**

```bash
poetry run ruff format
poetry run ruff check --fix
```

**Migrations:**

```bash
poetry run alembic upgrade head
poetry run alembic revision --autogenerate -m "description"
```

## Database Migrations

### Migration Workflow

**Using Docker:**

```bash
cd apps/api

# Apply migrations
docker compose exec api poetry run alembic upgrade head

# Rollback one migration
docker compose exec api poetry run alembic downgrade -1

# Show current version
docker compose exec api poetry run alembic current

# Show all migrations
docker compose exec api poetry run alembic history
```

**Important**: Migrations for Supabase use MCP server to bypass connection pooler limitations. See `apps/api/MIGRATION_AUTOMATION.md` for details.

### Environment Switching

**Switch from Docker to Supabase:**

1. Update `apps/api/.env`: `USE_LOCAL_DB=false`
2. Ensure `SUPABASE_DB_URL` is set
3. Restart: `docker compose restart api`

**Switch from Supabase to Docker:**

1. Update `apps/api/.env`: `USE_LOCAL_DB=true`
2. Restart: `docker compose restart api`

## Quick Reference

### Most Common Commands

**Start development:**

```bash
# From project root
npm run dev                              # Start all services

# Or start individually
cd apps/web && npm run dev           # Frontend only
cd apps/api && docker compose up -d  # Backend only
```

**Run tests:**

```bash
# Frontend
cd apps/web && npm run test

# Backend
cd apps/api && docker compose exec api poetry run pytest
```

**Lint and format:**

```bash
# Root (all workspaces)
npm run lint
npm run format

# Frontend
cd apps/web && npm run lint

# Backend
cd apps/api && docker compose exec api poetry run ruff check --fix
```

**Database migrations:**

```bash
cd apps/api

# Apply latest migrations
docker compose exec api poetry run alembic upgrade head

# Generate new migration
docker compose exec api poetry run alembic revision --autogenerate -m "Add feature"
```

**GraphQL type generation:**

```bash
cd apps/web

# After backend schema changes
npm run graphql:introspect
npm run graphql:generate
```

## Pre-Commit Checklist

**IMPORTANT:** Always run these checks before committing changes to ensure code quality and prevent CI failures.

### Frontend Changes (apps/web)

Run these commands from `apps/web/`:

```bash
# 1. Type checking
npm run type-check

# 2. Linting
npm run lint

# 3. Code formatting (auto-fix)
npm run format

# 4. Run tests (when available)
npm run test

# 5. Build check (optional but recommended)
npm run build
```

**Quick pre-commit script:**

```bash
cd apps/web
npm run type-check && npm run lint && npm run format
```

### Backend Changes (apps/api)

Run these commands from `apps/api/`:

**Using Docker (recommended):**

```bash
# 1. Format code with Ruff
docker compose exec api poetry run ruff format

# 2. Lint with Ruff
docker compose exec api poetry run ruff check --fix

# 3. Type checking with MyPy
docker compose exec api poetry run mypy app/

# 4. Run tests
docker compose exec api poetry run pytest
```

**Using local Poetry:**

```bash
cd apps/api

# 1. Format code
poetry run ruff format

# 2. Lint code
poetry run ruff check --fix

# 3. Type checking
poetry run mypy app/

# 4. Run tests
poetry run pytest
```

**Quick pre-commit script (Docker):**

```bash
cd apps/api
docker compose exec api poetry run ruff format && \
docker compose exec api poetry run ruff check --fix && \
docker compose exec api poetry run mypy app/ && \
docker compose exec api poetry run pytest
```

### GraphQL Schema Changes

If you modified GraphQL schema on backend:

```bash
# 1. Ensure backend is running
cd apps/api && docker compose up -d

# 2. Regenerate types on frontend
cd apps/web
npm run graphql:introspect
npm run graphql:generate

# 3. Commit generated files
git add src/lib/api/generated.ts
```

### Complete Pre-Commit Workflow

**For frontend-only changes:**

```bash
cd apps/web
npm run type-check && npm run lint && npm run format && npm run build
```

**For backend-only changes:**

```bash
cd apps/api
docker compose exec api poetry run ruff format && \
docker compose exec api poetry run ruff check --fix && \
docker compose exec api poetry run mypy app/ && \
docker compose exec api poetry run pytest
```

**For full-stack changes:**

```bash
# Backend checks
cd apps/api
docker compose exec api poetry run ruff format
docker compose exec api poetry run ruff check --fix
docker compose exec api poetry run mypy app/
docker compose exec api poetry run pytest

# Frontend checks
cd ../web
npm run graphql:generate  # If schema changed
npm run type-check
npm run lint
npm run format
npm run build
```

### Automated Pre-Commit Hooks

The project uses **Husky + lint-staged** for automated pre-commit checks:

- Automatically formats staged files with Prettier
- Runs ESLint on frontend changes

**These hooks run automatically on `git commit`**, but you should still run full checks manually before committing to catch:

- Type errors
- Test failures
- Build issues

### Pre-Commit Checklist Summary

Before committing, ensure:

- [ ] Code is formatted (`ruff format` / `npm run format`)
- [ ] Linting passes (`ruff check` / `npm run lint`)
- [ ] Type checking passes (`mypy` / `npm run type-check`)
- [ ] Tests pass (`pytest` / `npm run test`)
- [ ] Build succeeds (`npm run build` for frontend)
- [ ] GraphQL types regenerated (if schema changed)
- [ ] No console.log or debugging code left in
- [ ] Commit message follows conventions (`feat:`, `fix:`, `docs:`)

## Troubleshooting

**Port conflicts:**

- Frontend (3000): Next.js dev server
- Backend (8000): FastAPI server
- Storybook (6006): Storybook dev server
- PostgreSQL (5432): Database
- Redis (6379): Session store

**Clear caches:**

```bash
# Frontend
cd apps/web && npm run clean

# Backend (remove containers and volumes)
cd apps/api && docker compose down -v
```

**Reset database:**

```bash
cd apps/api

# Docker environment
docker compose down -v
docker compose up -d

# Local environment
dropdb olympus_mvp && createdb olympus_mvp
poetry run alembic upgrade head
```
