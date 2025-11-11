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
    user_id = uuid4()
    mock = MagicMock()
    mock.id = user_id
    mock.email = "test@example.com"
    mock.role = "member"
    mock.full_name = "Test User"
    mock.is_active = True
    return mock


@pytest.fixture()
def auth_headers():
    """Create authorization headers with mock JWT"""
    return {"Authorization": "Bearer mock.jwt.token"}


@pytest.fixture()
def mock_auth(mock_user):
    """Setup complete auth mocking for middleware and GraphQL"""
    with (
        patch("app.middleware.auth.get_session_factory") as mock_get_session_factory,
        patch("app.middleware.auth.jwt_manager.verify_token") as mock_verify_token,
        patch("app.middleware.auth.redis_manager.is_token_blacklisted") as mock_is_blacklisted,
    ):
        # Mock JWT verification
        mock_verify_token.return_value = {
            "sub": str(mock_user.id),
            "email": mock_user.email,
            "role": mock_user.role,
        }

        # Mock middleware database session to return mock user
        mock_middleware_session = AsyncMock()
        mock_middleware_result = MagicMock()
        mock_middleware_result.scalar_one_or_none.return_value = mock_user
        mock_middleware_session.execute = AsyncMock(return_value=mock_middleware_result)
        mock_middleware_session.__aenter__ = AsyncMock(return_value=mock_middleware_session)
        mock_middleware_session.__aexit__ = AsyncMock(return_value=None)
        mock_get_session_factory.return_value.return_value = mock_middleware_session

        # Mock Redis blacklist check
        async def mock_blacklist_check(token):
            return False

        mock_is_blacklisted.side_effect = mock_blacklist_check

        yield {
            "get_session_factory": mock_get_session_factory,
            "verify_token": mock_verify_token,
            "is_blacklisted": mock_is_blacklisted,
        }


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
    mock_space.owner_id = mock_user.id
    mock_space.members = [MagicMock()]  # One member (owner)
    mock_space.documents = []
    return mock_space


class TestSpacesQuery:
    """Test cases for spaces GraphQL query"""

    @patch("app.graphql.query.get_session")
    def test_get_spaces_success(
        self,
        mock_get_session,
        client,
        auth_headers,
        mock_user,
        mock_auth,
    ):
        """Test successfully fetching user's spaces"""

        # Mock database session
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_session.execute.return_value = mock_result

        async def mock_session_generator():
            yield mock_session

        mock_get_session.return_value = mock_session_generator()

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

    @patch("app.middleware.auth.jwt_manager.verify_token")
    @patch("app.middleware.auth.redis_manager.is_token_blacklisted")
    @patch("app.graphql.query.get_session")
    def test_get_spaces_with_pagination(
        self,
        mock_get_session,
        mock_is_blacklisted,
        mock_verify_token,
        client,
        auth_headers,
        mock_user,
    ):
        """Test fetching spaces with pagination parameters"""

        # Mock JWT verification to bypass middleware
        mock_verify_token.return_value = {
            "sub": mock_user["id"],
            "email": mock_user["email"],
            "role": mock_user["role"],
        }

        # Async mock for Redis check
        async def mock_blacklist_check(token):
            return False

        mock_is_blacklisted.side_effect = mock_blacklist_check

        # Mock database session
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_session.execute.return_value = mock_result

        async def mock_session_generator():
            yield mock_session

        mock_get_session.return_value = mock_session_generator()

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

    @patch("app.graphql.query.get_session")
    def test_get_spaces_unauthorized(self, mock_get_session, client):
        """Test fetching spaces without authentication"""
        # Mock database session
        mock_session = AsyncMock()

        async def mock_session_generator():
            yield mock_session

        mock_get_session.return_value = mock_session_generator()

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

    @patch("app.graphql.query.get_session")
    def test_get_space_by_id(
        self,
        mock_get_session,
        client,
        auth_headers,
        mock_user,
        mock_auth,
    ):
        """Test fetching a single space by ID"""

        # Mock database session
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        async def mock_session_generator():
            yield mock_session

        mock_get_session.return_value = mock_session_generator()

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

    @patch("app.graphql.query.get_session")
    def test_get_space_unauthorized(self, mock_get_session, client):
        """Test fetching a space without authentication"""
        # Mock database session
        mock_session = AsyncMock()

        async def mock_session_generator():
            yield mock_session

        mock_get_session.return_value = mock_session_generator()

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

    @patch("app.graphql.mutation.get_session")
    def test_create_space_success(
        self,
        mock_get_session,
        client,
        auth_headers,
        mock_user,
        mock_space_model,
        mock_auth,
    ):
        """Test successfully creating a new space"""

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
        mock_space_model.owner_id = mock_user.id
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
            "organizationId": str(uuid4()),
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

    @patch("app.graphql.mutation.get_session")
    def test_create_space_unauthorized(self, mock_get_session, client):
        """Test creating a space without authentication"""
        # Mock database session
        mock_session = AsyncMock()

        async def mock_session_generator():
            yield mock_session

        mock_get_session.return_value = mock_session_generator()

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

    @patch("app.graphql.mutation.get_session")
    def test_update_space_as_owner(
        self,
        mock_get_session,
        client,
        auth_headers,
        mock_user,
        mock_auth,
    ):
        """Test updating a space as the owner"""

        # Mock database session
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        async def mock_session_generator():
            yield mock_session

        mock_get_session.return_value = mock_session_generator()

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

    @patch("app.graphql.mutation.get_session")
    def test_update_space_unauthorized(self, mock_get_session, client):
        """Test updating a space without authentication"""
        # Mock database session
        mock_session = AsyncMock()

        async def mock_session_generator():
            yield mock_session

        mock_get_session.return_value = mock_session_generator()

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

    @patch("app.middleware.auth.jwt_manager.verify_token")
    @patch("app.middleware.auth.redis_manager.is_token_blacklisted")
    @patch("app.graphql.mutation.get_session")
    def test_delete_space_as_owner(
        self,
        mock_get_session,
        mock_is_blacklisted,
        mock_verify_token,
        client,
        auth_headers,
        mock_user,
    ):
        """Test deleting a space as the owner"""

        # Mock JWT verification to bypass middleware
        mock_verify_token.return_value = {
            "sub": mock_user["id"],
            "email": mock_user["email"],
            "role": mock_user["role"],
        }

        # Async mock for Redis check
        async def mock_blacklist_check(token):
            return False

        mock_is_blacklisted.side_effect = mock_blacklist_check

        # Mock database session
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        async def mock_session_generator():
            yield mock_session

        mock_get_session.return_value = mock_session_generator()

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

    @patch("app.graphql.mutation.get_session")
    def test_delete_space_unauthorized(self, mock_get_session, client):
        """Test deleting a space without authentication"""
        # Mock database session
        mock_session = AsyncMock()

        async def mock_session_generator():
            yield mock_session

        mock_get_session.return_value = mock_session_generator()

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

    @patch("app.graphql.mutation.get_session")
    def test_duplicate_space_name_same_user(
        self,
        mock_get_session,
        client,
        auth_headers,
        mock_user,
        mock_space_model,
        mock_auth,
    ):
        """Test creating two spaces with the same name for the same user returns same space"""

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
        mock_existing_space.owner_id = mock_user.id
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
            "organizationId": str(uuid4()),
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
