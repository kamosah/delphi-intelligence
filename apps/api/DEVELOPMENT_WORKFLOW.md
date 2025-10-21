# Development Workflow Guide

This guide covers the different development workflows available for the Olympus API, including both Docker and local development setups.

## Overview

The Olympus API supports two primary development workflows:

1. **Docker-based Development** (Recommended) - Complete containerized environment
2. **Local Development** - Native Python environment with external database

## Docker Development Workflow

### Initial Setup

```bash
# Clone and navigate to API directory
cd apps/api

# Start all services
docker compose up -d

# Verify everything is running
docker compose ps
```

### Daily Development Cycle

```bash
# 1. Start your development session
docker compose up -d
docker compose logs -f api

# 2. Make code changes in your editor
# Files automatically sync via volume mounts

# 3. Hot reload happens automatically
# Watch logs for restart confirmation

# 4. Test your changes
curl http://localhost:8000/
open http://localhost:8000/docs

# 5. Run tests
docker compose exec api poetry run pytest

# 6. End development session
docker compose down
```

### Database Operations in Docker

```bash
# Run migrations
docker compose exec api poetry run alembic upgrade head

# Create new migration
docker compose exec api poetry run alembic revision --autogenerate -m "Add new table"

# Access PostgreSQL directly
docker compose exec postgres psql -U olympus -d olympus_mvp

# Backup database
docker compose exec postgres pg_dump -U olympus olympus_mvp > backup.sql

# Restore database
docker compose exec -T postgres psql -U olympus -d olympus_mvp < backup.sql
```

### Switching Between Database Configurations

#### Using Docker PostgreSQL (Default)

```bash
# In .env file
USE_LOCAL_DB=true
DATABASE_URL=postgresql+asyncpg://olympus:olympus_dev@postgres:5432/olympus_mvp
```

#### Using Supabase Database

```bash
# In .env file
USE_LOCAL_DB=false
DATABASE_URL=postgresql+asyncpg://your-supabase-connection-string
# OR
SUPABASE_DB_URL=postgresql+asyncpg://your-supabase-connection-string

# Restart API to pick up new configuration
docker compose restart api
```

## Local Development Workflow

### Prerequisites

```bash
# Install Python 3.11+
pyenv install 3.11.0
pyenv local 3.11.0

# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Install Redis (optional)
brew install redis
brew services start redis
```

### Setup

```bash
# Install dependencies
poetry install

# Set up local database
createdb olympus_mvp

# Configure environment
cp .env.example .env
# Edit .env for local configuration:
# DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/olympus_mvp
# USE_LOCAL_DB=true

# Run migrations
poetry run alembic upgrade head
```

### Daily Development Cycle

```bash
# 1. Start local services (if needed)
brew services start postgresql
brew services start redis  # optional

# 2. Activate virtual environment and start API
poetry shell
poetry run uvicorn app.main:app --reload

# 3. Make code changes
# Hot reload happens automatically

# 4. Run tests
poetry run pytest

# 5. Database operations
poetry run alembic revision --autogenerate -m "description"
poetry run alembic upgrade head
```

## Database Workflow Comparison

### Docker PostgreSQL Workflow

**Pros:**

- ✅ Consistent environment across team
- ✅ No local PostgreSQL installation required
- ✅ Easy to reset/clean database
- ✅ Isolated from host system
- ✅ Matches production environment closely

**Cons:**

- ❌ Requires Docker Desktop
- ❌ Slightly slower startup
- ❌ Additional resource usage

**Best for:**

- Team development
- New developers onboarding
- Consistent environment needs
- CI/CD pipelines

### Supabase Workflow

**Pros:**

- ✅ Cloud-hosted database
- ✅ Built-in features (auth, real-time, storage)
- ✅ Automatic backups
- ✅ Scalable infrastructure
- ✅ Web dashboard for database management

**Cons:**

- ❌ Requires internet connection
- ❌ Shared database can have conflicts
- ❌ Rate limits on free tier
- ❌ Migration testing affects shared DB

**Best for:**

- Production deployment
- Prototyping and demos
- Teams needing cloud features
- Remote development

### Local PostgreSQL Workflow

**Pros:**

- ✅ Fastest performance
- ✅ Full control over database
- ✅ Works offline
- ✅ Traditional development setup

**Cons:**

- ❌ Requires local PostgreSQL installation
- ❌ Environment inconsistencies
- ❌ Manual database management
- ❌ Setup complexity for new developers

**Best for:**

- Experienced developers
- Performance-critical development
- Offline development
- Custom database configurations

## Common Development Tasks

### Adding New Dependencies

#### Docker Environment

