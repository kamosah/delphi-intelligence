"""
Query processing agent using LangGraph.

This module implements a stateful agent for processing natural language queries
with document context retrieval and citation support.
"""

import re
from typing import Any, TypedDict
from collections.abc import AsyncGenerator

from langchain.schema import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.services.langchain_config import get_llm


class AgentState(TypedDict):
    """
    State for the query processing agent.

    Attributes:
        query: User's natural language question
        context: Retrieved document chunks for context
        response: Generated response from the LLM
        citations: List of source citations with metadata
    """

    query: str
    context: list[str]
    response: str | None
    citations: list[dict[str, Any]]


async def retrieve_context(state: AgentState) -> AgentState:
    """
    Retrieve relevant document chunks for the query.

    This is a placeholder that will be integrated with the vector search service.
    For now, it returns empty context to allow basic agent testing.

    Args:
        state: Current agent state

    Returns:
        Updated state with context
    """
    # TODO: Integrate with vector search service once available
    # query = state["query"]
    # embedding = await embedding_service.generate_embedding(query)
    # results = await vector_search_service.search_similar_chunks(
    #     query_embedding=embedding,
    #     limit=5
    # )
    # state["context"] = [chunk.text for chunk in results]

    # For now, return empty context to allow basic testing
    state["context"] = []
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
        context_text = "\n\n".join(state["context"])
        prompt = f"""You are an AI assistant that answers questions based on provided context.

Context:
{context_text}

Question: {state["query"]}

Please provide a clear and accurate answer based on the context. If the context doesn't contain
enough information, acknowledge this and provide what you can."""
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
        context_text = "\n\n".join(state["context"])
        prompt = f"""You are an AI assistant that answers questions based on provided context.

Context:
{context_text}

Question: {state["query"]}

Please provide a clear and accurate answer based on the context. If the context doesn't contain
enough information, acknowledge this and provide what you can."""
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


def extract_citations(response: str, context: list[str]) -> list[dict[str, Any]]:
    """
    Extract citations from the response.

    This is a simple implementation that looks for references in the response.
    Will be enhanced when integrated with actual document metadata.

    Args:
        response: Generated response text
        context: Context chunks used for generation

    Returns:
        List of citation dictionaries
    """
    citations = []

    # Simple pattern matching for common citation formats
    # e.g., "According to [1]", "As stated in [2]", etc.
    citation_pattern = r"\[(\d+)\]"
    matches = re.findall(citation_pattern, response)

    for match in matches:
        citation_num = int(match)
        if 0 < citation_num <= len(context):
            citations.append(
                {
                    "index": citation_num,
                    "text": context[citation_num - 1],
                    # TODO: Add document metadata when integrated with vector search
                    # "document_id": chunk.document_id,
                    # "page": chunk.page_number,
                }
            )

    return citations


async def add_citations(state: AgentState) -> AgentState:
    """
    Extract and add citations to the agent state.

    Args:
        state: Current agent state

    Returns:
        Updated state with citations
    """
    if state["response"] and state["context"]:
        state["citations"] = extract_citations(state["response"], state["context"])
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
