# Vercel Frontend Deployment - Step-by-Step Guide

Quick-start guide for deploying the Olympus Next.js frontend to Vercel.

> **Prerequisites**:
>
> - Complete [Render Backend Deployment](./RENDER_DEPLOYMENT.md) to obtain backend URL
> - Complete [Supabase Setup](./SUPABASE_SETUP.md) for database credentials
>
> **For comprehensive reference**: See [`apps/web/README.md`](../apps/web/README.md#deployment-to-vercel)

---

## Overview

This guide walks through deploying the Next.js 14 frontend to Vercel with:

- **Framework**: Next.js 14 with App Router
- **Build System**: Turborepo (native Vercel support)
- **Authentication**: Supabase SSR with HTTP-only cookies
- **API**: GraphQL client connecting to Render backend
- **Cost**: Free tier available (100GB bandwidth/month)

**Deployment Time**: ~10 minutes

---

## Before You Begin

Ensure you have:

- ✅ Backend deployed to Render (see [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md))
- ✅ Backend URL: `https://olympus-api.onrender.com`
- ✅ Supabase project credentials (URL, anon key, JWT secret)
- ✅ GitHub repository with code pushed
- ✅ Generated NextAuth secret: `openssl rand -hex 32`

---

## Step 1: Create Vercel Account

1. Go to https://vercel.com/signup
2. Sign up with GitHub (recommended for easy repo access)
3. Authorize Vercel to access your GitHub repositories
4. Complete account setup

**Free Tier Includes**:

- 100GB bandwidth/month
- Unlimited deployments
- Automatic preview deployments for PRs
- Global CDN (edge network)

---

## Step 2: Import GitHub Repository

### 2.1 Create New Project

1. From Vercel dashboard, click **"Add New..."** → **"Project"**
2. If this is your first project, you'll see **"Import Git Repository"**
3. Click **"Import"** next to your repository: `kamosah/olympus`
   - If you don't see it, click **"Add GitHub Account"** and authorize access
4. Click **"Import"**

### 2.2 Configure Project Settings

Vercel will auto-detect Next.js, but configure these critical settings:

**Framework Preset**:

- ✅ **Framework**: Next.js (auto-detected)

**Root Directory**:

- ⚠️ **CRITICAL**: Set to `apps/web`
- Click **"Edit"** next to Root Directory
- Enter: `apps/web`
- This tells Vercel where your Next.js app lives in the monorepo

**Build & Development Settings**:

- **Build Command**: Leave empty _(auto-detects)_
- **Output Directory**: Leave empty _(auto-detects `.next`)_
- **Install Command**: Leave empty _(auto-detects `npm install`)_
- **Development Command**: Leave empty _(auto-detects)_

**Why leave these empty?**

- Vercel has **native Turborepo support**
- Automatically runs: `turbo run build --filter=@olympus/web`
- Handles proper caching and dependency management
- Optimized for monorepo structure

**Node.js Version**:

- **Node.js Version**: 20.x (recommended)
- Vercel auto-detects from `.nvmrc` or `package.json` engines

---

## Step 3: Configure Environment Variables

**IMPORTANT**: Add environment variables BEFORE deploying.

In the "Environment Variables" section:

### 3.1 Backend API Configuration

| Variable Name         | Value                              | Notes                                       |
| --------------------- | ---------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `https://olympus-api.onrender.com` | Your Render backend URL (no trailing slash) |

**Critical**:

- Must start with `NEXT_PUBLIC_` to be accessible in browser
- Use your actual Render URL (from Phase 5)
- No trailing slash

### 3.2 Supabase Configuration

| Variable Name                   | Value                                        | Notes                                                     |
| ------------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://[PROJECT-REF].supabase.co`          | From Supabase Settings → API                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx` | Anon (public) key - safe to expose                        |
| `SUPABASE_JWT_SECRET`           | `<your-jwt-secret>`                          | From Supabase Settings → API → JWT Settings (KEEP SECRET) |

**How to get these**:

1. Go to your Supabase project → **Settings** → **API**
2. Copy Project URL → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Scroll to **JWT Settings** → Copy JWT Secret → `SUPABASE_JWT_SECRET`

### 3.3 NextAuth Configuration

| Variable Name     | Value                             | Notes                                              |
| ----------------- | --------------------------------- | -------------------------------------------------- |
| `NEXTAUTH_SECRET` | `<random-32-char-string>`         | Generate with `openssl rand -hex 32` (KEEP SECRET) |
| `NEXTAUTH_URL`    | `https://olympus-demo.vercel.app` | Your Vercel URL (update after first deploy)        |

**Generate NEXTAUTH_SECRET**:

```bash
openssl rand -hex 32
```

**IMPORTANT**:

- For first deployment, use a placeholder URL for `NEXTAUTH_URL`
- After deployment, come back and update with actual Vercel URL

### 3.4 Environment Selection

For each environment variable, select which environments it applies to:

- **Production**: ✅ (checked)
- **Preview**: ✅ (checked) - for PR deployments
- **Development**: ❌ (unchecked) - use local `.env.local` instead

### 3.5 Review Environment Variables

You should have **6 environment variables** configured:

```
NEXT_PUBLIC_API_URL=https://olympus-api.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
SUPABASE_JWT_SECRET=<your-supabase-jwt-secret>
NEXTAUTH_SECRET=<your-nextauth-secret>
NEXTAUTH_URL=https://olympus-demo.vercel.app
```

Double-check:

- ✅ No quotes around values
- ✅ `NEXT_PUBLIC_*` variables are accessible in browser (safe for public keys)
- ✅ Secret variables (`SUPABASE_JWT_SECRET`, `NEXTAUTH_SECRET`) are NOT `NEXT_PUBLIC_`
- ✅ All values are from production Supabase (not local dev)

---

## Step 4: Deploy

### 4.1 Initiate Deployment

1. Review all settings
2. Click **"Deploy"** button
3. Vercel will:
   - Clone your repository
   - Install dependencies via npm
   - Run Turborepo build for `@olympus/web`
   - Deploy to global CDN
   - Generate preview URL

**Build time**: 2-5 minutes (first build), 1-2 minutes (subsequent builds)

### 4.2 Monitor Deployment

Watch the build logs in real-time:

1. You'll see a live log stream
2. Look for these success indicators:
   ```
   Running build in Washington, D.C., USA (iad1)
   Detected Turborepo. Running "turbo run build --filter=@olympus/web"
   Resolved package: @olympus/web
   ✓ Building...
   ✓ Linting and checking validity of types...
   ✓ Creating an optimized production build...
   Build Completed in /vercel/output [2m 34s]
   Deploying...
   ✓ Deployment completed
   ```

**Common build output**:

- `npm install` - installs all dependencies
- `turbo run build` - builds with Turborepo
- `Next.js compiler` - compiles TypeScript
- `Generating static pages` - pre-renders pages
- `Creating optimized production build` - bundles assets

### 4.3 Get Deployment URL

After successful deployment:

1. You'll see: **"Congratulations! Your project has been deployed."**
2. Your URL will be displayed, e.g.:
   ```
   https://olympus-[random-id].vercel.app
   ```
3. Vercel assigns a random subdomain for first deployment
4. Copy this URL - you'll need it for next steps

---

## Step 5: Update Configuration

### 5.1 Update NEXTAUTH_URL

If you used a placeholder URL in Step 3.3:

1. Go to your project in Vercel dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Find `NEXTAUTH_URL`
4. Click **"Edit"**
5. Update value to your actual Vercel URL:
   ```
   https://olympus-[random-id].vercel.app
   ```
6. Click **"Save"**
7. Vercel will prompt you to redeploy - click **"Redeploy"**

### 5.2 Update Backend CORS

Your backend needs to allow requests from your frontend:

1. Go to Render dashboard → `olympus-api` service
2. Click **"Environment"** tab
3. Find `CORS_ORIGINS` variable
4. Click **"Edit"**
5. Update to include your Vercel URL:
   ```json
   ["https://olympus-[random-id].vercel.app"]
   ```
6. Click **"Save Changes"**
7. Render will automatically restart the backend (~30 seconds)

**IMPORTANT**:

- Use exact URL (with https://)
- No trailing slash
- Can add multiple URLs: `["https://url1.vercel.app","https://url2.vercel.app"]`

---

## Step 6: Verify Deployment

### 6.1 Access Frontend

Open your Vercel URL in a browser:

```
https://olympus-[random-id].vercel.app
```

You should see:

- ✅ Login page loads successfully
- ✅ No console errors (check browser DevTools)
- ✅ Supabase connection working

### 6.2 Test Login Flow

**Test with existing account** (if you have one):

1. Navigate to login page
2. Enter email and password
3. Click "Sign In"
4. Should redirect to `/dashboard`
5. User menu should show your email/name

**Create new account**:

1. Click "Sign up" link (if available)
2. Enter email, password, confirm password
3. Should create account and redirect to dashboard

### 6.3 Test Backend Connection

Check browser console (F12 → Console):

- ✅ No CORS errors
- ✅ GraphQL queries succeed
- ✅ Authentication tokens working

**If you see CORS errors**:

- Verify backend `CORS_ORIGINS` includes your Vercel URL
- Check for typos in URL (https vs http, trailing slash)
- Wait 30 seconds for Render to restart after CORS change

### 6.4 Test API Calls

From browser console, test API connection:

```javascript
// Test health endpoint
fetch('https://olympus-api.onrender.com/health')
  .then((r) => r.json())
  .then(console.log);

// Should log: { status: "healthy", service: "olympus-api", ... }
```

---

## Step 7: Configure Custom Domain (Optional)

### 7.1 Add Custom Domain

If you have a custom domain:

1. In Vercel project, go to **"Settings"** → **"Domains"**
2. Click **"Add"**
3. Enter your domain: `app.olympus.com`
4. Click **"Add"**

### 7.2 Configure DNS

Vercel will provide DNS records to add:

**For root domain** (`olympus.com`):

- Type: `A`
- Name: `@`
- Value: `76.76.21.21` (Vercel IP)

**For subdomain** (`app.olympus.com`):

- Type: `CNAME`
- Name: `app`
- Value: `cname.vercel-dns.com`

Add these records in your domain registrar's DNS settings.

### 7.3 Update Environment Variables

After adding custom domain:

1. Update `NEXTAUTH_URL` to your custom domain
2. Update backend `CORS_ORIGINS` to include custom domain
3. Redeploy both frontend and backend

---

## Important Notes

### Vercel Free Tier

- **100GB bandwidth/month** (sufficient for demos/prototypes)
- **Unlimited deployments**
- **Automatic HTTPS** (SSL certificates)
- **Global CDN** (fast worldwide)
- **No cold starts** (unlike Render free tier)

### Preview Deployments

Vercel automatically creates preview deployments for:

- **Pull requests**: Each PR gets a unique URL
- **Non-production branches**: Deployments for feature branches

Preview URLs:

```
https://olympus-git-[branch-name]-[team].vercel.app
```

### Production Branch

By default, Vercel deploys `main` branch to production.

To deploy from different branch:

1. **Settings** → **Git**
2. Change **"Production Branch"** to desired branch (e.g., `feat/vercel-deployment`)

### Build Command Override (Advanced)

Only override build commands if you have custom requirements:

```bash
# Example custom build command (not recommended)
cd ../.. && npm install && npm run build --filter=@olympus/web
```

**Best practice**: Let Vercel auto-detect with native Turborepo support.

---

## Troubleshooting

### Build Fails: "Module not found"

**Issue**: Monorepo packages not found during build

**Solution**:

1. Verify **Root Directory** is set to `apps/web` in Vercel settings
2. Check `package.json` has correct workspace references
3. Ensure all dependencies are in `package.json` (not just devDependencies)

### GraphQL Types Out of Sync

**Issue**: TypeScript errors after backend schema changes

**Solution**:

1. Regenerate types locally:
   ```bash
   cd apps/web
   npm run graphql:generate
   ```
2. Commit updated `src/lib/api/generated.ts`
3. Push to trigger Vercel redeployment

### API Calls Fail with CORS Error

**Issue**: Browser console shows CORS policy errors

**Solution**:

1. Verify `NEXT_PUBLIC_API_URL` in Vercel matches backend URL
2. Verify backend `CORS_ORIGINS` includes your Vercel URL (exact match, with https://)
3. Restart backend service after CORS changes (Render auto-restarts)
4. Clear browser cache and hard reload (Cmd+Shift+R)

### Authentication Not Working

**Issue**: Login fails or redirects incorrectly

**Solution**:

1. Verify `NEXTAUTH_URL` matches your Vercel URL exactly
2. Verify `NEXTAUTH_SECRET` is set and unique (not placeholder)
3. Check Supabase keys are correct:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - anon public key (not service role)
   - `SUPABASE_JWT_SECRET` - JWT secret (not anon key)
4. Test Supabase auth directly:
   ```javascript
   // In browser console
   import { createBrowserClient } from '@supabase/ssr';
   const supabase = createBrowserClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
   );
   await supabase.auth.getSession();
   ```

### Build Succeeds but Pages Show Errors

**Issue**: Build completes but runtime errors occur

**Solution**:

1. Check Vercel Function Logs:
   - Go to **"Deployments"** → Click deployment → **"Functions"** tab
2. Look for:
   - Missing environment variables
   - API connection failures
   - Server-side rendering errors
3. Enable verbose logging:
   ```typescript
   // In app/layout.tsx or middleware.ts
   console.log('Environment check:', {
     apiUrl: process.env.NEXT_PUBLIC_API_URL,
     supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
   });
   ```

### Slow Initial Load

**Issue**: First page load is slow

**Solution**:

- **Expected behavior**: Render backend sleeps after 15 min (free tier)
- **Cold start**: ~30 seconds for first request
- **Workaround**: "Wake up" backend before demo:
  ```bash
  curl https://olympus-api.onrender.com/health
  ```
- **Long-term**: Upgrade Render to paid tier ($7/month) for always-on

---

## Next Steps

✅ **Frontend deployed successfully!**

Continue to:

1. **Update Backend CORS**: Add Vercel URL to `CORS_ORIGINS` (if not done in Step 5.2)
2. **Test User Flows**: Registration, login, navigation
3. **Phase 7**: [Integration Testing and Documentation](#)

---

## Performance Optimization

### Image Optimization

Next.js automatically optimizes images. Use the `<Image>` component:

```tsx
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Olympus"
  width={200}
  height={100}
  priority // for above-the-fold images
/>;
```

### Code Splitting

App Router automatically code-splits by route. For heavy components:

```tsx
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false, // disable SSR if not needed
});
```

### Bundle Analysis

Check bundle sizes after build:

```bash
cd apps/web
npm run build

# Look for large chunks in output
# Optimize imports if needed
```

---

## Monitoring & Analytics

### Vercel Analytics (Optional)

Enable built-in analytics:

1. In Vercel project, go to **"Analytics"** tab
2. Click **"Enable Analytics"**
3. Free tier includes basic metrics (page views, visitors)
4. Pro tier ($20/month) includes detailed performance metrics

### Error Tracking

Consider integrating:

- **Sentry** - Error tracking and performance monitoring
- **LogRocket** - Session replay and error tracking
- **Vercel Web Analytics** - Privacy-friendly analytics

---

## Cost Summary

### Free Tier (Current Setup)

- Frontend (Vercel): $0/month (100GB bandwidth)
- Backend (Render): $0/month (sleeps after 15 min)
- Database (Supabase): $0/month (500MB)

**Total: $0/month**

**Limitations**:

- Backend cold starts (~30 seconds)
- 100GB Vercel bandwidth (usually sufficient)
- Supabase 500MB storage (upgrade at 80% capacity)

### Recommended Production

- Frontend (Vercel): $20/month (Pro - 1TB bandwidth, analytics)
- Backend (Render): $7/month (Starter - always-on)
- Database (Supabase): $25/month (Pro - 8GB, backups)

**Total: ~$52/month**

---

## Security Checklist

Before going live:

- [ ] `NEXTAUTH_URL` set to production URL
- [ ] `NEXTAUTH_SECRET` is strong random string (32+ chars)
- [ ] `SUPABASE_JWT_SECRET` kept secret (not `NEXT_PUBLIC_`)
- [ ] Backend `CORS_ORIGINS` restricted to your domains only
- [ ] Environment variables in Vercel secrets (not in git)
- [ ] HTTPS enabled (Vercel does this automatically)
- [ ] CSP headers configured (optional but recommended)
- [ ] Rate limiting enabled on backend (prevent abuse)

---

## Additional Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Turborepo on Vercel**: https://vercel.com/docs/concepts/monorepos/turborepo
- **Supabase SSR**: https://supabase.com/docs/guides/auth/server-side-rendering

---

**Created**: 2024-12-20
**For**: Olympus MVP Frontend Deployment
**Phase**: 6 of 7 (Vercel Deployment)
