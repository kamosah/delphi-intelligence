# API Testing Infrastructure Plan

**Related**: LOG-268 (Implementation issue)
**Created**: 2026-01-06
**Status**: Planning

## Overview

This plan details the implementation of a comprehensive PostgreSQL-based testing infrastructure for the Olympus API, following the principles outlined in `apps/api/TESTING.md`. The goal is to establish fast, reliable E2E and integration tests that can run efficiently in CI and locally.

## Core Principles

1. **Test real database operations** - Use actual PostgreSQL with transaction rollback, not mocks
2. **Only mock expensive operations** - LLM responses, embeddings, external API calls
3. **Fast CI execution** - Target <5 minutes for full test suite
4. **Parallel test support** - Use pytest-xdist with proper isolation
5. **Local development parity** - Same tests run identically in CI and locally

## Architecture Overview

### Technology Stack

- **Database**: PostgreSQL 16 with pgvector extension via testcontainers-python
- **Test Framework**: pytest with pytest-asyncio and pytest-xdist
- **API Testing**: Custom HTTPX wrappers for GraphQL, REST, and SSE
- **Transaction Isolation**: SQLAlchemy 2.0's `join_transaction_mode="create_savepoint"`
- **LLM Mocking**: Custom mock classes extending LangChain base models
- **CI**: GitHub Actions with service containers and uv for fast dependency installation

### Test Hierarchy

```
tests/
├── unit/                    # SQLite-based fast tests (~0.1s each)
│   ├── test_services.py    # Business logic tests
│   └── test_models.py      # Model validation tests
├── integration/             # PostgreSQL-based tests
│   ├── test_graphql.py     # GraphQL endpoint tests
│   ├── test_rest_auth.py   # REST authentication tests
│   ├── test_vector_search.py  # pgvector search tests
│   └── test_sse_streaming.py  # SSE streaming tests
├── fixtures/
│   ├── postgres.py         # PostgreSQL container + session fixtures
│   ├── api_clients.py      # GraphQL, REST, SSE clients
│   ├── openai_mocks.py     # LangChain mock fixtures
│   └── auth.py             # Authentication helpers
└── utils.py                # Factory functions for test data
```

## Implementation Phases

### Phase 1: Foundation (3-5 points)

**Goal**: Set up core testing infrastructure with PostgreSQL containers and basic fixtures.

**Tasks**:

1. Install required dependencies
   - `testcontainers[postgres]>=4.0.0`
   - `pytest-xdist>=3.5.0`
   - `httpx-sse>=0.4.0`
   - Update `pyproject.toml` with test dependencies

2. Create PostgreSQL fixture infrastructure (`tests/fixtures/postgres.py`)
   - Session-scoped container fixture with `pgvector/pgvector:pg16`
   - Async engine and sessionmaker fixtures
   - Database setup with Alembic migrations
   - Per-test transaction rollback fixture using `join_transaction_mode="create_savepoint"`

3. Configure pytest settings
   - Update `pyproject.toml` with asyncio configuration
   - Add markers for integration tests
   - Configure coverage settings

4. Verify basic functionality
   - Simple test creating user and organization
   - Confirm transaction rollback works
   - Test parallel execution with pytest-xdist

**Acceptance Criteria**:

- ✅ PostgreSQL container starts and applies migrations
- ✅ Test transactions roll back properly
- ✅ Tests can run in parallel without conflicts
- ✅ Coverage reporting works

### Phase 2: API Client Abstractions (2-3 points)

**Goal**: Build reusable HTTPX-based clients for testing GraphQL, REST, and SSE endpoints.

**Tasks**:

1. Create `tests/fixtures/api_clients.py` with:
   - `GraphQLClient` - Execute queries/mutations with auth support
   - `RESTClient` - Standard HTTP verbs with cookie injection
   - `SSEClient` - Server-Sent Events stream handling with `httpx-sse`

2. Implement authentication helpers (`tests/fixtures/auth.py`)
   - JWT token generation for test users
   - `TestUser` dataclass for consistent user data
   - Cookie-based auth injection

3. Create pytest fixtures for each client type
   - Authenticated and unauthenticated variants
   - Database session override for FastAPI dependency injection

4. Write example tests demonstrating each client
   - GraphQL query/mutation test
   - REST endpoint test with authentication
   - SSE streaming test with event collection

**Acceptance Criteria**:

- ✅ GraphQL client can execute queries with proper error handling
- ✅ REST client supports all HTTP verbs with auth
- ✅ SSE client can collect and parse streaming events
- ✅ Authentication works via HTTP-only cookies

### Phase 3: LangChain Mocking (2-3 points)

