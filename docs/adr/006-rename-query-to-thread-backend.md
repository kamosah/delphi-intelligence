# ADR-006: Rename "Query" to "Thread" in Backend (API Consistency)

**Status**: Accepted
**Date**: 2025-11-06
**Deciders**: Engineering Team
**Technical Story**: Align backend naming with frontend terminology

---

## Context

**Current state**: Naming inconsistency between frontend and backend

**Frontend terminology**:

- "Threads" - Conversational AI interface
- Route: `/threads`
- Components: `ThreadInterface`, `ThreadsPanel`, `ThreadListItem`
- User-facing: "Start a new thread", "Thread history"

**Backend terminology**:

- "Queries" - Same entity, different name
- Database table: `queries`
- GraphQL type: `Query`
- Models: `Query`, `QueryMessage`

**The problem**:

- Confusing for developers: "Is a Query the same as a Thread?"
- Inconsistent codebase: Frontend uses "Thread", backend uses "Query"
- Harder to onboard new developers
- GraphQL `Query` type conflicts with GraphQL root `Query` type (naming collision)

## Decision

**Rename "Query" → "Thread" throughout the backend** to match frontend terminology.

### What Changes

**Database tables:**

```sql
-- BEFORE:
queries
query_messages
query_sources

-- AFTER:
threads
thread_messages
thread_sources (or thread_mentions per ADR-005)
```

**GraphQL schema:**

```graphql
# BEFORE:
type Query { # Confusing - conflicts with root Query
  id: UUID!
  spaceId: UUID!
  messages: [QueryMessage!]!
}

type QueryMessage {
  queryId: UUID!
  content: String!
}

# AFTER:
type Thread {
  id: UUID!
  organizationId: UUID!
  messages: [ThreadMessage!]!
}

type ThreadMessage {
  threadId: UUID!
  content: String!
}
```

**Python models:**

```python
# BEFORE:
from app.models import Query, QueryMessage

# AFTER:
from app.models import Thread, ThreadMessage
```

**API endpoints:**

```python
# BEFORE:
@router.post("/queries")
@router.get("/queries/{query_id}")

# AFTER:
@router.post("/threads")
@router.get("/threads/{thread_id}")
```

## Rationale

### Why Rename?

**Pros:**

1. **Consistency across stack**: Frontend and backend use same terminology
2. **Clearer semantics**: "Thread" better describes conversational nature
3. **Avoids GraphQL naming collision**: `Query` type vs root `Query` type
4. **Easier onboarding**: New developers don't have to learn two terms for same thing
5. **Aligns with industry**: Threads is common term (Slack threads, email threads, etc.)

**Cons:**

1. **Migration effort**: Need to rename tables, types, models (mitigated: early stage)
2. **Breaking change**: Existing GraphQL queries will break (mitigated: early stage, no external clients)

### Why NOT Keep "Query"?

**Option considered**: Keep backend as "Query", frontend as "Thread"

**Rejected because:**

- Confusing for developers
- Hard to maintain consistency
- "Query" doesn't convey conversational nature
- GraphQL naming collision (`Query` type vs root query)

**Better approach**: Align terminology now while we're early stage

## Migration Plan

**Since we're in early stages**, we can do a **direct rename** without backwards compatibility.

### Database Migration

```sql
-- Rename tables
ALTER TABLE queries RENAME TO threads;
ALTER TABLE query_messages RENAME TO thread_messages;
ALTER TABLE query_sources RENAME TO thread_sources;

-- Rename columns
ALTER TABLE thread_messages RENAME COLUMN query_id TO thread_id;
ALTER TABLE thread_sources RENAME COLUMN query_id TO thread_id;

-- Rename constraints
ALTER TABLE thread_messages
  DROP CONSTRAINT query_messages_query_id_fkey,
  ADD CONSTRAINT thread_messages_thread_id_fkey
    FOREIGN KEY (thread_id) REFERENCES threads(id);

ALTER TABLE thread_sources
  DROP CONSTRAINT query_sources_query_id_fkey,
  ADD CONSTRAINT thread_sources_thread_id_fkey
    FOREIGN KEY (thread_id) REFERENCES threads(id);

-- Rename indexes
ALTER INDEX idx_queries_space_id RENAME TO idx_threads_space_id;
ALTER INDEX idx_query_messages_query_id RENAME TO idx_thread_messages_thread_id;
```

### Backend Code Changes

