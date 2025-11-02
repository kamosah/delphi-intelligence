"""
Test Configuration and Fixtures

This module provides pytest fixtures for testing with mocked dependencies.
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.query import Query, QueryStatus
from app.models.space import Space
from app.models.user import User


@pytest.fixture()
def mock_user():
    """Create a mock user for testing."""
    user = MagicMock(spec=User)
    user.id = uuid4()
    user.email = "test@example.com"
    user.full_name = "Test User"
    user.is_active = True
    return user


@pytest.fixture()
def mock_space(mock_user):
    """Create a mock space for testing."""
    space = MagicMock(spec=Space)
    space.id = uuid4()
    space.name = "Test Space"
    space.description = "Test space for unit tests"
    space.owner_id = mock_user.id
    space.slug = "test-space"
    return space


@pytest.fixture()
def mock_query(mock_user, mock_space):
    """Create a mock query for testing."""
    query = MagicMock(spec=Query)
    query.id = uuid4()
    query.query_text = "What are the key findings?"
    query.space_id = mock_space.id
    query.created_by = mock_user.id
    query.status = QueryStatus.PENDING
    query.result = None
    query.confidence_score = None
    query.title = None
    query.space = mock_space
    return query


@pytest.fixture()
def mock_db_session():
    """Create a mock database session for testing."""
    session = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.refresh = AsyncMock()
    session.delete = AsyncMock()
    session.flush = AsyncMock()
    session.execute = AsyncMock()
    return session


@pytest.fixture()
def mock_info(mock_user):
    """Create a mock GraphQL info context with authenticated user."""
    mock_request = MagicMock()
    mock_request.state.user = mock_user
    mock_info = MagicMock()
    mock_info.context = {"request": mock_request}
    return mock_info


@pytest.fixture()
def mock_info_no_auth():
    """Create a mock GraphQL info context without authenticated user."""
    mock_request = MagicMock()
    mock_request.state.user = None
    mock_info = MagicMock()
    mock_info.context = {"request": mock_request}
    return mock_info


@pytest.fixture()
async def async_client():
    """Provide an async HTTP client for testing endpoints."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest.fixture()
async def graphql_client(async_client: AsyncClient):
    """Provide a GraphQL client wrapper for testing."""

    class GraphQLClient:
        """Simple GraphQL client for testing."""

        def __init__(self, client: AsyncClient):
            self.client = client

        async def execute(self, query: str, variables: dict | None = None):
            """Execute a GraphQL query."""
            response = await self.client.post(
                "/graphql",
                json={"query": query, "variables": variables or {}},
            )
            return response.json()

    return GraphQLClient(async_client)
