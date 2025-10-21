# Olympus MVP API

FastAPI backend for Olympus MVP - an AI-native document intelligence platform inspired by [Athena Intelligence](https://www.athenaintel.com/).

**Core Features**:

- Document processing pipeline (PDF, DOCX extraction)
- AI-powered querying with LangChain + LangGraph
- Natural language interface with source citations
- GraphQL API for frontend integration
- Workspace management and collaboration

**Tech Stack**: FastAPI, Strawberry GraphQL, SQLAlchemy, LangChain, Supabase PostgreSQL

See [../../docs/PRODUCT_REQUIREMENTS.md](../../docs/PRODUCT_REQUIREMENTS.md) for full feature specifications.

## Features

- **FastAPI** - Modern, fast web framework for building APIs
- **GraphQL** - Strawberry GraphQL with interactive playground
- **Database** - SQLAlchemy with async PostgreSQL support
- **Authentication** - JWT-based authentication system
- **Migrations** - Alembic database migrations
- **Testing** - Comprehensive test suite with pytest

## Quick Start

### Option 1: Docker Development (Recommended)

The fastest way to get started is using Docker, which provides a complete development environment:

```bash
# Start all services (PostgreSQL, Redis, API)
docker compose up -d

# View logs
docker compose logs -f api

# Access the API
open http://localhost:8000
```

🔗 **For detailed Docker setup instructions, see [DOCKER_SETUP.md](./DOCKER_SETUP.md)**

### Option 2: Local Development

### Prerequisites

- Python 3.11+
- Poetry for dependency management
- PostgreSQL database (local or Supabase)
- Redis server (optional, for session management)

### Installation

1. **Clone the repository and navigate to the API directory:**

   ```bash
   cd apps/api
   ```

2. **Install dependencies:**

   ```bash
   poetry install
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations:**

   ```bash
   poetry run alembic upgrade head
   ```

5. **Start the development server:**
   ```bash
   poetry run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

## API Endpoints

### REST API

- **Base URL**: http://127.0.0.1:8000
- **Documentation**: http://127.0.0.1:8000/docs (Swagger UI)
- **Alternative Docs**: http://127.0.0.1:8000/redoc

### GraphQL API

- **Endpoint**: http://127.0.0.1:8000/graphql
- **Playground**: http://127.0.0.1:8000/graphql (Interactive GraphiQL interface)

#### Available GraphQL Operations

**Queries:**

```graphql
# Get user by ID
query GetUser($id: ID!) {
  user(id: $id) {
    id
    email
    fullName
    avatarUrl
    bio
    createdAt
    updatedAt
  }
}

# Get paginated users
query GetUsers($limit: Int, $offset: Int) {
  users(limit: $limit, offset: $offset) {
    id
    email
    fullName
    avatarUrl
    bio
  }
}

# Get user by email
query GetUserByEmail($email: String!) {
  userByEmail(email: $email) {
    id
    email
    fullName
  }
}

# Health check
query HealthCheck {
  health
}
```

**Mutations:**

```graphql
# Create a new user
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    email
    fullName
    avatarUrl
    bio
    createdAt
  }
}

# Update existing user
mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) {
    id
    email
    fullName
    avatarUrl
    bio
    updatedAt
  }
}

# Delete user
mutation DeleteUser($id: ID!) {
  deleteUser(id: $id)
}
```

## Project Structure

```
apps/api/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── config.py               # Application configuration
│   ├── db/
│   │   ├── __init__.py
│   │   └── session.py          # Database session management
│   ├── graphql/
│   │   ├── __init__.py
│   │   ├── types.py            # GraphQL type definitions
│   │   ├── query.py            # GraphQL query resolvers
│   │   ├── mutation.py         # GraphQL mutation resolvers
│   │   └── schema.py           # Main GraphQL schema
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py             # Base model class
│   │   ├── user.py             # User model
│   │   ├── document.py         # Document model
│   │   ├── query.py            # Query model
│   │   ├── space.py            # Space model
│   │   └── user_preferences.py # User preferences model
│   ├── routes/
│   │   ├── __init__.py
│   │   └── health.py           # Health check endpoints
│   └── services/
├── alembic/                    # Database migrations
├── database/
│   ├── schema.sql              # Database schema
│   └── rls_policies.sql        # Row Level Security policies
├── scripts/
│   ├── migrate.py              # Migration utilities
│   └── start_dev.sh            # Development startup script
├── tests/                      # Test suite
├── pyproject.toml              # Poetry configuration
├── alembic.ini                 # Alembic configuration
└── .env                        # Environment variables
```

## Environment Configuration

The API supports two database configurations:

### Local PostgreSQL with Docker (Development)

```bash
# Use Docker containers for PostgreSQL and Redis
USE_LOCAL_DB=true
DATABASE_URL=postgresql+asyncpg://olympus:olympus_dev@postgres:5432/olympus_mvp
REDIS_URL=redis://redis:6379/0
```

### Supabase (Production/Cloud)

```bash
# Use Supabase hosted database
USE_LOCAL_DB=false
DATABASE_URL=postgresql+asyncpg://postgres.your-project:password@aws-0-region.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Complete Environment Variables

Create a `.env` file with the following variables:

```bash
# FastAPI Configuration
ENV=development
DEBUG=true
HOST=0.0.0.0
PORT=8000

# Database Configuration
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname
USE_LOCAL_DB=false

# Supabase Configuration (if using Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql+asyncpg://postgres.your-project:password@aws-0-region.pooler.supabase.com:6543/postgres

# JWT Configuration
JWT_SECRET=your-jwt-secret-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# CORS Configuration
CORS_ORIGINS=["http://localhost:3000"]

# Redis Configuration
REDIS_URL=redis://localhost:6379
```

## Development

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run specific test file
poetry run pytest tests/test_main.py

# Run with coverage
poetry run pytest --cov=app tests/
```

### Database Migrations

```bash
# Create a new migration
poetry run alembic revision --autogenerate -m "Description of changes"

# Apply migrations
poetry run alembic upgrade head

# Rollback migrations
poetry run alembic downgrade -1
```

### Code Quality

```bash
# Format code
poetry run ruff format

# Lint code
poetry run ruff check

# Type checking
poetry run mypy app/
```

## Technology Stack

- **FastAPI** - Web framework
- **Strawberry GraphQL** - GraphQL library with FastAPI integration
- **SQLAlchemy** - ORM with async support
- **Alembic** - Database migration tool
- **PostgreSQL** - Primary database
- **Pydantic** - Data validation and settings management
- **Pytest** - Testing framework
- **Ruff** - Code formatting and linting
- **MyPy** - Static type checking

## GraphQL Schema Details

The GraphQL implementation uses Strawberry GraphQL and provides:

- **Type-safe schema** with Python type annotations
- **Async resolvers** for database operations
- **Error handling** for invalid inputs and database constraints
- **Interactive playground** for development and testing
- **Automatic schema introspection**

## Contributing

1. Create a feature branch
2. Make your changes
3. Add/update tests
4. Run the test suite
5. Submit a pull request

## License

[Add your license information here]
