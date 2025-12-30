"""Unit tests for Thread GraphQL mutations after Query → Thread migration."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.graphql.mutation import Mutation
from app.graphql.types import CreateThreadInput, UpdateThreadInput, ThreadVisibilityEnum


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

        # Mock SpiceDB permission check and sync
        mock_spicedb = MagicMock()
        mock_spicedb.check_permission = AsyncMock(return_value=True)
        mock_spicedb.sync_thread_relationships = AsyncMock(return_value=True)

        input_data = CreateThreadInput(
            organization_id=str(mock_organization.id),
            space_id=str(mock_space.id),
            visibility=ThreadVisibilityEnum.SPACE,
            query_text="Test query with organization",
            title="Test Thread",
        )

        with (
            patch("app.graphql.mutation.get_session", side_effect=mock_get_session),
            patch("app.graphql.mutation.get_spicedb_service", return_value=mock_spicedb),
        ):
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
            visibility=ThreadVisibilityEnum.ORGANIZATION,
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
            visibility=ThreadVisibilityEnum.SPACE,
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
        # Mock org membership check (user is a member)
        mock_org_member = MagicMock()
        mock_org_member_result = MagicMock()
        mock_org_member_result.scalar_one_or_none = MagicMock(return_value=mock_org_member)

        # Mock space not found
        mock_space_result = MagicMock()
        mock_space_result.scalar_one_or_none = MagicMock(return_value=None)

        # Order: org_member check THEN space check
        mock_db_session.execute.side_effect = [mock_org_member_result, mock_space_result]

        nonexistent_space_id = str(uuid4())
        input_data = CreateThreadInput(
            organization_id=str(mock_organization.id),
            space_id=nonexistent_space_id,
            visibility=ThreadVisibilityEnum.SPACE,
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
        # Mock org membership check (user is a member)
        mock_org_member = MagicMock()
        mock_org_member_result = MagicMock()
        mock_org_member_result.scalar_one_or_none = MagicMock(return_value=mock_org_member)

        # Mock space exists but user is not owner/member
        mock_space.owner_id = uuid4()  # Different user
        mock_space_result = MagicMock()
        mock_space_result.scalar_one_or_none = MagicMock(return_value=mock_space)

        # Order: org_member check THEN space check THEN SpiceDB permission check
        mock_db_session.execute.side_effect = [mock_org_member_result, mock_space_result]

        input_data = CreateThreadInput(
            organization_id=str(mock_organization.id),
            space_id=str(mock_space.id),
            visibility=ThreadVisibilityEnum.SPACE,
            query_text="Unauthorized query",
        )

        # Mock SpiceDB check to return False (no permission)
        with (
            patch("app.graphql.mutation.get_session", side_effect=mock_get_session),
            patch("app.graphql.mutation.get_spicedb_service") as mock_spicedb,
        ):
            mock_spicedb_instance = MagicMock()
            mock_spicedb_instance.check_permission = AsyncMock(return_value=False)
            mock_spicedb.return_value = mock_spicedb_instance

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

        # Mock SpiceDB permission check
        mock_spicedb = MagicMock()
        mock_spicedb.check_permission = AsyncMock(return_value=True)

        input_data = UpdateThreadInput(title="Updated Title", result="Updated result")

        with (
            patch("app.graphql.mutation.get_session", side_effect=mock_get_session),
            patch("app.graphql.mutation.get_spicedb_service", return_value=mock_spicedb),
        ):
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

        # Mock SpiceDB permission check and cleanup
        mock_spicedb = MagicMock()
        mock_spicedb.check_permission = AsyncMock(return_value=True)
        mock_spicedb.remove_thread_relationships = AsyncMock(return_value=True)

        with (
            patch("app.graphql.mutation.get_session", side_effect=mock_get_session),
            patch("app.graphql.mutation.get_spicedb_service", return_value=mock_spicedb),
        ):
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

        # Mock SpiceDB permission check and cleanup
        mock_spicedb = MagicMock()
        mock_spicedb.check_permission = AsyncMock(return_value=True)
        mock_spicedb.remove_thread_relationships = AsyncMock(return_value=True)

        with (
            patch("app.graphql.mutation.get_session", side_effect=mock_get_session),
            patch("app.graphql.mutation.get_spicedb_service", return_value=mock_spicedb),
        ):
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
                match="Insufficient permissions to delete this thread",
            ):
                await mutation.delete_thread(mock_info, str(mock_org_thread.id))

            assert mock_db_session.rollback.called

    @pytest.mark.asyncio
    async def test_create_personal_thread_with_org_should_fail(
        self, mock_info, mock_organization, mock_get_session
    ):
        """Test creating a personal thread with organization_id fails validation."""
        input_data = CreateThreadInput(
            organization_id=str(mock_organization.id),  # Invalid for PERSONAL
            space_id=None,
            visibility=ThreadVisibilityEnum.PERSONAL,
            query_text="Personal query with org",
        )

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            with pytest.raises(
                ValueError,
                match="Personal threads cannot have organization or space",
            ):
                await mutation.create_thread(mock_info, input_data)

    @pytest.mark.asyncio
    async def test_create_personal_thread_with_space_should_fail(
        self, mock_info, mock_space, mock_get_session
    ):
        """Test creating a personal thread with space_id fails validation."""
        input_data = CreateThreadInput(
            organization_id=None,
            space_id=str(mock_space.id),  # Invalid for PERSONAL
            visibility=ThreadVisibilityEnum.PERSONAL,
            query_text="Personal query with space",
        )

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            with pytest.raises(
                ValueError,
                match="Personal threads cannot have organization or space",
            ):
                await mutation.create_thread(mock_info, input_data)

    @pytest.mark.asyncio
    async def test_create_space_thread_without_space_should_fail(
        self, mock_info, mock_organization, mock_get_session
    ):
        """Test creating a space thread without space_id fails validation."""
        input_data = CreateThreadInput(
            organization_id=str(mock_organization.id),
            space_id=None,  # Required for SPACE visibility
            visibility=ThreadVisibilityEnum.SPACE,
            query_text="Space query without space",
        )

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            with pytest.raises(
                ValueError,
                match="Space threads must have space_id",
            ):
                await mutation.create_thread(mock_info, input_data)

    @pytest.mark.asyncio
    async def test_create_org_thread_without_org_should_fail(self, mock_info, mock_get_session):
        """Test creating an organization thread without organization_id fails validation."""
        input_data = CreateThreadInput(
            organization_id=None,  # Required for ORGANIZATION visibility
            space_id=None,
            visibility=ThreadVisibilityEnum.ORGANIZATION,
            query_text="Org query without org",
        )

        with patch("app.graphql.mutation.get_session", side_effect=mock_get_session):
            mutation = Mutation()
            with pytest.raises(
                ValueError,
                match="Organization threads must have organization_id",
            ):
                await mutation.create_thread(mock_info, input_data)

    @pytest.mark.asyncio
    async def test_create_thread_spicedb_sync_failure_rollback(
        self, mock_info, mock_db_session, mock_user, mock_organization, mock_space, mock_get_session
    ):
        """Test that SpiceDB sync failure causes transaction rollback."""
        # Mock space query result
        mock_space_result = MagicMock()
        mock_space_result.scalar_one_or_none = MagicMock(return_value=mock_space)
        mock_db_session.execute.return_value = mock_space_result

        # Mock SpiceDB permission check succeeds but sync fails
        mock_spicedb = MagicMock()
        mock_spicedb.check_permission = AsyncMock(return_value=True)
        mock_spicedb.sync_thread_relationships = AsyncMock(return_value=False)  # Sync fails

        input_data = CreateThreadInput(
            organization_id=str(mock_organization.id),
            space_id=str(mock_space.id),
            visibility=ThreadVisibilityEnum.SPACE,
            query_text="Thread with sync failure",
        )

        with (
            patch("app.graphql.mutation.get_session", side_effect=mock_get_session),
            patch("app.graphql.mutation.get_spicedb_service", return_value=mock_spicedb),
        ):
            mutation = Mutation()
            with pytest.raises(
                ValueError,
                match="Failed to configure thread permissions",
            ):
                await mutation.create_thread(mock_info, input_data)

            # Verify rollback was called
            assert mock_db_session.rollback.called
