# Testing and Linting Guide

**Last Updated**: October 14, 2025

This guide documents the proper way to run tests, linting, and formatting checks for the Olympus MVP API.

## Prerequisites

### Docker Environment (Recommended for Tests)

Tests should be run in the Docker container to ensure consistent environment and dependencies:

```bash
# Ensure dependencies are installed in the container
docker compose exec -T api sh -c "poetry install --no-root"
```

This installs all development dependencies including:

- `pytest` (7.4.4)
- `pytest-asyncio` (0.21.2)
- `ruff` (0.4.10)
- `mypy` (1.18.2)

## Running Tests

### Full Test Suite

```bash
# Run all tests with verbose output
docker compose exec -T api sh -c "poetry run pytest tests/ -v --tb=short"

# Run specific test file
docker compose exec -T api sh -c "poetry run pytest tests/test_auth_routes.py -v"

# Run specific test
docker compose exec -T api sh -c "poetry run pytest tests/test_auth_routes.py::TestAuthRoutes::test_login_success -v"
```

### Test Coverage

```bash
# Run tests with coverage report
docker compose exec -T api sh -c "poetry run pytest --cov=app tests/"

# Generate HTML coverage report
docker compose exec -T api sh -c "poetry run pytest --cov=app --cov-report=html tests/"
```

### Current Test Status (as of Oct 14, 2025)

**Total Tests**: 53

- **Passed**: 46
- **Failed**: 4 (pre-existing authentication middleware mocking issues)
- **Skipped**: 10 (Docker-only model tests)

**Known Issues**:

- `test_logout_success` - Authentication middleware bypassing issue
- `test_get_current_user_profile_success` - Same auth issue
- `test_get_current_user_profile_unauthorized` - Expected 401, got 403
- `test_resend_verification` - Auth issue (endpoint should not require auth)

These are pre-existing test failures not related to the document upload feature (LOG-130).

## Code Formatting and Linting

### Ruff Formatting

```bash
# Format all Python files in app/
docker compose exec -T api sh -c "poetry run ruff format app/"

# Check what would be formatted (dry run)
docker compose exec -T api sh -c "poetry run ruff format app/ --check"
```

### Ruff Linting

```bash
# Run linter and show all issues
docker compose exec -T api sh -c "poetry run ruff check app/"

# Run linter and auto-fix issues
docker compose exec -T api sh -c "poetry run ruff check app/ --fix"

# Show diff of what would be fixed
docker compose exec -T api sh -c "poetry run ruff check app/ --diff"
```

### Type Checking (MyPy)

```bash
# Run type checker on app/
docker compose exec -T api sh -c "poetry run mypy app/"

# Type check specific file
docker compose exec -T api sh -c "poetry run mypy app/routes/documents.py"
```

## Pre-Commit Workflow

Before committing changes, run this sequence:

```bash
# 1. Format code
docker compose exec -T api sh -c "poetry run ruff format app/"

# 2. Run linter with auto-fix
docker compose exec -T api sh -c "poetry run ruff check app/ --fix"

# 3. Run tests
docker compose exec -T api sh -c "poetry run pytest tests/ -v --tb=short"

# 4. (Optional) Type check
docker compose exec -T api sh -c "poetry run mypy app/"
```

## Common Issues and Solutions

### Issue 1: "Command not found: ruff"

**Problem**: Running `docker compose exec -T api poetry run ruff` gives "command not found"

**Cause**: Dependencies not installed in the Docker container's virtual environment

**Solution**:

```bash
docker compose exec -T api sh -c "poetry install --no-root"
```

### Issue 2: "No module named pytest"

**Problem**: Same as above - dependencies not in venv

**Solution**: Same as Issue 1

### Issue 3: Test failures in auth routes

**Problem**: Tests related to authentication middleware fail with 401/403 errors

**Cause**: Mocking `get_current_user` at route level doesn't bypass authentication middleware

**Status**: Known issue, not blocking (pre-existing failures)

**Solution** (TODO):

- Mock at middleware level: `app.middleware.auth.AuthenticationMiddleware`
- Or create test client with auth middleware disabled
- Or use proper JWT tokens in test requests

### Issue 4: Async mocking issues

**Problem**: `TypeError: object TokenResponse can't be used in 'await' expression`

**Cause**: Mocking async functions with regular `Mock()` instead of `AsyncMock()`

**Solution**:

```python
from unittest.mock import AsyncMock

# Wrong
mock_service.method.return_value = result

# Right
mock_service.method = AsyncMock(return_value=result)
```

**Fixed in**: commit fixing auth tests (Oct 14, 2025)

## Configuration Files

