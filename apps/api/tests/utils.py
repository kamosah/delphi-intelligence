"""
Reusable Test Utilities

This module provides helper factories for creating test data with real database operations.
These utilities are designed to work with the in-memory SQLite fixture from conftest.py.

Usage:
    from tests.utils import create_user, create_organization, create_membership

    async def test_example(db_session: AsyncSession):
        user = await create_user(db_session, email="test@example.com")
        org = await create_organization(db_session, "Test Org")
        member = await create_membership(db_session, user, org, is_default=True)
"""

from datetime import datetime, timedelta, UTC
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentStatus
from app.models.message import Message, MessageRole
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember, OrganizationRole
from app.models.space import Space
from app.models.thread import Thread, ThreadStatus
from app.models.user import User


# --------------------------------------------------------------------------- #
# User Factories
# --------------------------------------------------------------------------- #


async def create_user(
    session: AsyncSession,
    email: str | None = None,
    full_name: str | None = None,
    is_active: bool = True,
) -> User:
    """
    Create a test user in the database.

    Args:
        session: Database session
        email: User email (auto-generated if None)
        full_name: User's full name
        is_active: Whether user is active

    Returns:
        Created User instance
    """
    user = User(
        email=email or f"user-{uuid4()}@test.com",
        full_name=full_name,
        is_active=is_active,
    )
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return user


# --------------------------------------------------------------------------- #
# Organization Factories
# --------------------------------------------------------------------------- #


async def create_organization(
    session: AsyncSession,
    name: str,
    slug: str | None = None,
    description: str | None = None,
    owner_id: str | None = None,
) -> Organization:
    """
    Create a test organization in the database.

    Args:
        session: Database session
        name: Organization name
        slug: Organization slug (auto-generated from name if None)
        description: Organization description
        owner_id: Owner user ID

    Returns:
        Created Organization instance
    """
    org = Organization(
        name=name,
        slug=slug or name.lower().replace(" ", "-"),
        description=description,
        owner_id=owner_id,
    )
    session.add(org)
    await session.flush()
    await session.refresh(org)
    return org


async def create_membership(
    session: AsyncSession,
    user: User,
    org: Organization,
    *,
    is_default: bool = False,
    role: OrganizationRole = OrganizationRole.MEMBER,
    last_active_at: datetime | None = None,
    created_at_days_ago: int | None = None,
) -> OrganizationMember:
    """
    Create a test organization membership in the database.

    Args:
        session: Database session
        user: User instance
        org: Organization instance
        is_default: Whether this is the user's default organization
        role: Organization role (OWNER, ADMIN, MEMBER)
        last_active_at: Last active timestamp
        created_at_days_ago: Override created_at to N days ago

    Returns:
        Created OrganizationMember instance
    """
    member = OrganizationMember(
        user_id=user.id,
        organization_id=org.id,
        organization_role=role,
        is_default=is_default,
        last_active_at=last_active_at,
    )

    # Override created_at if specified
    if created_at_days_ago is not None:
        member.created_at = datetime.now(UTC) - timedelta(days=created_at_days_ago)

    session.add(member)
    await session.flush()
    await session.refresh(member)
    return member


# --------------------------------------------------------------------------- #
# Space Factories
# --------------------------------------------------------------------------- #


async def create_space(
    session: AsyncSession,
    name: str,
    organization: Organization,
    owner: User,
    *,
    slug: str | None = None,
    description: str | None = None,
) -> Space:
    """
    Create a test space in the database.

    Args:
        session: Database session
        name: Space name
        organization: Organization instance
        owner: Owner user
        slug: Space slug (auto-generated from name if None)
        description: Space description

    Returns:
        Created Space instance
    """
    space = Space(
        name=name,
        slug=slug or name.lower().replace(" ", "-"),
        description=description,
        organization_id=organization.id,
        owner_id=owner.id,
    )
    session.add(space)
    await session.flush()
    await session.refresh(space)
    return space


# --------------------------------------------------------------------------- #
# Document Factories
# --------------------------------------------------------------------------- #


async def create_document(
    session: AsyncSession,
    name: str,
    space: Space,
    uploaded_by: User,
    *,
    file_type: str = "application/pdf",
    file_path: str | None = None,
    size_bytes: int = 1024,
    status: DocumentStatus = DocumentStatus.UPLOADED,
    extracted_text: str | None = None,
) -> Document:
    """
    Create a test document in the database.

    Args:
        session: Database session
        name: Document name
        space: Space instance
        uploaded_by: User who uploaded the document
        file_type: MIME type
        file_path: Storage file path
        size_bytes: File size in bytes
        status: Document processing status
        extracted_text: Extracted text content

    Returns:
        Created Document instance
    """
    doc = Document(
        name=name,
        file_type=file_type,
        file_path=file_path or f"uploads/{uuid4()}/{name}",
        size_bytes=size_bytes,
        space_id=space.id,
        uploaded_by=uploaded_by.id,
        status=status,
        extracted_text=extracted_text,
    )
    session.add(doc)
    await session.flush()
    await session.refresh(doc)
    return doc


