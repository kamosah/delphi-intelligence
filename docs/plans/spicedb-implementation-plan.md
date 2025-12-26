# SpiceDB Authorization System - Detailed Implementation Plan

**Date**: 2025-12-25
**Related ADR**: [ADR-013: Authorization System - SpiceDB Migration](../adr/013-authorization-system-spicedb.md)
**Parent Epic**: LOG-218 (Access Control & Authorization)
**Total Effort**: 13 points (~16-20 hours)

## Overview

This plan details the implementation of SpiceDB as Olympus's authorization system, replacing the deprecated Oso library and scattered inline permission checks.

**Key Decisions**:

- Use SpiceDB open source (Apache 2.0)
- Self-host in development (Docker Compose)
- Design schema for RBAC + ReBAC + ABAC
- Sync relationships via Supabase database triggers
- Migrate all inline checks to centralized authorization

---

## Phase 1: SpiceDB Foundation (3 points, ~4-6 hours)

### LOG-246: Integrate SpiceDB Authorization System

**Epic**: LOG-218
**Points**: 3
**Priority**: High
**Description**: Set up SpiceDB infrastructure and design authorization schema for Olympus

#### Task 1.1: Install SpiceDB (0.5 points)

**Subtasks**:

```bash
# 1. Add SpiceDB to docker-compose.yml
services:
  spicedb:
    image: authzed/spicedb:v1.48.0  # Pinned version for security and reproducibility
    platform: linux/amd64
    command: serve
    ports:
      - "50051:50051"  # gRPC
      - "8443:8443"    # HTTP
    environment:
      - SPICEDB_DATASTORE_ENGINE=postgres
      - SPICEDB_DATASTORE_CONN_URI=postgres://postgres:postgres@db:5432/olympus_dev?sslmode=disable
      - SPICEDB_GRPC_PRESHARED_KEY=${SPICEDB_TOKEN}
    depends_on:
      - db
    networks:
      - olympus-network

# 2. Add to .env
SPICEDB_TOKEN=your-development-token-here
SPICEDB_ENDPOINT=localhost:50051

# 3. Test connection
docker compose up spicedb
docker compose exec spicedb spicedb version
```

**Acceptance Criteria**:

- [ ] SpiceDB running in Docker Compose
- [ ] gRPC port 50051 accessible
- [ ] Connected to Olympus PostgreSQL database
- [ ] Pre-shared key authentication working

#### Task 1.2: Install Python Client (0.5 points)

**Subtasks**:

```bash
cd apps/api
docker compose exec api poetry add authzed
```

**Files Modified**:

- `apps/api/pyproject.toml` - Add `authzed = "^1.0.0"`
- `apps/api/poetry.lock` - Lock dependencies

**Acceptance Criteria**:

- [ ] `authzed` package installed
- [ ] Import successful: `from authzed.api.v1 import Client`

#### Task 1.3: Design Schema (1 point)

**Create**: `apps/api/app/policies/olympus.zed`

**Schema Design**:

```zed
/**
 * Olympus Authorization Schema
 *
 * Models:
 * - RBAC: Organization roles (owner, admin, member, viewer)
 * - ReBAC: Space membership and relationships
 * - ABAC: Subscription tiers, time-based access via caveats
 */

// ============================================================================
// User Definition
// ============================================================================

definition user {}

// ============================================================================
// Organization - RBAC Pattern
// ============================================================================

definition organization {
  // Relationships
  relation owner: user
  relation admin: user
  relation member: user
  relation viewer: user

  // Permissions (hierarchical)
  permission delete = owner
  permission manage_settings = owner + admin
  permission manage_billing = owner
  permission invite_member = owner + admin
  permission remove_member = owner + admin
  permission view = viewer + member + admin + owner
}

// ============================================================================
// Space - ReBAC Pattern with Organization Inheritance
// ============================================================================

definition space {
  // Relationships
  relation organization: organization
  relation owner: user
  relation editor: user
  relation viewer: user

  // Permissions
  permission delete = owner + organization->admin
  permission manage_members = owner + organization->admin
  permission upload_document = owner + editor + organization->admin
  permission update = owner + editor + organization->admin
  permission read = viewer + editor + owner + organization->member
}

// ============================================================================
// Document - Space-Based Permissions
// ============================================================================

definition document {
  // Relationships
  relation space: space
  relation uploader: user

  // Permissions (inherit from space)
  permission delete = uploader + space->manage_members
  permission update = uploader + space->upload_document
  permission read = space->read
}

// ============================================================================
// Organization Invitation - Pre-Authorization
// ============================================================================

definition organization_invitation {
  // Relationships
  relation organization: organization
  relation inviter: user
  relation invitee: user  // Email match via caveat

  // Permissions
  permission revoke = organization->admin
  permission resend = organization->admin
  permission accept = invitee
  permission view = invitee + organization->admin
}

// ============================================================================
// Caveats - ABAC for Subscription Tiers
// ============================================================================

caveat has_pro_subscription(user_tier string) {
  user_tier == "pro" || user_tier == "enterprise"
}

caveat has_enterprise_subscription(user_tier string) {
  user_tier == "enterprise"
}

caveat within_trial_period(trial_end timestamp) {
  now() < trial_end
}

// ============================================================================
// Advanced Features (Gated by Subscription)
// ============================================================================

definition advanced_feature {
  relation user: user with has_pro_subscription | within_trial_period
  permission access = user
}

definition enterprise_feature {
  relation user: user with has_enterprise_subscription
  permission access = user
}
```

