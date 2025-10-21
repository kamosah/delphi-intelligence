# Automated Alembic Migration Setup with Supabase

## Overview

This setup provides automated migration generation for Supabase PostgreSQL databases with full authentication integration, eliminating the need to write migration scripts manually.

## Features

✅ **Automatic migration detection** - Alembic compares your SQLAlchemy models with the database schema
✅ **Supabase integration** - Works with Supabase's connection pooler (Session Mode)
✅ **Enhanced change detection** - Detects column types, defaults, and schema changes
✅ **Docker-based development** - Run migrations via Docker containers
✅ **PgBouncer compatibility** - Configured to work with Supabase's pooler

## Architecture

**Database**: Supabase PostgreSQL (Session Mode pooler)
**Authentication**: Supabase Auth + Custom JWT tokens
**Session Management**: Redis for token storage
**Container Platform**: Docker Compose (Redis + FastAPI)

## Configuration

### Environment Variables

Your `.env` file should contain:

```bash
# Supabase Configuration
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database - Supabase Session Mode Pooler
# Use Session Mode pooler (port 5432) which supports all database features
SUPABASE_DB_URL=postgresql+asyncpg://postgres.[PROJECT-REF]:[PASSWORD]@aws-X-us-east-X.pooler.supabase.com:5432/postgres
DATABASE_URL=postgresql+asyncpg://postgres.[PROJECT-REF]:[PASSWORD]@aws-X-us-east-X.pooler.supabase.com:5432/postgres

# Redis (for session management)
REDIS_URL=redis://redis:6379/0

# JWT Configuration
JWT_SECRET=your-jwt-secret-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
```

### Connection Configuration

**Important**: The configuration uses Supabase's **Session Mode pooler**:

- **Port 5432** (Session Mode) - Supports all database features including migrations
- **Host**: `aws-X-us-east-X.pooler.supabase.com` (region-specific)
- **User**: `postgres.[PROJECT-REF]` (note the dot notation)

**Why Session Mode?**

- Transaction Mode (port 6543): Limited, doesn't support prepared statements well
- Session Mode (port 5432): Full feature support, better for migrations
- Direct Mode (port 5432 on `db.*`): Not publicly accessible

### Alembic Configuration for Supabase

The `alembic/env.py` is configured to disable prepared statement caching for PgBouncer compatibility:

```python
connect_args = {"statement_cache_size": 0}
```

This prevents `DuplicatePreparedStatementError` when running migrations through Supabase's pooler.

## Usage

### Docker-Based Commands (Recommended)

All migrations should be run through Docker to ensure consistent environment:

```bash
# Check migration status
docker compose exec -T api alembic current

# Show migration history
docker compose exec -T api alembic history

# Generate new migration from model changes
docker compose exec -T api alembic revision --autogenerate -m "Add new feature"

# Apply all pending migrations
docker compose exec -T api alembic upgrade head

# Rollback one migration
docker compose exec -T api alembic downgrade -1

# Stamp database with specific version (useful for existing databases)
docker compose exec -T api alembic stamp head
```

### Local Development (Outside Docker)

If you need to run migrations locally:

```bash
cd apps/api

# Check migration status
poetry run alembic current

# Generate migration
poetry run alembic revision --autogenerate -m "Your migration message"

# Apply migrations
poetry run alembic upgrade head

# Show migration history
poetry run alembic history --verbose
```

### Important Notes

- **Always use Docker commands** for consistency across team members
- **Review generated migrations** before applying them
- **Test migrations** on development database first
- **Backup production data** before running migrations on Supabase

## Workflow Examples

### 1. Adding a New Model or Field

```bash
# 1. Update your SQLAlchemy models (e.g., app/models/user.py)
#    Add a new field or create a new model class

# 2. Start Docker services if not running
docker compose up -d

# 3. Generate migration from model changes
docker compose exec -T api alembic revision --autogenerate -m "Add avatar_url to User model"

# 4. Review the generated migration file in alembic/versions/
#    Check that it correctly represents your changes

# 5. Apply the migration to Supabase
docker compose exec -T api alembic upgrade head

# 6. Verify the migration was applied
docker compose exec -T api alembic current
```

