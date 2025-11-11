# ADR-005: Threads as Standalone Route with Mentions System

**Status**: Implemented ✅
**Date**: 2025-11-06
**Implementation Date**: 2025-11-10
**Deciders**: Engineering Team
**Technical Story**: LOG-201 (move threads to top-level route)

---

## Implementation Summary

**Completed**: 2025-11-10 as part of LOG-201

**Key changes**:

- ✅ Moved threads from `/dashboard/threads` to `/threads` (top-level route)
- ✅ Added AppHeader and AppSidebar to threads layout
- ✅ ThreadsPanel positioned at bottom with proper spacing (`gap-6` between interface and panel)
- ✅ Backend supports org-wide threads (`organization_id` required, `space_id` optional)
- ✅ Updated all navigation links and route references
- ✅ Skeleton loading for OrganizationSwitcher

**Note**: Mentions system (from this ADR) is planned for future phase - threads currently use org-wide queries without explicit mention syntax.

---

## Context

Currently, Threads are **scoped to spaces**:

- Route structure: `/spaces/:id/threads`
- Users navigate to a space first, then access threads
- Threads can only query documents within that space
- No cross-space querying capability

With the **upcoming mentions system** (ADR-003), users will be able to explicitly select data sources:

- `@sales_database` - Mention database
- `@Q1_report.pdf` - Mention specific document
- `@Marketing/2024` - Mention folder
- `@space:Sales` - Mention entire space

This makes space-scoped threads **redundant** - users can achieve the same filtering via mentions.

## Problem

**Current architecture limitations:**

1. **User friction**: Must navigate to space before starting a conversation
   - Extra click: Dashboard → Spaces → Select Space → Threads
   - Interrupts workflow: "I just want to ask a question"

2. **No cross-space queries**: Can't query documents from multiple spaces
   - Example: "Compare sales data from Sales space with marketing metrics from Marketing space"
   - Workaround: Create duplicate documents in multiple spaces (bad DX)

3. **Threads tightly coupled to spaces**:

   ```sql
   CREATE TABLE threads (
     id UUID PRIMARY KEY,
     space_id UUID NOT NULL REFERENCES spaces(id), -- Required ⚠️
     title VARCHAR(255),
     created_at TIMESTAMP
   );
   ```

   - Every thread MUST belong to a space
   - Can't have org-wide threads
   - Can't have threads that span multiple spaces

4. **Inconsistent with other routes**:
   - `/documents` - Org-wide, filter by space
   - `/threads` - Space-scoped, can't filter
   - Users expect consistency

## Decision

**Move Threads to standalone top-level route**: `/threads`

### New Architecture

**Route structure:**

```
/threads                           # Top-level threads (NEW)
/threads/:threadId                 # Specific thread (NEW)
/spaces/:id/threads                # DEPRECATED (redirect to /threads)
/spaces/:id/threads/:threadId      # DEPRECATED (redirect to /threads/:threadId)
```

**Data model changes:**

```sql
-- BEFORE (space-scoped):
CREATE TABLE threads (
  id UUID PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES spaces(id), -- Required
  title VARCHAR(255),
  created_at TIMESTAMP
);

-- AFTER (standalone with optional space):
CREATE TABLE threads (
  id UUID PRIMARY KEY,
  space_id UUID REFERENCES spaces(id), -- Optional, for backwards compat
  organization_id UUID NOT NULL REFERENCES organizations(id), -- Required
  title VARCHAR(255),
  created_at TIMESTAMP
);

-- Thread mentions (new table):
CREATE TABLE thread_mentions (
  id UUID PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES threads(id),
  mention_type VARCHAR(50) NOT NULL, -- 'document', 'database', 'folder', 'space'
  mention_id UUID NOT NULL, -- ID of mentioned entity
  created_at TIMESTAMP
);
```

**UI changes:**

1. **ThreadsPanel location**: Bottom of conversation (below input), toggleable
   - Replaces left sidebar
   - Keeps focus on current conversation
   - Resizable (200-400px height)

2. **Mentions system**: Primary way to select data sources
   - Type `@` to open mentions dropdown
   - Search for documents, databases, folders, spaces
   - Selected mentions shown as pills in input