**Acceptance Criteria**:

- [ ] Schema covers all Olympus entities (org, space, document, invitation)
- [ ] RBAC patterns for organization roles
- [ ] ReBAC patterns for space membership
- [ ] ABAC caveats for subscription tiers
- [ ] Schema validated with `zed validate`

#### Task 1.4: Create Authorization Service (1 point)

**Create**: `apps/api/app/services/spicedb_service.py`

```python
"""SpiceDB authorization service for Olympus.

This module provides a centralized authorization service using SpiceDB,
replacing the deprecated Oso library. All permission checks flow through
this service to ensure consistent, centralized access control.
"""

import logging
from typing import Any
from uuid import UUID

from authzed.api.v1 import (
    AsyncClient,
    CheckPermissionRequest,
    CheckPermissionResponse,
    Consistency,
    ObjectReference,
    Relationship,
    RelationshipFilter,
    RelationshipUpdate,
    SubjectFilter,
    SubjectReference,
    WriteRelationshipsRequest,
    DeleteRelationshipsRequest,
)
from authzed.api.v1.permission_service_pb2 import (
    Permissionship as PermissionshipValue,
)

from app.config import settings

logger = logging.getLogger(__name__)


class SpiceDBService:
    """Centralized authorization service using SpiceDB.

    This service handles all permission checks and relationship management
    for Olympus using the SpiceDB authorization system.

    Note: Uses AsyncClient for proper async/await support in FastAPI.
    """

    _instance: "SpiceDBService | None" = None

    def __new__(cls) -> "SpiceDBService":
        """Ensure only one instance exists (singleton pattern)."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize the SpiceDB async client."""
        if hasattr(self, "_initialized"):
            return

        self.client = AsyncClient(
            settings.spicedb_endpoint,
            settings.spicedb_token,
        )
        self._initialized = True
        logger.info("SpiceDB service initialized successfully")

    async def check_permission(
        self,
        user_id: str | UUID,
        permission: str,
        resource_type: str,
        resource_id: str | UUID,
        context: dict[str, Any] | None = None,
    ) -> bool:
        """Check if a user has permission on a resource.

        Args:
            user_id: The user attempting the action
            permission: The permission to check (e.g., "read", "update", "delete")
            resource_type: The type of resource (e.g., "organization", "space", "document")
            resource_id: The ID of the resource
            context: Optional context for caveats (e.g., subscription_tier)

        Returns:
            True if the user has permission, False otherwise

        Example:
            if await spicedb.check_permission(user.id, "read", "space", space.id):
                # Allow access
        """
        try:
            response: CheckPermissionResponse = await self.client.permissions_service.check_permission(
                CheckPermissionRequest(
                    consistency=Consistency(fully_consistent=True),
                    resource=ObjectReference(
                        object_type=resource_type,
                        object_id=str(resource_id),
                    ),
                    permission=permission,
                    subject=SubjectReference(
                        object=ObjectReference(
                            object_type="user",
                            object_id=str(user_id),
                        )
                    ),
                    context=context or {},
                )
            )

            allowed = response.permissionship == PermissionshipValue.PERMISSIONSHIP_HAS_PERMISSION

            logger.debug(
                f"Permission check: user={user_id}, permission={permission}, "
                f"resource={resource_type}:{resource_id}, allowed={allowed}"
            )

            return allowed

        except Exception as e:
            logger.exception(
                f"Permission check failed: user={user_id}, permission={permission}, "
                f"resource={resource_type}:{resource_id}: {e}"
            )
            # Fail closed - deny access on errors
            return False

    async def write_relationship(
        self,
        resource_type: str,
        resource_id: str | UUID,
        relation: str,
        subject_type: str,
        subject_id: str | UUID,
        expiration: int | None = None,
    ) -> bool:
        """Write a relationship to SpiceDB.

        Args:
            resource_type: The type of resource (e.g., "organization")
            resource_id: The ID of the resource
            relation: The relation name (e.g., "member", "owner")
            subject_type: The type of subject (usually "user")
            subject_id: The ID of the subject
            expiration: Optional expiration timestamp (seconds since epoch)

        Returns:
            True if successful, False otherwise

        Example:
            # Add user as organization member
            await spicedb.write_relationship(
                "organization", org.id, "member", "user", user.id
            )
        """
        try:
            relationship = Relationship(
                resource=ObjectReference(
                    object_type=resource_type,
                    object_id=str(resource_id),
                ),
                relation=relation,
                subject=SubjectReference(
                    object=ObjectReference(
                        object_type=subject_type,
                        object_id=str(subject_id),
                    )
                ),
            )

            if expiration:
                relationship.optional_expiration.seconds = expiration

            await self.client.permissions_service.write_relationships(
                WriteRelationshipsRequest(
                    updates=[
                        RelationshipUpdate(
                            operation=RelationshipUpdate.OPERATION_TOUCH,
                            relationship=relationship,
                        )
                    ]
                )
            )

            logger.debug(
                f"Relationship written: {resource_type}:{resource_id}#{relation}@{subject_type}:{subject_id}"
            )

            return True

        except Exception as e:
            logger.exception(f"Failed to write relationship: {e}")
            return False

    async def delete_relationship(
        self,
        resource_type: str,
        resource_id: str | UUID,
        relation: str,
        subject_type: str,
        subject_id: str | UUID,
    ) -> bool:
        """Delete a relationship from SpiceDB.

        Args:
            resource_type: The type of resource
            resource_id: The ID of the resource
            relation: The relation name
            subject_type: The type of subject
            subject_id: The ID of the subject

        Returns:
            True if successful, False otherwise
        """
        try:
            await self.client.permissions_service.delete_relationships(
                DeleteRelationshipsRequest(
                    relationship_filter=RelationshipFilter(
                        resource_type=resource_type,
                        optional_resource_id=str(resource_id),
                        optional_relation=relation,
                        optional_subject_filter=SubjectFilter(
                            subject_type=subject_type,
                            optional_subject_id=str(subject_id),
                        ),
                    )
                )
            )

            logger.debug(
                f"Relationship deleted: {resource_type}:{resource_id}#{relation}@{subject_type}:{subject_id}"
            )

            return True

        except Exception as e:
            logger.exception(f"Failed to delete relationship: {e}")
            return False


# Global singleton instance
_spicedb_service: SpiceDBService | None = None


def get_spicedb_service() -> SpiceDBService:
    """Get the global SpiceDB service instance."""
    global _spicedb_service
    if _spicedb_service is None:
        _spicedb_service = SpiceDBService()
    return _spicedb_service
```

