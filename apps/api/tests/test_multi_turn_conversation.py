"""
Unit tests for multi-turn conversation functionality.

Tests conversation history retrieval, thread persistence, message ordering,
and multi-turn conversation patterns using real database operations.

Following TESTING.md principles:
- Uses real in-memory SQLite database (not mocks)
- Uses factory functions from tests/factories.py
- Tests actual database operations and business logic
- Follows AAA pattern (Arrange-Act-Assert)
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import Message, MessageRole
from app.models.thread import Thread, ThreadStatus
from tests.factories import (
    create_message,
    create_thread,
    create_thread_with_messages,
    create_user_with_org,
)


@pytest.mark.asyncio()
class TestConversationHistory:
    """Tests for conversation history retrieval and ordering."""

    async def test_messages_ordered_by_creation(self, db_session: AsyncSession) -> None:
        """Test that messages are retrieved in chronological order."""
        # Arrange: Create thread with multiple message exchanges
        user, org, _ = await create_user_with_org(db_session)
        thread, _messages = await create_thread_with_messages(
            db_session,
            query_text="What is AI?",
            organization=org,
            creator=user,
            num_exchanges=3,  # 3 user/assistant pairs = 6 messages
        )

        # Act: Retrieve messages from database
        result = await db_session.execute(
            select(Message).where(Message.thread_id == thread.id).order_by(Message.created_at)
        )
        retrieved_messages = result.scalars().all()

        # Assert: Messages are in correct order
        assert len(retrieved_messages) == 6
        assert retrieved_messages[0].message_role == MessageRole.USER
        assert retrieved_messages[1].message_role == MessageRole.ASSISTANT
        assert retrieved_messages[2].message_role == MessageRole.USER
        assert retrieved_messages[3].message_role == MessageRole.ASSISTANT
        assert retrieved_messages[4].message_role == MessageRole.USER
        assert retrieved_messages[5].message_role == MessageRole.ASSISTANT

    async def test_conversation_history_retrieval(self, db_session: AsyncSession) -> None:
        """Test retrieving full conversation history from thread."""
        # Arrange: Create thread with conversation history
        user, org, _ = await create_user_with_org(db_session)
        thread = await create_thread(
            db_session,
            query_text="Tell me about AI",
            organization=org,
            creator=user,
        )

        # Add conversation history
        await create_message(db_session, thread, "What is AI?", role=MessageRole.USER)
        await create_message(
            db_session,
            thread,
            "AI is artificial intelligence.",
            role=MessageRole.ASSISTANT,
        )
        await create_message(db_session, thread, "Tell me more about it.", role=MessageRole.USER)
        await create_message(
            db_session,
            thread,
            "AI has many applications in healthcare, finance, and more.",
            role=MessageRole.ASSISTANT,
        )
        await db_session.commit()

        # Act: Retrieve conversation history
        result = await db_session.execute(
            select(Message).where(Message.thread_id == thread.id).order_by(Message.created_at)
        )
        history = result.scalars().all()

        # Assert: Full conversation history retrieved
        assert len(history) == 4
        assert history[0].content == "What is AI?"
        assert history[1].content == "AI is artificial intelligence."
        assert history[2].content == "Tell me more about it."
        assert history[3].content == "AI has many applications in healthcare, finance, and more."

    async def test_empty_conversation_history_new_thread(self, db_session: AsyncSession) -> None:
        """Test that new threads have no message history."""
        # Arrange: Create new thread without messages
        user, org, _ = await create_user_with_org(db_session)
        thread = await create_thread(
            db_session,
            query_text="What is AI?",
            organization=org,
            creator=user,
        )
        await db_session.commit()

        # Act: Try to retrieve messages
        result = await db_session.execute(select(Message).where(Message.thread_id == thread.id))
        messages = result.scalars().all()

        # Assert: No messages exist yet
        assert len(messages) == 0
        assert thread.query_text == "What is AI?"
        assert thread.status == ThreadStatus.PENDING


@pytest.mark.asyncio()
class TestThreadContinuation:
    """Tests for continuing existing threads with new messages."""

    async def test_add_message_to_existing_thread(self, db_session: AsyncSession) -> None:
        """Test adding a new message to an existing thread."""
        # Arrange: Create thread with initial exchange
        user, org, _ = await create_user_with_org(db_session)
        thread, _initial_messages = await create_thread_with_messages(
            db_session,
            query_text="What is AI?",
            organization=org,
            creator=user,
            num_exchanges=1,
        )

        # Act: Add follow-up message
        await create_message(db_session, thread, "Tell me more details.", role=MessageRole.USER)
        await create_message(
            db_session,
            thread,
            "AI involves machine learning, neural networks, and more.",
            role=MessageRole.ASSISTANT,
        )
        await db_session.commit()

        # Assert: Thread now has 4 messages (2 initial + 2 new)
        result = await db_session.execute(select(Message).where(Message.thread_id == thread.id))
        all_messages = result.scalars().all()
        assert len(all_messages) == 4
        assert all_messages[-2].content == "Tell me more details."
        assert (
            all_messages[-1].content == "AI involves machine learning, neural networks, and more."
        )

    async def test_thread_belongs_to_creator(self, db_session: AsyncSession) -> None:
        """Test that threads are correctly associated with their creators."""
        # Arrange: Create thread
        user, org, _ = await create_user_with_org(db_session, user_email="creator@test.com")
        thread = await create_thread(
            db_session,
            query_text="Test query",
            organization=org,
            creator=user,
        )
        await db_session.commit()

        # Act: Retrieve thread and check ownership
        result = await db_session.execute(select(Thread).where(Thread.id == thread.id))
        retrieved_thread = result.scalar_one()

        # Assert: Thread belongs to correct user
        assert retrieved_thread.created_by == user.id
        assert retrieved_thread.owner_user_id == user.id
        assert retrieved_thread.organization_id == org.id

    async def test_multiple_users_separate_threads(self, db_session: AsyncSession) -> None:
        """Test that different users have separate threads."""
        # Arrange: Create two users with threads
        user1, org1, _ = await create_user_with_org(
            db_session, user_email="user1@test.com", org_name="Org1"
        )
        user2, org2, _ = await create_user_with_org(
            db_session, user_email="user2@test.com", org_name="Org2"
        )

        thread1 = await create_thread(
            db_session, query_text="User 1 query", organization=org1, creator=user1
        )
        thread2 = await create_thread(
            db_session, query_text="User 2 query", organization=org2, creator=user2
        )
        await db_session.commit()

        # Act: Query threads for each user
        user1_threads = await db_session.execute(
            select(Thread).where(Thread.created_by == user1.id)
        )
        user2_threads = await db_session.execute(
            select(Thread).where(Thread.created_by == user2.id)
        )

        # Assert: Users have separate threads
        assert len(user1_threads.scalars().all()) == 1
        assert len(user2_threads.scalars().all()) == 1
        assert thread1.created_by != thread2.created_by


@pytest.mark.asyncio()
class TestMessageCreation:
    """Tests for message creation and persistence."""

    async def test_create_user_message(self, db_session: AsyncSession) -> None:
        """Test creating a user message."""
        # Arrange: Create thread
        user, org, _ = await create_user_with_org(db_session)
        thread = await create_thread(
            db_session, query_text="What is AI?", organization=org, creator=user
        )

        # Act: Create user message
        message = await create_message(db_session, thread, "What is AI?", role=MessageRole.USER)
        await db_session.commit()

        # Assert: Message created correctly
        assert message.id is not None
        assert message.thread_id == thread.id
        assert message.message_role == MessageRole.USER
        assert message.content == "What is AI?"
        assert message.created_at is not None

    async def test_create_assistant_message(self, db_session: AsyncSession) -> None:
        """Test creating an assistant message with metadata."""
        # Arrange: Create thread
        user, org, _ = await create_user_with_org(db_session)
        thread = await create_thread(
            db_session, query_text="What is AI?", organization=org, creator=user
        )

        # Act: Create assistant message with metadata
        message = await create_message(
            db_session,
            thread,
            "AI is artificial intelligence.",
            role=MessageRole.ASSISTANT,
            message_metadata={"confidence_score": 0.95, "model": "gpt-4"},
        )
        await db_session.commit()

        # Assert: Message and metadata created correctly
        assert message.message_role == MessageRole.ASSISTANT
        assert message.content == "AI is artificial intelligence."
        assert message.message_metadata["confidence_score"] == 0.95
        assert message.message_metadata["model"] == "gpt-4"

    async def test_message_exchange_pattern(self, db_session: AsyncSession) -> None:
        """Test typical user/assistant message exchange pattern."""
        # Arrange: Create thread
        user, org, _ = await create_user_with_org(db_session)
        thread = await create_thread(
            db_session, query_text="Tell me about AI", organization=org, creator=user
        )

        # Act: Create message exchange
        user_msg = await create_message(
            db_session, thread, "What is machine learning?", role=MessageRole.USER
        )
        assistant_msg = await create_message(
            db_session,
            thread,
            "Machine learning is a subset of AI...",
            role=MessageRole.ASSISTANT,
        )
        await db_session.commit()

        # Assert: Exchange follows correct pattern
        assert user_msg.message_role == MessageRole.USER
        assert assistant_msg.message_role == MessageRole.ASSISTANT
        # Messages may have same timestamp if created quickly (second-level precision)
        assert user_msg.created_at <= assistant_msg.created_at
        assert user_msg.thread_id == assistant_msg.thread_id


@pytest.mark.asyncio()
class TestMultiTurnScenarios:
    """Tests for complex multi-turn conversation scenarios."""

    async def test_long_conversation_thread(self, db_session: AsyncSession) -> None:
        """Test handling a long multi-turn conversation."""
        # Arrange: Create thread with many exchanges
        user, org, _ = await create_user_with_org(db_session)
        thread, _messages = await create_thread_with_messages(
            db_session,
            query_text="Tell me about AI",
            organization=org,
            creator=user,
            num_exchanges=10,  # 10 exchanges = 20 messages
        )

        # Act: Retrieve all messages
        result = await db_session.execute(
            select(Message).where(Message.thread_id == thread.id).order_by(Message.created_at)
        )
        all_messages = result.scalars().all()

        # Assert: All messages persisted correctly
        assert len(all_messages) == 20
        # Verify alternating pattern
        for i, msg in enumerate(all_messages):
            expected_role = MessageRole.USER if i % 2 == 0 else MessageRole.ASSISTANT
            assert msg.message_role == expected_role

    async def test_thread_with_system_messages(self, db_session: AsyncSession) -> None:
        """Test thread with system, user, and assistant messages."""
        # Arrange: Create thread
        user, org, _ = await create_user_with_org(db_session)
        thread = await create_thread(db_session, query_text="Query", organization=org, creator=user)

        # Act: Add mixed message types
        await create_message(
            db_session,
            thread,
            "You are a helpful AI assistant.",
            role=MessageRole.SYSTEM,
        )
        await create_message(db_session, thread, "What is AI?", role=MessageRole.USER)
        await create_message(
            db_session,
            thread,
            "AI is artificial intelligence.",
            role=MessageRole.ASSISTANT,
        )
        await db_session.commit()

        # Assert: All message types persisted
        result = await db_session.execute(
            select(Message).where(Message.thread_id == thread.id).order_by(Message.created_at)
        )
        messages = result.scalars().all()
        assert len(messages) == 3
        assert messages[0].message_role == MessageRole.SYSTEM
        assert messages[1].message_role == MessageRole.USER
        assert messages[2].message_role == MessageRole.ASSISTANT

    async def test_concurrent_threads_same_user(self, db_session: AsyncSession) -> None:
        """Test user can have multiple active threads concurrently."""
        # Arrange: Create user with multiple threads
        user, org, _ = await create_user_with_org(db_session)
        thread1 = await create_thread(
            db_session, query_text="Topic 1", organization=org, creator=user
        )
        thread2 = await create_thread(
            db_session, query_text="Topic 2", organization=org, creator=user
        )
        thread3 = await create_thread(
            db_session, query_text="Topic 3", organization=org, creator=user
        )
        await db_session.commit()

        # Act: Query user's threads
        result = await db_session.execute(select(Thread).where(Thread.created_by == user.id))
        user_threads = result.scalars().all()

        # Assert: User has all threads
        assert len(user_threads) == 3
        thread_ids = {t.id for t in user_threads}
        assert thread1.id in thread_ids
        assert thread2.id in thread_ids
        assert thread3.id in thread_ids
