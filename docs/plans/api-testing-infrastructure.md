# API Testing Infrastructure Plan

**Related**: LOG-268 (Implementation issue)
**Created**: 2026-01-06
**Updated**: 2026-01-06 (Review feedback incorporated)
**Status**: Planning → Ready for Implementation

## Revision History

**2026-01-06 - Second Review Feedback Incorporated**:

- ✅ **Split Phase 4 into 4A and 4B** for clearer milestones (4A: core tests 5pts, 4B: advanced 5-8pts)
- ✅ **Clarified SpiceDB CI strategy**: Always use `authzed/spicedb` service container (Option A)
- ✅ **Added test data isolation pattern** with `unique_test_id` fixture for parallel execution
- ✅ **Added transaction rollback verification test** example to Phase 1
- ✅ **Clarified authentication approach**: Tests use FastAPI JWT tokens (not Supabase SSR cookies)
- ✅ **Added coverage exclusions** to pytest configuration (Alembic, models/**init**.py, config.py)
- ✅ **Adjusted CI target to 5 minutes** (realistic initial target, optimize to 3-4 minutes later)
- ✅ **Added SSE timeout handling** example to Phase 4B
- ✅ **Updated timeline estimates** to 20-29 points total (24 points mid-range recommendation)

**2026-01-06 - Initial Review Feedback Incorporated**:

- ✅ Added SpiceDB authorization testing (Phase 4)
- ✅ Clarified fixture integration strategy with existing `conftest.py` (Phase 1)
- ✅ Expanded SSE testing details with concrete examples (Phase 2)
- ✅ Added type safety requirements (`mypy tests/`) throughout all phases
- ✅ Added pytest-cov configuration to Phase 1
- ✅ Documented LangChain mocking alternative (respx at HTTP layer)
- ✅ Clarified CI strategy (GitHub Actions service containers, not testcontainers)
- ✅ Added testing-migration.md and development-commands.md updates to Phase 6
- ✅ Added pytest-testmon recommendation for local testing
- ✅ Updated timeline to recommend 24 points (conservative)

## Overview

This plan details the implementation of a comprehensive PostgreSQL-based testing infrastructure for the Olympus API, following the principles outlined in `apps/api/TESTING.md`. The goal is to establish fast, reliable E2E and integration tests that can run efficiently in CI and locally.

**Key additions from review**:

- SpiceDB authorization testing integrated with PostgreSQL
- Comprehensive SSE streaming test patterns
- Type safety enforcement for all test code
- Migration guide creation for converting existing tests

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

**Goal**: Set up core testing infrastructure with PostgreSQL containers and basic fixtures while preserving existing SQLite/mock fixtures.

**Tasks**:

1. Install required dependencies
   - `testcontainers[postgres]>=4.0.0`
   - `pytest-xdist>=3.5.0`
   - `httpx-sse>=0.4.0`
   - `pytest-cov>=4.1.0`
   - Update `pyproject.toml` with test dependencies

2. Create PostgreSQL fixture infrastructure (`tests/fixtures/postgres.py`)
   - Session-scoped container fixture with `pgvector/pgvector:pg16`
   - Async engine and sessionmaker fixtures
   - Database setup with Alembic migrations
   - Per-test transaction rollback fixture using `join_transaction_mode="create_savepoint"`
   - **Create `postgres_session` fixture alongside existing `db_session`** (preserve SQLite)

3. **Integrate with existing `conftest.py` fixtures**
   - Preserve existing mock fixtures (`mock_user`, `mock_organization`, etc.) for unit tests
   - Keep SQLite `db_session` fixture for fast unit tests
   - Add `postgres_session` for integration tests
   - Ensure SpiceDB fixtures (`spicedb_service`, `test_resource_ids`) work with PostgreSQL
   - Make factory functions database-agnostic (accept any `AsyncSession`)

4. **Add test data isolation pattern for parallel execution**
   - Create `unique_test_id` fixture using pytest worker_id
   - Pattern ensures each test gets unique data (prevents cross-test conflicts)
   - Example implementation:

     ```python
     @pytest.fixture
     def unique_test_id(worker_id: str) -> str:
         """Generate unique ID for this test (parallel-safe)."""
         return f"{worker_id}_{uuid4().hex[:8]}"

     async def test_example(postgres_session: AsyncSession, unique_test_id: str) -> None:
         user = await create_user(
             postgres_session,
             email=f"user-{unique_test_id}@test.com"
         )
         # Test logic here
     ```

   - Document fixture scoping guidelines:
     - `session`: Expensive setup (database containers, engines)
     - `function`: Default for most fixtures (transaction rollback per test)
     - `module`: Shared data within module (rare, use with caution)

5. Configure pytest settings
   - Update `pyproject.toml` with asyncio configuration
   - Add markers for integration tests (`@pytest.mark.integration`)
   - **Configure pytest-cov with 80% threshold and exclusions**:

     ```toml
     [tool.coverage.run]
     omit = [
         "app/alembic/*",
         "app/models/__init__.py",
         "app/config.py",  # Settings are environment-specific
     ]

     [tool.coverage.report]
     fail_under = 80
     exclude_lines = [
         "pragma: no cover",
         "if TYPE_CHECKING:",
         "raise NotImplementedError",
         "@abstractmethod",
     ]
     ```

   - Add type checking for tests (`mypy tests/` in CI per `type-safety-guide.md`)

6. Verify basic functionality
   - Simple test creating user and organization
   - **Verify transaction rollback** with explicit test:

     ```python
     async def test_transaction_rollback(postgres_session: AsyncSession) -> None:
         """Verify that test transactions roll back properly."""
         user = await create_user(postgres_session)
         user_id = user.id
         await postgres_session.flush()

         # Rollback happens automatically in fixture cleanup
         # This test verifies the mechanism works
         await postgres_session.rollback()

         # User should not exist after rollback
         result = await postgres_session.execute(
             select(User).where(User.id == user_id)
         )
         assert result.scalar_one_or_none() is None
     ```

   - Test parallel execution with pytest-xdist
   - Verify SpiceDB cleanup works with PostgreSQL

**Acceptance Criteria**:

- ✅ PostgreSQL container starts and applies migrations
- ✅ Test transactions roll back properly
- ✅ Tests can run in parallel without conflicts
- ✅ **Existing SQLite unit tests continue to work**
- ✅ **SpiceDB fixtures integrate with PostgreSQL session**
- ✅ **Coverage reporting configured with 80% threshold**
- ✅ **Type hints added to fixtures, mypy tests/ passes**

### Phase 2: API Client Abstractions (2-3 points)

**Goal**: Build reusable HTTPX-based clients for testing GraphQL, REST, and SSE endpoints with comprehensive type safety.

**Tasks**:

1. Create `tests/fixtures/api_clients.py` with:
   - `GraphQLClient` - Execute queries/mutations with auth support
     - `execute()` - Basic execution with result/error handling
     - `execute_expecting_data()` - Assert no errors, return typed data
     - `execute_expecting_error()` - Assert errors exist, optional message match
   - `RESTClient` - Standard HTTP verbs with cookie injection
     - `get()`, `post()`, `put()`, `delete()` with auth support
     - `.with_auth(token)` for fluent authentication
   - `SSEClient` - Server-Sent Events stream handling with `httpx-sse`
     - `stream_events()` - Collect events with max_events/timeout control
     - **Detailed SSE event parsing** (event type, data, id, retry)
     - **JSON parsing helper** (`SSEEvent.json()` for data deserialization)
     - **Event filtering** by event type (e.g., filter "message" vs "done" events)

2. Implement authentication helpers (`tests/fixtures/auth.py`)
   - **JWT token generation for test users** (FastAPI custom tokens, not Supabase)
   - `TestUser` dataclass for consistent user data
   - **Token injection via cookies** (`access_token` cookie for FastAPI auth)
   - **Type-hinted helper functions** for token creation
   - **Note**: Tests use FastAPI JWT tokens directly (not Supabase SSR cookies):
     - Production: Supabase tokens → exchanged for Olympus JWTs → HTTP-only cookies
     - Tests: Generate Olympus JWTs directly → inject via cookies
     - Rationale: Simpler test setup, bypasses Supabase auth complexity

3. Create pytest fixtures for each client type
   - Authenticated and unauthenticated variants
   - Database session override for FastAPI dependency injection
   - **Add type hints to all fixture return types**

4. Write example tests demonstrating each client
   - GraphQL query/mutation test
   - REST endpoint test with authentication
   - **Comprehensive SSE streaming tests**:
     - Event collection and parsing
     - Streaming chunk reconstruction
     - Stream completion verification (done event)
     - Error handling in streams (timeout, connection errors)
     - Multiple concurrent streams (parallel test safety)

**Acceptance Criteria**:

- ✅ GraphQL client can execute queries with proper error handling
- ✅ REST client supports all HTTP verbs with auth
- ✅ SSE client can collect and parse streaming events
- ✅ **SSE tests cover event parsing, chunking, errors, and completion** (with timeout examples)
- ✅ **Authentication works via FastAPI JWT tokens injected as cookies**
- ✅ **All fixtures have proper type hints, mypy passes**

### Phase 3: LangChain Mocking (2-3 points)

**Goal**: Implement deterministic mocks for OpenAI LLM and embeddings to avoid API costs and non-determinism.

**Approach**: Monkeypatch factory functions (`get_llm`, `get_embeddings`) with custom mock classes.

**Alternative Considered**: Using `respx` to mock at HTTP layer (intercept OpenAI API calls). This approach offers:

- **Pros**: Less coupling to LangChain internals, easier maintenance if LangChain changes
- **Cons**: More complex setup, need to mock HTTP responses, less control over streaming behavior
- **Decision**: Start with LangChain class extension for simplicity, consider respx if maintenance becomes an issue

**Tasks**:

1. Create `MockChatOpenAI` class (`tests/fixtures/openai_mocks.py`)
   - Extend `BaseChatModel` with custom `_stream()` and `_astream()`
   - Support configurable responses and streaming chunk sizes
   - Handle both sync and async invocations
   - **Add comprehensive type hints** for all methods

2. Create `MockOpenAIEmbeddings` class
   - Return deterministic 1536-dimensional vectors using hash-based seeding
   - Support batch embeddings
   - Ensure same text always returns same vector
   - **Type-safe embedding generation**

3. Implement monkeypatch fixtures
   - `patch_openai` - Patches both `get_llm()` and `get_embeddings()`
   - `patch_get_llm` - LLM only
   - `patch_get_embeddings` - Embeddings only
   - **Document why we patch factories, not LangChain internals**

4. Write tests validating mock behavior
   - Test streaming responses
   - Test deterministic embeddings
   - Test async operations
   - **Test that same text produces same embedding (determinism)**

**Acceptance Criteria**:

- ✅ Mock LLM returns configurable responses
- ✅ Mock LLM supports streaming with proper chunking
- ✅ Mock embeddings are deterministic and 1536-dimensional
- ✅ Monkeypatch works at factory function level
- ✅ **All mocks have proper type hints, mypy passes**
- ✅ **Alternative approaches documented for future reference**

### Phase 4A: Core Integration Tests (5 points)

**Goal**: Implement foundational integration tests for GraphQL, REST authentication, and basic workflows.

**Rationale for Split**: Breaking Phase 4 into two sub-phases provides clearer milestones and reduces risk. Phase 4A establishes core integration testing patterns, while Phase 4B adds advanced features (SpiceDB, SSE, vector search).

**Test Categories**:

1. **GraphQL Endpoint Tests** (`tests/integration/test_graphql.py`)
   - Thread creation with basic AI response (using mocked LLM)
   - Space and document CRUD operations
   - Organization membership queries
   - Authentication and authorization checks (basic)
   - Error handling and validation
   - **Type-safe GraphQL client usage with proper assertions**

2. **REST Authentication Tests** (`tests/integration/test_rest_auth.py`)
   - Login/logout flows
   - Token exchange and validation
   - Protected endpoint access (401/403 responses)
   - Session management basics

**Tasks**:

1. Migrate core GraphQL tests from mocks to PostgreSQL
2. Implement REST authentication test suite
3. Ensure all tests use proper factory functions from `tests/utils.py`
4. Add integration test markers (`@pytest.mark.integration`)
5. **Add type hints to all test functions**

**Acceptance Criteria**:

- ✅ GraphQL CRUD operations work with PostgreSQL
- ✅ REST authentication flows tested (login, token validation, logout)
- ✅ Factory functions work with PostgreSQL
- ✅ **All tests have type hints, mypy tests/ passes**
- ✅ **Test coverage ≥60%** (will reach 80% after Phase 4B)

### Phase 4B: Advanced Integration Tests (5-8 points)

**Goal**: Add advanced integration tests for SpiceDB authorization, SSE streaming, and pgvector search.

**Dependencies**: Phase 4A must be complete (establishes core integration testing patterns).

**Test Categories**:

1. **SpiceDB Authorization Tests** (`tests/integration/test_spicedb_authorization.py`)
   - **Thread ownership and visibility**:
     - `PERSONAL` threads (RLS + SpiceDB): Owner-only access, PostgreSQL RLS enforces isolation
     - `SPACE` threads: Space members can access (test SpiceDB space membership checks)
     - `ORGANIZATION` threads: Org members can access (test SpiceDB org membership checks)
   - **Space permissions**:
     - Space viewer can read documents but not modify
     - Space editor can create/update documents
     - Space admin can manage members
   - **Organization permissions**:
     - Org member can view org-wide threads
     - Org admin can manage spaces and members
   - **RLS policy integration**:
     - Test PostgreSQL RLS policies work with `auth.uid()` function
     - Verify RLS + SpiceDB dual authorization strategy
   - **Parallel test safety**:
     - Use `test_resource_ids` fixture for unique resource IDs
     - Verify SpiceDB cleanup works after each test
   - **Example test pattern**:

     ```python
     async def test_personal_thread_isolation(
         postgres_session, spicedb_service, test_resource_ids
     ) -> None:
         user1_id = test_resource_ids("user1")
         user2_id = test_resource_ids("user2")
         thread_id = test_resource_ids("thread")

         # Create thread with PERSONAL visibility
         await create_thread(postgres_session, owner=user1_id, visibility="PERSONAL")
         await spicedb_service.write_relationship("thread", thread_id, "owner", "user", user1_id)

         # User1 can access (owner)
         result = await spicedb_service.check_permission("thread", thread_id, "view", "user", user1_id)
         assert result.permitted is True

         # User2 cannot access (not owner, PERSONAL visibility)
         result = await spicedb_service.check_permission("thread", thread_id, "view", "user", user2_id)
         assert result.permitted is False
     ```

2. **SSE Streaming Tests** (`tests/integration/test_sse_streaming.py`)
   - AI response streaming with `httpx-sse`
   - **Event parsing and collection** (event type, data, id, retry)
   - **Stream chunk reconstruction** (concatenate message chunks)
   - **Stream completion verification** (done event received)
   - **Error handling in streams** (timeout, connection errors, malformed events)
   - **Multiple concurrent streams** (parallel test safety)
   - **Example test pattern**:

     ```python
     # Add timeout handling example
     events = await sse_client.stream_events(
         "/api/stream",
         max_events=10,
         timeout=5.0  # Explicit timeout
     )
     assert len(events) > 0, "Stream timeout - no events received"

     message_events = [e for e in events if e.event == "message"]
     full_response = "".join(e.json()["content"] for e in message_events)
     assert "expected content" in full_response
     assert any(e.event == "done" for e in events)
     ```

3. **Vector Search Tests** (`tests/integration/test_vector_search.py`)
   - pgvector cosine similarity search
   - Document chunk creation and embedding
   - Search relevance ranking
   - Deterministic embedding verification
   - **Verify PostgreSQL pgvector extension works correctly**

**Tasks**:

1. **Implement comprehensive SpiceDB authorization tests**
   - Thread ownership and visibility (PERSONAL/SPACE/ORGANIZATION)
   - Space and organization permissions
   - RLS policy integration verification
2. **Implement SSE streaming tests**
   - Event parsing and chunk reconstruction
   - Timeout handling and error cases
   - Concurrent stream testing
3. **Implement pgvector search tests**
   - Cosine similarity search
   - Embedding determinism verification
4. **Verify existing SpiceDB fixtures work with PostgreSQL**
   - `spicedb_service` and `test_resource_ids` integration
   - Parallel test safety with unique resource IDs
5. **Add type hints to all test functions**

**Acceptance Criteria**:

- ✅ **SpiceDB authorization tests cover thread ownership, space/org permissions, RLS integration**
- ✅ **SpiceDB tests use `test_resource_ids` for parallel safety**
- ✅ **SSE tests verify streaming behavior with detailed event parsing and timeout handling**
- ✅ **Vector search tests validate pgvector functionality**
- ✅ **All tests have type hints, mypy tests/ passes**
- ✅ **Test coverage ≥80%** (combined with Phase 4A)

### Phase 5: GitHub Actions CI (2-3 points)

**Goal**: Set up fast, reliable CI pipeline with parallel test execution using GitHub Actions service containers.

**CI Strategy**: Use **GitHub Actions service containers** (not testcontainers) for faster startup:

- Service containers start in parallel with job setup (~15s vs ~30-45s for testcontainers)
- Simpler configuration, no Docker-in-Docker complexity
- Consistent with GitHub Actions best practices

**Local Development**: Use **testcontainers-python** for developer machines:

- No manual Docker Compose setup required
- Automatic cleanup and isolation
- Works identically across different development environments

**SpiceDB CI Strategy**: **Use `authzed/spicedb` service container** (required for Phase 4B authorization tests)

- **Decision**: Option A - Always use SpiceDB service container in CI
- **Rationale**: Maintains parity with local development, required for Phase 4B tests
- **Alternative rejected**: Skipping SpiceDB tests in CI breaks parity and reduces confidence

**Tasks**:

1. Create `.github/workflows/api-tests.yml`
   - **Use service containers** for PostgreSQL, Redis, and **SpiceDB** (all required)
   - Install dependencies with `astral-sh/setup-uv` (10-100x faster than pip/poetry)
   - Run tests with pytest-xdist in parallel (`-n auto --dist loadscope`)
   - Upload coverage to Codecov
   - **Run mypy tests/ for type checking**

2. Configure service containers with health checks
   - `pgvector/pgvector:pg16` - PostgreSQL with pgvector extension
   - `redis:7-alpine` - Session management
   - **`authzed/spicedb`** - Authorization testing (required for Phase 4B)
   - All containers must have proper health checks for reliability

3. Optimize CI performance
   - Use uv cache for dependencies (enables caching between runs)
   - Use `--dist loadscope` for pytest-xdist (groups tests by module for better fixture reuse)
   - Set timeout limits (10 minutes max for entire workflow)
   - **Initial target: 5 minutes** (realistic for initial implementation)
   - **Optimization target: 3-4 minutes** (after Phase 5 complete, measure and optimize)

4. Add status badges to README
   - Test status badge
   - Coverage badge

**Acceptance Criteria**:

- ✅ **CI runs complete in ≤5 minutes initially** (optimize to 3-4 min in follow-up)
- ✅ Tests run in parallel without conflicts
- ✅ Coverage reports upload successfully with ≥80% threshold
- ✅ **All service containers (PostgreSQL, Redis, SpiceDB) start reliably with health checks**
- ✅ **mypy tests/ runs in CI and passes**
- ✅ **SpiceDB authorization tests run successfully in CI**

### Phase 6: Documentation and Migration (1-2 points)

**Goal**: Update documentation, create migration guides, and provide comprehensive testing references.

**Tasks**:

1. Update `apps/api/TESTING.md` with:
   - PostgreSQL testing patterns and best practices
   - Example integration tests with PostgreSQL
   - SpiceDB authorization testing patterns
   - SSE streaming test examples
   - CI setup instructions
   - Troubleshooting guide (common pitfalls, solutions)

2. **Create `docs/guides/testing-migration.md`** **[NEW]**
   - **Decision tree**: When to use unit tests (SQLite) vs integration tests (PostgreSQL)
   - **Migration patterns**: Converting mock-based tests to PostgreSQL
   - **Before/after examples** showing mock → PostgreSQL conversions
   - **Fixture migration guide**: How to adapt existing test fixtures
   - **Common pitfalls and solutions** when migrating
   - **Progress tracking**: Checklist of tests to migrate

3. **Update `docs/guides/development-commands.md`** **[NEW]**
   - Add comprehensive test commands section:

     ```bash
     # Run all tests
     docker compose exec api poetry run pytest

     # Run unit tests only (SQLite, fast)
     docker compose exec api poetry run pytest tests/unit

     # Run integration tests only (PostgreSQL)
     docker compose exec api poetry run pytest tests/integration -m integration

     # Run with coverage
     docker compose exec api poetry run pytest --cov=app --cov-report=html

     # Run in parallel (faster)
     docker compose exec api poetry run pytest -n auto

     # Run specific test file
     docker compose exec api poetry run pytest tests/integration/test_graphql.py

     # Run mypy type checking on tests
     docker compose exec api poetry run mypy tests/

     # Fast mode (skip integration tests)
     docker compose exec api poetry run pytest --fast
     ```

4. Add test organization guidelines
   - When to use unit vs integration tests (decision matrix)
   - Factory function patterns (database-agnostic design)
   - Common test patterns (AAA pattern, fixtures, parametrization)
   - SpiceDB test patterns (use `test_resource_ids` for parallel safety)

5. Update `apps/api/README.md` with:
   - Link to TESTING.md
   - Link to testing-migration.md
   - Quick test commands reference

**Acceptance Criteria**:

- ✅ Documentation reflects PostgreSQL testing approach
- ✅ **`testing-migration.md` created with decision tree and conversion examples**
- ✅ **`development-commands.md` updated with comprehensive test commands**
- ✅ Migration guide helps convert existing tests
- ✅ All test commands documented
- ✅ Examples demonstrate best practices (unit, integration, SpiceDB, SSE)

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
- **Phase 3 (LangChain Mocking)**: 2-3 points (~3-6 hours)
- **Phase 4A (Core Integration Tests)**: 5 points (~6-8 hours) - **GraphQL CRUD, REST auth**
- **Phase 4B (Advanced Integration Tests)**: 5-8 points (~6-15 hours) - **SpiceDB, SSE, pgvector**
- **Phase 5 (CI Setup)**: 2-3 points (~3-6 hours)
- **Phase 6 (Documentation)**: 1-2 points (~2-4 hours) - **Includes testing-migration.md creation**

**Total**: 20-29 points (~26-55 hours)

**Recommendation**: **Plan for 24 points** (mid-range estimate) to account for:

- SpiceDB authorization test complexity
- Fixture integration with existing conftest.py
- Documentation creation (testing-migration.md, development-commands.md updates)
- Unforeseen integration issues with PostgreSQL/testcontainers

## Additional Recommendations

### Optional Enhancements (Future Work)

1. **pytest-testmon for faster local testing**
   - Automatically runs only tests affected by code changes
   - Dramatically speeds up local TDD workflow
   - Install: `pytest-testmon>=2.1.0`
   - Usage: `pytest --testmon` (first run creates baseline, subsequent runs are incremental)

2. **pytest-timeout for flaky test detection**
   - Automatically fail tests that take too long
   - Helps identify deadlocks or infinite loops in async code

3. **Database snapshots for complex test setup**
   - Create reusable database snapshots with pre-populated data
   - Faster than creating data in each test
   - Consider for large integration test suites (>100 tests)

4. **Mutation testing with mutmut**
   - Verify test quality by introducing code mutations
   - High-quality tests should catch mutations
   - Run periodically, not in CI (slow)

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
