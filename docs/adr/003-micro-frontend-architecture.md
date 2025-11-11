# ADR-003: Micro Frontend Architecture for Olympus Dashboard

**Status**: Proposed
**Date**: 2025-11-10
**Authors**: Engineering Team
**Story Points**: 20+ (requires breakdown by implementation phase)

---

## Executive Summary

This ADR evaluates micro frontend architecture patterns for the Olympus dashboard to support independent development and deployment of application modules (Threads, Projects, Notebook, Settings, etc.). We analyze:

1. **Monorepo Tools**: Nx vs Turborepo for workspace management
2. **CI/CD Platforms**: GitHub Actions vs GitLab CI for build/deploy pipelines
3. **Infrastructure**: Terraform, Kubernetes, Docker, Istio for cloud deployment
4. **Integration Patterns**: Module Federation, build-time vs runtime composition

**Recommendation**: Adopt **Turborepo + GitHub Actions + Vercel/AWS** for Phase 1 (MVP), with a migration path to **Nx + Kubernetes + Istio** for Phase 2+ (enterprise scale).

---

## Context

### Current Architecture

- **Monorepo**: Turborepo with Next.js 14 frontend (`apps/web`), FastAPI backend (`apps/api`)
- **Deployment**: Local Docker (development), Vercel planned (frontend), Render/Fly.io planned (backend)
- **State Management**: React Query (server state) + Zustand (client state)
- **Design System**: shadcn/ui (`@olympus/ui`) with Hex aesthetic

### Problem Statement

As Olympus grows, we need:

1. **Independent deployment** of dashboard apps (Threads, Projects, Notebook) without full redeploys
2. **Team autonomy** for parallel feature development across apps
3. **Shared resources** (design system, auth, state) without duplication
4. **Scalability** to handle 10+ micro frontends in production
5. **Developer experience** that doesn't sacrifice speed for complexity

### Constraints

- Must work with existing Next.js 14 + React 18 stack
- Must preserve Tailwind CSS + shadcn/ui design system
- Must support React Query + Zustand state management
- Must integrate with FastAPI GraphQL backend
- Team size: 2-5 developers (growing to 10+)
- Budget: Optimize for free/low-cost tools initially

---

## Decision

### Phase 1 (MVP): Turborepo + GitHub Actions + Vercel

**Why**: Faster setup, lower complexity, tight Next.js integration, cost-effective for small teams.

**Architecture**:

```
apps/
├── web/                      # Main shell app (Next.js 14)
├── threads/                  # Threads micro app (Next.js 14)
├── projects/                 # Projects micro app (Next.js 14)
├── notebook/                 # Notebook micro app (Next.js 14)
└── api/                      # FastAPI backend

packages/
├── ui/                       # shadcn/ui components (@olympus/ui)
├── shared-state/             # React Query + Zustand stores
├── auth/                     # Authentication logic
└── types/                    # Shared TypeScript types
```

**Integration**: Build-time composition via Next.js App Router (`app/(threads)`, `app/(projects)`, etc.)

### Phase 2+ (Enterprise): Nx + Kubernetes + Istio

**Why**: Superior performance (7x faster than Turborepo in large monorepos), distributed task execution, advanced caching, module boundaries enforcement.

**Architecture**: Module Federation (runtime composition) with independent deployments to Kubernetes pods behind Istio service mesh.

---

## Comparative Analysis

### 1. Monorepo Tools: Nx vs Turborepo

| **Criteria**                  | **Turborepo**            | **Nx**                            | **Winner**                    |
| ----------------------------- | ------------------------ | --------------------------------- | ----------------------------- |
| **Setup Time**                | ⚡️ 15-30 min            | 🐢 1-2 hours                      | Turborepo                     |
| **Build Speed (small repos)** | Fast                     | Fast                              | Tie                           |
| **Build Speed (large repos)** | Baseline                 | **7x faster**                     | Nx                            |
| **Caching**                   | Local + remote           | Local + remote + distributed      | Nx                            |
| **Next.js Support**           | Excellent (Vercel-owned) | Good (lags ~1-2 versions)         | Turborepo                     |
| **Code Generation**           | Basic                    | Advanced (components, libs, apps) | Nx                            |
| **Dependency Graph**          | Basic                    | Visual + interactive              | Nx                            |
| **Module Boundaries**         | ❌ None                  | ✅ Enforced via linting           | Nx                            |
| **Community**                 | Growing (Vercel-backed)  | Mature (since 2017)               | Nx                            |
| **Documentation**             | Concise, JS-focused      | Comprehensive, enterprise-focused | Turborepo (ease) / Nx (depth) |
| **Cost**                      | Free                     | Free (OSS), paid (Nx Cloud)       | Tie                           |
| **Team Size Fit**             | 2-10 devs                | 10-100+ devs                      | Context-dependent             |

