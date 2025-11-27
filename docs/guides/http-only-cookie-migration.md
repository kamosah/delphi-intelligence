# HTTP-Only Cookie Migration Guide

## Overview

This guide provides step-by-step instructions for migrating from client-side cookie management (`document.cookie`) to HTTP-only cookies using the **Hybrid Architecture** (Supabase SSR + FastAPI Custom JWTs).

**Related Documentation**:

- [ADR-010: HTTP-Only Cookie Authentication Strategy](../adr/010-http-only-cookie-authentication.md)
- [Frontend Guide](./frontend-guide.md)
- [Environment Setup Guide](./environment-setup.md)

**Estimated Timeline**: 1-2 weeks
**Story Points**: 8
**Risk Level**: LOW-MEDIUM

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Foundation](#phase-1-foundation-week-1)
3. [Phase 2: SSR Integration](#phase-2-ssr-integration-week-1-2)
4. [Phase 3: Cleanup & Optimization](#phase-3-cleanup--optimization-week-2)
5. [Testing Strategy](#testing-strategy)
6. [Rollback Plan](#rollback-plan)
7. [Monitoring & Observability](#monitoring--observability)

---

## Prerequisites

### Required Knowledge

- Next.js 14 App Router (Server Components, Middleware)
- Supabase Auth (`@supabase/ssr` package)
- FastAPI authentication patterns
- Redis caching strategies
- React Query SSR patterns

### Environment Setup

```bash
# Install Supabase SSR package
cd apps/web
npm install @supabase/ssr

# Verify Supabase credentials in .env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Pre-Migration Checklist

- [ ] All team members have reviewed ADR-010
- [ ] Staging environment is ready for testing
- [ ] Monitoring tools configured (Sentry/Datadog)
- [ ] Create feature branch: `feat/http-only-cookies`
- [ ] Backup current auth implementation (for rollback)

---

## Phase 1: Foundation (Week 1)

**Goal**: Establish token exchange infrastructure without breaking existing auth

### Step 1.1: Create Token Exchange Endpoint (Backend)

**File**: `apps/api/app/routes/auth.py`

Add the following endpoint:

```python
from fastapi import APIRouter, HTTPException, Header, Depends
from supabase import create_client
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.auth.jwt_manager import JWTManager
from app.db.session import get_db
from app.models.user import User
import os

router = APIRouter(prefix="/auth", tags=["auth"])
jwt_manager = JWTManager()

# Initialize Supabase client with service role key
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

@router.post("/exchange")
async def exchange_token(
    authorization: str = Header(..., alias="Authorization"),
    db: AsyncSession = Depends(get_db)
):
    """
    Exchange Supabase token for Olympus JWT.

    Called by Next.js middleware before forwarding to GraphQL/SSE.

    Args:
        authorization: "Bearer <supabase_token>" from Supabase HTTP-only cookie
        db: Database session

    Returns:
        {"olympus_token": "<jwt>"}

    Raises:
        HTTPException: 401 if Supabase token is invalid
    """
    # Extract token from header
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    supabase_token = authorization.replace("Bearer ", "")

    # Verify Supabase token and get user
    try:
        user_response = supabase.auth.get_user(supabase_token)
        supabase_user = user_response.user

        if not supabase_user:
            raise HTTPException(status_code=401, detail="Invalid Supabase token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")

    # Fetch user from database for role and metadata
    result = await db.execute(
        select(User).where(User.id == supabase_user.id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found in database")

    # Create Olympus JWT with embedded Supabase token
    olympus_token = jwt_manager.create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "supabase_token": supabase_token,  # Embed for RLS queries
    })

    return {"olympus_token": olympus_token}
```

**Environment Variables** (add to `apps/api/.env`):

```bash
# Supabase (should already exist)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # NOT anon key!
```

### Step 1.2: Create Supabase Client Utilities (Frontend)

**File**: `apps/web/src/lib/supabase/client.ts` (new file)

```typescript
import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for Client Components.
 * Automatically manages HTTP-only cookies.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**File**: `apps/web/src/lib/supabase/server.ts` (new file)

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase client for Server Components and API routes.
 * Manages HTTP-only cookies via Next.js cookies() API.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
```

**File**: `apps/web/src/lib/api/graphql-server-client.ts` (update/replace existing)

````typescript
import { GraphQLClient } from 'graphql-request';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Get authenticated GraphQL client for Server Components.
 *
 * This utility:
 * 1. Checks Supabase session (redirects to /login if not authenticated)
 * 2. Exchanges Supabase token for Olympus JWT
 * 3. Returns GraphQL client with Olympus JWT in Authorization header
 *
 * Usage in Server Components:
 * ```typescript
 * const graphqlClient = await getServerGraphQLClient();
 * const data = await fetchSpaces(graphqlClient);
 * ```
 */
export async function getServerGraphQLClient(): Promise<GraphQLClient> {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Exchange Supabase token for Olympus JWT and return client
  try {
    const exchangeResponse = await fetch(
      `${process.env.API_URL}/auth/exchange`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: 'no-store',
      }
    );

    if (!exchangeResponse.ok) {
      const errorText = await exchangeResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const { olympus_token } = await exchangeResponse.json();

    // Return GraphQL client with Olympus JWT
    return new GraphQLClient(process.env.GRAPHQL_URL!, {
      headers: {
        Authorization: `Bearer ${olympus_token}`,
      },
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    redirect('/login');
  }
}
````

### Step 1.3: Update Next.js Middleware for Token Exchange

**File**: `apps/web/src/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session (updates HTTP-only cookies automatically)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Token exchange for API routes that need Olympus JWT
  if (
    session &&
    (request.nextUrl.pathname.startsWith('/api/graphql') ||
      request.nextUrl.pathname.startsWith('/api/sse'))
  ) {
    try {
      // Exchange Supabase token for Olympus JWT
      const exchangeResponse = await fetch(
        `${process.env.API_URL}/auth/exchange`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (exchangeResponse.ok) {
        const { olympus_token } = await exchangeResponse.json();

        // Forward Olympus JWT to backend
        response.headers.set('Authorization', `Bearer ${olympus_token}`);
      } else {
        console.error('Token exchange failed:', await exchangeResponse.text());
      }
    } catch (error) {
      console.error('Token exchange error:', error);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

**Environment Variables** (add to `apps/web/.env.local`):

```bash
# Backend API URL (should already exist)
API_URL=http://localhost:8000
```

### Step 1.4: Update Login Flow (Frontend)

**File**: `apps/web/src/components/auth/LoginForm.tsx`

Replace the current login logic:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Input } from '@olympus/ui';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Supabase automatically sets HTTP-only cookies
      // No manual token storage needed!
      router.push('/dashboard');
      router.refresh(); // Refresh server components
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Logging in...' : 'Log In'}
      </Button>
    </form>
  );
}
```

### Step 1.5: Update Logout Flow (Frontend)

**File**: `apps/web/src/components/layout/UserMenu.tsx` (or wherever logout button is)

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function UserMenu() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button onClick={handleLogout}>
      Log Out
    </button>
  );
}
```

### Step 1.6: Testing Phase 1

**Manual Testing**:

1. Start backend: `cd apps/api && docker compose up`
2. Start frontend: `cd apps/web && npm run dev`
3. Open browser DevTools → Application → Cookies
4. Log in and verify:
   - ✅ Cookies named `sb-<project-id>-auth-token` exist
   - ✅ Cookies have `HttpOnly` flag set
   - ✅ No `olympus-auth-token` in localStorage
   - ✅ Redirect to dashboard works

**Backend Testing**:

```bash
# Test token exchange endpoint
curl -X POST http://localhost:8000/auth/exchange \
  -H "Authorization: Bearer <supabase_token>" \
  | jq

# Expected response:
# {"olympus_token": "eyJ..."}
```

**Success Criteria**:

- ✅ Login sets Supabase HTTP-only cookies
- ✅ Token exchange returns valid Olympus JWT
- ✅ Middleware forwards JWT to protected routes
- ✅ Existing auth still works (no breaking changes)

---

## Phase 2: SSR Integration (Week 1-2)

**Goal**: Update SSR data fetching to use token exchange pattern

### Step 2.1: Update Dashboard SSR Page

**File**: `apps/web/src/app/dashboard/page.tsx`

```typescript
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import { fetchDashboardStats, fetchDocuments, fetchThreads } from '@/lib/api/server-fetchers';
import { queryKeys } from '@/lib/query/query-keys';

export default async function DashboardPage() {
  // Get authenticated GraphQL client (handles auth check + token exchange)
  const graphqlClient = await getServerGraphQLClient();

  const queryClient = new QueryClient();

  // Prefetch data for SSR (parallel requests)
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.stats(null),
      queryFn: () => fetchDashboardStats(graphqlClient, { organizationId: null }),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.documents.list(null, { limit: 3, offset: 0 }), // ✅ Fixed from PR #37
      queryFn: () => fetchDocuments(graphqlClient, { limit: 3, offset: 0 }),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.threads.list({ organizationId: null, limit: 3, offset: 0 }), // ✅ Fixed
      queryFn: () => fetchThreads(graphqlClient, { organizationId: null, limit: 3, offset: 0 }),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
```

### Step 2.2: Update Spaces SSR Page

**File**: `apps/web/src/app/dashboard/spaces/page.tsx`

```typescript
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { SpacesClient } from '@/components/spaces/SpacesClient';
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import { fetchSpaces } from '@/lib/api/server-fetchers';
import { queryKeys } from '@/lib/query/query-keys';

export default async function SpacesPage() {
  // Get authenticated GraphQL client (handles auth check + token exchange)
  const graphqlClient = await getServerGraphQLClient();

  const queryClient = new QueryClient();

  // Prefetch spaces (fixes user-reported bug: "spaces is not getting returned")
  await queryClient.prefetchQuery({
    queryKey: queryKeys.spaces.list({ limit: undefined, offset: undefined }), // ✅ Fixed from PR #37
    queryFn: () => fetchSpaces(graphqlClient),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SpacesClient />
    </HydrationBoundary>
  );
}
```

### Step 2.3: Update Documents SSR Page

**File**: `apps/web/src/app/dashboard/documents/page.tsx`

```typescript
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { DocumentsClient } from '@/components/documents/DocumentsClient';
import { getServerGraphQLClient } from '@/lib/api/graphql-server-client';
import { fetchDocuments } from '@/lib/api/server-fetchers';
import { queryKeys } from '@/lib/query/query-keys';

export default async function DocumentsPage() {
  // Get authenticated GraphQL client (handles auth check + token exchange)
  const graphqlClient = await getServerGraphQLClient();

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.documents.list(null, { limit: undefined, offset: undefined }), // ✅ Match client default
    queryFn: () => fetchDocuments(graphqlClient),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DocumentsClient />
    </HydrationBoundary>
  );
}
```

### Step 2.4: Add Token Exchange Caching (Backend)

**File**: `apps/api/app/routes/auth.py`

Update the `/exchange` endpoint to add Redis caching:

```python
from app.core.redis import get_redis_client
import hashlib

@router.post("/exchange")
async def exchange_token(
    authorization: str = Header(..., alias="Authorization"),
    db: AsyncSession = Depends(get_db)
):
    """Exchange Supabase token for Olympus JWT with caching."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    supabase_token = authorization.replace("Bearer ", "")

    # Check cache first (5-minute TTL)
    redis_client = await get_redis_client()
    cache_key = f"token_exchange:{hashlib.sha256(supabase_token.encode()).hexdigest()}"

    cached_token = await redis_client.get(cache_key)
    if cached_token:
        return {"olympus_token": cached_token.decode()}

    # Verify Supabase token
    try:
        user_response = supabase.auth.get_user(supabase_token)
        supabase_user = user_response.user

        if not supabase_user:
            raise HTTPException(status_code=401, detail="Invalid Supabase token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")

    # Fetch user from database
    result = await db.execute(
        select(User).where(User.id == supabase_user.id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found in database")

    # Create Olympus JWT
    olympus_token = jwt_manager.create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "supabase_token": supabase_token,
    })

    # Cache for 5 minutes (300 seconds)
    await redis_client.setex(cache_key, 300, olympus_token)

    return {"olympus_token": olympus_token}
```

### Step 2.5: Testing Phase 2

**SSR Hydration Test**:

1. Open DevTools → Network tab
2. Navigate to `/dashboard`
3. Verify:
   - ✅ Initial HTML contains prefetched data
   - ✅ NO duplicate GraphQL requests for stats/documents/threads
   - ✅ No loading spinners on initial render

**Query Key Mismatch Test** (fixes from PR #37):

1. Check React Query DevTools
2. Verify query keys match between server and client:
   - `documents.list(null, {limit: 3, offset: 0})` ✅
   - `threads.list({organizationId: null, limit: 3, offset: 0})` ✅
   - `spaces.list({limit: undefined, offset: undefined})` ✅

**Spaces Bug Test** (user-reported):

1. Navigate to `/dashboard/spaces`
2. Verify:
   - ✅ Spaces list displays immediately (no loading)
   - ✅ No "spaces is not getting returned" error

**Performance Test**:

```bash
# Monitor token exchange latency
curl -w "\nTime: %{time_total}s\n" \
  -X POST http://localhost:8000/auth/exchange \
  -H "Authorization: Bearer <supabase_token>"

# Target: <50ms (p95) for cached requests
```

---

## Phase 3: Cleanup & Optimization (Week 2)

**Goal**: Remove deprecated code and optimize performance

### Step 3.1: Remove Deprecated Client-Side Cookie Code

**File**: `apps/web/src/lib/auth-cookies.ts` (DELETE THIS FILE)

This file is no longer needed - Supabase manages cookies automatically.

```bash
cd apps/web
git rm src/lib/auth-cookies.ts
```

### Step 3.2: Update Zustand Auth Store

**File**: `apps/web/src/lib/stores/auth-store.ts`

Remove token state (tokens now in HTTP-only cookies):

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  // NOTE: No token state - handled by Supabase HTTP-only cookies
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,

      setUser: (user) => set({ user }),

      logout: async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        set({ user: null });
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user }), // Only persist user, not tokens
    }
  )
);
```

### Step 3.3: Update GraphQL Client (Remove Token Injection)

**File**: `apps/web/src/lib/api/graphql-client.ts`

Simplify client-side GraphQL client (tokens sent via cookies automatically):

```typescript
import { GraphQLClient } from 'graphql-request';

/**
 * Client-side GraphQL client.
 *
 * NOTE: Does NOT need Authorization header - middleware handles token exchange
 * and forwards Olympus JWT to backend automatically.
 */
export const graphqlClient = new GraphQLClient(
  process.env.NEXT_PUBLIC_GRAPHQL_URL!,
  {
    credentials: 'include', // Send cookies with requests
  }
);
```

### Step 3.4: Update Documentation

**Files to Update**:

1. **`docs/guides/server-side-fetchers.md`**:
   - Fix cookie name: `olympus-auth-token` → `sb-<project-id>-auth-token`
   - Add note about HTTP-only cookies (not `document.cookie`)
   - Document token exchange pattern

2. **`apps/web/src/lib/api/graphql-server-client.ts`** (comments):
   - Remove misleading "HTTP-only cookie" claim
   - Document Supabase HTTP-only cookies
   - Explain token exchange flow

3. **`CLAUDE.md`** (Architecture section):
   - Update authentication flow diagram
   - Document hybrid auth approach
   - Add references to ADR-010 and migration guide

4. **`docs/guides/frontend-guide.md`** (Authentication section):
   - Add Supabase SSR patterns
   - Document token exchange middleware
   - Update login/logout examples

### Step 3.5: Add Monitoring

**Backend - Token Exchange Metrics**:

```python
# Add to apps/api/app/routes/auth.py
import time
from app.core.metrics import record_metric  # Assuming metrics setup

@router.post("/exchange")
async def exchange_token(...):
    start_time = time.time()

    # ... existing code ...

    # Record metrics
    duration_ms = (time.time() - start_time) * 1000
    cache_hit = cached_token is not None

    await record_metric("token_exchange.duration_ms", duration_ms, {
        "cache_hit": cache_hit
    })

    return {"olympus_token": olympus_token}
```

**Frontend - Error Tracking**:

```typescript
// apps/web/src/middleware.ts
import * as Sentry from '@sentry/nextjs';

// Inside token exchange logic:
if (!exchangeResponse.ok) {
  Sentry.captureException(new Error('Token exchange failed'), {
    extra: {
      status: exchangeResponse.status,
      path: request.nextUrl.pathname,
    },
  });
}
```

### Step 3.6: Final Testing Phase 3

**Regression Testing**:

- [ ] All existing auth flows work (login, logout, refresh)
- [ ] SSR pages load without duplicate requests
- [ ] Spaces page displays data correctly
- [ ] Client-side routing maintains auth state
- [ ] Token exchange metrics appear in monitoring dashboard

**Security Verification**:

- [ ] Tokens NOT accessible via `document.cookie`
- [ ] Cookies have `HttpOnly` flag
- [ ] Cookies have `SameSite=Lax` or `Strict`
- [ ] Cookies have `Secure` flag (HTTPS only)

**Performance Benchmarks**:

- [ ] Token exchange latency <50ms (p95)
- [ ] Cache hit rate >80%
- [ ] No increase in page load times

---

## Testing Strategy

### Unit Tests

**Backend - Token Exchange**:

```python
# apps/api/tests/routes/test_auth.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_token_exchange_success(client: AsyncClient, supabase_token: str):
    """Test successful token exchange."""
    response = await client.post(
        "/auth/exchange",
        headers={"Authorization": f"Bearer {supabase_token}"}
    )

    assert response.status_code == 200
    assert "olympus_token" in response.json()

@pytest.mark.asyncio
async def test_token_exchange_invalid_token(client: AsyncClient):
    """Test token exchange with invalid Supabase token."""
    response = await client.post(
        "/auth/exchange",
        headers={"Authorization": "Bearer invalid_token"}
    )

    assert response.status_code == 401
```

**Frontend - Middleware**:

```typescript
// apps/web/__tests__/middleware.test.ts
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

describe('Middleware', () => {
  it('redirects to login if not authenticated', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/dashboard'));
    const response = await middleware(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get('Location')).toContain('/login');
  });
});
```

### Integration Tests

**End-to-End Flow**:

```typescript
// apps/web/e2e/auth.spec.ts (Playwright)
import { test, expect } from '@playwright/test';

test('login flow with HTTP-only cookies', async ({ page, context }) => {
  await page.goto('/login');

  // Fill login form
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Wait for redirect
  await page.waitForURL('/dashboard');

  // Verify HTTP-only cookies
  const cookies = await context.cookies();
  const authCookie = cookies.find((c) => c.name.startsWith('sb-'));

  expect(authCookie).toBeDefined();
  expect(authCookie?.httpOnly).toBe(true);
  expect(authCookie?.sameSite).toBe('Lax');
  expect(authCookie?.secure).toBe(true);

  // Verify no tokens in localStorage
  const localStorage = await page.evaluate(() =>
    Object.keys(window.localStorage)
  );
  expect(localStorage).not.toContain('olympus-auth-token');
});
```

### Manual Testing Checklist

**Phase 1**:

- [ ] Login sets Supabase HTTP-only cookies
- [ ] Token exchange endpoint returns valid JWT
- [ ] Middleware forwards JWT to protected routes
- [ ] Existing auth flows still work

**Phase 2**:

- [ ] Dashboard SSR loads without duplicate requests
- [ ] Spaces page displays data correctly
- [ ] Documents page hydrates properly
- [ ] Query keys match between server and client

**Phase 3**:

- [ ] Deprecated `auth-cookies.ts` removed
- [ ] Zustand store updated (no token state)
- [ ] Documentation updated
- [ ] Monitoring shows healthy metrics

---

## Rollback Plan

### If Issues Arise During Migration

**Step 1: Stop Deployment**

```bash
# Stop frontend deployment
vercel --prod rollback

# Stop backend deployment (if applicable)
# Depends on hosting provider
```

**Step 2: Revert Code Changes**

```bash
# Revert to previous commit
git revert HEAD~3..HEAD  # Adjust range as needed

# Or reset to last stable commit
git reset --hard <commit-hash>
git push --force
```

**Step 3: Restore Client-Side Cookie Management**

If you need to quickly restore the old system:

1. Restore `apps/web/src/lib/auth-cookies.ts` from git history
2. Revert Zustand auth store to previous version
3. Remove Supabase SSR package: `npm uninstall @supabase/ssr`
4. Redeploy frontend

**Step 4: Database/Redis Cleanup**

No database changes required for rollback - Redis cache will naturally expire.

---

## Monitoring & Observability

### Key Metrics to Track

**Backend**:

- `token_exchange.duration_ms` (p50, p95, p99)
- `token_exchange.cache_hit_rate` (target: >80%)
- `token_exchange.errors` (should be near zero)
- `auth.session_duration` (average session length)

**Frontend**:

- Page load time for dashboard routes
- Time to First Contentful Paint (FCP)
- Cumulative Layout Shift (CLS) - should not increase
- Client-side errors related to auth

### Alerting Rules

**Critical**:

- Token exchange error rate >5% for 5 minutes
- Token exchange p95 latency >100ms for 10 minutes
- Cache hit rate <50% for 15 minutes

**Warning**:

- Token exchange p95 latency >50ms for 5 minutes
- Cache hit rate <80% for 10 minutes

### Debugging Common Issues

**Issue: "Token exchange failed"**

Check:

1. Supabase service role key is correct
2. Supabase token is still valid (not expired)
3. User exists in database
4. Redis connection is healthy

**Issue: "Spaces is not getting returned"**

Check:

1. Query key matches between server and client (should be `{limit: undefined, offset: undefined}`)
2. Token exchange succeeded
3. GraphQL client has valid JWT
4. Backend RLS policies allow user to read spaces

**Issue: "Session expired" errors**

Check:

1. Middleware is refreshing Supabase session
2. Token exchange cache TTL is appropriate (5 minutes)
3. Supabase token refresh is working

---

## Success Criteria

### Security

- ✅ Zero client-side token access (HTTP-only cookies only)
- ✅ Cookies have `HttpOnly`, `Secure`, `SameSite` flags
- ✅ No tokens in localStorage or Zustand state
- ✅ Token exchange uses HTTPS only

### Performance

- ✅ Token exchange latency <50ms (p95)
- ✅ Cache hit rate >80%
- ✅ No increase in page load times
- ✅ No duplicate network requests (SSR hydration works)

### Functionality

- ✅ Login/logout flows work correctly
- ✅ SSR pages load with prefetched data
- ✅ Spaces page displays correctly (fixes user bug)
- ✅ Query key mismatches resolved (PR #37 fixes)
- ✅ All existing tests pass

### Developer Experience

- ✅ Documentation updated (ADR, guides, CLAUDE.md)
- ✅ Team understands hybrid architecture
- ✅ Monitoring dashboards configured
- ✅ Rollback plan tested and documented

---

## FAQ

**Q: Why not use pure Supabase and remove FastAPI auth entirely?**

A: The hybrid approach preserves FastAPI's custom JWT system, which provides:

- Flexibility to add custom claims (roles, permissions)
- Control over token lifecycle and revocation
- Integration with Redis session management
- Easier migration if we switch auth providers later

**Q: What's the performance overhead of token exchange?**

A: With Redis caching:

- Cold request: ~50ms (Supabase verification + JWT creation)
- Cached request: ~5ms (Redis lookup)
- Target cache hit rate: >80%
- Net overhead: <10ms per request on average

**Q: How does this affect SSE streaming?**

A: No changes needed! The existing SSE token exchange pattern (`/auth/sse-token`) continues to work. EventSource API still uses short-lived tokens (5 minutes) passed as query parameters.

**Q: What if Supabase goes down?**

A: Login/logout would be affected (Supabase dependency), but existing sessions would continue working until tokens expire (24 hours). FastAPI backend can still verify cached Olympus JWTs independently.

**Q: Can we still use Zustand for auth state?**

A: Yes, but only for user data (not tokens). Zustand stores `user` object, while Supabase manages tokens in HTTP-only cookies. This keeps the UI reactive while improving security.

---

## Next Steps After Migration

1. **Security Audit**: Have security team review implementation
2. **Performance Baseline**: Establish baseline metrics in production
3. **Team Training**: Ensure all developers understand hybrid architecture
4. **Future Enhancements**:
   - Consider migrating to Supabase Realtime for live collaboration
   - Implement token rotation for additional security
   - Add 2FA support via Supabase Auth
5. **Documentation**: Keep migration guide updated as product evolves

---

_Last Updated: 2025-11-27_
_Author: Engineering Team_