**Configuration Update** (`apps/api/app/config.py`):

```python
class Settings(BaseSettings):
    # ... existing settings ...

    # SpiceDB Configuration
    spicedb_endpoint: str = Field(
        default="localhost:50051",
        description="SpiceDB gRPC endpoint"
    )
    spicedb_token: str = Field(
        default="",
        description="SpiceDB pre-shared key for authentication"
    )
```

**Acceptance Criteria**:

- [ ] `SpiceDBService` class implemented
- [ ] `check_permission()` method working
- [ ] `write_relationship()` method working
- [ ] `delete_relationship()` method working
- [ ] Singleton pattern implemented
- [ ] Configuration settings added
- [ ] Logging implemented

#### Task 1.5: Write Integration Tests (0 points - included in 1.4)

**Create**: `apps/api/tests/test_spicedb_service.py`

**Testing Philosophy** (per TESTING.md):

- Use real SpiceDB service in tests (no mocking)
- Tests run against Docker Compose SpiceDB instance
- AAA pattern: Arrange → Act → Assert
- Test isolation via unique UUIDs per test

```python
"""Integration tests for SpiceDB authorization service.

These tests use a real SpiceDB instance running in Docker Compose.
No mocking - we test the actual authorization behavior.
"""

import pytest
from uuid import uuid4

from app.services.spicedb_service import SpiceDBService


class TestSpiceDBServiceIntegration:
    """Integration tests using real SpiceDB instance."""

    async def test_write_and_check_organization_owner_permission(
        self, spicedb_service: SpiceDBService
    ) -> None:
        """Test writing organization owner relationship and checking permissions.

        AAA Pattern:
        - Arrange: Create relationships in SpiceDB
        - Act: Check permissions
        - Assert: Verify permission resolution is correct
        """
        user_id = str(uuid4())
        org_id = str(uuid4())

        # Arrange: Write relationship - user is owner of organization
        success = await spicedb_service.write_relationship(
            resource_type="organization",
            resource_id=org_id,
            relation="owner",
            subject_type="user",
            subject_id=user_id,
        )
        assert success is True

        # Act: Check owner permission
        has_permission = await spicedb_service.check_permission(
            user_id=user_id,
            permission="delete",
            resource_type="organization",
            resource_id=org_id,
        )

        # Assert: Owner should have delete permission
        assert has_permission is True

    async def test_hierarchical_permissions_organization_to_space(
        self, spicedb_service: SpiceDBService
    ) -> None:
        """Test that org admins can manage spaces via relationship inheritance."""
        user_id = str(uuid4())
        org_id = str(uuid4())
        space_id = str(uuid4())

        # Arrange: user is admin of organization
        await spicedb_service.write_relationship("organization", org_id, "admin", "user", user_id)

        # Arrange: space belongs to organization
        await spicedb_service.write_relationship("space", space_id, "organization", "organization", org_id)

        # Act: Check if org admin can delete space
        can_delete = await spicedb_service.check_permission(
            user_id, "delete", "space", space_id
        )

        # Assert: Org admin should inherit space deletion permission
        assert can_delete is True
```

