"""
AI Agent service for thread processing and response generation.

Provides a high-level interface for using the LangGraph thread agent with
streaming support for real-time responses, confidence scoring, and database storage.
"""

import logging
from typing import Any
from uuid import UUID
from collections.abc import AsyncGenerator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.thread_agent import (
    AgentState,
    NO_CONTEXT_FALLBACK_MESSAGE,
    create_thread_agent,
    generate_response_streaming,
    add_citations,
)
from app.models.space import Space
from app.models.thread import Thread
from app.services.citation_service import get_citation_service

logger = logging.getLogger(__name__)

# Confidence threshold for "I don't know" fallback (hybrid approach)
# NOTE: Automatic replacement is currently DISABLED (see _apply_confidence_threshold usage below)
# The LLM's system prompt already instructs it to express uncertainty naturally.
# This threshold is kept for potential future features (e.g., UI warnings, quality metrics).
CONFIDENCE_THRESHOLD = 0.5  # Reject responses below 50% confidence

# Use shared fallback message from query_agent for consistency
LOW_CONFIDENCE_MESSAGE = NO_CONTEXT_FALLBACK_MESSAGE


class AIAgentService:
    """
    Service for AI agent operations.

    Handles thread processing, response generation, citation extraction,
    confidence scoring, and database storage using the LangGraph thread agent.
    """

    def __init__(self) -> None:
        """Initialize the AI agent service with compiled workflow."""
        self.agent = create_thread_agent()
        self.citation_service = get_citation_service()
        logger.info("Initialized AIAgentService with LangGraph thread agent")

    def _apply_confidence_threshold(
        self, response: str, confidence_score: float, citations: list[dict[str, Any]]
    ) -> tuple[str, list[dict[str, Any]]]:
        """
        Apply confidence threshold to response (hybrid approach).

        NOTE: This method is currently DISABLED in production (not called).
        It's kept for potential future features like:
        - UI confidence warnings
        - Quality metrics dashboards
        - Admin review queues for low-confidence answers

        If confidence is below threshold, replace response with "I don't know" message.
        This provides automatic quality control while the enhanced prompts guide the
        LLM to express uncertainty naturally.

        Args:
            response: Generated response text
            confidence_score: Calculated confidence score (0-1)
            citations: Extracted citations

        Returns:
            Tuple of (potentially modified response, potentially empty citations)
        """
        if confidence_score < CONFIDENCE_THRESHOLD:
            logger.warning(
                f"Low confidence response detected ({confidence_score:.3f} < {CONFIDENCE_THRESHOLD}). "
                f"Replacing with fallback message."
            )
            return LOW_CONFIDENCE_MESSAGE, []
        return response, citations

    async def process_query(
        self,
        query: str,
        db: AsyncSession | None = None,
        space_id: UUID | None = None,
        user_id: UUID | None = None,
        context: list[str] | None = None,
        save_to_db: bool = False,
    ) -> dict[str, Any]:
        """
        Process a query and return complete response with citations.

        Non-streaming version for simple synchronous usage.

        Args:
            query: User's natural language question
            db: Database session for vector search and storage
            space_id: Space ID to filter search results
            user_id: User ID for query attribution (required if save_to_db=True)
            context: Optional pre-retrieved document chunks (bypasses vector search)
            save_to_db: Whether to save query and results to database

        Returns:
            Dictionary with response, citations, and confidence score

        Example:
            >>> service = AIAgentService()
            >>> async with get_db() as db:
            ...     result = await service.process_query(
            ...         "What is AI?",
            ...         db=db,
            ...         space_id=space_uuid,
            ...         user_id=user_uuid,
            ...         save_to_db=True,
            ...     )
            ...     print(result["response"])
        """
        # Initialize state
        state: AgentState = {
            "query": query,
            "context": context or [],
            "response": None,
            "citations": [],
            "db": db,
            "space_id": space_id,
            "search_results": None,
        }

        # Execute agent workflow
        result = await self.agent.ainvoke(state)

        # Calculate confidence score
        confidence_score = 0.0
        search_results = result.get("search_results")
        if search_results:
            confidence_score = self.citation_service.calculate_overall_confidence(
                search_results, len(result["citations"])
            )
            logger.info(f"Calculated confidence score: {confidence_score:.3f}")

        # NOTE: Confidence threshold filtering is disabled
        # We trust the LLM's natural uncertainty expression instead of automatic replacement
        # The _apply_confidence_threshold method remains available if needed in the future
        final_response = result["response"]
        final_citations = result["citations"]

        num_sources = len(search_results) if search_results else 0
        response_data = {
            "response": final_response,
            "citations": final_citations,
            "confidence_score": confidence_score,
            "context_used": len(result["context"]) > 0,
            "num_sources": num_sources,
        }

        # Save to database if requested
        if save_to_db and db and space_id and user_id:
            thread_record = await self._save_query_to_db(
                db=db,
                query_text=query,
                space_id=space_id,
                user_id=user_id,
                result_text=final_response,
                citations=final_citations,
                confidence_score=confidence_score,
                agent_state=dict(result),
            )
            response_data["thread_id"] = str(thread_record.id)

        return response_data

    async def _save_query_to_db(
        self,
        db: AsyncSession,
        query_text: str,
        space_id: UUID,
        user_id: UUID,
        result_text: str | None,
        citations: list[dict[str, Any]],
        confidence_score: float,
        agent_state: dict[str, Any],
    ) -> Thread:
        """
        Save thread and results to the database.

        Args:
            db: Database session
            query_text: Original query text
            space_id: Space ID
            user_id: User ID
            result_text: Generated response text
            citations: Citation metadata
            confidence_score: Overall confidence score
            agent_state: Complete agent state for debugging

        Returns:
            Saved Thread record
        """
        # Get organization_id from space
        space_stmt = select(Space.organization_id).where(Space.id == space_id)
        space_result = await db.execute(space_stmt)
        organization_id = space_result.scalar_one()

        thread_record = Thread(
            organization_id=organization_id,
            query_text=query_text,
            space_id=space_id,
            created_by=user_id,
            result=result_text,
            confidence_score=confidence_score,
            sources={"citations": citations, "count": len(citations)},
            agent_steps={
                "context_count": len(agent_state.get("context", [])),
                "search_results_count": len(agent_state.get("search_results", [])),
            },
        )

        db.add(thread_record)
        await db.commit()
        await db.refresh(thread_record)

        logger.info(
            f"Saved thread to database: id={thread_record.id}, "
            f"confidence={confidence_score:.3f}, citations={len(citations)}"
        )

        return thread_record

    async def process_thread_stream(
        self,
        query: str,
        db: AsyncSession | None = None,
        space_id: UUID | None = None,
        user_id: UUID | None = None,
        context: list[str] | None = None,
        save_to_db: bool = False,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Process thread query with streaming support for real-time token delivery.

        Yields events as the response is generated, suitable for SSE endpoints.

        Args:
            query: User's natural language question
            db: Database session for vector search and storage
            space_id: Space ID to filter search results
            user_id: User ID for thread attribution (required if save_to_db=True)
            context: Optional pre-retrieved document chunks (bypasses vector search)
            save_to_db: Whether to save thread and results to database

        Yields:
            Event dictionaries with types: 'token', 'citations', 'confidence', 'done'

        Example:
            >>> service = AIAgentService()
            >>> async with get_db() as db:
            ...     async for event in service.process_thread_stream(
            ...         "What is AI?",
            ...         db=db,
            ...         space_id=space_uuid,
            ...         save_to_db=True,
            ...     ):
            ...         if event["type"] == "token":
            ...             print(event["content"], end="", flush=True)
        """
        # Initialize state
        state: AgentState = {
            "query": query,
            "context": context or [],
            "response": None,
            "citations": [],
            "db": db,
            "space_id": space_id,
            "search_results": None,
        }

        # Step 1: Retrieve context (if not provided)
        if not context:
            # Import here to avoid circular imports when vector search is available
            from app.agents.thread_agent import retrieve_context

            state = await retrieve_context(state)

        # Step 2: Stream response generation
        full_response = ""
        async for token in generate_response_streaming(state):
            full_response += token
            yield {"type": "token", "content": token}

        # Step 3: Extract citations
        state["response"] = full_response

        state = await add_citations(state)

        # Step 4: Calculate confidence score
        confidence_score = 0.0
        search_results = state.get("search_results")
        if search_results:
            confidence_score = self.citation_service.calculate_overall_confidence(
                search_results, len(state["citations"])
            )
            logger.info(f"Streaming query confidence score: {confidence_score:.3f}")

        # NOTE: Confidence threshold filtering is disabled
        # We trust the LLM's natural uncertainty expression instead of automatic replacement
        final_response = full_response
        final_citations = state["citations"]

        # Yield citations with confidence
        if final_citations:
            yield {
                "type": "citations",
                "sources": final_citations,
                "confidence_score": confidence_score,
            }

        # Step 5: Save to database if requested
        thread_id = None
        if save_to_db and db and space_id and user_id:
            thread_record = await self._save_query_to_db(
                db=db,
                query_text=query,
                space_id=space_id,
                user_id=user_id,
                result_text=final_response,
                citations=final_citations,
                confidence_score=confidence_score,
                agent_state=dict(state),
            )
            thread_id = str(thread_record.id)

        # Signal completion
        num_sources = len(search_results) if search_results else 0
        yield {
            "type": "done",
            "context_used": len(state["context"]) > 0,
            "num_sources": num_sources,
            "confidence_score": confidence_score,
            "thread_id": thread_id,
        }


# Global service instance
# Initialized on first import for reuse across requests
ai_agent_service = AIAgentService()
