"""
Query processing agent using LangGraph.

This module implements a stateful agent for processing natural language queries
with document context retrieval and citation support.
"""

import logging
import re
from typing import Any, TypedDict
from uuid import UUID
from collections.abc import AsyncGenerator

from langchain.schema import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.langchain_config import get_llm
from app.services.vector_search_service import SearchResult, get_vector_search_service

logger = logging.getLogger(__name__)


class AgentState(TypedDict, total=False):
    """
    State for the query processing agent.

    Attributes:
        query: User's natural language question
        context: Retrieved document chunks for context (text only)
        response: Generated response from the LLM
        citations: List of source citations with metadata
        db: Database session for vector search (optional)
        space_id: Space ID to filter search results (optional)
        search_results: Full search results with metadata (optional)
    """

    query: str
    context: list[str]
    response: str | None
    citations: list[dict[str, Any]]
    db: AsyncSession | None
    space_id: UUID | None
    search_results: list[SearchResult] | None


async def retrieve_context(state: AgentState) -> AgentState:
    """
    Retrieve relevant document chunks for the query using vector similarity search.

    Uses the vector search service to find the top-k most relevant chunks
    based on semantic similarity to the query.

    Args:
        state: Current agent state with query and optional db/space_id

    Returns:
        Updated state with context and search_results metadata
    """
    query = state["query"]
    db = state.get("db")
    space_id = state.get("space_id")

    # If no database session, return empty context
    if db is None:
        logger.warning("No database session provided, skipping vector retrieval")
        state["context"] = []
        state["search_results"] = []
        return state

    try:
        # Get vector search service
        vector_search = get_vector_search_service()

        # Perform semantic search
        search_results = await vector_search.search_similar_chunks(
            query=query,
            db=db,
            space_id=space_id,
            limit=5,  # Top 5 most relevant chunks
            similarity_threshold=0.3,  # Filter out low-relevance results
        )

        logger.info(
            f"Retrieved {len(search_results)} chunks for query: '{query[:50]}...' "
            f"(space_id={space_id})"
        )

        # Extract text for context and store full results for citation
        state["context"] = [result.chunk.chunk_text for result in search_results]
        state["search_results"] = search_results

        # Log relevance scores
        if search_results:
            scores = [f"{r.similarity_score:.3f}" for r in search_results[:3]]
            logger.debug(f"Top 3 similarity scores: {scores}")

    except Exception as e:
        logger.exception(f"Error during vector retrieval: {e}")
        # Fallback to empty context on error
        state["context"] = []
        state["search_results"] = []

    return state


async def generate_response(state: AgentState) -> AgentState:
    """
    Generate response from LLM based on context and query.

    Non-streaming version for simple execution.

    Args:
        state: Current agent state

    Returns:
        Updated state with generated response
    """
    llm = get_llm(streaming=False)

    # Build prompt with context
    if state["context"]:
        # Number each context chunk for citations
        numbered_contexts = [
            f"[{i+1}] {chunk}" for i, chunk in enumerate(state["context"])
        ]
        context_text = "\n\n".join(numbered_contexts)
        prompt = f"""You are an AI assistant that answers questions based on provided context.

Context (with source numbers):
{context_text}

Question: {state["query"]}

Instructions:
- Provide a clear and accurate answer based on the context above
- When making claims or stating facts, cite the source using [N] notation (e.g., [1], [2])
- If the context doesn't contain enough information, acknowledge this
- Be precise and only use information from the provided context"""
    else:
        prompt = f"""You are an AI assistant. Answer the following question clearly and concisely.

Question: {state["query"]}"""

    # Generate response
    messages = [
        SystemMessage(content="You are a helpful AI assistant."),
        HumanMessage(content=prompt),
    ]

    response = await llm.ainvoke(messages)
    # response.content can be str or list, we only want str
    content = response.content if isinstance(response.content, str) else str(response.content)
    state["response"] = content

    return state


