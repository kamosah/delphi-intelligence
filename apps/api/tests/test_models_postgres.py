"""
Test models with PostgreSQL database integration.

This module contains comprehensive tests for all database models
using a real PostgreSQL instance for accurate testing.
"""

from datetime import UTC, datetime
import uuid

import pytest
from sqlalchemy import select

from app.models.document import Document
from app.models.query import Query
from app.models.space import MemberRole, Space, SpaceMember
from app.models.user import User


@pytest.mark.asyncio()
async def test_user_model_creation(test_session):
    """Test creating and saving a User model."""
    user = User(email="test@example.com", first_name="John", last_name="Doe")

    test_session.add(user)
    await test_session.flush()

    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.first_name == "John"
    assert user.last_name == "Doe"
    assert user.created_at is not None
    assert user.updated_at is not None


@pytest.mark.asyncio()
async def test_user_email_uniqueness(test_session):
    """Test that user emails must be unique."""
    user1 = User(email="test@example.com")
    user2 = User(email="test@example.com")

    test_session.add(user1)
    await test_session.flush()

    test_session.add(user2)

    with pytest.raises(Exception):  # Should raise integrity error
        await test_session.flush()


@pytest.mark.asyncio()
async def test_space_model_creation(test_session):
    """Test creating and saving a Space model."""
    # Create a user first
    user = User(email="owner@example.com")
    test_session.add(user)
    await test_session.flush()

    space = Space(name="Test Space", description="A test workspace", created_by=user.id)

    test_session.add(space)
    await test_session.flush()

    assert space.id is not None
    assert space.name == "Test Space"
    assert space.description == "A test workspace"
    assert space.created_by == user.id


@pytest.mark.asyncio()
async def test_space_member_roles(test_session):
    """Test space member creation with different roles."""
    # Create users
    owner = User(email="owner@example.com")
    editor = User(email="editor@example.com")
    viewer = User(email="viewer@example.com")

    test_session.add_all([owner, editor, viewer])
    await test_session.flush()

    # Create space
    space = Space(name="Test Space", created_by=owner.id)
    test_session.add(space)
    await test_session.flush()

    # Add members with different roles
    owner_member = SpaceMember(space_id=space.id, user_id=owner.id, role=MemberRole.OWNER)
    editor_member = SpaceMember(space_id=space.id, user_id=editor.id, role=MemberRole.EDITOR)
    viewer_member = SpaceMember(space_id=space.id, user_id=viewer.id, role=MemberRole.VIEWER)

    test_session.add_all([owner_member, editor_member, viewer_member])
    await test_session.flush()

    # Verify roles
    assert owner_member.role == MemberRole.OWNER
    assert editor_member.role == MemberRole.EDITOR
    assert viewer_member.role == MemberRole.VIEWER


@pytest.mark.asyncio()
async def test_document_model_creation(test_session):
    """Test creating and saving a Document model."""
    # Create prerequisites
    user = User(email="user@example.com")
    test_session.add(user)
    await test_session.flush()

    space = Space(name="Test Space", created_by=user.id)
    test_session.add(space)
    await test_session.flush()

    # Create document
    document = Document(
        title="Test Document", content="This is test content", space_id=space.id, created_by=user.id
    )

    test_session.add(document)
    await test_session.flush()

    assert document.id is not None
    assert document.title == "Test Document"
    assert document.content == "This is test content"
    assert document.space_id == space.id
    assert document.created_by == user.id


@pytest.mark.asyncio()
async def test_document_with_yjs_state(test_session):
    """Test document with Yjs binary state."""
    # Create prerequisites
    user = User(email="user@example.com")
    test_session.add(user)
    await test_session.flush()

    space = Space(name="Test Space", created_by=user.id)
    test_session.add(space)
    await test_session.flush()

    # Create document with binary state
    yjs_state = b"fake_yjs_binary_state"
    document = Document(
        title="Collaborative Doc",
        content="Initial content",
        yjs_state=yjs_state,
        space_id=space.id,
        created_by=user.id,
    )

    test_session.add(document)
    await test_session.flush()

    assert document.yjs_state == yjs_state


@pytest.mark.asyncio()
async def test_query_model_with_jsonb(test_session):
    """Test creating a Query model with JSONB fields."""
    # Create prerequisites
    user = User(email="user@example.com")
    test_session.add(user)
    await test_session.flush()

    space = Space(name="Test Space", created_by=user.id)
    test_session.add(space)
    await test_session.flush()

    # Create query with JSONB data
    agent_steps = [
        {"step": 1, "action": "search", "query": "test"},
        {"step": 2, "action": "analyze", "result": "found"},
    ]

    sources = [
        {"type": "document", "id": "doc1", "score": 0.95},
        {"type": "web", "url": "https://example.com", "score": 0.87},
    ]

    query = Query(
        question="What is the meaning of life?",
        response="42",
        agent_steps=agent_steps,
        sources=sources,
        space_id=space.id,
        created_by=user.id,
    )

    test_session.add(query)
    await test_session.flush()

    assert query.id is not None
    assert query.question == "What is the meaning of life?"
    assert query.response == "42"
    assert query.agent_steps == agent_steps
    assert query.sources == sources


@pytest.mark.asyncio()
async def test_model_relationships(test_session):
    """Test that model relationships work correctly."""
    # Create a user
    user = User(email="user@example.com", first_name="Test")
    test_session.add(user)
    await test_session.flush()

    # Create a space
    space = Space(name="Test Space", created_by=user.id)
    test_session.add(space)
    await test_session.flush()

    # Create documents and queries
    doc1 = Document(title="Doc 1", space_id=space.id, created_by=user.id)
    doc2 = Document(title="Doc 2", space_id=space.id, created_by=user.id)

    query1 = Query(question="Question 1", space_id=space.id, created_by=user.id)
    query2 = Query(question="Question 2", space_id=space.id, created_by=user.id)

    test_session.add_all([doc1, doc2, query1, query2])
    await test_session.flush()

    # Test relationships by querying
    # Find all documents in the space
    result = await test_session.execute(select(Document).where(Document.space_id == space.id))
    documents = result.scalars().all()
    assert len(documents) == 2

    # Find all queries by the user
    result = await test_session.execute(select(Query).where(Query.created_by == user.id))
    queries = result.scalars().all()
    assert len(queries) == 2


@pytest.mark.asyncio()
async def test_model_timestamps(test_session):
    """Test that timestamps are set correctly."""
    user = User(email="timestamp@example.com")
    test_session.add(user)
    await test_session.flush()

    # Check initial timestamps
    created_time = user.created_at
    updated_time = user.updated_at

    assert created_time is not None
    assert updated_time is not None
    assert abs((created_time - datetime.now(UTC)).total_seconds()) < 5

    # Update the user
    user.first_name = "Updated"
    await test_session.flush()

    # Updated timestamp should change
    assert user.updated_at > updated_time
    assert user.created_at == created_time  # Created should stay the same


@pytest.mark.asyncio()
async def test_uuid_primary_keys(test_session):
    """Test that UUID primary keys are generated correctly."""
    user = User(email="uuid@example.com")
    test_session.add(user)
    await test_session.flush()

    # Check that ID is a valid UUID
    assert user.id is not None
    assert isinstance(user.id, uuid.UUID)

    # Check that UUIDs are unique
    user2 = User(email="uuid2@example.com")
    test_session.add(user2)
    await test_session.flush()

    assert user2.id != user.id