**Turborepo Strengths**:

- Fastest setup for JavaScript/TypeScript projects
- Tight integration with Vercel deployment
- Lightweight, focused documentation
- Ideal for teams migrating from single-repo setups

**Nx Strengths**:

- Distributed task execution (not just caching)
- Enforced module boundaries prevent circular dependencies
- Advanced code generation (components, libraries, apps)
- Better for long-term enterprise scalability

**Recommendation**:

- **Phase 1 (MVP)**: Turborepo (faster time-to-market, team familiarity)
- **Phase 2+**: Migrate to Nx when repo reaches 10+ apps or team hits 10+ devs

---

### 2. CI/CD: GitHub Actions vs GitLab CI

| **Criteria**                | **GitHub Actions**                                       | **GitLab CI**                                      | **Winner**                                      |
| --------------------------- | -------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------- |
| **Monorepo Path Filtering** | ✅ `on.push.paths`                                       | ✅ `rules:changes`                                 | Tie                                             |
| **Conditional Includes**    | ❌ Limited                                               | ✅ Advanced (parent-child pipelines)               | GitLab CI                                       |
| **Marketplace**             | 🌟 Massive (10K+ actions)                                | Limited                                            | GitHub Actions                                  |
| **Parallelization**         | Matrix builds                                            | Parent-child pipelines                             | GitLab CI                                       |
| **OS Support**              | Linux, macOS, Windows                                    | Linux (macOS/Windows via shared runners)           | GitHub Actions                                  |
| **Self-Hosted Runners**     | ✅ Yes                                                   | ✅ Yes                                             | Tie                                             |
| **Secrets Management**      | GitHub Secrets                                           | GitLab CI Variables                                | Tie                                             |
| **Integration**             | GitHub-native                                            | GitLab-native                                      | Context-dependent                               |
| **Cost**                    | 2,000 free min/month (public), 3,000 min/month (private) | 400 free min/month (SaaS), unlimited (self-hosted) | GitHub Actions (SaaS) / GitLab CI (self-hosted) |
| **Learning Curve**          | Low (YAML)                                               | Moderate (YAML + advanced features)                | GitHub Actions                                  |

**GitHub Actions Strengths**:

- Extensive marketplace for ready-made actions (Vercel deploy, Docker build, etc.)
- Native integration with GitHub (PRs, issues, code scanning)
- Simpler syntax for straightforward workflows

**GitLab CI Strengths**:

- Parent-child pipelines ideal for monorepo scalability
- Content-based caching superior to GitHub's
- Better for complex, multi-stage deployments

**Recommendation**:

- **GitHub Actions** (current choice): Leverages existing GitHub repo, marketplace ecosystem
- **GitLab CI**: Consider if migrating to GitLab or need advanced pipeline features

---

### 3. Infrastructure: Terraform + Kubernetes + Docker + Istio

#### Terraform (Infrastructure as Code)

**Use Cases**:

- Provisioning AWS resources (S3, CloudFront, ECS, Lambda)
- Managing Vercel projects programmatically
- Automating infrastructure changes via CI/CD

**Key Benefits**:

- Declarative infrastructure (version-controlled)
- Multi-cloud support (AWS, GCP, Azure, Vercel)
- State management for drift detection

**Recommended Modules**:

- **AWS Next.js**: `terraform-aws-next-js` (Serverless Lambda + S3 + CloudFront)
- **Vercel Provider**: Official Terraform provider for Vercel projects
- **ECS Fargate**: Containerized Next.js deployments on AWS ECS

