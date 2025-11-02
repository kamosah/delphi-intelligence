"""
Query streaming endpoint using Server-Sent Events (SSE).

Provides real-time streaming of AI agent responses with vector search,
citation tracking, and confidence scoring for progressive display in the UI.
"""

import asyncio
import json
import logging
from typing import Annotated
from uuid import UUID
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Query as QueryParam
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.services.ai_agent import ai_agent_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/query", tags=["query-streaming"])

# Timeout configuration for query processing
QUERY_TIMEOUT_SECONDS = 120  # 2 minutes max for query processing


async def generate_sse_events(
    query: str,
    db: AsyncSession,
    space_id: UUID | None = None,
    user_id: UUID | None = None,
    save_to_db: bool = False,
) -> AsyncGenerator[str, None]:
    """
    Generate Server-Sent Events for streaming query responses.

    Includes vector search, citation tracking, confidence scoring, and timeout handling.

    Args:
        query: User's natural language question
        db: Database session for vector search and storage
        space_id: Optional space ID to filter search results
        user_id: Optional user ID for query attribution
        save_to_db: Whether to save query and results to database

    Yields:
        SSE formatted events (data: {...}\\n\\n)
    """
    try:
        # Stream events with hard timeout protection
        async with asyncio.timeout(QUERY_TIMEOUT_SECONDS):
            async for event in ai_agent_service.process_query_stream(
                query=query,
                db=db,
                space_id=space_id,
                user_id=user_id,
                save_to_db=save_to_db,
            ):
                # Format as SSE
                yield f"data: {json.dumps(event)}\n\n"

    except asyncio.TimeoutError:
        logger.error(f"Query timeout after {QUERY_TIMEOUT_SECONDS}s: {query[:100]}")
        error_event = {
            "type": "error",
            "message": f"Query processing timed out after {QUERY_TIMEOUT_SECONDS} seconds. Please try a simpler question or refine your query.",
            "error_code": "TIMEOUT",
        }
        yield f"data: {json.dumps(error_event)}\n\n"

    except Exception as e:
        logger.exception(f"Error during query streaming: {e}")
        # Categorize error for better user feedback
        error_message = str(e)
        error_code = "UNKNOWN"

        if "rate limit" in error_message.lower():
            error_code = "RATE_LIMIT"
            error_message = "API rate limit exceeded. Please wait a moment and try again."
        elif "openai" in error_message.lower() or "api" in error_message.lower():
            error_code = "API_ERROR"
            error_message = "AI service temporarily unavailable. Please try again."
        elif "database" in error_message.lower() or "connection" in error_message.lower():
            error_code = "DATABASE_ERROR"
            error_message = "Database connection error. Please try again."

        error_event = {
            "type": "error",
            "message": error_message,
            "error_code": error_code,
        }
        yield f"data: {json.dumps(error_event)}\n\n"


@router.get("/stream")
async def stream_query_response(
    query: Annotated[str, QueryParam(description="Natural language question to process")],
    db: Annotated[AsyncSession, Depends(get_session)],
    space_id: Annotated[
        UUID | None, QueryParam(description="Space ID to filter search results")
    ] = None,
    user_id: Annotated[UUID | None, QueryParam(description="User ID for query attribution")] = None,
    save_to_db: Annotated[
        bool, QueryParam(description="Save query and results to database")
    ] = False,
) -> StreamingResponse:
    """
    Stream AI agent response using Server-Sent Events with RAG pipeline.

    This endpoint provides real-time token streaming with vector search,
    citation tracking, and confidence scoring for progressive response display.

    The client receives events with the following types:
    - `token`: Individual response tokens as they are generated
    - `citations`: Source citations with document metadata and confidence scores
    - `done`: Completion signal with overall confidence and query ID
    - `error`: Error information if processing fails

    Args:
        query: Natural language question to process
        db: Database session (injected)
        space_id: Optional space ID to filter documents for search
        user_id: Optional user ID for attribution (required if save_to_db=True)
        save_to_db: Whether to save the query and results to database

    Returns:
        StreamingResponse with text/event-stream content type

    Example Usage (JavaScript):
        ```javascript
        const params = new URLSearchParams({
          query: "What are the key risks?",
          space_id: "123e4567-e89b-12d3-a456-426614174000",
          user_id: "456e7890-e89b-12d3-a456-426614174001",
          save_to_db: "true"
        });

        const eventSource = new EventSource(`/api/query/stream?${params}`);

        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);

          switch(data.type) {
            case 'token':
              // Append token to response display
              responseText += data.content;
              break;

            case 'citations':
              // Display source citations with confidence
              renderCitations(data.sources, data.confidence_score);
              break;

            case 'done':
              // Display final confidence and close connection
              console.log('Confidence:', data.confidence_score);
              console.log('Query ID:', data.query_id);
              eventSource.close();
              break;

            case 'error':
              console.error('Error:', data.message);
              eventSource.close();
              break;
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
        };
        ```

    Example Usage (Python):
        ```python
        import httpx

        params = {
            "query": "What are the key risks?",
            "space_id": "123e4567-e89b-12d3-a456-426614174000",
            "save_to_db": True,
        }

        async with httpx.AsyncClient() as client:
            async with client.stream("GET", "/api/query/stream", params=params) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        event_data = json.loads(line[6:])
                        print(event_data)
        ```
    """
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query parameter is required")

    if save_to_db and not user_id:
        raise HTTPException(status_code=400, detail="user_id is required when save_to_db=true")

    return StreamingResponse(
        generate_sse_events(
            query=query,
            db=db,
            space_id=space_id,
            user_id=user_id,
            save_to_db=save_to_db,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable buffering in nginx
        },
    )
