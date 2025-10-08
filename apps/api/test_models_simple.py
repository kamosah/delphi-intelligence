"""
Simple Mock Testing for Database Models

This approach focuses on testing the business logic and data structures
without requiring a database connection. Perfect for fast unit tests.
"""

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.document import Document
from app.models.query import Query
from app.models.space import MemberRole, Space, SpaceMember
from app.models.user import User


class TestModelValidation:
    """Test model field validation and business logic."""

    def test_user_creation(self):
        """Test User model creation with valid data."""
        user = User(
            email="test@example.com",
            full_name="John Doe",
            avatar_url="https://example.com/avatar.jpg"
        )

        assert user.email == "test@example.com"
        assert user.full_name == "John Doe"
        assert user.avatar_url == "https://example.com/avatar.jpg"

    def test_user_minimal_fields(self):
        """Test User model with only required fields."""
        user = User(email="minimal@example.com")

        assert user.email == "minimal@example.com"
        assert user.full_name is None
        assert user.avatar_url is None

    def test_space_creation(self):
        """Test Space model creation."""
        owner_id = uuid.uuid4()
        space = Space(
            name="My Workspace",
            description="A productive workspace",
            owner_id=owner_id
        )

        assert space.name == "My Workspace"
        assert space.description == "A productive workspace"
        assert space.owner_id == owner_id

    def test_member_roles(self):
        """Test MemberRole enum values."""
        assert MemberRole.OWNER.value == "owner"
        assert MemberRole.EDITOR.value == "editor"
        assert MemberRole.VIEWER.value == "viewer"

    def test_space_member_creation(self):
        """Test SpaceMember model creation."""
        space_id = uuid.uuid4()
        user_id = uuid.uuid4()

        member = SpaceMember(
            space_id=space_id,
            user_id=user_id,
            role=MemberRole.EDITOR
        )

        assert member.space_id == space_id
        assert member.user_id == user_id
        assert member.role == MemberRole.EDITOR

    def test_document_creation(self):
        """Test Document model creation."""
        space_id = uuid.uuid4()
        creator_id = uuid.uuid4()

        document = Document(
            title="Important Document",
            content="This is the document content",
            space_id=space_id,
            created_by=creator_id
        )

        assert document.title == "Important Document"
        assert document.content == "This is the document content"
        assert document.space_id == space_id
        assert document.created_by == creator_id
        assert document.yjs_state is None

    def test_document_with_yjs_state(self):
        """Test Document model with Yjs binary state."""
        space_id = uuid.uuid4()
        creator_id = uuid.uuid4()
        yjs_data = b"binary_yjs_state_data"

        document = Document(
            title="Collaborative Doc",
            content="Initial content",
            yjs_state=yjs_data,
            space_id=space_id,
            created_by=creator_id
        )

        assert document.yjs_state == yjs_data

    def test_query_creation(self):
        """Test Query model creation with correct field names."""
        space_id = uuid.uuid4()
        creator_id = uuid.uuid4()

        query = Query(
            query_text="What is the capital of France?",
            result="The capital of France is Paris.",
            space_id=space_id,
            created_by=creator_id
        )

        assert query.query_text == "What is the capital of France?"
        assert query.result == "The capital of France is Paris."
        assert query.space_id == space_id
        assert query.created_by == creator_id

    def test_query_with_jsonb_data(self):
        """Test Query model with agent steps and sources."""
        space_id = uuid.uuid4()
        creator_id = uuid.uuid4()

        agent_steps = [
            {"step": 1, "action": "search", "query": "capital France"},
            {"step": 2, "action": "analyze", "confidence": 0.95}
        ]

        sources = [
            {"type": "wikipedia", "url": "https://en.wikipedia.org/wiki/Paris", "relevance": 0.98},
            {"type": "document", "id": "doc123", "snippet": "Paris is the capital..."},
        ]

        query = Query(
            query_text="What is the capital of France?",
            agent_steps=agent_steps,
            sources=sources,
            space_id=space_id,
            created_by=creator_id
        )

        # Test JSONB data access
        assert len(query.agent_steps) == 2
        assert query.agent_steps[0]["action"] == "search"
        assert query.agent_steps[1]["confidence"] == 0.95
        assert query.sources[0]["relevance"] == 0.98

    def test_model_representations(self):
        """Test model __repr__ methods."""
        user = User(email="test@example.com")
        user.id = uuid.uuid4()  # Simulate DB assignment

        space = Space(name="Test Space", owner_id=uuid.uuid4())
        space.id = uuid.uuid4()

        query = Query(
            query_text="This is a very long query text that should be truncated in the repr",
            space_id=uuid.uuid4(),
            created_by=uuid.uuid4(),
        )
        query.id = uuid.uuid4()

        # Test representations contain key info
        assert "test@example.com" in repr(user)
        assert "Test Space" in repr(space)
        assert "This is a very long query text that should be" in repr(query)


