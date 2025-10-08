# Athena - AI-Powered Document Intelligence Platform

A modern full-stack AI platform built with Turborepo, featuring Next.js frontend, FastAPI backend, Supabase database, and automated migration system.

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
├── .github/workflows/       # CI/CD workflows (future)
├── docker-compose.yml       # Local development services
├── turbo.json              # Turborepo configuration
├── package.json            # Root package configuration
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## 🏗️ Current Application Setup

### 🌐 **Frontend Application (Next.js 14)**

**Location**: `/apps/web`  
**Status**: Production-ready with modern React architecture

**Core Features**:

- **App Router**: Utilizing Next.js 14's latest routing system with server components
- **TypeScript**: Full type safety across the application
- **Tailwind CSS**: Utility-first styling with responsive design
- **Authentication Flow**: Complete login/signup/password reset pages
- **Dashboard Layout**: Sidebar navigation with multiple sections
- **Supabase Integration**: Client-side authentication and data fetching

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
GET    /                     # API information
GET    /health               # Basic health check
GET    /health/detailed      # Detailed health with dependencies
GET    /health/protected     # Protected endpoint example
POST   /auth/register        # User registration
POST   /auth/login           # User authentication
POST   /auth/refresh         # Token refresh
POST   /auth/logout          # User logout
GET    /auth/me              # Current user profile
GET    /docs                 # OpenAPI documentation (dev)
GET    /graphql              # GraphQL endpoint
```

**Authentication Features**:

- JWT token generation and validation
- Refresh token mechanism (30-day lifetime)
- Redis-based session management
- Token blacklisting for secure logout
- Role-based access control
- Supabase Auth integration

### 🗄️ **Database Infrastructure**

**Primary Database**: Supabase PostgreSQL  
**Session Storage**: Redis  
**Migration System**: Hybrid Alembic + Supabase MCP

**Database Schema**:

- **Users Table**: Extended Supabase auth.users with profile data
- **Spaces Table**: Workspace organization with RLS policies
- **Documents Table**: File metadata and processing status
- **Queries Table**: AI interaction history and results
- **User Preferences**: Customizable user settings

**Security Features**:

- Row Level Security (RLS) policies on all tables
- User-scoped data access patterns
- Service role for admin operations
- Automated user profile creation on signup

### 🔐 **Authentication & Security**

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

- Reusable React components
- Design system primitives
- Consistent styling utilities
- Component documentation ready

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

**CI/CD Ready**:

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
