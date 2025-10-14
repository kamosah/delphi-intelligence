# Supabase Testing Strategy

## Overview

This document outlines our testing approach for the Supabase client, distinguishing between what should be mocked (unit tests) and what should be tested against real services (integration tests).

## Testing Philosophy

1. **Unit Tests (with mocking)**: Test our code's logic and behavior without external dependencies
2. **Integration Tests**: Test actual interaction with Supabase services
3. **E2E Tests**: Test complete user flows (handled separately)

## Unit Tests (Mock Everything External)

### What to Mock

- `supabase.create_client()` - Returns a mock client
- `os.getenv()` - Controls environment variables in tests
- `dotenv.load_dotenv()` - Avoids file system dependency
- `client.auth.set_session()` - Mock authentication operations
- Database operations (`.table().select()`, etc.) - Not testing Supabase, testing our code

### What to Test

- ✅ Configuration loading and validation
- ✅ Environment variable handling (missing vars raise errors)
- ✅ Client creation logic (correct keys used)
- ✅ Authentication token handling
- ✅ Error handling for invalid configurations
- ✅ Convenience function delegation

### Unit Test File: `test_supabase_client_unit.py`

```python
# Example unit test structure
@patch('supabase_client.create_client')
def test_get_admin_client_uses_service_role(mock_create_client):
    mock_client = Mock()
    mock_create_client.return_value = mock_client

    config = SupabaseConfig()
    admin_client = config.get_admin_client()

    # Verify correct key was used
    mock_create_client.assert_called_once_with(
        'https://test.supabase.co',
        'test_service_role_key'
    )
```

## Integration Tests (Real Database)

### What NOT to Mock

- Supabase client creation
- Database connections
- Actual database operations
- RLS policy enforcement
- Authentication flows

### What to Test

- ✅ Database connectivity
- ✅ Schema exists (tables are accessible)
- ✅ RLS policies work correctly
- ✅ Admin vs. user client permissions
- ✅ Basic CRUD operations
- ✅ Error handling for real database errors

### Integration Test File: `test_supabase_integration.py`

```python
# Example integration test structure
def test_admin_client_bypasses_rls():
    admin_client = get_admin_client()

    # Should succeed even with RLS policies
    response = admin_client.table('users').select('*').execute()
    assert hasattr(response, 'data')
```

## Test Environment Setup

### Local Development

```bash
# Run unit tests (fast, no external dependencies)
poetry run pytest test_supabase_client_unit.py -v

# Run integration tests (requires Supabase connection)
poetry run pytest test_supabase_integration.py -v

# Run all tests
poetry run pytest -v
```

### Environment Variables for Integration Tests

```bash
# Required for integration tests
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Test Data Strategy

### For Unit Tests

- Use completely fake data
- Mock all external responses
- Focus on edge cases and error conditions

### For Integration Tests

- Use a test Supabase project (not production)
- Create and cleanup test data within tests
- Test against real schema and RLS policies
- Use transactions when possible for cleanup

## CI/CD Considerations

### Unit Tests

- Run on every commit
- Fast execution (no external deps)
- Should never fail due to external services
- Part of pre-commit hooks

### Integration Tests

- Run on pull requests
- Require test environment setup
- May be flaky due to network/service issues
- Should have retry logic

## File Organization

```
apps/api/
├── supabase_client.py              # Main client code
├── test_supabase_client_unit.py    # Unit tests (mocked)
├── test_supabase_integration.py    # Integration tests (real DB)
├── conftest.py                     # Shared test configuration
└── tests/
    ├── fixtures/                   # Test data fixtures
    └── helpers/                    # Test utility functions
```

## What We're NOT Testing

### In Unit Tests

- ❌ Actual Supabase client library behavior
- ❌ Network connectivity
- ❌ Database operations
- ❌ RLS policy logic (that's Supabase's responsibility)

### In Integration Tests

- ❌ Supabase client library internals
- ❌ Supabase server implementation
- ❌ Network infrastructure
- ❌ Complex business logic (save for E2E tests)

## Example Test Scenarios

### Unit Test Examples

```python
def test_missing_env_vars_raises_error():
    # Mock missing environment variables
    # Verify ValueError is raised

def test_get_user_client_sets_auth_token():
    # Mock client creation
    # Verify set_session called with correct token

def test_convenience_functions_delegate():
    # Mock config instance
    # Verify functions call correct config methods
```

### Integration Test Examples

```python
def test_admin_can_create_user():
    # Create user with admin client
    # Verify user exists in database
    # Cleanup test data

def test_user_client_respects_rls():
    # Try to access data with user client
    # Verify RLS blocks unauthorized access

def test_database_schema_valid():
    # Verify all expected tables exist
    # Verify basic schema structure
```

## Benefits of This Approach

1. **Fast Feedback**: Unit tests run quickly and catch logic errors
2. **Reliable**: Unit tests don't depend on external services
3. **Comprehensive**: Integration tests verify real behavior
4. **Maintainable**: Clear separation of concerns
5. **Debuggable**: Easy to isolate issues between our code and external services

## Next Steps

1. Run the unit tests to verify our client logic
2. Run integration tests to verify database connectivity
3. Add more specific test cases based on actual usage patterns
4. Set up CI/CD to run appropriate tests at different stages
