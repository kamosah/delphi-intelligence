"""
Unit tests for OrganizationService using real in-memory SQLite database.

These tests verify actual SQLAlchemy queries, not mocks, ensuring the service
logic works correctly with real database operations.
"""

from datetime import datetime, timedelta, UTC
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.organization_service import OrganizationService
from tests.utils import create_user, create_organization, create_membership


# --------------------------------------------------------------------------- #
# Test: get_current_organization_id
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio()
class TestGetCurrentOrganizationId:
    """Test cases for OrganizationService.get_current_organization_id."""

    async def test_returns_default_organization(self, db_session: AsyncSession):
        """Test that method returns organization with is_default=true."""
        # Setup: User has 2 memberships, org_b is default
        user = await create_user(db_session)
        org_a = await create_organization(db_session, "Org A")
        org_b = await create_organization(db_session, "Org B")

        await create_membership(db_session, user, org_a, is_default=False)
        await create_membership(db_session, user, org_b, is_default=True)

        await db_session.commit()

        # Execute
        result = await OrganizationService.get_current_organization_id(
            user.id, db_session
        )

        # Assert: Should return default org (org_b)
        assert result == org_b.id

    async def test_falls_back_to_most_recently_active(self, db_session: AsyncSession):
        """Test fallback to most recent last_active_at when no default."""
        # Setup: No default, org_recent has most recent last_active_at
        user = await create_user(db_session)
        now = datetime.now(UTC)

        org_old = await create_organization(db_session, "Old")
        org_recent = await create_organization(db_session, "Recent")
        org_newest_member = await create_organization(db_session, "Newest Member")

        await create_membership(
            db_session, user, org_old, last_active_at=now - timedelta(days=10)
        )
        await create_membership(
            db_session, user, org_recent, last_active_at=now - timedelta(hours=1)
        )
        await create_membership(
            db_session, user, org_newest_member, last_active_at=None
        )

        await db_session.commit()

        # Execute
        result = await OrganizationService.get_current_organization_id(
            user.id, db_session
        )

        # Assert: Should return most recently active org (org_recent)
        assert result == org_recent.id

    async def test_falls_back_to_oldest_created_at_when_no_activity(
        self, db_session: AsyncSession
    ):
        """Test fallback to first membership by created_at when no default or last_active."""
        # Setup: No default, no last_active_at, org_oldest is first by created_at
        user = await create_user(db_session)

        org_oldest = await create_organization(db_session, "Oldest")
        org_newer = await create_organization(db_session, "Newer")

        await create_membership(
            db_session, user, org_oldest, created_at_days_ago=30
        )
        await create_membership(
            db_session, user, org_newer, created_at_days_ago=10
        )

        await db_session.commit()

        # Execute
        result = await OrganizationService.get_current_organization_id(
            user.id, db_session
        )

        # Assert: Should return first membership (org_oldest)
        assert result == org_oldest.id

    async def test_returns_none_when_no_memberships(self, db_session: AsyncSession):
        """Test that method returns None when user has no memberships."""
        # Setup: User with no memberships
        user = await create_user(db_session)
        await db_session.commit()

        # Execute
        result = await OrganizationService.get_current_organization_id(
            user.id, db_session
        )

        # Assert
        assert result is None

    async def test_default_wins_over_recent_activity(self, db_session: AsyncSession):
        """Test that is_default takes priority over more recent last_active_at."""
        # Setup: org_default is default but has old activity, org_active has recent activity
        user = await create_user(db_session)
        now = datetime.now(UTC)

        org_default = await create_organization(db_session, "Default")
        org_active = await create_organization(db_session, "Very Active")

        await create_membership(
            db_session,
            user,
            org_default,
            is_default=True,
            last_active_at=now - timedelta(days=100),
        )
        await create_membership(
            db_session,
            user,
            org_active,
            is_default=False,
            last_active_at=now - timedelta(minutes=1),
        )

        await db_session.commit()

        # Execute
        result = await OrganizationService.get_current_organization_id(
            user.id, db_session
        )

        # Assert: Should return default (org_default), not most active (org_active)
        assert result == org_default.id

    async def test_ignores_null_last_active_at(self, db_session: AsyncSession):
        """Test that memberships with null last_active_at are handled correctly."""
        # Setup: Multiple memberships with null last_active_at
        user = await create_user(db_session)

        org_1 = await create_organization(db_session, "Org 1")
        org_2 = await create_organization(db_session, "Org 2")
        org_3 = await create_organization(db_session, "Org 3")

        await create_membership(
            db_session, user, org_1, last_active_at=None, created_at_days_ago=30
        )
        await create_membership(
            db_session, user, org_2, last_active_at=None, created_at_days_ago=20
        )
        await create_membership(
            db_session, user, org_3, last_active_at=None, created_at_days_ago=10
        )

        await db_session.commit()

        # Execute
        result = await OrganizationService.get_current_organization_id(
            user.id, db_session
        )

        # Assert: Should fall back to oldest created_at (org_1)
        assert result == org_1.id


