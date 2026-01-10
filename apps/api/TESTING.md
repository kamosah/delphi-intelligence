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
| **RLS Test** | Local Supabase PostgreSQL | Row Level Security policies, auth.uid() |

## Supabase RLS Integration Testing

### Overview

**Row Level Security (RLS)** policies are tested against local Supabase PostgreSQL to ensure production parity. RLS tests verify that database-level access control works correctly with Supabase's `auth.uid()` function.

### Why Local Supabase for RLS Tests?

✅ **Production parity** - Uses same PostgreSQL with Supabase Auth extensions
✅ **Real auth.uid()** - Tests actual JWT token parsing via `auth.jwt.claim.sub`
✅ **Alembic migrations** - RLS policies loaded from production migration files
✅ **No manual policy writing** - Migrations are the source of truth
✅ **Isolated per test** - Fresh database schemas for each test session

### Test Infrastructure

**Fixture**: `supabase_postgres_engine` (located in `tests/fixtures/supabase_local.py`)

**What it provides:**

- **Local Supabase PostgreSQL** - Connected to `npx supabase start` instance
- **Clean slate** - Drops and recreates `public` and `_internal` schemas
- **Alembic migrations** - Applies all migrations including RLS policies
- **Auth extensions** - GoTrue roles (`authenticated`, `anon`, `service_role`)
- **pgvector** - Vector search extension pre-installed

**Database URL**: `postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres`

### Setup: Start Local Supabase

Before running RLS tests, start local Supabase:

```bash
cd apps/api
npx supabase start

# Expected output:
# Started supabase local development setup.
# API URL: http://127.0.0.1:54321
# DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

**Note**: Local Supabase runs in Docker containers and persists data between runs. If you encounter stale migration state, restart:

```bash
npx supabase stop
npx supabase start
```

### Fixture Implementation

The `supabase_postgres_engine` fixture follows this workflow:

```python
@pytest.fixture(scope="session")
async def supabase_postgres_engine() -> AsyncGenerator[AsyncEngine, None]:
    """Async engine connected to local Supabase PostgreSQL database."""

    # 1. Connect to local Supabase
    database_url = "postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres"
    engine = create_async_engine(database_url, echo=False, pool_pre_ping=True)

    # 2. Drop and recreate application schemas (leave auth schema intact)
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        await conn.execute(text("DROP SCHEMA IF EXISTS _internal CASCADE"))

        await conn.execute(text("CREATE SCHEMA public"))
        await conn.execute(text("CREATE SCHEMA _internal"))

        # Grant permissions
        await conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))

        # Install extensions
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

        # Grant postgres user ability to assume RLS roles
        await conn.execute(text("GRANT authenticated TO postgres"))
        await conn.execute(text("GRANT anon TO postgres"))
        await conn.execute(text("GRANT service_role TO postgres"))

    # 3. Apply Alembic migrations (runs synchronously in thread pool)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, apply_alembic_migrations_sync, database_url)

    yield engine
    await engine.dispose()
```

### Alembic Migration Function

**Key principle**: RLS policies come from Alembic migrations, **not** hardcoded in fixtures.

```python
def apply_alembic_migrations_sync(database_url: str) -> None:
    """Apply Alembic migrations synchronously for production parity."""
    from alembic import command
    from alembic.config import Config
    import psycopg2

    # Convert asyncpg URL to psycopg2 (Alembic requirement)
    sync_url = database_url.replace("postgresql+asyncpg://", "postgresql://")

    # Clear stale alembic_version records
    conn = psycopg2.connect(sync_url)
    with conn.cursor() as cur:
        cur.execute("DELETE FROM _internal.alembic_version")
    conn.commit()
    conn.close()

    # Load and run Alembic migrations
    # Get path to alembic.ini
    # From: tests/fixtures/supabase_local.py
    # To:   apps/api/alembic.ini (2 levels up)
    api_root = Path(__file__).resolve().parents[2]
    alembic_ini_path = api_root / "alembic.ini"
    alembic_cfg = Config(str(alembic_ini_path))
    alembic_cfg.set_main_option("sqlalchemy.url", sync_url)

    # Migrate to HEAD
    command.upgrade(alembic_cfg, "head")
