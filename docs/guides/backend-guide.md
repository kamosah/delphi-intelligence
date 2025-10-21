# Backend Development Guide

This guide covers the FastAPI backend architecture, patterns, and best practices for the Olympus MVP project.

## Application Structure

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

## Key Backend Patterns

### Configuration

Environment-based settings via Pydantic (`app/config.py`)

- Access settings: `from app.config import settings`
- Database URL logic: `settings.db_url` property handles Docker/Supabase switching

### Database Sessions

Async SQLAlchemy with dependency injection

```python
from app.db.session import get_db

async def my_route(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
```

### Authentication Middleware

JWT tokens injected into `request.state.user`

```python
from fastapi import Request

async def protected_route(request: Request):
    user = request.state.user  # Available after AuthenticationMiddleware
```

### GraphQL Context

Strawberry resolvers receive FastAPI request

```python
@strawberry.type
class Query:
    @strawberry.field
    async def me(self, info: Info) -> User:
        request = info.context["request"]
        user = request.state.user  # From middleware
```

### Server-Sent Events (SSE)

Streaming responses for AI queries

```python
from fastapi.responses import StreamingResponse
import asyncio

async def llm_stream_generator(query: str):
    """Stream LLM response tokens for real-time UI updates."""
    # Example: LangChain streaming
    async for token in langchain_agent.stream(query):
        yield f"data: {token}\n\n"
        await asyncio.sleep(0)  # Allow other tasks to run

@router.get("/api/query/stream")
async def stream_query_response(query: str):
    return StreamingResponse(
        llm_stream_generator(query),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
```

**Use cases for SSE**:

- AI query response streaming (ChatGPT-style typing effect)
- Document processing progress updates
- Real-time status notifications

## Testing Strategy

Tests are located in `apps/api/tests/`:

- `test_jwt.py` - JWT token generation and validation (9 tests)
- `test_redis.py` - Redis session management (14 tests)
- `test_routes.py` - API endpoint testing
- `test_models_simple.py` - SQLAlchemy model testing

All tests use `pytest` with `pytest-asyncio` for async support.

## Environment Variables

See [Environment Setup Guide](./environment-setup.md) for detailed configuration.

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

## AI Agent Architecture

### Choosing Between LangGraph and CrewAI

**Decision Framework** (see ADR-002 for full details):

**Use LangGraph when:**

- Single-document Q&A query
- User expects response in < 10 seconds
- Simple retrieve → generate → cite pattern
- Need granular control over agent state and transitions
- Direct SSE streaming for real-time UI updates

**Use CrewAI when:**

- Multi-document research synthesis across sources
- Domain-specific analysis (financial, legal, market research)
- Complex workflows with multiple specialized agent roles
- User-defined automation workflows (triggers, scheduled tasks)
- Need built-in orchestration patterns (sequential, parallel, hierarchical)

**Examples:**

```python
# LangGraph - Simple query (already implemented)
from app.agents.query_agent import create_query_agent

agent = create_query_agent()
result = await agent.ainvoke({
    "query": "What are the key risks in this 10-K?",
    "context": [],
    "response": None,
    "citations": []
})

# CrewAI - Complex multi-agent workflow (Phase 3+)
from app.services.crew_orchestrator import ResearchOrchestrator

orchestrator = ResearchOrchestrator()
result = await orchestrator.run_research_workflow(
    workflow_type='financial_analysis',
    documents=quarterly_earnings_reports
)
# Returns: Multi-document analysis with specialized agent insights
```

**Shared Infrastructure:**

- Both use `app/services/langchain_config.py` for LLM configuration
- Both integrated with LangSmith for observability
- Both use same pgvector database for document retrieval

## Important Notes

### Database Migrations

- **Always review** auto-generated migrations before applying
- **Test migrations** on development data first
- **Supabase pooler issues**: Use MCP server for migrations (see `apps/api/MIGRATION_AUTOMATION.md`)
- **Migration tracking**: Alembic version table must be manually updated for MCP migrations

### Authentication

- **JWT tokens** have 24-hour expiration (configurable via `JWT_EXPIRATION_HOURS`)
- **Refresh tokens** stored in Redis with 30-day TTL
- **Token blacklisting** on logout prevents reuse
- **GraphQL requests** automatically include JWT via client configuration

## Code Quality

### Linting

**Backend (Ruff)**:

- Configuration: `apps/api/pyproject.toml` (comprehensive rule set)
- Enabled rules: pycodestyle, pyflakes, isort, pep8-naming, flake8-\*, pylint, security
- Run: `poetry run ruff check --fix` or `docker-compose exec api poetry run ruff check --fix`

### Type Checking

**Backend**: MyPy with strict mode (`pyproject.toml`)

```bash
poetry run mypy app/
```

## API Documentation

**Development environment**:

- OpenAPI docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- GraphQL playground: http://localhost:8000/graphql (when `DEBUG=true`)

**Production**: Documentation endpoints disabled when `DEBUG=false`
