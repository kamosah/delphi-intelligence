# Olympus MVP - Turborepo Monorepo

A modern full-stack monorepo setup with Turborepo, Next.js frontend, FastAPI backend, and shared packages.

## 🏗️ Project Structure

```
olympus-mvp/
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

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Docker and Docker Compose (for local database)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd olympus-mvp
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start local services**

   ```bash
   docker-compose up -d
   ```

   This starts PostgreSQL and Redis containers for local development.

4. **Copy environment files**

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   cp apps/api/.env.example apps/api/.env
   ```

5. **Run development servers**
   ```bash
   npm run dev
   ```

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

## 🏃‍♂️ Workspace Details

### Apps

#### `/apps/web` - Next.js Frontend

- **Status**: Not initialized yet
- **Next Steps**: Run `npx create-next-app@latest` in this directory
- **Port**: 3000 (default)

#### `/apps/api` - FastAPI Backend

- **Status**: Not initialized yet
- **Next Steps**: Initialize FastAPI project structure
- **Port**: 8000 (default)

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

## 🐳 Docker Services

The `docker-compose.yml` provides local development services:

### PostgreSQL

- **Host**: localhost:5432
- **Database**: olympus_mvp
- **User**: olympus
- **Password**: olympus_dev

### Redis

- **Host**: localhost:6379
- **No authentication** (development only)

### Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Reset data (⚠️ destroys all data)
docker-compose down -v
```

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

## 🚀 Next Steps

After completing this setup, you can proceed with:

1. **Initialize Next.js app** (LOG-56)
2. **Initialize FastAPI app**
3. **Setup Supabase** (LOG-45)
4. **Configure CI/CD pipelines**

## 🤝 Contributing

1. Make sure your code is formatted: `npm run format`
2. Ensure all tests pass: `npm run test`
3. Verify builds work: `npm run build`

## 📝 Notes

- All packages use `@olympus/*` naming convention
- Private packages are marked as `"private": true`
- Node.js 20+ and npm 10+ are required
- Docker is required for local database services

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
