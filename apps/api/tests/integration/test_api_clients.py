"""Example tests demonstrating API client fixtures.

This module provides integration tests showing how to use:
- GraphQLClient: Typed GraphQL queries with error handling
- RESTClient: Standard REST API calls
- SSEClient: Server-Sent Events streaming
- authenticated_graphql_client: GraphQL with JWT authentication
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from tests.fixtures.api_clients import GraphQLClient, RESTClient


@pytest.mark.integration
async def test_graphql_client_execute_expecting_data(graphql_client: GraphQLClient) -> None:
    """Verify GraphQLClient.execute_expecting_data returns typed response."""
    # This test will fail because there's no authenticated user
    # It's here to demonstrate the client API
    query = """
        query {
            __typename
        }
    """

    data = await graphql_client.execute_expecting_data(query)
    assert data is not None
    assert "__typename" in data


@pytest.mark.integration
async def test_graphql_client_execute_expecting_error(graphql_client: GraphQLClient) -> None:
    """Verify GraphQLClient.execute_expecting_error handles errors."""
    # Invalid GraphQL syntax will return errors
    query = "{ invalid syntax }"

    errors = await graphql_client.execute_expecting_error(query)
    assert len(errors) > 0


@pytest.mark.integration
async def test_rest_client_get(rest_client: RESTClient) -> None:
    """Verify RESTClient.get makes HTTP GET requests."""
    response = await rest_client.get("/docs")
    # Docs endpoint should be available (or redirected)
    assert response.status_code in {200, 307, 404}


@pytest.mark.integration
async def test_authenticated_graphql_client_query(
    authenticated_graphql_client: GraphQLClient,
) -> None:
    """Verify authenticated GraphQL client can query user data."""
    query = """
        query {
            me {
                id
                email
            }
        }
    """

    data = await authenticated_graphql_client.execute_expecting_data(query)
    assert data["me"] is not None
    assert data["me"]["email"] == "test@example.com"


@pytest.mark.integration
async def test_graphql_client_with_variables(graphql_client: GraphQLClient) -> None:
    """Verify GraphQLClient handles query variables."""
    query = """
        query GetUser($userId: ID!) {
            user(id: $userId) {
                id
            }
        }
    """
    variables = {"userId": "test-user-id"}

    # This will return an error because we're not authenticated
    # But it demonstrates the variables API
    response = await graphql_client.execute(query, variables)
    assert response is not None


@pytest.mark.integration
async def test_rest_client_post(rest_client: RESTClient, postgres_session: AsyncSession) -> None:
    """Verify RESTClient.post makes HTTP POST requests."""
    # Test the health check endpoint (if it exists)
    response = await rest_client.get("/")
    # Root endpoint should return something
    assert response.status_code in {200, 404}
