"""
Integration tests for RAG pipeline with confidence scoring and fallback.

Tests the complete RAG pipeline including:
- Vector search and context retrieval
- LLM response generation with streaming
- Confidence scoring and low-confidence fallback
- Citation extraction and validation
- Token budget management
- Database persistence
"""

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.models.query import Query
from app.services.ai_agent import (
    AIAgentService,
    CONFIDENCE_THRESHOLD,
    LOW_CONFIDENCE_MESSAGE,
)
from app.services.citation_service import get_citation_service


class TestRAGPipelineIntegration:
    """Integration tests for RAG pipeline with new confidence features."""

    @pytest.mark.asyncio
    async def test_high_confidence_query_processing(self, async_session):
        """Test that high-confidence queries return AI-generated responses."""
        # Mock search results in the format expected by CitationService
        mock_search_results = [
            MagicMock(
                chunk=MagicMock(
                    chunk_text="The key risks include market volatility and regulatory changes.",
                    chunk_index=0,
                    chunk_metadata={},
                    start_char=0,
                    end_char=100,
                ),
                document=MagicMock(id=uuid4(), name="Risk Assessment Report"),
                similarity_score=0.85,
            ),
        ]

        # Mock LLM streaming response
        mock_stream_tokens = [
            "The",
            " key",
            " risks",
            " mentioned",
            " include",
            " market",
            " volatility",
            " and",
            " regulatory",
            " changes.",
        ]

        with (
            patch("app.agents.query_agent.retrieve_context") as mock_retrieve,
            patch("app.agents.query_agent.generate_response_streaming") as mock_stream,
            patch("app.agents.query_agent.add_citations") as mock_citations,
        ):
            # Mock context retrieval
            async def mock_retrieve_fn(state):
                state["search_results"] = mock_search_results
                state["context"] = [
                    "The key risks include market volatility and regulatory changes."
                ]
                return state

            mock_retrieve.side_effect = mock_retrieve_fn

            # Mock streaming
            async def mock_stream_fn(*args, **kwargs):
                for token in mock_stream_tokens:
                    yield token

            mock_stream.return_value = mock_stream_fn()

            # Mock citations
            async def mock_citations_fn(state):
                state["citations"] = [
                    {
                        "index": 1,
                        "text": "The key risks include market volatility and regulatory changes.",
                        "document_id": str(mock_search_results[0].document.id),
                        "similarity_score": 0.85,
                    }
                ]
                return state

            mock_citations.side_effect = mock_citations_fn

            # Process query
            service = AIAgentService()
            events = []
            async for event in service.process_query_stream(
                query="What are the key risks?",
                db=async_session,
                space_id=uuid4(),
                user_id=uuid4(),
                save_to_db=False,
            ):
                events.append(event)

        # Verify response was streamed
        token_events = [e for e in events if e["type"] == "token"]
        assert len(token_events) > 0
        assert "".join(e["content"] for e in token_events) == "".join(mock_stream_tokens)

        # Verify high confidence (no replace event)
        replace_events = [e for e in events if e["type"] == "replace"]
        assert len(replace_events) == 0

        # Verify done event
        done_events = [e for e in events if e["type"] == "done"]
        assert len(done_events) == 1
        assert done_events[0]["confidence_score"] > CONFIDENCE_THRESHOLD

    @pytest.mark.asyncio
    async def test_low_confidence_fallback(self, async_session):
        """Test that low-confidence responses trigger fallback message."""
        # Mock vector search with low similarity
        mock_search_results = [
            MagicMock(
                chunk=MagicMock(
                    chunk_text="Unrelated content about weather patterns.",
                    chunk_index=0,
                ),
                document=MagicMock(id=uuid4(), title="Weather Report"),
                similarity_score=0.3,  # Low similarity
            ),
        ]

        # Mock LLM response (will be replaced)
        mock_stream_tokens = ["Based", " on", " the", " context..."]

        with (
            patch("app.agents.query_agent.retrieve_context") as mock_retrieve,
            patch("app.agents.query_agent.generate_response_streaming") as mock_stream,
            patch(
                "app.services.citation_service.CitationService.calculate_overall_confidence"
            ) as mock_confidence,
        ):
            # Mock context retrieval
            async def mock_retrieve_fn(state):
                state["search_results"] = mock_search_results
                state["context"] = ["Unrelated content about weather patterns."]
                return state

            mock_retrieve.side_effect = mock_retrieve_fn

            # Mock streaming
            async def mock_stream_fn(*args, **kwargs):
                for token in mock_stream_tokens:
                    yield token

            mock_stream.return_value = mock_stream_fn()

            mock_confidence.return_value = 0.3  # Low confidence

            # Process query
            service = AIAgentService()
            events = []
            async for event in service.process_query_stream(
                query="What are the financial projections?",
                db=async_session,
                space_id=uuid4(),
                user_id=uuid4(),
                save_to_db=False,
            ):
                events.append(event)

        # Verify fallback message was sent
        replace_events = [e for e in events if e["type"] == "replace"]
        assert len(replace_events) == 1
        assert replace_events[0]["content"] == LOW_CONFIDENCE_MESSAGE

        # Verify done event with low confidence
        done_events = [e for e in events if e["type"] == "done"]
        assert len(done_events) == 1
        assert done_events[0]["confidence_score"] < CONFIDENCE_THRESHOLD

    @pytest.mark.asyncio
    async def test_streaming_with_confidence_threshold(self, async_session):
        """Test that streaming stops and replaces content when confidence is low."""
        # Mock search results
        mock_search_results = [
            MagicMock(
                chunk=MagicMock(
                    chunk_text="Content about unrelated topic.",
                    chunk_index=0,
                    chunk_metadata={},
                    start_char=0,
                    end_char=50,
                ),
                document=MagicMock(id=uuid4(), name="Document"),
                similarity_score=0.4,
            ),
        ]

        mock_stream_tokens = [
            "Streaming",
            " response",
            " that",
            " will",
            " be",
            " replaced",
        ]

        with (
            patch("app.agents.query_agent.retrieve_context") as mock_retrieve,
            patch("app.agents.query_agent.generate_response_streaming") as mock_stream,
            patch("app.agents.query_agent.add_citations") as mock_citations,
            patch(
                "app.services.citation_service.CitationService.calculate_overall_confidence"
            ) as mock_confidence,
        ):
            # Mock context retrieval
            async def mock_retrieve_fn(state):
                state["search_results"] = mock_search_results
                state["context"] = ["Content about unrelated topic."]
                return state

            mock_retrieve.side_effect = mock_retrieve_fn

            # Mock streaming
            async def mock_stream_fn(*args, **kwargs):
                for token in mock_stream_tokens:
                    yield token

            mock_stream.return_value = mock_stream_fn()

            # Mock citations
            async def mock_citations_fn(state):
                state["citations"] = []
                return state

            mock_citations.side_effect = mock_citations_fn

            mock_confidence.return_value = 0.35

            service = AIAgentService()
            events = []
            async for event in service.process_query_stream(
                query="Test query",
                db=async_session,
                space_id=uuid4(),
                user_id=uuid4(),
                save_to_db=False,
            ):
                events.append(event)

        # Verify both streaming and replacement occurred
        token_events = [e for e in events if e["type"] == "token"]
        replace_events = [e for e in events if e["type"] == "replace"]

        assert len(token_events) > 0  # Original streaming
        assert len(replace_events) == 1  # Replaced with fallback
        assert replace_events[0]["content"] == LOW_CONFIDENCE_MESSAGE

    @pytest.mark.asyncio
    async def test_token_budget_management(self, async_session):
        """Test that large context is handled properly in RAG pipeline."""
        # Create many search results to test context management
        mock_search_results = [
            MagicMock(
                chunk=MagicMock(
                    chunk_text="A" * 500,  # Large chunk
                    chunk_index=i,
                    chunk_metadata={},
                    start_char=0,
                    end_char=500,
                ),
                document=MagicMock(id=uuid4(), name=f"Doc {i}"),
                similarity_score=0.9 - (i * 0.05),
            )
            for i in range(20)  # Many chunks
        ]

        mock_stream_tokens = ["Processed", " response"]

        with (
            patch("app.agents.query_agent.retrieve_context") as mock_retrieve,
            patch("app.agents.query_agent.generate_response_streaming") as mock_stream,
            patch("app.agents.query_agent.add_citations") as mock_citations,
        ):
            # Mock context retrieval with large context
            async def mock_retrieve_fn(state):
                state["search_results"] = mock_search_results
                state["context"] = [r.chunk.chunk_text for r in mock_search_results]
                return state

            mock_retrieve.side_effect = mock_retrieve_fn

            # Mock streaming
            async def mock_stream_fn(*args, **kwargs):
                for token in mock_stream_tokens:
                    yield token

            mock_stream.return_value = mock_stream_fn()

            # Mock citations
            async def mock_citations_fn(state):
                state["citations"] = []
                return state

            mock_citations.side_effect = mock_citations_fn

            service = AIAgentService()
            events = []
            async for event in service.process_query_stream(
                query="Test query",
                db=async_session,
                space_id=uuid4(),
                user_id=uuid4(),
                save_to_db=False,
            ):
                events.append(event)

        # Verify processing completed despite large context
        done_events = [e for e in events if e["type"] == "done"]
        assert len(done_events) == 1

    @pytest.mark.asyncio
    async def test_hallucination_detection_valid_response(self, async_session):
        """Test that valid responses with good citations pass hallucination check."""
        response = "The key risks include market volatility [1]."
        context_chunks = ["The key risks include market volatility and regulatory changes."]
        citations = [
            {
                "index": 1,
                "text": "The key risks include market volatility and regulatory changes.",
                "similarity_score": 0.85,
            },
        ]

        service = get_citation_service()
        validation = service.detect_hallucinations(response, context_chunks, citations)

        assert validation["is_valid"] is True
        assert validation["quality_score"] > 0.6

    @pytest.mark.asyncio
    async def test_hallucination_detection_invalid_citations(self, async_session):
        """Test that responses with invalid citation markers are flagged."""
        response = "According to [999], the projections are positive."
        context_chunks = ["Some unrelated content."]
        citations = []

        service = get_citation_service()
        validation = service.detect_hallucinations(response, context_chunks, citations)

        assert validation["is_valid"] is False
        assert len(validation["issues"]) > 0

    @pytest.mark.asyncio
    async def test_hallucination_detection_low_relevance(self, async_session):
        """Test that responses about unrelated context are flagged."""
        response = "The financial projections show strong growth in Q4."
        context_chunks = ["This document discusses weather patterns."]
        citations = [
            {
                "index": 1,
                "text": "This document discusses weather patterns.",
                "similarity_score": 0.3,  # Low relevance
            },
        ]

        service = get_citation_service()
        validation = service.detect_hallucinations(response, context_chunks, citations)

        assert validation["is_valid"] is False
        assert any("low relevance" in issue.lower() for issue in validation["issues"])

    @pytest.mark.asyncio
    async def test_hallucination_detection_indicator_phrases(self, async_session):
        """Test that responses with hallucination indicators are flagged."""
        response = "According to my knowledge, the answer is that growth will continue."
        context_chunks = ["Relevant context about the topic."]
        citations = []

        service = get_citation_service()
        validation = service.detect_hallucinations(response, context_chunks, citations)

        assert validation["is_valid"] is False
        assert any("hallucination indicator" in issue.lower() for issue in validation["issues"])

    @pytest.mark.asyncio
    async def test_database_persistence_with_confidence(self, async_session, test_user, test_space):
        """Test that queries are saved with confidence scores."""
        query_text = "What are the key findings?"

        mock_search_results = [
            MagicMock(
                chunk=MagicMock(
                    chunk_text="The key findings are positive.",
                    chunk_index=0,
                    chunk_metadata={},
                    start_char=0,
                    end_char=50,
                ),
                document=MagicMock(id=uuid4(), name="Report"),
                similarity_score=0.8,
            ),
        ]

        mock_stream_tokens = ["The", " findings", " are", " positive."]

        with (
            patch("app.agents.query_agent.retrieve_context") as mock_retrieve,
            patch("app.agents.query_agent.generate_response_streaming") as mock_stream,
            patch("app.agents.query_agent.add_citations") as mock_citations,
        ):
            # Mock context retrieval
            async def mock_retrieve_fn(state):
                state["search_results"] = mock_search_results
                state["context"] = ["The key findings are positive."]
                return state

            mock_retrieve.side_effect = mock_retrieve_fn

            # Mock streaming
            async def mock_stream_fn(*args, **kwargs):
                for token in mock_stream_tokens:
                    yield token

            mock_stream.return_value = mock_stream_fn()

            # Mock citations
            async def mock_citations_fn(state):
                state["citations"] = [
                    {"index": 1, "text": "The key findings are positive.", "similarity_score": 0.8}
                ]
                return state

            mock_citations.side_effect = mock_citations_fn

            service = AIAgentService()
            events = []
            async for event in service.process_query_stream(
                query=query_text,
                db=async_session,
                space_id=test_space.id,
                user_id=test_user.id,
                save_to_db=True,
            ):
                events.append(event)

        # Verify done event includes query_id
        done_events = [e for e in events if e["type"] == "done"]
        assert len(done_events) == 1
        assert "query_id" in done_events[0]
        assert done_events[0]["confidence_score"] is not None

        # Verify query was saved to database
        saved_query = await async_session.get(Query, done_events[0]["query_id"])
        assert saved_query is not None
        assert saved_query.query_text == query_text
        assert saved_query.confidence_score == done_events[0]["confidence_score"]

    @pytest.mark.asyncio
    async def test_citation_service_confidence_calculation(self, async_session):
        """Test that CitationService calculates confidence correctly."""
        # High similarity search results
        high_quality_results = [
            MagicMock(
                chunk=MagicMock(chunk_text="Relevant content"),
                document=MagicMock(id=uuid4()),
                similarity_score=0.9,
            ),
            MagicMock(
                chunk=MagicMock(chunk_text="More relevant content"),
                document=MagicMock(id=uuid4()),
                similarity_score=0.85,
            ),
        ]

        service = get_citation_service()
        confidence = service.calculate_overall_confidence(
            high_quality_results, num_citations_used=2
        )

        assert confidence > CONFIDENCE_THRESHOLD

        # Low similarity search results
        low_quality_results = [
            MagicMock(
                chunk=MagicMock(chunk_text="Less relevant content"),
                document=MagicMock(id=uuid4()),
                similarity_score=0.4,
            ),
        ]

        confidence = service.calculate_overall_confidence(low_quality_results, num_citations_used=0)

        assert confidence < CONFIDENCE_THRESHOLD

    @pytest.mark.asyncio
    async def test_end_to_end_rag_flow(self, async_session, test_user, test_space):
        """Test complete RAG pipeline from query to response with citations."""
        doc_id = uuid4()

        # Mock complete flow with search results
        mock_search_results = [
            MagicMock(
                chunk=MagicMock(
                    chunk_text="The financial projections for Q4 show 20% growth.",
                    chunk_index=0,
                    chunk_metadata={"page_num": 5},
                    start_char=0,
                    end_char=50,
                ),
                document=MagicMock(id=doc_id, name="Financial Report Q4"),
                similarity_score=0.88,
            ),
            MagicMock(
                chunk=MagicMock(
                    chunk_text="Revenue increased significantly due to market expansion.",
                    chunk_index=1,
                    chunk_metadata={"page_num": 6},
                    start_char=50,
                    end_char=100,
                ),
                document=MagicMock(id=doc_id, name="Financial Report Q4"),
                similarity_score=0.82,
            ),
        ]

        mock_response_tokens = [
            "According",
            " to",
            " the",
            " financial",
            " report,",
            " Q4",
            " projections",
            " show",
            " 20%",
            " growth",
            " in",
            " revenue.",
        ]

        with (
            patch("app.agents.query_agent.retrieve_context") as mock_retrieve,
            patch("app.agents.query_agent.generate_response_streaming") as mock_stream,
            patch("app.agents.query_agent.add_citations") as mock_citations,
        ):
            # Mock context retrieval
            async def mock_retrieve_fn(state):
                state["search_results"] = mock_search_results
                state["context"] = [r.chunk.chunk_text for r in mock_search_results]
                return state

            mock_retrieve.side_effect = mock_retrieve_fn

            # Mock streaming
            async def mock_stream_fn(*args, **kwargs):
                for token in mock_response_tokens:
                    yield token

            mock_stream.return_value = mock_stream_fn()

            # Mock citations
            async def mock_citations_fn(state):
                state["citations"] = [
                    {
                        "index": 1,
                        "text": "The financial projections for Q4 show 20% growth.",
                        "document_id": str(doc_id),
                        "similarity_score": 0.88,
                    },
                    {
                        "index": 2,
                        "text": "Revenue increased significantly due to market expansion.",
                        "document_id": str(doc_id),
                        "similarity_score": 0.82,
                    },
                ]
                return state

            mock_citations.side_effect = mock_citations_fn

            service = AIAgentService()
            events = []
            async for event in service.process_query_stream(
                query="What are the Q4 financial projections?",
                db=async_session,
                space_id=test_space.id,
                user_id=test_user.id,
                save_to_db=True,
            ):
                events.append(event)

        # Verify complete event sequence
        event_types = [e["type"] for e in events]
        assert "token" in event_types  # Streaming occurred
        assert "citations" in event_types  # Citations provided
        assert "done" in event_types  # Completion signal

        # Verify citations
        citation_events = [e for e in events if e["type"] == "citations"]
        assert len(citation_events) == 1
        citations = citation_events[0]["sources"]
        assert len(citations) == 2
        assert all(c["document_id"] == str(doc_id) for c in citations)

        # Verify high confidence
        done_events = [e for e in events if e["type"] == "done"]
        assert done_events[0]["confidence_score"] > CONFIDENCE_THRESHOLD

        # Verify database persistence
        query_id = done_events[0]["query_id"]
        saved_query = await async_session.get(Query, query_id)
        assert saved_query is not None
        assert saved_query.result == "".join(e["content"] for e in events if e["type"] == "token")
