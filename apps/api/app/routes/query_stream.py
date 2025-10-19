"""
Query streaming endpoint using Server-Sent Events (SSE).

Provides real-time streaming of AI agent responses for progressive display in the UI.
"""

import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.services.ai_agent import ai_agent_service

router = APIRouter(prefix="/api/query", tags=["query-streaming"])


async def generate_sse_events(query: str) -> AsyncGenerator[str, None]:
    """
    Generate Server-Sent Events for streaming query responses.

    Args:
        query: User's natural language question

    Yields:
        SSE formatted events (data: {...}\\n\\n)
    """
    try:
        async for event in ai_agent_service.process_query_stream(query):
            # Format as SSE
            yield f"data: {json.dumps(event)}\n\n"

    except Exception as e:
        # Send error event
        error_event = {
            "type": "error",
            "message": str(e),
        }
        yield f"data: {json.dumps(error_event)}\n\n"


@router.get("/stream")
async def stream_query_response(
    query: str = Query(..., description="Natural language question to process"),
) -> StreamingResponse:
    """
    Stream AI agent response using Server-Sent Events.

    This endpoint provides real-time token streaming for progressive response display.
    The client receives events with the following types:

    - `token`: Individual response tokens as they are generated
    - `citations`: Source citations after response generation
    - `done`: Completion signal
    - `error`: Error information if processing fails

    Args:
        query: Natural language question to process

    Returns:
        StreamingResponse with text/event-stream content type

    Example Usage (JavaScript):
        ```javascript
        const eventSource = new EventSource(`/api/query/stream?query=${encodeURIComponent(query)}`);

        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);

          switch(data.type) {
            case 'token':
              // Append token to response display
              responseText += data.content;
              break;

            case 'citations':
              // Display source citations
              renderCitations(data.sources);
              break;

            case 'done':
              // Close connection
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

        async with httpx.AsyncClient() as client:
            async with client.stream("GET", f"/api/query/stream?query={query}") as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        event_data = json.loads(line[6:])
                        print(event_data)
        ```
    """
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query parameter is required")

    return StreamingResponse(
        generate_sse_events(query),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable buffering in nginx
        },
    )
