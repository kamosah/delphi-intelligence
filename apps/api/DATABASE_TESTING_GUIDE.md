# Database Model Testing Strategy

This document outlines different approaches to testing your SQLAlchemy models, from in-memory SQLite tests to full PostgreSQL integration tests.

**Note**: This guide is **deprecated**. See [TESTING.md](./TESTING.md) for the current testing philosophy.

## 🏁 Quick Start - Recommended Approach

**Use in-memory SQLite with the `db_session` fixture** (see [TESTING.md](./TESTING.md))

- ✅ **Fast**: Real database operations in ~0.1s per test
- ✅ **No mocking**: Tests actual SQLAlchemy queries
- ✅ **Catches real bugs**: JOIN, filter, ordering issues
- ✅ **CI-perfect**: No Docker dependencies

```bash
# Use the db_session fixture from conftest.py
docker compose exec api poetry run pytest tests/ -v
```

## Testing Philosophy (per TESTING.md)

**Core Principle**: Test real database operations, not mocks.

### Why In-Memory SQLite?

- ✅ **Tests actual database operations** - Verifies real SQLAlchemy queries
- ✅ **Catches real SQL bugs** - Joins, filters, ordering, constraints
- ✅ **Fast execution** - ~0.1s per test
- ✅ **Complete isolation** - Fresh database per test

### The "Testing the Mock" Anti-Pattern

❌ **Avoid**: Mocking database queries

```python
# This tests the mock, not the code!
mock_execute.side_effect = [MagicMock(scalar_one_or_none=lambda: mock_org)]
result = await OrganizationService.get_current(user.id, mock_session)
```

✅ **Prefer**: Using real in-memory database

```python
# This tests actual code with real database!
user = await create_user(db_session)
org = await create_organization(db_session, "Test Org")
await db_session.commit()

result = await OrganizationService.get_current(user.id, db_session)
assert result == org.id
```

**See [TESTING.md](./TESTING.md) for complete guidance.**

## Testing Approaches Overview

### 1. In-Memory SQLite Testing (Recommended)

**Best for**: Daily development, unit tests, service tests

- **Speed**: ⚡ Super fast (~0.1s per test)
- **Setup**: Automatic via `db_session` fixture
- **Coverage**: Real database operations, model validation, business logic
- **Pros**: Tests real code, fast feedback, no external dependencies
- **Cons**: Some PostgreSQL-specific features not available

**Example Test:**

```python
@pytest.mark.asyncio()
async def test_organization_service(db_session: AsyncSession):
    """Test with real in-memory database."""
    # Arrange: Create test data
    user = await create_user(db_session)
    org = await create_organization(db_session, "Test Org")
    await create_membership(db_session, user, org, is_default=True)
    await db_session.commit()

    # Act: Call service method
    result = await OrganizationService.get_current(user.id, db_session)

    # Assert: Verify result
    assert result == org.id
```

### 2. Docker PostgreSQL Testing (`tests/test_models_postgres.py`)

**Best for**: Integration testing, CI environments, PostgreSQL-specific features

- **Speed**: 🐌 Slower (7+ seconds with container startup)
- **Setup**: Requires Docker
- **Coverage**: Full PostgreSQL features (JSONB, UUIDs, constraints, indexes)
- **Pros**: Real database environment, tests actual SQL generation
- **Cons**: Slower, requires Docker, more complex setup

**Setup and Run:**

```bash
# Make sure Docker is running
docker --version

# Run PostgreSQL integration tests
poetry run pytest tests/test_models_postgres.py -v
```

**Example Test:**

```python
@pytest.mark.asyncio
async def test_uuid_support(test_session):
    """Test PostgreSQL UUID support."""
    user = User(email="uuid@example.com")
    test_session.add(user)
    await test_session.flush()

    assert isinstance(user.id, uuid.UUID)
```

### 3. Local PostgreSQL Testing (`test_models_local_postgres.py`)

**Best for**: Teams with existing PostgreSQL instances

- **Speed**: 🚀 Fast (if database is local)
- **Setup**: Requires PostgreSQL connection
- **Coverage**: Real PostgreSQL without Docker overhead
- **Pros**: Real database, faster than Docker
- **Cons**: Requires database setup, configuration

**Usage:**

```bash
# Set your database URL
export TEST_DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/test_db"

# Run tests
poetry run pytest test_models_local_postgres.py -v
```

## When to Use Each Approach

### During Development (Daily)

```bash
# Quick model validation
poetry run pytest test_models_simple.py
```

### Before Committing Code

```bash
# Full validation including PostgreSQL features
poetry run pytest test_models_simple.py tests/test_models_postgres.py
```

### In CI/CD Pipeline

