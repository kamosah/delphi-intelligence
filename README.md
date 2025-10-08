# Athena - AI-Powered Document Intelligence Platform

A modern full-stack AI platform built with Turborepo, featuring Next.js frontend, FastAPI backend, Supabase database, and automated migration system.

## 🏗️ Project Structure

```
athena/
├── apps/
│   ├── web/                 # Next.js frontend application (✅ COMPLETE)
│   └── api/                 # FastAPI backend application (✅ COMPLETE)
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── types/               # Shared TypeScript types
│   └── config/              # Shared configuration files
├── .github/workflows/       # CI/CD workflows (future)
├── docker-compose.yml       # Local development services (✅ COMPLETE)
├── turbo.json              # Turborepo configuration (✅ COMPLETE)
├── package.json            # Root package configuration (✅ COMPLETE)
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## ✅ Completed Features

### 🚀 **Frontend (Next.js)**

- ✅ Next.js 14 with App Router
- ✅ TypeScript configuration
- ✅ Tailwind CSS styling
- ✅ Authentication pages (login, signup, password reset)
- ✅ Dashboard layout with sidebar navigation
- ✅ Responsive design components
- ✅ Supabase client integration

### 🔧 **Backend (FastAPI)**

- ✅ FastAPI application with async support
- ✅ Pydantic v2 configuration management
- ✅ CORS middleware configuration
- ✅ Health check endpoints
- ✅ Environment-based configuration
- ✅ Poetry dependency management
- ✅ Comprehensive test infrastructure

### 🗄️ **Database & Migrations**

- ✅ Supabase PostgreSQL integration
- ✅ Automated Alembic migration system
- ✅ Hybrid migration workflow (Alembic + MCP)
- ✅ Environment-specific database connections
- ✅ Migration generation and tracking
- ✅ Database connection testing utilities
- ✅ Row Level Security (RLS) policies

### 🔄 **Development Infrastructure**

- ✅ Turborepo monorepo configuration
- ✅ Docker Compose for local services
- ✅ Hot reload for both frontend and backend
- ✅ Environment variable management
- ✅ Code formatting with Prettier
- ✅ Git hooks with Husky

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Python 3.11+ (for backend)
- Poetry (Python dependency management)
- Docker and Docker Compose (for local database)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd athena
   ```

2. **Install dependencies**

   ```bash
   npm install
   cd apps/api && poetry install && cd ../..
   ```

3. **Start local services** (Optional - if using local PostgreSQL)

   ```bash
   docker-compose up -d
   ```

   This starts PostgreSQL and Redis containers for local development.

4. **Configure environment files**

   ```bash
   # Copy example files
   cp apps/web/.env.example apps/web/.env.local
   cp apps/api/.env.example apps/api/.env

   # Edit apps/api/.env with your Supabase credentials:
   # SUPABASE_URL=your_supabase_url
   # SUPABASE_ANON_KEY=your_anon_key
   # SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   # SUPABASE_DB_URL=your_direct_database_url (for migrations)
   ```

5. **Run development servers**

   ```bash
   npm run dev
   ```

   This starts:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## 🛠️ Database Migrations

### Automated Migration System

The project includes a sophisticated migration system that supports both local PostgreSQL and Supabase:

```bash
# Navigate to API directory
cd apps/api

# Check database connection
./scripts/migrate.sh check

# Generate new migration (manual creation recommended)
./scripts/migrate.sh --supabase generate "Add new feature"

# Apply migrations via MCP server (recommended for Supabase)
# Migrations are applied automatically via Supabase MCP integration

# Check migration status
./scripts/migrate.sh status
```

### Migration Workflow

1. **Create migration file** manually in `alembic/versions/`
2. **Apply via Supabase MCP server** (bypasses pooler issues)
3. **Track in Alembic** by inserting into `alembic_version` table

See `apps/api/MIGRATION_AUTOMATION.md` for detailed documentation.

## 📦 Available Scripts

### Root Commands

- `npm run dev` - Start all development servers
- `npm run build` - Build all applications and packages
- `npm run test` - Run tests across all workspaces
- `npm run lint` - Lint all workspaces
- `npm run format` - Format code with Prettier

### Individual Workspace Commands

You can also run commands for specific workspaces:

```bash
# Web app (Next.js)
npm run dev --workspace=@olympus/web

# API app (FastAPI)
npm run dev --workspace=@olympus/api

# Packages
npm run build --workspace=@olympus/ui
```

## 🛠️ Development Tools

### Turborepo

This monorepo uses Turborepo for:

- Fast, incremental builds
- Smart task orchestration
- Remote caching (configurable)
- Parallel execution

### Code Quality

- **Prettier**: Code formatting
- **Husky**: Git hooks
- **lint-staged**: Pre-commit formatting

### Database & Services

- **PostgreSQL 16**: Primary database
- **Redis 7**: Caching and sessions
- **Docker Compose**: Local service orchestration

## 🏃‍♂️ Application Details

### Frontend (`/apps/web`)

- **Status**: ✅ **Production Ready**
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth integration
- **Features**:
  - Landing page with navigation
  - Authentication flow (login/signup/reset)
  - Dashboard with sidebar navigation
  - Document management interface
  - Query interface for AI interactions
  - Settings and profile management

**Available Routes**:

- `/` - Landing page
- `/login` - User authentication
- `/signup` - User registration
- `/reset-password` - Password reset
- `/dashboard` - Main dashboard
- `/dashboard/documents` - Document management
- `/dashboard/queries` - AI query interface
- `/dashboard/spaces` - Workspace management
- `/dashboard/settings` - User settings

### Backend (`/apps/api`)

- **Status**: ✅ **Production Ready**
- **Framework**: FastAPI with async/await support
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase integration
- **Features**:
  - RESTful API endpoints
  - Automatic OpenAPI documentation
  - Environment-based configuration
  - Database migrations with Alembic
  - Health check endpoints
  - CORS middleware for frontend integration

**API Endpoints**:

- `GET /` - Root endpoint with API info
- `GET /health` - Health check
- `GET /docs` - Interactive API documentation (dev only)
- `GET /redoc` - Alternative API docs (dev only)

### Database Infrastructure

- **Primary Database**: Supabase PostgreSQL
- **Migration System**: Alembic with hybrid MCP integration
- **Schema Management**: Automated migration tracking
- **Security**: Row Level Security (RLS) policies configured

### Packages

#### `/packages/ui` - Shared UI Components

- Reusable React components
- Design system components
- Common styling utilities

#### `/packages/types` - Shared TypeScript Types

- API response/request types
- Database schema types
- Utility types

#### `/packages/config` - Shared Configuration

- ESLint configurations
- Prettier configurations
- Build tool configs

## 🐳 Docker Services (Optional)

The `docker-compose.yml` provides optional local development services if you prefer not to use Supabase:

### PostgreSQL (Alternative to Supabase)

- **Host**: localhost:5432
- **Database**: olympus_mvp
- **User**: olympus
- **Password**: olympus_dev
- **Note**: Set `USE_LOCAL_DB=true` in `.env` to use local PostgreSQL

### Redis

- **Host**: localhost:6379
- **No authentication** (development only)
- **Purpose**: Caching and session storage

### Commands

```bash
# Start services (if using local database)
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Reset data (⚠️ destroys all data)
docker-compose down -v
```

**Note**: Most development uses Supabase directly, so Docker services are optional.

## 🔧 Configuration Files

### Root Configuration

- `turbo.json` - Turborepo task pipeline
- `package.json` - Root package and workspace config
- `.prettierrc` - Code formatting rules
- `.gitignore` - Git ignore patterns

### Git Hooks

Pre-commit hooks automatically:

1. Format staged files with Prettier
2. Add formatted files back to git

## 🚀 Current Roadmap

### Completed ✅

- [x] **Monorepo Setup** - Turborepo configuration
- [x] **Frontend Foundation** - Next.js app with authentication
- [x] **Backend API** - FastAPI with Supabase integration
- [x] **Database Integration** - Supabase PostgreSQL setup
- [x] **Migration System** - Automated Alembic + MCP workflow
- [x] **Development Environment** - Hot reload and tooling

### In Progress 🚧

- [ ] **AI Integration** - Document processing and query system
- [ ] **File Upload** - Document management with Supabase Storage
- [ ] **Search Functionality** - Vector search and semantic queries

### Upcoming 📋

- [ ] **User Management** - Profile settings and team collaboration
- [ ] **API Endpoints** - Document and query management APIs
- [ ] **Testing Suite** - Comprehensive test coverage
- [ ] **CI/CD Pipeline** - Automated testing and deployment
- [ ] **Production Deployment** - Hosting and monitoring setup

## 🤝 Contributing

1. Make sure your code is formatted: `npm run format`
2. Ensure all tests pass: `npm run test`
3. Verify builds work: `npm run build`

## 📝 Project Notes

### Architecture Decisions

- **Monorepo**: Turborepo for efficient build orchestration
- **Frontend**: Next.js 14 with App Router for modern React patterns
- **Backend**: FastAPI for high-performance async Python API
- **Database**: Supabase for managed PostgreSQL with built-in auth
- **Migrations**: Hybrid Alembic + MCP system to handle Supabase pooler limitations
- **Styling**: Tailwind CSS for utility-first responsive design

### Migration System Details

The project uses a sophisticated hybrid migration approach:

1. **Manual Migration Creation**: Write Alembic-compatible migration files
2. **MCP Server Application**: Apply migrations via Supabase MCP to bypass pooler issues
3. **Version Tracking**: Maintain Alembic version table for proper migration history

This approach provides full migration capabilities while working around Supabase's connection pooler limitations.

### Package Naming

- All packages use `@athena/*` naming convention
- Private packages are marked as `"private": true`
- Workspace dependencies are managed via npm workspaces

### Development Requirements

- Node.js 20+ and npm 10+ required for frontend
- Python 3.11+ and Poetry required for backend
- Docker optional (only needed for local PostgreSQL alternative)
- Supabase account required for database and authentication

## 🐛 Troubleshooting

### Common Issues

**Turborepo not finding workspaces**

```bash
# Verify workspaces are detected
npm ls --workspaces

# Reinstall dependencies
rm -rf node_modules
npm install
```

**Docker services not starting**

```bash
# Check if ports are available
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Restart with fresh volumes
docker-compose down -v
docker-compose up -d
```

**Husky hooks not working**

```bash
# Reinitialize Husky
rm -rf .husky
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

---
