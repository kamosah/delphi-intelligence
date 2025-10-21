# Documentation Guides

This directory contains modular documentation for the Olympus MVP project, extracted from the main CLAUDE.md for better performance.

## Why Modular Documentation?

The original CLAUDE.md was **43,134 characters**, exceeding the recommended 40k threshold for optimal Claude Code performance. The documentation has been refactored into a modular structure:

- **Main CLAUDE.md**: **10,188 characters** (76% reduction) - Core overview and quick reference
- **Topic-specific guides**: Detailed documentation organized by concern

## Documentation Structure

### Main Entry Point

- **[CLAUDE.md](../../CLAUDE.md)** (10k chars) - Core project overview, quick start, architecture principles, and links to detailed guides

### Development Guides

- **[development-commands.md](./development-commands.md)** (6.4k) - Complete command reference
  - Root Turborepo commands
  - Frontend commands (Next.js, GraphQL, Storybook)
  - Backend commands (Docker, Poetry, Testing)
  - Database migration workflows
  - Quick reference for common tasks

- **[environment-setup.md](./environment-setup.md)** (5.9k) - Configuration and setup
  - Environment variables (backend & frontend)
  - MCP server configuration (project-specific & global)
  - Database architecture
  - First-time setup instructions
  - Troubleshooting guide

- **[component-development.md](./component-development.md)** (16k) - Component creation best practices
  - Component architecture philosophy
  - Component location strategy
  - 7 component creation rules with examples
  - Development workflow
  - Code review checklist
  - Common patterns

### Architecture Guides

- **[frontend-guide.md](./frontend-guide.md)** (7.5k) - Frontend architecture
  - Application structure
  - Hybrid state management (React Query, Zustand, React Hook Form)
  - Data fetching patterns
  - GraphQL code generation
  - SSE streaming with custom hooks
  - Styling with Tailwind CSS

- **[backend-guide.md](./backend-guide.md)** (6.9k) - Backend architecture
  - Application structure
  - Key backend patterns (config, sessions, auth, GraphQL, SSE)
  - Testing strategy
  - Common workflows (GraphQL, REST, database models)
  - AI agent architecture (LangGraph vs CrewAI)
  - Code quality tools

## How Claude Code Uses This Documentation

1. **Primary**: Claude Code reads `CLAUDE.md` (10k) on every session start
2. **On-demand**: When you ask about specific topics, Claude can reference the detailed guides
3. **Performance**: Only the main file is loaded by default, keeping context usage low

## Quick Navigation

**For quick start and architecture overview**: Read [CLAUDE.md](../../CLAUDE.md)

**For specific topics**:

- Need to run a command? → [development-commands.md](./development-commands.md)
- Setting up environment? → [environment-setup.md](./environment-setup.md)
- Creating components? → [component-development.md](./component-development.md)
- Frontend patterns? → [frontend-guide.md](./frontend-guide.md)
- Backend patterns? → [backend-guide.md](./backend-guide.md)

## Updating Documentation

When updating these guides:

1. Keep **CLAUDE.md** as the main entry point and quick reference
2. Put detailed information in the appropriate topic-specific guide
3. Ensure CLAUDE.md links to relevant guides for deeper dives
4. Keep individual guides focused on a single concern
5. Target ~5-15k characters per guide for optimal loading

## Benefits of This Structure

✅ **Performance**: Main file is 76% smaller (10k vs 43k)
✅ **Maintainability**: Changes are isolated to specific guides
✅ **Discoverability**: Clear organization by topic
✅ **Scalability**: Easy to add new guides as the project grows
✅ **Context efficiency**: Claude Code only loads what's needed
