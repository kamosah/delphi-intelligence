# Local Python Development Setup

This guide explains how to set up Python development locally (outside of Dev Container) with the same configuration as the Dev Container environment.

## Prerequisites

- Python version manager (pyenv recommended)
- Poetry package manager

## Quick Setup

### 1. Install Python 3.11 with pyenv

**Why pyenv?**

- Manages multiple Python versions easily
- Project-specific version via `.python-version` file
- Matches Dev Container's Python 3.11 exactly
- Doesn't interfere with macOS system Python

```bash
# Install pyenv
brew install pyenv

# Add pyenv to shell (add to ~/.zshrc or ~/.bashrc)
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(pyenv init -)"' >> ~/.zshrc

# Restart shell or source config
source ~/.zshrc

# Install Python 3.11.9 (matches container)
pyenv install 3.11.9

# Verify installation
pyenv versions
# Should show: 3.11.9

# Navigate to apps/api (will auto-activate Python 3.11.9 from .python-version)
cd apps/api
python --version
# Should output: Python 3.11.9
```

**Note:** The project includes `apps/api/.python-version` file which automatically activates Python 3.11.9 when you `cd` into `apps/api/`.

#### Alternative: asdf (Universal Version Manager)

If you want to manage **both Python AND Node.js** with one tool:

```bash
# Install asdf
brew install asdf

# Add to shell
echo '. /opt/homebrew/opt/asdf/libexec/asdf.sh' >> ~/.zshrc
source ~/.zshrc

# Install Python plugin
asdf plugin add python

# Install Python 3.11.9
asdf install python 3.11.9

# asdf will auto-detect .python-version file
cd apps/api
python --version
# Should output: Python 3.11.9
```

#### Alternative: mise (Modern, Faster)

If you want a **faster, modern** alternative to asdf:

```bash
# Install mise
brew install mise

# Add to shell
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
source ~/.zshrc

# Install Python 3.11.9
mise install python@3.11.9

# mise will auto-detect .python-version file
cd apps/api
python --version
# Should output: Python 3.11.9
```

**Comparison:**

- **pyenv**: Python-only, most common, simplest for Python projects
- **asdf**: Universal manager, more plugins, larger ecosystem
- **mise**: Fastest, Rust-based, modern, compatible with asdf plugins

**Recommendation:** Use **pyenv** unless you want to manage Node.js versions too (then use asdf or mise).

### 2. Install Poetry

```bash
# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Add Poetry to PATH (add to ~/.zshrc or ~/.bashrc)
export PATH="$HOME/.local/bin:$PATH"

# Verify installation
poetry --version
```

### 3. Configure Poetry for In-Project Virtual Env

```bash
# Set Poetry to create .venv/ in project directory
poetry config virtualenvs.in-project true

# Verify configuration
poetry config virtualenvs.in-project
# Should output: true
```

### 4. Create Virtual Environment and Install Dependencies

```bash
cd apps/api

# Create virtual env and install all dependencies
poetry install

# Verify virtual env created
ls -la .venv/
# Should see: bin/, lib/, pyvenv.cfg

# Verify Python version
.venv/bin/python --version
# Should output: Python 3.11.x

# Verify Ruff installed
.venv/bin/ruff --version

# Verify mypy installed
.venv/bin/mypy --version
```

### 5. Select Python Interpreter in VSCode

**Option A: VSCode will auto-detect** (recommended)

- Open any `.py` file in `apps/api/`
- VSCode should automatically detect `.venv/bin/python`
- Check status bar (bottom right) - should show `.venv (Python 3.11.x)`

**Option B: Manual selection**

- `Cmd+Shift+P` → "Python: Select Interpreter"
- Choose `./apps/api/.venv/bin/python`

## Verification

### Check VSCode is Using Virtual Env

1. Open `apps/api/app/main.py`
2. Check status bar (bottom right):
   - Should show: `.venv (Python 3.11.x)`
3. Type errors should now match `mypy` output
4. Imports should auto-complete (Pylance using `.venv` packages)

### Run Same Commands as Dev Container

```bash
cd apps/api

# Format code
poetry run ruff format

# Lint code
poetry run ruff check --fix

# Type checking
poetry run mypy app/

# Run tests
poetry run pytest
```

