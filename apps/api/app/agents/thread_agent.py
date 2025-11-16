"""
Thread processing agent using LangGraph.

This module implements a stateful agent for processing natural language queries
in conversation threads with document context retrieval and citation support.
"""

import logging
import re
from typing import Any, TypedDict
from uuid import UUID
from collections.abc import AsyncGenerator

import tiktoken
from langchain.schema import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.langchain_config import get_llm
from app.services.vector_search_service import SearchResult, get_vector_search_service

logger = logging.getLogger(__name__)

# Context window management constants
MAX_CONTEXT_WINDOW = (
    8000  # Artificially limited for performance/cost; gpt-4-turbo supports up to 128k
)
MAX_RESPONSE_TOKENS = 2000  # Reserved for response generation
SYSTEM_PROMPT_OVERHEAD = 200  # Estimated tokens for system prompt
FEW_SHOT_OVERHEAD = 400  # Estimated tokens for few-shot examples
QUERY_OVERHEAD = 100  # Estimated average tokens for user query
SAFETY_MARGIN = 200  # Safety buffer to prevent edge cases

# Calculate available token budget for context
MAX_CONTEXT_TOKENS = (
    MAX_CONTEXT_WINDOW
    - MAX_RESPONSE_TOKENS
    - SYSTEM_PROMPT_OVERHEAD
    - FEW_SHOT_OVERHEAD
    - QUERY_OVERHEAD
    - SAFETY_MARGIN
)  # ~5100 tokens available for context


# Enhanced system prompt for document Q&A specialist
SYSTEM_PROMPT = """You are a specialized document intelligence assistant designed to answer questions based on provided document context. Your role is to:

1. **Accuracy First**: Only provide information that is directly supported by the context
2. **Cite Sources**: Always cite your sources using [N] notation (e.g., [1], [2])
3. **Acknowledge Uncertainty**: If the context lacks sufficient information, clearly state this rather than speculating
4. **Be Concise**: Provide clear, direct answers without unnecessary elaboration
5. **Maintain Professionalism**: Use a professional, helpful tone suitable for business and research contexts

When uncertain or when the context doesn't contain relevant information, respond with:
"I don't have enough information in the provided documents to answer this question accurately."

You may suggest what additional information would be needed or recommend refining the question."""

# Few-shot examples for better response quality
FEW_SHOT_EXAMPLES = """
Example 1:
Context: [1] The company's Q4 revenue was $2.5M, representing a 15% increase from Q3.
Question: What was the Q4 revenue?
Answer: The Q4 revenue was $2.5M, which was a 15% increase from Q3 [1].

Example 2:
Context: [1] Our product supports PostgreSQL and MySQL databases. [2] MongoDB integration is planned for Q2 2024.
Question: Does the product support MongoDB?
Answer: MongoDB integration is not currently supported but is planned for Q2 2024 [2]. The product currently supports PostgreSQL and MySQL [1].

Example 3:
Context: [1] The user authentication system uses JWT tokens with a 24-hour expiration.
Question: What is the database backup schedule?
Answer: I don't have enough information in the provided documents to answer this question about database backup schedules. The available context only discusses user authentication [1]."""

# Fallback message when no context is available
NO_CONTEXT_FALLBACK_MESSAGE = """I don't have enough information in the provided documents to answer this question accurately.

This could be because:
- The question requires information not present in the uploaded documents
- The relevant information may be in documents that haven't been uploaded yet
- The question may need to be more specific to find relevant content

Suggestions:
- Try rephrasing your question to be more specific
- Upload additional documents that might contain the relevant information
- Break down complex questions into simpler, more focused queries"""


def count_tokens(text: str, model: str = "gpt-4") -> int:
    """
    Count tokens in a text string using tiktoken.

    Args:
        text: Text to count tokens for
        model: Model name for tokenizer (default: gpt-4)

    Returns:
        Number of tokens in the text
    """
    try:
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    except Exception as e:
        logger.warning(f"Error counting tokens: {e}. Using character-based estimate.")
        # Fallback: rough estimate (4 chars per token)
        return len(text) // 4