### 2. Initial Setup for Existing Supabase Database

If you have an existing Supabase database with tables already created:

```bash
# 1. Ensure your models match the database schema

# 2. Stamp the database with the current migration version
docker compose exec -T api alembic stamp head

# 3. Verify the stamp
docker compose exec -T api alembic current
# Should show: [revision_id] (head)
```

### 3. Rolling Back a Migration

```bash
# 1. Check current migration status
docker compose exec -T api alembic current

# 2. Rollback one migration
docker compose exec -T api alembic downgrade -1

# 3. Or rollback to a specific version
docker compose exec -T api alembic downgrade [revision_id]

# 4. Verify the rollback
docker compose exec -T api alembic current
```

## How Automatic Detection Works

### SQLAlchemy Model Changes Detected:

- ✅ **New tables** - Adding new model classes
- ✅ **New columns** - Adding fields to existing models
- ✅ **Column modifications** - Changing types, constraints, defaults
- ✅ **Dropped columns** - Removing fields (be careful!)
- ✅ **Index changes** - Adding/removing indexes
- ✅ **Foreign key changes** - Relationship modifications

### Example Model Change:

```python
# Before
class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)

# After - Alembic will detect these changes
class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(100))  # New field
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)  # New field with default
```

Running `./scripts/migrate.sh generate "Add user name and status"` will create:

```python
def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('users', sa.Column('name', sa.String(length=100), nullable=False))
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False))
    # ### end Alembic commands ###
```

## Supabase Setup

### Getting Your Connection String

1. Go to Supabase Dashboard → **Settings** → **Database**
2. Under **Connection String**, select **Session Mode** (not Transaction)
3. Copy the connection string that uses **port 5432** on the pooler hostname

**Format**: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-X-us-east-X.pooler.supabase.com:5432/postgres`

### Converting to AsyncPG Format

Add `postgresql+asyncpg://` prefix for SQLAlchemy:

```bash
DATABASE_URL=postgresql+asyncpg://postgres.[PROJECT-REF]:[PASSWORD]@aws-X-us-east-X.pooler.supabase.com:5432/postgres
```

### Enabling IPv6 (Optional, for Direct Connection Attempts)

If you need to enable IPv6 in Docker for potential direct connections:

1. Edit `~/.docker/daemon.json`:

```json
{
  "experimental": true,
  "ipv6": true,
  "fixed-cidr-v6": "2001:db8:1::/64",
  "ip6tables": true
}
```

2. Restart Docker Desktop:

```bash
osascript -e 'quit app "Docker"'
open -a Docker
```

**Note**: Session Mode pooler works without IPv6, so this is usually not necessary.

## Troubleshooting

### Connection Issues

#### Error: "DuplicatePreparedStatementError"

This occurs when using Transaction Mode pooler or missing statement cache configuration:

**Solution**: Ensure you're using Session Mode pooler (port 5432) and `alembic/env.py` has:

```python
connect_args = {"statement_cache_size": 0}
```

#### Error: "Cannot assign requested address" or "Connection refused"

This happens when trying to use Direct Connection (port 5432 on `db.*` hostname):

**Solution**: Use Session Mode pooler instead:

```bash
# Wrong (Direct Connection):
postgresql+asyncpg://postgres:pass@db.project.supabase.co:5432/postgres

# Correct (Session Mode Pooler):
postgresql+asyncpg://postgres.project:pass@aws-X-region.pooler.supabase.com:5432/postgres
```

#### Error: "relation already exists"

This means tables exist but Alembic doesn't know about them:

**Solution**: Stamp the database with the current version:

```bash
docker compose exec -T api alembic stamp head
```

