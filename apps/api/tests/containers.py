"""PostgreSQL Testcontainer management for integration tests."""

from collections.abc import AsyncGenerator

import pytest
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from testcontainers.postgres import PostgresContainer

from app.models.base import Base


@pytest.fixture(scope="session")
def postgres_container() -> PostgresContainer:
    """Start PostgreSQL container for entire test session.

    Uses pgvector/pgvector:pg16 image for vector search support.
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


@pytest.fixture(scope="session")
async def postgres_engine(
    postgres_container: PostgresContainer,
) -> AsyncGenerator[AsyncEngine, None]:
    """Create async engine for PostgreSQL container.

    Converts psycopg2 URL from testcontainers to asyncpg for SQLAlchemy async support.
    """
    db_url = postgres_container.get_connection_url()
    # Convert psycopg2 URL to asyncpg
    async_url = db_url.replace("psycopg2", "asyncpg")

    engine = create_async_engine(async_url, echo=False)

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    await engine.dispose()


@pytest.fixture
async def postgres_session(
    postgres_engine: AsyncEngine,
) -> AsyncGenerator[AsyncSession, None]:
    """Per-test transaction that auto-rolls back.

    Each test gets a fresh database state through transaction isolation.
    The transaction is rolled back after the test, ensuring no data pollution.
    """
    async with postgres_engine.connect() as conn, conn.begin() as trans:
        session_factory = async_sessionmaker(bind=conn, class_=AsyncSession, expire_on_commit=False)
        session = session_factory()

        yield session

        await trans.rollback()
