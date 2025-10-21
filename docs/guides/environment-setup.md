# Environment Setup Guide

This guide covers environment configuration, MCP server setup, and project initialization for the Olympus MVP project.

## Environment Variables

### Backend Environment (.env in apps/api)

```bash
# Application
APP_NAME=Olympus MVP API
ENV=development
DEBUG=true

# Database (choose one approach)
USE_LOCAL_DB=true                           # For Docker PostgreSQL
DATABASE_URL=postgresql+asyncpg://...       # OR explicit connection

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_DB_URL=postgresql+asyncpg://postgres.xxx...  # Direct connection

# Redis
REDIS_URL=redis://localhost:6379
# REDIS_URL=redis://redis:6379  # Docker environment

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# CORS
CORS_ORIGINS=["http://localhost:3000"]
```

### Frontend Environment (.env.local in apps/web)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8000/graphql
```

## MCP Server Configuration

This project uses Model Context Protocol (MCP) servers to enhance Claude Code capabilities. The configuration follows a **hybrid approach**: global servers for universal tools, project-specific servers for project tools.

### Project-Specific Servers (.mcp.json)

These servers are automatically available when working in this project:

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    },
    "linear": {
      "type": "stdio",
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.linear.app/sse"]
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=mvqjahridaytxfsuzljy"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_72251866901920fec086e4fc7ff81ff4993b3f17"
      }
    }
  }
}
```

**Purpose**:

- **shadcn**: Access to Shadcn UI component registry for adding/searching design system components
- **linear**: Integration with Linear for issue tracking, project management, and task creation
- **supabase**: Direct access to Supabase management API (database operations, auth, storage)

**Setup**:

- **shadcn**: No additional configuration required
- **linear**: Requires `LINEAR_API_KEY` environment variable
- **supabase**: Configured with project-specific credentials

### Global Servers (Recommended Setup)

These servers should be configured in your **global Claude Code config** (`~/.claude.json`):

#### Required for Full Functionality

**filesystem** (Enhanced file operations):

```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/athena"]
}
```

**memory** (Knowledge graph for project context):

```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"]
}
```

**postgres** (Database query access for Olympus DB):

```json
{
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-postgres",
    "postgresql://olympus:password@localhost:5432/olympus_mvp"
  ]
}
```

**Note**: Replace database credentials with your local setup. Use `USE_LOCAL_DB=true` for Docker PostgreSQL or Supabase connection string for cloud database.

#### Optional but Recommended

**ide** (VS Code integration):

- Usually auto-configured by Claude Code
- Provides enhanced IDE integration (diagnostics, Jupyter kernel for notebooks)

### Why Hybrid Configuration?

| Configuration                      | Purpose                                                      | Location                           |
| ---------------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| **Project-specific** (`.mcp.json`) | Tools specific to Olympus project (shadcn, linear, supabase) | Committed to git, shared with team |
| **Global** (`~/.claude.json`)      | Universal tools (filesystem, memory, postgres, ide)          | Personal config with credentials   |

**Benefits**:

- ✅ Team members automatically get project-specific tools (shadcn, linear, supabase)
- ✅ Database credentials stay out of version control
- ✅ Personal development setup (database, file paths) stays private
- ✅ Universal tools (filesystem, memory) available across all projects

### First-Time Setup

**For new team members**:

1. Project-specific servers (shadcn, linear, supabase) work automatically
2. Configure global servers in `~/.claude.json`:
   - Add **postgres** with your local database connection string
   - Add **filesystem** with path to this repository
   - Add **memory** for knowledge graph (no configuration needed)

3. Verify setup:

   ```bash
   # Test postgres connection
   # Claude Code should be able to query the database

   # Test shadcn
   # Claude Code should be able to search/add components
   ```

### Troubleshooting

**"MCP server not found" error**:

- Check that `~/.claude.json` exists and has correct server configuration
- Restart Claude Code after modifying `.claude.json` or `.mcp.json`

**Postgres connection issues**:

- Verify database is running: `docker compose ps` (if using Docker)
- Check connection string matches your local setup
- Ensure database exists: `olympus_mvp` for local Docker

**Shadcn not working**:

- This should work automatically via `.mcp.json`
- Try restarting Claude Code if just added

## Database Architecture

**Primary**: Supabase PostgreSQL with Row Level Security (RLS)
**Sessions**: Redis for JWT token management
**Migrations**: Hybrid Alembic + Supabase MCP system

Database switching is controlled via environment variables:

- `USE_LOCAL_DB=true` - Use Docker PostgreSQL
- `USE_LOCAL_DB=false` - Use Supabase (default)

## Git Commit Guidelines

- **Never add "Co-Authored-By: Claude" to commit messages**
- Keep commit messages professional and project-focused
- Follow conventional commit format when applicable (e.g., `feat:`, `fix:`, `docs:`)
