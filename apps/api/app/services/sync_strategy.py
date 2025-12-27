"""Sync strategy configuration for SpiceDB authorization system.

This module defines which operations use synchronous vs asynchronous sync strategies:
- Synchronous (Tier 1): Critical operations that require immediate permission consistency
- Asynchronous (Tier 2): Non-critical operations that can use eventual consistency via outbox

Strategy Selection Criteria:
- Use synchronous for operations where users immediately check permissions
- Use asynchronous for high-throughput operations or where slight delay is acceptable
"""

from enum import StrEnum


class SyncStrategy(StrEnum):
    """Sync strategy for authorization events."""

    SYNCHRONOUS = "synchronous"  # Write to SpiceDB BEFORE database commit
    ASYNCHRONOUS = "asynchronous"  # Write to outbox, process via webhook


# Event type to sync strategy mapping
# This determines which events use synchronous vs asynchronous sync
EVENT_SYNC_STRATEGY = {
    # === Tier 1: Synchronous (Critical Permission Operations) ===
    # User immediately checks permissions after these operations
    "organization_created": SyncStrategy.SYNCHRONOUS,  # User registration flow
    "organization_deleted": SyncStrategy.SYNCHRONOUS,  # Owner permissions removed
    # Invitation acceptance creates member - user expects immediate access
    # (invitation_accepted event will be added when invitation system is implemented)
    # "invitation_accepted": SyncStrategy.SYNCHRONOUS,  # noqa: ERA001
    # === Tier 2: Asynchronous (Non-Critical Operations) ===
    # These can tolerate 100-500ms eventual consistency delay
    "organization_member_added": SyncStrategy.ASYNCHRONOUS,  # Admin adds non-elevated members
    "organization_member_removed": SyncStrategy.ASYNCHRONOUS,  # Admin removes members
    "organization_member_role_changed": SyncStrategy.ASYNCHRONOUS,  # Role updates
    "space_created": SyncStrategy.ASYNCHRONOUS,  # Space creation (not permission-critical)
    "space_deleted": SyncStrategy.ASYNCHRONOUS,  # Space deletion
    "space_member_added": SyncStrategy.ASYNCHRONOUS,  # Space member additions
    "space_member_removed": SyncStrategy.ASYNCHRONOUS,  # Space member removals
    "document_created": SyncStrategy.ASYNCHRONOUS,  # Document uploads
    "document_deleted": SyncStrategy.ASYNCHRONOUS,  # Document deletions
    # Future invitation events (asynchronous)
    # "invitation_created": SyncStrategy.ASYNCHRONOUS,  # noqa: ERA001
    # "invitation_revoked": SyncStrategy.ASYNCHRONOUS,  # noqa: ERA001
}


def get_sync_strategy(event_type: str) -> SyncStrategy:
    """Get the sync strategy for a given event type.

    Args:
        event_type: The authorization event type (e.g., "organization_created")

    Returns:
        The sync strategy (synchronous or asynchronous)

    Raises:
        ValueError: If event_type is not recognized
    """
    if event_type not in EVENT_SYNC_STRATEGY:
        msg = f"Unknown event type: {event_type}"
        raise ValueError(msg)

    return EVENT_SYNC_STRATEGY[event_type]


def is_synchronous(event_type: str) -> bool:
    """Check if an event type uses synchronous sync.

    Args:
        event_type: The authorization event type

    Returns:
        True if synchronous, False if asynchronous
    """
    return get_sync_strategy(event_type) == SyncStrategy.SYNCHRONOUS


def is_asynchronous(event_type: str) -> bool:
    """Check if an event type uses asynchronous sync.

    Args:
        event_type: The authorization event type

    Returns:
        True if asynchronous, False if synchronous
    """
    return get_sync_strategy(event_type) == SyncStrategy.ASYNCHRONOUS
