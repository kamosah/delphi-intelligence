"""
PostgreSQL Test Database Setup with Docker

This module provides utilities for setting up a PostgreSQL test database
using Docker containers for integration testing.
"""

from collections.abc import AsyncGenerator
import subprocess
import time

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base


def is_docker_running() -> bool:
    """Check if Docker is running."""
    try:
        subprocess.run(["docker", "info"], check=True, capture_output=True, text=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def start_test_postgres() -> str:
    """Start a PostgreSQL container for testing."""
    container_name = "olympus-test-db"
    db_name = "olympus_test"
    db_user = "test_user"
    db_password = "test_password"
    db_port = "5433"  # Different from default to avoid conflicts

    # Stop and remove existing container if it exists
    subprocess.run(["docker", "stop", container_name], capture_output=True, check=False)
    subprocess.run(["docker", "rm", container_name], capture_output=True, check=False)

    # Start new PostgreSQL container
    cmd = [
        "docker",
        "run",
        "-d",
        "--name",
        container_name,
        "-e",
        f"POSTGRES_DB={db_name}",
        "-e",
        f"POSTGRES_USER={db_user}",
        "-e",
        f"POSTGRES_PASSWORD={db_password}",
        "-p",
        f"{db_port}:5432",
        "postgres:15-alpine",
    ]

    subprocess.run(cmd, check=True)

    # Wait for PostgreSQL to be ready
    max_attempts = 30
    for attempt in range(max_attempts):
        try:
            subprocess.run(
                ["docker", "exec", container_name, "pg_isready", "-U", db_user, "-d", db_name],
                check=True,
                capture_output=True,
            )
            break
        except subprocess.CalledProcessError:
            if attempt == max_attempts - 1:
                raise RuntimeError("PostgreSQL container failed to start")
            time.sleep(1)

    return f"postgresql+asyncpg://{db_user}:{db_password}@localhost:{db_port}/{db_name}"


def stop_test_postgres():
    """Stop and remove the test PostgreSQL container."""
    container_name = "olympus-test-db"
    subprocess.run(["docker", "stop", container_name], capture_output=True, check=False)
    subprocess.run(["docker", "rm", container_name], capture_output=True, check=False)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    import asyncio

    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def test_database_url():
    """Provide test database URL, starting container if needed."""
    if not is_docker_running():
        pytest.skip("Docker is not running")

    database_url = start_test_postgres()
    yield database_url
    stop_test_postgres()


@pytest.fixture(scope="session")
async def test_engine(test_database_url):
    """Create test database engine."""
    engine = create_async_engine(
        test_database_url,
        echo=True,  # Set to False to reduce test output
        pool_pre_ping=True,
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture()
async def test_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session with automatic cleanup."""
    async_session_maker = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session_maker() as session:
        # Start a transaction
        await session.begin()

        try:
            yield session
        finally:
            # Rollback the transaction to clean up
            await session.rollback()


@pytest.fixture()
async def test_session_commit(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test session that commits changes (for integration tests)."""
    async_session_maker = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session_maker() as session:
        yield session

        # Clean up all data after test
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(f"TRUNCATE TABLE {table.name} CASCADE")
        await session.commit()
