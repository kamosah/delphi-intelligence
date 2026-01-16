"""
Tests for Row Level Security policies.

Verifies that users can only access their own personal threads using real
Supabase Auth context and PostgreSQL RLS policies.
"""

import uuid

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.models.thread import Thread
from tests.factories import create_user
from tests.fixtures.postgres import authenticated_db_session


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
        user_a = await create_user(
            postgres_integration_session, email="user_a@test.com", full_name="Test User A"
        )
        user_b = await create_user(
            postgres_integration_session, email="user_b@test.com", full_name="Test User B"
        )
        await postgres_integration_session.commit()

        async with authenticated_db_session(postgres_engine, user_a.auth_user_id) as session:
            result = await session.execute(text("SELECT auth.uid()"))
            uid = result.scalar()
            assert uid == user_a.auth_user_id

        async with authenticated_db_session(postgres_engine, user_b.auth_user_id) as session:
            result = await session.execute(text("SELECT auth.uid()"))
            uid = result.scalar()
            assert uid == user_b.auth_user_id

    async def test_user_can_read_own_personal_threads(
        self,
        postgres_engine: AsyncEngine,
        postgres_integration_session: AsyncSession,
    ):
        """User should be able to read their own personal threads."""
        user_a = await create_user(
            postgres_integration_session, email="user_a_personal@test.com", full_name="Test User A"
        )
        await postgres_integration_session.commit()

        # Create thread using postgres_integration_session (no RLS for test setup)
        thread_id = uuid.uuid4()
        thread = Thread(
            id=thread_id,
            title="User A's Personal Thread",
            query_text="Test query for user A",
            visibility="personal",
            owner_user_id=user_a.id,
        )
        postgres_integration_session.add(thread)
        await postgres_integration_session.flush()
        await postgres_integration_session.commit()  # Commit so authenticated session can see it

        # Query as User A (with RLS context)
        async with authenticated_db_session(postgres_engine, user_a.auth_user_id) as user_session:
            result = await user_session.execute(select(Thread).where(Thread.id == thread_id))
            threads = result.scalars().all()

            assert len(threads) == 1
            assert threads[0].id == thread_id
            assert threads[0].title == "User A's Personal Thread"

    async def test_user_cannot_read_other_users_personal_threads(
        self,
        postgres_engine: AsyncEngine,
        postgres_integration_session: AsyncSession,
    ):
        """User B should NOT be able to see User A's personal threads."""
        user_a = await create_user(
            postgres_integration_session, email="user_a_secret@test.com", full_name="Test User A"
        )
        user_b = await create_user(
            postgres_integration_session, email="user_b_secret@test.com", full_name="Test User B"
        )
        await postgres_integration_session.commit()

        # Create User A's personal thread (admin context)
        thread_a = Thread(
            id=uuid.uuid4(),
            title="User A's Secret Thread",
            query_text="Secret query from user A",
            visibility="personal",
            owner_user_id=user_a.id,
        )
        postgres_integration_session.add(thread_a)
        await postgres_integration_session.flush()
        await postgres_integration_session.commit()  # Commit so authenticated session can see it

        # Query as User B - should see nothing
        async with authenticated_db_session(postgres_engine, user_b.auth_user_id) as user_b_session:
            result = await user_b_session.execute(select(Thread).where(Thread.id == thread_a.id))
            threads = result.scalars().all()

            # RLS should filter out User A's thread
            assert len(threads) == 0

    async def test_rls_with_multiple_threads_mixed_visibility(
        self,
        postgres_engine: AsyncEngine,
        postgres_integration_session: AsyncSession,
    ):
        """Test RLS correctly filters across multiple threads with different visibility."""
        user_a = await create_user(
            postgres_integration_session, email="user_a_mixed@test.com", full_name="Test User A"
        )
        user_b = await create_user(
            postgres_integration_session, email="user_b_mixed@test.com", full_name="Test User B"
        )
        await postgres_integration_session.commit()

        # Create mixed threads using postgres_integration_session (no RLS for test setup)
        threads_data = [
            # User A's threads
            {
                "owner": user_a,
                "visibility": "personal",
                "title": "A-Personal",
                "query": "A personal query",
            },
            {
                "owner": user_a,
                "visibility": "organization",
                "title": "A-Org",
                "query": "A org query",
            },
            # User B's threads
            {
                "owner": user_b,
                "visibility": "personal",
                "title": "B-Personal",
                "query": "B personal query",
            },
            {
                "owner": user_b,
                "visibility": "organization",
                "title": "B-Org",
                "query": "B org query",
            },
        ]

        for data in threads_data:
            thread = Thread(
                id=uuid.uuid4(),
                title=data["title"],
                query_text=data["query"],
                visibility=data["visibility"],
                owner_user_id=data["owner"].id,
            )
            postgres_integration_session.add(thread)
        await postgres_integration_session.flush()
        await postgres_integration_session.commit()  # Commit so authenticated session can see it

        # Query as User A - should see own personal + possibly org threads
        async with authenticated_db_session(postgres_engine, user_a.auth_user_id) as session:
            result = await session.execute(select(Thread).where(Thread.visibility == "personal"))
            personal_threads = result.scalars().all()

            # Should only see User A's personal thread
            assert len(personal_threads) == 1
            assert personal_threads[0].title == "A-Personal"

            # Verify we cannot see User B's personal thread
            thread_titles = [t.title for t in personal_threads]
            assert "B-Personal" not in thread_titles