**These commands should produce identical results to:**

```bash
docker compose exec api poetry run ruff format
docker compose exec api poetry run ruff check --fix
docker compose exec api poetry run mypy app/
docker compose exec api poetry run pytest
```

## How It Works

### Unified Configuration

Both **local** and **Dev Container** environments use:

- **Same virtual env location**: `apps/api/.venv/`
- **Same Poetry configuration**: `virtualenvs.in-project = true`
- **Same VSCode settings**: `.vscode/settings.json` uses `${workspaceFolder}/apps/api/.venv/bin/python`
- **Same `pyproject.toml` rules**: Ruff, mypy, pytest all read from `apps/api/pyproject.toml`

### Path Resolution

- **Local**: `${workspaceFolder}` → `/Users/kwameamosah/Documents/GitHub/olympus`
  - Python: `/Users/kwameamosah/Documents/GitHub/olympus/apps/api/.venv/bin/python`
  - Ruff: `/Users/kwameamosah/Documents/GitHub/olympus/apps/api/.venv/bin/ruff`

- **Dev Container**: `${workspaceFolder}` → `/workspace`
  - Python: `/workspace/apps/api/.venv/bin/python`
  - Ruff: `/workspace/apps/api/.venv/bin/ruff`

### Settings Inheritance

```
Local Development:
  .vscode/settings.json (workspace settings)

Dev Container Development:
  .vscode/settings.json (workspace settings)
  + .devcontainer/devcontainer.json (container-specific overrides)
```

Since both use the same relative path structure (`apps/api/.venv/`), settings are **consistent across environments**.

## Troubleshooting

### Issue: VSCode shows "No Python interpreter selected"

**Solution:**

```bash
cd apps/api
poetry install  # Ensure .venv/ exists
# Then in VSCode: Cmd+Shift+P → "Python: Select Interpreter" → Choose .venv
```

### Issue: Pylance can't find imports

**Solution:**
Check `python.analysis.extraPaths` includes project root:

```json
// .vscode/settings.json
"python.analysis.extraPaths": ["${workspaceFolder}/apps/api"]
```

### Issue: Ruff version mismatch

**Solution:**

```bash
cd apps/api
poetry update ruff  # Update to match pyproject.toml version
```

### Issue: Different behavior between local and container

**Solution:**
Ensure Poetry lockfile is synchronized:

```bash
cd apps/api
poetry lock --no-update  # Regenerate lock file
poetry install           # Reinstall from lock file
```

## Switching Between Local and Dev Container

### From Local → Dev Container

1. Open VSCode Command Palette (`Cmd+Shift+P`)
2. Select: `Dev Containers: Reopen in Container`
3. VSCode will rebuild container and use container's `.venv/`
4. **No manual configuration needed** - settings auto-apply

### From Dev Container → Local

1. Open VSCode Command Palette (`Cmd+Shift+P`)
2. Select: `Dev Containers: Reopen Folder Locally`
3. VSCode will use local `.venv/` (if it exists)
4. If `.venv/` doesn't exist locally: Run `poetry install` in terminal

## Best Practices

### 1. Always use `poetry run` for consistency

```bash
# Good - uses virtual env's tools
poetry run ruff check
poetry run mypy app/
poetry run pytest

# Avoid - may use system tools
ruff check  # Could use wrong version
mypy app/   # Could use wrong config
pytest      # Could use wrong Python
```

### 2. Keep Poetry lockfile in sync

```bash
# After updating dependencies in pyproject.toml
poetry lock
poetry install

# Commit poetry.lock to git
git add poetry.lock
git commit -m "chore: update dependencies"
```

### 3. Rebuild Dev Container after dependency changes

```bash
# After pulling dependency updates
# In VSCode Command Palette:
Dev Containers: Rebuild Container
```

### 4. Use pre-commit hooks (optional)

```bash
cd apps/api
poetry run pre-commit install  # Install git hooks
# Now ruff, mypy run automatically on git commit
```

## Summary

✅ **Local and Dev Container now share identical configuration**
✅ **Type errors match between VSCode and terminal commands**
✅ **Switching environments is seamless** (no manual config changes)
✅ **Single source of truth**: `pyproject.toml` defines all linting/typing rules
