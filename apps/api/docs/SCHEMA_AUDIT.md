# Schema Audit: Supabase vs SQLAlchemy Models

**Date:** 2025-10-25
**Issue:** LOG-158 - Automate Alembic migrations and align Supabase types with SQLAlchemy models

## Executive Summary

This audit identifies all schema misalignments between the Supabase PostgreSQL database and SQLAlchemy model definitions that currently require manual migrations.

**Key Issues:**

- 5 enum type misalignments (duplicates, unused, missing)
- 12+ column misalignments across 4 tables
- 3 type inconsistencies (timestamps, numerics)
- 1 missing association table model

---

## 1. Enum Type Misalignments

### 1.1 Duplicate Enum: `memberrole` vs `member_role`

**Status:** ⚠️ **Critical** - Database has both enums

**Supabase:**

```sql
-- Two enums exist:
member_role   → ['owner', 'editor', 'viewer']  -- Currently used
memberrole    → ['owner', 'editor', 'viewer']  -- Duplicate, unused
```

**SQLAlchemy:**

```python
# app/models/space.py:26
class MemberRole(str, Enum):
    OWNER = "owner"
    EDITOR = "editor"
    VIEWER = "viewer"
```

**Impact:** Alembic may detect spurious changes due to duplicate enum types.

**Resolution:** Drop `memberrole` enum in alignment migration.

---

### 1.2 Unused Enum: `user_role`

**Status:** ⚠️ **Should be removed**

**Supabase:**

```sql
user_role → ['admin', 'member', 'viewer']  -- Old enum, replaced by member_role
```

**SQLAlchemy:** No corresponding Python enum

**Impact:**

- `users.role` column uses this enum but is not in User model
- Creates confusion with `member_role`

**Resolution:** Drop `user_role` enum after migrating any dependent columns.

---

### 1.3 Missing Enum in Model: `query_status`

**Status:** ❌ **Model doesn't match Supabase**

**Supabase:**

```sql
query_status → ['pending', 'processing', 'completed', 'failed']
-- Used by: queries.status column
```

**SQLAlchemy:**

```python
# app/models/query.py:64
status: Mapped[str | None] = mapped_column(String(50), nullable=True)
```

**Current:** Model uses String instead of Enum

**Impact:** Alembic won't detect status enum changes, type safety lost

**Resolution:** Create `QueryStatus` Python enum and update model.

---

### 1.4 Missing Enum in Database: `document_status`

**Status:** ❌ **Python enum not created in database**

**Supabase:**

```sql
-- Enum does NOT exist in database
-- documents.status uses VARCHAR with hardcoded values
```

**SQLAlchemy:**

```python
# app/models/document.py:18
class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"

# Line 47: Uses String, not Enum
status: Mapped[str] = mapped_column(String(20), nullable=False, default=DocumentStatus.UPLOADED)
```

**Impact:** Type safety only in Python, database doesn't enforce enum values

**Resolution:** Create `document_status` enum in database, alter column type.

---

### 1.5 Unused Enum: `document_type`

**Status:** ⚠️ **Supabase enum with no usage**

**Supabase:**

```sql
document_type → ['text', 'pdf', 'image', 'url', 'code']
-- Not used by any table
```

**SQLAlchemy:** No corresponding model field

**Impact:** Orphaned enum taking up space

**Resolution:** Document for potential future use or drop in cleanup migration.

---

## 2. Column Misalignments

### 2.1 Users Table

**Status:** ❌ **4 extra columns in Supabase, 1 missing**

| Column          | Supabase                  | SQLAlchemy               | Issue                                        |
| --------------- | ------------------------- | ------------------------ | -------------------------------------------- |
| `auth_user_id`  | ✅ UUID, FK to auth.users | ❌ Missing               | Supabase Auth integration field not in model |
| `role`          | ✅ user_role enum         | ❌ Missing               | User role system not in model                |
| `is_active`     | ✅ boolean, default true  | ❌ Missing               | Active status not tracked in model           |
| `last_login_at` | ✅ timestamptz, nullable  | ❌ Missing               | Login tracking not in model                  |
| `bio`           | ❌ Missing                | ✅ String(500), nullable | Model has field not in database              |

**Impact:**

- Autogenerate will try to drop Supabase columns
- `bio` field won't work until migration applied

