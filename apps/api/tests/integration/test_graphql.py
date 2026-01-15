"""Integration tests for GraphQL endpoints.

This module tests GraphQL operations with PostgreSQL database:
- Thread creation and queries
- Space CRUD operations
- Document operations
- Organization membership
- Authentication and authorization
"""

from collections.abc import Callable

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.spicedb import WriteRelationshipInput
from app.services.spicedb_service import SpiceDBService
from tests.factories import (
    create_membership,
    create_organization,
    create_space,
    create_user,
)
from tests.fixtures.api_clients import GraphQLClient
from tests.fixtures.auth import TestUser, create_test_token
from tests.fixtures.openai_mocks import MockChatOpenAI, MockOpenAIEmbeddings


@pytest.mark.integration
async def test_graphql_create_user_mutation(
    async_client: AsyncClient, postgres_integration_session: AsyncSession
) -> None:
    """Test creating a user via GraphQL mutation."""
    # Create admin user for authentication
    admin = await create_user(
        postgres_integration_session, email="admin@example.com", full_name="Admin User"
    )
    await postgres_integration_session.commit()

    # Authenticate client
    test_user = TestUser(id=str(admin.id), email=admin.email, full_name=admin.full_name or "")
    token = create_test_token(test_user)
    async_client.headers["Authorization"] = f"Bearer {token}"

    client = GraphQLClient(async_client)

    query = """
        mutation CreateUser($input: CreateUserInput!) {
            createUser(input: $input) {
                id
                email
                fullName
                isActive
            }
        }
    """

    variables = {
        "input": {
            "email": "newuser@example.com",
            "fullName": "New User",
        }
    }

    data = await client.execute_expecting_data(query, variables)
    assert data["createUser"]["email"] == "newuser@example.com"
    assert data["createUser"]["fullName"] == "New User"
    assert data["createUser"]["isActive"] is True


@pytest.mark.integration
async def test_graphql_query_user_by_id(
    async_client: AsyncClient, postgres_integration_session: AsyncSession
) -> None:
    """Test querying a user by ID via GraphQL."""
    # Create test user
    user = await create_user(
        postgres_integration_session, email="test@example.com", full_name="Test User"
    )
    await postgres_integration_session.commit()

    # Authenticate client
    test_user = TestUser(id=str(user.id), email=user.email, full_name=user.full_name or "")
    token = create_test_token(test_user)
    async_client.headers["Authorization"] = f"Bearer {token}"

    client = GraphQLClient(async_client)

    query = """
        query GetUser($id: ID!) {
            user(id: $id) {
                id
                email
                fullName
            }
        }
    """

    variables = {"id": str(user.id)}

    data = await client.execute_expecting_data(query, variables)
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["fullName"] == "Test User"


@pytest.mark.integration
async def test_graphql_create_organization(
    async_client: AsyncClient, postgres_integration_session: AsyncSession
) -> None:
    """Test creating an organization via GraphQL mutation."""
    # Create test user as owner
    user = await create_user(postgres_integration_session, email="owner@example.com")
    await postgres_integration_session.commit()

    # Authenticate client
    test_user = TestUser(id=str(user.id), email=user.email, full_name=user.full_name or "")
    token = create_test_token(test_user)
    async_client.headers["Authorization"] = f"Bearer {token}"

    client = GraphQLClient(async_client)

    query = """
        mutation CreateOrg($input: CreateOrganizationInput!) {
            createOrganization(input: $input) {
                id
                name
                slug
                description
            }
        }
    """

    variables = {
        "input": {
            "name": "Test Organization",
            "slug": "test-org",
            "description": "A test organization",
        }
    }

    data = await client.execute_expecting_data(query, variables)
    assert data["createOrganization"]["name"] == "Test Organization"
    assert data["createOrganization"]["slug"] == "test-org"
    assert data["createOrganization"]["description"] == "A test organization"