```bash
# Add runtime dependency
docker compose exec api poetry add fastapi-users

# Add development dependency
docker compose exec api poetry add --group dev pytest-mock

# Rebuild container to persist changes
docker compose up --build -d api
```

#### Local Environment

```bash
# Add dependencies normally
poetry add fastapi-users
poetry add --group dev pytest-mock
```

### Running Tests

#### Docker Environment

```bash
# Run all tests
docker compose exec api poetry run pytest

# Run specific test
docker compose exec api poetry run pytest tests/test_main.py::test_read_main

# Run with coverage
docker compose exec api poetry run pytest --cov=app tests/

# Run tests with database reset
docker compose exec api poetry run pytest --database-reset
```

#### Local Environment

```bash
# Same commands without docker compose exec
poetry run pytest
poetry run pytest tests/test_main.py::test_read_main
poetry run pytest --cov=app tests/
```

### Database Migrations

#### Creating Migrations

```bash
# Docker
docker compose exec api poetry run alembic revision --autogenerate -m "Add user table"

# Local
poetry run alembic revision --autogenerate -m "Add user table"
```

#### Applying Migrations

```bash
# Docker
docker compose exec api poetry run alembic upgrade head

# Local
poetry run alembic upgrade head
```

#### Migration Best Practices

1. **Review generated migrations** before applying
2. **Test migrations** on development data
3. **Backup production data** before applying in production
4. **Use descriptive migration messages**
5. **Keep migrations small and focused**

### Code Quality Checks

#### Docker Environment

```bash
# Format code
docker compose exec api poetry run ruff format

# Lint code
docker compose exec api poetry run ruff check

# Type checking
docker compose exec api poetry run mypy app/
```

#### Local Environment

```bash
# Same commands without docker compose exec
poetry run ruff format
poetry run ruff check
poetry run mypy app/
```

## Environment Switching Guide

### From Docker to Supabase

1. **Update .env file:**

   ```bash
   USE_LOCAL_DB=false
   DATABASE_URL=your-supabase-connection-string
   ```

2. **Restart API:**

   ```bash
   docker compose restart api
   ```

3. **Run migrations on Supabase:**
   ```bash
   docker compose exec api poetry run alembic upgrade head
   ```

### From Supabase to Docker

1. **Update .env file:**

   ```bash
   USE_LOCAL_DB=true
   DATABASE_URL=postgresql+asyncpg://olympus:olympus_dev@postgres:5432/olympus_mvp
   ```

2. **Restart services:**

   ```bash
   docker compose restart api
   ```

3. **Run migrations on local DB:**
   ```bash
   docker compose exec api poetry run alembic upgrade head
   ```

### From Local to Docker

1. **Stop local services:**

   ```bash
   brew services stop postgresql
   brew services stop redis
   ```

2. **Start Docker services:**

   ```bash
   docker compose up -d
   ```

3. **Update .env for Docker:**
   ```bash
   DATABASE_URL=postgresql+asyncpg://olympus:olympus_dev@postgres:5432/olympus_mvp
   REDIS_URL=redis://redis:6379/0
   ```

## Troubleshooting Common Issues

### Port Conflicts

```bash
# Check what's using the port
lsof -i :8000
lsof -i :5432

# Kill process using port
kill -9 $(lsof -t -i:8000)

# Use different port in docker compose.yml
services:
  api:
    ports:
      - "8001:8000"  # Use port 8001 instead
```

### Database Connection Issues

```bash
# Test database connection
docker compose exec api python -c "from app.db.session import engine; print('Connected!')"

# Check database is accessible
docker compose exec postgres psql -U olympus -d olympus_mvp -c "SELECT 1;"

# Reset database completely
docker compose down -v
docker compose up -d
```

### Dependency Issues

```bash
# Clear Poetry cache
poetry cache clear --all pypi

# Reinstall dependencies
poetry install --sync

# Rebuild Docker containers
docker compose build --no-cache
```

## Best Practices

### General Development

- Use Docker for consistent environments
- Keep .env files secure and never commit them
- Regular database backups before major changes
- Use feature branches for development
- Run tests before committing code

### Docker Development

- Use `docker compose logs -f api` to monitor startup
- Restart API container for quick changes: `docker compose restart api`
- Clean up regularly: `docker system prune`
- Use volume mounts for source code hot reloading

### Database Management

- Always review auto-generated migrations
- Test migrations on development data first
- Use meaningful migration messages
- Keep database schema documented
- Regular backups of important data

### Code Quality

- Format code before committing
- Run linting and type checks
- Maintain test coverage above 80%
- Use meaningful commit messages
- Review code changes before merging