**1. Models** (`app/models/`)

```python
# Rename files:
query.py → thread.py
query_message.py → thread_message.py

# Update class names:
class Query → class Thread
class QueryMessage → class ThreadMessage
class QuerySource → class ThreadSource
```

**2. GraphQL Schema** (`app/graphql/`)

```python
# Rename types:
@strawberry.type
class Query → class Thread

@strawberry.type
class QueryMessage → class ThreadMessage

# Update resolvers:
@strawberry.field
async def queries(...) → async def threads(...)

@strawberry.field
async def query(...) → async def thread(...)
```

**3. Services** (`app/services/`)

```python
# Rename files:
query_service.py → thread_service.py

# Update class names:
class QueryService → class ThreadService
```

**4. Routes** (`app/routes/`)

```python
# Update endpoint paths:
@router.post("/queries") → @router.post("/threads")
@router.get("/queries/{query_id}") → @router.get("/threads/{thread_id}")
```

**5. Tests**

```python
# Rename test files:
test_query.py → test_thread.py
test_query_service.py → test_thread_service.py

# Update test names:
def test_create_query() → def test_create_thread()
```

### Frontend Updates

**Minimal changes needed** (frontend already uses "Thread"):

1. Update GraphQL queries to use new type names:

```typescript
// BEFORE:
query GetQueries($spaceId: UUID!) {
  queries(spaceId: $spaceId) {
    id
    messages {
      content
    }
  }
}

// AFTER:
query GetThreads($organizationId: UUID!) {
  threads(organizationId: $organizationId) {
    id
    messages {
      content
    }
  }
}
```

2. Regenerate TypeScript types:

```bash
cd apps/web
npm run graphql:generate
```

3. Update any remaining "query" references to "thread"

## Implementation Checklist

### Backend

- [ ] Database migration: Rename tables (queries → threads)
- [ ] Database migration: Rename columns (query_id → thread_id)
- [ ] Database migration: Rename constraints and indexes
- [ ] Models: Rename Query → Thread
- [ ] Models: Rename QueryMessage → ThreadMessage
- [ ] Models: Rename QuerySource → ThreadSource
- [ ] GraphQL: Rename Query type → Thread type
- [ ] GraphQL: Rename queries/query resolvers → threads/thread
- [ ] Services: Rename QueryService → ThreadService
- [ ] Routes: Update endpoint paths
- [ ] Tests: Rename test files and test names
- [ ] Update imports across codebase

### Frontend

- [ ] Update GraphQL queries (queries → threads)
- [ ] Regenerate TypeScript types
- [ ] Update any remaining "query" references
- [ ] Verify all GraphQL queries work

### Documentation

- [ ] Update API documentation
- [ ] Update GraphQL schema documentation
- [ ] Update README references

## Rollback Plan

**If migration fails:**

1. Revert database migration (rename back to queries)
2. Revert code changes (git revert)
3. Investigate issues, fix, retry

**Data safety:**

- Migration is a rename only, no data loss
- Can be rolled back easily
- Test migration on development database first

## Consequences

### Positive

- ✅ **Consistent terminology** across frontend and backend
- ✅ **Clearer semantics**: "Thread" better describes conversational UI
- ✅ **No GraphQL naming collision**: Avoids `Query` type vs root `Query` conflict
- ✅ **Easier onboarding**: One term to learn, not two
- ✅ **Aligns with industry standards**: Threads is common term for conversations

### Negative

- ⚠️ **Migration effort**: 1-2 days to rename everything
- ⚠️ **Breaking change**: Existing GraphQL queries break (mitigated: early stage)
- ⚠️ **Git history**: Old "query" references will be confusing (acceptable trade-off)

### Risks and Mitigations

| Risk                           | Mitigation                                                  |
| ------------------------------ | ----------------------------------------------------------- |
| Migration breaks existing data | Test migration on dev database first, verify data integrity |
| Missed references to "query"   | Use global search/replace, run tests, review PR carefully   |
| GraphQL client breaks          | Regenerate types immediately after migration                |
| Confusion during migration     | Clear communication, document rename in migration notes     |

## Timeline

**1-2 days** for complete migration:

- Day 1: Backend migration (database + code)
- Day 2: Frontend updates + testing

## References

- ADR-005: Threads as Standalone Route
- Related: LOG-200 (Threads migration ticket)

---

**Author**: Engineering Team
**Last Updated**: 2025-11-06
**Status**: Accepted
