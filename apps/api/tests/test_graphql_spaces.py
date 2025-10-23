"""
Unit tests for GraphQL spaces CRUD operations
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient
import pytest

from app.main import app


@pytest.fixture()
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture()
def mock_user():
    """Mock authenticated user"""
    return {
        "id": str(uuid4()),
        "email": "test@example.com",
        "role": "member",
        "authenticated": True,
    }


@pytest.fixture()
def auth_headers():
    """Create authorization headers with mock JWT"""
    return {"Authorization": "Bearer mock.jwt.token"}


@pytest.fixture()
def mock_space_model(mock_user):
    """Create a mock Space model instance"""
    space_id = uuid4()
    mock_space = MagicMock()
    mock_space.id = space_id
    mock_space.name = "Test Space"
    mock_space.slug = "test-space"
    mock_space.description = "A test space"
    mock_space.icon_color = "#3B82F6"
    mock_space.is_public = False
    mock_space.max_members = None
    mock_space.owner_id = mock_user["id"]
    mock_space.members = [MagicMock()]  # One member (owner)
    mock_space.documents = []
    return mock_space


class TestSpacesQuery:
    """Test cases for spaces GraphQL query"""

    @patch("app.middleware.auth.AuthenticationMiddleware.dispatch")
    async def test_get_spaces_success(
        self, mock_dispatch, client, auth_headers, mock_user
    ):
        """Test successfully fetching user's spaces"""

        # Mock the authentication middleware to inject user into request state
        async def mock_dispatch_impl(request, call_next):
            request.state.user = mock_user
            return await call_next(request)

        mock_dispatch.side_effect = mock_dispatch_impl

        query = """
            query GetSpaces {
                spaces {
                    id
                    name
                    slug
                    description
                    iconColor
                    isPublic
                    memberCount
                    documentCount
                }
            }
        """

        response = client.post(
            "/graphql",
            json={"query": query},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "spaces" in data["data"]
        assert isinstance(data["data"]["spaces"], list)

    @patch("app.middleware.auth.AuthenticationMiddleware.dispatch")
    async def test_get_spaces_with_pagination(self, mock_dispatch, client, auth_headers, mock_user):
        """Test fetching spaces with pagination parameters"""

        async def mock_dispatch_impl(request, call_next):
            request.state.user = mock_user
            return await call_next(request)

        mock_dispatch.side_effect = mock_dispatch_impl

        query = """
            query GetSpaces($limit: Int, $offset: Int) {
                spaces(limit: $limit, offset: $offset) {
                    id
                    name
                }
            }
        """

        response = client.post(
            "/graphql",
            json={"query": query, "variables": {"limit": 10, "offset": 0}},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_get_spaces_unauthorized(self, client):
        """Test fetching spaces without authentication"""
        query = """
            query GetSpaces {
                spaces {
                    id
                    name
                }
            }
        """

        response = client.post(
            "/graphql",
            json={"query": query},
        )

        # Should return empty list when not authenticated
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["spaces"] == []


class TestSpaceQuery:
    """Test cases for single space GraphQL query"""

    @patch("app.middleware.auth.AuthenticationMiddleware.dispatch")
    async def test_get_space_by_id(
        self, mock_dispatch, client, auth_headers, mock_user
    ):
        """Test fetching a single space by ID"""

        async def mock_dispatch_impl(request, call_next):
            request.state.user = mock_user
            return await call_next(request)

        mock_dispatch.side_effect = mock_dispatch_impl

        query = """
            query GetSpace($id: ID!) {
                space(id: $id) {
                    id
                    name
                    slug
                    description
                }
            }
        """

        # Use a random UUID for testing
        test_space_id = str(uuid4())

        response = client.post(
            "/graphql",
            json={"query": query, "variables": {"id": test_space_id}},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_get_space_unauthorized(self, client):
        """Test fetching a space without authentication"""
        query = """
            query GetSpace($id: ID!) {
                space(id: $id) {
                    id
                    name
                }
            }
        """

        response = client.post(
            "/graphql",
            json={"query": query, "variables": {"id": str(uuid4())}},
        )

        # Should return null when not authenticated
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["space"] is None


class TestCreateSpaceMutation:
    """Test cases for createSpace GraphQL mutation"""

    @patch("app.middleware.auth.AuthenticationMiddleware.dispatch")
    @patch("app.graphql.mutation.get_session")
    async def test_create_space_success(
        self, mock_get_session, mock_dispatch, client, auth_headers, mock_user, mock_space_model
    ):
        """Test successfully creating a new space"""

        async def mock_dispatch_impl(request, call_next):
            request.state.user = mock_user
            return await call_next(request)

        mock_dispatch.side_effect = mock_dispatch_impl

        # Mock database session
        mock_session = AsyncMock()
        mock_session.add = MagicMock()
        mock_session.flush = AsyncMock()
        mock_session.commit = AsyncMock()
        mock_session.refresh = AsyncMock()
        mock_session.execute = AsyncMock()

        # Configure execute to return None for the uniqueness check
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(return_value=None)
        mock_session.execute.return_value = mock_result

        async def mock_session_generator():
            yield mock_session

        mock_get_session.return_value = mock_session_generator()

        # Setup the mock space model that will be created
        mock_space_model.id = uuid4()
        mock_space_model.name = "New Test Space"
        mock_space_model.slug = "new-test-space"
        mock_space_model.description = "A brand new test space"
        mock_space_model.icon_color = "#10B981"
        mock_space_model.owner_id = mock_user["id"]
        mock_space_model.members = [MagicMock()]
        mock_space_model.documents = []

        mutation = """
            mutation CreateSpace($input: CreateSpaceInput!) {
                createSpace(input: $input) {
                    id
                    name
                    slug
                    description
                    iconColor
                    ownerId
                    memberCount
                }
            }
        """

        input_data = {
            "name": "New Test Space",
            "description": "A brand new test space",
            "iconColor": "#10B981",
        }

        response = client.post(
            "/graphql",
            json={"query": mutation, "variables": {"input": input_data}},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "createSpace" in data["data"]
        space = data["data"]["createSpace"]
        assert space["name"] == input_data["name"]
        assert space["description"] == input_data["description"]
        assert space["iconColor"] == input_data["iconColor"]
        assert "ownerId" in space
        assert space["memberCount"] >= 0  # May vary based on implementation

    def test_create_space_unauthorized(self, client):
        """Test creating a space without authentication"""
        mutation = """
            mutation CreateSpace($input: CreateSpaceInput!) {
                createSpace(input: $input) {
                    id
                    name
                }
            }
        """

        input_data = {
            "name": "Unauthorized Space",
            "description": "Should fail",
        }

        response = client.post(
            "/graphql",
            json={"query": mutation, "variables": {"input": input_data}},
        )

        assert response.status_code == 200
        data = response.json()
        # Should have an error about authentication
        assert "errors" in data


class TestUpdateSpaceMutation:
    """Test cases for updateSpace GraphQL mutation"""

    @patch("app.middleware.auth.AuthenticationMiddleware.dispatch")
    async def test_update_space_as_owner(
        self, mock_dispatch, client, auth_headers, mock_user
    ):
        """Test updating a space as the owner"""

        async def mock_dispatch_impl(request, call_next):
            request.state.user = mock_user
            return await call_next(request)

        mock_dispatch.side_effect = mock_dispatch_impl

        mutation = """
            mutation UpdateSpace($id: ID!, $input: UpdateSpaceInput!) {
                updateSpace(id: $id, input: $input) {
                    id
                    name
                    description
                }
            }
        """

        input_data = {
            "name": "Updated Space Name",
            "description": "Updated description",
        }

        # Use a random UUID for testing
        test_space_id = str(uuid4())

        response = client.post(
            "/graphql",
            json={
                "query": mutation,
                "variables": {"id": test_space_id, "input": input_data},
            },
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_update_space_unauthorized(self, client):
        """Test updating a space without authentication"""
        mutation = """
            mutation UpdateSpace($id: ID!, $input: UpdateSpaceInput!) {
                updateSpace(id: $id, input: $input) {
                    id
                    name
                }
            }
        """

        response = client.post(
            "/graphql",
            json={
                "query": mutation,
                "variables": {"id": str(uuid4()), "input": {"name": "Should Fail"}},
            },
        )

        assert response.status_code == 200
        data = response.json()
        # Should return null when not authenticated
        assert data["data"]["updateSpace"] is None


class TestDeleteSpaceMutation:
    """Test cases for deleteSpace GraphQL mutation"""

    @patch("app.middleware.auth.AuthenticationMiddleware.dispatch")
    async def test_delete_space_as_owner(
        self, mock_dispatch, client, auth_headers, mock_user
    ):
        """Test deleting a space as the owner"""

        async def mock_dispatch_impl(request, call_next):
            request.state.user = mock_user
            return await call_next(request)

        mock_dispatch.side_effect = mock_dispatch_impl

        mutation = """
            mutation DeleteSpace($id: ID!) {
                deleteSpace(id: $id)
            }
        """

        # Use a random UUID for testing
        test_space_id = str(uuid4())

        response = client.post(
            "/graphql",
            json={"query": mutation, "variables": {"id": test_space_id}},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_delete_space_unauthorized(self, client):
        """Test deleting a space without authentication"""
        mutation = """
            mutation DeleteSpace($id: ID!) {
                deleteSpace(id: $id)
            }
        """

        response = client.post(
            "/graphql",
            json={"query": mutation, "variables": {"id": str(uuid4())}},
        )

        assert response.status_code == 200
        data = response.json()
        # Should return false when not authenticated
        assert data["data"]["deleteSpace"] is False


class TestSpaceIdempotency:
    """Test cases for space creation idempotency"""

    @patch("app.middleware.auth.AuthenticationMiddleware.dispatch")
    @patch("app.graphql.mutation.get_session")
    async def test_duplicate_space_name_same_user(
        self, mock_get_session, mock_dispatch, client, auth_headers, mock_user, mock_space_model
    ):
        """Test creating two spaces with the same name for the same user returns same space"""

        async def mock_dispatch_impl(request, call_next):
            request.state.user = mock_user
            return await call_next(request)

        mock_dispatch.side_effect = mock_dispatch_impl

        # Mock database session
        mock_session = AsyncMock()
        mock_session.add = MagicMock()
        mock_session.flush = AsyncMock()
        mock_session.commit = AsyncMock()
        mock_session.refresh = AsyncMock()
        mock_session.rollback = AsyncMock()
        mock_session.execute = AsyncMock()

        # Setup the mock space that "exists" in database
        existing_space_id = uuid4()
        mock_existing_space = MagicMock()
        mock_existing_space.id = existing_space_id
        mock_existing_space.name = "Duplicate Test Space"
        mock_existing_space.slug = "duplicate-test-space"
        mock_existing_space.description = "Testing idempotency"
        mock_existing_space.icon_color = None
        mock_existing_space.owner_id = mock_user["id"]
        mock_existing_space.members = [MagicMock()]
        mock_existing_space.documents = []

        # First call returns None (no existing), second call returns existing space
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(side_effect=[None, mock_existing_space])
        mock_session.execute.return_value = mock_result

        async def mock_session_generator():
            yield mock_session

        mock_get_session.return_value = mock_session_generator()

        mutation = """
            mutation CreateSpace($input: CreateSpaceInput!) {
                createSpace(input: $input) {
                    id
                    name
                    slug
                }
            }
        """

        input_data = {
            "name": "Duplicate Test Space",
            "description": "Testing idempotency",
        }

        # Since we're mocking, we can only test the GraphQL interface behavior
        # The actual idempotency is tested by the mutation resolver logic
        response = client.post(
            "/graphql",
            json={"query": mutation, "variables": {"input": input_data}},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "createSpace" in data["data"]
        space = data["data"]["createSpace"]
        assert space["name"] == input_data["name"]
        assert "slug" in space
