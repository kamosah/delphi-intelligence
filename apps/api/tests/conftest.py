"""
Test Configuration and Fixtures

This module provides pytest fixtures for testing with real in-memory database
and mocked dependencies where necessary.

Note: Test environment is automatically loaded via pytest configuration
(ENV=test in pyproject.toml), which causes Settings to load .env.test.
"""

import asyncio
import os
from collections.abc import AsyncGenerator, Callable, Generator
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import JSON, event
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy.pool import StaticPool
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.schema import Table
from supabase import create_client

from app.config import settings
from app.db import session as db_session_module
from app.db.session import get_session
from app.main import app
from app.services import storage_service as storage_module
from app.models.base import Base
from app.models.message import Message, MessageRole, AuthorType
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember, OrganizationRole
from app.models.space import Space
from app.models.thread import Thread, ThreadStatus, ThreadVisibility
from app.models.user import User
from app.services.spicedb_service import SpiceDBService, get_spicedb_service
from tests.factories import create_user
from tests.utils.spicedb_cleanup import delete_relationships_by_ids


# Import PostgreSQL fixtures for integration tests
# - Fixtures must be imported for pytest discovery even if not directly referenced
from tests.fixtures.postgres import (  # noqa: F401
    authenticated_db_session,  # RLS testing context manager
    postgres_container,
    postgres_engine,
    postgres_session,
    postgres_integration_session,  # For integration tests with real HTTP requests
    unique_test_id,
)

# Import API client abstractions for integration tests
from tests.fixtures.api_clients import GraphQLClient, RESTClient, SSEClient
from tests.fixtures.auth import TestUser, create_test_token
from tests.fixtures.openai_mocks import (
    MockChatOpenAI,
    MockEmbeddingService,
    MockOpenAIEmbeddings,
)
from tests.fixtures.storage_mocks import MockStorageService


# --------------------------------------------------------------------------- #
# Environment Detection
# --------------------------------------------------------------------------- #


def _is_ci_environment() -> bool:
    """Check if running in CI environment (GitHub Actions)."""
    return os.getenv("CI") == "true" or os.getenv("GITHUB_ACTIONS") == "true"


def _is_docker_container() -> bool:
    """Check if running inside a Docker container.

    Detects Docker container execution by checking for:
    - /.dockerenv file (present in Docker containers)
    - DOCKER_CONTAINER environment variable (set by test scripts)
    """
    return Path("/.dockerenv").exists() or os.getenv("DOCKER_CONTAINER") == "true"


def _is_local_host() -> bool:
    """Check if running on local host machine (not CI, not Docker container)."""
    return not _is_ci_environment() and not _is_docker_container()


