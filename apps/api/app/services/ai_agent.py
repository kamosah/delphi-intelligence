"""
AI Agent service for thread processing and response generation.

Provides a high-level interface for using the LangGraph thread agent with
streaming support for real-time responses, confidence scoring, and database storage.
"""

import logging
from typing import Any
from uuid import UUID
from collections.abc import AsyncGenerator

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.agents.thread_agent import (
    AgentState,
    NO_CONTEXT_FALLBACK_MESSAGE,
    create_thread_agent,
    generate_response_streaming,
    add_citations,
    retrieve_context,
)
from app.models.message import Message, MessageRole
from app.models.space import Space, SpaceMember
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
        user_id: UUID,
        result_text: str | None,
        citations: list[dict[str, Any]],
        confidence_score: float,
        agent_state: dict[str, Any],
        organization_id: UUID | None = None,
        space_id: UUID | None = None,
    ) -> Thread:
        """
        Save thread and results to the database.

        Args:
            db: Database session
            query_text: Original query text
            user_id: User ID
            result_text: Generated response text
            citations: Citation metadata
            confidence_score: Overall confidence score
            agent_state: Complete agent state for debugging
            organization_id: Organization ID (required if space_id not provided)
            space_id: Optional Space ID (for space-scoped threads)

        Returns:
            Saved Thread record
        """
        # Get organization_id from space if not provided directly
        if not organization_id and space_id:
            space_stmt = select(Space.organization_id).where(Space.id == space_id)
            space_result = await db.execute(space_stmt)
            organization_id = space_result.scalar_one()
        elif not organization_id:
            msg = "Either organization_id or space_id must be provided"
            raise ValueError(msg)

        thread_record = Thread(
            organization_id=organization_id,
            query_text=query_text,
            space_id=space_id,  # Can be None for org-wide threads
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

    async def process_thread_stream(  # noqa: PLR0915
        self,
        query: str,
        db: AsyncSession | None = None,
        organization_id: UUID | None = None,
        space_id: UUID | None = None,
        user_id: UUID | None = None,
        context: list[str] | None = None,
        save_to_db: bool = False,
        thread_id: UUID | None = None,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Process thread query with streaming support for real-time token delivery.

        Supports both new threads and continuation of existing multi-turn conversations.

        Yields events as the response is generated, suitable for SSE endpoints.

        Args:
            query: User's natural language question
            db: Database session for vector search and storage
            organization_id: Organization ID (required if save_to_db=True and space_id not provided)
            space_id: Optional space ID to filter search results
            user_id: User ID for thread attribution (required if save_to_db=True or if thread_id is provided for authorization)
            context: Optional pre-retrieved document chunks (bypasses vector search)
            save_to_db: Whether to save thread and results to database
            thread_id: Optional existing thread ID for multi-turn conversation continuation

        Yields:
            Event dictionaries with types: 'start', 'token', 'citations', 'done'

        Example (new thread):
            >>> service = AIAgentService()
            >>> async with get_db() as db:
            ...     async for event in service.process_thread_stream(
            ...         "What is AI?",
            ...         db=db,
            ...         organization_id=org_uuid,
            ...         user_id=user_uuid,
            ...         save_to_db=True,
            ...     ):
            ...         if event["type"] == "token":
            ...             print(event["content"], end="", flush=True)

        Example (continue thread):
            >>> async for event in service.process_thread_stream(
            ...     "Tell me more about that",
            ...     db=db,
            ...     user_id=user_uuid,
            ...     thread_id=existing_thread_id,
            ...     save_to_db=True,
            ... ):
            ...     if event["type"] == "token":
            ...         print(event["content"], end="", flush=True)
        """
        # Step 1: Handle thread creation or continuation
        saved_thread_id = None
        conversation_history: list[dict[str, str]] = []

        if thread_id and db:
            # CONTINUATION: Load existing thread and verify user has access
            # Use same authorization logic as GraphQL thread query (query.py:500-534)
            if not user_id:
                error_msg = "user_id is required when continuing a thread"
                raise ValueError(error_msg)

            # Load thread with space access checks
            stmt = (
                select(Thread)
                .options(joinedload(Thread.messages))
                .outerjoin(Space, Space.id == Thread.space_id)
                .outerjoin(SpaceMember, SpaceMember.space_id == Space.id)
                .where(
                    (Thread.id == thread_id)
                    & (
                        # Access via space membership
                        (
                            (Thread.space_id.isnot(None))
                            & ((Space.owner_id == user_id) | (SpaceMember.user_id == user_id))
                        )
                        # OR thread creator for org-wide threads
                        | ((Thread.space_id.is_(None)) & (Thread.created_by == user_id))
                    )
                )
                .distinct()
            )
            result = await db.execute(stmt)
            thread_record = result.scalar_one_or_none()

            if not thread_record:
                error_msg = (
                    f"Thread not found or access denied: {thread_id}. "
                    "You must be the thread creator, space owner, or space member to continue this thread."
                )
                raise ValueError(error_msg)

            saved_thread_id = str(thread_record.id)

            # Build conversation history from existing messages
            for msg in thread_record.messages:
                conversation_history.append(
                    {
                        "role": msg.message_role.value,
                        "content": msg.content,
                    }
                )

            # Create user message for new query
            if save_to_db:
                user_message = Message(
                    thread_id=thread_id,
                    message_role=MessageRole.USER,
                    content=query,
                    message_metadata={},
                )
                db.add(user_message)
                await db.commit()

            logger.info(
                f"Continuing thread: id={saved_thread_id}, history_length={len(conversation_history)}"
            )

            # Yield thread_id immediately so frontend knows which thread
            yield {
                "type": "start",
                "thread_id": saved_thread_id,
            }

        elif save_to_db and db and user_id and (space_id or organization_id):
            # NEW THREAD: Create thread before streaming
            # This enables immediate navigation to thread page while streaming continues

            # Get organization_id from space if not provided directly
            resolved_org_id = organization_id
            if not resolved_org_id and space_id:
                space_stmt = select(Space.organization_id).where(Space.id == space_id)
                space_result = await db.execute(space_stmt)
                resolved_org_id = space_result.scalar_one()
            elif not resolved_org_id:
                error_msg = "Either organization_id or space_id must be provided"
                raise ValueError(error_msg)

            # Create thread with empty result (will be updated after streaming)
            thread_record = Thread(
                organization_id=resolved_org_id,
                query_text=query,
                space_id=space_id,  # Can be None for org-wide threads
                created_by=user_id,
                result="",  # Empty initially, updated after streaming
                confidence_score=0.0,  # Calculated after streaming
                sources={"citations": [], "count": 0},  # Updated after streaming
                agent_steps={},  # Updated after streaming
            )

            db.add(thread_record)
            await db.commit()
            await db.refresh(thread_record)

            saved_thread_id = str(thread_record.id)

            # Create user message for the query
            user_message = Message(
                thread_id=thread_record.id,
                message_role=MessageRole.USER,
                content=query,
                message_metadata={},
            )
            db.add(user_message)
            await db.commit()

            logger.info(f"Created new thread before streaming: id={saved_thread_id}")

            # Yield thread_id immediately so frontend can navigate
            yield {
                "type": "start",
                "thread_id": saved_thread_id,
            }

        # Step 2: Initialize state with conversation history for multi-turn support
        state: AgentState = {
            "query": query,
            "context": context or [],
            "response": None,
            "citations": [],
            "db": db,
            "space_id": space_id,
            "search_results": None,
            "conversation_history": conversation_history,
        }

        # Step 3: Retrieve context (if not provided)
        if not context:
            state = await retrieve_context(state)

        # Step 4: Stream response generation
        full_response = ""
        async for token in generate_response_streaming(state):
            full_response += token
            yield {"type": "token", "content": token}

        # Step 5: Extract citations
        state["response"] = full_response

        state = await add_citations(state)

        # Step 6: Calculate confidence score
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

        # Step 7: Save assistant message with final results
        if saved_thread_id and db and save_to_db:
            # Create assistant message with the response
            assistant_metadata = {
                "citations": final_citations,
                "confidence_score": confidence_score,
                "context_count": len(state.get("context", [])),
                "search_results_count": len(search_results) if search_results else 0,
            }

            assistant_message = Message(
                thread_id=UUID(saved_thread_id),
                message_role=MessageRole.ASSISTANT,
                content=final_response,
                message_metadata=assistant_metadata,
            )
            db.add(assistant_message)

            # Also update thread record for backward compatibility (legacy fields)
            update_stmt = (
                update(Thread)
                .where(Thread.id == UUID(saved_thread_id))
                .values(
                    result=final_response,
                    confidence_score=confidence_score,
                    sources={"citations": final_citations, "count": len(final_citations)},
                    agent_steps={
                        "context_count": len(state.get("context", [])),
                        "search_results_count": len(search_results) if search_results else 0,
                    },
                )
            )
            await db.execute(update_stmt)
            await db.commit()

            logger.info(
                f"Saved assistant message to thread: id={saved_thread_id}, "
                f"confidence={confidence_score:.3f}, citations={len(final_citations)}"
            )

        # Step 8: Signal completion
        num_sources = len(search_results) if search_results else 0
        yield {
            "type": "done",
            "context_used": len(state["context"]) > 0,
            "num_sources": num_sources,
            "confidence_score": confidence_score,
            "thread_id": saved_thread_id,
        }


# Global service instance
# Initialized on first import for reuse across requests
ai_agent_service = AIAgentService()
