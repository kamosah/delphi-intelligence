"""
Thread streaming endpoint using Server-Sent Events (SSE).

Provides real-time streaming of AI agent responses in conversation threads
with vector search, citation tracking, and confidence scoring for progressive display in the UI.
"""

import asyncio
import json
import logging
from typing import Annotated, Any
from uuid import UUID
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Query as QueryParam
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.session import get_session
from app.models.space import Space as SpaceModel, SpaceMember as SpaceMemberModel
from app.services.ai_agent import ai_agent_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/thread", tags=["thread-streaming"])

# Timeout configuration for thread processing
THREAD_TIMEOUT_SECONDS = 120  # 2 minutes max for thread processing


async def generate_sse_events(
    query: str,
    db: AsyncSession,
    organization_id: UUID | None = None,
    space_id: UUID | None = None,
    mentioned_space_ids: list[UUID] | None = None,
    user_id: UUID | None = None,
    save_to_db: bool = False,
    thread_id: UUID | None = None,
) -> AsyncGenerator[str, None]:
    """
    Generate Server-Sent Events for streaming query responses.

    Supports both new threads and continuation of existing multi-turn conversations.
    Includes vector search, citation tracking, confidence scoring, and timeout handling.

    Args:
        query: User's natural language question
        db: Database session for vector search and storage
        organization_id: Optional organization ID (required if save_to_db=True and space_id not provided for new threads)
        space_id: Optional space ID to filter search results
        mentioned_space_ids: Optional list of space IDs from #space mentions (for weighted RAG search)
        user_id: Optional user ID for query attribution
        save_to_db: Whether to save query and results to database
        thread_id: Optional existing thread ID for multi-turn conversation continuation

    Yields:
        SSE formatted events (data: {...}\\n\\n)
    """
    try:
        # Stream events with hard timeout protection
        async with asyncio.timeout(THREAD_TIMEOUT_SECONDS):
            async for event in ai_agent_service.process_thread_stream(
                query=query,
                db=db,
                organization_id=organization_id,
                space_id=space_id,
                mentioned_space_ids=mentioned_space_ids,
                user_id=user_id,
                save_to_db=save_to_db,
                thread_id=thread_id,
            ):
                # Format as SSE
                yield f"data: {json.dumps(event)}\n\n"

    except TimeoutError:
        logger.exception(f"Thread timeout after {THREAD_TIMEOUT_SECONDS}s: {query[:100]}")
        error_event = {
            "type": "error",
            "message": f"Thread processing timed out after {THREAD_TIMEOUT_SECONDS} seconds. Please try asking a simpler question or refine your query for better results.",
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
async def stream_thread_response(
    query: Annotated[str, QueryParam(description="Natural language question to process in thread")],
    db: Annotated[AsyncSession, Depends(get_session)],
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    organization_id: Annotated[
        UUID | None,
        QueryParam(
            description="Organization ID (required for new threads if save_to_db=true and space_id not provided)"
        ),
    ] = None,
    space_id: Annotated[
        UUID | None, QueryParam(description="Space ID to filter search results")
    ] = None,
    mentioned_space_ids: Annotated[
        str | None,
        QueryParam(
            description="Comma-separated list of space IDs from #space mentions (for weighted RAG search)"
        ),
    ] = None,
    save_to_db: Annotated[
        bool, QueryParam(description="Save thread and results to database")
    ] = False,
    thread_id: Annotated[
        UUID | None,
        QueryParam(description="Existing thread ID for multi-turn conversation continuation"),
    ] = None,
) -> StreamingResponse:
    """
    Stream AI agent response for conversation threads using Server-Sent Events with RAG pipeline.

    **Authentication Required**: This endpoint requires a valid Bearer token in the Authorization header.

    This endpoint provides real-time token streaming with vector search,
    citation tracking, and confidence scoring for progressive response display.

    The client receives events with the following types:
    - `token`: Individual response tokens as they are generated
    - `citations`: Source citations with document metadata and confidence scores
    - `done`: Completion signal with overall confidence and thread ID
    - `error`: Error information if processing fails

    Args:
        query: Natural language question to process
        db: Database session (injected)
        current_user: Authenticated user (injected via JWT token)
        organization_id: Optional organization ID (required for new threads if save_to_db=true and space_id not provided)
        space_id: Optional space ID to filter documents for search (requires user access)
        mentioned_space_ids: Comma-separated space IDs from #space mentions (requires user access to all)
        save_to_db: Whether to save the thread and results to database
        thread_id: Optional existing thread ID for multi-turn conversation

    Returns:
        StreamingResponse with text/event-stream content type

    Raises:
        HTTPException 401: Invalid or missing authentication token
        HTTPException 403: User lacks access to specified spaces
        HTTPException 400: Invalid parameters

    Example Usage (JavaScript):
        ```javascript
        const params = new URLSearchParams({
          query: "What are the key risks?",
          space_id: "123e4567-e89b-12d3-a456-426614174000",
          user_id: "456e7890-e89b-12d3-a456-426614174001",
          save_to_db: "true"
        });

        const eventSource = new EventSource(`/api/thread/stream?${params}`);

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

    # Extract user ID from authenticated user
    user_id_uuid = UUID(current_user["id"])

    # For new threads (no thread_id), require organization_id or space_id
    if save_to_db and not thread_id and not space_id and not organization_id:
        raise HTTPException(
            status_code=400,
            detail="Either space_id or organization_id is required for new threads when save_to_db=true",
        )

    # Parse mentioned_space_ids from comma-separated string to list of UUIDs
    mentioned_space_ids_list: list[UUID] | None = None
    if mentioned_space_ids and mentioned_space_ids.strip():
        invalid_space_ids = []
        valid_space_ids = []
        for sid in mentioned_space_ids.split(","):
            sid_stripped = sid.strip()
            if not sid_stripped:
                continue
            try:
                valid_space_ids.append(UUID(sid_stripped))
            except ValueError:
                invalid_space_ids.append(sid_stripped)

        if invalid_space_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid mentioned_space_ids format. The following IDs are not valid UUIDs: {', '.join(invalid_space_ids)}",
            )

        mentioned_space_ids_list = valid_space_ids if valid_space_ids else None

    # Authorization: Verify user has access to all mentioned spaces AND thread space
    spaces_to_check = set(mentioned_space_ids_list) if mentioned_space_ids_list else set()
    if space_id:
        spaces_to_check.add(space_id)

    if spaces_to_check:
        # Query user's accessible spaces via space_member table
        accessible_space_ids_result = await db.execute(
            select(SpaceModel.id)
            .join(SpaceMemberModel)
            .where(SpaceMemberModel.user_id == user_id_uuid)
        )
        accessible_space_ids = {row[0] for row in accessible_space_ids_result}

        # Check for unauthorized access
        unauthorized_spaces = spaces_to_check - accessible_space_ids
        if unauthorized_spaces:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied to spaces: {unauthorized_spaces}",
            )

    return StreamingResponse(
        generate_sse_events(
            query=query,
            db=db,
            organization_id=organization_id,
            space_id=space_id,
            mentioned_space_ids=mentioned_space_ids_list,
            user_id=user_id_uuid,
            save_to_db=save_to_db,
            thread_id=thread_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable buffering in nginx
        },
    )