**Fixture Setup** (`apps/api/tests/conftest.py`):

```python
@pytest.fixture
async def spicedb_service() -> SpiceDBService:
    """Provide SpiceDB service connected to test instance."""
    from app.services.spicedb_service import get_spicedb_service
    return get_spicedb_service()
```

**Acceptance Criteria**:

- [ ] Test suite covers all service methods using real SpiceDB
- [ ] No mocking of SpiceDB client (integration tests only)
- [ ] Tests verify actual authorization behavior (RBAC, ReBAC)
- [ ] 90%+ code coverage

---

## Phase 2: Relationship Management (4 points, ~5-6 hours)

### LOG-301: Sync Relationships Between PostgreSQL and SpiceDB

**Epic**: LOG-218
**Points**: 4
**Priority**: High
**Description**: Implement automatic relationship synchronization using Supabase database triggers

#### Task 2.1: Organization Relationship Sync (1 point)

**Create**: `apps/api/alembic/versions/YYYYMMDD_spicedb_org_triggers.py`

```python
"""Add SpiceDB relationship sync triggers for organizations.

Revision ID: spicedb_org_triggers
Revises: <previous_revision>
Create Date: 2025-12-25
"""

from alembic import op


def upgrade():
    # Function to sync organization owner relationship
    op.execute("""
        CREATE OR REPLACE FUNCTION sync_organization_owner_to_spicedb()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Call Python function to write relationship
            PERFORM spicedb_write_relationship(
                'organization',
                NEW.id::text,
                'owner',
                'user',
                NEW.owner_id::text
            );
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # Trigger on organization creation
    op.execute("""
        CREATE TRIGGER organization_owner_spicedb_sync
        AFTER INSERT ON organizations
        FOR EACH ROW
        EXECUTE FUNCTION sync_organization_owner_to_spicedb();
    """)

    # Function to sync organization member relationships
    op.execute("""
        CREATE OR REPLACE FUNCTION sync_organization_member_to_spicedb()
        RETURNS TRIGGER AS $$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                -- Write relationship based on role
                PERFORM spicedb_write_relationship(
                    'organization',
                    NEW.organization_id::text,
                    LOWER(NEW.organization_role::text),
                    'user',
                    NEW.user_id::text
                );
            ELSIF TG_OP = 'DELETE' THEN
                -- Delete relationship
                PERFORM spicedb_delete_relationship(
                    'organization',
                    OLD.organization_id::text,
                    LOWER(OLD.organization_role::text),
                    'user',
                    OLD.user_id::text
                );
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # Trigger on organization member changes
    op.execute("""
        CREATE TRIGGER organization_member_spicedb_sync
        AFTER INSERT OR DELETE ON organization_members
        FOR EACH ROW
        EXECUTE FUNCTION sync_organization_member_to_spicedb();
    """)


def downgrade():
    op.execute("DROP TRIGGER IF EXISTS organization_member_spicedb_sync ON organization_members")
    op.execute("DROP TRIGGER IF EXISTS organization_owner_spicedb_sync ON organizations")
    op.execute("DROP FUNCTION IF EXISTS sync_organization_member_to_spicedb()")
    op.execute("DROP FUNCTION IF EXISTS sync_organization_owner_to_spicedb()")
```

