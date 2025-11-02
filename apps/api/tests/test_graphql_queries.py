"""
GraphQL tests for query mutations and operations.

Tests createQuery and updateQuery mutations including:
- Query creation with all fields
- Query updates (result, title)
- Input validation
- Authorization and permissions

These are unit tests that mock the database layer.
"""

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.graphql.mutation import Mutation
from app.graphql.types import CreateQueryInput, UpdateQueryInput
from app.models.space import Space


class TestQueryMutations:
    """Test GraphQL mutations for query operations."""

    @pytest.mark.asyncio
    async def test_create_query_basic(self, mock_user, mock_space, mock_db_session, mock_info):
        """Test creating a query with required fields only."""
        # Mock space query result
        mock_space_result = MagicMock()
        mock_space_result.scalar_one_or_none = MagicMock(return_value=mock_space)
        mock_db_session.execute.return_value = mock_space_result

        # Mock the get_session generator
        async def mock_get_session():
            yield mock_db_session

        # Create input
        input_data = CreateQueryInput(
            space_id=str(mock_space.id), query_text="What are the key findings?"
        )

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            result = await mutation.create_query(mock_info, input_data)

            # Verify session methods were called
            assert mock_db_session.add.called
            assert mock_db_session.commit.called
            assert result is not None

    @pytest.mark.asyncio
    async def test_create_query_with_all_fields(
        self, mock_user, mock_space, mock_db_session, mock_info
    ):
        """Test creating a query with all optional fields."""
        # Mock space query result
        mock_space_result = MagicMock()
        mock_space_result.scalar_one_or_none = MagicMock(return_value=mock_space)
        mock_db_session.execute.return_value = mock_space_result

        async def mock_get_session():
            yield mock_db_session

        input_data = CreateQueryInput(
            space_id=str(mock_space.id),
            query_text="What are the financial projections?",
            result="The financial projections show 20% growth in Q4.",
            title="Financial Projections",
            confidence_score=0.85,
        )

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            result = await mutation.create_query(mock_info, input_data)

            assert mock_db_session.add.called
            assert mock_db_session.commit.called
            assert result is not None

    @pytest.mark.asyncio
    async def test_create_query_missing_required_fields(self):
        """Test that missing required fields raises validation error."""
        # This test verifies that CreateQueryInput requires certain fields
        # Strawberry/Pydantic will raise error before mutation is called

        with pytest.raises(TypeError):
            # Missing query_text
            CreateQueryInput(space_id=str(uuid4()))

    @pytest.mark.asyncio
    async def test_create_query_invalid_space_id(self, mock_user, mock_db_session, mock_info):
        """Test that invalid space_id returns None."""
        # Mock space query result - space not found
        mock_space_result = MagicMock()
        mock_space_result.scalar_one_or_none = MagicMock(return_value=None)
        mock_db_session.execute.return_value = mock_space_result

        async def mock_get_session():
            yield mock_db_session

        input_data = CreateQueryInput(
            space_id=str(uuid4()),  # Non-existent space
            query_text="Test query",
        )

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            result = await mutation.create_query(mock_info, input_data)

            assert result is None

    @pytest.mark.asyncio
    async def test_create_query_missing_auth(self, mock_db_session, mock_info_no_auth):
        """Test that missing authentication returns None."""
        input_data = CreateQueryInput(space_id=str(uuid4()), query_text="Test query")

        async def mock_get_session():
            yield mock_db_session

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            result = await mutation.create_query(mock_info_no_auth, input_data)

            assert result is None

    @pytest.mark.asyncio
    async def test_create_query_insufficient_permissions(
        self, mock_user, mock_db_session, mock_info
    ):
        """Test that users without permissions cannot create queries."""
        other_user_id = uuid4()

        mock_space = MagicMock(spec=Space)
        mock_space.id = uuid4()
        mock_space.owner_id = other_user_id  # Different owner

        # First call returns space, second call returns no membership
        mock_space_result = MagicMock()
        mock_space_result.scalar_one_or_none = MagicMock(return_value=mock_space)

        mock_member_result = MagicMock()
        mock_member_result.scalar_one_or_none = MagicMock(return_value=None)

        # Return different results for different queries
        mock_db_session.execute.side_effect = [mock_space_result, mock_member_result]

        async def mock_get_session():
            yield mock_db_session

        input_data = CreateQueryInput(space_id=str(mock_space.id), query_text="Test query")

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()

            # The mutation catches ValueError and returns None (based on mutation.py line 481-483)
            result = await mutation.create_query(mock_info, input_data)
            assert result is None

    @pytest.mark.asyncio
    async def test_update_query_result(self, mock_query, mock_db_session, mock_info):
        """Test updating query result."""
        # Mock query result
        mock_query_result = MagicMock()
        mock_query_result.scalar_one_or_none = MagicMock(return_value=mock_query)
        mock_db_session.execute.return_value = mock_query_result

        async def mock_get_session():
            yield mock_db_session

        input_data = UpdateQueryInput(result="The key risks include market volatility.")

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            await mutation.update_query(mock_info, str(mock_query.id), input_data)

            assert mock_db_session.commit.called
            assert mock_query.result == "The key risks include market volatility."

    @pytest.mark.asyncio
    async def test_update_query_title(self, mock_query, mock_db_session, mock_info):
        """Test updating query title."""
        # Mock query result
        mock_query_result = MagicMock()
        mock_query_result.scalar_one_or_none = MagicMock(return_value=mock_query)
        mock_db_session.execute.return_value = mock_query_result

        async def mock_get_session():
            yield mock_db_session

        input_data = UpdateQueryInput(title="Updated Title")

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            await mutation.update_query(mock_info, str(mock_query.id), input_data)

            assert mock_db_session.commit.called
            assert mock_query.title == "Updated Title"

    @pytest.mark.asyncio
    async def test_update_query_multiple_fields(self, mock_query, mock_db_session, mock_info):
        """Test updating multiple query fields at once."""
        # Mock query result
        mock_query_result = MagicMock()
        mock_query_result.scalar_one_or_none = MagicMock(return_value=mock_query)
        mock_db_session.execute.return_value = mock_query_result

        async def mock_get_session():
            yield mock_db_session

        input_data = UpdateQueryInput(
            result="Complete answer with citations.", title="Updated Title"
        )

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            await mutation.update_query(mock_info, str(mock_query.id), input_data)

            assert mock_db_session.commit.called
            assert mock_query.result == "Complete answer with citations."
            assert mock_query.title == "Updated Title"

    @pytest.mark.asyncio
    async def test_update_query_nonexistent(self, mock_db_session, mock_info):
        """Test updating non-existent query returns None."""
        # Mock query result - not found
        mock_query_result = MagicMock()
        mock_query_result.scalar_one_or_none = MagicMock(return_value=None)
        mock_db_session.execute.return_value = mock_query_result

        async def mock_get_session():
            yield mock_db_session

        input_data = UpdateQueryInput(result="Test result")

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            result = await mutation.update_query(mock_info, str(uuid4()), input_data)

            assert result is None

    @pytest.mark.asyncio
    async def test_update_query_insufficient_permissions(self, mock_db_session, mock_info):
        """Test that users without permissions cannot update queries."""
        other_user_id = uuid4()

        mock_space = MagicMock(spec=Space)
        mock_space.id = uuid4()
        mock_space.owner_id = other_user_id  # Different owner

        mock_query = MagicMock()
        mock_query.id = uuid4()
        mock_query.created_by = other_user_id  # Different creator
        mock_query.space = mock_space

        # Mock query result
        mock_query_result = MagicMock()
        mock_query_result.scalar_one_or_none = MagicMock(return_value=mock_query)
        mock_db_session.execute.return_value = mock_query_result

        async def mock_get_session():
            yield mock_db_session

        input_data = UpdateQueryInput(result="Test result")

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()

            # The mutation catches ValueError and returns None (based on mutation.py line 562-564)
            result = await mutation.update_query(mock_info, str(mock_query.id), input_data)
            assert result is None

    @pytest.mark.asyncio
    async def test_confidence_score_bounds(self):
        """Test confidence score validation accepts valid values."""
        # Test that valid scores (0.0 to 1.0) are accepted

        input_data = CreateQueryInput(
            space_id=str(uuid4()),
            query_text="Test query",
            confidence_score=0.85,
        )
        assert input_data.confidence_score == 0.85

        # Test boundary values
        input_min = CreateQueryInput(
            space_id=str(uuid4()),
            query_text="Test query",
            confidence_score=0.0,
        )
        assert input_min.confidence_score == 0.0

        input_max = CreateQueryInput(
            space_id=str(uuid4()),
            query_text="Test query",
            confidence_score=1.0,
        )
        assert input_max.confidence_score == 1.0