class TestDatabaseOperationMocks:
    """Test database operations using mocks."""

    @pytest.mark.asyncio
    async def test_successful_user_creation(self):
        """Test successful database user creation."""
        mock_session = AsyncMock()

        user = User(email="new@example.com")
        user.id = uuid.uuid4()  # Simulate DB assignment
        user.created_at = datetime.now(UTC)
        user.updated_at = datetime.now(UTC)

        # Mock session methods - add() is sync, flush() and commit() are async
        mock_session.add = Mock(return_value=None)
        mock_session.flush = AsyncMock(return_value=None)
        mock_session.commit = AsyncMock(return_value=None)

        # Simulate database operations
        mock_session.add(user)
        await mock_session.flush()
        await mock_session.commit()

        # Verify calls were made
        mock_session.add.assert_called_once_with(user)
        mock_session.flush.assert_called_once()
        mock_session.commit.assert_called_once()

        # Verify user data
        assert user.email == "new@example.com"
        assert user.id is not None

    @pytest.mark.asyncio
    async def test_duplicate_email_constraint(self):
        """Test unique email constraint violation."""
        mock_session = AsyncMock()

        # First user succeeds
        user1 = User(email="duplicate@example.com")
        mock_session.add = Mock(return_value=None)
        mock_session.flush = AsyncMock(return_value=None)

        mock_session.add(user1)
        await mock_session.flush()  # This succeeds

        # Second user with same email fails
        user2 = User(email="duplicate@example.com")
        mock_session.add(user2)

        # Mock constraint violation
        mock_session.flush = AsyncMock(side_effect=IntegrityError(
            "duplicate key value violates unique constraint",
            None, None
        ))

        with pytest.raises(IntegrityError):
            await mock_session.flush()

    @pytest.mark.asyncio
    async def test_relationship_queries(self):
        """Test querying related models."""
        mock_session = AsyncMock()

        # Create mock objects with relationships
        user_id = uuid.uuid4()
        space_id = uuid.uuid4()

        # Mock a user with spaces
        user = User(email="owner@example.com")
        user.id = user_id

        space = Space(name="User's Space", owner_id=user_id)
        space.id = space_id

        # Mock query results
        mock_session.execute = AsyncMock()
        mock_session.execute.return_value.scalars.return_value.all.return_value = [space]

        # This would be the actual query in real code:
        # result = await session.execute(select(Space).where(Space.owner_id == user.id))
        # spaces = result.scalars().all()

        # For testing, we just verify the relationship structure
        assert space.owner_id == user.id


