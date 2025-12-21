# Olympus MVP - Complete Deployment Guide

Comprehensive guide for deploying the Olympus AI-powered document intelligence platform to production.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Deployment Phases](#deployment-phases)
- [Testing & Verification](#testing--verification)
- [Post-Deployment](#post-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)
- [Cost Summary](#cost-summary)

---

## Overview

This guide walks through deploying Olympus MVP as a full-stack application with the following architecture:

**Production Stack**:

- **Frontend**: Next.js 14 on Vercel (Global CDN)
- **Backend**: FastAPI on Render (Docker container)
- **Database**: Supabase PostgreSQL with connection pooling
- **Cache/Sessions**: Render Redis
- **AI/ML**: OpenAI (embeddings + GPT-4)

**Deployment Time**: ~45 minutes (including account setup)

**Deployment Branch**: `feat/vercel-deployment`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User's Browser                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTPS
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  Vercel (Frontend)                                          │
│  - Next.js 14 App Router                                    │
│  - Global CDN                                               │
│  - Supabase SSR Auth (HTTP-only cookies)                   │
│  - GraphQL client                                           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ GraphQL/REST
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  Render (Backend)                                           │
│  - FastAPI + Uvicorn                                        │
│  - Strawberry GraphQL                                       │
│  - JWT authentication                                       │
│  - OpenAI integration                                       │
│  ├── Redis (Sessions)                                       │
│  └── Supabase PostgreSQL (Data + RLS)                      │
└─────────────────────────────────────────────────────────────┘
```

**Data Flow**:

1. User logs in via Supabase Auth (frontend)
2. Supabase sets HTTP-only cookie
3. Next.js middleware exchanges Supabase token for Olympus JWT
4. Frontend sends GraphQL requests with Olympus JWT
5. Backend validates JWT and queries Supabase with RLS

---

## Prerequisites

### Required Accounts

- [x] **GitHub account** (for source code and deployment)
- [x] **Supabase account** (database, auth, storage)
- [x] **Render account** (backend hosting)
- [x] **Vercel account** (frontend hosting)
- [x] **OpenAI account** (AI features, embeddings)

### Required Tools

- [x] **Git** (version control)
- [x] **Node.js 20+** (local development)
- [x] **OpenSSL** (generating secrets)
- [x] **psql** (optional, for database testing)

### Preparation

1. Fork or clone the repository: `kamosah/olympus`
2. Push code to your GitHub repository
3. Ensure all pre-commit checks pass locally

---

## Deployment Phases

Follow these phases in order. Each phase includes a detailed guide:

### Phase 1: Production Docker Configuration ✅

**What**: Create production-optimized Docker image for FastAPI backend

**Files Created**:

- `apps/api/Dockerfile.prod` - Multi-stage production build
- Updated `apps/api/.dockerignore` - Exclude dev files

**Key Features**:

- Multi-stage build (reduces image size)
- Non-root user for security
- Health check endpoint
- 2 Uvicorn workers for production

**Status**: ✅ Complete (branch: `feat/vercel-deployment`)

---

### Phase 2: Backend Environment Configuration ✅

**What**: Configure environment-driven settings and CORS

**Files Created/Modified**:

- `apps/api/.env.production.example` - Production environment template
- `apps/api/DEPLOYMENT.md` - Render deployment guide
- `apps/api/app/config.py` - Added CORS regex for dev
- `apps/api/app/main.py` - Updated CORS middleware

**Key Changes**:

- Hybrid CORS: regex for dev (localhost:3000-3005), explicit origins for prod
- Environment-driven configuration via Pydantic
- Comprehensive documentation for all environment variables

**Status**: ✅ Complete

---

### Phase 3: Frontend Vercel Configuration ✅

**What**: Configure Vercel deployment with native Turborepo support

**Files Created**:

- `.vercelignore` - Exclude backend, tests, docs from deployment
- `apps/web/README.md` - Comprehensive Vercel deployment guide

**Key Approach**:

- **Zero-config** deployment leveraging Vercel's native Turborepo integration
- Set Root Directory to `apps/web`, leave build commands empty
- Vercel automatically runs `turbo run build --filter=@olympus/web`

**Status**: ✅ Complete

---

### Phase 4: Supabase Production Setup 📋

**What**: Create production database with connection pooling

**Guide**: [docs/SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

**Steps**:

1. Create Supabase project (`olympus-production`)
2. Enable connection pooling (session mode)
3. Run database migrations (SQL Editor or Alembic)
4. Collect credentials (URL, anon key, service role key, JWT secret)
5. Verify setup (test connection, check tables)

**Time**: ~20 minutes

**Credentials Needed**:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `DATABASE_URL` (session pooler)

**Status**: 📋 Ready to execute

---

### Phase 5: Backend Deployment to Render 📋

**What**: Deploy FastAPI backend with Redis to Render

**Guide**: [docs/RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)

**Steps**:

1. Create Render account
2. Create web service (Docker, root dir: `apps/api`)
3. Add Redis add-on (free tier)
4. Configure ~20 environment variables
5. Deploy and verify health check

**Time**: ~15 minutes

**Environment Variables**:

- Core: `ENV`, `DEBUG`, `PORT`, `HOST`
- Database: `DATABASE_URL`, `SUPABASE_*`
- Redis: `REDIS_URL` (auto-populated)
- CORS: `CORS_ORIGINS`, `CORS_ORIGIN_REGEX`
- JWT: `JWT_SECRET`, `JWT_ALGORITHM`
- OpenAI: `OPENAI_API_KEY`, models, batch sizes

**Backend URL**: `https://olympus-api.onrender.com` (or your chosen name)

**Status**: 📋 Ready to execute

---

### Phase 6: Frontend Deployment to Vercel 📋

**What**: Deploy Next.js frontend with Turborepo to Vercel

**Guide**: [docs/VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

**Steps**:

1. Create Vercel account
2. Import GitHub repository
3. Configure project (Root Directory: `apps/web`)
4. Add 6 environment variables
5. Deploy and verify
6. Update backend CORS with Vercel URL

**Time**: ~10 minutes

**Environment Variables**:

- `NEXT_PUBLIC_API_URL` (Render backend URL)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_JWT_SECRET`
- `NEXTAUTH_SECRET` (generate new)
- `NEXTAUTH_URL` (your Vercel URL)

**Frontend URL**: `https://olympus-[random-id].vercel.app`

**Status**: 📋 Ready to execute

---

### Phase 7: Integration Testing 📋

**What**: Verify end-to-end functionality

**Checklist**:

#### Backend Health Check

- [ ] `curl https://olympus-api.onrender.com/health` returns 200
- [ ] Response contains: `{"status": "healthy", "service": "olympus-api"}`
- [ ] GraphQL endpoint accessible (test with curl)

#### Frontend Access

- [ ] `https://olympus-[random-id].vercel.app` loads
- [ ] Login page renders without errors
- [ ] No console errors in browser DevTools
- [ ] No CORS errors

#### Authentication Flow

- [ ] Can create new account (registration)
- [ ] Can log in with credentials
- [ ] Redirects to `/dashboard` after login
- [ ] User menu shows email/name
- [ ] Can log out successfully

#### Backend Integration

- [ ] GraphQL queries succeed (check Network tab)
- [ ] API calls use correct backend URL
- [ ] JWT authentication working (Authorization header present)
- [ ] No 401 Unauthorized errors

#### Core Features (Optional - if OpenAI configured)

- [ ] Can create organization
- [ ] Can create space
- [ ] Can upload document (if file storage configured)
- [ ] Can create thread
- [ ] AI responses working (if OpenAI key valid)

**Troubleshooting**:

- CORS errors → Update backend `CORS_ORIGINS` with exact Vercel URL
- Auth errors → Verify `NEXTAUTH_URL` matches Vercel URL
- Database errors → Check connection pooler URL format
- Cold start delays → Normal for Render free tier (~30s first request)

**Status**: 📋 Ready to execute after Phases 4-6

---

## Testing & Verification

### Automated Testing (Pre-Deployment)

Run these checks locally before deploying:

**Backend**:

```bash
cd apps/api
docker compose exec api poetry run ruff format
docker compose exec api poetry run ruff check --fix
docker compose exec api poetry run mypy app/
docker compose exec api poetry run pytest
```

**Frontend**:

```bash
cd apps/web
npm run type-check
npm run lint:fix
```

### Manual Testing (Post-Deployment)

#### Test 1: Backend Health

```bash
# Health endpoint
curl https://olympus-api.onrender.com/health

# GraphQL introspection
curl -X POST https://olympus-api.onrender.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

**Expected**: 200 status, JSON response

#### Test 2: Frontend Rendering

1. Open frontend URL in browser
2. Check browser console (F12)
3. Verify no errors
4. Check Network tab for API calls

**Expected**: Login page loads, no console errors

#### Test 3: Authentication

1. Register new account or login
2. Verify redirect to dashboard
3. Check user menu shows email
4. Log out and verify redirect

**Expected**: Full auth cycle works

#### Test 4: CORS Configuration

1. Open browser DevTools → Network tab
2. Log in (triggers GraphQL request to backend)
3. Check request headers for `Origin`
4. Check response headers for `Access-Control-Allow-Origin`

**Expected**: No CORS errors, Origin header matches Vercel URL

---

## Post-Deployment

### Update Documentation

After successful deployment, update these files with live URLs:

**1. Main README** (`README.md`):

```markdown
## Live Demo

- **Frontend**: https://olympus-[your-url].vercel.app
- **Backend API**: https://olympus-api.onrender.com

Try it out:

1. Visit the frontend URL
2. Create an account
3. Explore document intelligence features
```

**2. WorkOS Application** (`/Users/kwameamosah/Documents/WorkOS_Work_Sample_Response.md`):

```markdown
## Live Demonstration

You can see Olympus in action at: https://olympus-[your-url].vercel.app

Features demonstrated:

- User authentication with Supabase
- GraphQL API integration
- AI-powered document analysis (if OpenAI configured)
- Real-time updates via SSE
```

**3. Git Commit**:

```bash
git add README.md
git commit -m "docs: add live demo URLs"
git push
```

### Configure Custom Domain (Optional)

**Vercel**:

1. Settings → Domains → Add domain
2. Configure DNS records (A or CNAME)
3. Update `NEXTAUTH_URL` environment variable
4. Update backend `CORS_ORIGINS`

**Render** (paid tier required):

1. Settings → Custom Domains → Add domain
2. Configure DNS records
3. Update frontend `NEXT_PUBLIC_API_URL`

### Enable Monitoring

**Vercel Analytics** (Optional):

1. Project → Analytics → Enable
2. Free tier: page views, visitors
3. Pro tier: performance metrics

**Render Monitoring**:

1. Built-in logs and metrics
2. Configure alerts for downtime
3. Monitor resource usage

**Supabase Monitoring**:

1. Database → Reports (usage, performance)
2. Set up alerts for storage limits
3. Monitor API requests

---

## Monitoring & Maintenance

### Daily Checks

- [ ] Check Render logs for errors
- [ ] Monitor Supabase database size
- [ ] Review OpenAI API usage (cost)

### Weekly Tasks

- [ ] Review Vercel deployment logs
- [ ] Check Render service uptime
- [ ] Monitor bandwidth usage (Vercel 100GB free tier)

### Monthly Tasks

- [ ] Review cost breakdown (Render, Vercel, Supabase, OpenAI)
- [ ] Optimize database queries if needed
- [ ] Review and clean up old deployments
- [ ] Update dependencies (security patches)

### Alerts to Configure

**Render**:

- Service down alert (email notification)
- Resource usage alert (if approaching limits)

**Supabase**:

- Database storage > 80% (upgrade warning)
- Connection pool exhaustion

**OpenAI**:

- Monthly spend alert (set budget in OpenAI dashboard)

---

## Troubleshooting

### Common Issues

#### "Service Unavailable" on Backend

**Symptoms**: Render shows 503 error, health check fails

**Solutions**:

1. Check Render logs for startup errors
2. Verify `DATABASE_URL` uses session pooler
3. Ensure Redis is connected
4. Restart service manually

#### CORS Errors in Browser

**Symptoms**: Console shows "CORS policy" errors

**Solutions**:

1. Verify backend `CORS_ORIGINS` includes exact Vercel URL
2. No trailing slashes in URLs
3. Use https:// (not http://)
4. Restart backend after CORS changes

#### Authentication Failures

**Symptoms**: Login fails, redirect errors

**Solutions**:

1. Verify `NEXTAUTH_URL` matches Vercel URL exactly
2. Check `NEXTAUTH_SECRET` is set
3. Verify Supabase keys are correct
4. Check browser cookies are enabled

#### Database Connection Failures

**Symptoms**: Backend logs show "could not connect to database"

**Solutions**:

1. Use session pooler URL (`.pooler.supabase.com`)
2. Verify `postgresql+asyncpg://` prefix
3. Check database password has no special characters
4. Test connection with psql

#### Slow Cold Starts

**Symptoms**: First request after inactivity takes 30+ seconds

**Explanation**: Render free tier sleeps after 15 minutes

**Solutions**:

- **For demos**: "Wake up" backend before demo: `curl https://olympus-api.onrender.com/health`
- **Long-term**: Upgrade to Render paid tier ($7/month) for always-on

---

## Cost Summary

### Free Tier Setup (For Demo/MVP)

| Service      | Plan          | Cost        | Limitations                               |
| ------------ | ------------- | ----------- | ----------------------------------------- |
| Render       | Free          | $0/month    | Sleeps after 15 min, 750 hrs/month        |
| Render Redis | Free          | $0/month    | 25MB, shared instance                     |
| Vercel       | Hobby         | $0/month    | 100GB bandwidth, unlimited deployments    |
| Supabase     | Free          | $0/month    | 500MB database, 50MB storage              |
| OpenAI       | Pay-as-you-go | ~$0-5/month | Embedding: $0.02/1M tokens, GPT-4: varies |

**Total: $0-5/month**

**Best for**:

- Demos and portfolios
- WorkOS application showcase
- Low-traffic testing

**Limitations**:

- Backend cold starts (30s after 15 min idle)
- Limited storage (500MB database, 50MB files)
- Moderate bandwidth (100GB/month)

### Recommended Production Setup

| Service      | Plan          | Cost         | Features                                  |
| ------------ | ------------- | ------------ | ----------------------------------------- |
| Render       | Starter       | $7/month     | Always-on, 512MB RAM, no cold starts      |
| Render Redis | Starter       | $10/month    | 1GB persistent, dedicated instance        |
| Vercel       | Pro           | $20/month    | 1TB bandwidth, analytics, faster builds   |
| Supabase     | Pro           | $25/month    | 8GB database, 100GB storage, PITR backups |
| OpenAI       | Pay-as-you-go | $20-50/month | Depends on usage (moderate traffic)       |

**Total: $82-112/month**

**Best for**:

- Production applications
- Always-on availability
- Moderate to high traffic

### Enterprise Setup

For high-scale production:

| Service      | Plan          | Estimated Cost | Features                            |
| ------------ | ------------- | -------------- | ----------------------------------- |
| Render       | Standard+     | $25-85/month   | Multiple instances, auto-scaling    |
| Render Redis | Standard      | $25/month      | 4GB, high availability              |
| Vercel       | Enterprise    | Custom         | Dedicated support, SLA guarantees   |
| Supabase     | Team+         | $599+/month    | Dedicated compute, priority support |
| OpenAI       | Pay-as-you-go | $200+/month    | High-volume usage                   |

**Total: $874+/month**

### Cost Optimization Tips

1. **Start with free tier** - Validate product-market fit before upgrading
2. **Monitor OpenAI usage** - Set budget alerts to avoid unexpected costs
3. **Optimize embeddings** - Batch requests, cache results
4. **Use Vercel preview deployments** - Test before production deploy
5. **Upgrade selectively** - Start by upgrading only bottlenecks (e.g., Render to $7/month for always-on)

---

## Next Steps

After deployment:

1. **Test thoroughly** - Run through all user flows
2. **Update documentation** - Add live URLs to README
3. **Create WorkOS application** - Include live demo link
4. **Monitor for 24 hours** - Check logs, errors, performance
5. **Plan upgrades** - Based on usage patterns

---

## Support & Resources

### Documentation

- [Supabase Setup](./SUPABASE_SETUP.md)
- [Render Deployment](./RENDER_DEPLOYMENT.md)
- [Vercel Deployment](./VERCEL_DEPLOYMENT.md)
- [Backend Deployment](../apps/api/DEPLOYMENT.md)
- [Frontend README](../apps/web/README.md)

### Platform Documentation

- **Render**: https://render.com/docs
- **Vercel**: https://vercel.com/docs
- **Supabase**: https://supabase.com/docs
- **OpenAI**: https://platform.openai.com/docs

### Troubleshooting

- **Project Issues**: https://github.com/kamosah/olympus/issues
- **Render Status**: https://status.render.com/
- **Vercel Status**: https://www.vercel-status.com/
- **Supabase Status**: https://status.supabase.com/
- **OpenAI Status**: https://status.openai.com/

---

## Deployment Checklist

Use this checklist to track your deployment progress:

### Pre-Deployment

- [x] Code pushed to GitHub
- [x] Pre-commit checks passing
- [x] Branch: `feat/vercel-deployment` created
- [x] Production Dockerfile created
- [x] Environment configuration documented

### Phase 4: Supabase

- [ ] Supabase account created
- [ ] Production project created
- [ ] Connection pooling enabled (session mode)
- [ ] Database migrations applied
- [ ] Credentials collected and secured

### Phase 5: Render

- [ ] Render account created
- [ ] Web service created (Docker, `apps/api`)
- [ ] Redis add-on added
- [ ] Environment variables configured (~20)
- [ ] Service deployed successfully
- [ ] Health check passing

### Phase 6: Vercel

- [ ] Vercel account created
- [ ] GitHub repository imported
- [ ] Project configured (Root Directory: `apps/web`)
- [ ] Environment variables added (6)
- [ ] Frontend deployed successfully
- [ ] `NEXTAUTH_URL` updated with Vercel URL
- [ ] Backend `CORS_ORIGINS` updated with Vercel URL

### Phase 7: Testing

- [ ] Backend health check passing
- [ ] Frontend loads without errors
- [ ] Authentication flow works
- [ ] GraphQL queries succeed
- [ ] No CORS errors
- [ ] Core features functional (if OpenAI configured)

### Post-Deployment

- [ ] README updated with live URLs
- [ ] WorkOS application updated
- [ ] Monitoring enabled
- [ ] Alerts configured
- [ ] Team notified of deployment

---

**Created**: 2024-12-20
**For**: Olympus MVP Full-Stack Deployment
**Branch**: `feat/vercel-deployment`
**Status**: Ready for execution (Phases 4-7 pending manual deployment)