**Goal**: Implement deterministic mocks for OpenAI LLM and embeddings to avoid API costs and non-determinism.

**Tasks**:

1. Create `MockChatOpenAI` class (`tests/fixtures/openai_mocks.py`)
   - Extend `BaseChatModel` with custom `_stream()` and `_astream()`
   - Support configurable responses and streaming chunk sizes
   - Handle both sync and async invocations

2. Create `MockOpenAIEmbeddings` class
   - Return deterministic 1536-dimensional vectors using hash-based seeding
   - Support batch embeddings
   - Ensure same text always returns same vector

3. Implement monkeypatch fixtures
   - `patch_openai` - Patches both `get_llm()` and `get_embeddings()`
   - `patch_get_llm` - LLM only
   - `patch_get_embeddings` - Embeddings only

4. Write tests validating mock behavior
   - Test streaming responses
   - Test deterministic embeddings
   - Test async operations

**Acceptance Criteria**:

- ✅ Mock LLM returns configurable responses
- ✅ Mock LLM supports streaming with proper chunking
- ✅ Mock embeddings are deterministic and 1536-dimensional
- ✅ Monkeypatch works at factory function level

### Phase 4: Integration Test Suite (5-8 points)

**Goal**: Implement comprehensive integration tests covering all critical API functionality.

**Test Categories**:

1. **GraphQL Endpoint Tests** (`tests/integration/test_graphql.py`)
   - Thread creation with AI response
   - Space and document CRUD operations
   - Organization membership queries
   - Authentication and authorization checks
   - Error handling and validation

2. **Vector Search Tests** (`tests/integration/test_vector_search.py`)
   - pgvector cosine similarity search
   - Document chunk creation and embedding
   - Search relevance ranking
   - Deterministic embedding verification

3. **SSE Streaming Tests** (`tests/integration/test_sse_streaming.py`)
   - AI response streaming
   - Event parsing and collection
   - Stream completion verification
   - Error handling in streams

4. **REST Authentication Tests** (`tests/integration/test_rest_auth.py`)
   - Login/logout flows
   - Token exchange
   - Protected endpoint access
   - Session management

**Tasks**:

1. Migrate existing mock-based tests to PostgreSQL fixtures
2. Add new tests for untested functionality
3. Ensure all tests use proper factory functions from `tests/utils.py`
4. Add integration test markers

**Acceptance Criteria**:

- ✅ All critical API endpoints have integration tests
- ✅ Tests use real PostgreSQL, not mocks
- ✅ Vector search tests validate pgvector functionality
- ✅ SSE tests verify streaming behavior
- ✅ Test coverage ≥80%

### Phase 5: GitHub Actions CI (2-3 points)

**Goal**: Set up fast, reliable CI pipeline with parallel test execution.

**Tasks**:

1. Create `.github/workflows/api-tests.yml`
   - Use service containers for PostgreSQL and Redis
   - Install dependencies with `astral-sh/setup-uv` (10-100x faster)
   - Run tests with pytest-xdist in parallel
   - Upload coverage to Codecov

2. Configure service containers
   - `pgvector/pgvector:pg16` with health checks
   - `redis:7-alpine` for session management
   - Enable pgvector extension in PostgreSQL

3. Optimize CI performance
   - Use uv cache for dependencies
   - Use `--dist loadscope` for pytest-xdist (groups by module)
   - Set timeout limits (10 minutes max)

4. Add status badges to README

**Acceptance Criteria**:

- ✅ CI runs complete in <5 minutes
- ✅ Tests run in parallel without conflicts
- ✅ Coverage reports upload successfully
- ✅ Service containers start reliably

### Phase 6: Documentation and Migration (1-2 points)

**Goal**: Update documentation and migrate remaining tests.

**Tasks**:

1. Update `apps/api/TESTING.md` with:
   - PostgreSQL testing patterns
   - Example integration tests
   - CI setup instructions
   - Troubleshooting guide

2. Create migration guide for existing tests
   - Identify mock-based tests to migrate
   - Document conversion patterns
   - Track migration progress

3. Add test organization guidelines
   - When to use unit vs integration tests
   - Factory function patterns
   - Common test patterns

4. Update `apps/api/README.md` with testing commands

**Acceptance Criteria**:

- ✅ Documentation reflects PostgreSQL testing approach
- ✅ Migration guide helps convert existing tests
- ✅ All test commands documented
- ✅ Examples demonstrate best practices

## Critical Implementation Details

### PostgreSQL Container Setup

```python
# Session-scoped container with worker isolation
@pytest.fixture(scope="session")
def postgres_container(worker_id: str) -> PostgresContainer:
    db_name = f"testdb_{worker_id}" if worker_id != "master" else "testdb"
    with PostgresContainer(
        image="pgvector/pgvector:pg16",
        username="test",
        password="test",
        dbname=db_name,
    ) as postgres:
        yield postgres
```