**Resolution:** Add missing columns to User model, create migration to add `bio` to database.

---

### 2.2 Documents Table

**Status:** ⚠️ **Field naming mismatch**

| Column           | Supabase          | SQLAlchemy        | Issue                           |
| ---------------- | ----------------- | ----------------- | ------------------------------- |
| `content`        | ✅ text, nullable | ❌ Missing        | Original document content field |
| `extracted_text` | ❌ Missing        | ✅ Text, nullable | Model uses different name       |
| `status`         | VARCHAR(20)       | String(20)        | Should be enum type             |

**Impact:** `extracted_text` vs `content` naming confusion

**Resolution:**

- Keep both fields (serve different purposes)
- Create `document_status` enum
- Update status column to use enum

---

### 2.3 Queries Table

**Status:** ❌ **Type mismatches**

| Column         | Supabase          | SQLAlchemy     | Issue                         |
| -------------- | ----------------- | -------------- | ----------------------------- |
| `status`       | query_status enum | String(50)     | Should use QueryStatus enum   |
| `completed_at` | timestamptz       | Text           | Wrong type in model (line 74) |
| `cost_usd`     | numeric           | Numeric(10, 6) | Precision not specified in DB |

**Impact:**

- Type safety issues
- `completed_at` can't store proper timestamps
- Autogenerate will detect type changes

**Resolution:** Fix model types to match Supabase types.

---

### 2.4 Space Members Table

**Status:** ✅ **Aligned after recent migrations**

Recent migrations fixed:

- `role` → `member_role` (20251022_rename_role_to_member_role.py)
- Added `created_at`, `updated_at` (20251023_add_timestamps_to_space_members.py)

No current issues.

---

### 2.5 Document Chunks Table

**Status:** ⚠️ **Timestamp type mismatch**

| Column       | Supabase                | SQLAlchemy            | Issue                 |
| ------------ | ----------------------- | --------------------- | --------------------- |
| `created_at` | timestamp (no timezone) | Should be timestamptz | Missing timezone info |

**Impact:** Timezone data lost on inserts

**Resolution:** Alter column to `timestamptz` for consistency.

---

## 3. Missing Models

### 3.1 QueryDocument Association Table

**Status:** ❌ **Table exists in Supabase, no SQLAlchemy model**

**Supabase Schema:**

```sql
CREATE TABLE query_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_id UUID REFERENCES queries(id),
    document_id UUID REFERENCES documents(id),
    relevance_score NUMERIC
);
```

**SQLAlchemy:** No model defined

**Impact:** Can't query this relationship through ORM

**Resolution:** Create `QueryDocument` association model.

---

## 4. Type Inconsistencies

### 4.1 UserPreferences Primary Key

**Status:** ⚠️ **Doesn't follow Base class pattern**

**Supabase:**

```sql
id INTEGER PRIMARY KEY DEFAULT nextval('user_preferences_id_seq')
```

**SQLAlchemy:**

```python
# Inherits from Base which defines:
id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
```

**Impact:** Type mismatch - Base expects UUID, table has INTEGER

**Resolution:**

- Migration to alter `user_preferences.id` to UUID
- Or override `id` field in model to use Integer

---

## 5. Manual Migrations Created

**List of manual (non-autogenerated) migrations:**

1. `5b44e667b3ee_align_queries_table_with_model.py` - Renamed columns (question→query_text, answer→result, user_id→created_by)
2. `20251022_rename_role_to_member_role.py` - Renamed column and changed enum type
3. `0420e85cda0d_add_member_role_enum.py` - Created member_role enum
4. `20251014_220000_align_document_model_with_code.py` - Document model alignment

**Pattern:** All manual migrations due to:

- Column naming differences (Supabase UI vs code)
- Enum type changes
- Column type changes

---

## 6. Root Causes

### 6.1 Database Initialization Method

**Problem:** Database was initialized via Supabase UI/SQL before Alembic migrations existed.

**Result:** Schema created without model definitions as source of truth.

---

### 6.2 Enum Type Handling

**Problem:** Alembic's autogenerate doesn't handle PostgreSQL enums well out of the box.

**Issues:**

- Doesn't detect enum value changes
- Creates duplicate enum types
- Doesn't use `create_type=False` for existing enums

---

### 6.3 Naming Conventions

**Problem:** No enforced naming conventions between Supabase and models.