3. **Navigation**: Direct access from top-level nav
   - Dashboard → Threads (no space selection needed)
   - Start asking questions immediately

## Rationale

### Why Standalone Route?

**Pros:**

1. **Faster workflow**: One less navigation step
   - Before: Dashboard → Spaces → Select Space → Threads → Ask
   - After: Dashboard → Threads → Ask (50% fewer clicks)

2. **Cross-space queries enabled**:

   ```
   User: "@sales_database @marketing_docs Compare Q1 revenue with marketing spend"
   AI: [Queries both data sources, provides unified analysis]
   ```

3. **Consistent with mentions paradigm**:
   - Users explicitly declare what data to query via mentions
   - No need for implicit space scoping
   - More flexible and powerful

4. **Aligns with `/documents` route**:
   - Both are org-wide with optional filtering
   - Consistent mental model across the platform

5. **Simpler backend**:
   - Threads belong to organization, not space
   - No complex space permission inheritance
   - Permissions checked on mentioned entities, not thread container

**Cons:**

1. **Migration complexity**: Existing threads are space-scoped
   - Need to migrate existing threads
   - Preserve backwards compatibility during transition

2. **Permissions complexity**: Must check permissions on each mentioned entity
   - Before: Check if user has access to thread's space (one check)
   - After: Check if user has access to each mentioned document/database (N checks)
   - Mitigated: Cache permissions, check on mention creation

3. **User confusion during migration**:
   - Some threads at `/spaces/:id/threads` (old)
   - Some threads at `/threads` (new)
   - Need clear redirects and messaging

### Why NOT Keep Space-Scoped Threads?

**Option considered**: Keep both `/spaces/:id/threads` AND `/threads`

**Rejected because:**

- Confusing: Two places to start threads
- Fragmented history: Some threads in spaces, some standalone
- More code to maintain: Two implementations of thread interface
- Mentions system makes space-scoping unnecessary

**Better approach**: Migrate everyone to `/threads`, use mentions for filtering

## Migration Strategy

**Note**: Since we're in early stages with minimal production usage, we can do a **direct migration** without backwards compatibility requirements.

### Single-Phase Migration (Clean Cutover)

**Backend:**

1. Add `organization_id` to threads table
2. Make `space_id` optional (nullable)
3. Create `thread_mentions` table
4. Update GraphQL schema for org-wide threads
5. Update mutations to support mentions

**Frontend:**

1. Move route from `/spaces/:id/threads` → `/threads`
2. Update ThreadInterface to support org-wide threads
3. Add ThreadsPanel at bottom (toggleable)
4. Integrate mentions system (ADR-003)
5. Remove old space-scoped routes entirely

**Duration**: 1-2 weeks

**No backwards compatibility needed** - clean migration since we're early stage.

## Implementation Plan

### Backend Changes

**Database migration:**

```sql
-- Phase 1: Add organization_id, make space_id optional
ALTER TABLE threads
  ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Backfill organization_id from space
UPDATE threads t
SET organization_id = (
  SELECT organization_id FROM spaces WHERE id = t.space_id
);

ALTER TABLE threads
  ALTER COLUMN organization_id SET NOT NULL;

-- Make space_id optional (already nullable in current schema)
-- No change needed if already nullable

-- Create thread_mentions table
CREATE TABLE thread_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  mention_type VARCHAR(50) NOT NULL CHECK (mention_type IN ('document', 'database', 'folder', 'space')),
  mention_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(thread_id, mention_type, mention_id)
);

CREATE INDEX idx_thread_mentions_thread_id ON thread_mentions(thread_id);
```

**GraphQL schema changes:**

