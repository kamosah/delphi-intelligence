# Olympus Web - Next.js Frontend

Frontend application for Olympus - AI-powered document intelligence platform.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn-ui (built on Radix UI)
- **State Management**: React Query (server state) + Zustand (client state)
- **Data Fetching**: GraphQL (via graphql-request)
- **Authentication**: Supabase SSR
- **Forms**: React Hook Form + Zod validation
- **Component Development**: Storybook

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Backend API running (see `apps/api/README.md`)

## Getting Started

### Install Dependencies

From the **project root**:

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure the required variables:

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

### Development Server

From **project root**:

```bash
npm run dev
```

Or from **apps/web**:

```bash
cd apps/web
npm run dev
```

Visit http://localhost:3000

### Build for Production

```bash
npm run build
```

### Storybook (Component Development)

```bash
npm run storybook
```

Visit http://localhost:6006

---

## Deployment to Vercel

Vercel has **native Turborepo support** and will automatically detect the monorepo structure.

### Step 1: Import GitHub Repository

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select `kamosah/olympus`
4. Click "Import"

### Step 2: Configure Project Settings

Vercel will auto-detect Next.js, but configure these settings:

#### Framework Preset

- **Framework**: Next.js
- **Root Directory**: `apps/web` ⚠️ **IMPORTANT**

#### Build & Development Settings

- **Build Command**: Leave empty (Vercel auto-detects with Turborepo)
- **Output Directory**: Leave empty (auto-detects `.next`)
- **Install Command**: Leave empty (auto-detects `npm install`)
- **Development Command**: Leave empty (auto-detects)

**Why leave these empty?**

- Vercel's Turborepo integration automatically runs:
  - `turbo run build --filter=@olympus/web` for builds
  - Proper caching and dependency management
  - Optimized for monorepo structure

#### Node.js Version

- **Node.js Version**: 20.x (recommended)

### Step 3: Environment Variables

Add the following in "Environment Variables" section:

#### Production Variables

```bash
# Backend API (update with your Render URL after backend deployment)
NEXT_PUBLIC_API_URL=https://olympus-api.onrender.com

# Supabase (from your production Supabase project)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# NextAuth (generate random secret)
NEXTAUTH_SECRET=<generate-with-openssl-rand-hex-32>
NEXTAUTH_URL=https://olympus-demo.vercel.app
```

#### Generate Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -hex 32
```

**Important Notes:**

- `NEXT_PUBLIC_*` variables are exposed to the browser (safe for public keys)
- `NEXTAUTH_SECRET` must be kept private
- Update `NEXT_PUBLIC_API_URL` with your actual backend URL
- Update `NEXTAUTH_URL` with your actual Vercel URL (after first deployment)

### Step 4: Deploy

1. Click "Deploy"
2. Wait 2-5 minutes for build to complete
3. Vercel will provide a preview URL: `https://olympus-xxxxx.vercel.app`

### Step 5: Update Backend CORS

After deployment, update backend `CORS_ORIGINS` to include Vercel URL:

```bash
# In Render dashboard, update environment variable:
CORS_ORIGINS=["https://olympus-demo.vercel.app"]
```

Restart backend service for changes to take effect.

### Step 6: Update Frontend API URL (if needed)

If backend URL changed, update Vercel environment variable:

1. Go to Vercel project → Settings → Environment Variables
2. Update `NEXT_PUBLIC_API_URL` with new backend URL
3. Redeploy: Vercel → Deployments → Three dots → Redeploy

---

## Vercel Configuration (Advanced)

### Custom Domain

1. Go to Vercel project → Settings → Domains
2. Add your custom domain (e.g., `app.olympus.com`)
3. Configure DNS records as instructed
4. Update `NEXTAUTH_URL` environment variable
5. Update backend `CORS_ORIGINS`

### Preview Deployments

Vercel automatically creates preview deployments for:

- Pull requests
- Non-production branches (if enabled)

Preview URLs: `https://olympus-git-[branch]-[team].vercel.app`

### Production Branch

By default, Vercel deploys from `main` branch to production.

To deploy from a different branch:

1. Go to Settings → Git
2. Change "Production Branch" to desired branch

---

## Troubleshooting

### Build Fails: "Module not found"