**Examples:**

- `question` vs `query_text`
- `answer` vs `result`
- `user_id` vs `created_by`

---

## 7. Recommendations

### 7.1 Immediate Actions (Alignment Migration)

```sql
-- Clean up duplicate/unused enums
DROP TYPE IF EXISTS memberrole;
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS document_type;

-- Create missing enums
CREATE TYPE document_status AS ENUM ('uploaded', 'processing', 'processed', 'failed');

-- Fix users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(500);

-- Fix documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE documents
    ALTER COLUMN status TYPE document_status
    USING status::document_status;

-- Fix queries table
ALTER TABLE queries
    ALTER COLUMN completed_at TYPE TIMESTAMPTZ
    USING completed_at::TIMESTAMPTZ;

-- Fix document_chunks table
ALTER TABLE document_chunks
    ALTER COLUMN created_at TYPE TIMESTAMPTZ
    USING created_at::TIMESTAMPTZ;
```

---

### 7.2 Model Updates Required

1. **User model:** Add `auth_user_id`, `role`, `is_active`, `last_login_at`
2. **Document model:** Keep both `content` and `extracted_text`, use DocumentStatus enum properly
3. **Query model:** Create QueryStatus enum, fix `completed_at` and `status` types
4. **New model:** Create `QueryDocument` for association table
5. **UserPreferences:** Override `id` to use Integer or migrate to UUID

---

### 7.3 Alembic Configuration Improvements

**Add to `alembic/env.py`:**

```python
def compare_type(context, inspected_column, metadata_column, inspected_type, metadata_type):
    """Custom type comparison to handle enums properly."""
    # Handle enum types
    if isinstance(metadata_type, sa.Enum):
        if isinstance(inspected_type, str):
            return False  # Already correct
        # Check if enum values match
        return metadata_type.enums != inspected_type.enums

    # Default comparison
    return None

def render_item(type_, obj, autogen_context):
    """Render enum types with create_type=False for existing enums."""
    if isinstance(obj, sa.Enum):
        # Check if enum already exists in database
        # Return with create_type=False to avoid duplicates
        return f"sa.Enum({', '.join(repr(e) for e in obj.enums)}, name={obj.name!r}, create_type=False)"
    return False

context.configure(
    # ... existing config ...
    compare_type=compare_type,
    render_item=render_item,
)
```

---

### 7.4 Naming Conventions (Going Forward)

**Establish standards:**

- ✅ Use `snake_case` for all columns
- ✅ Foreign keys: `{entity}_id` (e.g., `space_id`, `user_id`)
- ✅ Creator fields: `created_by` (not `user_id`)
- ✅ Timestamps: Always use `timestamptz`
- ✅ Enums: Define in Python first, then create in database via migration
- ✅ Primary keys: UUID for all tables (except legacy tables)

---

## 8. Success Metrics

After implementing fixes:

- ✅ `alembic revision --autogenerate -m "test"` on clean state → empty migration
- ✅ Add new field to model → autogenerate detects it
- ✅ Change enum values → autogenerate detects it (with custom compare_type)
- ✅ Change column type → autogenerate detects it
- ✅ No manual SQL required for routine changes

---

## Appendix A: Current Enum Inventory

| Enum Name         | Values                                 | Used By                   | Status                       |
| ----------------- | -------------------------------------- | ------------------------- | ---------------------------- |
| `member_role`     | owner, editor, viewer                  | space_members.member_role | ✅ Active                    |
| `memberrole`      | owner, editor, viewer                  | (none)                    | ❌ Duplicate, remove         |
| `user_role`       | admin, member, viewer                  | users.role                | ⚠️ Legacy, migrate away      |
| `query_status`    | pending, processing, completed, failed | queries.status            | ✅ Active (not in model)     |
| `document_type`   | text, pdf, image, url, code            | (none)                    | ⚠️ Unused, consider removing |
| `document_status` | (not in DB)                            | (none)                    | ❌ Should be created         |

---

## Appendix B: Full Table Comparison

See Supabase MCP output for complete column-by-column comparison.

**Tables audited:**

- ✅ users
- ✅ spaces
- ✅ space_members
- ✅ documents
- ✅ document_chunks
- ✅ queries
- ✅ query_documents
- ✅ user_preferences

---

**End of Audit**