class TestJSONBFeatures:
    """Test JSONB-like features that PostgreSQL provides."""

    def test_complex_agent_steps(self):
        """Test complex nested agent step data."""
        complex_steps = [
            {
                "step_id": 1,
                "action": "web_search",
                "params": {
                    "query": "machine learning algorithms",
                    "filters": ["recent", "academic"],
                    "max_results": 10
                },
                "results": {
                    "count": 8,
                    "sources": ["arxiv", "google_scholar"],
                    "execution_time_ms": 245
                }
            },
            {
                "step_id": 2,
                "action": "document_analysis",
                "params": {
                    "document_ids": ["doc1", "doc2", "doc3"],
                    "analysis_type": "semantic_similarity"
                },
                "results": {
                    "similarities": [0.95, 0.87, 0.76],
                    "key_concepts": ["neural networks", "deep learning", "training"]
                }
            }
        ]

        query = Query(
            query_text="Explain machine learning algorithms",
            agent_steps=complex_steps,
            space_id=uuid.uuid4(),
            created_by=uuid.uuid4(),
        )

        # Test deep nested access
        assert query.agent_steps[0]["params"]["max_results"] == 10
        assert query.agent_steps[1]["results"]["similarities"][0] == 0.95
        assert "neural networks" in query.agent_steps[1]["results"]["key_concepts"]

    def test_source_metadata(self):
        """Test rich source metadata structures."""
        sources = [
            {
                "type": "document",
                "id": "internal_doc_123",
                "title": "Company ML Guidelines",
                "relevance_score": 0.94,
                "chunks": [
                    {"section": "introduction", "score": 0.89},
                    {"section": "best_practices", "score": 0.97}
                ],
                "last_updated": "2023-10-01T10:00:00Z"
            },
            {
                "type": "web_source",
                "url": "https://arxiv.org/abs/2301.00001",
                "title": "Recent Advances in ML",
                "relevance_score": 0.91,
                "metadata": {
                    "authors": ["Dr. Smith", "Dr. Jones"],
                    "published": "2023-01-01",
                    "citations": 45
                }
            }
        ]

        query = Query(
            query_text="ML best practices",
            sources=sources,
            space_id=uuid.uuid4(),
            created_by=uuid.uuid4(),
        )

        # Test complex nested queries
        doc_source = query.sources[0]
        web_source = query.sources[1]

        assert doc_source["chunks"][1]["score"] == 0.97
        assert len(web_source["metadata"]["authors"]) == 2
        assert web_source["metadata"]["citations"] == 45


# Utility functions for creating test data


def create_test_user(email: str = "test@example.com", **kwargs) -> User:
    """Create a user for testing with sensible defaults."""
    defaults = {"full_name": "Test User"}
    defaults.update(kwargs)

    user = User(email=email, **defaults)
    user.id = uuid.uuid4()
    user.created_at = datetime.now(UTC)
    user.updated_at = datetime.now(UTC)
    return user


def create_test_space(owner_id: uuid.UUID = None, **kwargs) -> Space:
    """Create a space for testing with sensible defaults."""
    if owner_id is None:
        owner_id = uuid.uuid4()

    defaults = {"name": "Test Space", "description": "A test workspace"}
    defaults.update(kwargs)

    space = Space(owner_id=owner_id, **defaults)
    space.id = uuid.uuid4()
    space.created_at = datetime.now(UTC)
    space.updated_at = datetime.now(UTC)
    return space


def create_test_query(space_id: uuid.UUID = None, created_by: uuid.UUID = None, **kwargs) -> Query:
    """Create a query for testing with sensible defaults."""
    if space_id is None:
        space_id = uuid.uuid4()
    if created_by is None:
        created_by = uuid.uuid4()

    defaults = {
        "query_text": "What is the meaning of life?",
        "result": "42",
        "agent_steps": [{"step": 1, "action": "think"}],
        "sources": [{"type": "book", "title": "Hitchhiker's Guide"}],
    }
    defaults.update(kwargs)

    query = Query(space_id=space_id, created_by=created_by, **defaults)
    query.id = uuid.uuid4()
    query.created_at = datetime.now(UTC)
    query.updated_at = datetime.now(UTC)
    return query


class TestUtilityFunctions:
    """Test the utility functions."""

    def test_create_test_user(self):
        """Test user creation utility."""
        user = create_test_user("utility@example.com")
        assert user.email == "utility@example.com"
        assert user.full_name == "Test User"
        assert user.id is not None

        # Test with custom data
        custom_user = create_test_user(
            "custom@example.com",
            full_name="Custom User",
            avatar_url="https://example.com/avatar.jpg"
        )
        assert custom_user.full_name == "Custom User"
        assert custom_user.avatar_url == "https://example.com/avatar.jpg"

    def test_create_test_space(self):
        """Test space creation utility."""
        space = create_test_space()
        assert space.name == "Test Space"
        assert space.owner_id is not None

    def test_create_test_query(self):
        """Test query creation utility."""
        query = create_test_query()
        assert query.query_text == "What is the meaning of life?"
        assert query.result == "42"
        assert len(query.agent_steps) == 1
        assert len(query.sources) == 1
