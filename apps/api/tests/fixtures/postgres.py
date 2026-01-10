"""PostgreSQL fixtures for integration testing.

This module provides PostgreSQL-based fixtures for integration tests,
following the principles in TESTING.md:
- Tests actual database operations (not mocks)
- Per-test transaction rollback for isolation
- Full production parity via Alembic migrations (includes RLS policies)
- Parallel-safe with unique_test_id fixture
"""

import asyncio
import os
from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Protocol
from uuid import uuid4

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
from testcontainers.postgres import PostgresContainer


def _is_ci_environment() -> bool:
    """Check if running in CI environment (GitHub Actions)."""
    return os.getenv("CI") == "true" or os.getenv("GITHUB_ACTIONS") == "true"


class PostgresContainerProtocol(Protocol):
    """Protocol for PostgreSQL container abstraction."""

    def get_connection_url(self) -> str:
        """Get PostgreSQL connection URL."""
        ...


@pytest.fixture(scope="session")
def postgres_container() -> PostgresContainerProtocol:
    """Start PostgreSQL container for entire test session.

    Uses pgvector/pgvector:pg16 image for vector search support.
    Container is session-scoped to minimize startup overhead.

    Environment Detection:
    - **CI (GitHub Actions)**: Returns mock container pointing to service container
    - **Local Development**: Starts real testcontainer (requires Docker on host)

    Note: Run tests with `poetry run pytest` locally (not `docker compose exec api pytest`)
    """
    if _is_ci_environment():
        # CI: Use GitHub Actions service container
        # Mock container with connection details from environment
        class MockContainer:
            def get_connection_url(self) -> str:
                # CI service container connection
                # Must use psycopg2 format so postgres_engine can convert to asyncpg
                return "postgresql+psycopg2://test:test@localhost:5432/olympus_test"

        # Yield to match local behavior (even though no cleanup needed)
        yield MockContainer()
    else:
        # Local: Start testcontainer
        container = PostgresContainer(
            image="pgvector/pgvector:pg16",
            username="test",
            password="test",
            dbname="olympus_test",
        )
        container.start()
        yield container
        container.stop()


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
    # From: tests/fixtures/postgres.py
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


