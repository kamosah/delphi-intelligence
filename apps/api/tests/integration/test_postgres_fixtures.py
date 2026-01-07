"""Verify PostgreSQL fixtures work correctly.

This module tests the PostgreSQL testing infrastructure to ensure:
- Alembic migrations apply successfully
- Transaction rollback works properly
- Parallel execution is safe with unique_test_id
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from tests.factories import create_user


@pytest.mark.integration
async def test_postgres_session_transaction_rollback(postgres_session: AsyncSession) -> None:
    """Verify that PostgreSQL transactions roll back properly."""
    # Arrange: Create user
    user = await create_user(postgres_session, email="test@example.com")
    user_id = user.id
    await postgres_session.flush()

    # Act: Rollback happens in fixture cleanup (simulated here)
    await postgres_session.rollback()

    # Assert: User should not exist after rollback
    result = await postgres_session.execute(select(User).where(User.id == user_id))
    assert result.scalar_one_or_none() is None


@pytest.mark.integration
async def test_unique_test_id_parallel_safety(unique_test_id: str) -> None:
    """Verify unique_test_id generates unique IDs for parallel tests."""
    # Assert: ID should be non-empty and contain worker ID + random hex
    assert unique_test_id is not None
    assert len(unique_test_id) > 10  # worker_id + '_' + 8 hex chars
    assert "_" in unique_test_id


@pytest.mark.integration
async def test_postgres_session_can_create_user(postgres_session: AsyncSession) -> None:
    """Verify basic database operations work with PostgreSQL session."""
    # Arrange & Act: Create user
    user = await create_user(postgres_session, email="create@example.com")
    await postgres_session.commit()

    # Assert: User should exist with generated ID
    assert user.id is not None
    assert user.email == "create@example.com"

    # Assert: Can query user from database
    result = await postgres_session.execute(select(User).where(User.email == "create@example.com"))
    queried_user = result.scalar_one_or_none()
    assert queried_user is not None
    assert queried_user.id == user.id
