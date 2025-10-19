"""
Unit tests for AI agent components.

Tests the LangGraph query agent, AI agent service, and streaming functionality.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.query_agent import (
    add_citations,
    create_query_agent,
    extract_citations,
    generate_response,
    retrieve_context,
)
from app.services.ai_agent import AIAgentService, ai_agent_service


class TestQueryAgent:
    """Tests for the query agent components."""

    @pytest.mark.asyncio
    async def test_retrieve_context_placeholder(self) -> None:
        """Test context retrieval returns empty list as placeholder."""
        state = {
            "query": "What is AI?",
            "context": [],
            "response": None,
            "citations": [],
        }

        result = await retrieve_context(state)

        assert isinstance(result["context"], list)
        assert len(result["context"]) == 0

    @pytest.mark.asyncio
    async def test_generate_response_with_mock(self) -> None:
        """Test response generation with mocked LLM."""
        state = {
            "query": "What is AI?",
            "context": [],
            "response": None,
            "citations": [],
        }

        # Mock the LLM response
        mock_response = MagicMock()
        mock_response.content = "Artificial Intelligence (AI) is a test response."

        with patch("app.agents.query_agent.get_llm") as mock_get_llm:
            mock_llm = AsyncMock()
            mock_llm.ainvoke.return_value = mock_response
            mock_get_llm.return_value = mock_llm

            result = await generate_response(state)

            assert result["response"] == "Artificial Intelligence (AI) is a test response."
            assert mock_llm.ainvoke.called

    def test_extract_citations(self) -> None:
        """Test citation extraction from response text."""
        response = "According to [1], AI is powerful. As stated in [2], it has many applications."
        context = [
            "AI is a powerful technology.",
            "AI has applications in healthcare, finance, and more.",
        ]

        citations = extract_citations(response, context)

        assert len(citations) == 2
        assert citations[0]["index"] == 1
        assert citations[0]["text"] == context[0]
        assert citations[1]["index"] == 2
        assert citations[1]["text"] == context[1]

    def test_extract_citations_no_references(self) -> None:
        """Test citation extraction with no references."""
        response = "AI is artificial intelligence."
        context = ["Some context"]

        citations = extract_citations(response, context)

        assert len(citations) == 0

    def test_extract_citations_invalid_index(self) -> None:
        """Test citation extraction with invalid reference index."""
        response = "According to [5], AI is powerful."
        context = ["AI is a powerful technology."]

        citations = extract_citations(response, context)

        # Should not extract citation for out-of-range index
        assert len(citations) == 0

    @pytest.mark.asyncio
    async def test_add_citations(self) -> None:
        """Test adding citations to agent state."""
        state = {
            "query": "What is AI?",
            "context": ["AI is artificial intelligence."],
            "response": "According to [1], AI is artificial intelligence.",
            "citations": [],
        }

        result = await add_citations(state)

        assert len(result["citations"]) == 1
        assert result["citations"][0]["index"] == 1

    @pytest.mark.asyncio
    async def test_add_citations_no_context(self) -> None:
        """Test adding citations when no context is available."""
        state = {
            "query": "What is AI?",
            "context": [],
            "response": "AI is artificial intelligence.",
            "citations": [],
        }

        result = await add_citations(state)

        assert len(result["citations"]) == 0

    def test_create_query_agent(self) -> None:
        """Test query agent creation and compilation."""
        agent = create_query_agent()

        # Should be a compiled StateGraph
        assert agent is not None
        # Agent should be callable
        assert callable(agent.ainvoke)


class TestAIAgentService:
    """Tests for the AI agent service."""

    @pytest.mark.asyncio
    async def test_process_query_with_mock(self) -> None:
        """Test query processing with mocked agent."""
        service = AIAgentService()

        # Mock the agent execution
        mock_result = {
            "query": "What is AI?",
            "context": [],
            "response": "AI is artificial intelligence.",
            "citations": [],
        }

        with patch.object(service.agent, "ainvoke", return_value=mock_result):
            result = await service.process_query("What is AI?")

            assert result["response"] == "AI is artificial intelligence."
            assert result["citations"] == []
            assert result["context_used"] is False

    @pytest.mark.asyncio
    async def test_process_query_with_context(self) -> None:
        """Test query processing with provided context."""
        service = AIAgentService()

        context = ["AI is a powerful technology."]
        mock_result = {
            "query": "What is AI?",
            "context": context,
            "response": "AI is a powerful technology according to the context.",
            "citations": [{"index": 1, "text": context[0]}],
        }

        with patch.object(service.agent, "ainvoke", return_value=mock_result):
            result = await service.process_query("What is AI?", context=context)

            assert result["response"] is not None
            assert result["context_used"] is True
            assert len(result["citations"]) == 1

    @pytest.mark.asyncio
    async def test_process_query_stream(self) -> None:
        """Test streaming query processing."""
        service = AIAgentService()

        # Collect events
        events = []

        # Mock the streaming response
        async def mock_generate_streaming(state):  # noqa: ARG001
            yield "Hello "
            yield "world!"

        with patch(
            "app.services.ai_agent.generate_response_streaming",
            side_effect=mock_generate_streaming,
        ):
            async for event in service.process_query_stream("Test query"):
                events.append(event)

        # Should have token events and done event
        token_events = [e for e in events if e["type"] == "token"]
        done_events = [e for e in events if e["type"] == "done"]

        assert len(token_events) == 2
        assert token_events[0]["content"] == "Hello "
        assert token_events[1]["content"] == "world!"
        assert len(done_events) == 1

    def test_global_service_instance(self) -> None:
        """Test that global service instance is initialized."""
        assert ai_agent_service is not None
        assert isinstance(ai_agent_service, AIAgentService)


class TestLangChainConfig:
    """Tests for LangChain configuration."""

    def test_get_llm_import(self) -> None:
        """Test that get_llm can be imported."""
        from app.services.langchain_config import get_llm

        assert callable(get_llm)

    def test_get_embeddings_import(self) -> None:
        """Test that get_embeddings can be imported."""
        from app.services.langchain_config import get_embeddings

        assert callable(get_embeddings)

    @patch("app.services.langchain_config.settings")
    def test_get_llm_configuration(self, mock_settings: MagicMock) -> None:
        """Test LLM configuration with settings."""
        from app.services.langchain_config import get_llm

        # Mock settings
        mock_settings.openai_api_key = "test-key"
        mock_settings.openai_chat_model = "gpt-4"
        mock_settings.openai_temperature = 0.0
        mock_settings.openai_max_tokens = 2000
        mock_settings.openai_max_retries = 3
        mock_settings.langchain_tracing_v2 = False

        # Should create LLM with default settings
        llm = get_llm()

        assert llm is not None
        assert llm.model_name == "gpt-4"
        assert llm.temperature == 0.0

    @patch("app.services.langchain_config.settings")
    def test_get_embeddings_configuration(self, mock_settings: MagicMock) -> None:
        """Test embeddings configuration with settings."""
        from app.services.langchain_config import get_embeddings

        # Mock settings
        mock_settings.openai_api_key = "test-key"
        mock_settings.openai_embedding_model = "text-embedding-3-small"
        mock_settings.openai_max_retries = 3

        # Should create embeddings with default settings
        embeddings = get_embeddings()

        assert embeddings is not None
        assert embeddings.model == "text-embedding-3-small"