async def setup_database_schema(engine: AsyncEngine, database_url: str) -> None:
    """Create database schema using Alembic migrations.

    Applies all Alembic migrations to provide full production parity,
    including RLS policies and other migration-specific logic.

    Args:
        engine: Async SQLAlchemy engine connected to test database
        database_url: Database URL for Alembic migrations

    Raises:
        RuntimeError: If schema creation or migration application fails
    """
    async with engine.begin() as conn:
        # Drop all schemas to ensure clean state for migrations
        # CASCADE ensures all tables, functions, and objects are removed
        await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        await conn.execute(text("DROP SCHEMA IF EXISTS _internal CASCADE"))
        await conn.execute(text("DROP SCHEMA IF EXISTS auth CASCADE"))

        # Recreate schemas with fresh state
        await conn.execute(text("CREATE SCHEMA public"))
        await conn.execute(text("CREATE SCHEMA _internal"))
        await conn.execute(text("CREATE SCHEMA auth"))

        # Grant privileges on schemas
        await conn.execute(text("GRANT ALL ON SCHEMA public TO test"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
        await conn.execute(text("GRANT ALL ON SCHEMA _internal TO test"))
        await conn.execute(text("GRANT ALL ON SCHEMA auth TO test"))

        # Install pgvector extension (required for document_chunks.embedding column)
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

        # Create PostgreSQL roles used by Supabase RLS
        # These roles are required for SET ROLE commands in RLS tests
        # Use DO blocks for idempotency (PostgreSQL doesn't support CREATE ROLE IF NOT EXISTS)
        await conn.execute(
            text("""
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
        """)
        )

        # Grant privileges to test user to assume these roles
        await conn.execute(text("GRANT authenticated TO test"))
        await conn.execute(text("GRANT anon TO test"))
        await conn.execute(text("GRANT service_role TO test"))

        # Create auth.uid() function for RLS testing
        # This function is required by RLS policies that use auth.uid()
        await conn.execute(
            text("""
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
        """)
        )

        # Ensure alembic_version table exists for Alembic to use
        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS _internal.alembic_version (
                version_num VARCHAR(32) NOT NULL,
                CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
            )
        """)
        )

    # Apply Alembic migrations for production parity
    # Run in thread pool executor to avoid event loop conflicts
    # (Alembic uses asyncio.run() which can't run in an active loop)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, apply_alembic_migrations_sync, database_url)


@pytest.fixture(scope="session")
async def postgres_engine(
    postgres_container: PostgresContainerProtocol,
) -> AsyncGenerator[AsyncEngine, None]:
    """Create async engine for PostgreSQL container.

    Converts psycopg2 URL from testcontainers to asyncpg for SQLAlchemy async support.
    Creates database schema using Alembic migrations for full production parity.
    """
    db_url = postgres_container.get_connection_url()
    # Convert psycopg2 URL to asyncpg
    async_url = db_url.replace("psycopg2", "asyncpg")

    # Create engine
    engine = create_async_engine(async_url, echo=False)

    # Create database schema with Alembic migrations
    await setup_database_schema(engine, async_url)

    yield engine

    await engine.dispose()


@pytest.fixture
async def postgres_session(
    postgres_engine: AsyncEngine,
) -> AsyncGenerator[AsyncSession, None]:
    """Per-test transaction that auto-rolls back.

    Each test gets a fresh database state through transaction isolation.
    The transaction is rolled back after the test, ensuring no data pollution.

    This fixture provides:
    - Transaction-level isolation (changes don't persist across tests)
    - Full database schema via Alembic migrations (includes RLS policies)
    - Automatic cleanup via rollback
    - Parallel-safe execution (unique data via unique_test_id)
    """
    async with postgres_engine.connect() as conn, conn.begin() as trans:
        session_factory = async_sessionmaker(bind=conn, class_=AsyncSession, expire_on_commit=False)
        session = session_factory()

        yield session

        await trans.rollback()


@pytest.fixture
async def postgres_integration_session(
    postgres_engine: AsyncEngine,
) -> AsyncGenerator[AsyncSession, None]:
    """Per-test session WITHOUT transaction isolation (for integration tests).

    Unlike postgres_session, this fixture commits data directly to the database,
    making it visible to other database connections (e.g., FastAPI middleware).

    Use this for integration tests that make real HTTP requests via async_client,
    where the test needs to set up data that the application's database session can see.

    WARNING: Data is committed to the database and must be manually cleaned up.
    Tests using this fixture should delete created data in a finally block.

    Example:
        async def test_api_endpoint(async_client, postgres_integration_session):
            user = await create_user(postgres_integration_session, email="test@example.com")
            await postgres_integration_session.commit()  # Commits to database!

            # HTTP request via async_client can now see this user
            response = await async_client.get("/api/users/me")
            assert response.status_code == 200

            # Cleanup
            await postgres_integration_session.delete(user)
            await postgres_integration_session.commit()
    """
    async with postgres_engine.connect() as conn:
        # NO transaction - commits go directly to database
        session_factory = async_sessionmaker(bind=conn, class_=AsyncSession, expire_on_commit=False)
        session = session_factory()

        yield session

        await session.close()


@pytest.fixture
def unique_test_id(worker_id: str) -> str:
    """Generate unique ID for this test (parallel-safe).

    When running tests in parallel with pytest-xdist, this fixture ensures
    each test gets unique identifiers to prevent data conflicts.

    Args:
        worker_id: pytest-xdist worker ID (e.g., "gw0", "gw1", "master")

    Returns:
        Unique ID in format: "{worker_id}_{random_hex}"

    Usage:
        async def test_example(postgres_session, unique_test_id):
            user = await create_user(
                postgres_session,
                email=f"user-{unique_test_id}@test.com"
            )
    """
    return f"{worker_id}_{uuid4().hex[:8]}"