# Override event_loop fixture to be session-scoped for PostgreSQL integration tests
@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an instance of the default event loop for the entire test session.

    This fixture is session-scoped to support session-scoped async fixtures like
    postgres_engine. Without this, pytest-asyncio's default function-scoped event
    loop causes ScopeMismatch errors.
    """
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_user() -> MagicMock:
    """Create a mock user for testing."""
    user = MagicMock(spec=User)
    user.id = uuid4()
    user.email = "test@example.com"
    user.full_name = "Test User"
    user.is_active = True
    return user


@pytest.fixture
def mock_organization(mock_user: MagicMock) -> MagicMock:
    """Create a mock organization for testing."""
    org = MagicMock(spec=Organization)
    org.id = uuid4()
    org.name = "Test Organization"
    org.slug = "test-org"
    org.description = "Test organization for unit tests"
    org.owner_id = mock_user.id
    org.owner = mock_user
    return org


@pytest.fixture
def mock_organization_member(mock_organization: MagicMock, mock_user: MagicMock) -> MagicMock:
    """Create a mock organization member for testing."""
    member = MagicMock(spec=OrganizationMember)
    member.id = uuid4()
    member.organization_id = mock_organization.id
    member.user_id = mock_user.id
    member.organization_role = OrganizationRole.OWNER
    member.organization = mock_organization
    member.user = mock_user
    return member


@pytest.fixture
def mock_space(mock_user: MagicMock, mock_organization: MagicMock) -> MagicMock:
    """Create a mock space for testing."""
    space = MagicMock(spec=Space)
    space.id = uuid4()
    space.name = "Test Space"
    space.description = "Test space for unit tests"
    space.owner_id = mock_user.id
    space.organization_id = mock_organization.id
    space.slug = "test-space"
    space.organization = mock_organization
    return space


@pytest.fixture
def mock_thread(
    mock_user: MagicMock, mock_organization: MagicMock, mock_space: MagicMock
) -> MagicMock:
    """Create a mock thread (space-scoped) with messages for multi-turn testing."""
    thread = MagicMock(spec=Thread)
    thread.id = uuid4()
    thread.query_text = "What are the key findings?"
    thread.organization_id = mock_organization.id
    thread.space_id = mock_space.id
    thread.created_by = mock_user.id
    thread.owner_user_id = mock_user.id  # Thread ownership model
    thread.visibility = ThreadVisibility.SPACE  # Default to SPACE visibility
    thread.status = ThreadStatus.PENDING
    thread.result = None
    thread.confidence_score = None
    thread.title = None
    thread.organization = mock_organization
    thread.space = mock_space
    thread.creator = mock_user
    thread.owner = mock_user  # Thread ownership model

    # Add mock messages for multi-turn conversation support
    user_msg = MagicMock(spec=Message)
    user_msg.id = uuid4()
    user_msg.thread_id = thread.id
    user_msg.message_role = MessageRole.USER
    user_msg.author_type = AuthorType.USER  # Message authorship model
    user_msg.author_user_id = mock_user.id  # Message authorship model
    user_msg.content = "What are the key findings?"
    user_msg.message_metadata = {}

    assistant_msg = MagicMock(spec=Message)
    assistant_msg.id = uuid4()
    assistant_msg.thread_id = thread.id
    assistant_msg.message_role = MessageRole.ASSISTANT
    assistant_msg.author_type = AuthorType.AGENT  # Message authorship model
    assistant_msg.author_user_id = None  # Agent messages have no user author
    assistant_msg.content = "Based on the analysis, here are the key findings..."
    assistant_msg.message_metadata = {"confidence_score": 0.85}

    thread.messages = [user_msg, assistant_msg]

    return thread


@pytest.fixture
def mock_org_thread(mock_user: MagicMock, mock_organization: MagicMock) -> MagicMock:
    """Create a mock org-wide thread (no space) with messages for multi-turn testing."""
    thread = MagicMock(spec=Thread)
    thread.id = uuid4()
    thread.query_text = "Org-wide query across all spaces"
    thread.organization_id = mock_organization.id
    thread.space_id = None  # Org-wide thread
    thread.created_by = mock_user.id
    thread.status = ThreadStatus.PENDING
    thread.result = None
    thread.confidence_score = None
    thread.title = "Org-Wide Thread"
    thread.organization = mock_organization
    thread.space = None
    thread.creator = mock_user

    # Add mock messages for multi-turn conversation support
    user_msg = MagicMock(spec=Message)
    user_msg.id = uuid4()
    user_msg.thread_id = thread.id
    user_msg.message_role = MessageRole.USER
    user_msg.content = "Org-wide query across all spaces"
    user_msg.message_metadata = {}

    assistant_msg = MagicMock(spec=Message)
    assistant_msg.id = uuid4()
    assistant_msg.thread_id = thread.id
    assistant_msg.message_role = MessageRole.ASSISTANT
    assistant_msg.content = "Here's the org-wide analysis..."
    assistant_msg.message_metadata = {}

    thread.messages = [user_msg, assistant_msg]

    return thread


@pytest.fixture
def mock_db_session() -> AsyncMock:
    """Create a mock database session for testing."""
    session = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.refresh = AsyncMock()
    session.delete = AsyncMock()
    session.flush = AsyncMock()
    session.execute = AsyncMock()
    return session


@pytest.fixture
def mock_info(mock_user: MagicMock) -> MagicMock:
    """Create a mock GraphQL info context with authenticated user."""
    mock_request = MagicMock()
    mock_request.state.user = mock_user
    mock_info = MagicMock()
    mock_info.context = {"request": mock_request}
    return mock_info


@pytest.fixture
def mock_info_no_auth() -> MagicMock:
    """Create a mock GraphQL info context without authenticated user."""
    mock_request = MagicMock()
    mock_request.state.user = None
    mock_info = MagicMock()
    mock_info.context = {"request": mock_request}
    return mock_info


@pytest.fixture
def mock_get_session(mock_db_session: AsyncMock) -> Callable[[], AsyncGenerator[AsyncMock, None]]:
    """Create a mock get_session generator for patching."""

    async def _mock_get_session() -> AsyncGenerator[AsyncMock, None]:
        yield mock_db_session

    return _mock_get_session


@pytest.fixture
async def async_client(
    postgres_engine: AsyncEngine,  # noqa: F811
    postgres_integration_session: AsyncSession,  # noqa: F811
) -> AsyncGenerator[AsyncClient, None]:
    """Provide an async HTTP client for testing endpoints.

    CRITICAL: Overrides app's database engine AND session to use test database.
    Without this override, the app's database engine connects to olympus_dev database
    (which has no schema) because it's created when conftest.py imports the app at
    module level, BEFORE postgres_engine fixture creates the test database schema.

    This ensures all HTTP requests via async_client use the same database connection
    as the test fixtures, allowing tests to set up data that the app can see.

    Implementation:
    1. Clears app's cached engine (from app.db.session module)
    2. Overrides get_engine() to return test postgres_engine
    3. Overrides get_session() to use postgres_integration_session
    """
    # Save original engine and factory for cleanup
    original_engine = db_session_module._engine
    original_factory = db_session_module._async_session_factory

    # Clear cached engine and factory so they'll be recreated with test database
    db_session_module._engine = None
    db_session_module._async_session_factory = None

    # Override engine getter to return test engine
    def override_get_engine() -> AsyncEngine:
        return postgres_engine

    # Override session getter to use test session
    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        yield postgres_integration_session

    # Patch the module-level functions
    original_get_engine = db_session_module.get_engine
    db_session_module.get_engine = override_get_engine
    app.dependency_overrides[get_session] = override_get_session

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            yield client
    finally:
        # Restore original engine and factory
        db_session_module._engine = original_engine
        db_session_module._async_session_factory = original_factory
        db_session_module.get_engine = original_get_engine
        app.dependency_overrides.clear()


# --------------------------------------------------------------------------- #
# API Client Fixtures (GraphQL, REST, SSE)
# --------------------------------------------------------------------------- #


@pytest.fixture
def graphql_client(async_client: AsyncClient) -> GraphQLClient:
    """Provide GraphQL client with typed responses and error handling.

    Usage:
        async def test_query(graphql_client):
            data = await graphql_client.execute_expecting_data(
                query='{ me { id email } }',
            )
            assert data["me"]["email"] == "test@example.com"
    """
    return GraphQLClient(async_client)


@pytest.fixture
def rest_client(async_client: AsyncClient) -> RESTClient:
    """Provide REST API client with authentication support.

    Usage:
        async def test_endpoint(rest_client):
            response = await rest_client.get("/api/users/me")
            assert response.status_code == 200
    """
    return RESTClient(async_client)


@pytest.fixture
def sse_client(async_client: AsyncClient) -> SSEClient:
    """Provide SSE client for testing streaming endpoints.

    Usage:
        async def test_streaming(sse_client):
            events = await sse_client.stream_events(
                "/api/threads/123/stream",
                max_events=5,
            )
            assert len(events) == 5
    """
    return SSEClient(async_client)


@pytest.fixture
async def authenticated_graphql_client(
    async_client: AsyncClient,
    postgres_integration_session: AsyncSession,  # noqa: F811
    unique_test_id: str,  # noqa: F811
) -> GraphQLClient:
    """Provide GraphQL client with authenticated test user.

    Creates a test user in PostgreSQL, generates a JWT token, and injects
    it via cookie. Use this for integration tests requiring authentication.

    Uses postgres_integration_session fixture (commits data to database).
    Uses unique_test_id to prevent data pollution between tests.

    Usage:
        async def test_authenticated_query(authenticated_graphql_client):
            data = await authenticated_graphql_client.execute_expecting_data(
                query='{ me { id email } }',
            )
            # Email will be f"test-{unique_test_id}@example.com"
    """
    # Create test user in database with unique email
    user = await create_user(
        postgres_integration_session, email=f"test-{unique_test_id}@example.com"
    )
    await postgres_integration_session.commit()

    # Create JWT token
    test_user = TestUser(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name or "Test User",
    )
    token = create_test_token(test_user)

    # Inject token via Authorization header (matches integration test pattern)
    async_client.headers["Authorization"] = f"Bearer {token}"

    return GraphQLClient(async_client)


# --------------------------------------------------------------------------- #
# In-Memory Database Fixtures for Real Unit/Integration Tests
# --------------------------------------------------------------------------- #


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Provide an in-memory SQLite database session for testing.

    This fixture creates a fresh database for each test, ensuring complete isolation.
    Uses StaticPool to maintain the :memory: database connection throughout the test.

    Benefits over mocking:
    - Tests actual SQLAlchemy queries
    - Catches real SQL bugs (joins, filters, ordering)
    - Fast (~0.1s per test)
    - CI-perfect (no Docker, no flakes)
    - Works with pytest-xdist parallel testing
    - Reusable across all API tests

    Note: Automatically converts PostgreSQL JSONB to SQLite JSON for compatibility.
    All tables are created for maximum reusability across test suites.
    """
    # Create in-memory SQLite engine
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # Critical for :memory: + concurrency
        echo=False,  # Set to True for SQL debugging
    )

    # Convert JSONB columns to JSON for SQLite compatibility
    # This event listener replaces PostgreSQL JSONB with SQLite JSON during table creation
    @event.listens_for(Base.metadata, "before_create")
    def receive_before_create(target: Table, connection: Connection, **kw: Any) -> None:
        """Replace JSONB columns with JSON for SQLite."""
        if connection.dialect.name == "sqlite":
            for table in Base.metadata.sorted_tables:
                for column in table.columns:
                    if isinstance(column.type, JSONB):
                        column.type = JSON()

    # Create ALL tables for reusability across test suites
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session factory
    async_session_local = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Provide session
    async with async_session_local() as session:
        yield session
        await session.rollback()  # Rollback any uncommitted changes

    # Cleanup
    await engine.dispose()


