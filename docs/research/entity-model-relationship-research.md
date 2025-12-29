**Claude finished @kamosah's task in 6m 16s** —— [View job](https://github.com/kamosah/olympus/actions/runs/20562003040)

---

### Entity Model Research & Migration Plan

I've analyzed the current Olympus entity model, reviewed the Copilot security findings, and researched common SaaS authorization patterns. Here are my findings and recommendations for a cleaner, more secure entity model.

---

## Current Implementation Analysis

### Security Gaps Identified

Based on the Copilot review and current code analysis, I've identified these critical issues:

1. **Thread Read Permissions Leak** (`olympus.zed:85`):

   ```zed
   permission read = space->read + organization->view
   ```

   - **Issue**: Organization viewers/members can read ALL threads in the org, even from private spaces they can't access
   - **Risk**: Leaks space-scoped thread content to unauthorized org members

2. **Missing Org-Wide Thread Authorization** (`mutation.py:1096`):
   - **Issue**: No membership check when creating org-wide threads (`space_id` is `None`)
   - **Risk**: Users could create threads in organizations they don't belong to

3. **Thread-Org Direct Relationship**:
   - **Current Model**: `Thread → Organization` (direct)
   - **Problem**: Threads are organization-scoped instead of user-scoped
   - **Impact**: No clean way to model personal threads vs org threads

### Current Entity Model

```
User
 ├─ OrganizationMember → Organization
 ├─ SpaceMember → Space → Organization
 ├─ Thread.created_by (FK only, not ownership)
 └─ Document.uploader (FK only, not ownership)

Thread
 ├─ organization_id (REQUIRED)
 ├─ space_id (OPTIONAL)
 ├─ created_by (FK to User, not modeled as ownership)
 └─ Messages (child entities)
```

**Key Problems**:

- Threads are **organization-owned**, not **user-owned**
- No distinction between personal and organizational resources
- `created_by` is just a FK, not a first-class ownership relationship
- Can't have personal threads without an organization context

---

## SaaS Product Pattern Research

### Common Patterns Across Hex, Linear, Perplexity

After analyzing these platforms, here's the **canonical pattern** they all follow:

#### 1. **User-Centric Ownership Model**

All resources start with **user ownership** and can optionally be shared to organizations/workspaces:

```
User (Primary Actor)
 ├─ Personal Resources (owned, private by default)
 │   ├─ Personal Threads/Projects
 │   ├─ Drafts
 │   └─ Private Notes
 │
 └─ Organization Memberships
     ├─ Organization A (role: admin)
     │   ├─ Access to Org Spaces/Projects
     │   └─ Can create/share to org spaces
     │
     └─ Organization B (role: member)
         └─ Limited access based on role
```

#### 2. **Hex Model** (Data Analytics Platform)

**Entity Hierarchy**:

```
User
 ├─ Personal Projects (private workspace)
 └─ Workspace Memberships
     └─ Workspace (≈ Organization)
         ├─ Shared Projects
         ├─ Logic Views (≈ Spaces)
         └─ Team Members (roles)
```

**Key Patterns**:

- **Personal Workspace**: Every user has a private workspace (free tier)
- **Shared Workspaces**: Organizations with team members and role-based permissions
- **Projects belong to workspaces**: Not directly to organizations
- **Threads** (conversational queries) are scoped to projects
- **Permissions cascade**: Workspace role → Project access → Thread visibility

**Roles** (hierarchical):

- Workspace: `Owner`, `Admin`, `Editor`, `Viewer`, `Guest`
- Project: `Owner`, `Editor`, `Viewer` (inherits from workspace role)

#### 3. **Linear Model** (Project Management)

**Entity Hierarchy**:

```
User
 ├─ Personal Workspace (implicit)
 └─ Organization Memberships
     └─ Organization
         ├─ Teams (≈ Spaces)
         │   ├─ Projects (≈ Threads)
         │   └─ Issues (≈ Messages)
         └─ Members (roles)
```

