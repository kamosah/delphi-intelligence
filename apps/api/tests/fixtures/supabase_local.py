"""Real Supabase fixtures for integration testing using local CLI stack.

These fixtures use the local Supabase instance started via `npx supabase start`
instead of mocking the Supabase client. This provides 100% production parity
for Auth API testing.

Setup:
    # Start local Supabase stack (first run downloads Docker images)
    npx supabase start

    # Get connection details
    npx supabase status

    # Stop when done
    npx supabase stop

Local Supabase Services:
    - Auth API: http://127.0.0.1:54321/auth/v1
    - PostgreSQL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
    - Inbucket (Email): http://127.0.0.1:54324
    - Studio: http://127.0.0.1:54323

Environment Variables (required for tests):
    SUPABASE_LOCAL_URL - Local Supabase URL (default: http://127.0.0.1:54321)
    SUPABASE_LOCAL_ANON_KEY - Anon key from `npx supabase status`
    SUPABASE_LOCAL_SERVICE_ROLE_KEY - Service role key from `npx supabase status`

    Note: These are the default keys from Supabase CLI (safe to commit in .env.example)
    but should be in .env and .gitignore for consistency with production secrets.
"""

import asyncio
import json
import os
import uuid
from collections.abc import AsyncGenerator, Callable
from contextlib import asynccontextmanager, suppress
from dataclasses import dataclass
from pathlib import Path

import psycopg2
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from supabase import Client, create_client

from app.models.user import User


# Local Supabase connection details (from environment or default CLI values)
# These defaults are the standard keys from `npx supabase start` - same for everyone
SUPABASE_LOCAL_URL = os.getenv("SUPABASE_LOCAL_URL", "http://127.0.0.1:54321")
SUPABASE_LOCAL_ANON_KEY = os.getenv(
    "SUPABASE_LOCAL_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
)
SUPABASE_LOCAL_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_LOCAL_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
)


@pytest.fixture(scope="session")
def local_supabase_client() -> Client:
    """Provide Supabase client connected to local CLI stack (anon key).

    Uses anon key for regular Auth API operations (sign up, sign in, etc.).
    Session-scoped to reuse connection across all tests.

    Usage:
        @pytest.mark.integration
        async def test_auth(local_supabase_client):
            # Create test user via Supabase Auth
            result = local_supabase_client.auth.sign_up({
                "email": "test@example.com",
                "password": "password123"
            })
            assert result.user is not None
    """
    client = create_client(SUPABASE_LOCAL_URL, SUPABASE_LOCAL_ANON_KEY)
    return client


@pytest.fixture(scope="session")
def local_supabase_admin_client() -> Client:
    """Provide Supabase client with service role key (admin privileges).

    Uses service_role key for admin operations (delete users, bypass RLS, etc.).
    Session-scoped to reuse connection across all tests.

    Usage:
        @pytest.fixture
        async def cleanup_test_users(local_supabase_admin_client):
            '''Clean up test users after each test.'''
            yield
            # Delete test users using admin client
            # (Requires admin API or direct database access)
    """
    client = create_client(SUPABASE_LOCAL_URL, SUPABASE_LOCAL_SERVICE_ROLE_KEY)
    return client


# ============================================================================
# Local Supabase PostgreSQL Connection Fixtures
# ============================================================================


