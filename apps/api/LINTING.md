# Linting and Formatting Strategy

## Overview

This project uses **Ruff** as a single, unified tool for both linting and code formatting. Ruff is an extremely fast Python linter and formatter written in Rust that replaces multiple tools (isort, flake8, pyupgrade, etc.) with a single, performant solution.

## Why Ruff?

- **Speed**: 10-100x faster than traditional Python linters
- **All-in-one**: Replaces isort, flake8, pyupgrade, and more
- **Drop-in replacement**: Compatible with other formatting styles
- **Active development**: Modern tool with regular updates
- **Zero config**: Works well out of the box with sensible defaults

## Configuration

### Core Settings

Located in `pyproject.toml`:

```toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP"]
ignore = []

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```

### Rules Enabled

We enable comprehensive rule sets for maximum code quality:

- **E**: pycodestyle error rules (PEP 8 violations)
- **W**: pycodestyle warning rules
- **F**: pyflakes rules (undefined names, unused imports, etc.)
- **I**: isort rules (import sorting and organization)
- **N**: pep8-naming rules (naming conventions)
- **UP**: pyupgrade rules (modern Python syntax)
- **B**: flake8-bugbear (common bugs and design problems)
- **C4**: flake8-comprehensions (better list/dict/set comprehensions)
- **DTZ**: flake8-datetimez (timezone awareness)
- **T10**: flake8-debugger (prevent debugger statements)
- **EM**: flake8-errmsg (exception message best practices)
- **ISC**: flake8-implicit-str-concat
- **ICN**: flake8-import-conventions
- **G**: flake8-logging-format
- **PIE**: flake8-pie (miscellaneous lints)
- **T20**: flake8-print (prevent print statements)
- **PT**: flake8-pytest-style (pytest best practices)
- **Q**: flake8-quotes (consistent quote style)
- **RSE**: flake8-raise (raise statement improvements)
- **RET**: flake8-return (return statement improvements)
- **SIM**: flake8-simplify (code simplification)
- **TID**: flake8-tidy-imports
- **ARG**: flake8-unused-arguments
- **PTH**: flake8-use-pathlib (prefer pathlib over os.path)
- **ERA**: eradicate (commented-out code)
- **PD**: pandas-vet
- **PL**: pylint (comprehensive static analysis)
- **TRY**: tryceratops (exception handling best practices)
- **NPY**: numpy-specific rules
- **RUF**: ruff-specific rules
- **ASYNC**: flake8-async (async/await best practices)
- **S**: flake8-bandit (security vulnerabilities)

#### Intentionally Ignored Rules

Some rules are disabled because they're either too strict, conflict with project patterns, or are false positives:

- **E501**: Line length (handled by formatter)
- **B008**: Function calls in defaults (required for FastAPI dependency injection)
- **TRY300/TRY301**: Try-except structure (overly prescriptive)
- **RET503/RET504**: Return statement rules (sometimes hurt readability)
- **S101**: Assert usage (required for pytest)
- Security rules in test files (S105, S106, S603, S607)

## Usage

### Manual Commands

```bash
# Lint code and auto-fix issues
poetry run ruff check . --fix

# Format code
poetry run ruff format .

# Check without making changes
poetry run ruff check .

# Show statistics
poetry run ruff check . --statistics
```

### Pre-commit Hooks

Pre-commit hooks are configured to run Ruff automatically on every commit:

```bash
# Install hooks (one-time setup)
poetry run pre-commit install

# Run manually on all files
poetry run pre-commit run --all-files

# Run on specific files
poetry run pre-commit run --files app/main.py
```

### CI/CD Integration

In your CI pipeline, add:

```bash
poetry run ruff check .
poetry run ruff format --check .
```

The `--check` flag ensures formatting is correct without modifying files.

## IDE Integration

### VS Code

Install the official Ruff extension:

```json
{
  "editor.formatOnSave": true,
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit",
      "source.organizeImports": "explicit"
    }
  }
}
```

### PyCharm

1. Install the Ruff plugin from the marketplace
2. Go to Settings → Tools → Ruff
3. Enable "Run Ruff on save"

## Workflow

### Daily Development

1. Write code as usual
2. Ruff will format on save (if IDE configured)
3. Pre-commit hooks run automatically on `git commit`
4. Fix any issues flagged by Ruff before pushing

### Before Committing

```bash
# Quick check
poetry run ruff check . --fix
poetry run ruff format .
```

### Handling Exceptions

For rare cases where Ruff's rules need to be bypassed:

```python
# Ignore specific rule for one line
x = 1  # noqa: E501

# Ignore all rules for one line
x = 1  # noqa

# Ignore specific rule for entire file (at top)
# ruff: noqa: E501
```

Use exceptions sparingly and document why they're necessary.

## Benefits Over Previous Setup

### Before (Multiple Tools)

- flake8 for linting
- isort for imports
- pyupgrade for syntax modernization
- Multiple config files
- Slower execution

### After (Ruff Only)

- Single tool for everything
- One configuration section
- 10-100x faster
- Better error messages
- Active development

## Troubleshooting

### Pre-commit Fails

```bash
# Update pre-commit hooks
poetry run pre-commit autoupdate

# Clean cache
poetry run pre-commit clean
```

### Conflicts with IDE

Ensure your IDE is using the same Ruff version as the project:

```bash
# Check Ruff version
poetry run ruff --version

# Update dependencies
poetry update ruff
```

### Line Too Long Errors

If a line cannot be shortened:

1. Try breaking it into multiple lines
2. Extract to a variable
3. As a last resort, add `# noqa: E501`

## Resources

- [Ruff Documentation](https://docs.astral.sh/ruff/)
- [Ruff Rules](https://docs.astral.sh/ruff/rules/)
- [Pre-commit Hook](https://github.com/astral-sh/ruff-pre-commit)

## Support

For questions or issues with the linting setup:

1. Check this documentation
2. Review Ruff's official docs
3. Ask the team in Slack #engineering
4. Open a GitHub issue for project-specific linting rules
