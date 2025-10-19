"""
AI Agent service for query processing and response generation.

Provides a high-level interface for using the LangGraph query agent with
streaming support for real-time responses.
"""

from typing import Any
from collections.abc import AsyncGenerator

from app.agents.query_agent import (
    AgentState,
    create_query_agent,
    generate_response_streaming,
)


class AIAgentService:
    """
    Service for AI agent operations.

    Handles query processing, response generation, and citation extraction
    using the LangGraph query agent.
    """

    def __init__(self) -> None:
        """Initialize the AI agent service with compiled workflow."""
        self.agent = create_query_agent()

    async def process_query(self, query: str, context: list[str] | None = None) -> dict[str, Any]:
        """
        Process a query and return complete response with citations.

        Non-streaming version for simple synchronous usage.

        Args:
            query: User's natural language question
            context: Optional pre-retrieved document chunks

        Returns:
            Dictionary with response and citations

        Example:
            >>> service = AIAgentService()
            >>> result = await service.process_query("What is AI?")
            >>> print(result["response"])
        """
        # Initialize state
        state: AgentState = {
            "query": query,
            "context": context or [],
            "response": None,
            "citations": [],
        }

        # Execute agent workflow
        result = await self.agent.ainvoke(state)

        return {
            "response": result["response"],
            "citations": result["citations"],
            "context_used": len(result["context"]) > 0,
        }

    async def process_query_stream(
        self, query: str, context: list[str] | None = None
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Process query with streaming support for real-time token delivery.

        Yields events as the response is generated, suitable for SSE endpoints.

        Args:
            query: User's natural language question
            context: Optional pre-retrieved document chunks

        Yields:
            Event dictionaries with types: 'token', 'citations', 'done'

        Example:
            >>> service = AIAgentService()
            >>> async for event in service.process_query_stream("What is AI?"):
            ...     if event["type"] == "token":
            ...         print(event["content"], end="", flush=True)
        """
        # Initialize state
        state: AgentState = {
            "query": query,
            "context": context or [],
            "response": None,
            "citations": [],
        }

        # Step 1: Retrieve context (if not provided)
        if not context:
            # Import here to avoid circular imports when vector search is available
            from app.agents.query_agent import retrieve_context

            state = await retrieve_context(state)

        # Step 2: Stream response generation
        full_response = ""
        async for token in generate_response_streaming(state):
            full_response += token
            yield {"type": "token", "content": token}

        # Step 3: Extract citations
        state["response"] = full_response
        from app.agents.query_agent import add_citations

        state = await add_citations(state)

        # Yield citations
        if state["citations"]:
            yield {"type": "citations", "sources": state["citations"]}

        # Signal completion
        yield {
            "type": "done",
            "context_used": len(state["context"]) > 0,
        }


# Global service instance
# Initialized on first import for reuse across requests
ai_agent_service = AIAgentService()