@pytest.mark.integration
async def test_graphql_list_organizations(
    async_client: AsyncClient, postgres_integration_session: AsyncSession, unique_test_id: str
) -> None:
    """Test listing organizations via GraphQL query."""
    # Create test user for authentication
    user = await create_user(
        postgres_integration_session, email=f"test-{unique_test_id}@example.com"
    )

    # Create test organizations with user memberships
    org1 = await create_organization(
        postgres_integration_session, f"Organization 1 {unique_test_id}"
    )
    org2 = await create_organization(
        postgres_integration_session, f"Organization 2 {unique_test_id}"
    )
    await create_membership(postgres_integration_session, user, org1)
    await create_membership(postgres_integration_session, user, org2)
    await postgres_integration_session.commit()

    # Authenticate client
    test_user = TestUser(id=str(user.id), email=user.email, full_name=user.full_name or "")
    token = create_test_token(test_user)
    async_client.headers["Authorization"] = f"Bearer {token}"

    client = GraphQLClient(async_client)

    query = """
        query ListOrgs {
            organizations {
                id
                name
                slug
            }
        }
    """

    data = await client.execute_expecting_data(query)
    assert len(data["organizations"]) >= 2
    org_names = [org["name"] for org in data["organizations"]]
    assert f"Organization 1 {unique_test_id}" in org_names
    assert f"Organization 2 {unique_test_id}" in org_names


@pytest.mark.integration
async def test_graphql_create_space(
    async_client: AsyncClient, postgres_integration_session: AsyncSession, unique_test_id: str
) -> None:
    """Test creating a space via GraphQL mutation."""
    # Create test user and organization
    user = await create_user(
        postgres_integration_session, email=f"user-{unique_test_id}@example.com"
    )
    org = await create_organization(postgres_integration_session, f"Test Org {unique_test_id}")
    await create_membership(postgres_integration_session, user, org)
    await postgres_integration_session.commit()

    # Authenticate client
    test_user = TestUser(id=str(user.id), email=user.email, full_name=user.full_name or "")
    token = create_test_token(test_user)
    async_client.headers["Authorization"] = f"Bearer {token}"

    client = GraphQLClient(async_client)

    query = """
        mutation CreateSpace($input: CreateSpaceInput!) {
            createSpace(input: $input) {
                id
                name
                description
            }
        }
    """

    variables = {
        "input": {
            "name": "Test Space",
            "description": "A test space",
            "organizationId": str(org.id),
        }
    }

    data = await client.execute_expecting_data(query, variables)
    assert data["createSpace"]["name"] == "Test Space"
    assert data["createSpace"]["description"] == "A test space"
    # Note: organizationId not exposed in GraphQL schema, verified via input


@pytest.mark.integration
async def test_graphql_update_space(
    async_client: AsyncClient,
    postgres_integration_session: AsyncSession,
    spicedb_service: SpiceDBService,
    test_resource_ids: Callable[[str], str],
    unique_test_id: str,
) -> None:
    """Test updating a space via GraphQL mutation with SpiceDB permissions."""
    # Create test user, organization, and space
    user = await create_user(
        postgres_integration_session, email=f"user-{unique_test_id}@example.com"
    )
    org = await create_organization(postgres_integration_session, f"Test Org {unique_test_id}")
    space = await create_space(postgres_integration_session, "Original Space", org, user)
    await postgres_integration_session.commit()

    # Set up SpiceDB relationships (required for update permission check)
    # Use actual database IDs (not test-prefixed) so they match GraphQL permission checks
    org_id = str(org.id)
    space_id = str(space.id)
    user_id = str(user.id)

    # Organization with admin (required for space->update via organization->admin)
    await spicedb_service.write_relationship(
        WriteRelationshipInput(
            resource_type="organization",
            resource_id=org_id,
            relation="admin",  # Changed from "owner" to "admin" to satisfy permission requirement
            subject_type="user",
            subject_id=user_id,
        )
    )

    # Space belongs to organization
    await spicedb_service.write_relationship(
        WriteRelationshipInput(
            resource_type="space",
            resource_id=space_id,
            relation="organization",
            subject_type="organization",
            subject_id=org_id,
        )
    )

    # Space owner (user can update via space->owner)
    await spicedb_service.write_relationship(
        WriteRelationshipInput(
            resource_type="space",
            resource_id=space_id,
            relation="owner",
            subject_type="user",
            subject_id=user_id,
        )
    )

    # Authenticate client
    test_user = TestUser(id=str(user.id), email=user.email, full_name=user.full_name or "")
    token = create_test_token(test_user)
    async_client.headers["Authorization"] = f"Bearer {token}"

    client = GraphQLClient(async_client)

    query = """
        mutation UpdateSpace($id: ID!, $input: UpdateSpaceInput!) {
            updateSpace(id: $id, input: $input) {
                id
                name
                description
            }
        }
    """

    variables = {
        "id": str(space.id),
        "input": {
            "name": "Updated Space",
            "description": "Updated description",
        },
    }

    data = await client.execute_expecting_data(query, variables)
    assert data["updateSpace"]["name"] == "Updated Space"
    assert data["updateSpace"]["description"] == "Updated description"