# --------------------------------------------------------------------------- #
# Thread & Message Factories
# --------------------------------------------------------------------------- #


async def create_thread(
    session: AsyncSession,
    query_text: str,
    organization: Organization,
    creator: User,
    *,
    space: Space | None = None,
    title: str | None = None,
    status: ThreadStatus = ThreadStatus.PENDING,
) -> Thread:
    """
    Create a test thread in the database.

    Args:
        session: Database session
        query_text: Initial query text
        organization: Organization instance
        creator: User who created the thread
        space: Optional Space instance (None for org-wide threads)
        title: Thread title
        status: Thread status

    Returns:
        Created Thread instance
    """
    thread = Thread(
        query_text=query_text,
        title=title,
        organization_id=organization.id,
        space_id=space.id if space else None,
        created_by=creator.id,
        status=status,
    )
    session.add(thread)
    await session.flush()
    await session.refresh(thread)
    return thread


async def create_message(
    session: AsyncSession,
    thread: Thread,
    content: str,
    *,
    role: MessageRole = MessageRole.USER,
    message_metadata: dict | None = None,
) -> Message:
    """
    Create a test message in the database.

    Args:
        session: Database session
        thread: Thread instance
        content: Message content
        role: Message role (USER, ASSISTANT, SYSTEM)
        message_metadata: Optional metadata JSON

    Returns:
        Created Message instance
    """
    message = Message(
        thread_id=thread.id,
        message_role=role,
        content=content,
        message_metadata=message_metadata or {},
    )
    session.add(message)
    await session.flush()
    await session.refresh(message)
    return message


# --------------------------------------------------------------------------- #
# Composite Factories (Common Test Scenarios)
# --------------------------------------------------------------------------- #


async def create_user_with_org(
    session: AsyncSession,
    *,
    user_email: str | None = None,
    org_name: str = "Test Organization",
    role: OrganizationRole = OrganizationRole.OWNER,
) -> tuple[User, Organization, OrganizationMember]:
    """
    Create a user with an organization membership (common test scenario).

    Args:
        session: Database session
        user_email: User email (auto-generated if None)
        org_name: Organization name
        role: Organization role

    Returns:
        Tuple of (User, Organization, OrganizationMember)
    """
    user = await create_user(session, email=user_email)
    org = await create_organization(session, name=org_name, owner_id=user.id)
    member = await create_membership(session, user, org, is_default=True, role=role)
    await session.commit()
    return user, org, member


async def create_space_with_document(
    session: AsyncSession,
    space_name: str,
    doc_name: str,
    organization: Organization,
    owner: User,
) -> tuple[Space, Document]:
    """
    Create a space with a document (common test scenario).

    Args:
        session: Database session
        space_name: Space name
        doc_name: Document name
        organization: Organization instance
        owner: Owner user

    Returns:
        Tuple of (Space, Document)
    """
    space = await create_space(session, space_name, organization, owner)
    doc = await create_document(session, doc_name, space, owner)
    await session.commit()
    return space, doc


async def create_thread_with_messages(
    session: AsyncSession,
    query_text: str,
    organization: Organization,
    creator: User,
    *,
    space: Space | None = None,
    num_exchanges: int = 1,
) -> tuple[Thread, list[Message]]:
    """
    Create a thread with user/assistant message pairs (common test scenario).

    Args:
        session: Database session
        query_text: Initial query text
        organization: Organization instance
        creator: User who created the thread
        space: Optional Space instance
        num_exchanges: Number of user/assistant message pairs to create

    Returns:
        Tuple of (Thread, list[Message])
    """
    thread = await create_thread(session, query_text, organization, creator, space=space)

    messages = []
    for i in range(num_exchanges):
        # User message
        user_msg = await create_message(
            session,
            thread,
            f"User message {i + 1}: {query_text}",
            role=MessageRole.USER,
        )
        messages.append(user_msg)

        # Assistant message
        assistant_msg = await create_message(
            session,
            thread,
            f"Assistant response {i + 1}",
            role=MessageRole.ASSISTANT,
            message_metadata={"confidence_score": 0.85},
        )
        messages.append(assistant_msg)

    await session.commit()
    return thread, messages