```

### Writing RLS Tests

**Pattern 1: Testing auth.uid() Function**

```python
@pytest.mark.integration()
@pytest.mark.rls()
class TestAuthUidFunction:
    """Verify auth.uid() returns correct user UUID."""

    async def test_auth_uid_returns_correct_user(
        self,
        supabase_admin,
        supabase_postgres_engine
    ) -> None:
        # Arrange: Create two Supabase Auth users
        user1 = await supabase_admin.auth.admin.create_user({
            "email": "user1@test.com",
            "password": "password123",
        })

        user2 = await supabase_admin.auth.admin.create_user({
            "email": "user2@test.com",
            "password": "password456",
        })

        # Act: Execute query as each user
        async with supabase_postgres_engine.begin() as conn:
            # Set JWT claims for user1
            await conn.execute(text(f"""
                SELECT set_config('request.jwt.claims',
                    '{{"sub": "{user1.user.id}"}}',
                    false)
            """))

            result1 = await conn.execute(text("SELECT auth.uid()"))
            uid1 = result1.scalar()

            # Set JWT claims for user2
            await conn.execute(text(f"""
                SELECT set_config('request.jwt.claims',
                    '{{"sub": "{user2.user.id}"}}',
                    false)
            """))

            result2 = await conn.execute(text("SELECT auth.uid()"))
            uid2 = result2.scalar()

        # Assert: auth.uid() returns correct UUIDs
        assert str(uid1) == user1.user.id
        assert str(uid2) == user2.user.id
```

**Pattern 2: Testing RLS Policies**

```python
@pytest.mark.integration()
@pytest.mark.rls()
class TestThreadRLSPolicies:
    """Test Row Level Security for personal threads."""

    async def test_user_can_read_own_personal_threads(
        self,
        supabase_admin,
        supabase_postgres_engine,
    ) -> None:
        # Arrange: Create user and thread via factories
        user_context = await create_test_user(supabase_admin)

        async with supabase_postgres_engine.begin() as conn:
            # Create user in database
            await conn.execute(text("""
                INSERT INTO app_users (id, email, full_name)
                VALUES (:id, :email, :name)
            """), {
                "id": user_context.user_id,
                "email": user_context.email,
                "name": "Test User",
            })

            # Create personal thread
            await conn.execute(text("""
                INSERT INTO threads (
                    id, owner_user_id, visibility,
                    query_text, created_by
                )
                VALUES (
                    gen_random_uuid(),
                    :user_id,
                    'personal',
                    'My query',
                    :user_id
                )
            """), {"user_id": user_context.user_id})

        # Act: Query threads as authenticated user
        async with supabase_postgres_engine.begin() as conn:
            # Set JWT claims (simulates authenticated request)
            await conn.execute(text(f"""
                SELECT set_config('request.jwt.claims',
                    '{{"sub": "{user_context.user_id}"}}',
                    false)
            """))

            # Set role to authenticated
            await conn.execute(text("SET LOCAL ROLE authenticated"))

            # Query threads (RLS policies will filter)
            result = await conn.execute(text("""
                SELECT COUNT(*) FROM threads
                WHERE visibility = 'personal'
            """))
            count = result.scalar()

        # Assert: User can see their own thread
        assert count == 1
```

**Pattern 3: Testing Cross-User Isolation**

```python
async def test_user_cannot_read_other_users_personal_threads(
    self,
    supabase_admin,
    supabase_postgres_engine,
) -> None:
    # Arrange: Create two users
    user1_context = await create_test_user(supabase_admin, "user1@test.com")
    user2_context = await create_test_user(supabase_admin, "user2@test.com")

    async with supabase_postgres_engine.begin() as conn:
        # Create both users in DB
        await conn.execute(text("""
            INSERT INTO app_users (id, email, full_name)
            VALUES
                (:id1, :email1, 'User 1'),
                (:id2, :email2, 'User 2')
        """), {
            "id1": user1_context.user_id,
            "email1": user1_context.email,
            "id2": user2_context.user_id,
            "email2": user2_context.email,
        })

        # Create thread owned by user1
        await conn.execute(text("""
            INSERT INTO threads (
                id, owner_user_id, visibility,
                query_text, created_by
            )
            VALUES (
                gen_random_uuid(),
                :user1_id,
                'personal',
                'User 1 query',
                :user1_id
            )
        """), {"user1_id": user1_context.user_id})

    # Act: Try to query as user2
    async with supabase_postgres_engine.begin() as conn:
        # Set JWT claims for user2
        await conn.execute(text(f"""
            SELECT set_config('request.jwt.claims',
                '{{"sub": "{user2_context.user_id}"}}',
                false)
        """))

        await conn.execute(text("SET LOCAL ROLE authenticated"))

        # Query threads
        result = await conn.execute(text("""
            SELECT COUNT(*) FROM threads
            WHERE visibility = 'personal'
        """))
        count = result.scalar()

    # Assert: User2 cannot see User1's thread
    assert count == 0
