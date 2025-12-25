"""Permission constants for Olympus access control.

This module defines all available permissions (actions) for each resource type
in the system. These enums are used throughout the application to provide
type-safe, consistent permission checking with Oso policies.

The permission strings defined here correspond to actions in Polar policy files
(e.g., organization.polar, space.polar, etc.).

Example usage:
    from app.auth.permissions import OrganizationPermission
    from app.auth.authorization import authorize

    if await authorize(user, OrganizationPermission.UPDATE, organization):
        # User can update the organization
        ...
"""

from enum import Enum


class OrganizationPermission(str, Enum):
    """Permissions for organization resources.

    Organizations use Role-Based Access Control (RBAC) with hierarchical roles:
    - OWNER: Full control (all permissions)
    - ADMIN: Management capabilities (read, update, settings, invite/remove members)
    - MEMBER: Read-only access
    - VIEWER: Read-only access (same as MEMBER)

    Attributes:
        READ: View organization details and metadata
        UPDATE: Modify organization name, description, settings
        DELETE: Permanently delete the organization (owner-only)
        MANAGE_SETTINGS: Change organization configuration and preferences
        MANAGE_BILLING: Manage billing, subscriptions, payment methods (owner-only)
        INVITE_MEMBER: Invite new members to the organization
        REMOVE_MEMBER: Remove existing members from the organization
    """

    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    MANAGE_SETTINGS = "manage_settings"
    MANAGE_BILLING = "manage_billing"
    INVITE_MEMBER = "invite_member"
    REMOVE_MEMBER = "remove_member"


class SpacePermission(str, Enum):
    """Permissions for space resources.

    Spaces use Relationship-Based Access Control (ReBAC) combining space-specific
    roles with organization context:

    Space Roles:
    - OWNER: Full control over the space
    - EDITOR: Read, update, upload documents
    - VIEWER: Read-only access

    Organization Context:
    - Organization ADMIN and OWNER can manage any space in their org
    - Public spaces are readable by any org member

    Attributes:
        READ: View space details, documents, and threads
        UPDATE: Modify space metadata (name, description, visibility)
        DELETE: Permanently delete the space and all its contents
        UPLOAD_DOCUMENT: Upload new documents to the space
        MANAGE_MEMBERS: Add or remove space members, change member roles
    """

    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    UPLOAD_DOCUMENT = "upload_document"
    MANAGE_MEMBERS = "manage_members"


class DocumentPermission(str, Enum):
    """Permissions for document resources.

    Documents inherit permissions from their parent space, with additional
    ownership-based rules:
    - Document uploader can always update/delete their own documents
    - Space permissions cascade to documents (e.g., space editors can update any doc)

    Attributes:
        READ: View document content and metadata
        UPDATE: Modify document metadata (name, description, tags)
        DELETE: Permanently delete the document
        SHARE: Generate shareable links or share externally
    """

    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    SHARE = "share"


class InvitationPermission(str, Enum):
    """Permissions for organization invitation resources.

    Invitations use a combination of organizational role checks and ownership:
    - Only organization ADMIN and OWNER can manage invitations
    - Invitees can view and accept their own invitations

    Attributes:
        INVITE_MEMBER: Create new organization invitations
        REVOKE_INVITATION: Cancel pending invitations before they're accepted
        RESEND_INVITATION: Resend invitation emails to pending invitations
        ACCEPT_INVITATION: Accept an invitation and join the organization
        VIEW_INVITATIONS: View all pending invitations for an organization
        VIEW_INVITATION: View a specific invitation (for admin or invitee)
    """

    INVITE_MEMBER = "invite_member"
    REVOKE_INVITATION = "revoke_invitation"
    RESEND_INVITATION = "resend_invitation"
    ACCEPT_INVITATION = "accept_invitation"
    VIEW_INVITATIONS = "view_invitations"
    VIEW_INVITATION = "view_invitation"


# Export all permission enums for convenience
__all__ = [
    "OrganizationPermission",
    "SpacePermission",
    "DocumentPermission",
    "InvitationPermission",
]
