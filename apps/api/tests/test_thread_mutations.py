"""Unit tests for Thread GraphQL mutations after Query → Thread migration."""

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.graphql.mutation import Mutation
from app.graphql.types import CreateThreadInput, UpdateThreadInput


class TestThreadMutations:
    """Test GraphQL mutations for thread operations."""

    @pytest.mark.asyncio
    async def test_create_thread_with_organization_and_space(
        self, mock_info, mock_db_session, mock_user, mock_organization, mock_space, mock_get_session
    ):
        """Test creating a thread with organization_id and space_id."""
        # Mock space query result
        mock_space_result = MagicMock()
        mock_space_result.scalar_one_or_none = MagicMock(return_value=mock_space)
        mock_db_session.execute.return_value = mock_space_result

        input_data = CreateThreadInput(
            organization_id=str(mock_organization.id),
            space_id=str(mock_space.id),
            query_text="Test query with organization",
            title="Test Thread",
        )

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            result = await mutation.create_thread(mock_info, input_data)

            assert result is not None
            assert result.organization_id == str(mock_organization.id)
            assert result.space_id == str(mock_space.id)
            assert result.query_text == "Test query with organization"
            assert result.title == "Test Thread"
            assert mock_db_session.add.called
            assert mock_db_session.commit.called

    @pytest.mark.asyncio
    async def test_create_org_wide_thread_no_space(
        self, mock_info, mock_db_session, mock_user, mock_organization, mock_get_session
    ):
        """Test creating an org-wide thread without space_id (space_id = None)."""
        input_data = CreateThreadInput(
            organization_id=str(mock_organization.id),
            space_id=None,  # Org-wide thread
            query_text="Org-wide query across all spaces",
            title="Org-Wide Thread",
        )

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            result = await mutation.create_thread(mock_info, input_data)

            assert result is not None
            assert result.organization_id == str(mock_organization.id)
            assert result.space_id is None  # Org-wide thread
            assert result.query_text == "Org-wide query across all spaces"
            assert result.title == "Org-Wide Thread"
            assert mock_db_session.add.called
            assert mock_db_session.commit.called

    @pytest.mark.asyncio
    async def test_create_thread_unauthenticated(
        self, mock_info_no_auth, mock_organization, mock_space
    ):
        """Test creating a thread fails with 'Authentication required' when user is not authenticated."""
        input_data = CreateThreadInput(
            organization_id=str(mock_organization.id),
            space_id=str(mock_space.id),
            query_text="Unauthenticated query",
        )

        mutation = Mutation()
        with pytest.raises(ValueError, match="Authentication required"):
            await mutation.create_thread(mock_info_no_auth, input_data)

    @pytest.mark.asyncio
    async def test_create_thread_space_not_found(
        self, mock_info, mock_db_session, mock_user, mock_organization, mock_get_session
    ):
        """Test creating a thread fails with 'Space not found' when space doesn't exist."""
        # Mock space not found
        mock_space_result = MagicMock()
        mock_space_result.scalar_one_or_none = MagicMock(return_value=None)
        mock_db_session.execute.return_value = mock_space_result

        nonexistent_space_id = str(uuid4())
        input_data = CreateThreadInput(
            organization_id=str(mock_organization.id),
            space_id=nonexistent_space_id,
            query_text="Query with bad space",
        )

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            with pytest.raises(ValueError, match="Space not found"):
                await mutation.create_thread(mock_info, input_data)

            assert mock_db_session.rollback.called

    @pytest.mark.asyncio
    async def test_create_thread_insufficient_permissions(
        self, mock_info, mock_db_session, mock_user, mock_organization, mock_space, mock_get_session
    ):
        """Test creating a thread fails with 'Insufficient permissions' when user is not owner/member."""
        # Mock space exists but user is not owner/member
        mock_space.owner_id = uuid4()  # Different user

        mock_space_result = MagicMock()
        mock_space_result.scalar_one_or_none = MagicMock(return_value=mock_space)

        # Mock member check - user is not a member
        mock_member_result = MagicMock()
        mock_member_result.scalar_one_or_none = MagicMock(return_value=None)

        mock_db_session.execute.side_effect = [mock_space_result, mock_member_result]

        input_data = CreateThreadInput(
            organization_id=str(mock_organization.id),
            space_id=str(mock_space.id),
            query_text="Unauthorized query",
        )

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            with pytest.raises(
                ValueError, match="Insufficient permissions to create thread in this space"
            ):
                await mutation.create_thread(mock_info, input_data)

            assert mock_db_session.rollback.called

    @pytest.mark.asyncio
    async def test_update_thread_success(
        self, mock_info, mock_db_session, mock_user, mock_thread, mock_space, mock_get_session
    ):
        """Test updating a thread successfully."""
        # Mock thread query result
        mock_thread_result = MagicMock()
        mock_thread_result.scalar_one_or_none = MagicMock(return_value=mock_thread)

        # Mock space query result (update_thread queries for space to check permissions)
        mock_space_result = MagicMock()
        mock_space_result.scalar_one_or_none = MagicMock(return_value=mock_space)

        mock_db_session.execute.side_effect = [mock_thread_result, mock_space_result]

        input_data = UpdateThreadInput(title="Updated Title", result="Updated result")

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            result = await mutation.update_thread(mock_info, str(mock_thread.id), input_data)

            assert result is not None
            assert mock_thread.title == "Updated Title"
            assert mock_thread.result == "Updated result"
            assert mock_db_session.commit.called

    @pytest.mark.asyncio
    async def test_update_thread_unauthenticated(self, mock_info_no_auth, mock_thread):
        """Test updating a thread fails with 'Authentication required' when not authenticated."""
        input_data = UpdateThreadInput(title="Hacked Title")

        mutation = Mutation()
        with pytest.raises(ValueError, match="Authentication required"):
            await mutation.update_thread(mock_info_no_auth, str(mock_thread.id), input_data)

    @pytest.mark.asyncio
    async def test_update_thread_not_found(self, mock_info, mock_db_session, mock_get_session):
        """Test updating a thread fails with 'Thread not found' when thread doesn't exist."""
        # Mock thread not found
        mock_thread_result = MagicMock()
        mock_thread_result.scalar_one_or_none = MagicMock(return_value=None)
        mock_db_session.execute.return_value = mock_thread_result

        nonexistent_id = str(uuid4())
        input_data = UpdateThreadInput(title="New Title")

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            with pytest.raises(ValueError, match="Thread not found"):
                await mutation.update_thread(mock_info, nonexistent_id, input_data)

            assert mock_db_session.rollback.called

    @pytest.mark.asyncio
    async def test_delete_thread_success_by_creator(
        self, mock_info, mock_db_session, mock_user, mock_thread, mock_space, mock_get_session
    ):
        """Test deleting a space thread successfully by creator."""
        # Mock thread query result
        mock_thread_result = MagicMock()
        mock_thread_result.scalar_one_or_none = MagicMock(return_value=mock_thread)

        # Mock space query result
        mock_space_result = MagicMock()
        mock_space_result.scalar_one_or_none = MagicMock(return_value=mock_space)

        # Mock member query result (third query in delete_thread)
        mock_member_result = MagicMock()
        mock_member_result.scalar_one_or_none = MagicMock(return_value=None)

        mock_db_session.execute.side_effect = [
            mock_thread_result,
            mock_space_result,
            mock_member_result,
        ]

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            result = await mutation.delete_thread(mock_info, str(mock_thread.id))

            assert result is True
            assert mock_db_session.delete.called
            assert mock_db_session.commit.called

    @pytest.mark.asyncio
    async def test_delete_org_thread_success(
        self, mock_info, mock_db_session, mock_user, mock_org_thread, mock_get_session
    ):
        """Test deleting an org-wide thread successfully by creator."""
        # Mock thread query result
        mock_thread_result = MagicMock()
        mock_thread_result.scalar_one_or_none = MagicMock(return_value=mock_org_thread)
        mock_db_session.execute.return_value = mock_thread_result

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            result = await mutation.delete_thread(mock_info, str(mock_org_thread.id))

            assert result is True
            assert mock_db_session.delete.called
            assert mock_db_session.commit.called

    @pytest.mark.asyncio
    async def test_delete_thread_unauthenticated(self, mock_info_no_auth, mock_thread):
        """Test deleting a thread fails with 'Authentication required' when not authenticated."""
        mutation = Mutation()
        with pytest.raises(ValueError, match="Authentication required"):
            await mutation.delete_thread(mock_info_no_auth, str(mock_thread.id))

    @pytest.mark.asyncio
    async def test_delete_thread_not_found(self, mock_info, mock_db_session, mock_get_session):
        """Test deleting a thread fails with 'Thread not found' when thread doesn't exist."""
        # Mock thread not found
        mock_thread_result = MagicMock()
        mock_thread_result.scalar_one_or_none = MagicMock(return_value=None)
        mock_db_session.execute.return_value = mock_thread_result

        nonexistent_id = str(uuid4())

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            with pytest.raises(ValueError, match="Thread not found"):
                await mutation.delete_thread(mock_info, nonexistent_id)

            assert mock_db_session.rollback.called

    @pytest.mark.asyncio
    async def test_delete_org_thread_only_creator_can_delete(
        self, mock_info, mock_db_session, mock_user, mock_org_thread, mock_get_session
    ):
        """Test deleting an org-wide thread fails when not creator and not org admin."""
        # Mock org thread with different creator
        mock_org_thread.created_by = uuid4()

        mock_thread_result = MagicMock()
        mock_thread_result.scalar_one_or_none = MagicMock(return_value=mock_org_thread)

        # Mock org member result (user is not an org admin)
        mock_org_member_result = MagicMock()
        mock_org_member_result.scalar_one_or_none = MagicMock(return_value=None)

        # Configure execute to return different results based on call order
        mock_db_session.execute.side_effect = [mock_thread_result, mock_org_member_result]

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            with pytest.raises(
                ValueError,
                match="Only the creator or organization admin can delete org-wide threads",
            ):
                await mutation.delete_thread(mock_info, str(mock_org_thread.id))

            assert mock_db_session.rollback.called
