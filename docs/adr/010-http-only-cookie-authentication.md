# ADR-010: HTTP-Only Cookie Authentication Strategy

**Status**: Proposed
**Date**: 2025-11-27
**Authors**: Engineering Team
**Story Points**: 8 (Hybrid approach - 1-2 weeks)
**Related Issues**: LOG-204, PR #37

---

## Executive Summary

This ADR defines the strategy for migrating from client-side cookie management (`document.cookie`) to HTTP-only cookies for improved security against XSS attacks. The current architecture uses a **dual token system** combining Supabase Auth with custom Olympus JWTs, making this migration more complex than a typical implementation.

**Decision**: Adopt a **Hybrid Architecture** (Supabase SSR + FastAPI Custom JWTs) that:

1. **Frontend**: Use Supabase's `@supabase/ssr` package for HTTP-only cookie management
2. **Token Exchange**: Next.js middleware exchanges Supabase tokens for Olympus JWTs
3. **Backend**: Keep FastAPI's custom JWT system for business logic, GraphQL, and SSE

This approach provides the best balance of security, maintainability, and migration risk while leveraging the strengths of both authentication systems.

---

## Context

### Current Architecture (Vulnerable State)

**Authentication Flow**:

```
Browser → FastAPI /auth/login → Authenticate with Supabase Auth
                               → Create custom Olympus JWT (embeds Supabase token)
                               → Store refresh token in Redis
                               → Return tokens in JSON response
        ← document.cookie = tokens ← VULNERABLE (not HTTP-only)
```

**Token Structure** (`apps/api/app/auth/service.py:155`):

```python
{
    "sub": user.id,
    "email": user.email,
    "role": user.user_metadata.get("role", "member"),
    "supabase_token": session.access_token,  # Embedded for RLS
    "exp": 1234567890,
    "iat": 1234567890
}
```

**Storage Locations**:

- **Frontend (Zustand + localStorage)**: `olympus-auth-token`, `olympus-refresh-token`
- **Backend (Redis)**: Refresh tokens with TTL, session data
- **Database (Supabase)**: RLS policies use embedded Supabase token

### Security Vulnerabilities

