# Type Safety Guide

This guide explains Olympus's defense-in-depth type safety strategy for the FastAPI backend.

## Overview

Olympus uses **multiple validation layers** to ensure type safety and data integrity across the entire stack, from compile-time static analysis to database constraints.

## Defense-in-Depth Strategy

### Layer 1: Mypy Static Type Checking (Compile-Time)

**Configuration** (`apps/api/pyproject.toml`):

```toml
[tool.mypy]
python_version = "3.11"
warn_return_any = true          # ✅ Catch accidental Any returns
warn_unused_configs = true
disallow_untyped_defs = true    # ✅ Require type annotations
ignore_missing_imports = true

# SQLAlchemy-heavy modules have relaxed checking
[[tool.mypy.overrides]]
module = ["app.services.outbox_processor", "app.webhooks.*"]
disallow_untyped_defs = false   # Allow untyped params for complex ORM queries
# NOTE: warn_return_any stays true - we still enforce return type annotations!
```

**Why relax for SQLAlchemy modules?**

SQLAlchemy's dynamic query API doesn't type-check well with strict mypy:

```python
# The problem:
query = select(AuthSyncOutbox).where(
    AuthSyncOutbox.status.in_(["pending", "failed"])  # Mypy error: "str" has no attribute "in_"
)

# Why it happens:
# - SQLAlchemy uses descriptor protocol
# - Mypy sees AuthSyncOutbox.status as Mapped[str] (type hint)
# - Runtime sees it as Column object with .in_() method
# - Static analysis can't resolve this dynamic behavior
```

**Solution: Relaxed checking for ORM queries, strict checking for return types**

```python
# ✅ We still require return type annotations
async def process_batch(
    self,
    limit: int = 100,  # Parameters can be untyped (relaxed)
    event_types: list[AuthSyncEventType] | None = None,
) -> dict[str, int]:  # ✅ Return type MUST be annotated
    """Process a batch of pending outbox items."""
    # Complex SQLAlchemy queries work without type errors
    return {"processed": 10, "success": 8}
```

