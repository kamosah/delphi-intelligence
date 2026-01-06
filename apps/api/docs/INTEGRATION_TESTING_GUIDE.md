# Integration Testing Infrastructure Guide

**Version**: 1.0
**Last Updated**: 2026-01-05
**Status**: Implementation Plan

## Table of Contents

- [Overview](#overview)
- [Architecture Decision](#architecture-decision)
- [Testing Strategy](#testing-strategy)
- [PostgreSQL Container Setup](#postgresql-container-setup)
- [API Client Architecture](#api-client-architecture)
- [LangChain Mocking Strategy](#langchain-mocking-strategy)
- [Transaction Isolation](#transaction-isolation)
- [GitHub Actions CI](#github-actions-ci)
- [Implementation Roadmap](#implementation-roadmap)
- [Migration Guide](#migration-guide)

## Overview

This guide documents the integration testing infrastructure for the Olympus API, extending the philosophy established in [TESTING.md](../TESTING.md) from unit tests to full integration tests.

### Core Philosophy (From TESTING.md)

> **Test real database operations, not mocks.**

This philosophy extends to integration tests:

- ✅ **Test real PostgreSQL operations** - With pgvector, full-text search, JSONB operators
- ✅ **Test real API interactions** - GraphQL, REST, SSE streaming
- ✅ **Mock only expensive/slow external services** - OpenAI embeddings, ChatGPT
- ✅ **Fast CI execution** - Target: <5 minutes for full test suite

### Testing Layers

| Layer | Database | Tools | Speed | Use Cases |
|-------|----------|-------|-------|-----------|
| **Unit Tests** | In-Memory SQLite | pytest, AsyncSession | ~0.1s/test | Service logic, models, utilities |
| **Integration Tests** | Docker PostgreSQL | testcontainers, HTTPX | ~1-2s/test | GraphQL, REST, SSE, multi-service workflows |
| **E2E Tests** | Docker PostgreSQL | Playwright (frontend) | ~5-10s/test | Full stack, authentication, UI flows |

## Architecture Decision

### Why testcontainers-python?

After evaluating Docker Compose vs testcontainers, **testcontainers-python wins** for integration tests:

**Advantages:**
- ✅ **Automatic port allocation** - No conflicts in parallel CI runners
- ✅ **Lifecycle management** - Auto-cleanup, no orphaned containers
- ✅ **pytest integration** - Native fixture support
- ✅ **pytest-xdist compatible** - Each worker gets isolated container
- ✅ **CI flexibility** - Use service containers in GitHub Actions, testcontainers locally

**Trade-offs:**
- ⚠️ Slightly slower startup than pre-warmed Docker Compose services (~5-10s)
- ⚠️ Requires Docker daemon running locally

### Hybrid CI Strategy

- **Local Development**: testcontainers for portability
- **GitHub Actions**: Service containers for faster startup (parallel initialization)

## Testing Strategy

### What to Test with PostgreSQL Integration Tests

✅ **PostgreSQL-Specific Features:**
- pgvector similarity search (`<->` cosine distance operator)
- JSONB operators (`->`, `->>`, `@>`, `?`)
- Full-text search (`tsvector`, `tsquery`)
- Array functions and operators
- PostgreSQL-specific data types (UUID, JSONB, vector)

✅ **Multi-Service Interactions:**
- GraphQL endpoint + authentication middleware + database
- Document processing → chunking → embedding → vector storage
- Thread query → vector search → LangChain agent → response streaming

✅ **External Integrations (with mocks):**
- OpenAI embeddings (mocked for speed/cost)
- ChatOpenAI streaming (mocked for determinism)
- S3 uploads (mocked or LocalStack)

### What to Keep as SQLite Unit Tests

Keep using in-memory SQLite for:
- Single service business logic
- Model validation
- Utility functions
- Query builders without PostgreSQL-specific features

## PostgreSQL Container Setup

### Session-Scoped Container with Per-Test Rollback

**Strategy**: One container per pytest-xdist worker, with transaction rollback for per-test isolation.

**Benefits:**
- **Fast**: Container startup amortized across all tests
- **Isolated**: Each test rolls back changes
- **Parallel-safe**: Workers don't conflict

### Fixture Implementation

```python
# tests/fixtures/postgres.py
"""
PostgreSQL testing infrastructure with testcontainers.
Supports pytest-xdist parallel execution.
"""
import pytest
import pytest_asyncio
from typing import AsyncGenerator, Generator
from sqlalchemy import text, event
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
    AsyncEngine,
)
from sqlalchemy.pool import NullPool
from testcontainers.postgres import PostgresContainer
from alembic.config import Config as AlembicConfig
from alembic import command

from app.models import Base

POSTGRES_IMAGE = "pgvector/pgvector:pg16"


@pytest.fixture(scope="session")
def postgres_container(
    worker_id: str,
) -> Generator[PostgresContainer, None, None]:
    """
    Session-scoped PostgreSQL container with pgvector.
    Each pytest-xdist worker gets its own container.
    """
    db_name = f"testdb_{worker_id}" if worker_id != "master" else "testdb"

    with PostgresContainer(
        image=POSTGRES_IMAGE,
        username="test",
        password="test",
        dbname=db_name,
        driver=None,  # We'll construct async URL manually
    ) as postgres:
        yield postgres


@pytest.fixture(scope="session")
def database_url(postgres_container: PostgresContainer) -> str:
    """Build async database URL from container."""
    sync_url = postgres_container.get_connection_url()
    # Convert postgresql+psycopg2:// to postgresql+asyncpg://
    return sync_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://")


@pytest_asyncio.fixture(scope="session")
async def async_engine(database_url: str) -> AsyncGenerator[AsyncEngine, None]:
    """Session-scoped async engine with NullPool for testing."""
    engine = create_async_engine(
        database_url,
        echo=False,
        poolclass=NullPool,
    )
    yield engine
    await engine.dispose()


@pytest.fixture(scope="session")
def async_session_factory(
    async_engine: AsyncEngine,
) -> async_sessionmaker[AsyncSession]:
    """Session-scoped sessionmaker factory."""
    return async_sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )


def _run_migrations(connection, alembic_cfg: AlembicConfig) -> None:
    """Run Alembic migrations synchronously."""
    alembic_cfg.attributes["connection"] = connection
    command.upgrade(alembic_cfg, "head")


@pytest_asyncio.fixture(scope="session")
async def setup_database(async_engine: AsyncEngine) -> AsyncGenerator[None, None]:
    """
    Create database schema with pgvector extension.
    Uses Alembic migrations for production parity.
    """
    async with async_engine.begin() as conn:
        # Enable pgvector extension
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

        # Apply Alembic migrations (production parity)
        alembic_cfg = AlembicConfig("alembic.ini")
        await conn.run_sync(_run_migrations, alembic_cfg)

    yield

    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def postgres_session(
    async_engine: AsyncEngine,
    setup_database,  # Ensures database is ready
) -> AsyncGenerator[AsyncSession, None]:
    """
    Per-test session with transaction rollback.

    All changes made during the test (including commits) are rolled back.
    Uses SQLAlchemy 2.0's join_transaction_mode for savepoint handling.
    """
    async with async_engine.connect() as connection:
        async with connection.begin() as transaction:
            session = AsyncSession(
                bind=connection,
                join_transaction_mode="create_savepoint",
                expire_on_commit=False,
            )

            # Restart savepoints after nested transaction ends
            @event.listens_for(session.sync_session, "after_transaction_end")
            def restart_savepoint(sess, trans):
                if trans.nested and not trans._parent.nested:
                    sess.begin_nested()

            try:
                yield session
            finally:
                await session.close()
                await transaction.rollback()
```

### Key Configuration Details

**Critical settings explained:**

1. **`join_transaction_mode="create_savepoint"`**
   - Ensures `session.commit()` calls in application code become savepoint releases
   - Outer transaction still rolls back everything at test end
   - **10-100x faster** than TRUNCATE or database recreation

2. **`expire_on_commit=False`**
   - Prevents lazy-load failures in async code after commit
   - Objects remain accessible after `commit()` without refresh

3. **`NullPool`**
   - Avoids connection pooling issues in tests
   - Each session gets fresh connection

4. **Session-scoped event loop**
   - Must match session-scoped engine fixture
   - Set via `asyncio_default_fixture_loop_scope = "session"` in pytest config

## API Client Architecture

### Unified Client Strategy

Build custom HTTPX AsyncClient wrappers for GraphQL, REST, and SSE testing.

**Why not `gql` library?**
- `gql` targets external GraphQL APIs
- Direct HTTPX + `schema.execute()` provides better Strawberry integration
- Unified authentication injection across all clients

### GraphQL Client

```python
# tests/fixtures/api_clients.py

class GraphQLClient:
    """
    GraphQL client for testing Strawberry endpoints.
    Supports authentication via JWT cookies.
    """

    def __init__(
        self,
        client: AsyncClient,
        graphql_url: str = "/graphql",
        auth_token: str | None = None,
    ):
        self.client = client
        self.graphql_url = graphql_url
        self.auth_token = auth_token

    def with_auth(self, token: str) -> "GraphQLClient":
        """Return new client with authentication token."""
        return GraphQLClient(
            client=self.client,
            graphql_url=self.graphql_url,
            auth_token=token,
        )

    async def execute_expecting_data(
        self,
        query: str,
        variables: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute and assert no errors, return data."""
        result = await self.execute(query, variables)
        assert result["errors"] is None, f"GraphQL errors: {result['errors']}"
        assert result["data"] is not None
        return result["data"]

    async def execute_expecting_error(
        self,
        query: str,
        variables: dict[str, Any] | None = None,
        error_contains: str | None = None,
    ) -> list[dict[str, Any]]:
        """Execute and assert errors exist."""
        result = await self.execute(query, variables)
        assert result["errors"] is not None, "Expected errors but got none"

        if error_contains:
            messages = [e.get("message", "") for e in result["errors"]]
            assert any(error_contains in msg for msg in messages), \
                f"Expected '{error_contains}' in {messages}"

        return result["errors"]
```

### SSE Client

```python
from httpx_sse import aconnect_sse

class SSEClient:
    """SSE client for testing streaming endpoints."""

    async def stream_events(
        self,
        url: str,
        method: str = "GET",
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
        max_events: int | None = None,
        timeout: float = 30.0,
    ) -> list[SSEEvent]:
        """Collect SSE events from endpoint."""
        events: list[SSEEvent] = []

        async with aconnect_sse(
            self.client, method, url, **kwargs
        ) as event_source:
            async for sse in event_source.aiter_sse():
                events.append(SSEEvent(
                    event=sse.event,
                    data=sse.data,
                    id=sse.id,
                    retry=sse.retry,
                ))
                if max_events and len(events) >= max_events:
                    break

        return events
```

### Authentication Helpers

```python
import jwt
from datetime import datetime, timedelta, timezone

JWT_SECRET = "test-secret-key"
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_COOKIE = "access_token"


def create_test_jwt(
    user_id: str,
    email: str,
    role: str = "user",
    organization_id: str | None = None,
    expires_delta: timedelta = timedelta(hours=1),
) -> str:
    """Create JWT token for testing."""
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "org_id": organization_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
```

## LangChain Mocking Strategy

### Why Mock OpenAI?

**Don't mock database operations** (our core philosophy), but **DO mock OpenAI** because:

- ❌ **Expensive**: $0.02 per 1M tokens (adds up in CI)
- ❌ **Slow**: 1-3s per API call (10x slower than our target)
- ❌ **Non-deterministic**: Same input → different outputs (flaky tests)
- ❌ **Rate limits**: Can block CI pipelines
- ❌ **Network dependency**: External API availability

### Monkeypatch Approach

Use pytest's `monkeypatch` to replace `get_llm()` and `get_embeddings()` factory functions.

**Why monkeypatch over pytest-mock:**
- Simpler, pytest-native syntax
- Auto-cleanup (no manual restore)
- Async-friendly
- Mock at factory function level, not LangChain internals

### Mock ChatOpenAI Implementation

```python
# tests/fixtures/openai_mocks.py

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, AIMessageChunk
from langchain_core.outputs import ChatGenerationChunk

class MockChatOpenAI(BaseChatModel):
    """
    Mock ChatOpenAI supporting invoke(), stream(), ainvoke(), astream().
    """

    responses: List[str] = ["Mock AI response"]
    current_index: int = 0
    streaming_chunk_size: int = 5  # Characters per chunk

    def set_response(self, response: str) -> None:
        """Set a single response for the next call."""
        self.responses = [response]
        self.current_index = 0

    async def _astream(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> AsyncIterator[ChatGenerationChunk]:
        """Async stream for astream() calls - critical for SSE testing."""
        response = self._get_next_response()

        for i in range(0, len(response), self.streaming_chunk_size):
            chunk_text = response[i:i + self.streaming_chunk_size]
            chunk = ChatGenerationChunk(
                message=AIMessageChunk(content=chunk_text)
            )
            if run_manager:
                await run_manager.on_llm_new_token(chunk_text)
            yield chunk
```

### Mock OpenAI Embeddings Implementation

```python
import hashlib
import random

class MockOpenAIEmbeddings(Embeddings):
    """
    Mock OpenAIEmbeddings returning configurable 1536-dimensional vectors.
    Deterministic mode ensures same text always returns same embedding.
    """

    def __init__(
        self,
        size: int = 1536,
        deterministic: bool = True,
    ):
        self.size = size
        self.deterministic = deterministic

    def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding vector using deterministic hash."""
        if self.deterministic:
            # Use hash for deterministic output
            seed = int(hashlib.md5(text.encode()).hexdigest(), 16) % (2**32)
            rng = random.Random(seed)
        else:
            rng = random.Random()

        # Generate normalized vector
        vector = [rng.gauss(0, 1) for _ in range(self.size)]
        norm = sum(x**2 for x in vector) ** 0.5
        return [x / norm for x in vector]

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed multiple documents."""
        return [self._generate_embedding(text) for text in texts]

    async def aembed_documents(self, texts: List[str]) -> List[List[float]]:
        """Async embed documents."""
        return self.embed_documents(texts)
```

### Pytest Fixtures

```python
@pytest.fixture
def mock_chat_openai(mock_llm_responses: List[str]) -> MockChatOpenAI:
    """MockChatOpenAI instance with configurable responses."""
    return MockChatOpenAI(responses=mock_llm_responses)


@pytest.fixture
def mock_embeddings() -> MockOpenAIEmbeddings:
    """MockOpenAIEmbeddings with 1536 dimensions."""
    return MockOpenAIEmbeddings(size=1536, deterministic=True)


@pytest.fixture
def patch_openai(monkeypatch, mock_chat_openai, mock_embeddings):
    """
    Patch both get_llm() and get_embeddings() factory functions.
    Returns tuple of (mock_llm, mock_embeddings) for test assertions.
    """
    monkeypatch.setattr(
        "app.services.langchain_config.get_llm",
        lambda **kwargs: mock_chat_openai,
    )
    monkeypatch.setattr(
        "app.services.langchain_config.get_embeddings",
        lambda **kwargs: mock_embeddings,
    )
    return mock_chat_openai, mock_embeddings
```

## Transaction Isolation

### The Savepoint Strategy

**Problem**: Integration tests need to commit data (e.g., document upload commits file metadata), but we want to roll back all changes after the test.

**Solution**: SQLAlchemy 2.0's `join_transaction_mode="create_savepoint"`.

**How it works:**

1. Test fixture begins outer transaction
2. Session configured with `join_transaction_mode="create_savepoint"`
3. Application code calls `session.commit()`
4. SQLAlchemy converts commit → savepoint release
5. Test ends → outer transaction rolls back **everything**

**Critical event listener:**

```python
@event.listens_for(session.sync_session, "after_transaction_end")
def restart_savepoint(sess, trans):
    """Restart savepoint after nested transaction ends."""
    if trans.nested and not trans._parent.nested:
        sess.begin_nested()
```

This ensures savepoints restart properly for multiple commits in a test.

### Usage in Tests

```python
@pytest.mark.integration
async def test_document_upload_workflow(
    postgres_session: AsyncSession,
    authenticated_graphql_client: GraphQLClient,
    patch_embeddings: MockOpenAIEmbeddings,
):
    """Test full document upload → processing → embedding workflow."""
    # Create test data
    org = await create_organization(postgres_session, "Test Org")
    space = await create_space(postgres_session, organization=org)
    await postgres_session.commit()  # ← Becomes savepoint release

    # Upload document (service internally commits)
    mutation = """
        mutation UploadDocument($input: UploadDocumentInput!) {
            uploadDocument(input: $input) {
                document { id name }
            }
        }
    """

    data = await authenticated_graphql_client.execute_expecting_data(
        mutation,
        variables={
            "input": {
                "spaceId": str(space.id),
                "file": "test.pdf",
                "content": base64.b64encode(b"Test content"),
            }
        },
    )

    # Document committed by service, but will be rolled back after test
    doc_id = data["uploadDocument"]["document"]["id"]

    # Verify embeddings created
    result = await postgres_session.execute(
        select(DocumentChunk).where(DocumentChunk.document_id == doc_id)
    )
    chunks = result.scalars().all()
    assert len(chunks) > 0
    assert chunks[0].embedding is not None

    # Test ends → everything rolled back (org, space, document, chunks)
```

## GitHub Actions CI

### Service Containers vs Testcontainers

**Strategy:**
- **Local Development**: testcontainers (portability)
- **GitHub Actions**: Service containers (faster parallel startup)

### Workflow Configuration

```yaml
# .github/workflows/api-tests.yml
name: API Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  PYTHON_VERSION: "3.11"

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: olympus_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
          --shm-size=256mb

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      spicedb:
        image: authzed/spicedb:latest
        ports:
          - 50051:50051
        env:
          SPICEDB_GRPC_PRESHARED_KEY: test-token
        options: >-
          --health-cmd "grpc-health-probe -addr=:50051"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v4
        with:
          version: "latest"
          enable-cache: true
          cache-dependency-glob: |
            **/pyproject.toml
            **/poetry.lock

      - name: Set up Python
        run: uv python install ${{ env.PYTHON_VERSION }}

      - name: Install dependencies
        run: uv sync --frozen
        working-directory: apps/api

      - name: Enable pgvector extension
        run: |
          PGPASSWORD=postgres psql -h localhost -U postgres -d olympus_test \
            -c "CREATE EXTENSION IF NOT EXISTS vector;"

      - name: Run integration tests
        run: |
          uv run pytest tests/integration/ \
            -n auto \
            --dist loadscope \
            -m integration \
            --cov=app \
            --cov-report=xml:coverage.xml \
            --cov-report=term-missing:skip-covered \
            --cov-fail-under=70 \
            -v \
            --tb=short \
            --durations=10
        working-directory: apps/api
        env:
          DATABASE_URL: postgresql+asyncpg://postgres:postgres@localhost:5432/olympus_test
          REDIS_URL: redis://localhost:6379/0
          SPICEDB_ENDPOINT: localhost:50051
          SPICEDB_TOKEN: test-token
          JWT_SECRET: test-secret-key
          OPENAI_API_KEY: test-key-not-used
          PYTHONDONTWRITEBYTECODE: "1"

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./apps/api/coverage.xml
          fail_ci_if_error: false
        env:
          CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}

      - name: Minimize uv cache
        run: uv cache prune --ci
```

### Performance Targets

**Target CI timeline** (~4 minutes):
- Checkout + uv setup: ~10s
- Dependencies (cached): ~20s
- Services ready: ~15s
- Unit tests (SQLite): ~30s
- Integration tests (parallel): ~2-3 min
- Coverage upload: ~5s

### Optimization Tips

1. **Use `pytest-xdist` with `--dist loadscope`**
   - Groups tests by module for shared fixtures
   - Reduces container startup overhead

2. **Cache uv dependencies aggressively**
   - `cache-dependency-glob: **/pyproject.toml`
   - 10-100x faster than Poetry

3. **Run unit and integration tests separately**
   - Unit tests: Fast feedback (<1 min)
   - Integration tests: Comprehensive coverage (~3 min)

4. **Use `--cov-fail-under` to enforce coverage**
   - Unit tests: 80% minimum
   - Integration tests: 70% minimum (harder to achieve)

## Implementation Roadmap

### Phase 1: Infrastructure Setup (8 points)

**Goal**: Establish PostgreSQL container fixtures and basic test structure.

**Tasks:**
- [ ] Add dependencies to `pyproject.toml`:
  - `testcontainers = "^4.8.0"`
  - `httpx-sse = "^0.4.0"`
  - `pytest-xdist = "^3.6.1"` (already added)
- [ ] Create `tests/fixtures/postgres.py` with container fixtures
- [ ] Create `tests/fixtures/api_clients.py` with GraphQL/REST/SSE clients
- [ ] Update `tests/conftest.py` to import integration fixtures
- [ ] Add pytest markers: `integration`, `postgres`
- [ ] Verify basic PostgreSQL connection and migration application

**Acceptance Criteria:**
- PostgreSQL container starts successfully in tests
- Alembic migrations apply correctly
- Basic GraphQL query test passes with authentication

### Phase 2: OpenAI Mocking (5 points)

**Goal**: Implement deterministic OpenAI mocks for LangChain.

**Tasks:**
- [ ] Create `tests/fixtures/openai_mocks.py` with `MockChatOpenAI`
- [ ] Implement `MockOpenAIEmbeddings` with deterministic hashing
- [ ] Create `patch_openai` fixture using monkeypatch
- [ ] Write unit tests for mock behavior (streaming, embeddings)
- [ ] Integrate mocks with existing LangChain factory functions

**Acceptance Criteria:**
- Mock streaming returns predictable chunks
- Mock embeddings return 1536-dimensional vectors
- Same input text always produces same embedding (deterministic)
- Tests run without OpenAI API calls

### Phase 3: Core Integration Tests (13 points)

**Goal**: Write comprehensive integration tests for key workflows.

**Test Coverage:**
- [ ] **GraphQL Authentication** (`tests/integration/test_auth_graphql.py`)
  - Login mutation with JWT validation
  - Authenticated queries with current user
  - Authorization errors for unauthenticated requests

- [ ] **Document Upload Workflow** (`tests/integration/test_document_upload.py`)
  - Upload document → extract text → chunk → embed
  - Verify chunks in database with embeddings
  - Test error handling (invalid file, size limits)

- [ ] **Vector Search** (`tests/integration/test_vector_search.py`)
  - Semantic similarity search with pgvector
  - Filter by space_id and document_ids
  - Test top-k and similarity threshold

- [ ] **Thread Query Agent** (`tests/integration/test_thread_agent.py`)
  - Create thread → retrieve context → generate response
  - Verify citations in response
  - Test error handling (no documents, permission denied)

- [ ] **SSE Streaming** (`tests/integration/test_sse_streaming.py`)
  - AI response streaming with event parsing
  - Progress events during long operations
  - Connection handling and reconnection

**Acceptance Criteria:**
- All integration tests pass with PostgreSQL container
- Tests complete in <5 minutes total
- Coverage >70% for integration-tested code
- No OpenAI API calls in CI

### Phase 4: GitHub Actions Integration (3 points)

**Goal**: Set up CI pipeline with service containers.

**Tasks:**
- [ ] Create `.github/workflows/api-integration-tests.yml`
- [ ] Configure PostgreSQL, Redis, SpiceDB service containers
- [ ] Set up uv for fast dependency installation
- [ ] Enable pgvector extension in CI
- [ ] Configure coverage reporting to Codecov
- [ ] Add status badge to README

**Acceptance Criteria:**
- CI pipeline runs on PR and push to main/develop
- Integration tests pass in CI
- Total CI time <5 minutes
- Coverage reports upload successfully

### Phase 5: Documentation & Migration (1 point)

**Goal**: Document integration testing and migrate existing tests.

**Tasks:**
- [ ] Update `TESTING.md` with integration testing section
- [ ] Create migration guide for converting unit → integration tests
- [ ] Add troubleshooting section for common issues
- [ ] Document when to use SQLite vs PostgreSQL
- [ ] Create example integration test template

**Acceptance Criteria:**
- Developers can follow guide to write integration tests
- Migration path clear for existing tests
- Troubleshooting covers common pitfalls

**Total Effort**: 30 story points (~30-40 hours)

## Migration Guide

### When to Convert Unit → Integration Test

Convert a SQLite unit test to PostgreSQL integration test when:

✅ **PostgreSQL-Specific Features:**
- Uses pgvector similarity search
- Uses JSONB operators (`->`, `->>`, `@>`)
- Uses full-text search or array functions
- Relies on PostgreSQL-specific data types

✅ **Multi-Service Workflows:**
- Tests GraphQL endpoint with authentication
- Tests document processing pipeline (upload → embed → search)
- Tests Redis session management
- Tests SpiceDB authorization

❌ **Keep as SQLite Unit Test:**
- Pure business logic in a single service
- Model validation and relationships
- Utility functions without PostgreSQL features

### Example Migration

**Before (SQLite unit test):**

```python
# tests/test_organization_service.py
@pytest.mark.asyncio
async def test_get_current_organization_id(db_session: AsyncSession):
    """Test with in-memory SQLite."""
    user = await create_user(db_session)
    org = await create_organization(db_session, "Test Org")
    await create_membership(db_session, user, org, is_default=True)
    await db_session.commit()

    result = await OrganizationService.get_current_organization_id(
        user.id, db_session
    )
    assert result == org.id
```

**After (PostgreSQL integration test):**

```python
# tests/integration/test_organization_graphql.py
@pytest.mark.integration
async def test_current_organization_graphql(
    postgres_session: AsyncSession,
    authenticated_graphql_client: GraphQLClient,
):
    """Test with PostgreSQL container + GraphQL endpoint."""
    # Create test data
    user = await create_user(postgres_session)
    org = await create_organization(postgres_session, "Test Org")
    await create_membership(postgres_session, user, org, is_default=True)
    await postgres_session.commit()

    # Execute GraphQL query
    query = """
        query CurrentOrganization {
            me {
                currentOrganization {
                    id
                    name
                }
            }
        }
    """

    data = await authenticated_graphql_client.execute_expecting_data(query)

    # Verify
    assert data["me"]["currentOrganization"]["id"] == str(org.id)
    assert data["me"]["currentOrganization"]["name"] == "Test Org"
```

**Key changes:**
- Use `postgres_session` fixture instead of `db_session`
- Add `@pytest.mark.integration` marker
- Use `authenticated_graphql_client` for API testing
- Test GraphQL endpoint instead of service directly

## Best Practices

### 1. Use Explicit Markers

```python
import pytest

pytestmark = [pytest.mark.asyncio, pytest.mark.integration]
```

### 2. Test Real Operations

✅ **Good:**
```python
# Test real vector search with pgvector
results = await VectorSearchService.search(
    session=postgres_session,
    query_embedding=embedding,
    limit=10,
)
assert len(results) > 0
assert results[0].similarity_score > 0.7
```

❌ **Bad:**
```python
# Mocking the database defeats the purpose
mock_db.execute.return_value = [mock_result]
results = await VectorSearchService.search(...)
```

### 3. Mock Only External Services

```python
# Mock OpenAI (external, expensive, slow)
@pytest.fixture
def patch_openai(monkeypatch, mock_chat_openai, mock_embeddings):
    monkeypatch.setattr("app.services.langchain_config.get_llm", ...)
    monkeypatch.setattr("app.services.langchain_config.get_embeddings", ...)

# Don't mock PostgreSQL, Redis, or SpiceDB (fast, testable)
```

### 4. Use Factory Functions

```python
# Reuse test data factories from tests/utils.py
user = await create_user(postgres_session)
org = await create_organization(postgres_session, "Test Org")
space = await create_space(postgres_session, organization=org)
```

### 5. Commit Strategically

```python
# Commit test data before testing service
await postgres_session.commit()

# Service may do internal commits (handled by savepoint)
result = await MyService.do_something(...)

# No need to rollback - fixture handles it
```

## Common Pitfalls

### Pitfall 1: Event Loop Scope Mismatch

**Problem**: Session-scoped async fixtures need session-scoped event loop.

**Solution**: Add to `pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "session"
```

### Pitfall 2: Missing `expire_on_commit=False`

**Problem**: Lazy-load failures after `commit()`.

**Solution**: Always set on test sessions:

```python
session = AsyncSession(
    bind=connection,
    expire_on_commit=False,  # ← Critical for async
)
```

### Pitfall 3: Forgetting `session.refresh()`

**Problem**: Server-generated defaults not loaded after `flush()`.

**Solution**: Refresh objects when you need DB-generated values:

```python
doc = await create_document(postgres_session, ...)
await postgres_session.flush()
await postgres_session.refresh(doc)  # ← Get created_at, updated_at
```

### Pitfall 4: Parallel Test Database Conflicts

**Problem**: pytest-xdist workers share same database.

**Solution**: Use `worker_id` fixture for unique database names:

```python
db_name = f"testdb_{worker_id}" if worker_id != "master" else "testdb"
```

### Pitfall 5: Mock Import Path Errors

**Problem**: Mocking where function is defined, not where it's used.

**Solution**: Monkeypatch at import site:

```python
# If app.services.chat imports get_llm from app.services.langchain_config
monkeypatch.setattr(
    "app.services.chat.get_llm",  # ← Where it's used
    lambda: mock_llm,
)
```

## Troubleshooting

### Issue: "testcontainers can't find Docker"

**Solution**: Ensure Docker daemon is running:

```bash
docker ps  # Should not error
```

### Issue: "Port already in use"

**Solution**: testcontainers auto-allocates ports. If you see this, check for orphaned containers:

```bash
docker ps -a | grep testdb
docker rm -f <container_id>
```

### Issue: "Alembic migration timeout"

**Solution**: Increase container startup timeout:

```python
with PostgresContainer(...).with_command(
    "-c shared_buffers=256MB -c max_connections=200"
) as postgres:
    # More resources for migrations
```

### Issue: "Tests pass locally, fail in CI"

**Common causes:**
- Environment variable mismatch (check `.env.test` vs CI env)
- Timing issues (add `asyncio.sleep(0.1)` if needed)
- Container resource limits (increase `--shm-size`)

**Debug:**

```bash
# Run with verbose output
pytest tests/integration/ -vv --tb=long
```

## Additional Resources

- **TESTING.md**: Core testing philosophy and SQLite unit testing
- **pytest-asyncio docs**: https://pytest-asyncio.readthedocs.io/
- **testcontainers-python docs**: https://testcontainers-python.readthedocs.io/
- **SQLAlchemy async docs**: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- **httpx-sse docs**: https://github.com/florimondmanca/httpx-sse

## Appendix: Complete File Structure

```
tests/
├── conftest.py                     # Root conftest importing all fixtures
├── fixtures/
│   ├── __init__.py
│   ├── postgres.py                 # PostgreSQL container + session fixtures
│   ├── api_clients.py              # GraphQL, REST, SSE clients
│   ├── openai_mocks.py             # LangChain mock fixtures
│   └── auth.py                     # Authentication helpers
├── unit/                           # SQLite-based fast tests
│   ├── conftest.py                 # SQLite session override
│   ├── test_organization_service.py
│   ├── test_space_service.py
│   └── test_models.py
├── integration/                    # PostgreSQL-based tests
│   ├── conftest.py                 # Marks all tests as integration
│   ├── test_auth_graphql.py
│   ├── test_document_upload.py
│   ├── test_vector_search.py
│   ├── test_thread_agent.py
│   └── test_sse_streaming.py
└── utils.py                        # Factory functions (shared across both)
```

---

**End of Integration Testing Infrastructure Guide**
