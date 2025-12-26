# Supabase Testing Strategy

**Note**: This guide is **deprecated**. See [TESTING.md](./TESTING.md) for the current testing philosophy.

## Overview

This document outlines the original testing approach for the Supabase client. **The current testing philosophy (per TESTING.md) is to use real services instead of mocks.**

## Current Testing Philosophy (Per TESTING.md)

**Core Principle**: Test real database operations and services, not mocks.

### Recommended Approach

1. **Use in-memory SQLite** for unit tests (tests SQLAlchemy models and services)
2. **Use real Supabase** for integration tests (tests actual database operations)
3. **Avoid mocking** database operations - use real databases instead

See [TESTING.md](./TESTING.md) for complete guidance.

## Legacy Testing Approach (Deprecated)

The original approach distinguished between mocked unit tests and integration tests. **This approach is no longer recommended.**

### Why We Moved Away from Mocking

❌ **Problems with mocking**:
- Only verifies you correctly predicted implementation details
- Doesn't catch actual SQL bugs (joins, filters, ordering)
- Breaks when refactoring internal implementation
- Tests the mock, not the actual code behavior

✅ **Benefits of real databases**:
- Tests actual SQLAlchemy queries
- Catches real SQL bugs
- Fast execution with in-memory SQLite (~0.1s per test)
- Doesn't break during refactoring

### Old Unit Test Approach (Deprecated)

**⚠️ This approach is no longer recommended - see TESTING.md instead**

The old approach mocked Supabase client operations:

```python
# OLD APPROACH - NO LONGER RECOMMENDED
@patch('supabase_client.create_client')
def test_get_admin_client_uses_service_role(mock_create_client):
    mock_client = Mock()
    mock_create_client.return_value = mock_client

    # This only tests that we called the mock correctly
    # Doesn't verify actual behavior
```

**New Approach** (per TESTING.md):

```python
# NEW APPROACH - Use real in-memory database
@pytest.mark.asyncio()
async def test_organization_service(db_session: AsyncSession):
    """Test with real in-memory SQLite database."""
    # Create test data with real database
    user = await create_user(db_session)
    org = await create_organization(db_session, "Test Org")
    await db_session.commit()

    # Test actual service logic
    result = await OrganizationService.get_current(user.id, db_session)

    # Verify real behavior
    assert result == org.id
```

## Integration Tests (Recommended Current Approach)

### What to Test with Real Services

- ✅ Database connectivity and operations
- ✅ Schema validation (tables exist and are accessible)
- ✅ RLS policies work correctly
- ✅ Service-level permissions
- ✅ Complete CRUD workflows
- ✅ Error handling for real database errors

### Integration Test Approach (Per TESTING.md)

**For SQLAlchemy services**: Use in-memory SQLite via `db_session` fixture

```python
@pytest.mark.asyncio()
async def test_service_with_real_database(db_session: AsyncSession):
    """Test service logic with real in-memory database."""
    # Arrange: Create test data
    user = await create_user(db_session)
    org = await create_organization(db_session, "Test Org")
    await db_session.commit()

    # Act: Test service method
    result = await OrganizationService.get_current(user.id, db_session)

    # Assert: Verify behavior
    assert result == org.id
```

**For Supabase-specific features**: Use real Supabase test project

```python
def test_supabase_rls_policies():
    """Test RLS policies with real Supabase instance."""
    # Use real Supabase client (test project)
    admin_client = get_admin_client()

    # Test actual RLS behavior
    response = admin_client.table('users').select('*').execute()
    assert response.data is not None
```

## Test Environment Setup

### Local Development (Current Approach)

```bash
# Run unit tests with in-memory SQLite (fast, recommended)
docker compose exec api poetry run pytest tests/ -v

# Run specific test file
docker compose exec api poetry run pytest tests/test_organization_service.py -v

# Run with coverage
docker compose exec api poetry run pytest --cov=app tests/
```

### Environment Variables

Per [TESTING.md](./TESTING.md), use the `db_session` fixture which automatically creates an in-memory SQLite database for each test. No special environment variables needed for unit tests.

For integration tests with real Supabase:

```bash
# Optional: Only for Supabase integration tests
SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_ANON_KEY=your-test-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key
```

## Test Data Strategy (Per TESTING.md)

### For Unit Tests (In-Memory SQLite)

- ✅ Use factory functions from `tests/utils.py`
- ✅ Create real test data with `create_user()`, `create_organization()`, etc.
- ✅ Fresh database per test (automatic via fixture)
- ✅ AAA pattern: Arrange → Act → Assert