**Planned improvement:** See [LOG-253](https://linear.app/logarithmic/issue/LOG-253) for SQLAlchemy mypy plugin implementation.

### Layer 2: Pydantic Runtime Validation (API Boundary)

All FastAPI inputs and outputs are validated at runtime:

```python
from pydantic import BaseModel, Field
from uuid import UUID

class SpiceDBSyncWebhookPayload(BaseModel):
    """Payload from pg_net webhook for SpiceDB sync events."""

    event_id: UUID  # ✅ Pydantic validates UUID format
    event_type: str  # ✅ Must be string
    table_name: str
    record_id: UUID

# Example validation:
# POST {"event_id": "invalid"} → Pydantic raises ValidationError automatically
# POST {"event_id": "550e8400-e29b-41d4-a716-446655440000"} → ✅ Passes
```

**Benefits:**

- Runtime validation catches malformed inputs
- Automatic JSON schema generation for OpenAPI docs
- Type coercion (strings to UUIDs, integers, etc.)
- Custom validators for business logic

### Layer 3: SQLAlchemy Mapped Types (ORM Layer)

Models use `Mapped` for type-safe attributes:

```python
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

class AuthSyncOutbox(Base):
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    event_data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)

# Benefits:
# ✅ item.retry_count + 1  -> Mypy knows this is int
# ✅ item.event_data["key"] -> Mypy knows this is dict[str, Any]
# ✅ IDE autocomplete works correctly
```

**Key patterns:**

- Use `Mapped[T]` for all columns (not old `Column()` syntax)
- Inherit `id`, `created_at`, `updated_at` from `Base` class
- Use `mapped_column()` for column definitions

### Layer 4: Database Constraints (Data Integrity)

PostgreSQL enforces schema-level integrity:

```sql
-- auth_sync_outbox table constraints
CREATE TABLE auth_sync_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,  -- ✅ Can't be null
    retry_count INTEGER NOT NULL DEFAULT 0,  -- ✅ Always numeric
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- ✅ Always has value
    next_retry_at TIMESTAMPTZ,  -- ✅ Enforces timezone-aware timestamps

    -- Constraints
    CHECK (retry_count >= 0),  -- ✅ No negative retries
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter'))
);
```

**Benefits:**

- Database rejects invalid data even if application layer fails
- Enforces referential integrity (foreign keys, cascades)
- Check constraints prevent invalid state transitions

### Layer 5: StrEnum for Constants (Compile + Runtime)

Type-safe enums prevent typos and invalid values:

```python
from enum import StrEnum

class AuthSyncStatus(StrEnum):
    """Status of auth sync outbox item."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    DEAD_LETTER = "dead_letter"

# Usage:
item.status = AuthSyncStatus.COMPLETED  # ✅ Type-safe (enum member)
item.status = "completed"  # ❌ Mypy error: must use enum
item.status = AuthSyncStatus.INVALID  # ❌ Mypy error: no such member

# Benefits:
# - Autocomplete in IDE
# - Compile-time checking
# - Refactoring safety (rename enum member, all usages update)
# - Runtime validation (StrEnum converts to string for DB storage)
```

**Key patterns:**

- Use `StrEnum` for all status fields, event types, and enums
- Define enums in `app/schemas/` for reuse across modules
- Always use enum members in code, never raw strings

## Critical Rules

### ✅ DO

1. **Always annotate function return types** - Even in modules with relaxed mypy checking

   ```python
   async def process_item(self, item: AuthSyncOutbox) -> bool:  # ✅
       return True
   ```

2. **Use Pydantic for all API boundaries** - Runtime validation catches bad inputs

   ```python
   @router.post("/webhook")
   async def webhook(payload: WebhookPayload) -> ResponseModel:  # ✅
       pass
   ```

3. **Use StrEnum for constants** - Compile-time safety for status/event types

   ```python
   item.status = AuthSyncStatus.COMPLETED  # ✅
   ```

4. **Use Mapped types for models** - Type-safe ORM attributes
   ```python
   class User(Base):
       email: Mapped[str] = mapped_column(String(255), nullable=False)  # ✅
   ```

### ❌ DON'T

1. **Never explicitly type returns as `Any`** - Mypy will warn (warn_return_any = true)

   ```python
   async def bad_function() -> Any:  # ❌ Warning!
       return something
   ```

2. **Never skip return type annotations** - Document what functions return

   ```python
   async def process_batch(self, limit):  # ❌ Missing return type
       return {"count": 10}
   ```

3. **Never use raw strings for enums** - Use enum members

   ```python
   item.status = "completed"  # ❌ Use AuthSyncStatus.COMPLETED
   ```

4. **Never use old Column syntax** - Use Mapped with mapped_column
   ```python
   class User(Base):
       email = Column(String(255))  # ❌ Old syntax
       email: Mapped[str] = mapped_column(String(255))  # ✅ New syntax
   ```

## Type Safety in Practice

### Example: Outbox Processor

The `OutboxProcessor` demonstrates all 5 layers:

```python
# Layer 1: Mypy (function signatures)
async def process_batch(
    self,
    limit: int = 100,
    event_types: list[AuthSyncEventType] | None = None,
) -> dict[str, int]:  # ✅ Return type documented
    """Process a batch of pending outbox items."""

    # Layer 2: Pydantic (via schemas)
    # Input validated by ProcessOutboxBatchInput schema
    # Output validated by ProcessOutboxBatchResponse schema

    # Layer 3: SQLAlchemy (ORM queries)
    items = await self._fetch_processable_items(limit, event_types)

    for item in items:
        # Layer 5: StrEnum (constants)
        if item.status == AuthSyncStatus.COMPLETED:  # ✅ Type-safe
            continue

        success = await self._process_item(item)

        if success:
            # Layer 4: Database constraints (validated on commit)
            item.status = AuthSyncStatus.COMPLETED
            item.processed_at = datetime.now(UTC)
            await self.db.commit()

    return {"processed": len(items), "success": 10}
```

### Example: Webhook Endpoint

```python
# Layer 2: Pydantic validates request body
class SpiceDBSyncWebhookPayload(BaseModel):
    event_id: UUID
    event_type: str
    table_name: str
    record_id: UUID

# Layer 1: Mypy checks function signature
@router.post("/spicedb-sync")
async def spicedb_sync_webhook(
    payload: SpiceDBSyncWebhookPayload,  # ✅ Pydantic validation
    authorization: str | None = Header(None),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:  # ✅ Return type documented
    """Receive pg_net webhook events for SpiceDB synchronization."""

    # Layer 3: SQLAlchemy ORM query
    result = await db.execute(
        select(AuthSyncOutbox).where(AuthSyncOutbox.id == payload.event_id)
    )
    item = result.scalar_one_or_none()

    # Layer 5: StrEnum for status comparison
    if item.status == AuthSyncStatus.COMPLETED:  # ✅ Type-safe
        return {"status": "already_processed"}

    # Layer 4: Database constraints enforced on commit
    processor = OutboxProcessor(db)
    success = await processor._process_item(item)

    return {"status": "success" if success else "failed"}
```

## Troubleshooting

### Issue: Mypy errors in SQLAlchemy queries

**Problem:**

```python
query = select(User).where(User.email.in_(["test@example.com"]))
# error: "str" has no attribute "in_"
```

**Solution:** Add module to mypy overrides:

```toml
[[tool.mypy.overrides]]
module = ["app.services.my_service"]
disallow_untyped_defs = false
```

### Issue: Pydantic validation failing

**Problem:**

```python
POST {"event_id": "invalid-uuid"}
# ValidationError: Input should be a valid UUID
```

**Solution:** Ensure client sends correct data types. Pydantic automatically validates.

### Issue: Database constraint violation

**Problem:**

```python
await db.commit()
# IntegrityError: null value in column "event_type" violates not-null constraint
```

**Solution:** Check model definition and ensure all required fields are set before commit.

## Future Improvements

See [LOG-253](https://linear.app/logarithmic/issue/LOG-253) for planned SQLAlchemy mypy plugin implementation to restore full strict type checking for ORM modules.

**Benefits of plugin:**

- Stricter type checking for SQLAlchemy queries
- Better IDE support for autocomplete and refactoring
- Catch more errors at compile time instead of runtime
- Remove need for mypy overrides

**Estimated effort:** 2 points (~3-4 hours)

## Summary

Olympus uses **5 layers of type safety**:

1. **Mypy** - Compile-time static analysis
2. **Pydantic** - Runtime validation at API boundaries
3. **SQLAlchemy Mapped** - Type-safe ORM attributes
4. **Database constraints** - Schema-level integrity
5. **StrEnum** - Type-safe constants

This defense-in-depth approach ensures type safety even when one layer has limitations (like SQLAlchemy's dynamic query API).

**Key takeaway:** We relax mypy checking for complex ORM queries, but maintain strict return type annotations and use Pydantic/DB constraints for runtime safety.
