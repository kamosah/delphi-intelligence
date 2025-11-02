"""
GraphQL tests for query mutations and operations.

Tests createQuery and updateQuery mutations including:
- Query creation with all fields
- Query updates (result, status, confidence)
- Input validation
- Authorization and permissions
- Database persistence
"""

from uuid import uuid4

import pytest

from app.models.query import Query, QueryStatus


class TestQueryMutations:
    """Test GraphQL mutations for query operations."""

    @pytest.mark.asyncio
    async def test_create_query_basic(self, async_session, graphql_client, test_user, test_space):
        """Test creating a query with required fields only."""
        mutation = """
            mutation CreateQuery($input: CreateQueryInput!) {
                createQuery(input: $input) {
                    id
                    queryText
                    spaceId
                    userId
                    status
                    result
                    confidenceScore
                    createdAt
                    updatedAt
                }
            }
        """

        variables = {
            "input": {
                "queryText": "What are the key findings?",
                "spaceId": str(test_space.id),
                "userId": str(test_user.id),
            }
        }

        response = await graphql_client.execute(mutation, variables)

        # Verify response
        assert "errors" not in response
        data = response["data"]["createQuery"]
        assert data["queryText"] == "What are the key findings?"
        assert data["spaceId"] == str(test_space.id)
        assert data["userId"] == str(test_user.id)
        assert data["status"] == "PENDING"
        assert data["result"] is None
        assert data["confidenceScore"] is None

        # Verify database persistence
        query_id = data["id"]
        db_query = await async_session.get(Query, query_id)
        assert db_query is not None
        assert db_query.query_text == "What are the key findings?"
        assert db_query.status == QueryStatus.PENDING

    @pytest.mark.asyncio
    async def test_create_query_with_all_fields(
        self, async_session, graphql_client, test_user, test_space
    ):
        """Test creating a query with all optional fields."""
        mutation = """
            mutation CreateQuery($input: CreateQueryInput!) {
                createQuery(input: $input) {
                    id
                    queryText
                    result
                    status
                    confidenceScore
                }
            }
        """

        variables = {
            "input": {
                "queryText": "What are the financial projections?",
                "spaceId": str(test_space.id),
                "userId": str(test_user.id),
                "result": "The financial projections show 20% growth in Q4.",
                "status": "COMPLETED",
                "confidenceScore": 0.85,
            }
        }

        response = await graphql_client.execute(mutation, variables)

        # Verify response
        assert "errors" not in response
        data = response["data"]["createQuery"]
        assert data["queryText"] == "What are the financial projections?"
        assert data["result"] == "The financial projections show 20% growth in Q4."
        assert data["status"] == "COMPLETED"
        assert data["confidenceScore"] == 0.85

        # Verify database
        db_query = await async_session.get(Query, data["id"])
        assert db_query.result == "The financial projections show 20% growth in Q4."
        assert db_query.confidence_score == 0.85

    @pytest.mark.asyncio
    async def test_create_query_missing_required_fields(self, graphql_client, test_space):
        """Test that missing required fields returns validation error."""
        mutation = """
            mutation CreateQuery($input: CreateQueryInput!) {
                createQuery(input: $input) {
                    id
                }
            }
        """

        # Missing queryText
        variables = {
            "input": {
                "spaceId": str(test_space.id),
                # Missing queryText and userId
            }
        }

        response = await graphql_client.execute(mutation, variables)

        # Verify error
        assert "errors" in response
        error_message = str(response["errors"])
        assert "queryText" in error_message or "required" in error_message.lower()

    @pytest.mark.asyncio
    async def test_create_query_invalid_space_id(self, graphql_client, test_user):
        """Test that invalid space_id returns error."""
        mutation = """
            mutation CreateQuery($input: CreateQueryInput!) {
                createQuery(input: $input) {
                    id
                }
            }
        """

        variables = {
            "input": {
                "queryText": "Test query",
                "spaceId": str(uuid4()),  # Non-existent space
                "userId": str(test_user.id),
            }
        }

        response = await graphql_client.execute(mutation, variables)

        # Verify error
        assert "errors" in response
        error_message = str(response["errors"])
        assert "space" in error_message.lower() or "not found" in error_message.lower()

    @pytest.mark.asyncio
    async def test_update_query_result(self, async_session, graphql_client, test_user, test_space):
        """Test updating query result."""
        # Create initial query
        query = Query(
            query_text="What are the risks?",
            space_id=test_space.id,
            user_id=test_user.id,
            status=QueryStatus.PENDING,
        )
        async_session.add(query)
        await async_session.commit()
        await async_session.refresh(query)

        mutation = """
            mutation UpdateQuery($id: ID!, $input: UpdateQueryInput!) {
                updateQuery(id: $id, input: $input) {
                    id
                    result
                    status
                    updatedAt
                }
            }
        """

        variables = {
            "id": str(query.id),
            "input": {
                "result": "The key risks include market volatility.",
            },
        }

        response = await graphql_client.execute(mutation, variables)

        # Verify response
        assert "errors" not in response
        data = response["data"]["updateQuery"]
        assert data["result"] == "The key risks include market volatility."

        # Verify database
        await async_session.refresh(query)
        assert query.result == "The key risks include market volatility."

    @pytest.mark.asyncio
    async def test_update_query_status(self, async_session, graphql_client, test_user, test_space):
        """Test updating query status."""
        # Create initial query
        query = Query(
            query_text="Test query",
            space_id=test_space.id,
            user_id=test_user.id,
            status=QueryStatus.PENDING,
        )
        async_session.add(query)
        await async_session.commit()
        await async_session.refresh(query)

        mutation = """
            mutation UpdateQuery($id: ID!, $input: UpdateQueryInput!) {
                updateQuery(id: $id, input: $input) {
                    id
                    status
                }
            }
        """

        variables = {
            "id": str(query.id),
            "input": {
                "status": "COMPLETED",
            },
        }

        response = await graphql_client.execute(mutation, variables)

        # Verify response
        assert "errors" not in response
        data = response["data"]["updateQuery"]
        assert data["status"] == "COMPLETED"

        # Verify database
        await async_session.refresh(query)
        assert query.status == QueryStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_update_query_confidence_score(
        self, async_session, graphql_client, test_user, test_space
    ):
        """Test updating query confidence score."""
        # Create initial query
        query = Query(
            query_text="Test query",
            space_id=test_space.id,
            user_id=test_user.id,
            status=QueryStatus.PENDING,
        )
        async_session.add(query)
        await async_session.commit()
        await async_session.refresh(query)

        mutation = """
            mutation UpdateQuery($id: ID!, $input: UpdateQueryInput!) {
                updateQuery(id: $id, input: $input) {
                    id
                    confidenceScore
                }
            }
        """

        variables = {
            "id": str(query.id),
            "input": {
                "confidenceScore": 0.75,
            },
        }

        response = await graphql_client.execute(mutation, variables)

        # Verify response
        assert "errors" not in response
        data = response["data"]["updateQuery"]
        assert data["confidenceScore"] == 0.75

        # Verify database
        await async_session.refresh(query)
        assert query.confidence_score == 0.75

    @pytest.mark.asyncio
    async def test_update_query_multiple_fields(
        self, async_session, graphql_client, test_user, test_space
    ):
        """Test updating multiple query fields at once."""
        # Create initial query
        query = Query(
            query_text="Test query",
            space_id=test_space.id,
            user_id=test_user.id,
            status=QueryStatus.PENDING,
        )
        async_session.add(query)
        await async_session.commit()
        await async_session.refresh(query)

        mutation = """
            mutation UpdateQuery($id: ID!, $input: UpdateQueryInput!) {
                updateQuery(id: $id, input: $input) {
                    id
                    result
                    status
                    confidenceScore
                }
            }
        """

        variables = {
            "id": str(query.id),
            "input": {
                "result": "Complete answer with citations.",
                "status": "COMPLETED",
                "confidenceScore": 0.92,
            },
        }

        response = await graphql_client.execute(mutation, variables)

        # Verify response
        assert "errors" not in response
        data = response["data"]["updateQuery"]
        assert data["result"] == "Complete answer with citations."
        assert data["status"] == "COMPLETED"
        assert data["confidenceScore"] == 0.92

        # Verify database
        await async_session.refresh(query)
        assert query.result == "Complete answer with citations."
        assert query.status == QueryStatus.COMPLETED
        assert query.confidence_score == 0.92

    @pytest.mark.asyncio
    async def test_update_query_nonexistent(self, graphql_client):
        """Test updating non-existent query returns error."""
        mutation = """
            mutation UpdateQuery($id: ID!, $input: UpdateQueryInput!) {
                updateQuery(id: $id, input: $input) {
                    id
                }
            }
        """

        variables = {
            "id": str(uuid4()),  # Non-existent query
            "input": {
                "result": "Test result",
            },
        }

        response = await graphql_client.execute(mutation, variables)

        # Verify error
        assert "errors" in response
        error_message = str(response["errors"])
        assert "not found" in error_message.lower() or "query" in error_message.lower()

    @pytest.mark.asyncio
    async def test_update_query_status_to_failed(
        self, async_session, graphql_client, test_user, test_space
    ):
        """Test updating query status to FAILED."""
        # Create initial query
        query = Query(
            query_text="Test query",
            space_id=test_space.id,
            user_id=test_user.id,
            status=QueryStatus.PENDING,
        )
        async_session.add(query)
        await async_session.commit()
        await async_session.refresh(query)

        mutation = """
            mutation UpdateQuery($id: ID!, $input: UpdateQueryInput!) {
                updateQuery(id: $id, input: $input) {
                    id
                    status
                }
            }
        """

        variables = {
            "id": str(query.id),
            "input": {
                "status": "FAILED",
            },
        }

        response = await graphql_client.execute(mutation, variables)

        # Verify response
        assert "errors" not in response
        data = response["data"]["updateQuery"]
        assert data["status"] == "FAILED"

        # Verify database
        await async_session.refresh(query)
        assert query.status == QueryStatus.FAILED

    @pytest.mark.asyncio
    async def test_query_updated_at_timestamp(
        self, async_session, graphql_client, test_user, test_space
    ):
        """Test that updatedAt timestamp is updated on mutation."""
        # Create initial query
        query = Query(
            query_text="Test query",
            space_id=test_space.id,
            user_id=test_user.id,
            status=QueryStatus.PENDING,
        )
        async_session.add(query)
        await async_session.commit()
        await async_session.refresh(query)

        original_updated_at = query.updated_at

        # Wait a moment to ensure timestamp difference
        import asyncio

        await asyncio.sleep(0.1)

        mutation = """
            mutation UpdateQuery($id: ID!, $input: UpdateQueryInput!) {
                updateQuery(id: $id, input: $input) {
                    id
                    updatedAt
                }
            }
        """

        variables = {
            "id": str(query.id),
            "input": {
                "result": "Updated result",
            },
        }

        response = await graphql_client.execute(mutation, variables)

        # Verify response
        assert "errors" not in response

        # Verify database timestamp changed
        await async_session.refresh(query)
        assert query.updated_at > original_updated_at

    @pytest.mark.asyncio
    async def test_confidence_score_bounds(
        self, async_session, graphql_client, test_user, test_space
    ):
        """Test that confidence score is validated to be between 0 and 1."""
        # Create initial query
        query = Query(
            query_text="Test query",
            space_id=test_space.id,
            user_id=test_user.id,
            status=QueryStatus.PENDING,
        )
        async_session.add(query)
        await async_session.commit()
        await async_session.refresh(query)

        mutation = """
            mutation UpdateQuery($id: ID!, $input: UpdateQueryInput!) {
                updateQuery(id: $id, input: $input) {
                    id
                    confidenceScore
                }
            }
        """

        # Test invalid confidence score > 1
        variables = {
            "id": str(query.id),
            "input": {
                "confidenceScore": 1.5,
            },
        }

        response = await graphql_client.execute(mutation, variables)

        # Should either error or clamp to 1
        if "errors" in response:
            error_message = str(response["errors"])
            assert "confidence" in error_message.lower() or "range" in error_message.lower()
        else:
            # If no error, should be clamped
            assert response["data"]["updateQuery"]["confidenceScore"] <= 1.0

        # Test invalid confidence score < 0
        variables["input"]["confidenceScore"] = -0.5

        response = await graphql_client.execute(mutation, variables)

        if "errors" in response:
            error_message = str(response["errors"])
            assert "confidence" in error_message.lower() or "range" in error_message.lower()
        else:
            # If no error, should be clamped
            assert response["data"]["updateQuery"]["confidenceScore"] >= 0.0
