"""
Unit tests for multi-turn conversation functionality.

Tests conversation history handling, thread continuation, authorization,
and message creation for ChatGPT-style follow-up questions.
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from langchain.schema import AIMessage, HumanMessage, SystemMessage

from app.agents.thread_agent import generate_response, generate_response_streaming
from app.models.message import Message, MessageRole
from app.models.thread import Thread
from app.models.user import User
from app.services.ai_agent import AIAgentService


class TestConversationHistory:
    """Tests for conversation history handling in multi-turn conversations."""

    @pytest.mark.asyncio
    async def test_conversation_history_passed_to_llm(self) -> None:
        """Test that conversation history is properly passed to LLM."""
        # Setup conversation history (previous messages, not including current query)
        conversation_history = [
            {"role": "user", "content": "What is AI?"},
            {"role": "assistant", "content": "AI is artificial intelligence."},
        ]

        state = {
            "query": "Tell me more about it.",
            "context": [],
            "response": None,
            "citations": [],
            "conversation_history": conversation_history,
        }

        # Mock LLM response
        mock_response = MagicMock()
        mock_response.content = "AI has many applications in healthcare, finance, and more."

        with patch("app.agents.thread_agent.get_llm") as mock_get_llm:
            mock_llm = AsyncMock()
            mock_llm.ainvoke.return_value = mock_response
            mock_get_llm.return_value = mock_llm

            result = await generate_response(state)

            # Verify LLM was called
            assert mock_llm.ainvoke.called

            # Verify messages array was built correctly
            call_args = mock_llm.ainvoke.call_args[0][0]
            assert len(call_args) == 4  # SystemMessage + 2 history messages + current query

            # Check message types
            assert isinstance(call_args[0], SystemMessage)  # System prompt
            assert isinstance(call_args[1], HumanMessage)  # First user message from history
            assert isinstance(call_args[2], AIMessage)  # Assistant response from history
            assert isinstance(call_args[3], HumanMessage)  # Current query

            # Check message contents from history
            assert "What is AI?" in call_args[1].content
            assert "AI is artificial intelligence" in call_args[2].content

            # Check current query is in the last message
            assert "Tell me more about it" in call_args[3].content

            # Verify response
            assert (
                result["response"] == "AI has many applications in healthcare, finance, and more."
            )

    @pytest.mark.asyncio
    async def test_conversation_history_streaming(self) -> None:
        """Test that conversation history is properly used in streaming mode."""
        conversation_history = [
            {"role": "user", "content": "What is AI?"},
            {"role": "assistant", "content": "AI is artificial intelligence."},
        ]

        state = {
            "query": "What are its applications?",
            "context": [],
            "response": None,
            "citations": [],
            "conversation_history": conversation_history,
        }

        # Mock streaming LLM response
        async def mock_astream(messages):
            chunks = ["Healthcare", ", finance", ", and more."]
            for chunk_text in chunks:
                chunk = MagicMock()
                chunk.content = chunk_text
                yield chunk

        with patch("app.agents.thread_agent.get_llm") as mock_get_llm:
            mock_llm = MagicMock()
            mock_llm.astream = mock_astream
            mock_get_llm.return_value = mock_llm

            # Collect streamed tokens
            tokens = []
            async for token in generate_response_streaming(state):
                tokens.append(token)

            # Verify all tokens received
            assert len(tokens) == 3
            assert "".join(tokens) == "Healthcare, finance, and more."

    @pytest.mark.asyncio
    async def test_empty_conversation_history(self) -> None:
        """Test handling of empty conversation history (new thread)."""
        state = {
            "query": "What is AI?",
            "context": [],
            "response": None,
            "citations": [],
            "conversation_history": [],  # Empty history
        }

        mock_response = MagicMock()
        mock_response.content = "AI is artificial intelligence."

        with patch("app.agents.thread_agent.get_llm") as mock_get_llm:
            mock_llm = AsyncMock()
            mock_llm.ainvoke.return_value = mock_response
            mock_get_llm.return_value = mock_llm

            result = await generate_response(state)

            # Verify LLM was called
            assert result["response"] == "AI is artificial intelligence."
            call_args = mock_llm.ainvoke.call_args[0][0]

            # Should only have SystemMessage + current query (no history)
            assert len(call_args) == 2
            assert isinstance(call_args[0], SystemMessage)
            assert isinstance(call_args[1], HumanMessage)


class TestThreadContinuation:
    """Tests for thread continuation and authorization."""

    @pytest.mark.asyncio
    async def test_continue_thread_as_creator(
        self, mock_user, mock_org_thread, mock_db_session
    ) -> None:
        """Test continuing a thread as the thread creator."""
        # Mock database to return the thread when queried
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_org_thread
        mock_db_session.execute = AsyncMock(return_value=mock_result)

        # Test thread continuation
        service = AIAgentService()

        # Mock retrieve_context to return state as-is
        async def mock_retrieve_context(state):
            return state

        # Mock streaming response
        async def mock_generate_streaming(state):
            # Verify conversation history was loaded
            assert "conversation_history" in state
            assert len(state["conversation_history"]) == 2
            yield "AI has many applications."

        events = []
        with (
            patch(
                "app.services.ai_agent.generate_response_streaming",
                side_effect=mock_generate_streaming,
            ),
            patch("app.services.ai_agent.retrieve_context", side_effect=mock_retrieve_context),
        ):
            async for event in service.process_thread_stream(
                query="Tell me more",
                db=mock_db_session,
                user_id=mock_user.id,
                thread_id=mock_org_thread.id,
                save_to_db=True,
            ):
                events.append(event)

        # Verify events received
        start_events = [e for e in events if e["type"] == "start"]
        token_events = [e for e in events if e["type"] == "token"]
        done_events = [e for e in events if e["type"] == "done"]

        assert len(start_events) == 1
        assert start_events[0]["thread_id"] == str(mock_org_thread.id)
        assert len(token_events) > 0
        assert len(done_events) == 1

    @pytest.mark.asyncio
    async def test_continue_thread_as_space_owner(
        self, mock_user, mock_thread, mock_db_session
    ) -> None:
        """Test continuing a thread as the space owner."""
        # Create another user who created the thread
        other_user = MagicMock(spec=User)
        other_user.id = uuid4()
        mock_thread.created_by = other_user.id

        # Mock database to return thread (mock_user is space owner, should have access)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_thread
        mock_db_session.execute = AsyncMock(return_value=mock_result)

        service = AIAgentService()

        async def mock_retrieve_context(state):
            return state

        async def mock_generate_streaming(state):
            yield "Response from owner"

        events = []
        with (
            patch(
                "app.services.ai_agent.generate_response_streaming",
                side_effect=mock_generate_streaming,
            ),
            patch("app.services.ai_agent.retrieve_context", side_effect=mock_retrieve_context),
        ):
            async for event in service.process_thread_stream(
                query="Tell me more",
                db=mock_db_session,
                user_id=mock_user.id,  # Owner accessing thread
                thread_id=mock_thread.id,
                save_to_db=True,
            ):
                events.append(event)

        # Verify access granted
        start_events = [e for e in events if e["type"] == "start"]
        assert len(start_events) == 1

    @pytest.mark.asyncio
    async def test_continue_thread_as_space_member(
        self, mock_user, mock_space, mock_thread, mock_db_session
    ) -> None:
        """Test continuing a thread as a space member."""
        # Create owner and member users
        owner = MagicMock(spec=User)
        owner.id = uuid4()
        member = mock_user  # Use fixture user as member

        # Update thread to be owned by owner
        mock_thread.created_by = owner.id

        # Mock database to return thread (member should have access via SpaceMember)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_thread
        mock_db_session.execute = AsyncMock(return_value=mock_result)

        service = AIAgentService()

        async def mock_retrieve_context(state):
            return state

        async def mock_generate_streaming(state):
            yield "Response from member"

        events = []
        with (
            patch(
                "app.services.ai_agent.generate_response_streaming",
                side_effect=mock_generate_streaming,
            ),
            patch("app.services.ai_agent.retrieve_context", side_effect=mock_retrieve_context),
        ):
            async for event in service.process_thread_stream(
                query="Tell me more",
                db=mock_db_session,
                user_id=member.id,  # Member accessing thread
                thread_id=mock_thread.id,
                save_to_db=True,
            ):
                events.append(event)

        # Verify access granted
        start_events = [e for e in events if e["type"] == "start"]
        assert len(start_events) == 1

    @pytest.mark.asyncio
    async def test_continue_thread_unauthorized(self, mock_thread, mock_db_session) -> None:
        """Test that unauthorized users cannot continue a thread."""
        # Create unauthorized user
        unauthorized_user = MagicMock(spec=User)
        unauthorized_user.id = uuid4()

        # Mock database to return None (thread not found or no access)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute = AsyncMock(return_value=mock_result)

        service = AIAgentService()

        with pytest.raises(ValueError, match="Thread not found or access denied"):  # noqa: PT012
            async for event in service.process_thread_stream(  # noqa: B007
                query="Tell me more",
                db=mock_db_session,
                user_id=unauthorized_user.id,  # Unauthorized user
                thread_id=mock_thread.id,
                save_to_db=True,
            ):
                pass

    @pytest.mark.asyncio
    async def test_continue_thread_missing_user_id(self, mock_db_session) -> None:
        """Test that user_id is required when continuing a thread."""
        thread_id = uuid4()

        service = AIAgentService()

        with pytest.raises(ValueError, match="user_id is required"):  # noqa: PT012
            async for event in service.process_thread_stream(  # noqa: B007
                query="Tell me more",
                db=mock_db_session,
                user_id=None,  # Missing user_id
                thread_id=thread_id,
                save_to_db=True,
            ):
                pass

    @pytest.mark.asyncio
    async def test_continue_nonexistent_thread(self, mock_user, mock_db_session) -> None:
        """Test that continuing a non-existent thread raises error."""
        fake_thread_id = uuid4()

        # Mock database to return None (thread not found)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute = AsyncMock(return_value=mock_result)

        service = AIAgentService()

        with pytest.raises(ValueError, match="Thread not found or access denied"):  # noqa: PT012
            async for event in service.process_thread_stream(  # noqa: B007
                query="Tell me more",
                db=mock_db_session,
                user_id=mock_user.id,
                thread_id=fake_thread_id,  # Non-existent thread
                save_to_db=True,
            ):
                pass


class TestMessageCreation:
    """Tests for message creation in multi-turn conversations."""

    @pytest.mark.asyncio
    async def test_new_thread_creates_user_message(
        self, mock_user, mock_organization, mock_db_session
    ) -> None:
        """Test that starting a new thread creates a user message."""
        # Track created entities
        created_messages = []

        def track_message(obj):
            if isinstance(obj, Message):
                obj.id = obj.id or uuid4()
                created_messages.append(obj)
            elif isinstance(obj, Thread):
                obj.id = obj.id or uuid4()

        mock_db_session.add.side_effect = track_message

        # Mock organization_id query
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = mock_organization.id
        mock_db_session.execute = AsyncMock(return_value=mock_result)

        service = AIAgentService()

        async def mock_retrieve_context(state):
            return state

        async def mock_generate_streaming(state):
            yield "AI is artificial intelligence."

        events = []
        with (
            patch(
                "app.services.ai_agent.generate_response_streaming",
                side_effect=mock_generate_streaming,
            ),
            patch("app.services.ai_agent.retrieve_context", side_effect=mock_retrieve_context),
        ):
            async for event in service.process_thread_stream(
                query="What is AI?",
                db=mock_db_session,
                organization_id=mock_organization.id,
                user_id=mock_user.id,
                save_to_db=True,
            ):
                events.append(event)

        # Verify user message was created
        user_messages = [m for m in created_messages if m.message_role == MessageRole.USER]
        assert len(user_messages) == 1
        assert user_messages[0].content == "What is AI?"

    @pytest.mark.asyncio
    async def test_new_thread_creates_assistant_message(
        self, mock_user, mock_organization, mock_db_session
    ) -> None:
        """Test that streaming creates an assistant message with response."""
        # Track created entities
        created_messages = []

        def track_message(obj):
            if isinstance(obj, Message):
                obj.id = obj.id or uuid4()
                created_messages.append(obj)
            elif isinstance(obj, Thread):
                obj.id = obj.id or uuid4()

        mock_db_session.add.side_effect = track_message

        # Mock organization_id query
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = mock_organization.id
        mock_db_session.execute = AsyncMock(return_value=mock_result)

        service = AIAgentService()

        async def mock_retrieve_context(state):
            return state

        async def mock_generate_streaming(state):
            yield "AI is "
            yield "artificial "
            yield "intelligence."

        events = []
        with (
            patch(
                "app.services.ai_agent.generate_response_streaming",
                side_effect=mock_generate_streaming,
            ),
            patch("app.services.ai_agent.retrieve_context", side_effect=mock_retrieve_context),
        ):
            async for event in service.process_thread_stream(
                query="What is AI?",
                db=mock_db_session,
                organization_id=mock_organization.id,
                user_id=mock_user.id,
                save_to_db=True,
            ):
                events.append(event)

        # Verify assistant message was created
        assistant_messages = [
            m for m in created_messages if m.message_role == MessageRole.ASSISTANT
        ]
        assert len(assistant_messages) == 1
        assert assistant_messages[0].content == "AI is artificial intelligence."

    @pytest.mark.asyncio
    async def test_continue_thread_creates_new_messages(
        self, mock_user, mock_org_thread, mock_db_session
    ) -> None:
        """Test that continuing a thread creates new user and assistant messages."""
        # Track created messages
        created_messages = []

        def track_message(obj):
            if isinstance(obj, Message):
                obj.id = obj.id or uuid4()
                created_messages.append(obj)

        mock_db_session.add.side_effect = track_message

        # Mock database to return thread with existing messages
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_org_thread
        mock_db_session.execute = AsyncMock(return_value=mock_result)

        service = AIAgentService()

        async def mock_retrieve_context(state):
            return state

        async def mock_generate_streaming(state):
            yield "AI has many applications."

        events = []
        with (
            patch(
                "app.services.ai_agent.generate_response_streaming",
                side_effect=mock_generate_streaming,
            ),
            patch("app.services.ai_agent.retrieve_context", side_effect=mock_retrieve_context),
        ):
            async for event in service.process_thread_stream(
                query="Tell me more",
                db=mock_db_session,
                user_id=mock_user.id,
                thread_id=mock_org_thread.id,
                save_to_db=True,
            ):
                events.append(event)

        # Verify new messages were created (2 new: user + assistant)
        assert len(created_messages) == 2

        # Verify user message
        user_messages = [m for m in created_messages if m.message_role == MessageRole.USER]
        assert len(user_messages) == 1
        assert user_messages[0].content == "Tell me more"
        assert user_messages[0].thread_id == mock_org_thread.id

        # Verify assistant message
        assistant_messages = [
            m for m in created_messages if m.message_role == MessageRole.ASSISTANT
        ]
        assert len(assistant_messages) == 1
        assert assistant_messages[0].content == "AI has many applications."
        assert assistant_messages[0].thread_id == mock_org_thread.id