def apply_alembic_migrations_sync(database_url: str) -> None:
    """Apply Alembic migrations synchronously for production parity.

    This runs ALL Alembic migrations including RLS policies exactly as they
    exist in the migration files, ensuring complete production parity.

    Args:
        database_url: PostgreSQL connection URL (postgresql://...)

    Raises:
        RuntimeError: If migrations fail to apply
    """
    # Override database URL (ensure it's synchronous psycopg2 URL)
    sync_url = database_url.replace("postgresql+asyncpg://", "postgresql://")

    # Manually clear alembic_version table using direct psycopg2 connection
    # This ensures the table is truly empty before Alembic reads it
    try:
        conn = psycopg2.connect(sync_url)
        with conn.cursor() as cur:
            cur.execute("DELETE FROM _internal.alembic_version")
        conn.commit()
        conn.close()
        print("✓ Cleared alembic_version table")
    except Exception as e:
        print(f"⚠ Warning: Could not clear alembic_version: {e}")

    # Get path to alembic.ini
    # From: tests/fixtures/supabase_local.py
    # To:   apps/api/alembic.ini (2 levels up)
    api_root = Path(__file__).resolve().parents[2]
    alembic_ini_path = api_root / "alembic.ini"

    # Create Alembic config
    alembic_cfg = Config(str(alembic_ini_path))
    alembic_cfg.set_main_option("sqlalchemy.url", sync_url)

    # Apply all migrations from clean state
    try:
        # With empty alembic_version table, just upgrade to head
        # Alembic will apply all migrations from scratch
        command.upgrade(alembic_cfg, "head")
        print("✓ Applied Alembic migrations to test database")
    except Exception as e:
        msg = f"Failed to apply Alembic migrations: {e}"
        print(f"✗ {msg}")
        raise RuntimeError(msg) from e


