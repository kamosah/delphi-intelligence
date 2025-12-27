"""
Integration tests for SSE thread streaming endpoint.

Tests the /api/thread/stream endpoint including:
- SSE event formatting and delivery
- Timeout handling and error recovery
- Error categorization and messaging
- Authentication and authorization
- Thread parameter validation
"""

import asyncio
import json
from typing import Any
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.auth.dependencies import get_current_user_from_query
from app.db.session import get_session
from app.main import app


class TestThreadStreamEndpoint:
    """Integration tests for SSE streaming endpoint."""

    @pytest.fixture(autouse=True)
    def setup_auth_and_db(self, mock_user, mock_space, mock_db_session):  # noqa: PT004
        """Override authentication and database dependencies for all tests."""

        # Create a mock current user function that returns our test user
        async def mock_get_current_user():
            return {
                "id": str(mock_user.id),
                "email": mock_user.email,
                "role": "member",
            }

        # Smart mock that dynamically matches any organization_id in the request
        async def mock_db_execute(stmt, *args, **kwargs):
            mock_result = AsyncMock()

            # Return space IDs (simulating user has access to all test spaces)
            mock_result.__iter__ = lambda _: iter([(mock_space.id,)])

            return mock_result

        mock_db_session.execute = mock_db_execute

        # Create a mock session generator
        async def mock_get_session():
            yield mock_db_session

        # Override the dependencies
        app.dependency_overrides[get_current_user_from_query] = mock_get_current_user
        app.dependency_overrides[get_session] = mock_get_session

        yield

        # Clean up overrides after test
        app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_successful_thread_streaming(self, async_client: AsyncClient, mock_space) -> None:
        """Test successful SSE streaming with all event types."""
        # Mock AI agent service
        mock_events = [
            {"type": "token", "content": "The"},
            {"type": "token", "content": " answer"},
            {"type": "token", "content": " is"},
            {
                "type": "citations",
                "sources": [
                    {
                        "index": 0,
                        "text": "Source text",
                        "document_id": str(uuid4()),
                        "chunk_index": 0,
                        "similarity_score": 0.85,
                    }
                ],
                "confidence_score": 0.85,
            },
            {
                "type": "done",
                "confidence_score": 0.85,
                "query_id": str(uuid4()),
            },
        ]

        async def mock_stream(*args: Any, **kwargs: Any) -> AsyncGenerator[dict[str, Any], None]:
            for event in mock_events:
                yield event

        with patch(
            "app.routes.thread_stream.ai_agent_service.process_thread_stream"
        ) as mock_process:
            # Return the generator itself, not the result of calling it
            mock_process.side_effect = mock_stream

            # Make streaming request
            params = {
                "query": "What is the answer?",
                "space_id": str(mock_space.id),
                "save_to_db": "false",
            }

            async with async_client.stream("GET", "/api/thread/stream", params=params) as response:
                assert response.status_code == 200
                assert "text/event-stream" in response.headers["content-type"]
                assert response.headers["cache-control"] == "no-cache"
                assert response.headers["connection"] == "keep-alive"

                # Collect all SSE events
                events = []
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        event_data = json.loads(line[6:])
                        events.append(event_data)

        # Verify all events received
        assert len(events) == 5
        assert events[0]["type"] == "token"
        assert events[3]["type"] == "citations"
        assert events[4]["type"] == "done"

    @pytest.mark.asyncio
    async def test_query_timeout_handling(self, async_client: AsyncClient, mock_space) -> None:
        """Test that queries timeout after THREAD_TIMEOUT_SECONDS."""
        # Mock timeout to 2 seconds for faster test
        mock_timeout = 2

        async def slow_stream(*args: Any, **kwargs: Any) -> AsyncGenerator[dict[str, Any], None]:
            # Simulate a query that takes too long
            await asyncio.sleep(mock_timeout + 1)
            yield {"type": "token", "content": "Too late"}

        with (
            patch(
                "app.routes.thread_stream.ai_agent_service.process_thread_stream"
            ) as mock_process,
            patch("app.routes.thread_stream.THREAD_TIMEOUT_SECONDS", mock_timeout),
        ):
            mock_process.side_effect = slow_stream

            params = {
                "query": "Slow query",
                "space_id": str(mock_space.id),
            }

            async with async_client.stream("GET", "/api/thread/stream", params=params) as response:
                events = []
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        event_data = json.loads(line[6:])
                        events.append(event_data)

        # Verify timeout error was sent
        assert len(events) == 1
        error_event = events[0]
        assert error_event["type"] == "error"
        assert error_event["error_code"] == "TIMEOUT"
        assert "timed out" in error_event["message"].lower()
        assert str(mock_timeout) in error_event["message"]

    @pytest.mark.asyncio
    async def test_rate_limit_error_categorization(self, async_client: AsyncClient):
        """Test that rate limit errors are properly categorized."""

        async def rate_limit_stream(*args, **kwargs):
            if False:
                yield  # Make it a generator
            raise Exception("OpenAI rate limit exceeded. Please try again later.")

        with patch(
            "app.routes.thread_stream.ai_agent_service.process_thread_stream"
        ) as mock_process:
            mock_process.side_effect = rate_limit_stream

            params = {"query": "Test query"}

            async with async_client.stream("GET", "/api/thread/stream", params=params) as response:
                events = []
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        event_data = json.loads(line[6:])
                        events.append(event_data)

        # Verify error categorization
        assert len(events) == 1
        error_event = events[0]
        assert error_event["type"] == "error"
        assert error_event["error_code"] == "RATE_LIMIT"
        assert "rate limit" in error_event["message"].lower()

    @pytest.mark.asyncio
    async def test_api_error_categorization(self, async_client: AsyncClient):
        """Test that API errors are properly categorized."""

        async def api_error_stream(*args, **kwargs):
            if False:
                yield  # Make it a generator
            raise Exception("OpenAI API connection failed")

        with patch(
            "app.routes.thread_stream.ai_agent_service.process_thread_stream"
        ) as mock_process:
            mock_process.side_effect = api_error_stream

            params = {"query": "Test query"}

            async with async_client.stream("GET", "/api/thread/stream", params=params) as response:
                events = []
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        event_data = json.loads(line[6:])
                        events.append(event_data)

        # Verify error categorization
        assert len(events) == 1
        error_event = events[0]
        assert error_event["type"] == "error"
        assert error_event["error_code"] == "API_ERROR"
        assert "service" in error_event["message"].lower()

    @pytest.mark.asyncio
    async def test_database_error_categorization(self, async_client: AsyncClient):
        """Test that database errors are properly categorized."""

        async def db_error_stream(*args, **kwargs):
            if False:
                yield  # Make it a generator
            raise Exception("Database connection error: timeout")

        with patch(
            "app.routes.thread_stream.ai_agent_service.process_thread_stream"
        ) as mock_process:
            mock_process.side_effect = db_error_stream

            params = {"query": "Test query"}

            async with async_client.stream("GET", "/api/thread/stream", params=params) as response:
                events = []
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        event_data = json.loads(line[6:])
                        events.append(event_data)

        # Verify error categorization
        assert len(events) == 1
        error_event = events[0]
        assert error_event["type"] == "error"
        assert error_event["error_code"] == "DATABASE_ERROR"
        assert "database" in error_event["message"].lower()

    @pytest.mark.asyncio
    async def test_unknown_error_categorization(self, async_client: AsyncClient):
        """Test that unknown errors are categorized as UNKNOWN."""

        async def unknown_error_stream(*args, **kwargs):
            if False:
                yield  # Make it a generator
            raise Exception("Something unexpected happened")

        with patch(
            "app.routes.thread_stream.ai_agent_service.process_thread_stream"
        ) as mock_process:
            mock_process.side_effect = unknown_error_stream

            params = {"query": "Test query"}

            async with async_client.stream("GET", "/api/thread/stream", params=params) as response:
                events = []
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        event_data = json.loads(line[6:])
                        events.append(event_data)

        # Verify error categorization
        assert len(events) == 1
        error_event = events[0]
        assert error_event["type"] == "error"
        assert error_event["error_code"] == "UNKNOWN"

    @pytest.mark.asyncio
    async def test_missing_query_parameter(self, async_client: AsyncClient):
        """Test validation when query parameter is missing."""
        response = await async_client.get("/api/thread/stream")

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_empty_query_parameter(self, async_client: AsyncClient):
        """Test validation when query parameter is empty."""
        response = await async_client.get("/api/thread/stream", params={"query": ""})

        assert response.status_code == 400
        assert "required" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_save_to_db_without_user_id(self, async_client: AsyncClient):
        """Test that authenticated users can save to database."""
        # With authentication now required, this test verifies save_to_db works
        # The user_id is automatically extracted from the authenticated user
        org_id = uuid4()
        params = {
            "query": "Test query",
            "save_to_db": "true",
            "organization_id": str(org_id),
        }

        async def mock_stream(*args, **kwargs):
            yield {"type": "done", "confidence_score": 0.8}

        async def mock_get_current_org_id(user_id, db):
            return org_id

        with (
            patch(
                "app.routes.thread_stream.ai_agent_service.process_thread_stream"
            ) as mock_process,
            patch(
                "app.routes.thread_stream.OrganizationService.get_current_organization_id",
                side_effect=mock_get_current_org_id,
            ),
        ):
            mock_process.side_effect = mock_stream

            response = await async_client.get("/api/thread/stream", params=params)

            # Should succeed since auth provides user_id
            assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_sse_event_formatting(self, async_client: AsyncClient):
        """Test that SSE events are properly formatted."""
        mock_events = [
            {"type": "token", "content": "Test"},
            {"type": "done", "confidence_score": 0.8},
        ]

        async def mock_stream(*args, **kwargs):
            for event in mock_events:
                yield event

        with patch(
            "app.routes.thread_stream.ai_agent_service.process_thread_stream"
        ) as mock_process:
            mock_process.side_effect = mock_stream

            params = {"query": "Test"}

            async with async_client.stream("GET", "/api/thread/stream", params=params) as response:
                raw_lines = []
                async for line in response.aiter_lines():
                    raw_lines.append(line)

        # Verify SSE format: "data: {json}\n\n"
        assert all(line.startswith("data: ") for line in raw_lines if line)

        # Verify valid JSON in each data line
        for line in raw_lines:
            if line.startswith("data: "):
                json_str = line[6:]
                parsed = json.loads(json_str)
                assert "type" in parsed

    @pytest.mark.asyncio
    async def test_streaming_with_space_filter(self, async_client: AsyncClient):
        """Test that space_id is passed to AI agent service."""
        space_id = uuid4()

        async def mock_stream(*args, **kwargs):
            # Verify space_id was passed
            assert kwargs.get("space_id") == space_id
            yield {"type": "done", "confidence_score": 0.8}

        with patch(
            "app.routes.thread_stream.ai_agent_service.process_thread_stream"
        ) as mock_process:
            mock_process.side_effect = mock_stream

            params = {
                "query": "Test",
                "space_id": str(space_id),
            }

            async with async_client.stream("GET", "/api/thread/stream", params=params) as response:
                async for _ in response.aiter_lines():
                    pass  # Consume stream

        # Mock assertion inside mock_stream verifies space_id was passed

    @pytest.mark.asyncio
    async def test_streaming_with_database_save(self, async_client: AsyncClient, mock_user):
        """Test that save_to_db flag is respected."""
        organization_id = uuid4()

        async def mock_stream(*args, **kwargs):
            # Verify save_to_db was passed
            assert kwargs.get("save_to_db") is True
            # Verify user_id comes from authenticated user (not query param)
            assert kwargs.get("user_id") == mock_user.id
            assert kwargs.get("organization_id") == organization_id
            yield {
                "type": "done",
                "confidence_score": 0.8,
                "query_id": str(uuid4()),
            }

        async def mock_get_current_org_id(user_id, db):
            return organization_id

        with (
            patch(
                "app.routes.thread_stream.ai_agent_service.process_thread_stream"
            ) as mock_process,
            patch(
                "app.routes.thread_stream.OrganizationService.get_current_organization_id",
                side_effect=mock_get_current_org_id,
            ),
        ):
            mock_process.side_effect = mock_stream

            params = {
                "query": "Test",
                "organization_id": str(organization_id),
                "save_to_db": "true",
            }

            async with async_client.stream("GET", "/api/thread/stream", params=params) as response:
                events = []
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        event_data = json.loads(line[6:])
                        events.append(event_data)

        # Verify query_id in done event when save_to_db=true
        done_events = [e for e in events if e["type"] == "done"]
        assert len(done_events) == 1
        assert "query_id" in done_events[0]

    @pytest.mark.asyncio
    async def test_nginx_buffering_disabled(self, async_client: AsyncClient):
        """Test that X-Accel-Buffering header is set to disable nginx buffering."""

        async def mock_stream(*args, **kwargs):
            yield {"type": "done", "confidence_score": 0.8}

        with patch(
            "app.routes.thread_stream.ai_agent_service.process_thread_stream"
        ) as mock_process:
            mock_process.side_effect = mock_stream

            params = {"query": "Test"}

            async with async_client.stream("GET", "/api/thread/stream", params=params) as response:
                # Verify header
                assert response.headers.get("x-accel-buffering") == "no"
                async for _ in response.aiter_lines():
                    pass  # Consume stream
