"""
Test Configuration and Fixtures

This module provides pytest fixtures for testing.
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.main import app
from app.models.space import Space
from app.models.user import User


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    import asyncio

    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture()
async def async_session():
    """Provide an async database session for tests."""
    async for session in get_session():
        yield session
        await session.rollback()


@pytest.fixture()
async def async_client():
    """Provide an async HTTP client for testing endpoints."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture()
async def test_user(async_session: AsyncSession):
    """Create a test user."""
    user = User(
        id=uuid4(),
        email="test@example.com",
        hashed_password="hashed_password",
        full_name="Test User",
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


@pytest.fixture()
async def test_space(async_session: AsyncSession, test_user: User):
    """Create a test space."""
    space = Space(
        id=uuid4(),
        name="Test Space",
        description="Test space for unit tests",
        owner_id=test_user.id,
    )
    async_session.add(space)
    await async_session.commit()
    await async_session.refresh(space)
    return space


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
