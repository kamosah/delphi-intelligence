# ADR 012: Error Handling & Observability with Sentry

## Status

Accepted

## Context

The Olympus application uses Next.js 14 App Router with Server Components, React Query for data fetching, and SSR prefetching. We need:

1. **Production observability** - Ability to track errors, performance, and user sessions
2. **Graceful error handling** - Prevent white screens, provide fallback UI
3. **Debugging capability** - Session replay to reproduce user-reported bugs
4. **Performance monitoring** - Identify slow routes and queries

Current state:

- ✅ React Query with retry logic
- ✅ Try-catch in SSR prefetch
- ❌ No error boundaries
- ❌ No monitoring/logging

## Decision

### 1. Adopt Sentry for Observability

Use `@sentry/nextjs` for:

- Error tracking (client + server)
- Performance monitoring (10% sample rate)
- Session replay (10% normal, 100% on errors)
- Release tracking via Git SHA

### 2. Layered Error Handling Strategy

**Layer 1: Error Boundaries**

- Catch React render errors
- Provide fallback UI with retry buttons
- Place at: root (`error.tsx`), layout (`global-error.tsx`), and route-specific (`dashboard/error.tsx`)

**Layer 2: React Query**

- Automatic retry with exponential backoff
- Global `onError` handler logs to Sentry
- Toast notifications for user-facing errors

**Layer 3: Try-Catch in SSR**

- Keep existing try-catch blocks in Server Components
- Allow page to render even if prefetch fails
- Log failures to Sentry for investigation

**Layer 4: Sentry (All Errors)**

- Centralized error logging
- Session replay for debugging
- Performance metrics

### 3. Error Filtering

Ignore noise:

- React Query canceled/aborted requests
- ResizeObserver loop exceeded
- Non-Error promise rejections

### 4. User Context

- Set Sentry user on login
- Clear on logout
- Include user ID, email, username

## Alternatives Considered

### Alternative 1: LogRocket

- **Pros**: Better session replay, Redux/Zustand inspection
- **Cons**: More expensive, less error aggregation features
- **Decision**: Sentry has better error grouping and is industry standard

### Alternative 2: Datadog RUM

- **Pros**: Unified if using Datadog for backend
- **Cons**: More expensive, complex setup
- **Decision**: Sentry is better for frontend-first teams

### Alternative 3: PostHog

- **Pros**: Open source, self-hostable
- **Cons**: Less mature error tracking, session replay in beta
- **Decision**: Sentry is more battle-tested

### Alternative 4: Remove Try-Catch, Use Only Error Boundaries

- **Pros**: Simpler code, centralized handling
- **Cons**: SSR prefetch failures would crash pages
- **Decision**: Keep try-catch for graceful degradation

## Consequences

### Positive

- ✅ Full visibility into production errors
- ✅ Can reproduce user-reported bugs via session replay
- ✅ Performance bottlenecks identified automatically
- ✅ Graceful degradation prevents white screens
- ✅ Users see helpful error messages instead of crashes

### Negative

- ⚠️ Additional dependency (`@sentry/nextjs`)
- ⚠️ Performance overhead (minimal with 10% sampling)
- ⚠️ Cost (~$26/month for 50K events after free tier)
- ⚠️ Privacy concerns with session replay (mitigated by masking PII)

### Neutral

- Keep try-catch in SSR (adds code but necessary)
- Error boundaries add boilerplate (but standard React pattern)

## Implementation Notes

1. **Environment Variables**: Add `NEXT_PUBLIC_SENTRY_DSN` to `.env`
2. **Source Maps**: Sentry wizard auto-configures source map upload
3. **Release Tracking**: Use Vercel Git SHA for release tags
4. **Sampling**: 10% in production, 100% in dev/staging
5. **Testing**: Sentry has test mode - trigger errors to verify

## References

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [React Query Error Handling](https://tanstack.com/query/latest/docs/react/guides/query-error-handling)