def trim_context_to_budget(
    chunks: list[str],
    search_results: list[SearchResult] | None,
    max_tokens: int = MAX_CONTEXT_TOKENS,
) -> tuple[list[str], list[SearchResult] | None]:
    """
    Trim context chunks to fit within token budget.

    Uses adaptive strategy:
    1. Calculate total tokens in all chunks
    2. If over budget, keep highest-relevance chunks (by similarity score)
    3. Trim from lowest-relevance upward until under budget

    Args:
        chunks: List of text chunks
        search_results: Corresponding search results with similarity scores
        max_tokens: Maximum tokens allowed for context

    Returns:
        Tuple of (trimmed_chunks, trimmed_search_results)
    """
    if not chunks:
        return [], search_results

    # Calculate total tokens
    total_tokens = sum(count_tokens(chunk) for chunk in chunks)

    if total_tokens <= max_tokens:
        logger.debug(f"Context within budget: {total_tokens}/{max_tokens} tokens")
        return chunks, search_results

    logger.warning(
        f"Context exceeds budget ({total_tokens}/{max_tokens} tokens). "
        f"Trimming to highest-relevance chunks."
    )

    # Sort chunks by relevance (highest first)
    if search_results:
        # Pair chunks with search results and sort by similarity score
        paired = list(zip(chunks, search_results, strict=True))
        paired.sort(key=lambda x: x[1].similarity_score, reverse=True)

        # Take chunks until budget is reached
        selected_chunks = []
        selected_results = []
        current_tokens = 0

        for chunk, result in paired:
            chunk_tokens = count_tokens(chunk)
            if current_tokens + chunk_tokens <= max_tokens:
                selected_chunks.append(chunk)
                selected_results.append(result)
                current_tokens += chunk_tokens
            else:
                break

        logger.info(
            f"Trimmed context from {len(chunks)} to {len(selected_chunks)} chunks "
            f"({total_tokens} → {current_tokens} tokens)"
        )

        return selected_chunks, selected_results if selected_results else None

    # No search results - trim from end
    selected_chunks = []
    current_tokens = 0

    for chunk in chunks:
        chunk_tokens = count_tokens(chunk)
        if current_tokens + chunk_tokens <= max_tokens:
            selected_chunks.append(chunk)
            current_tokens += chunk_tokens
        else:
            break

    logger.info(
        f"Trimmed context from {len(chunks)} to {len(selected_chunks)} chunks "
        f"({total_tokens} → {current_tokens} tokens)"
    )

    return selected_chunks, None


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
        conversation_history: Previous messages in the conversation for multi-turn support (optional)
    """

    query: str
    context: list[str]
    response: str | None
    citations: list[dict[str, Any]]
    db: AsyncSession | None
    space_id: UUID | None
    search_results: list[SearchResult] | None
    conversation_history: list[dict[str, str]]


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
            similarity_threshold=0.4,  # Filter out low-relevance results (raised from 0.3)
        )

        logger.info(
            f"Retrieved {len(search_results)} chunks for query: '{query[:50]}...' "
            f"(space_id={space_id})"
        )

        # Extract text for context
        context_chunks = [result.chunk.chunk_text for result in search_results]

        # Apply token budget trimming
        trimmed_chunks, trimmed_results = trim_context_to_budget(context_chunks, search_results)

        state["context"] = trimmed_chunks
        state["search_results"] = trimmed_results

        # Log relevance scores
        if trimmed_results:
            scores = [f"{r.similarity_score:.3f}" for r in trimmed_results[:3]]
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
        numbered_contexts = [f"[{i+1}] {chunk}" for i, chunk in enumerate(state["context"])]
        context_text = "\n\n".join(numbered_contexts)

        prompt = f"""{FEW_SHOT_EXAMPLES}

Now, answer the following question based on the context provided:

Context (with source numbers):
{context_text}

Question: {state["query"]}

Instructions:
- Only use information from the context above
- Cite sources using [N] notation
- If information is insufficient, clearly state "I don't have enough information in the provided documents to answer this question accurately."
- Be precise and concise"""
    else:
        # No context available - use consistent fallback message
        prompt = f"""Question: {state["query"]}

{NO_CONTEXT_FALLBACK_MESSAGE}"""

    # Build messages array with conversation history for multi-turn support
    messages: list[BaseMessage] = [SystemMessage(content=SYSTEM_PROMPT)]

    # Add conversation history if present (for multi-turn conversations)
    conversation_history = state.get("conversation_history", [])
    if conversation_history:
        for msg in conversation_history:
            role = msg.get("role")
            msg_content = msg.get("content", "")

            if role == "user":
                messages.append(HumanMessage(content=msg_content))
            elif role == "assistant":
                messages.append(AIMessage(content=msg_content))
            # Skip system messages from history as we already have the system prompt

    # Add current query
    messages.append(HumanMessage(content=prompt))

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
        numbered_contexts = [f"[{i+1}] {chunk}" for i, chunk in enumerate(state["context"])]
        context_text = "\n\n".join(numbered_contexts)

        prompt = f"""{FEW_SHOT_EXAMPLES}

Now, answer the following question based on the context provided:

Context (with source numbers):
{context_text}

Question: {state["query"]}

Instructions:
- Only use information from the context above
- Cite sources using [N] notation
- If information is insufficient, clearly state "I don't have enough information in the provided documents to answer this question accurately."
- Be precise and concise"""
    else:
        # No context available - use consistent fallback message
        prompt = f"""Question: {state["query"]}

{NO_CONTEXT_FALLBACK_MESSAGE}"""

    # Build messages array with conversation history for multi-turn support
    messages: list[BaseMessage] = [SystemMessage(content=SYSTEM_PROMPT)]

    # Add conversation history if present (for multi-turn conversations)
    conversation_history = state.get("conversation_history", [])
    if conversation_history:
        for msg in conversation_history:
            role = msg.get("role")
            content = msg.get("content", "")

            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))
            # Skip system messages from history as we already have the system prompt

    # Add current query
    messages.append(HumanMessage(content=prompt))

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
        state["citations"] = extract_citations(state["response"], state["context"], search_results)
        logger.debug(f"Extracted {len(state['citations'])} citations from response")
    else:
        state["citations"] = []

    return state


def create_thread_agent() -> CompiledStateGraph:
    """
    Create and compile the thread processing agent workflow.

    The agent follows this flow:
    1. Retrieve relevant context from documents
    2. Generate response using LLM
    3. Extract and add citations

    Returns:
        Compiled StateGraph agent ready for execution

    Example:
        >>> agent = create_thread_agent()
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
