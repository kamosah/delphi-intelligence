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
- ✅ Supabase project credentials (URL, anon key)
- ✅ GitHub repository with code pushed

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

| Variable Name                   | Value                                        | Notes                              |
| ------------------------------- | -------------------------------------------- | ---------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://[PROJECT-REF].supabase.co`          | From Supabase Settings → API       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx` | Anon (public) key - safe to expose |

**How to get these**:

1. Go to your Supabase project → **Settings** → **API**
2. Copy Project URL → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Note**: Authentication is handled by Supabase SSR with HTTP-only cookies. No additional auth secrets needed for the frontend.

### 3.3 Application Configuration

| Variable Name         | Value                                    | Notes                                          |
| --------------------- | ---------------------------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` | `https://olympus-[random-id].vercel.app` | Your Vercel deployment URL (no trailing slash) |

**Critical**:

- Must start with `NEXT_PUBLIC_` to be accessible in browser
- Use your actual Vercel URL from Step 4.3 deployment
- Used for email verification redirects and absolute URLs
- No trailing slash

**Note**: You'll need to add this variable AFTER your first deployment, once you have your Vercel URL. Then redeploy for changes to take effect.

### 3.4 Environment Selection

For each environment variable, select which environments it applies to:

- **Production**: ✅ (checked)
- **Preview**: ✅ (checked) - for PR deployments
- **Development**: ❌ (unchecked) - use local `.env.local` instead

### 3.5 Review Environment Variables

You should have **4 environment variables** configured (add `NEXT_PUBLIC_APP_URL` after first deployment):

```
NEXT_PUBLIC_API_URL=https://olympus-api.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
NEXT_PUBLIC_APP_URL=https://olympus-[random-id].vercel.app
```

Double-check:

- ✅ No quotes around values
- ✅ `NEXT_PUBLIC_*` variables are accessible in browser (safe for public keys)
- ✅ All values are from production Supabase (not local dev)
- ✅ Backend URL has no trailing slash

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

### 4.4 Add NEXT_PUBLIC_APP_URL Environment Variable

Now that you have your deployment URL, add it to Vercel environment variables:

1. In Vercel project dashboard, go to **"Settings"** → **"Environment Variables"**
2. Click **"Add Another"**
3. Add:
   - **Key**: `NEXT_PUBLIC_APP_URL`
   - **Value**: `https://olympus-[random-id].vercel.app` (your actual URL, no trailing slash)
   - **Environments**: Check **Production** and **Preview**
4. Click **"Save"**
5. Go to **"Deployments"** tab → Click **"⋯"** next to latest deployment → **"Redeploy"**
6. Wait for redeployment (~1-2 minutes)

**Why this is needed**: Email verification and password reset links need an absolute URL to redirect users back to your app after they click the link.

### 4.5 Configure Supabase Redirect URLs

**CRITICAL**: Configure allowed redirect URLs in Supabase to prevent authentication errors.

#### Where to Configure

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Scroll to **Redirect URLs** section

#### URLs to Add

Add BOTH development and production URLs for all auth flows:

**Development:**

```
http://localhost:3000/auth/callback
```

**Production** (use your actual Vercel URL):

```
https://olympus-[random-id].vercel.app/auth/callback
```

**Preview Deployments** (optional - if you want to test auth in PR previews):

```
https://olympus-git-*-[your-team].vercel.app/auth/callback
```

**Note**: For preview deployments, you'll need to add each URL manually or use a wildcard pattern if Supabase supports it.

#### Affected Auth Flows

The `/auth/callback` route handles ALL Supabase auth flows:

- ✅ Email verification (signup confirmation)
- ✅ Password reset
- ✅ Magic link authentication
- ✅ OAuth provider callbacks (Google, GitHub, etc. - if added later)

#### Why This Matters

When users click links in auth emails (verification, password reset, etc.):

1. Link points to Supabase auth servers
2. Supabase validates the token
3. Supabase redirects to your configured `emailRedirectTo` URL
4. **If the URL is not in allowed list → Authentication fails with "Invalid redirect URL" error**

#### Common Mistakes to Avoid

❌ **Don't include query parameters** in redirect URLs

- Wrong: `http://localhost:3000/auth/callback?type=signup`
- Right: `http://localhost:3000/auth/callback`

❌ **Don't forget to add BOTH localhost AND production URLs**

- Local testing requires `http://localhost:3000/auth/callback`
- Production requires `https://your-domain.vercel.app/auth/callback`

❌ **Don't use wildcards unless explicitly supported**

- Supabase requires exact URL matches
- Add each domain separately (localhost, production, staging, etc.)

#### Site URL Configuration

While you're in Supabase Dashboard → Authentication → URL Configuration:

1. Set **Site URL** to your primary domain (production):
   ```
   https://olympus-[random-id].vercel.app
   ```
2. This is the default redirect if no `emailRedirectTo` is provided

#### Testing After Configuration

After adding redirect URLs:

- [ ] Sign up with new account (email verification link should work)
- [ ] Request password reset (reset link should work)
- [ ] Check Supabase logs for any redirect URL errors
- [ ] Test from both localhost and production domain

---

## Step 5: Update Backend CORS

After deployment, your backend needs to allow requests from your frontend Vercel URL:

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

### 7.3 Update Backend CORS

After adding custom domain:

1. Update backend `CORS_ORIGINS` in Render to include your custom domain
2. Example: `["https://app.olympus.com"]`
3. Render will automatically restart the backend

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

1. Check Supabase keys are correct:
   - `NEXT_PUBLIC_SUPABASE_URL` - matches your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - anon public key (not service role)
2. Verify Supabase HTTP-only cookies are working:
   - Check browser DevTools → Application → Cookies
   - Should see cookies with `sb-` prefix
3. Test Supabase auth directly in browser console:
   ```javascript
   // Test authentication connection
   fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`)
     .then((r) => r.json())
     .then(console.log);
   // Should return: { version: "..." }
   ```
4. Check middleware is protecting routes:
   - Try accessing `/dashboard` without logging in
   - Should redirect to `/login`

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

1. **Update Backend CORS**: Add Vercel URL to `CORS_ORIGINS` (if not done in Step 5)
2. **Test User Flows**: Registration, login, navigation
3. **Phase 7**: Integration Testing and Documentation

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

- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- [ ] Backend `CORS_ORIGINS` restricted to your domains only (no wildcards)
- [ ] Environment variables in Vercel (not in git)
- [ ] HTTPS enabled (Vercel does this automatically)
- [ ] Supabase Row Level Security (RLS) enabled on all tables
- [ ] Authentication middleware protecting sensitive routes
- [ ] CSP headers configured (optional but recommended)
- [ ] Rate limiting enabled on backend (prevent abuse)
- [ ] HTTP-only cookies enabled (Supabase SSR default)

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
