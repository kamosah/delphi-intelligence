.PHONY: test test-unit test-integration test-rls test-all test-coverage help

# Default target
help:
	@echo "Available test targets:"
	@echo "  make test-unit        - Run unit tests in parallel (SQLite, fast)"
	@echo "  make test-integration - Run integration tests sequentially (PostgreSQL + services)"
	@echo "  make test-rls         - Run RLS policy tests only (sequential)"
	@echo "  make test-all         - Run all tests (unit parallel, integration sequential)"
	@echo "  make test-coverage    - Run all tests with coverage report"
	@echo "  make test             - Alias for test-all"
	@echo ""
	@echo "Note: Integration tests run sequentially to avoid test isolation issues."
	@echo "      Unit tests run in parallel for speed."

test: test-all

test-unit:
	@echo "Running unit tests in parallel (SQLite, fast)..."
	poetry run pytest tests/ -m "not integration" -n auto -v

test-integration:
	@echo "Running integration tests sequentially (PostgreSQL + services)..."
	poetry run pytest tests/ -m integration -v

test-rls:
	@echo "Running RLS policy tests sequentially..."
	poetry run pytest tests/ -m rls -v

test-all:
	@echo "Running all tests (unit parallel, integration sequential)..."
	@echo ""
	@echo "→ Step 1/2: Unit tests (parallel)..."
	poetry run pytest tests/ -m "not integration" -n auto -v
	@echo ""
	@echo "→ Step 2/2: Integration tests (sequential)..."
	poetry run pytest tests/ -m integration -v
	@echo ""
	@echo "✅ All tests complete!"

test-coverage:
	@echo "Running all tests with coverage report"
	poetry run pytest tests/ --cov=app --cov-report=html --cov-report=term -v