**Example (AWS Serverless Next.js)**:

```hcl
module "nextjs" {
  source  = "milliHQ/next-js/aws"
  version = "~> 1.0"

  deployment_name = "olympus-threads"
  domain_name     = "threads.olympus.ai"

  # OpenNext integration
  build_dir = "${path.module}/../apps/threads/.open-next"
}
```

**Story Points**:

- AWS setup: 5 points (~6-10 hours)
- Vercel setup: 2 points (~3-4 hours)
- Multi-environment config: 3 points (~4-6 hours)

---

#### Kubernetes + Docker + Istio (Container Orchestration + Service Mesh)

**Use Cases**:

- Phase 2+ when micro frontends need independent scaling
- Multi-region deployments with traffic routing
- Advanced observability (distributed tracing, metrics)

**Architecture**:

```
[User] → [Istio Ingress Gateway]
            ↓
    [Envoy Sidecar Proxy]
            ↓
    ┌─────────────────────────┐
    │   Kubernetes Cluster    │
    ├─────────────────────────┤
    │ Pod: threads-app        │ → Docker (Next.js)
    │ Pod: projects-app       │ → Docker (Next.js)
    │ Pod: notebook-app       │ → Docker (Next.js)
    │ Pod: api-service        │ → Docker (FastAPI)
    └─────────────────────────┘
            ↑
    [Istio Service Mesh]
    - Traffic management (A/B tests, canary)
    - Security (mTLS, JWT auth)
    - Observability (Jaeger, Prometheus)
```

**Key Benefits**:

- **Docker**: Consistent deployments across dev/staging/prod
- **Kubernetes**: Auto-scaling, self-healing, rolling updates
- **Istio**:
  - Traffic routing (canary deployments, A/B tests)
  - Security (mutual TLS, JWT validation)
  - Observability (Jaeger tracing, Prometheus metrics)
  - Offloads networking logic from application code

**Istio Highlights (2025)**:

- Lightweight Envoy sidecar proxies (transparent to apps)
- Support for Blue-Green and Canary deployments
- Integration with AWS EKS, GCP GKE, Azure AKS

**Story Points**:

- Kubernetes setup: 13 points (~15-20 hours)
- Istio integration: 8 points (~10-15 hours)
- CI/CD pipeline: 5 points (~6-10 hours)
- **Total**: 26 points (should break into sub-tasks)

**Recommendation**:

- **Phase 1**: Skip Kubernetes/Istio (over-engineering for MVP)
- **Phase 2+**: Adopt when traffic exceeds 100K MAU or team reaches 10+ devs

---

## Micro Frontend Integration Patterns

### Option A: Build-Time Composition (Phase 1 - Recommended)

**How it works**: All micro apps compile into a single Next.js build, using App Router groups.

**Folder Structure**:

```
apps/web/app/
├── (marketing)/
│   ├── layout.tsx           # Public marketing layout
│   └── page.tsx             # Home page
├── (dashboard)/
│   ├── layout.tsx           # Dashboard shell (nav, auth)
│   ├── (threads)/
│   │   ├── threads/
│   │   │   └── page.tsx     # /threads
│   │   └── threads/[id]/
│   │       └── page.tsx     # /threads/[id]
│   ├── (projects)/
│   │   └── projects/
│   │       └── page.tsx     # /projects
│   └── (notebook)/
│       └── notebook/
│           └── page.tsx     # /notebook
└── api/                     # API routes
```

**Shared Dependencies**:

```typescript
// packages/shared-state/src/queries/useThreads.ts
export function useThreads() {
  return useQuery({
    queryKey: ['threads'],
    queryFn: async () => {
      const { threads } = await graphQLClient.request(THREADS_QUERY);
      return threads;
    },
  });
}

// apps/web/app/(dashboard)/(threads)/threads/page.tsx
import { useThreads } from '@olympus/shared-state';

export default function ThreadsPage() {
  const { data: threads } = useThreads(); // Shared React Query hook
  // ...
}
```

**Pros**:

- ✅ Simple setup (no Module Federation complexity)
- ✅ Shared React Query cache across all apps
- ✅ Single deployment (fast iteration)
- ✅ TypeScript works seamlessly

**Cons**:

