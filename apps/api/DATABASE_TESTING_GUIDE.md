# Database Model Testing Strategy

This document outlines different approaches to testing your SQLAlchemy models, from simple unit tests to full PostgreSQL integration tests.

## 🏁 Quick Start - Recommended Approach

**Use `test_models_simple.py` for day-to-day development**

- ✅ **Fast**: 18 tests in 0.24 seconds
- ✅ **No dependencies**: No Docker or database required
- ✅ **Comprehensive**: Tests model logic, validation, and business rules
- ✅ **Reliable**: No network dependencies or external services

```bash
poetry run pytest test_models_simple.py -v
```

## Testing Approaches Overview

### 1. Simple Mock Testing (`test_models_simple.py`)

**Best for**: Daily development, CI/CD, model validation

- **Speed**: ⚡ Super fast (0.24s for 18 tests)
- **Setup**: None required
- **Coverage**: Model instantiation, field validation, JSONB structures, business logic
- **Pros**: Fast feedback loop, reliable, no external dependencies
- **Cons**: Doesn't test actual database interactions

**Example Test:**

```python
def test_query_with_jsonb_data(self):
    """Test Query model with agent steps and sources."""
    agent_steps = [
        {"step": 1, "action": "search", "query": "capital France"},
        {"step": 2, "action": "analyze", "confidence": 0.95}
    ]

    query = Query(
        query_text="What is the capital of France?",
        agent_steps=agent_steps,
        space_id=uuid.uuid4(),
        created_by=uuid.uuid4()
    )

    assert query.agent_steps[0]["action"] == "search"
    assert query.agent_steps[1]["confidence"] == 0.95
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

### 5. Test Relationships (Mock)

```python
def test_model_relationships_structure(self):
    user = User(email="test@example.com")
    assert hasattr(user, 'owned_spaces')
    assert hasattr(user, 'created_documents')
```

### 6. Mock Database Operations

```python
@pytest.mark.asyncio
async def test_successful_user_creation(self):
    mock_session = AsyncMock()
    user = User(email="new@example.com")

    mock_session.add(user)
    await mock_session.flush()
    await mock_session.commit()

    mock_session.add.assert_called_once()
    mock_session.flush.assert_called_once()
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

| Test Type         | Speed      | Setup Required | Database Features | Use Case            |
| ----------------- | ---------- | -------------- | ----------------- | ------------------- |
| Simple Mock       | 0.24s      | None           | Simulated         | Daily development   |
| Docker PostgreSQL | 7+ seconds | Docker         | Full              | Integration testing |
| Local PostgreSQL  | 1-2s       | PostgreSQL     | Full              | Team development    |

## Recommendations

1. **Start with simple mock tests** for rapid development
2. **Use PostgreSQL tests** for verifying database-specific features
3. **Run both** before committing code
4. **Use the test runner script** for interactive testing
5. **Add new simple tests** for each new model feature
6. **Use integration tests** to verify complex queries and relationships

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