async def generate_response_streaming(state: AgentState) -> AsyncGenerator[str, None]:
    """
    Generate response with streaming support for real-time token delivery.

    This function is used for SSE endpoints to provide progressive response display.

    Args:
        state: Current agent state

    Yields:
        Response tokens as they are generated
    """
    llm = get_llm(streaming=True)

    # Build prompt with context
    if state["context"]:
        # Number each context chunk for citations
        numbered_contexts = [
            f"[{i+1}] {chunk}" for i, chunk in enumerate(state["context"])
        ]
        context_text = "\n\n".join(numbered_contexts)
        prompt = f"""You are an AI assistant that answers questions based on provided context.

Context (with source numbers):
{context_text}

Question: {state["query"]}

Instructions:
- Provide a clear and accurate answer based on the context above
- When making claims or stating facts, cite the source using [N] notation (e.g., [1], [2])
- If the context doesn't contain enough information, acknowledge this
- Be precise and only use information from the provided context"""
    else:
        prompt = f"""You are an AI assistant. Answer the following question clearly and concisely.

Question: {state["query"]}"""

    # Generate streaming response
    messages = [
        SystemMessage(content="You are a helpful AI assistant."),
        HumanMessage(content=prompt),
    ]

    async for chunk in llm.astream(messages):
        if chunk.content:
            # chunk.content can be str or list, we only want str
            content = chunk.content if isinstance(chunk.content, str) else str(chunk.content)
            yield content


def extract_citations(
    response: str,
    context: list[str],
    search_results: list[SearchResult] | None = None,
) -> list[dict[str, Any]]:
    """
    Extract citations from the response with document metadata.

    Matches citation markers in the response (e.g., [1], [2]) to the
    context chunks and enriches them with document metadata from search results.

    Args:
        response: Generated response text
        context: Context chunks used for generation
        search_results: Search results with document metadata (optional)

    Returns:
        List of citation dictionaries with document metadata
    """
    citations = []

    # Simple pattern matching for common citation formats
    # e.g., "According to [1]", "As stated in [2]", etc.
    citation_pattern = r"\[(\d+)\]"
    matches = re.findall(citation_pattern, response)

    for match in matches:
        citation_num = int(match)
        if 0 < citation_num <= len(context):
            citation_data = {
                "index": citation_num,
                "text": context[citation_num - 1],
            }

            # Add rich metadata if search results available
            if search_results and citation_num <= len(search_results):
                result = search_results[citation_num - 1]
                chunk = result.chunk
                document = result.document

                citation_data.update(
                    {
                        "document_id": str(chunk.document_id),
                        "document_title": document.name,
                        "chunk_index": chunk.chunk_index,
                        "similarity_score": round(result.similarity_score, 4),
                        # Extract metadata from chunk
                        "page_number": chunk.chunk_metadata.get("page_num"),
                        "start_char": chunk.start_char,
                        "end_char": chunk.end_char,
                    }
                )

            citations.append(citation_data)

    return citations


async def add_citations(state: AgentState) -> AgentState:
    """
    Extract and add citations to the agent state with document metadata.

    Args:
        state: Current agent state with response, context, and optional search_results

    Returns:
        Updated state with enriched citations
    """
    if state["response"] and state["context"]:
        search_results = state.get("search_results")
        state["citations"] = extract_citations(
            state["response"], state["context"], search_results
        )
        logger.debug(f"Extracted {len(state['citations'])} citations from response")
    else:
        state["citations"] = []

    return state


def create_query_agent() -> CompiledStateGraph:
    """
    Create and compile the query processing agent workflow.

    The agent follows this flow:
    1. Retrieve relevant context from documents
    2. Generate response using LLM
    3. Extract and add citations

    Returns:
        Compiled StateGraph agent ready for execution

    Example:
        >>> agent = create_query_agent()
        >>> result = await agent.ainvoke(
        ...     {
        ...         "query": "What is artificial intelligence?",
        ...         "context": [],
        ...         "response": None,
        ...         "citations": [],
        ...     }
        ... )
        >>> print(result["response"])
    """
    # Create workflow
    workflow = StateGraph(AgentState)

    # Add nodes for each processing step
    workflow.add_node("retrieve", retrieve_context)
    workflow.add_node("generate", generate_response)
    workflow.add_node("cite", add_citations)

    # Define the execution flow
    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "generate")
    workflow.add_edge("generate", "cite")
    workflow.add_edge("cite", END)

    # Compile and return
    return workflow.compile()