```bash
# Fast tests first
poetry run pytest test_models_simple.py

# Integration tests (if Docker available)
poetry run pytest tests/test_models_postgres.py
```

## Test Runner Script

Use the provided test runner for interactive testing:

```bash
python run_tests.py
```

This script will:

1. Check for Docker availability
2. Let you choose test types
3. Run appropriate test suites
4. Provide clear feedback

## Model Testing Best Practices

### 1. Test Model Instantiation

```python
def test_user_creation(self):
    user = User(email="test@example.com", full_name="John Doe")
    assert user.email == "test@example.com"
    assert user.full_name == "John Doe"
```

### 2. Test Field Validation

```python
def test_user_minimal_fields(self):
    user = User(email="minimal@example.com")
    assert user.email == "minimal@example.com"
    assert user.full_name is None
```

### 3. Test Enum Values

```python
def test_member_roles(self):
    assert MemberRole.OWNER.value == "owner"
    assert MemberRole.EDITOR.value == "editor"
    assert MemberRole.VIEWER.value == "viewer"
```

### 4. Test JSONB Data Structures

```python
def test_complex_agent_steps(self):
    complex_steps = [
        {
            "step_id": 1,
            "action": "web_search",
            "params": {"query": "ML algorithms", "max_results": 10},
            "results": {"count": 8, "execution_time_ms": 245}
        }
    ]

    query = Query(query_text="Explain ML", agent_steps=complex_steps, ...)
    assert query.agent_steps[0]["params"]["max_results"] == 10
```

### 5. Test Relationships (Real Database)

```python
@pytest.mark.asyncio()
async def test_user_relationships(db_session: AsyncSession):
    """Test relationships with real database."""
    user = await create_user(db_session)
    space = await create_space(db_session, "My Space", organization=org, owner=user)
    await db_session.commit()

    # Refresh to load relationships
    await db_session.refresh(user)

    # Verify relationships work
    assert len(user.owned_spaces) > 0
    assert user.owned_spaces[0].id == space.id
```

### 6. Test Database Operations (Real Database, Not Mocks)

**❌ Avoid**: Mocking database operations

```python
# This tests the mock, not the code!
@pytest.mark.asyncio
async def test_successful_user_creation(self):
    mock_session = AsyncMock()
    user = User(email="new@example.com")

    mock_session.add(user)
    await mock_session.flush()

    # Only verifies mock was called, doesn't test actual behavior
    mock_session.add.assert_called_once()
```

**✅ Prefer**: Real in-memory database

```python
@pytest.mark.asyncio()
async def test_successful_user_creation(db_session: AsyncSession):
    """Test with real in-memory SQLite database."""
    # Arrange
    user = await create_user(db_session, email="new@example.com")

    # Act
    await db_session.commit()

    # Assert - verify user was actually persisted
    assert user.id is not None
    assert user.email == "new@example.com"
```

## Utility Functions

The test files include utility functions for creating test data:

```python
# Create test objects with sensible defaults
user = create_test_user("test@example.com")
space = create_test_space(owner_id=user.id)
query = create_test_query(space_id=space.id, created_by=user.id)
```

## Performance Comparison

| Test Type              | Speed      | Setup Required | Database Features | Use Case            |
| ---------------------- | ---------- | -------------- | ----------------- | ------------------- |
| In-Memory SQLite       | ~0.1s      | None           | Most SQL features | Daily development   |
| Docker PostgreSQL      | 7+ seconds | Docker         | Full PostgreSQL   | Integration testing |
| Local PostgreSQL       | 1-2s       | PostgreSQL     | Full PostgreSQL   | Team development    |

## Recommendations (Per TESTING.md)

1. **Use in-memory SQLite for unit tests** - Tests real database operations without mocking
2. **Use Docker PostgreSQL for integration tests** - Verifies PostgreSQL-specific features
3. **Prefer `db_session` fixture over mocks** - Tests actual SQLAlchemy queries
4. **Follow AAA pattern** - Arrange → Act → Assert
5. **Use factory functions** from `tests/utils.py` for creating test data
6. **See [TESTING.md](./TESTING.md)** for complete best practices

**⚠️ Deprecated Approach**: This guide previously recommended mocking database operations. The current philosophy (per TESTING.md) is to use real in-memory SQLite databases instead of mocks.

## File Organization

```
apps/api/
├── test_models_simple.py          # ⭐ Primary development tests
├── run_tests.py                   # Interactive test runner
└── tests/
    ├── conftest.py                # Docker PostgreSQL fixtures
    ├── test_main.py               # FastAPI application tests
    └── test_models_postgres.py    # Full integration tests
```

This clean, focused approach gives you the flexibility to choose the right testing strategy for each situation while maintaining fast feedback loops during development.