**Important - Trigger Implementation Options**:

The trigger functions above reference `spicedb_write_relationship()` and `spicedb_delete_relationship()` which need to be implemented. There are three approaches:

**Option 1: Application-Level Sync (Recommended)**

- Remove database triggers entirely
- Handle relationship syncing in `SpiceDBService` methods
- Called explicitly after creating/updating/deleting memberships
- Pros: Simpler, easier to test, better error handling
- Cons: Requires discipline to call sync methods

**Option 2: PostgreSQL HTTP Extension**

- Use `pg_net` extension (Supabase) or `http` extension
- Implement `spicedb_write_relationship()` as PostgreSQL function that makes HTTP POST to API webhook
- Pros: Automatic syncing via triggers
- Cons: Requires HTTP extension, harder to debug

**Option 3: Event-Based with pg_notify**

- Use PostgreSQL `NOTIFY/LISTEN` for event emission
- Background worker listens and syncs to SpiceDB
- Pros: Decoupled, async processing
- Cons: Requires background worker infrastructure

**Recommended Approach**: Start with **Option 1** (application-level) in Phase 2, then optionally add triggers in Phase 4 if needed.

**Acceptance Criteria**:

- [ ] Trigger fires on organization creation → writes owner relationship
- [ ] Trigger fires on member add → writes member/admin/viewer relationship
- [ ] Trigger fires on member remove → deletes relationship
- [ ] Migration tested on development database

#### Task 2.2: Space Relationship Sync (1 point)

Similar pattern for spaces:

- Space owner relationship
- Space member relationships (owner, editor, viewer)
- Space → organization relationship

**Acceptance Criteria**:

- [ ] Space creation writes owner + organization relationships
- [ ] Space member add/remove syncs to SpiceDB
- [ ] Space deletion removes all relationships

#### Task 2.3: Document Relationship Sync (0.5 points)

Similar pattern for documents:

- Document → space relationship
- Document → uploader relationship

**Acceptance Criteria**:

- [ ] Document upload writes space + uploader relationships
- [ ] Document deletion removes relationships

#### Task 2.4: Backfill Existing Data (1 point)

**Create**: `apps/api/scripts/backfill_spicedb_relationships.py`

```python
"""Backfill existing PostgreSQL data to SpiceDB relationships.

This script reads all existing organizations, spaces, and documents from
PostgreSQL and writes their relationships to SpiceDB. Run once during
initial migration.

Usage:
    docker compose exec api python scripts/backfill_spicedb_relationships.py
"""

import asyncio
import logging
from sqlalchemy import select

from app.db.session import get_db
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember
from app.models.space import Space, SpaceMember
from app.models.document import Document
from app.services.spicedb_service import get_spicedb_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def backfill_organizations():
    """Backfill organization relationships."""
    logger.info("Backfilling organization relationships...")

    spicedb = get_spicedb_service()
    async for db in get_db():
        # Get all organizations
        result = await db.execute(select(Organization))
        orgs = result.scalars().all()

        for org in orgs:
            # Write owner relationship
            await spicedb.write_relationship(
                "organization", org.id, "owner", "user", org.owner_id
            )
            logger.info(f"✓ Organization {org.id}: owner relationship written")

        # Get all memberships
        result = await db.execute(select(OrganizationMember))
        memberships = result.scalars().all()

        for membership in memberships:
            # Write role relationship
            role = membership.organization_role.value.lower()
            await spicedb.write_relationship(
                "organization", membership.organization_id, role, "user", membership.user_id
            )
            logger.info(
                f"✓ Organization {membership.organization_id}: "
                f"{role} relationship for user {membership.user_id}"
            )

    logger.info("Organization backfill complete")


async def backfill_spaces():
    """Backfill space relationships."""
    logger.info("Backfilling space relationships...")

    spicedb = get_spicedb_service()
    async for db in get_db():
        result = await db.execute(select(Space))
        spaces = result.scalars().all()

        for space in spaces:
            # Write organization relationship
            await spicedb.write_relationship(
                "space", space.id, "organization", "organization", space.organization_id
            )

            # Write owner relationship
            await spicedb.write_relationship(
                "space", space.id, "owner", "user", space.owner_id
            )
            logger.info(f"✓ Space {space.id}: relationships written")

        # Space members
        result = await db.execute(select(SpaceMember))
        memberships = result.scalars().all()

        for membership in memberships:
            role = membership.member_role.value.lower()
            await spicedb.write_relationship(
                "space", membership.space_id, role, "user", membership.user_id
            )
            logger.info(f"✓ Space {membership.space_id}: {role} for user {membership.user_id}")

    logger.info("Space backfill complete")


async def backfill_documents():
    """Backfill document relationships."""
    logger.info("Backfilling document relationships...")

    spicedb = get_spicedb_service()
    async for db in get_db():
        result = await db.execute(select(Document))
        documents = result.scalars().all()

        for doc in documents:
            # Write space relationship
            await spicedb.write_relationship(
                "document", doc.id, "space", "space", doc.space_id
            )

            # Write uploader relationship
            await spicedb.write_relationship(
                "document", doc.id, "uploader", "user", doc.uploaded_by
            )
            logger.info(f"✓ Document {doc.id}: relationships written")

    logger.info("Document backfill complete")


async def main():
    """Run all backfill operations."""
    logger.info("Starting SpiceDB relationship backfill...")

    await backfill_organizations()
    await backfill_spaces()
    await backfill_documents()

    logger.info("✅ All relationships backfilled successfully!")


if __name__ == "__main__":
    asyncio.run(main())
```