# --------------------------------------------------------------------------- #
# SpiceDB Fixtures for Authorization Testing
# --------------------------------------------------------------------------- #


@pytest.fixture
def test_resource_ids(request: pytest.FixtureRequest) -> Callable[[str], str]:
    """Generate unique resource IDs scoped to this test (parallel-safe).

    This fixture creates test-scoped resource IDs that prevent conflicts when
    running tests in parallel with pytest-xdist. Each test gets unique IDs based
    on the test name and a random suffix.

    Usage:
        def test_something(test_resource_ids):
            org_id = test_resource_ids("org")  # "org-test_something-abc123"
            user_id = test_resource_ids("user")  # "user-test_something-abc123"

    The fixture automatically tracks created IDs for cleanup in the spicedb_service fixture.

    Returns:
        Callable that generates unique IDs with format: "{prefix}-{test_name}-{random}"
    """
    # Create unique test ID from test name and random suffix
    test_id = f"{request.node.name}-{uuid4().hex[:8]}"

    # Track created IDs for cleanup
    created_ids: list[str] = []

    def make_id(prefix: str = "test") -> str:
        """Generate a test-scoped resource ID and track it for cleanup.

        Args:
            prefix: Prefix for the ID (e.g., "org", "user", "space")

        Returns:
            Unique ID in format: "{prefix}-{test_name}-{random}"
        """
        resource_id = f"{prefix}-{test_id}"
        created_ids.append(resource_id)
        return resource_id

    # Attach created_ids list to the function for access in cleanup
    make_id.created_ids = created_ids  # type: ignore[attr-defined]

    return make_id


