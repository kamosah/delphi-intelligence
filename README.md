# Olympus MVP - AI-Powered Document Intelligence Platform

An open-source recreation of [Athena Intelligence](https://www.athenaintel.com/), featuring an AI-native platform (Olympus) with autonomous AI analysts (Athena) for document intelligence and analysis.

**Inspired by**: [Athena Intelligence](https://www.athenaintel.com/) - The first artificial data analyst

**Tech Stack**: Next.js 14, FastAPI, Supabase PostgreSQL, LangChain + LangGraph + CrewAI

## About This Project

Olympus MVP is an educational recreation of Athena Intelligence's core capabilities:

- **Document Intelligence**: Upload and analyze documents with AI extraction
- **Natural Language Queries**: Ask questions across your document collection
- **Olympus Platform**: AI-native workspace with audit trails and collaboration
- **Athena AI Agent**: Autonomous analysis with source citations

> **Disclaimer**: This project is not affiliated with, endorsed by, or connected to Athena Intelligence. It is created for educational and demonstrative purposes.

📚 **Documentation**: See [Product Requirements](./docs/PRODUCT_REQUIREMENTS.md) for detailed feature specifications.

## 🏗️ Project Structure

```
athena/
├── apps/
│   ├── web/                 # Next.js frontend application
│   └── api/                 # FastAPI backend application
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── types/               # Shared TypeScript types
│   └── config/              # Shared configuration files
├── .github/workflows/       # CI/CD workflows (API & Web linting)
├── docker-compose.yml       # Local development services
├── turbo.json              # Turborepo configuration
├── package.json            # Root package configuration
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## Inspiration & Goals

This project recreates the core features of [Athena Intelligence](https://www.athenaintel.com/):

- **Olympus Platform**: AI-native infrastructure with integrated tools
- **Athena AI Agent**: Autonomous document analysis and insights
- **Use Cases**: Research analysis, legal document review, financial data extraction

**MVP Goals** (see [docs/PRODUCT_REQUIREMENTS.md](./docs/PRODUCT_REQUIREMENTS.md)):

- ✅ Authentication system (complete with email verification)
- ✅ Document upload API with Supabase Storage (complete)
- ✅ LangChain + LangGraph simple query agent (complete - LOG-136)
- 🚧 Document processing and extraction (in progress)
- 🚧 AI-powered querying with RAG and citations (in progress)
- ⏳ Multi-agent workflows with CrewAI (Phase 3-4)
- ⏳ Natural language interface with source citations
- ⏳ Workspace collaboration features

**Current Status**: ~40% feature parity with Athena Intelligence
**Target**: 70% of core features for MVP launch

## 🏗️ Current Application Setup

### 🌐 **Frontend Application (Next.js 14)**

**Location**: `/apps/web`  
**Status**: Production-ready with modern React architecture

**Core Features**:

- **App Router**: Utilizing Next.js 14's latest routing system with server components
- **TypeScript**: Full type safety across the application
- **Tailwind CSS**: Utility-first styling with responsive design
- **State Management**: React Query + Zustand with JWT authentication
- **Dashboard Layout**: Sidebar navigation with multiple sections
- **GraphQL Integration**: Authenticated client with JWT token headers

**Page Structure**:

```
/                           # Landing page
/(auth)/login              # User authentication
/(auth)/signup             # User registration
/(auth)/reset-password     # Password reset
/dashboard                 # Main dashboard
/dashboard/documents       # Document management
/dashboard/queries         # AI query interface
/dashboard/spaces          # Workspace management
/dashboard/settings        # User settings
```

### 🔧 **Backend API (FastAPI)**

**Location**: `/apps/api`  
**Status**: Production-ready with comprehensive authentication system

**Core Architecture**:

- **FastAPI Framework**: High-performance async Python API
- **Pydantic v2**: Request/response validation and serialization
- **Authentication System**: JWT-based auth with Supabase integration
- **Middleware Stack**: CORS, authentication, and request processing
- **Environment Configuration**: Centralized settings management

**API Endpoints**:

```
GET    /                          # API information
GET    /health                    # Basic health check
GET    /health/detailed           # Detailed health with dependencies
GET    /health/protected          # Protected endpoint example
POST   /auth/register             # User registration
POST   /auth/login                # User authentication
POST   /auth/refresh              # Token refresh
POST   /auth/logout               # User logout
GET    /auth/me                   # Current user profile
POST   /auth/forgot-password      # Request password reset
POST   /auth/reset-password       # Confirm password reset
POST   /auth/resend-verification  # Resend email verification
POST   /auth/exchange-token       # Exchange Supabase token for backend tokens
POST   /api/documents             # Upload document to space
GET    /api/documents             # List documents (optionally filtered by space)
GET    /api/documents/{id}        # Get document metadata
DELETE /api/documents/{id}        # Delete document
GET    /docs                      # OpenAPI documentation (dev)
GET    /graphql                   # GraphQL endpoint
```

**Authentication Features**:

- JWT token generation and validation
- Refresh token mechanism (30-day lifetime with remember me option)
- Redis-based session management
- Token blacklisting for secure logout
- Role-based access control
- Supabase Auth integration
- Email verification with auto-login after confirmation
- Password reset flow with secure token exchange
- Resend verification email functionality

### 🗄️ **Database Infrastructure**

**Primary Database**: Supabase PostgreSQL  
**Session Storage**: Redis  
**Migration System**: Hybrid Alembic + Supabase MCP

**Database Schema**:

- **Users Table**: Extended Supabase auth.users with profile data
- **Spaces Table**: Workspace organization with RLS policies
- **Documents Table**: File metadata, storage paths, and processing status
- **Queries Table**: AI interaction history and results
- **User Preferences**: Customizable user settings

**Storage**:

- **Supabase Storage**: Document file storage with organized buckets
- **File Types**: PDF, DOCX, TXT, CSV, XLSX support
- **File Size Limit**: 50MB per document
- **File Paths**: Organized by space and document ID

**Security Features**:

- Row Level Security (RLS) policies on all tables
- User-scoped data access patterns
- Service role for admin operations
- Automated user profile creation on signup

### 🔐 **Authentication & Security**

**Hybrid Authentication Architecture**:

- **REST endpoints** for authentication (`/auth/login`, `/auth/refresh`, `/auth/logout`)
- **GraphQL endpoint** for all data operations (`/graphql`)
- **Frontend integration**: React Query + Zustand for state management
- **Token storage**: HTTP-only cookies + Zustand store for client state

**JWT Token System**:

- Access tokens: 24-hour expiration
- Refresh tokens: 30-day expiration
- HS256 algorithm with configurable secret
- Token blacklisting on logout

**Session Management**:

- Redis-based session storage
- Automatic session cleanup
- User context injection in requests
- Multi-device session support

**Security Middleware**:

- Request authentication validation
- CORS protection with configurable origins
- Rate limiting ready (infrastructure in place)
- Environment-based security configurations

### 📦 **Shared Packages**

**UI Package** (`/packages/ui`):

- **Shadcn UI**: Design system primitives (Button, Card, Input, Badge, Progress, etc.)
- Reusable React components built on top of Shadcn
- Consistent styling with Tailwind CSS
- Full Storybook documentation
- Composable component architecture

**Types Package** (`/packages/types`):

- Shared TypeScript interfaces
- API request/response types
- Database schema types
- Cross-application type safety

**Config Package** (`/packages/config`):

- ESLint configurations
- Prettier rules
- Build tool configurations
- Development environment setup

### � **Development Environment**

**Local Services** (Docker Compose):

```yaml
services:
  postgres: # Alternative to Supabase (optional)
    - Port: 5432
    - Database: olympus_mvp
    - User: olympus/olympus_dev

  redis: # Session storage (required)
    - Port: 6379
    - No authentication (dev only)
```

**Development Tools**:

- **Turborepo**: Monorepo build orchestration
- **Hot Reload**: Real-time development for both apps
- **Poetry**: Python dependency management
- **npm Workspaces**: Package management and linking
- **Prettier**: Automated code formatting
- **Husky**: Git hooks for quality control

### 🧪 **Testing Infrastructure**

**Backend Testing**:

- **pytest**: Test framework with async support
- **JWT Tests**: 9 comprehensive token handling tests
- **Redis Tests**: 14 session management tests
- **Route Tests**: Authentication endpoint testing
- **Mocking**: Proper isolation for external dependencies

**Test Coverage**:

- Authentication system: 100% core functionality
- JWT token management: All scenarios covered
- Redis operations: All CRUD operations tested
- API routes: Success and error cases

**Frontend Testing**:

- **Playwright**: End-to-end testing framework
  - Authentication flow tests (login, signup, password reset)
  - Mock API fixtures for isolated testing
  - Headless and headed test modes
  - Auto-wait for elements and network
  - Visual regression testing ready

- **Storybook**: Component development and testing
  - Interactive component documentation
  - Visual component library at http://localhost:6006
  - Interaction tests with @storybook/test
  - Accessibility checks ready
  - Chromatic integration for visual regression

**Running Frontend Tests**:

```bash
cd apps/web

# Playwright E2E Tests
npm run test:e2e                    # Run all e2e tests
npm run test:e2e:ui                 # Run with UI mode
npm run test:e2e:headed             # Run in headed mode
npm run test:e2e:debug              # Debug mode
npm run test:e2e:report             # View test report

# Storybook
npm run storybook                   # Start Storybook dev server
npm run test-storybook              # Run interaction tests
npm run test-storybook:ci           # Run in CI mode
npm run build-storybook             # Build static Storybook
```

### 🔄 **CI/CD Pipeline**

**GitHub Actions Workflows**:

- **API Linting & Formatting** (`api-lint.yml`):
  - Ruff linting with comprehensive rule sets
  - Ruff formatting checks
  - MyPy type checking
  - Runs on push/PR to main/develop branches

- **Web Linting & Type Checking** (`web-lint.yml`):
  - ESLint code quality checks
  - TypeScript type checking
  - Next.js build verification
  - Prettier formatting validation
  - Playwright E2E tests
  - Storybook interaction tests
  - Runs on push/PR to main/develop branches

**Code Quality Standards**:

- **Backend**: Ruff (comprehensive Python linting), MyPy (strict type checking)
- **Frontend**: ESLint (Next.js recommended rules), TypeScript strict mode
- **Formatting**: Ruff (Python), Prettier (TypeScript/JavaScript/CSS)
- **Pre-commit**: Husky + lint-staged for local quality gates

### ⚙️ **Configuration Management**

**Environment Variables**:

```bash
# Application
APP_NAME=Olympus MVP API
ENV=development
DEBUG=true

# Supabase
SUPABASE_URL=https://project.supabase.co
SUPABASE_ANON_KEY=public_key
SUPABASE_SERVICE_ROLE_KEY=admin_key

# Authentication
JWT_SECRET=secure_secret_key
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Services
REDIS_URL=redis://localhost:6379
CORS_ORIGINS=["http://localhost:3000"]
```

**Configuration Features**:

- Pydantic-based settings validation
- Environment-specific configurations
- Automatic type conversion and validation
- Comprehensive error handling for missing variables

### 🚀 **Deployment Ready Features**

**Production Considerations**:

- Environment-based configuration switching
- Secure JWT secret management
- CORS configuration for production domains
- Health check endpoints for monitoring
- Graceful error handling and logging
- Scalable Redis session management

**CI/CD Active**:

- ✅ GitHub Actions workflows for API and Web
- ✅ Automated linting and formatting checks
- ✅ TypeScript and MyPy type checking
- ✅ Build verification on every push/PR
- Dockerfile configurations prepared
- Environment variable templates
- Test suites for automated validation
- Build optimization with Turborepo
- Package vulnerability scanning ready

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

3. **Start local services** (Choose your database setup)

   **Option A: Docker Development Environment (Recommended)**

   ```bash
   # Start complete Docker environment (PostgreSQL + Redis + API)
   cd apps/api
   docker compose up -d

   # The API will run at http://localhost:8000
   # Configure frontend to use Docker API
   ```

   **Option B: Supabase Only (External Database)**

   ```bash
   # Start only Redis for session management
   docker compose up -d redis

   # API will connect to Supabase database
   ```

   📚 **See [Docker Setup Guide](./apps/api/DOCKER_SETUP.md) for detailed instructions**

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

### Migration System

The project uses a hybrid migration system that supports both local PostgreSQL and Supabase:

```bash
# Navigate to API directory
cd apps/api

# Using Docker (recommended for local development)
docker compose exec api poetry run alembic upgrade head      # Apply migrations
docker compose exec api poetry run alembic current           # Show current version
docker compose exec api poetry run alembic history           # Show all migrations
docker compose exec api poetry run alembic downgrade -1      # Rollback one migration
docker compose exec api poetry run alembic revision --autogenerate -m "Description"

# Using Alembic directly (local environment without Docker)
poetry run alembic upgrade head                              # Apply migrations
poetry run alembic revision --autogenerate -m "Description"  # Generate migration
poetry run alembic current                                   # Show current version
poetry run alembic history                                   # Show all migrations
```

### Migration Workflow

1. **Create migration file** manually in `alembic/versions/` or use `--autogenerate`
2. **Review migration** to ensure correctness before applying
3. **Apply via Supabase MCP server** (for Supabase database, bypasses pooler issues)
4. **Track in Alembic** by updating `alembic_version` table

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

- **Backend Linting**: Ruff with comprehensive rule sets (pycodestyle, pyflakes, isort, flake8-\*, pylint, security)
- **Frontend Linting**: ESLint with Next.js recommended configuration
- **Type Checking**: MyPy (backend), TypeScript strict mode (frontend)
- **Formatting**: Ruff (Python), Prettier (TypeScript/JavaScript/CSS)
- **Git Hooks**: Husky + lint-staged for pre-commit quality checks
- **CI/CD**: Automated checks on GitHub Actions for every push/PR

### Database & Services

- **PostgreSQL 16**: Primary database
- **Redis 7**: Caching and sessions
- **Docker Compose**: Local service orchestration

## 🌐 Application Details

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
  - JWT authentication with React Query state management**Available Routes**:

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
- **Database**: Supabase PostgreSQL with Docker option
- **Authentication**: Supabase integration with JWT
- **Documentation**: 📚 [Complete Setup Guide](./apps/api/DOCKER_SETUP.md) | [Development Workflow](./apps/api/DEVELOPMENT_WORKFLOW.md)
- **Features**:
  - RESTful API endpoints with GraphQL support
  - Docker development environment with hot reload
  - Automatic OpenAPI documentation
  - Environment-based configuration (Docker/Supabase switching)
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
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f postgres
docker compose logs -f redis

# Reset data (⚠️ destroys all data)
docker compose down -v
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
- [x] **Authentication System** - Email verification, password reset, remember me
- [x] **Document Upload API** - Supabase Storage integration with validation
- [x] **Document Upload UI Components** - Drag-and-drop with progress tracking
- [x] **CI/CD Pipeline** - GitHub Actions for linting, type checking, builds, and tests
- [x] **Testing Infrastructure** - Playwright E2E tests and Storybook interaction tests

### In Progress 🚧

- [ ] **Document Processing** - Text extraction and chunking pipeline
- [x] **AI Agent Foundation** - LangGraph simple query agent (LOG-136 complete)
- [ ] **Vector Search** - pgvector integration for semantic search
- [ ] **RAG Pipeline** - Document retrieval and citation tracking
- [x] **Architecture Decision** - ADR-002 hybrid LangGraph + CrewAI (complete)

### Upcoming 📋

**Phase 3: Multi-Agent Orchestration**

- [ ] **CrewAI Integration** - Multi-agent workflow orchestration
- [ ] **Financial Analysis Crew** - Specialized agents for SEC filings and earnings reports
- [ ] **Legal Review Crew** - Contract analysis and compliance checking
- [ ] **Research Synthesis** - Multi-document analysis with domain expertise

**Phase 4: Workflow Automation**

- [ ] **User-Defined Workflows** - Custom agent teams and task automation
- [ ] **Scheduled Research** - Daily/weekly automated analysis tasks
- [ ] **Trigger-Based Actions** - Document upload → crew processing pipelines

**General**

- [ ] **User Management** - Profile settings and team collaboration
- [ ] **GraphQL Mutations** - Document and query management via GraphQL
- [ ] **Production Deployment** - Hosting and monitoring setup
- [ ] **Real-time Collaboration** - WebSocket support for live updates

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
- **Authentication**: Hybrid approach - REST for auth, GraphQL for data, JWT tokens with React Query
- **Migrations**: Hybrid Alembic + MCP system to handle Supabase pooler limitations
- **Styling**: Tailwind CSS for utility-first responsive design

### Migration System Details

The project uses a sophisticated hybrid migration approach:

1. **Manual Migration Creation**: Write Alembic-compatible migration files
2. **MCP Server Application**: Apply migrations via Supabase MCP to bypass pooler issues
3. **Version Tracking**: Maintain Alembic version table for proper migration history

This approach provides full migration capabilities while working around Supabase's connection pooler limitations.

### Package Naming

- All packages use `@olympus/*` naming convention
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
docker compose down -v
docker compose up -d
```

**Husky hooks not working**

```bash
# Reinitialize Husky
rm -rf .husky
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

---