**Acceptance Criteria**:

- [ ] Script successfully backfills all organizations
- [ ] Script successfully backfills all spaces
- [ ] Script successfully backfills all documents
- [ ] Idempotent (can run multiple times safely)
- [ ] Progress logging for large datasets

#### Task 2.5: Testing & Validation (0.5 points)

**Create**: `apps/api/tests/test_relationship_sync.py`

Test that:

- Creating organization writes owner relationship
- Adding member writes role relationship
- Removing member deletes relationship
- Backfill script handles edge cases

**Acceptance Criteria**:

- [ ] Integration tests for all triggers
- [ ] Backfill script tested on copy of production data
- [ ] Relationship sync verified in SpiceDB

---

## Phase 3: Replace Inline Permission Checks (4 points, ~5-6 hours)

### LOG-302: Migrate Permission Checks to SpiceDB

**Epic**: LOG-218
**Points**: 4
**Priority**: High
**Description**: Replace all inline SQL permission checks with centralized SpiceDB authorization

#### Task 3.1: Organization Mutations (1 point)

**Files to Update**:

- `apps/api/app/graphql/mutation.py` (organization mutations)

**Pattern**:

**Before**:

```python
@strawberry.mutation
async def update_organization(
    self,
    organization_id: strawberry.ID,
    input: UpdateOrganizationInput,
    info: Info,
) -> Organization:
    request = info.context["request"]
    user = request.state.user
    db = info.context["db"]

    # OLD: Inline SQL check
    stmt = select(OrganizationMember).where(
        OrganizationMember.organization_id == organization_id,
        OrganizationMember.user_id == user.id,
        OrganizationMember.organization_role.in_(['admin', 'owner'])
    )
    membership = await db.execute(stmt)
    if not membership.scalar_one_or_none():
        raise PermissionDenied("Insufficient permissions")

    # ... update logic ...
```

**After**:

```python
from app.services.spicedb_service import get_spicedb_service

@strawberry.mutation
async def update_organization(
    self,
    organization_id: strawberry.ID,
    input: UpdateOrganizationInput,
    info: Info,
) -> Organization:
    request = info.context["request"]
    user = request.state.user
    spicedb = get_spicedb_service()

    # NEW: Centralized SpiceDB check
    if not await spicedb.check_permission(
        user.id, "manage_settings", "organization", organization_id
    ):
        raise PermissionDenied("Cannot update this organization")

    # ... update logic ...
```

**Mutations to Update**:

- `update_organization` → "manage_settings"
- `delete_organization` → "delete"
- `add_organization_member` → "invite_member"
- `remove_organization_member` → "remove_member"
- `update_member_role` → "manage_settings"

**Acceptance Criteria**:

- [ ] All organization mutations use SpiceDB
- [ ] No inline SQL permission checks remain
- [ ] All tests passing
- [ ] GraphQL queries validated

#### Task 3.2: Space Mutations (1 point)

Similar pattern for space mutations:

- `update_space` → "update"
- `delete_space` → "delete"
- `add_space_member` → "manage_members"
- `remove_space_member` → "manage_members"

**Acceptance Criteria**:

- [ ] All space mutations use SpiceDB
- [ ] Public/private space logic preserved
- [ ] Org admin override working

#### Task 3.3: Document Mutations (0.5 points)

Similar pattern for document mutations:

- `delete_document` → "delete"
- `bulk_delete_documents` → "delete" (check each)

**Acceptance Criteria**:

- [ ] Document mutations use SpiceDB
- [ ] Uploader permission logic preserved

#### Task 3.4: Invitation System (1 point)