**Key Patterns**:

- **Organizations** are top-level containers
- **Teams** are sub-groups within organizations (similar to Spaces)
- **Projects** belong to teams, not directly to orgs
- **Issues** can be personal (assigned to user) or team-scoped
- **Permissions**: Org-level roles + team-level overrides

**Roles**:

- Organization: `Owner`, `Admin`, `Member`, `Guest`
- Team: Can override org permissions for specific teams

#### 4. **Perplexity Model** (AI Search)

**Entity Hierarchy**:

```
User
 ├─ Personal Threads (default, private)
 └─ Organization Memberships (Enterprise)
     └─ Organization
         ├─ Shared Spaces
         │   └─ Shared Threads
         └─ Members (roles)
```

**Key Patterns**:

- **Personal-first**: Threads are personal by default
- **Organization Sharing**: Users can share threads to organization spaces
- **No org requirement**: Users can use Perplexity without belonging to an org
- **Thread visibility**: Personal (user only) or Shared (org/space members)

**Permissions**:

- Personal threads: User owns, no one else can access
- Shared threads: Inherit from space/organization membership

---

## Proposed Entity Model for Olympus

### Design Principles

1. **User-Centric Ownership**: Resources belong to users first, organizations second
2. **Personal vs Organizational**: Clear distinction between personal and shared resources
3. **Optional Organization Membership**: Users can operate without an org (personal workspace)
4. **Space-Scoped Sharing**: Threads/documents can be shared to specific spaces
5. **Permission Inheritance**: Org role → Space role → Resource access

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ USER (Primary Actor)                                        │
│  - id: UUID (PK)                                           │
│  - email: string (unique)                                  │
│  - full_name: string                                       │
│  - avatar_url: string                                      │
│  - default_organization_id: UUID (FK, nullable)            │
└─────────────────────────────────────────────────────────────┘
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
┌─────────────────────┐              ┌─────────────────────┐
│ PERSONAL RESOURCES  │              │ ORG MEMBERSHIPS     │
│  - Personal Threads │              │  - User → Org       │
│  - Drafts           │              │  - Role (enum)      │
│  - Private Docs     │              │  - Joined At        │
└─────────────────────┘              └─────────────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────────┐
                              │ ORGANIZATION                    │
                              │  - id: UUID (PK)               │
                              │  - name: string                │
                              │  - owner_id: UUID (FK → User)  │
                              └─────────────────────────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────────┐
                              │ SPACE (Collection)              │
                              │  - id: UUID (PK)               │
                              │  - organization_id: UUID (FK)  │
                              │  - name: string                │
                              │  - owner_id: UUID (FK → User)  │
                              │  - visibility: enum            │
                              └─────────────────────────────────┘
                                               │
                                               ├──────────┬──────────┐
                                               ▼          ▼          ▼
                              ┌─────────────────────┐ ┌────────┐ ┌────────┐
                              │ SPACE MEMBERSHIP    │ │ THREAD │ │ DOC    │
                              │  - space_id         │ │        │ │        │
                              │  - user_id          │ └────────┘ └────────┘
                              │  - role: enum       │
                              └─────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ THREAD (Unified Model)                                      │
│  - id: UUID (PK)                                           │
│  - owner_user_id: UUID (FK → User, REQUIRED)               │
│  - organization_id: UUID (FK → Org, NULLABLE)              │
│  - space_id: UUID (FK → Space, NULLABLE)                   │
│  - visibility: enum (personal, space, org)                 │
│  - title: string                                           │
│  - created_at: timestamp                                   │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ MESSAGE                                                     │
│  - id: UUID (PK)                                           │
│  - thread_id: UUID (FK → Thread)                           │
│  - author_user_id: UUID (FK → User, NULLABLE)              │
│  - author_type: enum (user, agent, system)                 │
│  - role: enum (user, assistant, system)                    │
│  - content: text                                           │
│  - metadata: jsonb                                         │
└─────────────────────────────────────────────────────────────┘
```

### Key Schema Changes

#### 1. **Thread Model** (Revised)

```python
class ThreadVisibility(StrEnum):
    """Thread visibility scope."""
    PERSONAL = "personal"      # Only owner can access
    SPACE = "space"            # Space members can access
    ORGANIZATION = "org"       # All org members can access