1. **XSS Attack Vector**: Tokens accessible via JavaScript (`document.cookie`)
2. **Token Theft**: Malicious scripts can steal tokens and impersonate users
3. **No CSRF Protection**: Client-side cookie management bypasses SameSite enforcement
4. **Documentation Mismatch**: Code claims "HTTP-only" but uses `document.cookie` (PR #37 feedback)

### Problem Statement

**Critical Issues Identified** (Copilot PR Review #37):

1. Cookie name mismatch: Documentation says `access_token` but codebase uses `olympus-auth-token`
2. Security vulnerability: Cookies are NOT HTTP-only (vulnerable to XSS)
3. Misleading documentation: Claims "HTTP-only cookie" but uses `document.cookie`

**User-Reported Bug**: "Spaces is not getting returned" - caused by query key mismatch (separate from auth issue but discovered during same review)

### Constraints

1. **Supabase Integration**: Current architecture depends on Supabase Auth for RLS policies
2. **Dual Token System**: Custom Olympus JWTs wrap Supabase tokens (complex to unwind)
3. **Redis Sessions**: Existing infrastructure for token management and blacklisting
4. **SSE Streaming**: EventSource API doesn't support custom headers or HTTP-only cookies
5. **Product Timeline**: Need secure solution without 3-5 week rewrite

---

## Decision

### Chosen Approach: Hybrid (Supabase SSR + FastAPI Custom JWTs)

**Architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Supabase SSR (@supabase/ssr)                            │   │
│  │  - HTTP-only cookies (automatic)                         │   │
│  │  - Token refresh (automatic)                             │   │
│  │  - RLS integration (direct)                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ GraphQL Request + Supabase Cookie
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS MIDDLEWARE                         │
│  1. Extract Supabase token from HTTP-only cookie               │
│  2. Exchange for Olympus JWT (POST /auth/exchange)             │
│  3. Forward Olympus JWT to FastAPI in Authorization header     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Authorization: Bearer <olympus-jwt>
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND LAYER                           │
│  FastAPI Custom JWT System (unchanged)                         │
│  - Verify Olympus JWT                                          │
│  - Extract embedded Supabase token                             │
│  - Use Supabase token for RLS queries                          │
│  - Redis session management                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Key Pattern**: **Token Exchange Middleware**

Frontend uses Supabase HTTP-only cookies, but Next.js middleware exchanges the Supabase token for an Olympus JWT before forwarding to FastAPI. This creates a clean separation of concerns:

- **Frontend (Supabase)**: User-facing auth, session management, direct database access
- **Backend (FastAPI)**: Business logic, GraphQL, AI agents, SSE

### Alternative Approaches Considered

| Approach            | Description                                      | Effort    | Risk       | Rejected Reason                                                                                            |
| ------------------- | ------------------------------------------------ | --------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Pure Supabase**   | Remove custom JWTs, use only `@supabase/ssr`     | 3-5 weeks | HIGH       | Too disruptive; removes FastAPI auth flexibility; would require removing entire `apps/api/app/auth/` layer |
| **Wrap Supabase**   | Keep dual tokens, FastAPI sets HTTP-only cookies | 2-3 weeks | MEDIUM     | Complex token sync; manual refresh logic; doesn't leverage Supabase's native HTTP-only support             |
| **Hybrid** (Chosen) | Supabase SSR frontend + FastAPI custom backend   | 1-2 weeks | LOW-MEDIUM | ✅ Best balance of security, maintainability, and migration risk                                           |

---

## Consequences

### Positive

✅ **Best Security Posture**: Leverages Supabase's battle-tested HTTP-only cookie implementation
✅ **Automatic Token Refresh**: Supabase handles refresh logic automatically (no manual code)
✅ **Minimal Backend Changes**: Keep FastAPI JWT system intact (no breaking changes)
✅ **Clean Separation of Concerns**: Frontend uses Supabase, backend uses custom JWTs
✅ **RLS Compatibility**: Embedded Supabase token preserved for PostgreSQL policies
✅ **Future Flexibility**: Easy to replace FastAPI auth or Supabase independently
✅ **Gradual Migration**: Can test token exchange in staging without breaking production
✅ **Leverages Existing Code**: Token exchange pattern already implemented for SSE (`/auth/sse-token`)
✅ **XSS Protection**: Tokens no longer accessible via JavaScript
✅ **CSRF Protection**: SameSite=Lax cookies prevent cross-site attacks

### Negative

⚠️ **Token Exchange Overhead**: Additional API call per request (~50ms p95 target)
⚠️ **Architectural Complexity**: Two auth systems to understand (but already exists)
⚠️ **Documentation Required**: Team needs to understand hybrid model
⚠️ **Monitoring Needed**: Must track token exchange performance

### Risks and Mitigations

| Risk                                    | Impact                      | Mitigation                                                           |
| --------------------------------------- | --------------------------- | -------------------------------------------------------------------- |
| Token exchange latency (>100ms)         | Poor UX                     | Cache exchanged tokens with 5-minute TTL; add monitoring             |
| Supabase token expiry during request    | Failed requests             | Middleware retries with refreshed token automatically                |
| Breaking change to frontend auth hooks  | Developer disruption        | Gradual rollout; update Zustand store incrementally                  |
| Redis session storage becomes redundant | Wasted infrastructure       | Repurpose Redis for token exchange cache and rate limiting           |
| Team confusion about dual auth systems  | Developer velocity          | Create comprehensive docs (ADR + migration guide)                    |
| SSE EventSource API limitations         | Can't use HTTP-only cookies | Keep existing short-lived token exchange pattern (`/auth/sse-token`) |

---

## Implementation Notes

### Phase 1: Foundation (Week 1)

**Goal**: Establish token exchange infrastructure without breaking existing auth

**Tasks**:

1. Install `@supabase/ssr` in `apps/web`
2. Create token exchange endpoint (`POST /auth/exchange`) in FastAPI
3. Update Next.js middleware to exchange tokens for protected routes
4. Test basic login/logout flow with HTTP-only cookies

**Success Criteria**:

- ✅ Login sets Supabase HTTP-only cookies
- ✅ Token exchange endpoint returns valid Olympus JWT
- ✅ Middleware forwards Olympus JWT to GraphQL
- ✅ Existing auth still works (no breaking changes)

### Phase 2: SSR Integration (Week 1-2)

**Goal**: Update SSR data fetching to use token exchange pattern

**Tasks**:

1. Update `apps/web/src/app/dashboard/page.tsx` to use token exchange
2. Update spaces, documents, threads pages
3. Add token exchange caching (reduce API call overhead)
4. Fix query key hydration issues (from PR #37 feedback)

**Success Criteria**:

- ✅ No duplicate network requests (proper SSR hydration)
- ✅ Token exchange latency <50ms (p95)
- ✅ Spaces page displays data correctly (fixes user-reported bug)

### Phase 3: Cleanup & Optimization (Week 2)

**Goal**: Remove deprecated client-side cookie code and optimize performance

**Tasks**:

1. Remove `apps/web/src/lib/auth-cookies.ts` (deprecated)
2. Update Zustand auth store to remove token state (only keep user data)
3. Add monitoring for token exchange performance (Sentry/Datadog)
4. Update documentation (ADR, migration guide, CLAUDE.md)

**Success Criteria**:

- ✅ Zero client-side token access (HTTP-only cookies only)
- ✅ Token exchange cache hit rate >80%
- ✅ All tests pass (frontend + backend)
- ✅ Documentation complete

### SSE Authentication Pattern

**Challenge**: EventSource API doesn't support custom headers or HTTP-only cookies.

**Solution**: Short-lived token exchange endpoint (already implemented):

```typescript
// Frontend - Get SSE token
const response = await fetch('/api/auth/sse-token', {
  credentials: 'include', // Send HTTP-only cookies
});
const { token } = await response.json();

// Connect to SSE with 5-minute token
const eventSource = new EventSource(`/api/sse/stream?token=${token}`);
```

**Backend** (`routes/auth.py`):

```python
@router.get("/sse-token")
async def get_sse_token(request: Request):
    """Issue 5-minute token for SSE connection."""
    user = request.state.user
    token = jwt_manager.create_access_token(
        {"sub": user.id, "purpose": "sse"},
        expires_delta=timedelta(minutes=5)
    )
    return {"token": token}
```

This pattern continues to work with the hybrid approach (no changes needed).

### Token Exchange Caching Strategy

**Problem**: Token exchange on every request adds latency

**Solution**: Redis cache with 5-minute TTL

```python
# Pseudocode
cache_key = f"token_exchange:{supabase_token_hash}"
cached_olympus_token = await redis.get(cache_key)

if cached_olympus_token:
    return cached_olympus_token

olympus_token = create_olympus_jwt(supabase_user)
await redis.setex(cache_key, 300, olympus_token)  # 5-minute TTL
return olympus_token
```

**Expected Performance**:

- Cold request: ~50ms (token exchange)
- Cached request: ~5ms (Redis lookup)
- Cache hit rate target: >80%

---

## References

### Documentation

- [HTTP-Only Cookie Migration Analysis](../HTTP_ONLY_COOKIE_MIGRATION.md) - Detailed comparison of all approaches
- [HTTP-Only Cookie Migration Guide](../guides/http-only-cookie-migration.md) - Implementation steps for hybrid approach
- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [ADR-009: Next.js SSR with React Query](./009-nextjs-ssr-react-query.md) - Related SSR implementation

### Related Issues

- PR #37: Next.js SSR Implementation (Copilot review identified security issues)
- LOG-204: Next.js SSR with React Query
- User-reported bug: "Spaces is not getting returned" (query key mismatch)

### Code References

- Current auth implementation: `apps/api/app/auth/service.py:155` (dual token creation)
- Client-side cookies (vulnerable): `apps/web/src/lib/auth-cookies.ts`
- SSE token exchange (working pattern): `apps/api/app/routes/auth.py` (`/sse-token` endpoint)

---

## Reviewed By

- [ ] Tech Lead
- [ ] Security Engineer
- [ ] Backend Engineer (FastAPI/Python)
- [ ] Frontend Engineer (Next.js/React)
- [ ] Product Manager

---

## Next Steps

1. **Approval**: Review and approve this ADR
2. **Create Linear Ticket**: Implementation checklist with story points (LOG-XXX)
3. **Create Migration Guide**: Step-by-step instructions for developers
4. **Start Phase 1**: Foundation work in `feat/http-only-cookies` branch
5. **Staging Testing**: Validate token exchange performance and security
6. **Production Rollout**: Incremental deployment with monitoring
7. **Documentation Update**: Update `CLAUDE.md` and `docs/guides/frontend-guide.md`

---

_Last Updated: 2025-11-27_
_Author: Engineering Team_