### Transaction Rollback Pattern

```python
# Per-test session with savepoint rollback
@pytest_asyncio.fixture(scope="function")
async def db_session(async_engine: AsyncEngine, setup_database) -> AsyncSession:
    async with async_engine.connect() as connection:
        async with connection.begin() as transaction:
            session = AsyncSession(
                bind=connection,
                join_transaction_mode="create_savepoint",  # Key setting
                expire_on_commit=False,
            )

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

### GraphQL Client Pattern

```python
# Type-safe GraphQL execution with auth
data = await authenticated_graphql_client.execute_expecting_data(
    CREATE_THREAD_MUTATION,
    variables={"input": {"spaceId": str(space.id), "title": "Test"}},
)
assert data["createThread"]["thread"]["id"]
```

### LLM Mocking Pattern

```python
# Monkeypatch at factory function level
@pytest.fixture
def patch_openai(monkeypatch, mock_chat_openai, mock_embeddings):
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

## Target Performance Metrics

### CI Pipeline (GitHub Actions)

- **Total runtime**: 3-4 minutes
  - Checkout + uv setup: ~10s
  - Dependencies (cached): ~15s
  - Services ready: ~15s
  - Tests (parallel): ~2-3 minutes
  - Coverage upload: ~5s

### Local Development

- **Unit tests (SQLite)**: ~0.1s per test
- **Integration tests (PostgreSQL)**: ~0.3-0.5s per test
- **Full suite**: <2 minutes locally with pytest-xdist

### Coverage Goals

- **Target**: ≥80% overall coverage
- **Critical paths**: ≥90% (auth, permissions, data integrity)
- **Exclude**: Abstract base classes, type stubs, migration files

## Key Pitfalls to Avoid

1. **Event loop scope mismatch**
   - Solution: Use `asyncio_default_fixture_loop_scope = "session"` in pytest config

2. **Missing `expire_on_commit=False`**
   - Solution: Always set on test sessions to prevent lazy-load failures

3. **Direct commits bypassing rollback**
   - Solution: Use `join_transaction_mode="create_savepoint"`

4. **Mock import path errors**
   - Solution: Monkeypatch where function is used, not where it's defined

5. **Parallel test database conflicts**
   - Solution: Use worker_id for unique database names per worker

6. **Forgetting `session.refresh()`**
   - Solution: Call after `flush()` to load server-generated defaults

## Success Criteria

Phase completion is measured by:

- ✅ All fixtures implemented and documented
- ✅ Integration tests cover critical API paths
- ✅ CI runs complete in <5 minutes
- ✅ Tests run identically locally and in CI
- ✅ Coverage ≥80%
- ✅ Zero flaky tests (consistent pass/fail)
- ✅ Documentation complete and examples provided

## Dependencies

### Python Packages

```toml
[tool.poetry.group.test.dependencies]
pytest = "^8.0.0"
pytest-asyncio = "^0.23.0"
pytest-xdist = "^3.5.0"
pytest-cov = "^4.1.0"
testcontainers = {extras = ["postgres"], version = "^4.0.0"}
httpx = "^0.27.0"
httpx-sse = "^0.4.0"
```

### External Services

- PostgreSQL 16 with pgvector extension
- Redis 7 (for session management)
- GitHub Actions (CI environment)

## Timeline Estimates

Based on Modified Fibonacci scale (see CLAUDE.md):

- **Phase 1 (Foundation)**: 3-5 points (~4-10 hours)
- **Phase 2 (API Clients)**: 2-3 points (~3-6 hours)
- **Phase 3 (LLM Mocking)**: 2-3 points (~3-6 hours)
- **Phase 4 (Integration Tests)**: 5-8 points (~6-15 hours)
- **Phase 5 (CI Setup)**: 2-3 points (~3-6 hours)
- **Phase 6 (Documentation)**: 1-2 points (~2-4 hours)

**Total**: 15-24 points (~21-47 hours)

## References

- [TESTING.md](../../apps/api/TESTING.md) - Core testing philosophy and patterns
- [SQLAlchemy 2.0 Async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [pytest-asyncio Documentation](https://pytest-asyncio.readthedocs.io/)
- [testcontainers-python](https://testcontainers-python.readthedocs.io/)
- [httpx-sse](https://github.com/florimondmanca/httpx-sse)

## Next Steps

1. Review and approve this plan
2. Track implementation in Linear issue LOG-268
3. Begin Phase 1 implementation
4. Iterate based on learnings from each phase