class Thread(Base):
    __tablename__ = "threads"

    # Owner (REQUIRED) - threads always belong to a user
    owner_user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Organization context (NULLABLE) - personal threads have no org
    organization_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Space context (NULLABLE) - for space-scoped threads
    space_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("spaces.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Visibility level (determines access rules)
    visibility: Mapped[ThreadVisibility] = mapped_column(
        SQLEnum(ThreadVisibility),
        nullable=False,
        default=ThreadVisibility.PERSONAL,
        index=True,
    )

    # Constraints
    __table_args__ = (
        # If visibility=space, space_id must be set
        CheckConstraint(
            "(visibility != 'space') OR (space_id IS NOT NULL)",
            name="space_visibility_requires_space"
        ),
        # If visibility=org, organization_id must be set
        CheckConstraint(
            "(visibility != 'org') OR (organization_id IS NOT NULL)",
            name="org_visibility_requires_org"
        ),
        # If space_id is set, organization_id must match space's org
        # (enforced via FK constraint and application logic)
    )
```

#### 2. **Message Model** (Revised)

```python
class AuthorType(StrEnum):
    """Message author type."""
    USER = "user"
    AGENT = "agent"
    SYSTEM = "system"

class Message(Base):
    __tablename__ = "messages"

    thread_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("threads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Author user (nullable for agent/system messages)
    author_user_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Author type (user, agent, system)
    author_type: Mapped[AuthorType] = mapped_column(
        SQLEnum(AuthorType),
        nullable=False,
        default=AuthorType.USER,
    )

    # Message role (for LLM context)
    message_role: Mapped[MessageRole] = mapped_column(
        SQLEnum(MessageRole),
        nullable=False,
    )

    content: Mapped[str] = mapped_column(Text, nullable=False)
    message_metadata: Mapped[dict] = mapped_column("metadata", JSONB, ...)
```

#### 3. **User Model** (Enhanced)

```python
class User(Base):
    __tablename__ = "users"

    # ... existing fields ...

    # Default organization for UI (nullable)
    default_organization_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    owned_threads: Mapped[list["Thread"]] = relationship(
        "Thread",
        foreign_keys="[Thread.owner_user_id]",
        back_populates="owner",
        cascade="all, delete-orphan",
    )

    authored_messages: Mapped[list["Message"]] = relationship(
        "Message",
        foreign_keys="[Message.author_user_id]",
        back_populates="author",
    )
```

### SpiceDB Schema (Revised)

```zed
definition user {}

definition organization {
  relation owner: user
  relation admin: user
  relation member: user
  relation viewer: user

  permission delete = owner
  permission manage_settings = owner + admin
  permission invite_member = owner + admin
  permission remove_member = owner + admin
  permission view = viewer + member + admin + owner
}

definition space {
  relation organization: organization
  relation owner: user
  relation editor: user
  relation viewer: user

  permission delete = owner + organization->admin
  permission manage_members = owner + organization->admin
  permission write = owner + editor + organization->admin
  permission read = viewer + editor + owner + organization->member
}

definition thread {
  // Primary ownership: User owns the thread
  relation owner: user

  // Optional: Organization context (nullable)
  relation organization: organization

  // Optional: Space context (nullable)
  relation space: space

  // Permissions based on visibility
  permission delete = owner + space->manage_members + organization->admin
  permission update = owner + space->owner + organization->admin

  // Read permission varies by visibility:
  // - personal: owner only
  // - space: owner + space members
  // - org: owner + org members
  permission read = owner + space->read
  permission read_org = owner + organization->view
}

definition message {
  relation thread: thread
  relation author: user  // Nullable in DB, but if set, grants editing rights

  // Messages inherit permissions from their thread
  permission read = thread->read + thread->read_org
  permission update = author
  permission delete = thread->owner + author
}

definition document {
  relation owner: user  // Changed from uploader to owner
  relation space: space

  permission delete = owner + space->manage_members
  permission update = owner + space->write
  permission read = space->read
}
```

**Key Changes**:

1. **Thread ownership**: `relation owner: user` (not just `creator`)
2. **Separate read paths**: `read` for space-scoped, `read_org` for org-wide
3. **Message authorship**: Explicit `author` relation for edit rights
4. **Document ownership**: Changed from `uploader` to `owner` for consistency

---

## Permission Scenarios (New Model)

### 1. Personal Thread (No Org/Space)

```python
# Create personal thread
thread = Thread(
    owner_user_id=user.id,
    organization_id=None,      # No org
    space_id=None,             # No space
    visibility=ThreadVisibility.PERSONAL,

)

# SpiceDB relationships
await spicedb.write_relationship(
    resource_type="thread",
    resource_id=str(thread.id),
    relation="owner",
    subject_type="user",
    subject_id=str(user.id)
)

# Permission check: Only owner can read
has_access = await spicedb.check_permission(
    user_id=str(user.id),
    permission="read",
    resource_type="thread",
    resource_id=str(thread.id)
)  # ✅ True for owner, ❌ False for everyone else
```

### 2. Space-Scoped Thread

```python
# Create space thread
thread = Thread(
    owner_user_id=user.id,
    organization_id=space.organization_id,
    space_id=space.id,
    visibility=ThreadVisibility.SPACE,

)

# SpiceDB relationships
await spicedb.write_relationships([
    ("thread", thread.id, "owner", "user", user.id),
    ("thread", thread.id, "organization", "organization", space.organization_id),
    ("thread", thread.id, "space", "space", space.id),
])

# Permission check: Space members can read
has_access = await spicedb.check_permission(
    user_id=str(space_member.id),
    permission="read",
    resource_type="thread",
    resource_id=str(thread.id)
)  # ✅ True if user has space->read
```

### 3. Org-Wide Thread

```python
# Create org-wide thread
thread = Thread(
    owner_user_id=user.id,
    organization_id=org.id,
    space_id=None,
    visibility=ThreadVisibility.ORGANIZATION,

)

# SpiceDB relationships
await spicedb.write_relationships([
    ("thread", thread.id, "owner", "user", user.id),
    ("thread", thread.id, "organization", "organization", org.id),
])

# Permission check: All org members can read
has_access = await spicedb.check_permission(
    user_id=str(org_member.id),
    permission="read_org",  # Use read_org for org-wide visibility
    resource_type="thread",
    resource_id=str(thread.id)
)  # ✅ True if user has organization->view
```

### 4. Multi-Org User Scenario

```python
# User belongs to multiple orgs
user.organization_memberships = [
    OrganizationMember(organization_id=org_a.id, role=OrgRole.ADMIN),
    OrganizationMember(organization_id=org_b.id, role=OrgRole.MEMBER),
]

# User creates personal thread (no org context)
personal_thread = Thread(
    owner_user_id=user.id,
    organization_id=None,
    visibility=ThreadVisibility.PERSONAL
)

# User creates thread in Org A
org_a_thread = Thread(
    owner_user_id=user.id,
    organization_id=org_a.id,
    visibility=ThreadVisibility.ORGANIZATION
)

# User creates thread in Org B
org_b_thread = Thread(
    owner_user_id=user.id,
    organization_id=org_b.id,
    visibility=ThreadVisibility.ORGANIZATION
)

# Querying threads for Org A context
threads_in_org_a = await session.execute(
    select(Thread).where(
        or_(
            Thread.organization_id == org_a.id,
            and_(
                Thread.owner_user_id == user.id,
                Thread.visibility == ThreadVisibility.PERSONAL
            )
        )
    )
)
# Returns: personal_thread + org_a_thread (NOT org_b_thread)
```

---

## Migration Execution Plan

### Phase 1: Schema Changes (3 points)

**Goal**: Add new columns and relationships without breaking existing functionality

**Database Migrations**:

1. **Add new columns to `threads` table**:

```sql
-- Add owner_user_id (copy from created_by initially)
ALTER TABLE threads
ADD COLUMN owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

UPDATE threads
SET owner_user_id = created_by;

ALTER TABLE threads
ALTER COLUMN owner_user_id SET NOT NULL;

CREATE INDEX idx_threads_owner_user_id ON threads(owner_user_id);

-- Add visibility column
ALTER TABLE threads
ADD COLUMN visibility VARCHAR(20) DEFAULT 'space';

-- Set visibility based on current state
UPDATE threads
SET visibility = CASE
    WHEN space_id IS NULL THEN 'org'
    ELSE 'space'
END;

ALTER TABLE threads
ALTER COLUMN visibility SET NOT NULL;

CREATE INDEX idx_threads_visibility ON threads(visibility);

-- Make organization_id nullable (for personal threads)
ALTER TABLE threads
ALTER COLUMN organization_id DROP NOT NULL;

-- Add check constraints
ALTER TABLE threads
ADD CONSTRAINT space_visibility_requires_space
CHECK ((visibility != 'space') OR (space_id IS NOT NULL));

ALTER TABLE threads
ADD CONSTRAINT org_visibility_requires_org
CHECK ((visibility != 'org') OR (organization_id IS NOT NULL));
```

2. **Add author fields to `messages` table**:

```sql
-- Add author_user_id (copy from thread creator initially)
ALTER TABLE messages
ADD COLUMN author_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- For existing messages, set author based on message_role
UPDATE messages m
SET author_user_id = t.created_by
FROM threads t
WHERE m.thread_id = t.id
AND m.message_role = 'user';

CREATE INDEX idx_messages_author_user_id ON messages(author_user_id);

-- Add author_type column
ALTER TABLE messages
ADD COLUMN author_type VARCHAR(20) DEFAULT 'user';

UPDATE messages
SET author_type = CASE
    WHEN message_role = 'user' THEN 'user'
    WHEN message_role = 'assistant' THEN 'agent'
    ELSE 'system'
END;

ALTER TABLE messages
ALTER COLUMN author_type SET NOT NULL;
```

3. **Add default_organization_id to `users` table**:

```sql
ALTER TABLE users
ADD COLUMN default_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Set default org to first membership for existing users
UPDATE users u
SET default_organization_id = (
    SELECT organization_id
    FROM organization_members om
    WHERE om.user_id = u.id
    ORDER BY om.created_at ASC
    LIMIT 1
);

CREATE INDEX idx_users_default_organization_id ON users(default_organization_id);
```

**Model Updates**:

1. Update `Thread` model with new fields
2. Update `Message` model with author fields
3. Update `User` model with `default_organization_id`
4. Add new enums: `ThreadVisibility`, `AuthorType`

**Deliverables**:

- Alembic migration: `add_thread_ownership_model.py`
- Updated SQLAlchemy models
- No breaking changes (new fields are additive)

---

### Phase 2: SpiceDB Schema Migration (2 points)

**Goal**: Update SpiceDB schema to support new ownership model

**Tasks**:

1. **Update `olympus.zed` schema**:
   - Add `owner` relation to `thread` definition
   - Split `read` into `read` (space-scoped) and `read_org` (org-scoped)
   - Add `message` definition with `author` relation
   - Update `document` to use `owner` instead of `uploader`

2. **Deploy new schema**:

```bash
zed schema write apps/api/app/policies/olympus.zed
```

3. **Backfill existing relationships**:

```python
# Script: backfill_thread_ownership.py
async def backfill_thread_ownership():
    """Backfill thread ownership relationships in SpiceDB."""
    threads = await session.execute(select(Thread))

    for thread in threads.scalars():
        # Add owner relationship
        await spicedb.write_relationship(
            resource_type="thread",
            resource_id=str(thread.id),
            relation="owner",
            subject_type="user",
            subject_id=str(thread.owner_user_id)
        )

        # Remove old creator relationship (if exists)
        await spicedb.delete_relationship(
            resource_type="thread",
            resource_id=str(thread.id),
            relation="creator",
            subject_type="user",
            subject_id=str(thread.owner_user_id)
        )
```

**Deliverables**:

- Updated `olympus.zed` schema
- Backfill script: `backfill_thread_ownership.py`
- Updated `spicedb_service.py` methods

---

### Phase 3: Update Application Logic (5 points)

**Goal**: Update all permission checks and business logic to use new model

**Tasks**:

1. **Update thread creation logic** (`mutation.py`):

```python
async def create_thread(
    self,
    info: Info,
    input: CreateThreadInput,
) -> Thread:
    # Determine visibility
    if input.space_id:
        visibility = ThreadVisibility.SPACE
    elif input.organization_id:
        visibility = ThreadVisibility.ORGANIZATION
    else:
        visibility = ThreadVisibility.PERSONAL

    # Authorization check
    if visibility == ThreadVisibility.PERSONAL:
        # No auth needed - user can always create personal threads
        pass
    elif visibility == ThreadVisibility.SPACE:
        # Check space access
        has_access = await spicedb.check_permission(
            user_id=str(user_id),
            permission="read",
            resource_type="space",
            resource_id=str(input.space_id)
        )
        if not has_access:
            raise ValueError("Insufficient permissions to create thread in this space")
    elif visibility == ThreadVisibility.ORGANIZATION:
        # Check org membership
        has_access = await spicedb.check_permission(
            user_id=str(user_id),
            permission="view",
            resource_type="organization",
            resource_id=str(input.organization_id)
        )
        if not has_access:
            raise ValueError("Insufficient permissions to create thread in this organization")

    # Create thread
    thread = Thread(
        owner_user_id=user_id,
        organization_id=input.organization_id,
        space_id=input.space_id,
        visibility=visibility,
        # ... other fields
    )

    # Sync to SpiceDB
    await spicedb.sync_thread_relationships(
        thread_id=str(thread.id),
        owner_user_id=str(user_id),
        organization_id=str(input.organization_id) if input.organization_id else None,
        space_id=str(input.space_id) if input.space_id else None,
    )

    return thread
```

2. **Update thread read permission check**:

```python
# For space/personal threads
has_access = await spicedb.check_permission(
    user_id=str(user_id),
    permission="read",
    resource_type="thread",
    resource_id=str(thread_id)
)

# For org-wide threads
if thread.visibility == ThreadVisibility.ORGANIZATION:
    has_access = await spicedb.check_permission(
        user_id=str(user_id),
        permission="read_org",  # Use read_org for org visibility
        resource_type="thread",
        resource_id=str(thread_id)
    )
```

3. **Update thread listing queries**:

```python
async def get_threads_for_user(
    user_id: UUID,
    organization_id: UUID | None = None,
    space_id: UUID | None = None,
) -> list[Thread]:
    """Get threads accessible to user in a given context."""

    # Base query: threads owned by user
    query = select(Thread).where(Thread.owner_user_id == user_id)

    # Apply context filters
    if space_id:
        # Space context: owned threads + space threads
        query = query.where(
            or_(
                Thread.visibility == ThreadVisibility.PERSONAL,
                and_(
                    Thread.space_id == space_id,
                    Thread.visibility == ThreadVisibility.SPACE
                )
            )
        )
    elif organization_id:
        # Org context: owned threads + org threads
        query = query.where(
            or_(
                Thread.visibility == ThreadVisibility.PERSONAL,
                and_(
                    Thread.organization_id == organization_id,
                    Thread.visibility.in_([
                        ThreadVisibility.SPACE,
                        ThreadVisibility.ORGANIZATION
                    ])
                )
            )
        )
    else:
        # Personal context: only personal threads
        query = query.where(Thread.visibility == ThreadVisibility.PERSONAL)

    result = await session.execute(query)
    return result.scalars().all()
```

4. **Update message creation logic**:

```python
async def create_message(
    thread_id: UUID,
    content: str,
    role: MessageRole,
    author_user_id: UUID | None = None,
    author_type: AuthorType = AuthorType.USER,
) -> Message:
    """Create a message in a thread."""

    # Check thread access
    has_access = await spicedb.check_permission(
        user_id=str(author_user_id) if author_user_id else "system",
        permission="read",
        resource_type="thread",
        resource_id=str(thread_id)
    )

    if not has_access:
        raise ValueError("Insufficient permissions to add message to this thread")

    message = Message(
        thread_id=thread_id,
        author_user_id=author_user_id,
        author_type=author_type,
        message_role=role,
        content=content
    )

    return message
```

**Deliverables**:

- Updated GraphQL mutations: `create_thread`, `update_thread`, `delete_thread`
- Updated queries: `threads`, `thread`, `messages`
- Updated service layer: `spicedb_service.py`
- Integration tests for new permission model

---

### Phase 4: Data Migration & Validation (3 points)

**Goal**: Migrate existing data to new model and validate correctness

**Tasks**:

1. **Migrate existing threads**:

```python
# Script: migrate_thread_visibility.py
async def migrate_thread_visibility():
    """Migrate existing threads to new visibility model."""

    # Identify personal threads (no space, likely test/draft threads)
    personal_threads = await session.execute(
        select(Thread).where(Thread.space_id.is_(None))
    )

    for thread in personal_threads.scalars():
        # Set as personal if no org/space context
        if not thread.organization_id:
            thread.visibility = ThreadVisibility.PERSONAL
            thread.organization_id = None
            thread.space_id = None
        else:
            # Org-wide thread
            thread.visibility = ThreadVisibility.ORGANIZATION

    # Space threads
    space_threads = await session.execute(
        select(Thread).where(Thread.space_id.is_not(None))
    )

    for thread in space_threads.scalars():
        thread.visibility = ThreadVisibility.SPACE

    await session.commit()
```

2. **Validate SpiceDB relationships**:

```python
async def validate_spicedb_sync():
    """Validate that all threads have correct SpiceDB relationships."""

    threads = await session.execute(select(Thread))

    for thread in threads.scalars():
        # Check owner relationship exists
        relationships = await spicedb.read_relationships(
            resource_type="thread",
            resource_id=str(thread.id),
            relation="owner"
        )

        if not relationships:
            logger.error(f"Missing owner relationship for thread {thread.id}")
            # Re-sync
            await spicedb.sync_thread_relationships(...)
```

3. **Update frontend queries**:

```typescript
// graphql/queries/threads.graphql
query GetThreads($organizationId: UUID, $spaceId: UUID) {
  threads(organizationId: $organizationId, spaceId: $spaceId) {
    id
    title
    visibility
    owner {
      id
      fullName
      email
    }
    organization {
      id
      name
    }
    space {
      id
      name
    }
    createdAt
  }
}
```

**Deliverables**:

- Data migration script: `migrate_thread_visibility.py`
- Validation script: `validate_spicedb_sync.py`
- Updated GraphQL schema and queries
- Frontend updates for thread listing

---

### Phase 5: Testing & Rollout (2 points)

**Goal**: Comprehensive testing and staged rollout

**Tasks**:

1. **Integration tests**:

```python
# tests/test_thread_ownership_permissions.py
async def test_personal_thread_isolation(client, user1, user2):
    """Test that personal threads are isolated to owner."""
    thread = await create_thread(
        owner_user_id=user1.id,
        visibility=ThreadVisibility.PERSONAL
    )

    # Owner can access
    assert await can_access_thread(user1.id, thread.id)

    # Other user cannot access
    assert not await can_access_thread(user2.id, thread.id)

async def test_multi_org_thread_isolation(client, user, org_a, org_b):
    """Test that org threads are isolated by organization."""
    thread_a = await create_thread(
        owner_user_id=user.id,
        organization_id=org_a.id,
        visibility=ThreadVisibility.ORGANIZATION
    )

    thread_b = await create_thread(
        owner_user_id=user.id,
        organization_id=org_b.id,
        visibility=ThreadVisibility.ORGANIZATION
    )

    # Query threads in Org A context
    threads = await get_threads_for_user(user.id, organization_id=org_a.id)

    # Should only return Org A thread
    assert thread_a.id in [t.id for t in threads]
    assert thread_b.id not in [t.id for t in threads]
```

2. **Staged rollout**:
   - **Week 1**: Deploy schema changes (backward compatible)
   - **Week 2**: Deploy SpiceDB schema update + backfill
   - **Week 3**: Deploy application logic updates (feature flag)
   - **Week 4**: Enable new permission model for all users

**Deliverables**:

- Integration test suite (15+ tests)
- Rollout plan with rollback strategy
- Monitoring dashboards for permission checks

---

## Summary & Benefits

### What This Fixes

1. **Security**:
   - ✅ **Thread read permission leak**: Space threads no longer visible to unauthorized org members
   - ✅ **Org-wide thread authorization**: Explicit membership check before creation
   - ✅ **Cross-tenant isolation**: Multi-org users have clear data boundaries

2. **Data Model**:
   - ✅ **User-centric ownership**: Threads belong to users first, orgs second
   - ✅ **Personal threads**: Users can create threads without org/space context
   - ✅ **Clear visibility semantics**: Explicit `personal`, `space`, `org` scopes

3. **Permissions**:
   - ✅ **Principle of least privilege**: Default to personal (most restrictive)
   - ✅ **Clear inheritance**: Space → Org cascading, no leaks
   - ✅ **Fine-grained control**: Message authorship, document ownership

### Migration Effort

| Phase                | Effort                       | Risk   | Dependencies |
| -------------------- | ---------------------------- | ------ | ------------ |
| 1. Schema Changes    | 3 points (~4-6 hours)        | Low    | None         |
| 2. SpiceDB Schema    | 2 points (~3-4 hours)        | Medium | Phase 1      |
| 3. Application Logic | 5 points (~6-10 hours)       | Medium | Phase 2      |
| 4. Data Migration    | 3 points (~4-6 hours)        | High   | Phase 3      |
| 5. Testing & Rollout | 2 points (~3-4 hours)        | Low    | Phase 4      |
| **Total**            | **15 points** (~20-30 hours) | -      | -            |

### Rollback Strategy

- **Before Phase 3**: Full rollback by reverting migrations
- **After Phase 3**: Keep new columns, revert application logic
- **After Phase 4**: Data migrated, rollback requires re-migration

---

## Next Steps

1. **Review & Approval**: Discuss proposed model with team
2. **Prototype**: Implement Phase 1 schema changes in development
3. **Test Migration**: Run backfill scripts on staging data
4. **Iterative Rollout**: Deploy phases incrementally with monitoring

Let me know if you'd like me to:

- Create detailed Alembic migration scripts
- Implement the SpiceDB schema updates
- Write integration tests for the new model
- Build a prototype of the new thread creation flow

---