```graphql
# Updated thread type
type Thread {
  id: UUID!
  organizationId: UUID!
  spaceId: UUID # Optional for backwards compat
  title: String
  mentions: [ThreadMention!]! # New field
  messages: [Message!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

# New mention type
type ThreadMention {
  id: UUID!
  type: MentionType!
  entityId: UUID!
  entity: MentionEntity! # Union type: Document | Database | Folder | Space
}

enum MentionType {
  DOCUMENT
  DATABASE
  FOLDER
  SPACE
}

# Updated mutations
mutation CreateThread($input: CreateThreadInput!) {
  createThread(input: $input) {
    id
    organizationId
    mentions {
      id
      type
      entityId
    }
  }
}

input CreateThreadInput {
  organizationId: UUID!
  spaceId: UUID # Optional, for backwards compat
  title: String
  mentions: [MentionInput!] # New field
}

input MentionInput {
  type: MentionType!
  entityId: UUID!
}
```

### Frontend Changes

**New route structure:**

```
apps/web/src/app/dashboard/threads/
├─ page.tsx                  # Main threads interface
├─ [threadId]/
│  └─ page.tsx              # Specific thread view
└─ layout.tsx               # ThreadsPanel at bottom
```

**Components to create:**

- `ThreadsPanel` (bottom panel, replaces sidebar)
- `MentionsDropdown` (already in progress from ADR-003)
- Redirect components for deprecated routes

**Components to update:**

- `ThreadInterface` (remove space dependency)
- `ThreadListItem` (show mentions instead of space)

## Acceptance Criteria

### Phase 1: Non-Breaking Addition

- [ ] Database migration adds `organization_id` to threads
- [ ] `space_id` is optional in threads table
- [ ] GraphQL schema supports org-wide threads
- [ ] `/threads` route created with ThreadsPanel at bottom
- [ ] Mentions system integrated (from ADR-003)
- [ ] Backwards compat: `/spaces/:id/threads` still works
- [ ] Existing space-scoped threads still load correctly

### Phase 2: Soft Migration

- [ ] Redirect from `/spaces/:id/threads` → `/threads?space=id`
- [ ] Auto-populate `@space:X` mention when coming from space route
- [ ] Migration banner shown to users
- [ ] New threads created as org-wide (with space mention if needed)

### Phase 3: Hard Migration

- [ ] All space-scoped threads migrated to org-wide
- [ ] Space-scoped routes removed entirely
- [ ] All internal links updated to use `/threads`
- [ ] Migration complete, no legacy code remaining

## Consequences

### Positive

- **Faster user workflow**: Direct access to threads (one less click)
- **Cross-space queries**: Users can query multiple spaces simultaneously
- **Consistent with platform**: Aligns with `/documents` route pattern
- **More flexible**: Mentions system is more powerful than space scoping
- **Simpler backend**: Threads belong to org, not space (cleaner model)

### Negative

- **Migration complexity**: 3-4 weeks of migration work
- **Permissions complexity**: Must check permissions on each mentioned entity
- **User re-training**: Users accustomed to space-scoped threads must adapt
- **Backwards compatibility**: Must maintain during migration period

### Risks and Mitigations

| Risk                                         | Mitigation                                                    |
| -------------------------------------------- | ------------------------------------------------------------- |
| Migration breaks existing threads            | Phased migration with backwards compat in Phase 1             |
| Users confused by route change               | Clear messaging, auto-redirects, migration banner             |
| Performance issues from permission checks    | Cache permissions, check on mention creation not query        |
| Cross-space queries expose unauthorized data | Permission checks on mentioned entities, not thread container |

## References

- [ADR-003: Mentions Implementation](./003-mentions-implementation-tiptap.md)
- [VIEW_TYPES_AND_ROUTES_ANALYSIS.md](../VIEW_TYPES_AND_ROUTES_ANALYSIS.md)
- [ROUTE_STRUCTURE_DECISION.md](../ROUTE_STRUCTURE_DECISION.md)
- LOG-186 (document management research)

## Next Steps

1. [ ] Review and approve this ADR
2. [ ] Create implementation ticket for Phase 1 (backend + frontend)
3. [ ] Create implementation ticket for Phase 2 (redirects + migration)
4. [ ] Create implementation ticket for Phase 3 (cleanup)
5. [ ] Update mentions system implementation to support thread mentions
6. [ ] Create migration plan document with detailed steps

---

**Author**: Engineering Team
**Last Updated**: 2025-11-06
**Status**: Accepted