### For Integration Tests (Real Supabase)

- ✅ Use a test Supabase project (not production)
- ✅ Create and cleanup test data within tests
- ✅ Test against real schema and RLS policies
- ✅ Use transactions when possible for cleanup

## CI/CD Considerations (Updated)

### Unit Tests (In-Memory SQLite)

- ✅ Run on every commit
- ✅ Fast execution (~0.1s per test)
- ✅ No external dependencies (no Docker, no database)
- ✅ Should never fail due to external services
- ✅ Part of pre-commit hooks

### Integration Tests (Real Supabase/PostgreSQL)

- ✅ Run on pull requests
- ✅ Require test environment setup
- ✅ May be flaky due to network/service issues
- ✅ Use Docker PostgreSQL for PostgreSQL-specific features

## File Organization (Current Approach)

```
apps/api/
├── app/
│   ├── models/                     # SQLAlchemy models
│   ├── services/                   # Business logic services
│   └── ...
└── tests/
    ├── conftest.py                 # db_session fixture, shared config
    ├── utils.py                    # Factory functions (create_user, etc.)
    ├── test_organization_service.py # Service tests (in-memory SQLite)
    ├── test_space_service.py       # Service tests (in-memory SQLite)
    └── test_models_postgres.py    # PostgreSQL integration tests (optional)
```

## What We're Testing (Per TESTING.md)

### In Unit Tests (In-Memory SQLite)

- ✅ Service business logic
- ✅ SQLAlchemy query correctness
- ✅ Model validation and relationships
- ✅ Error handling
- ✅ Edge cases and fallback logic

### In Integration Tests (Real Database)

- ✅ PostgreSQL-specific features (JSONB operators, arrays, etc.)
- ✅ Database constraints and indexes
- ✅ Full-stack workflows
- ✅ RLS policy enforcement (Supabase)
- ✅ Multi-service interactions

## Example Test Scenarios (Updated)

### Unit Test Examples (In-Memory SQLite)

```python
@pytest.mark.asyncio()
async def test_get_current_organization(db_session: AsyncSession):
    """Test organization selection logic."""
    # Arrange: Create test data with real database
    user = await create_user(db_session)
    org = await create_organization(db_session, "Test Org")
    await create_membership(db_session, user, org, is_default=True)
    await db_session.commit()

    # Act: Test service method
    result = await OrganizationService.get_current(user.id, db_session)

    # Assert: Verify result
    assert result == org.id


@pytest.mark.asyncio()
async def test_handles_missing_user(db_session: AsyncSession):
    """Test error handling with real database."""
    fake_user_id = uuid4()

    # Should raise ValueError for non-existent user
    with pytest.raises(ValueError, match="not a member"):
        await OrganizationService.get_current(fake_user_id, db_session)
```

### Integration Test Examples (Real PostgreSQL)

```python
@pytest.mark.integration()
async def test_pgvector_similarity_search(postgres_session: AsyncSession):
    """Test vector search with real PostgreSQL + pgvector."""
    # Create document with embeddings
    doc = await create_document(postgres_session)
    await postgres_session.commit()

    # Test similarity search with actual pgvector
    results = await VectorSearchService.search(
        query_embedding=[0.1] * 1536,
        session=postgres_session
    )

    assert len(results) > 0
```

## Benefits of Current Approach (Per TESTING.md)

1. **Tests Real Code**: Verifies actual SQLAlchemy queries, not mocks
2. **Fast Feedback**: ~0.1s per test with in-memory SQLite
3. **Catches Real Bugs**: JOIN errors, filter bugs, ordering issues
4. **Reliable**: No external dependencies for unit tests
5. **Maintainable**: Doesn't break during refactoring
6. **CI-Friendly**: No Docker required for unit tests

## Migration from Old Approach

**If you have old mocked tests**, migrate them to use `db_session` fixture:

```python
# OLD (mocked - no longer recommended)
@patch('app.db.session.get_db')
async def test_with_mock(mock_db):
    mock_result = MagicMock()
    mock_db.return_value.execute.return_value = mock_result
    # ...

# NEW (real in-memory database - recommended)
@pytest.mark.asyncio()
async def test_with_real_db(db_session: AsyncSession):
    user = await create_user(db_session)
    await db_session.commit()
    result = await MyService.method(user.id, db_session)
    assert result is not None
```

See [TESTING.md](./TESTING.md) for complete migration guide and best practices.