- ❌ Monolithic deploys (full rebuild for any change)
- ❌ Shared runtime (one app crash affects all)
- ❌ Limited team autonomy

**Story Points**: 3-5 points (~4-10 hours setup)

---

### Option B: Runtime Composition - Module Federation (Phase 2+)

**How it works**: Each micro app builds independently, loads at runtime via Webpack Module Federation.

**Folder Structure**:

```
apps/
├── shell/                   # Host app (navigation, auth)
│   ├── next.config.js       # Module Federation host
│   └── webpack.config.js
├── threads/                 # Remote app
│   ├── next.config.js       # Module Federation remote config
│   └── webpack.config.js
├── projects/                # Remote app
└── notebook/                # Remote app

packages/
├── ui/                      # Shared components
└── shared-state/            # Shared state (careful with singletons!)
```

**Module Federation Config (Webpack 5)**:

```javascript
// apps/shell/next.config.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new ModuleFederationPlugin({
          name: 'shell',
          remotes: {
            threads: 'threads@http://localhost:3001/remoteEntry.js',
            projects: 'projects@http://localhost:3002/remoteEntry.js',
          },
          shared: {
            react: { singleton: true, eager: true },
            'react-dom': { singleton: true, eager: true },
            '@tanstack/react-query': { singleton: true },
          },
        })
      );
    }
    return config;
  },
};
```

**Pros**:

- ✅ Independent deployments (deploy Threads without touching Projects)
- ✅ Team autonomy (separate repos or monorepo sub-apps)
- ✅ Runtime composition (dynamic loading)
- ✅ Failure isolation (one app crash doesn't affect others)

**Cons**:

- ❌ Complex setup (Webpack config, versioning)
- ❌ Shared state challenges (React Query, Zustand singletons)
- ❌ TypeScript challenges (remote types not auto-imported)
- ❌ Next.js SSR complications (Module Federation client-only by default)

**Story Points**: 13+ points (~15-20 hours setup + debugging)

**Recommendation**: Only adopt if team size >10 devs or deploy frequency >5x/day per app.

---

### Option C: Hybrid Approach (Recommended for Phase 1 → 2 Transition)

**Strategy**: Start with build-time composition, migrate to Module Federation incrementally.

**Phase 1 (Now)**:

- Build-time composition via Next.js App Router groups
- Shared `@olympus/ui`, `@olympus/shared-state` packages
- Single Vercel deployment

**Phase 2 (When team hits 10+ devs)**:

- Extract Threads to standalone Module Federation remote
- Keep Projects, Notebook in main build initially
- Shell app (`apps/shell`) hosts navigation + auth

**Phase 3 (When traffic hits 100K MAU)**:

- All apps as Module Federation remotes
- Kubernetes + Istio for traffic routing
- Independent scaling per app

**Migration Path**:

```
[Phase 1: Monolith]
  apps/web (all features)
       ↓
[Phase 2: Hybrid]
  apps/shell (host)
  apps/threads (remote)
  apps/web (projects + notebook still bundled)
       ↓
[Phase 3: Full Micro Frontends]
  apps/shell (host)
  apps/threads (remote)
  apps/projects (remote)
  apps/notebook (remote)
```

---

## Proposed Folder Structure (Phase 1)

```
olympus/
├── apps/
│   ├── web/                            # Main Next.js app (shell + all features for now)
│   │   ├── app/
│   │   │   ├── (marketing)/           # Public routes
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── (dashboard)/           # Authenticated routes
│   │   │   │   ├── layout.tsx         # Sidebar, nav, auth check
│   │   │   │   ├── (threads)/         # Route group
│   │   │   │   │   ├── threads/
│   │   │   │   │   │   ├── page.tsx           # /threads
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       └── page.tsx       # /threads/[id]
│   │   │   │   │   └── components/
│   │   │   │   │       ├── ThreadsList.tsx
│   │   │   │   │       └── ThreadsChat.tsx
│   │   │   │   ├── (projects)/        # Route group
│   │   │   │   │   ├── projects/
│   │   │   │   │   │   ├── page.tsx           # /projects
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       └── page.tsx       # /projects/[id]
│   │   │   │   │   └── components/
│   │   │   │   │       └── ProjectsBoard.tsx
│   │   │   │   ├── (notebook)/        # Route group
│   │   │   │   │   ├── notebook/
│   │   │   │   │   │   ├── page.tsx           # /notebook
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       └── page.tsx       # /notebook/[id]
│   │   │   │   │   └── components/
│   │   │   │   │       ├── NotebookCell.tsx
│   │   │   │   │       └── NotebookToolbar.tsx
│   │   │   │   └── (settings)/        # Route group
│   │   │   │       ├── settings/
│   │   │   │       │   ├── page.tsx           # /settings
│   │   │   │       │   ├── profile/
│   │   │   │       │   │   └── page.tsx       # /settings/profile
│   │   │   │       │   └── organization/
│   │   │   │       │       └── page.tsx       # /settings/organization
│   │   │   │       └── components/
│   │   │   │           └── SettingsNav.tsx
│   │   │   └── api/                   # API routes (auth, webhooks)
│   │   ├── components/
│   │   │   ├── layout/                # App-level layouts
│   │   │   │   ├── AppSidebar.tsx
│   │   │   │   ├── NavItem.tsx
│   │   │   │   └── DashboardShell.tsx
│   │   │   └── shared/                # Shared feature components
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   │   ├── graphql-client.ts
│   │   │   │   └── generated.ts       # GraphQL Codegen types
│   │   │   └── stores/
│   │   │       ├── auth-store.ts      # Zustand auth
│   │   │       └── ui-store.ts        # Zustand UI state
│   │   └── next.config.js
│   │
│   └── api/                            # FastAPI backend (unchanged)
│       ├── app/
│       └── docker-compose.yml
│
├── packages/
│   ├── ui/                             # Design system (@olympus/ui)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   └── badge.tsx
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── shared-state/                   # Shared React Query hooks (@olympus/shared-state)
│   │   ├── src/
│   │   │   ├── queries/
│   │   │   │   ├── useThreads.ts
│   │   │   │   ├── useProjects.ts
│   │   │   │   └── useDocuments.ts
│   │   │   ├── mutations/
│   │   │   │   ├── useCreateThread.ts
│   │   │   │   └── useUploadDocument.ts
│   │   │   ├── query-client.ts        # React Query client config
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── auth/                           # Authentication logic (@olympus/auth)
│   │   ├── src/
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useSession.ts
│   │   │   ├── utils/
│   │   │   │   ├── jwt.ts
│   │   │   │   └── permissions.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── types/                          # Shared TypeScript types (@olympus/types)
│   │   ├── src/
│   │   │   ├── api.ts
│   │   │   ├── domain.ts
│   │   │   └── ui.ts
│   │   └── package.json
│   │
│   └── config/                         # ESLint, Prettier, TS configs
│       ├── eslint-config/
│       └── typescript-config/
│
├── docs/
│   ├── adr/
│   │   └── 003-micro-frontend-architecture.md  # This document
│   └── guides/
│
├── turbo.json                          # Turborepo config
└── package.json                        # Root workspace config
```

### Key Principles

1. **Feature Colocation**: Each route group (`(threads)`, `(projects)`) contains its own components
2. **Shared Packages**: Common logic extracted to `@olympus/ui`, `@olympus/shared-state`, `@olympus/auth`
3. **Lazy Loading**: Next.js automatically code-splits each route group
4. **Future-Proof**: Easy to extract route groups to Module Federation remotes later

---

## Proposed Folder Structure (Phase 2+ - Module Federation)

```
olympus/
├── apps/
│   ├── shell/                          # Host app (navigation, auth, layout)
│   │   ├── app/
│   │   │   ├── layout.tsx              # Root layout (auth, providers)
│   │   │   ├── page.tsx                # Landing page
│   │   │   └── (dashboard)/
│   │   │       ├── layout.tsx          # Dashboard shell (sidebar, nav)
│   │   │       ├── threads/
│   │   │       │   └── page.tsx        # Loads remote 'threads' app
│   │   │       ├── projects/
│   │   │       │   └── page.tsx        # Loads remote 'projects' app
│   │   │       └── notebook/
│   │   │           └── page.tsx        # Loads remote 'notebook' app
│   │   ├── next.config.js              # Module Federation host config
│   │   └── webpack.config.js
│   │
│   ├── threads/                        # Remote app (Threads feature)
│   │   ├── src/
│   │   │   ├── App.tsx                 # Exposed component
│   │   │   ├── pages/
│   │   │   │   ├── ThreadsList.tsx
│   │   │   │   └── ThreadsDetail.tsx
│   │   │   └── components/
│   │   │       └── ThreadsChat.tsx
│   │   ├── next.config.js              # Module Federation remote config
│   │   └── package.json
│   │
│   ├── projects/                       # Remote app (Projects feature)
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── pages/
│   │   │   └── components/
│   │   ├── next.config.js
│   │   └── package.json
│   │
│   ├── notebook/                       # Remote app (Notebook feature)
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── pages/
│   │   │   └── components/
│   │   ├── next.config.js
│   │   └── package.json
│   │
│   └── api/                            # FastAPI backend (unchanged)
│
├── packages/
│   ├── ui/                             # Shared design system
│   ├── shared-state/                   # React Query + Zustand (singleton!)
│   ├── auth/                           # Authentication
│   └── types/                          # TypeScript types
│
└── nx.json                             # Nx config (replaces turbo.json)
```

### Module Federation Configuration

**Host App (apps/shell/next.config.js)**:

```javascript
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new ModuleFederationPlugin({
          name: 'shell',
          remotes: {
            threads: `threads@${process.env.THREADS_URL}/remoteEntry.js`,
            projects: `projects@${process.env.PROJECTS_URL}/remoteEntry.js`,
            notebook: `notebook@${process.env.NOTEBOOK_URL}/remoteEntry.js`,
          },
          shared: {
            react: { singleton: true, eager: true, requiredVersion: '^18.0.0' },
            'react-dom': { singleton: true, eager: true },
            '@tanstack/react-query': { singleton: true },
            '@olympus/ui': { singleton: true },
            '@olympus/shared-state': { singleton: true },
          },
        })
      );
    }
    return config;
  },
};
```

**Remote App (apps/threads/next.config.js)**:

```javascript
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new ModuleFederationPlugin({
          name: 'threads',
          filename: 'remoteEntry.js',
          exposes: {
            './Threads': './src/App',
          },
          shared: {
            react: { singleton: true, eager: true },
            'react-dom': { singleton: true, eager: true },
            '@tanstack/react-query': { singleton: true },
            '@olympus/ui': { singleton: true },
          },
        })
      );
    }
    return config;
  },
};
```

---

## Implementation Roadmap

### Phase 1: MVP (Current → 3 months) - 20 points

**Goal**: Ship Threads, Projects, Notebook with build-time composition.

**Tasks**:

1. Refactor `apps/web` to use Next.js route groups (`(threads)`, `(projects)`, `(notebook)`) - 5 points
2. Extract shared state to `@olympus/shared-state` package - 3 points
3. Extract auth logic to `@olympus/auth` package - 3 points
4. Set up GitHub Actions CI/CD for monorepo path filtering - 3 points
5. Deploy to Vercel (frontend) + Render/Fly.io (backend) - 3 points
6. Document component development guidelines - 3 points

**Success Metrics**:

- Build time <5 minutes
- Deploy time <10 minutes
- Zero shared state bugs

---

### Phase 2: Module Federation (6-12 months) - 26 points (break down)

**Goal**: Extract Threads to independent remote, prepare for full micro frontends.

**Tasks**:

1. Migrate to Nx (from Turborepo) - 5 points
2. Extract Threads to `apps/threads` remote - 8 points
3. Set up Module Federation with shell app - 8 points
4. Implement shared state singleton patterns - 5 points

**Success Metrics**:

- Threads deploys independently without shell redeploy
- Shared React Query cache works across remotes
- TypeScript types auto-sync between shell and remotes

---

### Phase 3: Kubernetes + Istio (12-18 months) - 26 points (break down)

**Goal**: Scale to 100K MAU with independent scaling per app.

**Tasks**:

1. Containerize all apps with Docker - 5 points
2. Set up Kubernetes cluster (AWS EKS or GCP GKE) - 8 points
3. Deploy Istio service mesh - 8 points
4. Implement canary deployments - 5 points

**Success Metrics**:

- 99.9% uptime
- <200ms p95 latency for all apps
- Independent scaling (Threads scales to 10 pods, Projects at 2 pods)

---

## Reference Links

### Monorepo Tools

- [Nx vs Turborepo Comparison (2025)](https://www.nextbuild.co/blog/choosing-the-right-monorepo-tool-between-turborepo-and-nx)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Nx Documentation](https://nx.dev/)
- [Nx Performance Benchmarks](https://github.com/vsavkin/large-monorepo)
- [Top 5 Monorepo Tools for 2025](https://www.aviator.co/blog/monorepo-tools/)

### CI/CD

- [GitHub Actions vs GitLab CI for Monorepos](https://mkabumattar.com/blog/post/github-actions-vs-gitlab-ci-for-monorepos/)
- [Setting up CI for Microservices in Monorepo using GitHub Actions](https://dev.to/stackdumper/setting-up-ci-for-microservices-in-monorepo-using-github-actions-5do2)
- [GitLab CI vs GitHub Actions: Complete Comparison 2025](https://www.bytebase.com/blog/gitlab-ci-vs-github-actions/)

### Infrastructure

- [Terraform AWS Next.js Module](https://github.com/milliHQ/terraform-aws-next-js)
- [Deploying Next.js with Terraform and AWS](https://medium.com/@bzbikowski/deploying-a-next-js-portfolio-with-terraform-and-aws-51c7731f3b58)
- [Terraform Vercel Integration Guide](https://vercel.com/guides/integrating-terraform-with-vercel)
- [Master ECS Deployments: Next.js with Terraform and GitHub Actions](https://medium.com/@AkramSouida/master-ecs-deployments-node-js-next-js-fullstack-app-with-terraform-and-github-actions-23cd20595109)

### Kubernetes + Istio

- [Exploring Istio: Service Mesh in Kubernetes (2025)](https://medium.com/@blogs4devs/exploring-istio-the-power-of-service-mesh-in-kubernetes-f8d6c8465c04)
- [Service Mesh in Kubernetes: Using Istio on Amazon EKS](https://www.cloudkeeper.com/insights/blog/service-mesh-kubernetes-using-istio-amazon-eks)
- [Google Microservices Demo (Istio + Kubernetes)](https://github.com/GoogleCloudPlatform/microservices-demo)
- [Simplifying Microservices with Istio in GKE](https://medium.com/google-cloud/simplifying-microservices-with-istio-in-google-kubernetes-engine-part-i-849555f922b8)

### Micro Frontends

- [Webpack Module Federation Documentation](https://webpack.js.org/concepts/module-federation/)
- [Next.js Module Federation Example (Community)](https://github.com/module-federation/module-federation-examples/tree/master/nextjs)
- [Micro Frontend Architecture Patterns](https://martinfowler.com/articles/micro-frontends.html)

---

## Decision Rationale

### Why Turborepo for Phase 1?

- **Faster setup**: Team already familiar with Turborepo (current setup)
- **Vercel integration**: Tight coupling with deployment platform
- **Lower complexity**: No module boundaries enforcement needed yet (team <10 devs)
- **Cost**: Free tier sufficient for MVP

### Why GitHub Actions?

- **Existing repo**: Already on GitHub, no migration needed
- **Marketplace**: 10K+ actions for Vercel, Docker, AWS deployments
- **Cost**: 3,000 free minutes/month sufficient for MVP

### Why Defer Kubernetes/Istio?

- **Over-engineering**: MVP doesn't need independent scaling (traffic <10K MAU)
- **Team size**: 2-5 devs don't need complex deployment pipelines yet
- **Cost**: Kubernetes cluster + Istio ~$500-1000/month (vs Vercel ~$100/month)

### Why Build-Time Composition First?

- **Simplicity**: No Module Federation complexity (Webpack config, shared singletons)
- **TypeScript**: Seamless type checking across all apps
- **Shared state**: React Query cache works naturally (no cross-app communication issues)
- **Iteration speed**: Single deploy, fast feedback loop

---

## Success Metrics

### Phase 1 (MVP)

- ✅ All features ship in single Next.js app
- ✅ Build time <5 minutes
- ✅ Deploy time <10 minutes
- ✅ Zero shared state bugs (React Query + Zustand)

### Phase 2 (Module Federation)

- ✅ Threads deploys independently
- ✅ Shared React Query cache works
- ✅ TypeScript types auto-sync
- ✅ <5% increase in bundle size

### Phase 3 (Kubernetes/Istio)

- ✅ 99.9% uptime
- ✅ <200ms p95 latency
- ✅ Independent scaling per app
- ✅ Canary deployments with <1% rollback rate

---

## Alternatives Considered

### 1. Monolithic Next.js (Current State)

**Pros**: Simplest, fastest iteration
**Cons**: Doesn't scale to 10+ devs, monolithic deploys
**Verdict**: Good for MVP, but doesn't solve long-term goals

### 2. Separate Repos (Multi-Repo)

**Pros**: Maximum team autonomy
**Cons**: Shared code duplication, versioning hell, complex CI/CD
**Verdict**: Rejected (monorepo better for shared design system)

### 3. iFrame-Based Composition

**Pros**: True isolation
**Cons**: No shared state, SEO issues, poor UX (separate scrollbars)
**Verdict**: Rejected (not suitable for dashboard apps)

### 4. Server-Side Composition (Edge Functions)

**Pros**: SSR-friendly
**Cons**: High latency, complex caching, limited framework support
**Verdict**: Interesting for Phase 3+, but premature

---

## Open Questions

1. **Module Federation SSR**: How do we handle server-side rendering with Module Federation? (Next.js 14 complicates this)
2. **Shared State Versioning**: What if `@olympus/shared-state` version differs between shell and remotes?
3. **TypeScript Sync**: How do we auto-sync types between remotes and shell? (e.g., `dts-loader`)
4. **Deployment URLs**: How do we manage dynamic remote URLs (dev, staging, prod)?
5. **Cost Model**: What's the breakeven point for Kubernetes vs Vercel (traffic/team size)?

---

## Appendix: Cost Analysis

### Phase 1: Turborepo + GitHub Actions + Vercel

| **Service**      | **Cost (Monthly)**  | **Notes**                    |
| ---------------- | ------------------- | ---------------------------- |
| GitHub Actions   | $0 (3,000 min free) | Sufficient for MVP           |
| Vercel (Hobby)   | $0                  | Limited to personal projects |
| Vercel (Pro)     | $20                 | Required for team            |
| Render (Starter) | $7                  | FastAPI backend              |
| **Total**        | **$27/month**       | MVP budget                   |

### Phase 3: Kubernetes + Istio + AWS

| **Service**                  | **Cost (Monthly)** | **Notes**        |
| ---------------------------- | ------------------ | ---------------- |
| AWS EKS Cluster              | $73                | Control plane    |
| EC2 Instances (3x t3.medium) | $100               | Worker nodes     |
| Load Balancer                | $20                | Ingress          |
| Istio (self-managed)         | $0                 | Open source      |
| CloudFront                   | $10                | CDN              |
| S3                           | $5                 | Static assets    |
| **Total**                    | **$208/month**     | Enterprise scale |

**Breakeven**: ~50K MAU (Vercel costs scale with bandwidth, Kubernetes is flat)

---

## Appendix: Team Recommendations by Size

| **Team Size** | **Monorepo Tool** | **Deployment**     | **Composition**      |
| ------------- | ----------------- | ------------------ | -------------------- |
| 2-5 devs      | Turborepo         | Vercel             | Build-time           |
| 5-10 devs     | Turborepo or Nx   | Vercel             | Build-time or hybrid |
| 10-20 devs    | Nx                | Kubernetes + Istio | Module Federation    |
| 20+ devs      | Nx                | Kubernetes + Istio | Module Federation    |

---

## Contributors

- Engineering Team (2025-11-10)
- Research sources: Nx, Turborepo, GitHub Actions, GitLab CI, Terraform, Kubernetes, Istio documentation

---

## Change Log

| **Date**   | **Change**    | **Author**       |
| ---------- | ------------- | ---------------- |
| 2025-11-10 | Initial draft | Engineering Team |