```

### Helper Fixtures

**`create_test_user` - Factory for Supabase Auth users**

```python
@dataclass
class TestUserContext:
    user_id: str
    email: str
    access_token: str
    refresh_token: str

async def create_test_user(
    supabase_admin,
    email: str = "test@example.com",
) -> TestUserContext:
    """Create Supabase Auth user and return tokens."""
    user_response = await supabase_admin.auth.admin.create_user({
        "email": email,
        "password": "password123",
        "email_confirm": True,
    })

    session = await supabase_admin.auth.sign_in_with_password({
        "email": email,
        "password": "password123",
    })

    return TestUserContext(
        user_id=user_response.user.id,
        email=email,
        access_token=session.session.access_token,
        refresh_token=session.session.refresh_token,
    )
```

### Running RLS Tests

```bash
# Start local Supabase first
npx supabase start

# Run RLS tests only
docker compose exec api poetry run pytest -m rls -v

# Run specific RLS test file
docker compose exec api poetry run pytest tests/integration/test_rls_policies.py -v

# Run RLS tests with coverage
docker compose exec api poetry run pytest -m rls --cov=app --cov-report=html
```

### Test Organization

**Location**: `tests/integration/test_rls_policies.py`

**Markers**:
- `@pytest.mark.integration()` - Integration test with external dependencies
- `@pytest.mark.rls()` - Specifically tests Row Level Security policies

**Example file structure**:

```
tests/
├── fixtures/
│   ├── supabase_local.py     # Supabase fixtures (engine, admin client)
│   └── __init__.py
├── integration/
│   ├── test_rls_policies.py  # RLS policy tests
│   └── __init__.py
├── conftest.py               # Global fixtures
└── test_*.py                 # Unit tests (in-memory SQLite)
```

### CI Configuration

**GitHub Actions**: RLS tests run in CI with service containers

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: olympus_test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432

steps:
  - name: Apply database migrations
    env:
      DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/olympus_test
    run: poetry run alembic upgrade head

  - name: Run pytest with coverage
    env:
      DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/olympus_test
      SPICEDB_ENDPOINT: localhost:50051
      SPICEDB_TOKEN: testtoken
    run: poetry run pytest -n auto --dist loadscope --cov=app --cov-report=xml -v
```

### Important Notes

**Production Parity**:
- ✅ RLS policies loaded from Alembic migrations
- ✅ Same PostgreSQL version as production (pgvector/pgvector:pg16)
- ✅ Same auth.uid() function behavior
- ❌ **Never** hardcode RLS policies in test fixtures

**Local Supabase Persistence**:
- Local Supabase (`npx supabase start`) persists data between runs
- If tests fail with stale state, restart: `npx supabase stop && npx supabase start`
- Fixture automatically cleans schemas on each session

**auth.uid() Function**:
- Returns UUID from `request.jwt.claims.sub` (set via `set_config`)
- **Critical** for Supabase architecture - do not modify
- Test this function explicitly to ensure RLS policies work

### Reference Implementation

**Example**: `tests/integration/test_rls_policies.py`

This file demonstrates:
- ✅ Real local Supabase PostgreSQL
- ✅ Alembic-based RLS policy testing
- ✅ auth.uid() function verification
- ✅ Cross-user isolation testing
- ✅ Production parity (same migrations as production)

Study this file for RLS testing patterns.

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

```bash
# All tests
docker compose exec api poetry run pytest

# Specific file
docker compose exec api poetry run pytest tests/test_organization_service.py

# Specific test
docker compose exec api poetry run pytest tests/test_organization_service.py::TestGetCurrentOrganizationId::test_returns_default_organization

# With verbose output
docker compose exec api poetry run pytest -v

# With coverage
docker compose exec api poetry run pytest --cov=app --cov-report=html

# Parallel execution (fast!)
docker compose exec api poetry run pytest -n auto
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
