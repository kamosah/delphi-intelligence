# API Testing Guide

Comprehensive guide for writing effective, fast, and reliable tests for the Olympus API.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Infrastructure](#test-infrastructure)
- [Quick Start](#quick-start)
- [Test Utilities](#test-utilities)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [When to Use SQLite vs PostgreSQL](#when-to-use-sqlite-vs-postgresql)
- [Troubleshooting](#troubleshooting)

## Testing Philosophy

**Core Principle**: Test real database operations, not mocks.

### Why In-Memory SQLite?

Our API tests use **real in-memory SQLite databases** instead of mocks for these benefits:

✅ **Tests actual database operations** - Verifies real SQLAlchemy queries, not mock predictions
✅ **Catches real SQL bugs** - Joins, filters, ordering, constraints
✅ **Verifies business logic** - With real data, not artificial mock responses
✅ **Fast execution** - ~0.1s per test, 12 tests in 0.48s
✅ **CI-perfect** - No Docker dependencies, no race conditions, works anywhere
✅ **Complete isolation** - Fresh database per test
✅ **Parallel testing** - Works with pytest-xdist

### The "Testing the Mock" Anti-Pattern

❌ **Bad**: Mocking database queries

```python
# This tests the mock, not the code!
mock_execute.side_effect = [
    MagicMock(scalar_one_or_none=lambda: mock_org),
    MagicMock(scalars=lambda: MagicMock(all=lambda: [])),
]
result = await OrganizationService.get_current(user.id, mock_session)
```

**Problems:**
- Only verifies you correctly predicted how many queries run
- Doesn't verify actual SQL queries are correct
- Doesn't catch JOIN bugs, filter bugs, or ordering issues
- Breaks when refactoring internal implementation

✅ **Good**: Using real database

```python
# This tests the actual code!
user = await create_user(db_session)
org = await create_organization(db_session, "Test Org")
await create_membership(db_session, user, org, is_default=True)
await db_session.commit()

result = await OrganizationService.get_current(user.id, db_session)
assert result == org.id
```

**Benefits:**
- Tests real SQLAlchemy queries
- Catches SQL bugs (joins, filters, ordering)
- Verifies business logic with real data
- Doesn't break during refactoring

## Test Infrastructure

### The `db_session` Fixture

Located in `tests/conftest.py`, this fixture provides:

- **In-memory SQLite database** - Fresh for each test
- **All tables created** - Every model from `app.models`
- **JSONB → JSON conversion** - Automatic PostgreSQL to SQLite compatibility
- **Async support** - Works with `AsyncSession`
- **StaticPool** - Maintains `:memory:` database throughout test
- **Auto-rollback** - Cleans up after each test

**Usage:**

```python
@pytest.mark.asyncio()
async def test_example(db_session: AsyncSession):
    # db_session is ready to use with all tables created
    user = await create_user(db_session)
    assert user.id is not None
```

### Test Utilities (`tests/utils.py`)

Reusable factory functions for creating test data:

**User & Organization:**
- `create_user()` - Create test user
- `create_organization()` - Create test organization
- `create_membership()` - Create organization membership
- `create_user_with_org()` - Composite: user + org + membership

**Spaces & Documents:**
- `create_space()` - Create test space
- `create_document()` - Create test document
- `create_space_with_document()` - Composite: space + document

**Threads & Messages:**
- `create_thread()` - Create test thread
- `create_message()` - Create test message
- `create_thread_with_messages()` - Composite: thread + message pairs

## Quick Start

### 1. Basic Service Test

```python
"""Test MyService with real database."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.my_service import MyService
from tests.utils import create_user, create_organization

@pytest.mark.asyncio()
class TestMyService:
    async def test_example_method(self, db_session: AsyncSession):
        # Arrange: Create test data
        user = await create_user(db_session, email="test@example.com")
        org = await create_organization(db_session, "Test Org")
        await db_session.commit()

        # Act: Call service method
        result = await MyService.example_method(user.id, org.id, db_session)

        # Assert: Verify result
        assert result is not None
        assert result.organization_id == org.id
```

### 2. Test with Multiple Entities

```python
from datetime import datetime, UTC
from tests.utils import create_user_with_org, create_space

@pytest.mark.asyncio()
async def test_complex_scenario(db_session: AsyncSession):
    # Create user with organization (composite factory)
    user, org, _ = await create_user_with_org(
        db_session,
        user_email="owner@example.com",
        org_name="My Organization",
    )

    # Create space in organization
    space = await create_space(
        db_session,
        name="My Space",
        organization=org,
        owner=user,
    )

    await db_session.commit()

    # Test your service logic
    result = await MyService.do_something(space.id, db_session)
    assert result is not None
```

### 3. Test with Time-Based Logic

```python
from datetime import datetime, timedelta, UTC
from tests.utils import create_membership

@pytest.mark.asyncio()
async def test_time_based_logic(db_session: AsyncSession):
    user = await create_user(db_session)
    org = await create_organization(db_session, "Org")

    # Create membership with custom timestamp
    old_activity = datetime.now(UTC) - timedelta(days=30)
    member = await create_membership(
        db_session,
        user,
        org,
        last_active_at=old_activity,
    )

    await db_session.commit()

    # Test time-based logic
    result = await MyService.get_inactive_members(org.id, days=7, session=db_session)
    assert member in result
```

## Test Utilities

### Factory Functions

All factories follow this pattern:

1. **Required parameters** - Positional (e.g., `name`, `organization`, `user`)
2. **Optional parameters** - Keyword-only (e.g., `*, slug=None, description=None`)
3. **Auto-generation** - Sensible defaults (e.g., email, UUIDs)
4. **Flush + Refresh** - Makes ID available immediately
5. **No commit** - Caller controls transaction boundaries

### User Factories

```python
from tests.utils import create_user

# Basic user
user = await create_user(db_session)

# User with specific email
user = await create_user(db_session, email="admin@example.com")

# User with full details
user = await create_user(
    db_session,
    email="john@example.com",
    full_name="John Doe",
    is_active=True,
)
```

### Organization Factories

```python
from tests.utils import (
    create_organization,
    create_membership,
    create_user_with_org,
)

# Basic organization
org = await create_organization(db_session, "My Org")

# Organization with custom slug
org = await create_organization(
    db_session,
    name="My Organization",
    slug="custom-slug",
    description="Organization description",
)

# Organization membership
member = await create_membership(
    db_session,
    user,
    org,
    is_default=True,
    role=OrganizationRole.ADMIN,
)

# Composite: User + Org + Membership
user, org, member = await create_user_with_org(
    db_session,
    user_email="owner@example.com",
    org_name="Test Organization",
    role=OrganizationRole.OWNER,
)
```

### Space & Document Factories

```python
from tests.utils import (
    create_space,
    create_document,
    create_space_with_document,
)

# Basic space
space = await create_space(
    db_session,
    name="My Space",
    organization=org,
    owner=user,
)

# Basic document
doc = await create_document(
    db_session,
    name="report.pdf",
    space=space,
    uploaded_by=user,
)

# Composite: Space + Document
space, doc = await create_space_with_document(
    db_session,
    space_name="Data Room",
    doc_name="financial_report.pdf",
    organization=org,
    owner=user,
)
```

### Thread & Message Factories

```python
from tests.utils import (
    create_thread,
    create_message,
    create_thread_with_messages,
)

# Basic thread
thread = await create_thread(
    db_session,
    query_text="What are the key findings?",
    organization=org,
    creator=user,
    space=space,  # Optional: None for org-wide threads
)

# Basic message
message = await create_message(
    db_session,
    thread=thread,
    content="This is a response",
    role=MessageRole.ASSISTANT,
    message_metadata={"confidence_score": 0.85},
)

# Composite: Thread + Message pairs
thread, messages = await create_thread_with_messages(
    db_session,
    query_text="Analyze the data",
    organization=org,
    creator=user,
    space=space,
    num_exchanges=3,  # 3 user/assistant pairs = 6 messages
)
```

## Best Practices

### 1. Use Descriptive Test Names

✅ **Good:**

```python
async def test_returns_default_organization(self, db_session):
async def test_falls_back_to_most_recently_active(self, db_session):
async def test_raises_value_error_when_not_member(self, db_session):
```

❌ **Bad:**

```python
async def test_get_current(self, db_session):
async def test_switch(self, db_session):
async def test_error(self, db_session):
```

### 2. Follow AAA Pattern

Arrange-Act-Assert pattern makes tests readable:

```python
async def test_example(self, db_session: AsyncSession):
    # Arrange: Set up test data
    user = await create_user(db_session)
    org = await create_organization(db_session, "Test Org")
    await db_session.commit()

    # Act: Execute the code under test
    result = await MyService.do_something(user.id, org.id, db_session)

    # Assert: Verify the results
    assert result is not None
    assert result.status == "success"
```

### 3. Commit Strategically

**Guideline**: Commit **after** creating test data, **before** calling service method.

```python
async def test_example(self, db_session: AsyncSession):
    # Create test data
    user = await create_user(db_session)
    org = await create_organization(db_session, "Org")

    # Commit test data
    await db_session.commit()

    # Now test the service (may do its own commits)
    result = await MyService.do_something(user.id, db_session)

    # Assertions
    assert result is not None
```

**Why?** Services may commit internally. Committing test data first ensures it's persisted before service logic runs.

### 4. Group Tests with Classes

```python
@pytest.mark.asyncio()
class TestMyServiceMethod:
    """Test cases for MyService.method_name."""

    async def test_success_case(self, db_session: AsyncSession):
        # Test successful execution
        pass

    async def test_error_case(self, db_session: AsyncSession):
        # Test error handling
        pass

    async def test_edge_case(self, db_session: AsyncSession):
        # Test edge cases
        pass
```

### 5. Test Error Cases

Always test both success and error paths:

```python
async def test_raises_value_error_when_not_member(self, db_session: AsyncSession):
    user = await create_user(db_session)
    fake_org_id = uuid4()
    await db_session.commit()

    with pytest.raises(ValueError, match="is not a member of organization"):
        await OrganizationService.switch_organization(
            user.id, fake_org_id, db_session
        )
```

### 6. Use Fixtures for Common Setup

```python
@pytest.fixture()
async def user_with_org(db_session: AsyncSession):
    """Reusable fixture for user + organization."""
    user, org, member = await create_user_with_org(
        db_session,
        org_name="Test Organization",
    )
    return user, org, member

async def test_example(self, db_session: AsyncSession, user_with_org):
    user, org, _ = user_with_org
    # Use user and org in test
```

## Common Patterns

### Pattern 1: Time-Based Fallback Logic

**Scenario**: Test priority-based selection (e.g., default > last_active > created_at).

```python
from datetime import datetime, timedelta, UTC

async def test_fallback_logic(self, db_session: AsyncSession):
    user = await create_user(db_session)
    now = datetime.now(UTC)

    # Create entities with different timestamps
    old_org = await create_organization(db_session, "Old")
    recent_org = await create_organization(db_session, "Recent")

    await create_membership(
        db_session,
        user,
        old_org,
        last_active_at=now - timedelta(days=10),
    )
    await create_membership(
        db_session,
        user,
        recent_org,
        last_active_at=now - timedelta(hours=1),
    )

    await db_session.commit()

    # Act
    result = await MyService.get_current(user.id, db_session)

    # Assert: Should return most recent
    assert result == recent_org.id
```

### Pattern 2: Multiple Defaults (Data Corruption Recovery)

**Scenario**: Test that service handles edge cases gracefully.

```python
async def test_handles_multiple_defaults_gracefully(self, db_session: AsyncSession):
    user = await create_user(db_session)
    org1 = await create_organization(db_session, "Org 1")
    org2 = await create_organization(db_session, "Org 2")
    org3 = await create_organization(db_session, "Org 3")

    # Create multiple defaults (shouldn't happen, but test recovery)
    await create_membership(db_session, user, org1, is_default=True)
    await create_membership(db_session, user, org2, is_default=True)
    await create_membership(db_session, user, org3, is_default=False)

    await db_session.commit()

    # Service should clear all defaults and set only org3
    await MyService.switch(user.id, org3.id, db_session)

    # Verify only org3 is default
    result = await MyService.get_current(user.id, db_session)
    assert result == org3.id
```

### Pattern 3: User Isolation

**Scenario**: Test that operations only affect the target user.

```python
async def test_switch_unsets_all_user_defaults_only(self, db_session: AsyncSession):
    user1 = await create_user(db_session, "user1@test.com")
    user2 = await create_user(db_session, "user2@test.com")
    org1 = await create_organization(db_session, "Org 1")
    org2 = await create_organization(db_session, "Org 2")

    # User1 memberships
    await create_membership(db_session, user1, org1, is_default=True)
    await create_membership(db_session, user1, org2, is_default=False)

    # User2 memberships (should not be affected)
    await create_membership(db_session, user2, org1, is_default=True)
    await create_membership(db_session, user2, org2, is_default=False)

    await db_session.commit()

    # User1 switches to org2
    await MyService.switch(user1.id, org2.id, db_session)

    # User1's defaults changed
    assert await MyService.get_current(user1.id, db_session) == org2.id

    # User2's defaults unchanged
    assert await MyService.get_current(user2.id, db_session) == org1.id
```

### Pattern 4: Idempotency

**Scenario**: Test that repeated operations are safe.

```python
async def test_switching_to_current_org_is_idempotent(self, db_session: AsyncSession):
    user = await create_user(db_session)
    org = await create_organization(db_session, "Current")

    member = await create_membership(
        db_session,
        user,
        org,
        is_default=True,
        last_active_at=datetime(2020, 1, 1, tzinfo=UTC),
    )

    await db_session.commit()

    before_switch_time = member.last_active_at

    # Switch to same org
    await MyService.switch(user.id, org.id, db_session)

    # Refresh to get updated data
    await db_session.refresh(member)

    # Still default, but last_active_at updated
    assert member.is_default is True
    assert member.last_active_at > before_switch_time
```

## When to Use SQLite vs PostgreSQL

### Use In-Memory SQLite

✅ **Unit Tests** - Pure business logic, single service

- Service methods (e.g., `OrganizationService.get_current`)
- Model validation
- Utility functions
- Query builders

**Characteristics:**
- No external dependencies (S3, Redis, external APIs)
- Single service or model
- Fast execution (<1s)
- No PostgreSQL-specific features (e.g., advanced JSON operators)

**Example:**

```python
# tests/test_organization_service.py
@pytest.mark.asyncio()
async def test_get_current_organization_id(db_session: AsyncSession):
    # Uses in-memory SQLite - fast, isolated, no Docker
    user = await create_user(db_session)
    org = await create_organization(db_session, "Test")
    await create_membership(db_session, user, org, is_default=True)
    await db_session.commit()

    result = await OrganizationService.get_current_organization_id(
        user.id, db_session
    )
    assert result == org.id
```

### Use Docker PostgreSQL

✅ **Integration Tests** - Multi-service, external dependencies

- GraphQL endpoints with authentication middleware
- Document processing with S3 uploads
- Vector search with pgvector
- Redis session management
- Multi-step workflows (upload → process → embed → search)
- PostgreSQL-specific features (JSONB operators, full-text search, array functions)

**Characteristics:**
- Multiple services interacting
- External dependencies (S3, Redis, OpenAI)
- End-to-end workflows
- PostgreSQL-specific SQL

**Example:**

```python
# tests/integration/test_document_processing_e2e.py
@pytest.mark.integration()
async def test_document_upload_to_search_workflow(
    postgres_session: AsyncSession,
    s3_client,
    redis_client,
):
    # Uses Docker PostgreSQL + S3 + Redis
    # Tests entire workflow: upload → extract → chunk → embed → search
    pass
```

### Decision Matrix

| Test Type | Database | When to Use |
|-----------|----------|-------------|
| **Unit Test** | In-Memory SQLite | Single service, no external deps, fast |
| **Integration Test** | Docker PostgreSQL | Multi-service, external deps, workflows |
| **E2E Test** | Docker PostgreSQL | Full stack, authentication, real APIs |
| **RLS Test** | Docker PostgreSQL (Supabase) | Row Level Security policies, auth.uid() |

## PostgreSQL + Supabase RLS Integration Testing

### Overview

**Row Level Security (RLS)** policies are tested against Docker PostgreSQL with Supabase auth functions to ensure production parity. RLS tests verify that database-level access control works correctly with Supabase's `auth.uid()` and `auth.role()` functions.

### Why Docker PostgreSQL with Supabase Functions?

✅ **Production parity** - Uses Supabase PostgreSQL image with auth extensions
✅ **Real auth.uid() and auth.role()** - Tests actual JWT token parsing via `request.jwt.claim.sub`
✅ **Alembic migrations** - RLS policies loaded from production migration files
✅ **No manual setup** - Auth functions created automatically via init script
✅ **No Supabase CLI required** - Works with standard Docker Compose
✅ **Isolated per test** - Fresh database state for each test session
✅ **CI compatible** - Same setup works locally and in GitHub Actions

### Test Infrastructure

**Unified Fixture System**: All tests (unit, integration, RLS) use consolidated fixtures from `tests/fixtures/postgres.py`

**Key Fixtures:**

1. **`postgres_container`** (session-scoped)
   - **Local**: Starts testcontainer with `pgvector/pgvector:pg16` + auth init script
   - **CI**: Returns mock container pointing to GitHub Actions service container

2. **`postgres_engine`** (session-scoped)
   - Async SQLAlchemy engine connected to test database
   - Applies all Alembic migrations including RLS policies
   - Creates auth functions (`auth.uid()`, `auth.role()`) automatically

3. **`postgres_integration_session`** (test-scoped)
   - Session WITHOUT transaction isolation (commits to database)
   - Required for RLS tests (data must be visible to authenticated sessions)
   - Must manually clean up created data

4. **`authenticated_db_session`** (context manager)
   - Sets up RLS context for authenticated database queries
   - Simulates Supabase JWT authentication by setting session variables
   - Automatically verifies `auth.uid()` returns expected value

### Docker Compose Setup

The `postgres` service in `docker-compose.yml` provides local PostgreSQL with Supabase auth functions:

```yaml
postgres:
  image: supabase/postgres:15.8.1.085
  ports:
    - "5432:5432"
  environment:
    POSTGRES_DB: olympus_dev
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./scripts/init-auth-schema.sql:/docker-entrypoint-initdb.d/01-auth-schema.sql:ro
```

**Auth Schema Init Script**: `apps/api/scripts/init-auth-schema.sql`

This script runs automatically when the container starts and creates:
- **`auth` schema** - Supabase-compatible auth namespace
- **`auth.uid()` function** - Returns authenticated user UUID from JWT
- **`auth.role()` function** - Returns PostgreSQL role from JWT
- **PostgreSQL roles** - `authenticated`, `anon`, `service_role` (required by RLS)

**No manual setup required** - just `docker compose up -d postgres`

### How the Fixtures Work

**`postgres_engine` Fixture Workflow:**

```python
@pytest.fixture(scope="session")
async def postgres_engine(
    postgres_container: PostgresContainerProtocol,
) -> AsyncGenerator[AsyncEngine, None]:
    """Create async engine for PostgreSQL container.

    Converts psycopg2 URL from testcontainers to asyncpg for SQLAlchemy async support.
    Creates database schema using Alembic migrations for full production parity.
    """
    db_url = postgres_container.get_connection_url()
    async_url = db_url.replace("psycopg2", "asyncpg")

    engine = create_async_engine(async_url, echo=False)

    # Create database schema with Alembic migrations
    await setup_database_schema(engine, async_url)

    yield engine
    await engine.dispose()
```

**`setup_database_schema` - Creates Full Database Schema:**

```python
async def setup_database_schema(engine: AsyncEngine, database_url: str) -> None:
    """Create database schema using Alembic migrations.

    Applies all Alembic migrations to provide full production parity,
    including RLS policies and other migration-specific logic.
    """
    async with engine.begin() as conn:
        # 1. Drop and recreate schemas (clean slate)
        await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        await conn.execute(text("DROP SCHEMA IF EXISTS _internal CASCADE"))
        await conn.execute(text("DROP SCHEMA IF EXISTS auth CASCADE"))

        await conn.execute(text("CREATE SCHEMA public"))
        await conn.execute(text("CREATE SCHEMA _internal"))
        await conn.execute(text("CREATE SCHEMA auth"))

        # 2. Install pgvector extension
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

        # 3. Create PostgreSQL roles for RLS
        await conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
                    CREATE ROLE authenticated NOLOGIN;
                END IF;
                IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
                    CREATE ROLE anon NOLOGIN;
                END IF;
                IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
                    CREATE ROLE service_role NOLOGIN;
                END IF;
            END
            $$
        """))

        # 4. Grant privileges
        await conn.execute(text("GRANT authenticated TO postgres"))
        await conn.execute(text("GRANT anon TO postgres"))
        await conn.execute(text("GRANT service_role TO postgres"))

        # 5. Create auth.uid() and auth.role() functions
        await conn.execute(text("""
            CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
            LANGUAGE sql STABLE
            AS $$
              SELECT NULLIF(
                COALESCE(
                  current_setting('request.jwt.claim.sub', true),
                  (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
                ),
                ''
              )::uuid
            $$
        """))

        await conn.execute(text("""
            CREATE OR REPLACE FUNCTION auth.role() RETURNS text
            LANGUAGE sql STABLE
            AS $$
              SELECT COALESCE(
                current_setting('request.jwt.claim.role', true),
                (current_setting('request.jwt.claims', true)::jsonb ->> 'role'),
                current_user
              )::text
            $$
        """))

    # 6. Apply Alembic migrations (includes RLS policies)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, apply_alembic_migrations_sync, database_url)
```

**Key Principle**: RLS policies come from Alembic migrations, **not** hardcoded in fixtures. Migrations are the source of truth.

### Writing RLS Tests with authenticated_db_session

**The `authenticated_db_session` Context Manager**:

Located in `tests/fixtures/postgres.py`, this context manager sets up RLS context for authenticated queries:

```python
@asynccontextmanager
async def authenticated_db_session(
    engine: AsyncEngine,
    auth_user_id: str | UUID,
    role: str = "authenticated"
) -> AsyncGenerator[AsyncSession, None]:
    """Set up RLS context for authenticated database queries.

    Args:
        engine: AsyncEngine instance connected to test database
        auth_user_id: UUID of the authenticated user (matches users.auth_user_id)
        role: PostgreSQL role to assume (authenticated, anon, service_role)

    Yields:
        AsyncSession with RLS context configured

    Example:
        async with authenticated_db_session(postgres_engine, user.auth_user_id) as session:
            result = await session.execute(select(Thread))
            threads = result.scalars().all()
    """
```

**Pattern 1: Testing auth.uid() Function**

```python
@pytest.mark.integration
@pytest.mark.rls
class TestThreadRLSPolicies:
    """Test RLS policies on the threads table."""

    async def test_auth_uid_returns_correct_user(
        self,
        postgres_engine: AsyncEngine,
        postgres_integration_session: AsyncSession,
    ):
        """Verify auth.uid() returns the correct user ID from JWT context."""
        # Arrange: Create two test users
        user_a = await create_user(
            postgres_integration_session,
            email="user_a@test.com",
            full_name="Test User A"
        )
        user_b = await create_user(
            postgres_integration_session,
            email="user_b@test.com",
            full_name="Test User B"
        )
        await postgres_integration_session.commit()

        # Act & Assert: Verify auth.uid() for user A
        async with authenticated_db_session(
            postgres_engine, user_a.auth_user_id
        ) as session:
            result = await session.execute(text("SELECT auth.uid()"))
            uid = result.scalar()
            assert uid == user_a.auth_user_id

        # Act & Assert: Verify auth.uid() for user B
        async with authenticated_db_session(
            postgres_engine, user_b.auth_user_id
        ) as session:
            result = await session.execute(text("SELECT auth.uid()"))
            uid = result.scalar()
            assert uid == user_b.auth_user_id
```

**Pattern 2: Testing RLS Policies for Personal Threads**

```python
async def test_user_can_read_own_personal_threads(
    self,
    postgres_engine: AsyncEngine,
    postgres_integration_session: AsyncSession,
):
    """User should be able to read their own personal threads."""
    # Arrange: Create test user
    user_a = await create_user(
        postgres_integration_session,
        email="user_a_personal@test.com",
        full_name="Test User A"
    )
    await postgres_integration_session.commit()

    # Create thread as service_role (bypasses RLS for setup)
    await postgres_integration_session.execute(text("SET ROLE service_role"))

    thread = Thread(
        id=uuid.uuid4(),
        title="User A's Personal Thread",
        query_text="Test query for user A",
        visibility="personal",
        owner_user_id=user_a.id,
    )
    postgres_integration_session.add(thread)
    await postgres_integration_session.flush()
    await postgres_integration_session.commit()

    # Reset role
    await postgres_integration_session.execute(text("RESET ROLE"))

    # Act: Query as User A (with RLS context)
    async with authenticated_db_session(
        postgres_engine, user_a.auth_user_id
    ) as user_session:
        result = await user_session.execute(
            select(Thread).where(Thread.visibility == "personal")
        )
        threads = result.scalars().all()

        # Assert: User can see their own thread
        assert len(threads) == 1
        assert threads[0].id == thread.id
        assert threads[0].title == "User A's Personal Thread"
```

**Pattern 3: Testing Cross-User Isolation**

```python
async def test_user_cannot_read_other_users_personal_threads(
    self,
    postgres_engine: AsyncEngine,
    postgres_integration_session: AsyncSession,
):
    """User B should NOT be able to see User A's personal threads."""
    # Arrange: Create two test users
    user_a = await create_user(
        postgres_integration_session,
        email="user_a_secret@test.com",
        full_name="Test User A"
    )
    user_b = await create_user(
        postgres_integration_session,
        email="user_b_secret@test.com",
        full_name="Test User B"
    )
    await postgres_integration_session.commit()

    # Create User A's personal thread (service_role bypasses RLS)
    await postgres_integration_session.execute(text("SET ROLE service_role"))

    thread_a = Thread(
        id=uuid.uuid4(),
        title="User A's Secret Thread",
        query_text="Secret query from user A",
        visibility="personal",
        owner_user_id=user_a.id,
    )
    postgres_integration_session.add(thread_a)
    await postgres_integration_session.flush()
    await postgres_integration_session.commit()

    await postgres_integration_session.execute(text("RESET ROLE"))

    # Act: Query as User B - should see nothing
    async with authenticated_db_session(
        postgres_engine, user_b.auth_user_id
    ) as user_b_session:
        result = await user_b_session.execute(
            select(Thread).where(Thread.id == thread_a.id)
        )
        threads = result.scalars().all()

        # Assert: RLS should filter out User A's thread
        assert len(threads) == 0
```

### Important Notes for RLS Tests

**Using `postgres_integration_session`**:
- RLS tests require `postgres_integration_session` (NOT `postgres_session`)
- This session commits data to the database (no transaction isolation)
- Data must be visible to separate authenticated sessions
- Always use `service_role` when creating test data to bypass RLS

**Using `authenticated_db_session`**:
- Automatically sets up JWT context (`auth.uid()`, `auth.role()`)
- Verifies `auth.uid()` returns expected value before yielding
- Automatically resets role and rolls back on exit
- Critical: Role MUST be set BEFORE JWT claims (order matters!)

**Factory Functions**:
- Use `create_user()` from `tests/factories.py` to create test users
- Each user gets a unique `auth_user_id` (UUID) automatically
- Users are created in the database via SQLAlchemy (not Supabase Auth API)

### Running RLS Tests

```bash
# Start Docker PostgreSQL (if not already running)
docker compose up -d postgres

# Run RLS tests only (from host machine, NOT in container)
cd apps/api
poetry run pytest -m rls -v

# Run specific RLS test file
poetry run pytest tests/integration/test_rls_policies.py -v

# Run RLS tests with coverage
poetry run pytest -m rls --cov=app --cov-report=html -v

# Run all integration tests (includes RLS)
poetry run pytest tests/integration/ -v
```

**IMPORTANT**: Run integration tests on the **host machine** (not inside Docker container). Testcontainers requires Docker socket access only available on the host.

### Test Organization

**Location**: `tests/integration/test_rls_policies.py`

**Markers**:
- `@pytest.mark.integration` - Integration test with external dependencies (Docker PostgreSQL)
- `@pytest.mark.rls` - Specifically tests Row Level Security policies

**Example file structure**:

```
tests/
├── fixtures/
│   ├── postgres.py           # PostgreSQL fixtures (unified for all tests)
│   └── __init__.py
├── factories/
│   ├── __init__.py           # User, org, space, thread factories
├── integration/
│   ├── test_rls_policies.py  # RLS policy tests
│   └── __init__.py
├── conftest.py               # Global fixtures (imports from postgres.py)
└── test_*.py                 # Unit tests (in-memory SQLite)
```

**Import Pattern**:

```python
# tests/integration/test_rls_policies.py
import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.models.thread import Thread
from tests.factories import create_user
from tests.fixtures.postgres import authenticated_db_session
```

### Running Tests Locally vs CI

**Local Development:**

Integration tests (including RLS) must run on the **host machine** using `poetry run pytest`:

```bash
# ✅ CORRECT: Run integration tests on host
cd apps/api
poetry run pytest tests/integration/ -v           # All integration tests
poetry run pytest tests/integration/test_rls_policies.py -v  # RLS tests only
poetry run pytest -m rls -v                       # All RLS-marked tests

# ✅ CORRECT: Run unit tests anywhere
poetry run pytest tests/test_*.py -v              # Host machine
docker compose exec api poetry run pytest tests/test_*.py -v  # In container (also works)

# ❌ WRONG: Run integration tests in container
docker compose exec api poetry run pytest tests/integration/ -v  # Docker socket error!
```

**Why host machine?** Integration tests use `testcontainers-python` to spin up ephemeral PostgreSQL containers, which requires Docker socket access only available on the host.

**CI Environment (GitHub Actions):**

CI uses **GitHub Actions service containers** instead of testcontainers:

```yaml
# .github/workflows/api-test.yml
services:
  postgres:
    image: supabase/postgres:15.8.1.085
    env:
      POSTGRES_DB: olympus_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_HOST_AUTH_METHOD: trust
    ports:
      - 5432:5432
    options: >-
      --health-cmd "pg_isready -U postgres"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

steps:
  # Initialize auth schema (creates auth.uid() and auth.role() functions)
  - name: Initialize auth schema in PostgreSQL
    run: |
      PGPASSWORD=postgres psql -h localhost -U postgres -d olympus_test -f scripts/init-auth-schema.sql

  # Run all tests (unit + integration + RLS)
  - name: Run pytest with coverage
    env:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@localhost:5432/olympus_test
      SPICEDB_ENDPOINT: localhost:50051
      SPICEDB_TOKEN: testtoken
      CI: "true"  # Tells fixtures to use service container
    run: poetry run pytest --cov=app --cov-report=xml --cov-report=html -v
```

**How Fixtures Detect Environment:**

```python
def _is_ci_environment() -> bool:
    """Check if running in CI environment (GitHub Actions)."""
    return os.getenv("CI") == "true" or os.getenv("GITHUB_ACTIONS") == "true"

@pytest.fixture(scope="session")
def postgres_container() -> PostgresContainerProtocol:
    if _is_ci_environment():
        # CI: Return mock container pointing to service container
        class MockContainer:
            def get_connection_url(self) -> str:
                return "postgresql+psycopg2://postgres:postgres@localhost:5432/olympus_test"
        yield MockContainer()
    else:
        # Local: Start real testcontainer
        container = PostgresContainer(
            image="pgvector/pgvector:pg16",
            username="postgres",
            password="postgres",
            dbname="olympus_test",
        ).with_volume_mapping(
            str(auth_script_path),
            "/docker-entrypoint-initdb.d/01-auth-schema.sql",
            "ro"
        )
        container.start()
        yield container
        container.stop()
```

**Key Differences:**

| Environment | Container Source | Database URL | Auth Functions |
|-------------|-----------------|--------------|----------------|
| **Local** | Testcontainers (ephemeral) | Random port (e.g., `localhost:59597`) | Created by init script in container |
| **CI** | GitHub Actions service | Fixed port (`localhost:5432`) | Created by `psql` init step |

Both environments apply the same Alembic migrations via `postgres_engine` fixture for production parity.

### Important Notes

**Production Parity:**
- ✅ RLS policies loaded from Alembic migrations (never hardcoded)
- ✅ Same PostgreSQL image as production (Supabase with pgvector)
- ✅ Same auth.uid() and auth.role() function behavior
- ✅ Automatic schema setup via init script (no manual steps)

**Auth Functions:**
- `auth.uid()` returns UUID from `request.jwt.claim.sub` session variable
- `auth.role()` returns PostgreSQL role from `request.jwt.claim.role`
- **Critical** for Supabase architecture - do not modify
- Automatically verified by `authenticated_db_session` context manager

**Test Data Management:**
- Use `create_user()` factory from `tests/factories.py`
- Each user gets unique `auth_user_id` (UUID) automatically
- Use `service_role` to bypass RLS when creating test data
- Always commit data with `postgres_integration_session.commit()`

**Troubleshooting:**
- If auth functions missing: `docker compose restart postgres`
- If migrations fail: Check Alembic version table with `alembic current`
- If testcontainers fail: Run tests on host machine (not in Docker container)

### Reference Implementation

**Example**: `tests/integration/test_rls_policies.py`

This file demonstrates:
- ✅ Consolidated PostgreSQL fixture system (`postgres.py`)
- ✅ `authenticated_db_session` context manager usage
- ✅ Alembic-based RLS policy testing
- ✅ auth.uid() function verification
- ✅ Cross-user isolation testing
- ✅ Production parity (same migrations as production)

Study this file for RLS testing patterns and best practices.

## Troubleshooting

### Issue: "AttributeError: 'SQLiteTypeCompiler' object has no attribute 'visit_JSONB'"

**Problem**: Your model uses PostgreSQL's `JSONB` type, but SQLite doesn't support it.

**Solution**: The `db_session` fixture automatically converts JSONB → JSON. If you're not using the fixture, ensure you're using it correctly:

```python
async def test_example(db_session: AsyncSession):  # ✅ Uses fixture
    # Test code
```

Not:

```python
async def test_example():  # ❌ No fixture
    engine = create_async_engine("sqlite:///:memory:")
    # Will fail with JSONB error
```

### Issue: "no such table: <table_name>"

**Problem**: Table not created in test database.

**Solution**: Ensure you're using the `db_session` fixture, which creates all tables automatically:

```python
@pytest.mark.asyncio()
async def test_example(db_session: AsyncSession):  # ✅ Correct
    user = await create_user(db_session)
```

### Issue: Tests fail with "can't compare offset-naive and offset-aware datetimes"

**Problem**: SQLite doesn't preserve timezone information in TIMESTAMP columns.

**Solution**: Use string comparison for timestamp assertions in SQLite tests:

```python
# Instead of:
assert member.last_active_at > before_time  # ❌ May fail in SQLite

# Use:
assert str(member.last_active_at) > str(before_time)  # ✅ Works in SQLite

# Or just check non-null:
assert member.last_active_at is not None  # ✅ Sufficient for most tests
```

### Issue: "relationship loading" errors with refresh()

**Problem**: Model has `lazy='selectin'` relationships that try to load related tables.

**Solution**: This is automatically handled by the `db_session` fixture (all tables are created). If you encounter this, ensure you're using the fixture correctly.

### Issue: Tests are slow

**Problem**: Tests taking >5 seconds for unit tests.

**Diagnosis**:

```bash
# Run with timing
docker compose exec api poetry run pytest tests/ -v --durations=10
```

**Common causes:**
- Not using in-memory SQLite (using Docker PostgreSQL unnecessarily)
- Creating too many entities per test
- Not using composite factories
- Committing unnecessarily in loops

**Solutions:**
- Use in-memory SQLite for unit tests
- Use composite factories (`create_user_with_org`, `create_thread_with_messages`)
- Batch commits outside loops
- Mock external API calls (OpenAI, S3) in unit tests

## Running Tests

### Test Execution Modes

The test suite supports three execution modes for flexibility:

**IMPORTANT**: Integration tests **must run sequentially** to avoid test isolation issues. Unit tests can run in parallel for speed.

#### Mode 1: Local Host Execution (Recommended for Development)

Runs on your host machine using testcontainers for service dependencies.

```bash
cd apps/api

# Using Makefile (recommended - handles parallel/sequential automatically)
make test-unit        # Unit tests in parallel (fast)
make test-integration # Integration tests sequentially (PostgreSQL + services)
make test-all         # All tests (unit parallel, integration sequential)
make test-coverage    # With coverage report
make test-rls         # RLS policy tests only (sequential)
make test             # Alias for test-all

# Or use pytest directly
poetry run pytest tests/ -m "not integration" -n auto -v  # Unit tests (parallel)
poetry run pytest tests/ -m integration -v                # Integration tests (sequential)
```

**Requirements:**
- Docker daemon running (for testcontainers)
- Poetry dependencies installed
- `.env.test` file configured
- `pytest-xdist` for parallel execution (`poetry install` includes this)

#### Mode 2: Docker Container Execution (For Consistent Environments)

Runs tests in a Docker container with Docker socket mounted. Uses Docker Compose test services.

```bash
# Start test services (PostgreSQL, Redis, SpiceDB, MinIO)
docker compose -f docker-compose.test.yml up -d

# Run tests in container
docker compose -f docker-compose.test.yml run --rm test-runner make test-all

# Run specific test suite
docker compose -f docker-compose.test.yml run --rm test-runner make test-integration

# Stop test services
docker compose -f docker-compose.test.yml down
```

**Requirements:**
- Docker Compose installed
- Docker socket accessible (`/var/run/docker.sock`)

#### Mode 3: CI Execution (GitHub Actions)

Uses GitHub Actions service containers (no Docker socket needed).

```yaml
# .github/workflows/api-test.yml
services:
  postgres: ...
  redis: ...
  spicedb: ...
```

### Test Commands

```bash
# All tests (use make test-all for proper parallel/sequential handling)
make test-all

# Unit tests in parallel (fast!)
poetry run pytest tests/ -m "not integration" -n auto -v

# Integration tests sequentially (REQUIRED for stability)
poetry run pytest tests/ -m integration -v

# Specific file (unit test - can use parallel)
poetry run pytest tests/test_organization_service.py -n auto -v

# Specific file (integration test - run sequentially)
poetry run pytest tests/integration/test_rest_auth.py -v

# Specific test
poetry run pytest tests/test_organization_service.py::TestGetCurrentOrganizationId::test_returns_default_organization -v

# With coverage
poetry run pytest --cov=app --cov-report=html tests/
```

**⚠️ WARNING**: Do NOT run integration tests with `-n auto` (parallel). They require sequential execution to avoid test isolation issues.

### Test Markers

Tests are organized using pytest markers:

- **No marker** (default): Unit tests (SQLite, fast, ~0.1s/test)
- **`@pytest.mark.integration`**: Integration tests (PostgreSQL + services, ~1-2s/test)
- **`@pytest.mark.rls`**: RLS policy tests (subset of integration tests)

Run tests by marker:

```bash
# Unit tests only
poetry run pytest tests/ -m "not integration" -v

# Integration tests only
poetry run pytest tests/ -m integration -v

# RLS tests only
poetry run pytest tests/ -m rls -v
```

## Reference Implementation

**Example**: `tests/test_organization_service.py`

This file demonstrates:

- ✅ Real in-memory SQLite database
- ✅ Comprehensive test coverage (12 tests, all edge cases)
- ✅ Helper factories from `tests/utils`
- ✅ AAA pattern (Arrange-Act-Assert)
- ✅ Time-based testing
- ✅ Error case testing
- ✅ Idempotency testing
- ✅ User isolation testing
- ✅ Fast execution (0.48s for 12 tests)

Study this file for patterns and best practices.

## Additional Resources

- **Linear Ticket**: [LOG-230 - Migrate all API tests from mocks to in-memory SQLite](https://linear.app/logarithmic/issue/LOG-230)
- **Test Utilities**: `tests/utils.py` - Reusable factory functions
- **Test Fixture**: `tests/conftest.py` - `db_session` fixture implementation
- **pytest-asyncio docs**: https://pytest-asyncio.readthedocs.io/
- **SQLAlchemy async docs**: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
