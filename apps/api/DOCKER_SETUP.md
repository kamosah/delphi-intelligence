# Docker Development Setup

This document provides comprehensive instructions for setting up and working with the Olympus API using Docker for local development.

## Overview

The Docker setup provides a complete development environment with:

- **PostgreSQL 16** - Database server
- **Redis 7** - Caching and session management
- **FastAPI Backend** - Python 3.11 with Poetry dependency management
- **Hot Reload** - Automatic code reloading during development

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running
- [Docker Compose](https://docs.docker.com/compose/install/) (included with Docker Desktop)
- Git for version control

## Quick Start

1. **Start all services:**

   ```bash
   cd apps/api
   docker-compose up -d
   ```

2. **Verify services are running:**

   ```bash
   docker-compose ps
   ```

3. **Access the API:**
   - API Root: http://localhost:8000/
   - API Documentation: http://localhost:8000/docs
   - GraphQL Playground: http://localhost:8000/graphql

4. **View logs:**
   ```bash
   docker-compose logs -f api
   ```

## Services

### PostgreSQL Database

- **Image:** `postgres:16-alpine`
- **Port:** 5432
- **Database:** `olympus_mvp`
- **Username:** `olympus`
- **Password:** `olympus_dev`
- **Health Check:** Automatic readiness detection

### Redis Cache

- **Image:** `redis:7-alpine`
- **Port:** 6379
- **Health Check:** Ping command verification

### FastAPI Application

- **Base Image:** `python:3.11-slim`
- **Port:** 8000
- **Package Manager:** Poetry
- **Hot Reload:** Enabled for development
- **Dependencies:** Installed via `pyproject.toml`

## Development Workflow

### Starting Development

```bash
# Start all services in detached mode
docker-compose up -d

# Watch logs in real-time
docker-compose logs -f api

# Stop services when done
docker-compose down
```

### Code Changes

The API supports **hot reload** - any changes to Python files will automatically restart the server:

1. Edit any file in `apps/api/app/`
2. Save the file
3. Watch the logs for automatic reload notification
4. Test your changes at http://localhost:8000/

### Database Operations

#### Running Migrations

```bash
# Run Alembic migrations
docker-compose exec api poetry run alembic upgrade head

# Create new migration
docker-compose exec api poetry run alembic revision --autogenerate -m "description"
```

#### Database Access

```bash
# Connect to PostgreSQL directly
docker-compose exec postgres psql -U olympus -d olympus_mvp

# Connect to Redis CLI
docker-compose exec redis redis-cli
```

### Installing New Dependencies

```bash
# Add a new dependency
docker-compose exec api poetry add package-name

# Add development dependency
docker-compose exec api poetry add --group dev package-name

# Rebuild container after dependency changes
docker-compose up --build -d api
```

### Running Tests

```bash
# Run all tests
docker-compose exec api poetry run pytest

# Run specific test file
docker-compose exec api poetry run pytest tests/test_file.py

# Run with coverage
docker-compose exec api poetry run pytest --cov=app tests/
```

## Configuration

### Environment Variables

The API uses environment variables from `.env` file:

```env
# Database Configuration (Docker)
USE_LOCAL_DB=true
DATABASE_URL=postgresql+asyncpg://olympus:olympus_dev@postgres:5432/olympus_mvp
LOCAL_DATABASE_URL=postgresql+asyncpg://olympus:olympus_dev@postgres:5432/olympus_mvp

# Redis (Docker)
REDIS_URL=redis://redis:6379/0

# Application
ENV=development
DEBUG=true
HOST=0.0.0.0
PORT=8000
```

### Switching Between Local and Supabase

#### Using Local PostgreSQL (Docker)

```env
USE_LOCAL_DB=true
DATABASE_URL=postgresql+asyncpg://olympus:olympus_dev@postgres:5432/olympus_mvp
```

#### Using Supabase

```env
USE_LOCAL_DB=false
DATABASE_URL=postgresql+asyncpg://your-supabase-connection-string
# OR
SUPABASE_DB_URL=postgresql+asyncpg://your-supabase-connection-string
```

## Troubleshooting

### Common Issues

#### Container Won't Start

```bash
# Check container status
docker-compose ps

# View logs for specific service
docker-compose logs api
docker-compose logs postgres
docker-compose logs redis

# Restart specific service
docker-compose restart api
```

#### Database Connection Issues

```bash
# Verify PostgreSQL is healthy
docker-compose ps

# Check database logs
docker-compose logs postgres

# Test connection manually
docker-compose exec postgres psql -U olympus -d olympus_mvp -c "SELECT 1;"
```

#### Port Conflicts

If ports 5432, 6379, or 8000 are in use:

```yaml
# In docker-compose.yml, change port mappings:
services:
  postgres:
    ports:
      - '5433:5432' # Use different host port
  redis:
    ports:
      - '6380:6379' # Use different host port
  api:
    ports:
      - '8001:8000' # Use different host port
```

#### Performance Issues

```bash
# Clean up unused containers and images
docker system prune

# Rebuild without cache
docker-compose build --no-cache

# Check resource usage
docker stats
```

### Reset Everything

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Start fresh
docker-compose up --build -d
```

## File Structure

```
apps/api/
├── docker-compose.yml          # Service definitions
├── Dockerfile                  # API container build instructions
├── .dockerignore              # Files excluded from build context
├── .env                       # Environment variables
├── pyproject.toml             # Python dependencies
├── poetry.lock               # Dependency lock file
└── app/                      # Application code
    ├── main.py               # FastAPI application
    ├── config.py             # Configuration settings
    └── db/
        └── session.py        # Database session management
```

## Best Practices

### Development

- Always use `docker-compose logs -f api` to monitor application startup
- Make sure all services are healthy before testing
- Use `docker-compose restart api` for quick API restarts during development
- Keep `.env` file secure and never commit sensitive credentials

### Database

- Use migrations for all schema changes
- Test migrations on local Docker environment before production
- Regular database backups in production environments

### Dependencies

- Lock dependency versions in `poetry.lock`
- Rebuild containers after major dependency updates
- Use Poetry groups to separate dev/prod dependencies

## Next Steps

1. **Set up CI/CD** - Automate testing and deployment
2. **Add monitoring** - Implement health checks and metrics
3. **Security** - Add authentication and authorization
4. **Scaling** - Configure for production deployment

## Support

If you encounter issues:

1. Check this documentation
2. Review Docker and application logs
3. Verify environment configuration
4. Consult the main project README