### pytest (`pyproject.toml`)

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = "-v --strict-markers --disable-warnings"
asyncio_mode = "auto"
markers = [
    "unit: Unit tests",
    "integration: Integration tests",
    "slow: Slow tests",
]
```

### Ruff (`pyproject.toml`)

```toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = [
    "E",      # pycodestyle errors
    "W",      # pycodestyle warnings
    "F",      # pyflakes
    "I",      # isort
    "N",      # pep8-naming
    "UP",     # pyupgrade
    "ANN",    # flake8-annotations
    "ASYNC",  # flake8-async
    "S",      # flake8-bandit
    "B",      # flake8-bugbear
    "C4",     # flake8-comprehensions
    "DTZ",    # flake8-datetimez
    "T10",    # flake8-debugger
    "EM",     # flake8-errmsg
    "ISC",    # flake8-implicit-str-concat
    "ICN",    # flake8-import-conventions
    "PIE",    # flake8-pie
    "PT",     # flake8-pytest-style
    "Q",      # flake8-quotes
    "RSE",    # flake8-raise
    "RET",    # flake8-return
    "SIM",    # flake8-simplify
    "TID",    # flake8-tidy-imports
    "ARG",    # flake8-unused-arguments
    "PTH",    # flake8-use-pathlib
    "PD",     # pandas-vet
    "PL",     # pylint
    "TRY",    # tryceratops
    "RUF",    # ruff-specific rules
]
ignore = [
    "ANN101",  # Missing type annotation for self
    "ANN102",  # Missing type annotation for cls
    "ANN401",  # Dynamically typed expressions (Any)
]
```

### MyPy (`pyproject.toml`)

```toml
[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
```

## Running Locally (Without Docker)

If you have Python 3.11 and Poetry installed locally:

```bash
# Activate poetry environment
poetry shell

# Run tests
pytest tests/ -v

# Format code
ruff format app/

# Lint code
ruff check app/ --fix

# Type check
mypy app/
```

**Note**: Local execution may have environment differences. Docker is recommended for consistency.

## CI/CD Integration (Future)

When setting up CI/CD, use this workflow:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: poetry install --no-root

- name: Format check
  run: poetry run ruff format app/ --check

- name: Lint
  run: poetry run ruff check app/

- name: Type check
  run: poetry run mypy app/

- name: Run tests
  run: poetry run pytest tests/ --cov=app
```

## Quick Reference

| Task                 | Command                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------- |
| Install dependencies | `docker compose exec -T api sh -c "poetry install --no-root"`                           |
| Run all tests        | `docker compose exec -T api sh -c "poetry run pytest tests/ -v"`                        |
| Format code          | `docker compose exec -T api sh -c "poetry run ruff format app/"`                        |
| Lint code            | `docker compose exec -T api sh -c "poetry run ruff check app/ --fix"`                   |
| Type check           | `docker compose exec -T api sh -c "poetry run mypy app/"`                               |
| Test coverage        | `docker compose exec -T api sh -c "poetry run pytest --cov=app tests/"`                 |
| Specific test        | `docker compose exec -T api sh -c "poetry run pytest tests/test_file.py::test_name -v"` |

## Test Organization

```
tests/
├── test_auth_jwt.py           # JWT token tests (9 tests, all passing)
├── test_auth_redis.py         # Redis session tests (14 tests, all passing)
├── test_auth_routes.py        # Auth endpoint tests (12 tests, 4 failing - known issues)
├── test_main.py               # Main app tests (8 tests, all passing)
├── test_models_postgres.py    # Model tests (10 tests, skipped - requires Docker)
└── test_models_simple.py      # Simple model tests (not in suite)
```

## Best Practices

1. **Always run tests in Docker** for consistency
2. **Format before linting** - ruff format first, then ruff check
3. **Fix linting issues** before committing
4. **Run full test suite** before creating PR
5. **Use AsyncMock** for mocking async functions
6. **Keep test coverage above 80%** (current: TBD)
7. **Write tests for new features** as you implement them
8. **Update this doc** when test setup changes

## Troubleshooting

### Tests hang or timeout

- Check if Redis and PostgreSQL containers are running
- Verify database connection in `.env`
- Increase pytest timeout if needed

### Import errors in tests

- Ensure `PYTHONPATH` includes `/app`
- Check if `__init__.py` exists in test directories
- Verify imports use absolute paths (`app.module`)

### Database-related test failures

- Run migrations: `docker compose exec -T api poetry run alembic upgrade head`
- Check database connection string
- Verify Docker PostgreSQL is healthy

---

**Next Steps**:

- Fix remaining 4 auth test failures (authentication middleware mocking)
- Add tests for document upload endpoints
- Set up test coverage reporting
- Integrate tests into CI/CD pipeline
