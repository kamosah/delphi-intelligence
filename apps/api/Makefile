.PHONY: test test-unit test-integration test-rls test-all test-coverage help

# Default target
help:
	@echo "Available test targets:"
	@echo "  make test-unit        - Run unit tests only (SQLite, fast)"
	@echo "  make test-integration - Run integration tests (PostgreSQL + services)"
	@echo "  make test-rls         - Run RLS policy tests only"
	@echo "  make test-all         - Run all tests"
	@echo "  make test-coverage    - Run all tests with coverage report"
	@echo "  make test             - Alias for test-all"
	@echo ""
	@echo "Environment detection is handled automatically by conftest.py"

test: test-all

test-unit:
	@echo "Running unit tests (SQLite, fast)"
	poetry run pytest tests/ -m "not integration" -v

test-integration:
	@echo "Running integration tests (PostgreSQL + services)"
	poetry run pytest tests/ -m integration -v

test-rls:
	@echo "Running RLS policy tests"
	poetry run pytest tests/ -m rls -v

test-all:
	@echo "Running all tests"
	poetry run pytest tests/ -v

test-coverage:
	@echo "Running all tests with coverage report"
	poetry run pytest tests/ --cov=app --cov-report=html --cov-report=term -v