### Migration Issues

#### Checking Migration State

```bash
# Check current migration version
docker compose exec -T api alembic current

# Show migration history
docker compose exec -T api alembic history

# Check if there are pending migrations
docker compose exec -T api alembic heads
```

#### Out of Sync Migrations

If local and database migrations are out of sync:

```bash
# Option 1: Rollback to a known good state
docker compose exec -T api alembic downgrade [revision_id]

# Option 2: Stamp to match current state (if tables are correct)
docker compose exec -T api alembic stamp head
```

### Model Detection Issues

If Alembic doesn't detect your model changes:

1. **Check imports** - Ensure models are imported in `app/models/__init__.py`
2. **Check metadata** - Verify `target_metadata = Base.metadata` in `alembic/env.py`
3. **Check table names** - Ensure `__tablename__` is set correctly
4. **Restart API container** - Let changes reload: `docker compose restart api`
5. **Run with verbose** - Check detection: `docker compose exec -T api alembic revision --autogenerate -m "test" --verbose`

### Authentication Issues

#### Error: "Email not confirmed"

Supabase requires email confirmation by default:

**Development Solution**: In Supabase Dashboard → **Authentication** → **Providers** → **Email**:

- Disable "Confirm email" for development
- Or manually confirm users in Authentication → Users tab

**Production**: Keep email confirmation enabled and use proper email templates

## Best Practices

1. **Always review generated migrations** before applying them
2. **Use Docker commands** for consistency across the team
3. **Test migrations on development Supabase** before production
4. **Use descriptive migration messages** that explain the change
5. **Backup Supabase** before major schema changes (use Supabase dashboard backups)
6. **Commit migrations to git** as part of your feature branch
7. **Run migrations as part of deployment** pipeline

## Key Files

### Configuration Files

- `app/config.py` - Supabase connection settings with PgBouncer support
- `app/supabase_client.py` - Supabase client initialization for auth
- `alembic/env.py` - Alembic configuration with `statement_cache_size=0`
- `alembic/versions/` - Migration files (committed to git)
- `.env` - Environment variables (NOT committed to git)
- `.env.example` - Example environment configuration

### Docker Files

- `docker compose.yml` - Redis and API services
- `Dockerfile` - API container configuration

## Testing the Setup

### 1. Verify Docker Services

```bash
# Check services are running
docker compose ps

# Should show:
# - athena_api_1 (Up)
# - athena_redis_1 (Up, healthy)
```

### 2. Test Database Connection

```bash
# Check migration status (tests Supabase connection)
docker compose exec -T api alembic current

# Should show current migration version without errors
```

### 3. Test Authentication

```bash
# Test signup
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123","full_name":"Test User"}'

# Should return user profile with ID
```

### 4. Test Health Endpoint

```bash
# Check API is running
curl http://localhost:8000/health/

# Should return {"status":"healthy",...}
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] All migrations tested on development Supabase
- [ ] Migration files committed to git
- [ ] Production `.env` configured with correct Supabase credentials
- [ ] Backup created in Supabase dashboard
- [ ] Email confirmation settings configured in Supabase Auth
- [ ] Redis connection configured for production

### Deployment Steps

```bash
# 1. Deploy code with Docker
docker compose up -d

# 2. Run migrations
docker compose exec -T api alembic upgrade head

# 3. Verify migration
docker compose exec -T api alembic current

# 4. Test API health
curl https://your-api-domain.com/health/

# 5. Monitor logs
docker compose logs -f api
```

## Summary

This setup provides:

- ✅ **Supabase integration** with Session Mode pooler
- ✅ **Docker-based development** for consistency
- ✅ **Automatic migration generation** from model changes
- ✅ **PgBouncer compatibility** for Supabase's pooler
- ✅ **Redis session management** for JWT tokens
- ✅ **Production-ready authentication** with Supabase Auth

Your migration workflow is now fully automated and integrated with Supabase! 🎉