**Issue**: Monorepo packages not found during build

**Solution**: Verify Root Directory is set to `apps/web` in Vercel settings

### GraphQL Types Out of Sync

**Issue**: TypeScript errors after backend schema changes

**Solution**: Regenerate types locally, commit, and redeploy

```bash
cd apps/web
npm run graphql:generate
git add src/lib/api/generated.ts
git commit -m "chore: regenerate GraphQL types"
git push
```

### API Calls Fail with CORS Error

**Issue**: Browser console shows CORS policy errors

**Solution**:

1. Verify `NEXT_PUBLIC_API_URL` in Vercel matches backend URL
2. Verify backend `CORS_ORIGINS` includes Vercel URL (exact match, with https://)
3. Restart backend service after CORS changes

### Authentication Not Working

**Issue**: Login fails or redirects incorrectly

**Solution**:

1. Verify `NEXTAUTH_URL` matches your Vercel URL exactly
2. Verify `NEXTAUTH_SECRET` is set and matches backend
3. Check Supabase keys are correct (anon key is public, service role is private)

---

## Scripts Reference

From `apps/web`:

```bash
# Development
npm run dev                    # Start dev server (port 3000)
npm run dev:turbo             # Start dev server with Turbo

# Building
npm run build                 # Production build
npm run start                 # Start production server

# Code Quality
npm run lint                  # Run ESLint
npm run lint:fix             # Run ESLint with auto-fix
npm run type-check           # TypeScript type checking
npm run type-check:watch     # Watch mode for type checking

# GraphQL
npm run graphql:introspect   # Fetch GraphQL schema from backend
npm run graphql:generate     # Generate TypeScript types from schema
npm run graphql:watch        # Watch mode for type generation

# Storybook
npm run storybook            # Start Storybook dev server (port 6006)
npm run build-storybook      # Build Storybook static site

# Testing
npm run test:e2e             # Run Playwright E2E tests
npm run test:e2e:ui          # Run E2E tests in UI mode
npm run test:e2e:headed      # Run E2E tests in headed mode
npm run test:e2e:debug       # Debug E2E tests

# Utilities
npm run clean                # Remove build artifacts
```

---

## Project Structure

```
apps/web/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   │   ├── layout/         # Layout components (sidebar, header, etc.)
│   │   ├── documents/      # Document-specific components
│   │   ├── organizations/  # Organization management
│   │   └── threads/        # Threads (AI chat)
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useSpaces.ts
│   │   └── useStreamingQuery.ts
│   ├── lib/                # Utilities and configuration
│   │   ├── api/            # GraphQL client and generated types
│   │   ├── stores/         # Zustand stores
│   │   ├── supabase/       # Supabase client configuration
│   │   └── utils/          # Utility functions
│   └── types/              # TypeScript type definitions
├── public/                 # Static assets
├── e2e/                    # Playwright E2E tests
├── .storybook/             # Storybook configuration
└── tailwind.config.ts      # Tailwind CSS configuration
```

---

## Environment Variables Reference

### Required for Development

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
```

**Note:** `SUPABASE_JWT_SECRET` is only needed for backend deployment (Render), not for frontend (Vercel). The frontend uses Supabase SSR with HTTP-only cookies.

### Required for Production

Same as development, but with production URLs:

```env
NEXT_PUBLIC_API_URL=https://olympus-api.onrender.com
NEXTAUTH_URL=https://olympus-demo.vercel.app
```

---

## Performance Optimization

### Image Optimization

Next.js automatically optimizes images. Use the `<Image>` component:

```tsx
import Image from 'next/image';

<Image src="/logo.png" alt="Olympus" width={200} height={100} />;
```

### Code Splitting

App Router automatically code-splits by route. Use dynamic imports for heavy components:

```tsx
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
});
```

### Bundle Analysis

```bash
npm run build

# Check build output for bundle sizes
# Look for large chunks and optimize imports
```

---

## Support

- **Backend API Docs**: `apps/api/README.md`
- **Design System**: `packages/ui/README.md`
- **Deployment Guide**: See above
- **Issues**: https://github.com/kamosah/olympus/issues

---

**Last Updated**: 2024-12-19
**Deployment Target**: Vercel (with Turborepo integration)