Update invitation mutations to use SpiceDB:

- `invite_member` → Check "invite_member" on organization
- `revoke_invitation` → Check "revoke" on invitation
- `accept_invitation` → Check "accept" on invitation

**Acceptance Criteria**:

- [ ] Invitation flow uses SpiceDB
- [ ] Email matching logic preserved
- [ ] Pre-authorization pattern working

#### Task 3.5: Remove Legacy Code (0.5 points)

**Search and destroy**:

```bash
cd apps/api
grep -rn "organization_role.in_" app/graphql/
grep -rn "member_role =" app/graphql/
grep -rn "space_role" app/graphql/
```

Remove or refactor:

- Old `PermissionService` methods
- Inline permission checks
- Direct role queries for authorization

**Acceptance Criteria**:

- [ ] Zero inline permission checks found
- [ ] Legacy `PermissionService` removed or refactored
- [ ] Code audit complete

---

## Phase 4: Advanced Features & Testing (2 points, ~2-4 hours)

### LOG-303: Implement Advanced Authorization Features

**Epic**: LOG-218
**Points**: 2
**Priority**: Medium
**Description**: Implement subscription tier enforcement and time-based access using SpiceDB caveats

#### Task 4.1: Subscription Tier Enforcement (0.5 points)

**Use Case**: Gate advanced features by subscription tier

**Implementation**:

```python
# Check if user has access to pro feature
has_access = await spicedb.check_permission(
    user_id=user.id,
    permission="access",
    resource_type="advanced_feature",
    resource_id="vector_search",
    context={
        "user_tier": user.subscription_tier,  # "free", "pro", "enterprise"
    }
)

if not has_access:
    raise PaywallError("Upgrade to Pro to use vector search")
```

**Acceptance Criteria**:

- [ ] Subscription tier context passed to SpiceDB
- [ ] Pro features gated correctly
- [ ] Enterprise features gated correctly
- [ ] Trials respect expiration

#### Task 4.2: Time-Based Access (0.5 points)

**Use Case**: Temporary support access (expires after 24 hours)

**Implementation**:

```python
import time

# Grant temporary support access
expiration = int(time.time()) + 86400  # 24 hours from now

await spicedb.write_relationship(
    resource_type="organization",
    resource_id=org.id,
    relation="support_access",
    subject_type="user",
    subject_id=support_user.id,
    expiration=expiration,
)
```

**Acceptance Criteria**:

- [ ] Relationship expiration working
- [ ] Support access auto-expires
- [ ] Admin can grant/revoke temporary access

#### Task 4.3: Comprehensive Testing (1 point)

**Create**: `apps/api/tests/integration/test_spicedb_authorization.py`

Test scenarios:

- Organization RBAC (owner, admin, member, viewer)
- Space ReBAC (org admin override, space member access)
- Document permissions (uploader, space member)
- Subscription tier enforcement
- Time-based expiration
- Invitation pre-authorization

**Performance Testing**:

```python
@pytest.mark.performance
async def test_authorization_latency():
    """Ensure p95 latency < 10ms for permission checks."""
    import time

    latencies = []
    for _ in range(1000):
        start = time.perf_counter()
        await spicedb.check_permission(user.id, "read", "space", space.id)
        end = time.perf_counter()
        latencies.append((end - start) * 1000)  # Convert to ms

    p95 = sorted(latencies)[int(len(latencies) * 0.95)]
    assert p95 < 10, f"p95 latency {p95}ms exceeds 10ms target"
```

**Acceptance Criteria**:

- [ ] 90%+ test coverage for authorization paths
- [ ] Integration tests passing
- [ ] Performance: p95 < 10ms
- [ ] No authorization bypass vulnerabilities

---

## Linear Ticket Summary

### New Tickets to Create

1. **LOG-246**: Integrate SpiceDB Authorization System (3 points)
   - Replaces previous "Oso Implementation" ticket
   - Install SpiceDB, design schema, create service

2. **LOG-301**: Sync Relationships Between PostgreSQL and SpiceDB (4 points)
   - NEW ticket
   - Database triggers, backfill script

3. **LOG-302**: Migrate Permission Checks to SpiceDB (4 points)
   - NEW ticket
   - Replace all inline checks

4. **LOG-303**: Implement Advanced Authorization Features (2 points)
   - NEW ticket
   - Subscription tiers, time-based access

5. **LOG-245**: Organization Invitations (UPDATED - 6 points)
   - Keep existing scope
   - Update to use SpiceDB instead of Oso

### Tickets to Update

- **LOG-218**: Access Control & Authorization (parent epic)
  - Update description to reflect SpiceDB approach
  - Adjust sub-ticket estimates

