"""PostgreSQL fixtures for integration testing.

This module provides PostgreSQL-based fixtures for integration tests,
following the principles in TESTING.md:
- Tests actual database operations (not mocks)
- Per-test transaction rollback for isolation
- Alembic migration support for production parity
- Parallel-safe with unique_test_id fixture
"""

from collections.abc import AsyncGenerator
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from testcontainers.postgres import PostgresContainer


@pytest.fixture(scope="session")
def postgres_container() -> PostgresContainer:
    """Start PostgreSQL container for entire test session.

    Uses pgvector/pgvector:pg16 image for vector search support.
    Container is session-scoped to minimize startup overhead.
    """
    container = PostgresContainer(
        image="pgvector/pgvector:pg16",
        username="test",
        password="test",
        dbname="olympus_test",
    )
    container.start()
    yield container
    container.stop()


def apply_migrations(db_url: str) -> None:
    """Apply Alembic migrations to test database.

    This ensures production parity - tests use the same database schema
    as production, created via Alembic migrations rather than create_all().

    Args:
        db_url: Database URL (must be synchronous, not async)
    """
    alembic_cfg = Config("alembic.ini")
    # Convert asyncpg URL to psycopg2 for Alembic (synchronous driver)
    sync_url = db_url.replace("+asyncpg", "")
    alembic_cfg.set_main_option("sqlalchemy.url", sync_url)
    command.upgrade(alembic_cfg, "head")


@pytest.fixture(scope="session")
async def postgres_engine(
    postgres_container: PostgresContainer,
) -> AsyncGenerator[AsyncEngine, None]:
    """Create async engine for PostgreSQL container.

    Converts psycopg2 URL from testcontainers to asyncpg for SQLAlchemy async support.
    Applies Alembic migrations for production parity.
    """
    db_url = postgres_container.get_connection_url()
    # Convert psycopg2 URL to asyncpg
    async_url = db_url.replace("psycopg2", "asyncpg")

    # Apply migrations BEFORE creating engine (synchronous operation)
    apply_migrations(db_url)

    engine = create_async_engine(async_url, echo=False)

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
    - Full database schema via Alembic migrations
    - Automatic cleanup via rollback
    - Parallel-safe execution (unique data via unique_test_id)
    """
    async with postgres_engine.connect() as conn, conn.begin() as trans:
        session_factory = async_sessionmaker(bind=conn, class_=AsyncSession, expire_on_commit=False)
        session = session_factory()

        yield session

        await trans.rollback()


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
