# Error Handling Best Practices

## Quick Reference

| Scenario           | Tool           | Example            |
| ------------------ | -------------- | ------------------ |
| Component crashes  | Error Boundary | `error.tsx` file   |
| API failure        | React Query    | `onError` callback |
| SSR prefetch fails | Try-Catch      | Allow page render  |
| User action fails  | Toast + Sentry | Mutation error     |
| Log for debugging  | Sentry         | `captureError()`   |

---

## Error Boundaries

### When to Add error.tsx

✅ **Do add** at these locations:

- `app/error.tsx` - Global catch-all
- `app/global-error.tsx` - Root layout errors
- `app/dashboard/error.tsx` - Route-specific
- `app/threads/error.tsx` - Route-specific

❌ **Don't add** everywhere:

- Not needed for every route (inherit from parent)
- Not needed for API errors (React Query handles)

### Error Boundary Template

```typescript
'use client';

import { useEffect } from 'react';
import { captureError } from '@/lib/observability/monitoring';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, {
      tags: { location: 'route-name' },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="error-fallback">
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

---

## React Query Error Handling

### Query Errors

```typescript
const { data, error, isError } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  // Error is automatically logged to Sentry via global onError
});

// In component:
if (isError) {
  return <div>Failed to load: {error.message}</div>;
}
```

### Mutation Errors

```typescript
const mutation = useMutation({
  mutationFn: updateData,
  onError: (error) => {
    // Automatically logged to Sentry
    toast.error('Update failed');
  },
});
```

---

## SSR Error Handling

### Server Component Prefetch

```typescript
export default async function Page() {
  const queryClient = new QueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: ['data'],
      queryFn: () => fetchData(),
    });
  } catch (error) {
    // Log but don't crash
    captureError(error, {
      tags: { location: 'ssr-prefetch' },
    });
  }

  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
```

**Why try-catch here?**

- SSR prefetch failures shouldn't crash the page
- Client will fetch data with loading skeleton
- Sentry logs the failure for investigation

---

## Sentry Best Practices

### Capturing Errors

```typescript
import { captureError } from '@/lib/observability/monitoring';

try {
  riskyOperation();
} catch (error) {
  captureError(error, {
    tags: { feature: 'upload' },
    extra: { fileName: 'doc.pdf' },
    level: 'error',
  });
}
```

### Filtering Noise

Already configured to ignore:

- React Query canceled requests
- Aborted fetch requests
- ResizeObserver loop exceeded

### User Context

Automatically set on login:

```typescript
setUser({
  id: user.id,
  email: user.email,
  username: user.full_name,
});
```

---

## Common Patterns

### Upload Errors

```typescript
try {
  await uploadFile(file);
} catch (error) {
  const message = parseUploadError(error);
  toast.error(message);
  // Already logged to Sentry via React Query
}
```

### Organization Errors

```typescript
if (isOrganizationError(error)) {
  toast.error(getOrganizationErrorMessage(error));
}
// Already logged to Sentry
```

### Streaming (SSE) Errors

```typescript
eventSource.onerror = (event) => {
  captureError(new Error('SSE connection failed'), {
    tags: { feature: 'streaming' },
    extra: { readyState: eventSource.readyState },
  });
};
```

---

## Testing Error Handling

### Test Error Boundaries

```typescript
// Throw error in component to test fallback UI
if (process.env.NODE_ENV === 'development' && testMode) {
  throw new Error('Test error boundary');
}
```

### Test Sentry Integration

```bash
# Sentry provides test command
npx @sentry/wizard@latest --i nextjs
# Throws test error to verify setup
```

### Test SSR Prefetch Failure

1. Break API endpoint temporarily
2. Load page - should render with loading skeleton
3. Check Sentry dashboard for logged error

---

## Performance Considerations

- **Sampling**: 10% of transactions monitored (not 100%)
- **Session Replay**: 10% of normal sessions, 100% of errors
- **Bundle Size**: Sentry adds ~50KB gzipped
- **Overhead**: <5ms per request with sampling

---

## Privacy & Security

### Session Replay Masking

```typescript
replayIntegration({
  maskAllText: false, // Don't mask all text
  blockAllMedia: true, // Block images/videos
});
```

### PII Handling

- Email/username logged to Sentry (useful for debugging)
- Passwords never logged (handled by backend)
- Credit cards masked automatically

### Data Retention

- Errors: 90 days
- Performance: 30 days
- Session Replay: 30 days

---

## Monitoring Checklist

Daily:

- [ ] Check Sentry dashboard for new errors
- [ ] Review session replays for top errors

Weekly:

- [ ] Review performance metrics
- [ ] Identify slow queries/routes
- [ ] Update error filtering if needed

Monthly:

- [ ] Review sampling rates (increase if budget allows)
- [ ] Archive resolved issues
- [ ] Update error messages based on user feedback