@pytest.fixture(scope="session")
async def supabase_postgres_engine() -> AsyncGenerator[AsyncEngine, None]:
    """Async engine connected to local Supabase PostgreSQL database.

    Connects to the PostgreSQL instance running via `npx supabase start`
    on port 54322. This is the same database used by Supabase Auth,
    so RLS policies with auth.uid() will work correctly.

    Uses Alembic migrations for complete production parity:
    - All database schema changes from migrations
    - All RLS policies exactly as defined in migration files
    - Complete production database state

    Session-scoped to reuse connection across all tests.
    """
    # Local Supabase PostgreSQL connection string
    database_url = "postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres"

    engine = create_async_engine(
        database_url,
        echo=False,
        pool_pre_ping=True,
    )

    # Clean up database from previous test runs
    async with engine.begin() as conn:
        # Drop only application schemas (leave auth schema - owned by Supabase)
        # CASCADE ensures all tables, functions, and objects are removed
        await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        await conn.execute(text("DROP SCHEMA IF EXISTS _internal CASCADE"))

        # Recreate application schemas with fresh state
        await conn.execute(text("CREATE SCHEMA public"))
        await conn.execute(text("CREATE SCHEMA _internal"))  # For alembic_version

        await conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
        await conn.execute(text("GRANT ALL ON SCHEMA _internal TO postgres"))

        # Ensure alembic_version table exists for Alembic to use
        # (Cleared in apply_alembic_migrations_sync before stamping)
        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS _internal.alembic_version (
                version_num VARCHAR(32) NOT NULL,
                CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
            )
        """)
        )

        # Install required extensions
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

        # Grant postgres user ability to assume RLS roles
        # These roles are created by Supabase during initialization
        await conn.execute(text("GRANT authenticated TO postgres"))
        await conn.execute(text("GRANT anon TO postgres"))
        await conn.execute(text("GRANT service_role TO postgres"))

        # Note: auth.uid() and auth.role() functions already exist from Supabase
        # No need to create them here

    # Apply Alembic migrations for production parity
    # Run in thread pool executor to avoid event loop conflicts
    # (Alembic uses asyncio.run() which can't run in an active loop)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, apply_alembic_migrations_sync, database_url)

    yield engine

    await engine.dispose()


@pytest.fixture
async def supabase_postgres_session(
    supabase_postgres_engine: AsyncEngine,
) -> AsyncGenerator[AsyncSession, None]:
    """Per-test session for local Supabase PostgreSQL with transaction rollback.

    Creates a new session for each test and rolls back all changes after the test.
    This ensures test isolation while still allowing tests to use the same database
    as Supabase Auth.

    WARNING: This fixture does NOT work for RLS tests! RLS tests require data to be
    committed to the database so it's visible to other connections. Use
    supabase_postgres_integration_session instead.
    """
    async with supabase_postgres_engine.connect() as conn:
        # Start transaction
        transaction = await conn.begin()

        # Create session bound to this transaction
        session_factory = async_sessionmaker(
            bind=conn,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        session = session_factory()

        yield session

        # Rollback transaction (cleanup all test data)
        await session.close()
        await transaction.rollback()


@pytest.fixture
async def supabase_postgres_integration_session(
    supabase_postgres_engine: AsyncEngine,
) -> AsyncGenerator[AsyncSession, None]:
    """Per-test session for Supabase PostgreSQL WITHOUT transaction isolation.

    Unlike supabase_postgres_session, this fixture commits data directly to the database,
    making it visible to other database connections (required for RLS tests where
    authenticated sessions need to see committed data).

    Use this for RLS integration tests that make queries via authenticated_db_session,
    where the test needs to set up data that other connections can see.

    WARNING: Data is committed to the database and will persist until explicitly deleted.
    The fixture does NOT automatically clean up data - tests must handle cleanup manually
    or rely on database reset between test runs.

    Example:
        async def test_rls_policy(supabase_postgres_integration_session, create_test_user):
            user = await create_test_user(full_name="Test User")
            thread = Thread(owner_user_id=user.app_user_id, ...)
            supabase_postgres_integration_session.add(thread)
            await supabase_postgres_integration_session.commit()  # Commits to database!

            # RLS query via different connection can now see this thread
            async with authenticated_db_session(...) as session:
                result = await session.execute(select(Thread))
    """
    # Use engine directly (not connection) to get proper transaction handling
    session_factory = async_sessionmaker(
        supabase_postgres_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    session = session_factory()

    yield session

    await session.close()


# ============================================================================
# RLS-Aware Session Context and Test User Management
# ============================================================================


@dataclass
class TestUserContext:
    """Complete context for a test user with both auth and app database records.

    Provides all information needed for integration testing with real Supabase Auth.
    """

    auth_user_id: str  # GoTrue UUID (used by auth.uid())
    app_user_id: uuid.UUID  # App database user.id
    email: str
    password: str
    access_token: str  # Supabase JWT for API calls
    db_user: User  # SQLAlchemy User model instance

    @property
    def authorization_header(self) -> dict[str, str]:
        """Header dict for authenticated HTTP requests."""
        return {"Authorization": f"Bearer {self.access_token}"}


@asynccontextmanager
async def authenticated_db_session(
    engine: AsyncEngine,
    auth_user_id: str,
    role: str = "authenticated",
) -> AsyncGenerator[AsyncSession, None]:
    """Creates an async session with Supabase RLS context.

    This mimics what PostgREST does: setting request.jwt.claims before
    executing queries so auth.uid() returns the correct user ID.

    CRITICAL: You must set the PostgreSQL role BEFORE setting JWT claims.
    The auth.uid() function only works when both are set correctly.

    Args:
        engine: AsyncEngine instance
        auth_user_id: UUID string of the GoTrue user (maps to auth.uid())
        role: PostgreSQL role to assume (authenticated, anon, service_role)

    Usage:
        async with authenticated_db_session(engine, user_id) as session:
            threads = await session.execute(select(Thread))
            # RLS policies filter based on auth.uid()
    """
    async_session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session_factory() as session:
        transaction_failed = False
        try:
            # CRITICAL: Set the PostgreSQL role FIRST (must be done before JWT claims)
            await session.execute(text(f"SET LOCAL ROLE {role}"))

            # Set JWT claims as JSON (how auth.jwt() reads them)
            claims = json.dumps({
                "sub": auth_user_id,
                "role": role,
                "aud": "authenticated",
                "iss": "supabase",
                "iat": 1704067200,  # Unix timestamp
                "exp": 1704153600,
            })

            # Set claims via set_config (transaction-local scope = true)
            await session.execute(
                text("SELECT set_config('request.jwt.claims', :claims, true)"), {"claims": claims}
            )

            # Also set individual claim for auth.uid() compatibility
            await session.execute(
                text("SELECT set_config('request.jwt.claim.sub', :sub, true)"),
                {"sub": auth_user_id},
            )

            # Verify auth.uid() is set correctly
            result = await session.execute(text("SELECT auth.uid()"))
            actual_uid = result.scalar()
            if str(actual_uid) != auth_user_id:
                raise RuntimeError(
                    f"RLS context setup failed: auth.uid() returned {actual_uid}, "
                    f"expected {auth_user_id}"
                )

            yield session

        except Exception as e:
            transaction_failed = True
            print(f"ERROR in authenticated_db_session: {e}")
            raise
        finally:
            # Only try to reset role if transaction didn't fail
            if not transaction_failed:
                # Ignore errors during cleanup
                with suppress(Exception):
                    await session.execute(text("RESET ROLE"))


@pytest.fixture
async def create_test_user(
    local_supabase_admin_client: Client,
    local_supabase_client: Client,
    supabase_postgres_integration_session: AsyncSession,
) -> AsyncGenerator[Callable[..., TestUserContext], None]:
    """Factory fixture for creating fully-linked test users.

    Creates:
    1. GoTrue auth user (with email auto-confirmed)
    2. App database user linked via auth_user_id in Supabase PostgreSQL
    3. Valid JWT access token for API calls

    Automatically cleans up all created users after test.

    IMPORTANT: Uses supabase_postgres_integration_session (commits data) to ensure
    users are visible to other database connections, which is required for RLS testing.

    Usage:
        async def test_something(create_test_user):
            user_a = await create_test_user(full_name="User A")
            user_b = await create_test_user(full_name="User B")
            # Both users are now fully created and linked
    """
    created_users: list[TestUserContext] = []

    async def factory(
        email: str | None = None,
        password: str = "test-password-123!",  # noqa: S107
        full_name: str | None = None,
        role: str = "member",
        **extra_attrs,
    ) -> TestUserContext:
        # Generate unique email if not provided
        test_email = email or f"test-{uuid.uuid4()}@example.com"

        # Step 1: Create GoTrue auth user via admin API
        auth_response = local_supabase_admin_client.auth.admin.create_user({
            "email": test_email,
            "password": password,
            "email_confirm": True,  # Skip email verification for tests
            "user_metadata": {"full_name": full_name} if full_name else {},
        })
        auth_user = auth_response.user

        # Step 2: Create app database user linked by auth_user_id
        # CRITICAL: Must use supabase_postgres_integration_session (commits data)
        app_user = User(
            auth_user_id=uuid.UUID(auth_user.id),
            email=test_email,
            full_name=full_name,
            role=role,
            is_active=True,
            **extra_attrs,
        )
        supabase_postgres_integration_session.add(app_user)
        await supabase_postgres_integration_session.flush()
        await (
            supabase_postgres_integration_session.commit()
        )  # Commit to make visible to other connections
        await supabase_postgres_integration_session.refresh(app_user)

        # Step 3: Sign in to get valid JWT token
        session_response = local_supabase_client.auth.sign_in_with_password({
            "email": test_email,
            "password": password,
        })

        context = TestUserContext(
            auth_user_id=auth_user.id,
            app_user_id=app_user.id,
            email=test_email,
            password=password,
            access_token=session_response.session.access_token,
            db_user=app_user,
        )
        created_users.append(context)
        return context

    yield factory

    # Cleanup: Delete all created users in reverse order
    for user_ctx in reversed(created_users):
        try:
            # Delete GoTrue user
            local_supabase_admin_client.auth.admin.delete_user(user_ctx.auth_user_id)
            # Delete app database user (use parameterized query for safety)
            await supabase_postgres_integration_session.execute(
                text("DELETE FROM users WHERE auth_user_id = :auth_user_id"),
                {"auth_user_id": user_ctx.auth_user_id},
            )
            await supabase_postgres_integration_session.commit()
        except Exception as e:
            print(f"Warning: Failed to delete user {user_ctx.auth_user_id}: {e}")