@pytest.fixture
async def spicedb_service(
    test_resource_ids: Callable[[str], str],
) -> AsyncGenerator[SpiceDBService, None]:
    """
    Provide SpiceDBService configured for testing with parallel-safe cleanup.

    Works in both local development and CI environments:
    - **Local**: Uses Docker Compose SpiceDB (spicedb:50051 from .env)
    - **CI**: Uses authzed/action-spicedb (localhost:50051 from GitHub Actions env)

    Pydantic settings automatically reads SPICEDB_ENDPOINT and SPICEDB_TOKEN
    from environment variables, so no manual override needed.

    Uses real SpiceDB in-memory instance following TESTING.md principles:
    - Tests actual permission resolution logic
    - No mocking of authorization checks
    - Fast in-memory datastore

    **Parallel Test Execution:**
    This fixture now supports parallel test execution (pytest-xdist) through the
    test_resource_ids fixture. Tests should use test_resource_ids() to generate
    unique IDs, and cleanup will only delete relationships for that test's IDs.

    Usage:
        async def test_permission(spicedb_service, test_resource_ids):
            org_id = test_resource_ids("org")  # Unique ID for this test
            await spicedb_service.write_relationship(...)
            # Cleanup happens automatically for this test's IDs only
    """
    if not settings.spicedb_token or not settings.spicedb_endpoint:
        pytest.skip(
            "SpiceDB not configured. Set SPICEDB_TOKEN and SPICEDB_ENDPOINT environment variables."
        )

    # Use the global singleton instance (thread-safe within single process)
    service = get_spicedb_service()
    yield service

    # Parallel-safe cleanup: Only delete relationships for this test's resource IDs
    if hasattr(test_resource_ids, "created_ids") and test_resource_ids.created_ids:
        try:
            result = await delete_relationships_by_ids(
                service,
                test_resource_ids.created_ids,
            )
            if result["failed_ids"]:
                pytest.fail(f"Cleanup failed for IDs: {result['failed_ids']}")
        except Exception as e:
            pytest.fail(f"Cleanup error: {e}")


