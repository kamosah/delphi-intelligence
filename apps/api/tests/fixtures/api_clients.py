"""API client abstractions for testing.

This module provides reusable, type-safe HTTP clients for testing:
- GraphQLClient: Execute GraphQL queries with typed responses
- RESTClient: Standard REST API calls with authentication
- SSEClient: Server-Sent Events streaming support
"""

import json
from dataclasses import dataclass
from typing import Any, Generic, TypeVar

from httpx import AsyncClient
from httpx_sse import aconnect_sse

T = TypeVar("T")


@dataclass
class GraphQLResponse(Generic[T]):
    """Typed GraphQL response wrapper.

    Attributes:
        data: Query/mutation result data (None if errors occurred)
        errors: List of GraphQL errors (None if successful)
    """

    data: T | None
    errors: list[dict[str, Any]] | None


class GraphQLClient:
    """GraphQL client for testing with typed responses and error handling.

    Usage:
        async def test_query(graphql_client):
            response = await graphql_client.execute_expecting_data(
                query='{ me { id email } }',
            )
            assert response["me"]["email"] == "test@example.com"
    """

    def __init__(self, client: AsyncClient) -> None:
        """Initialize GraphQL client.

        Args:
            client: Authenticated HTTPX AsyncClient instance
        """
        self.client = client

    async def execute(
        self, query: str, variables: dict[str, Any] | None = None
    ) -> GraphQLResponse[dict[str, Any]]:
        """Execute GraphQL query and return typed response.

        Args:
            query: GraphQL query or mutation string
            variables: Optional query variables

        Returns:
            GraphQLResponse with data and/or errors
        """
        response = await self.client.post(
            "/graphql",
            json={"query": query, "variables": variables or {}},
        )
        result = response.json()
        return GraphQLResponse(
            data=result.get("data"),
            errors=result.get("errors"),
        )

    async def execute_expecting_data(
        self, query: str, variables: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Execute query and assert no errors occurred.

        Args:
            query: GraphQL query or mutation string
            variables: Optional query variables

        Returns:
            Query data (guaranteed to be non-None)

        Raises:
            AssertionError: If GraphQL errors occurred or data is None
        """
        response = await self.execute(query, variables)
        assert response.errors is None, f"GraphQL errors: {response.errors}"
        assert response.data is not None, "GraphQL data is None"
        return response.data

    async def execute_expecting_error(
        self,
        query: str,
        variables: dict[str, Any] | None = None,
        match: str | None = None,
    ) -> list[dict[str, Any]]:
        """Execute query and assert errors exist.

        Args:
            query: GraphQL query or mutation string
            variables: Optional query variables
            match: Optional substring to match in error messages

        Returns:
            List of GraphQL errors (guaranteed to be non-empty)

        Raises:
            AssertionError: If no errors occurred or match string not found
        """
        response = await self.execute(query, variables)
        assert response.errors is not None, "Expected GraphQL errors but got none"
        if match:
            error_messages = " ".join(str(err) for err in response.errors)
            assert match in error_messages, f"Expected '{match}' in errors, got: {error_messages}"
        return response.errors


class RESTClient:
    """REST API client for testing with authentication support.

    Usage:
        async def test_endpoint(rest_client):
            response = await rest_client.get("/api/users/me")
            assert response.status_code == 200
    """

    def __init__(self, client: AsyncClient) -> None:
        """Initialize REST client.

        Args:
            client: Authenticated HTTPX AsyncClient instance
        """
        self.client = client

    async def get(self, url: str, **kwargs: Any) -> Any:
        """HTTP GET request.

        Args:
            url: Endpoint URL
            **kwargs: Additional request parameters

        Returns:
            HTTPX Response object
        """
        return await self.client.get(url, **kwargs)

    async def post(self, url: str, **kwargs: Any) -> Any:
        """HTTP POST request.

        Args:
            url: Endpoint URL
            **kwargs: Additional request parameters

        Returns:
            HTTPX Response object
        """
        return await self.client.post(url, **kwargs)

    async def put(self, url: str, **kwargs: Any) -> Any:
        """HTTP PUT request.

        Args:
            url: Endpoint URL
            **kwargs: Additional request parameters

        Returns:
            HTTPX Response object
        """
        return await self.client.put(url, **kwargs)

    async def patch(self, url: str, **kwargs: Any) -> Any:
        """HTTP PATCH request.

        Args:
            url: Endpoint URL
            **kwargs: Additional request parameters

        Returns:
            HTTPX Response object
        """
        return await self.client.patch(url, **kwargs)

    async def delete(self, url: str, **kwargs: Any) -> Any:
        """HTTP DELETE request.

        Args:
            url: Endpoint URL
            **kwargs: Additional request parameters

        Returns:
            HTTPX Response object
        """
        return await self.client.delete(url, **kwargs)


@dataclass
class SSEEvent:
    """Server-Sent Event data wrapper.

    Attributes:
        event: Event type (e.g., "message", "error")
        data: Event payload as string
        id: Optional event ID
        retry: Optional reconnection time in milliseconds
    """

    event: str
    data: str
    id: str | None
    retry: int | None

    def json(self) -> dict[str, Any]:
        """Parse JSON data from event payload.

        Returns:
            Parsed JSON data

        Raises:
            json.JSONDecodeError: If data is not valid JSON
        """
        result: dict[str, Any] = json.loads(self.data)
        return result


class SSEClient:
    """Server-Sent Events client for testing streaming endpoints.

    Usage:
        async def test_streaming(sse_client):
            events = await sse_client.stream_events(
                "/api/threads/123/stream",
                max_events=5,
            )
            assert len(events) == 5
            assert events[0].event == "chunk"
    """

    def __init__(self, client: AsyncClient) -> None:
        """Initialize SSE client.

        Args:
            client: Authenticated HTTPX AsyncClient instance
        """
        self.client = client

    async def stream_events(
        self,
        url: str,
        max_events: int | None = None,
        timeout_seconds: float = 30.0,
    ) -> list[SSEEvent]:
        """Collect Server-Sent Events from a stream.

        Args:
            url: SSE endpoint URL
            max_events: Optional limit on number of events to collect
            timeout_seconds: Timeout in seconds (default: 30.0)

        Returns:
            List of SSEEvent objects collected from stream

        Raises:
            httpx.TimeoutException: If stream times out
        """
        events: list[SSEEvent] = []
        async with aconnect_sse(self.client, "GET", url, timeout=timeout_seconds) as event_source:
            async for sse in event_source.aiter_sse():
                events.append(
                    SSEEvent(
                        event=sse.event,
                        data=sse.data,
                        id=sse.id,
                        retry=sse.retry,
                    )
                )
                if max_events and len(events) >= max_events:
                    break
        return events
