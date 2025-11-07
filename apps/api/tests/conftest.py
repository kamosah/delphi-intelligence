"""
Test Configuration and Fixtures

This module provides pytest fixtures for testing with mocked dependencies.
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember, OrganizationRole
from app.models.space import Space
from app.models.thread import Thread, ThreadStatus
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
def mock_organization(mock_user):
    """Create a mock organization for testing."""
    org = MagicMock(spec=Organization)
    org.id = uuid4()
    org.name = "Test Organization"
    org.slug = "test-org"
    org.description = "Test organization for unit tests"
    org.owner_id = mock_user.id
    org.owner = mock_user
    return org


@pytest.fixture()
def mock_organization_member(mock_organization, mock_user):
    """Create a mock organization member for testing."""
    member = MagicMock(spec=OrganizationMember)
    member.id = uuid4()
    member.organization_id = mock_organization.id
    member.user_id = mock_user.id
    member.organization_role = OrganizationRole.OWNER
    member.organization = mock_organization
    member.user = mock_user
    return member


@pytest.fixture()
def mock_space(mock_user, mock_organization):
    """Create a mock space for testing."""
    space = MagicMock(spec=Space)
    space.id = uuid4()
    space.name = "Test Space"
    space.description = "Test space for unit tests"
    space.owner_id = mock_user.id
    space.organization_id = mock_organization.id
    space.slug = "test-space"
    space.organization = mock_organization
    return space


@pytest.fixture()
def mock_thread(mock_user, mock_organization, mock_space):
    """Create a mock thread (space-scoped) for testing."""
    thread = MagicMock(spec=Thread)
    thread.id = uuid4()
    thread.query_text = "What are the key findings?"
    thread.organization_id = mock_organization.id
    thread.space_id = mock_space.id
    thread.created_by = mock_user.id
    thread.status = ThreadStatus.PENDING
    thread.result = None
    thread.confidence_score = None
    thread.title = None
    thread.organization = mock_organization
    thread.space = mock_space
    thread.creator = mock_user
    return thread


@pytest.fixture()
def mock_org_thread(mock_user, mock_organization):
    """Create a mock org-wide thread (no space) for testing."""
    thread = MagicMock(spec=Thread)
    thread.id = uuid4()
    thread.query_text = "Org-wide query across all spaces"
    thread.organization_id = mock_organization.id
    thread.space_id = None  # Org-wide thread
    thread.created_by = mock_user.id
    thread.status = ThreadStatus.PENDING
    thread.result = None
    thread.confidence_score = None
    thread.title = "Org-Wide Thread"
    thread.organization = mock_organization
    thread.space = None
    thread.creator = mock_user
    return thread


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
def mock_get_session(mock_db_session):
    """Create a mock get_session generator for patching."""

    async def _mock_get_session():
        yield mock_db_session

    return _mock_get_session


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