# --------------------------------------------------------------------------- #
# LangChain Mock Fixtures (OpenAI LLM and Embeddings)
# --------------------------------------------------------------------------- #


@pytest.fixture
def mock_chat_openai() -> MockChatOpenAI:
    """Provide mock ChatOpenAI for deterministic testing without API calls.

    Usage:
        def test_llm(mock_chat_openai):
            mock_chat_openai.responses = ["Hello!", "How can I help?"]
            response = mock_chat_openai.invoke("What's up?")
            assert response.content == "Hello!"
    """
    return MockChatOpenAI()


@pytest.fixture
def mock_embeddings() -> MockOpenAIEmbeddings:
    """Provide mock OpenAI embeddings with deterministic hash-based vectors.

    Usage:
        def test_embeddings(mock_embeddings):
            vector1 = mock_embeddings.embed_query("Hello")
            vector2 = mock_embeddings.embed_query("Hello")
            assert vector1 == vector2  # Deterministic
            assert len(vector1) == 1536  # Correct dimensions
    """
    return MockOpenAIEmbeddings()


@pytest.fixture
def mock_embedding_service() -> MockEmbeddingService:
    """Provide mock EmbeddingService for vector search tests.

    Returns MockEmbeddingService that uses deterministic hash-based embeddings
    instead of calling OpenAI API.

    Usage:
        async def test_vector_search(mock_embedding_service):
            vector = await mock_embedding_service.generate_embedding("Hello")
            assert len(vector) == 1536  # Deterministic
    """
    return MockEmbeddingService()


@pytest.fixture
def patch_openai(
    monkeypatch: pytest.MonkeyPatch,
    mock_chat_openai: MockChatOpenAI,
    mock_embeddings: MockOpenAIEmbeddings,
) -> tuple[MockChatOpenAI, MockOpenAIEmbeddings]:
    """Patch LangChain factory functions to return mocks (no API calls).

    Monkeypatches:
        - app.services.langchain_config.get_llm → returns mock_chat_openai
        - app.services.langchain_config.get_embeddings → returns mock_embeddings

    Usage:
        def test_query_agent(patch_openai):
            llm, embeddings = patch_openai
            llm.responses = ["Specific test response"]
            # Now any code calling get_llm() or get_embeddings() uses mocks
            result = query_agent.run("What is AI?")
            assert "Specific test response" in result
    """
    # Patch get_llm to return mock ChatOpenAI
    monkeypatch.setattr(
        "app.services.langchain_config.get_llm",
        lambda **_kwargs: mock_chat_openai,
    )

    # Patch get_embeddings to return mock OpenAI embeddings
    monkeypatch.setattr(
        "app.services.langchain_config.get_embeddings",
        lambda **_kwargs: mock_embeddings,
    )

    return mock_chat_openai, mock_embeddings


# --------------------------------------------------------------------------- #
# Storage Mock Fixtures
# --------------------------------------------------------------------------- #


@pytest.fixture
def mock_storage_service(monkeypatch: pytest.MonkeyPatch) -> MockStorageService:
    """Provide mock storage service that patches get_storage_service().

    Uses local filesystem instead of Supabase Storage for deterministic testing.
    Automatically cleans up temporary files after test.

    Usage:
        async def test_upload(mock_storage_service):
            file_path = await mock_storage_service.upload_file(file, space_id, doc_id)
            assert file_path is not None
            # Cleanup happens automatically
    """
    # Create mock storage service with temporary directory
    mock_storage = MockStorageService()

    # Patch get_storage_service() to return mock
    monkeypatch.setattr(
        "app.services.storage_service.get_storage_service",
        lambda: mock_storage,
    )

    # Also patch the module-level variable for consistency
    original_service = getattr(storage_module, "_storage_service", None)
    storage_module._storage_service = mock_storage

    yield mock_storage

    # Cleanup: Remove temporary files
    mock_storage.cleanup()

    # Restore original service
    storage_module._storage_service = original_service


# --------------------------------------------------------------------------- #
# Supabase Client Fixture
# --------------------------------------------------------------------------- #


@pytest.fixture
def supabase_client():
    """Provide Supabase client for auth integration tests.

    Uses cloud Supabase test instance configured in .env.test.
    Allows tests to interact with real Supabase Auth for login/signup/etc.

    Usage:
        async def test_auth(supabase_client):
            result = supabase_client.auth.sign_up({"email": "test@example.com", "password": "pass123"})
            assert result.user is not None
    """
    return create_client(settings.supabase_url, settings.supabase_anon_key)