@pytest.mark.integration
async def test_graphql_create_thread_with_mocked_llm(
    async_client: AsyncClient,
    postgres_integration_session: AsyncSession,
    patch_openai: tuple[MockChatOpenAI, MockOpenAIEmbeddings],
    unique_test_id: str,
) -> None:
    """Test creating a thread with mocked LLM (no real OpenAI API calls)."""
    # Create test user and organization
    user = await create_user(
        postgres_integration_session, email=f"user-{unique_test_id}@example.com"
    )
    org = await create_organization(postgres_integration_session, f"Test Org {unique_test_id}")
    await create_membership(postgres_integration_session, user, org)
    await postgres_integration_session.commit()

    # Configure mock LLM response
    mock_llm, _mock_embeddings = patch_openai
    mock_llm.responses = ["This is a mocked AI response"]

    # Authenticate client
    test_user = TestUser(id=str(user.id), email=user.email, full_name=user.full_name or "")
    token = create_test_token(test_user)
    async_client.headers["Authorization"] = f"Bearer {token}"

    client = GraphQLClient(async_client)

    query = """
        mutation CreateThread($input: CreateThreadInput!) {
            createThread(input: $input) {
                id
                title
                ownerUserId
                organizationId
            }
        }
    """

    variables = {
        "input": {
            "title": "Test Thread",
            "organizationId": str(org.id),
            "visibility": "ORGANIZATION",
            "queryText": "Test question for mocked LLM",
        }
    }

    data = await client.execute_expecting_data(query, variables)
    assert data["createThread"]["title"] == "Test Thread"
    assert data["createThread"]["ownerUserId"] == str(user.id)
    assert data["createThread"]["organizationId"] == str(org.id)


@pytest.mark.integration
async def test_graphql_authentication_required(async_client: AsyncClient) -> None:
    """Test that protected GraphQL operations require authentication."""
    client = GraphQLClient(async_client)

    query = """
        mutation CreateSpace($input: CreateSpaceInput!) {
            createSpace(input: $input) {
                id
                name
            }
        }
    """

    variables = {
        "input": {
            "name": "Test Space",
            "organizationId": "00000000-0000-0000-0000-000000000000",
        }
    }

    # Execute query - may return errors or data=null depending on middleware config
    response = await client.execute(query, variables)

    # Either errors exist or data is None (both indicate auth failure)
    assert response.errors is not None or response.data is None


@pytest.mark.integration
async def test_graphql_validation_error_handling(
    async_client: AsyncClient, postgres_integration_session: AsyncSession, unique_test_id: str
) -> None:
    """Test GraphQL validation error handling for duplicate email."""
    # Create test user for authentication
    user = await create_user(
        postgres_integration_session,
        email=f"test-{unique_test_id}@example.com",
        full_name="Test User",
    )
    await postgres_integration_session.commit()

    # Authenticate client
    test_user = TestUser(id=str(user.id), email=user.email, full_name=user.full_name or "")
    token = create_test_token(test_user)
    async_client.headers["Authorization"] = f"Bearer {token}"

    client = GraphQLClient(async_client)

    query = """
        mutation CreateUser($input: CreateUserInput!) {
            createUser(input: $input) {
                id
                email
            }
        }
    """

    # Duplicate email (user already exists)
    variables = {"input": {"email": f"test-{unique_test_id}@example.com"}}

    errors = await client.execute_expecting_error(query, variables)
    assert len(errors) > 0
    assert any("already exists" in str(err) for err in errors)


@pytest.mark.integration
async def test_graphql_query_nonexistent_resource(
    async_client: AsyncClient, postgres_integration_session: AsyncSession, unique_test_id: str
) -> None:
    """Test querying a nonexistent resource returns None."""
    # Create test user for authentication
    user = await create_user(
        postgres_integration_session,
        email=f"test-{unique_test_id}@example.com",
        full_name="Test User",
    )
    await postgres_integration_session.commit()

    # Authenticate client
    test_user = TestUser(id=str(user.id), email=user.email, full_name=user.full_name or "")
    token = create_test_token(test_user)
    async_client.headers["Authorization"] = f"Bearer {token}"

    client = GraphQLClient(async_client)

    query = """
        query GetUser($id: ID!) {
            user(id: $id) {
                id
                email
            }
        }
    """

    # Query with non-existent UUID
    variables = {"id": "00000000-0000-0000-0000-000000000000"}

    data = await client.execute_expecting_data(query, variables)
    assert data["user"] is None