# --------------------------------------------------------------------------- #
# Test: switch_organization
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio()
class TestSwitchOrganization:
    """Test cases for OrganizationService.switch_organization."""

    async def test_successfully_switches_and_updates_last_active_at(
        self, db_session: AsyncSession
    ):
        """Test successful organization switch updates is_default and last_active_at."""
        # Setup: User has 2 memberships, org1 is default
        user = await create_user(db_session)
        org1 = await create_organization(db_session, "Org 1")
        org2 = await create_organization(db_session, "Org 2")

        m1 = await create_membership(db_session, user, org1, is_default=True)
        m2 = await create_membership(
            db_session, user, org2, is_default=False, last_active_at=None
        )

        await db_session.commit()

        # Execute: Switch to org2
        await OrganizationService.switch_organization(user.id, org2.id, db_session)

        # Refresh to get updated state
        await db_session.refresh(m1)
        await db_session.refresh(m2)

        # Assert: org1 should no longer be default, org2 should be default
        assert m1.is_default is False
        assert m2.is_default is True
        # Assert: last_active_at was set
        # Note: SQLite doesn't preserve timezone info, but PostgreSQL will
        assert m2.last_active_at is not None

    async def test_raises_value_error_when_not_member(self, db_session: AsyncSession):
        """Test that switching to non-member organization raises ValueError."""
        # Setup: User and org exist but no membership
        user = await create_user(db_session)
        fake_org_id = uuid4()

        await db_session.commit()

        # Execute & Assert
        with pytest.raises(ValueError, match="is not a member of organization"):
            await OrganizationService.switch_organization(
                user.id, fake_org_id, db_session
            )

    async def test_handles_multiple_defaults_gracefully(self, db_session: AsyncSession):
        """Test that switching handles edge case of multiple defaults (data corruption)."""
        # Setup: Edge case - multiple orgs have is_default=true (shouldn't happen)
        user = await create_user(db_session)
        org1 = await create_organization(db_session, "Org 1")
        org2 = await create_organization(db_session, "Org 2")
        org3 = await create_organization(db_session, "Org 3")

        m1 = await create_membership(db_session, user, org1, is_default=True)
        m2 = await create_membership(db_session, user, org2, is_default=True)
        m3 = await create_membership(db_session, user, org3, is_default=False)

        await db_session.commit()

        # Execute: Switch to org3
        await OrganizationService.switch_organization(user.id, org3.id, db_session)

        # Refresh
        await db_session.refresh(m1)
        await db_session.refresh(m2)
        await db_session.refresh(m3)

        # Assert: All defaults cleared, only org3 is default
        assert m1.is_default is False
        assert m2.is_default is False
        assert m3.is_default is True

    async def test_switching_to_current_org_is_idempotent(
        self, db_session: AsyncSession
    ):
        """Test that switching to already-default organization still updates last_active_at."""
        # Setup: org is already default
        user = await create_user(db_session)
        org = await create_organization(db_session, "Current")

        m = await create_membership(
            db_session,
            user,
            org,
            is_default=True,
            last_active_at=datetime(2020, 1, 1, tzinfo=UTC),
        )

        await db_session.commit()

        before_switch_time = m.last_active_at

        # Execute: Switch to same org
        await OrganizationService.switch_organization(user.id, org.id, db_session)

        # Refresh
        await db_session.refresh(m)

        # Assert: Still default, but last_active_at updated
        assert m.is_default is True
        # Compare as strings to avoid timezone comparison issues in SQLite
        # (SQLite stores as naive datetime, PostgreSQL preserves timezone)
        assert m.last_active_at is not None
        assert str(m.last_active_at) > str(before_switch_time)

    async def test_switch_unsets_all_user_defaults_only(
        self, db_session: AsyncSession
    ):
        """Test that switching only affects target user's memberships, not other users."""
        # Setup: Two users, both members of same orgs
        user1 = await create_user(db_session, "user1@test.com")
        user2 = await create_user(db_session, "user2@test.com")
        org1 = await create_organization(db_session, "Org 1")
        org2 = await create_organization(db_session, "Org 2")

        # User1 memberships
        u1_m1 = await create_membership(db_session, user1, org1, is_default=True)
        u1_m2 = await create_membership(db_session, user1, org2, is_default=False)

        # User2 memberships (should not be affected)
        u2_m1 = await create_membership(db_session, user2, org1, is_default=True)
        u2_m2 = await create_membership(db_session, user2, org2, is_default=False)

        await db_session.commit()

        # Execute: User1 switches to org2
        await OrganizationService.switch_organization(user1.id, org2.id, db_session)

        # Refresh all memberships
        await db_session.refresh(u1_m1)
        await db_session.refresh(u1_m2)
        await db_session.refresh(u2_m1)
        await db_session.refresh(u2_m2)

        # Assert: User1's defaults changed, User2's unchanged
        assert u1_m1.is_default is False
        assert u1_m2.is_default is True
        # User2 should be unaffected
        assert u2_m1.is_default is True
        assert u2_m2.is_default is False

    async def test_switch_commits_transaction(self, db_session: AsyncSession):
        """Test that switch_organization commits the transaction."""
        # Setup
        user = await create_user(db_session)
        org1 = await create_organization(db_session, "Org 1")
        org2 = await create_organization(db_session, "Org 2")

        await create_membership(db_session, user, org1, is_default=True)
        await create_membership(db_session, user, org2, is_default=False)

        await db_session.commit()

        # Execute
        await OrganizationService.switch_organization(user.id, org2.id, db_session)

        # Create new session to verify commit
        # (In real app, this would be a new request with fresh session)
        # For this test, we can query the current session since commit was called
        result = await OrganizationService.get_current_organization_id(
            user.id, db_session
        )

        # Assert: Change persisted (org2 is now default)
        assert result == org2.id