### Tickets to Close

- **PR #57**: Close Oso implementation PR (Phase 1 from old plan)
  - Reason: Oso deprecated, pivoting to SpiceDB

---

## Timeline & Milestones

### Week 1 (Phase 1 + 2)

- **Days 1-2**: SpiceDB installation, schema design, service implementation
- **Days 3-4**: Relationship sync triggers, backfill script
- **Milestone**: SpiceDB operational, relationships syncing

### Week 2 (Phase 3)

- **Days 1-2**: Migrate organization/space mutations
- **Days 3-4**: Migrate document mutations, invitation system
- **Milestone**: All inline checks replaced

### Week 3 (Phase 4)

- **Days 1-2**: Advanced features (tiers, expiration)
- **Day 3**: Testing, performance validation
- **Milestone**: Production-ready authorization system

**Total Duration**: ~2-3 weeks (depending on team capacity)

---

## Success Criteria

### Functional

- [ ] All permission checks flow through SpiceDB
- [ ] Zero inline SQL authorization queries
- [ ] Relationship sync working (organizations, spaces, documents)
- [ ] Backfill completed for existing data
- [ ] Invitation system using SpiceDB pre-authorization

### Performance

- [ ] Authorization check latency p95 < 10ms
- [ ] Authorization check latency p99 < 50ms
- [ ] Relationship sync lag < 1 second
- [ ] No measurable impact on GraphQL mutation latency

### Quality

- [ ] 90%+ test coverage for authorization paths
- [ ] Zero authorization bypass vulnerabilities found
- [ ] All existing E2E tests passing
- [ ] Security audit complete

### Operational

- [ ] SpiceDB running in Docker Compose (dev)
- [ ] SpiceDB schema versioned in git
- [ ] Monitoring and alerts configured
- [ ] Rollback plan documented and tested

---

## Risks & Mitigation

### Risk: Relationship Sync Failures

**Impact**: SpiceDB out of sync with PostgreSQL
**Mitigation**:

- Comprehensive error handling in triggers
- Dead letter queue for failed syncs
- Periodic reconciliation job
- Monitoring and alerting

### Risk: Performance Degradation

**Impact**: Slower GraphQL mutations
**Mitigation**:

- Cache frequently-checked permissions (5-min TTL)
- Batch permission checks where possible
- Use SpiceDB's LookupResources for filtering
- Load testing before production deployment

### Risk: Learning Curve

**Impact**: Team unfamiliar with Zanzibar concepts
**Mitigation**:

- Comprehensive documentation
- Team training session (2 hours)
- Start with simple RBAC, evolve to ReBAC
- Pair programming for first implementations

### Risk: Migration Bugs

**Impact**: Authorization bypass or overly restrictive access
**Mitigation**:

- Feature flag for SpiceDB (gradual rollout)
- Keep inline checks as backup during migration
- Extensive testing (unit, integration, E2E)
- Manual QA of critical flows

---

## Documentation Requirements

### Developer Documentation

- [ ] SpiceDB schema reference
- [ ] How to add new permission rules
- [ ] How to write relationships
- [ ] Troubleshooting guide

### Operations Documentation

- [ ] SpiceDB deployment guide
- [ ] Monitoring and alerting setup
- [ ] Backup and recovery procedures
- [ ] Relationship reconciliation runbook

### User-Facing

- [ ] Updated API docs (if authorization affects public APIs)
- [ ] Permission model explanation (for admins)

---

## Appendix: Key Commands

### Development

```bash
# Start SpiceDB
docker compose up spicedb

# Validate schema
docker compose exec spicedb zed validate olympus.zed

# Write schema
docker compose exec spicedb zed schema write olympus.zed

# Check permission (CLI)
docker compose exec spicedb zed permission check \
  organization:org123 manage_settings user:user456

# Run backfill
docker compose exec api python scripts/backfill_spicedb_relationships.py

# Run tests
docker compose exec api poetry run pytest tests/test_spicedb_service.py -v
```

### Production

```bash
# Schema deployment
zed schema write --endpoint=prod.spicedb.com olympus.zed

# Monitoring
curl http://localhost:9090/metrics  # Prometheus metrics
```

---

## References

- [SpiceDB Documentation](https://authzed.com/docs/spicedb/getting-started/discovering-spicedb)
- [ADR-013: Authorization System - SpiceDB Migration](../adr/013-authorization-system-spicedb.md)
- [Authorization Research Document](../research/authorization-solutions-2025.md)
- [Zanzibar Paper](https://research.google/pubs/pub48190/)
