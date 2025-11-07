# Alembic Migration Best Practices

## Core Principles

1. **Never modify applied migrations** - Once a migration has been applied, create a new migration instead
2. **Use SQLAlchemy ops over raw SQL** - Except for data migrations (INSERT/UPDATE)
3. **One migration, one purpose** - Keep migrations focused and atomic
4. **Test up and down** - Always test both upgrade and downgrade paths

## DDL Operations (Schema Changes) → Use SQLAlchemy

### Tables

```python
# ✅ GOOD: Use SQLAlchemy operations
op.create_table('users', ...)
op.drop_table('users')
op.rename_table('old_name', 'new_name')

# ❌ BAD: Avoid raw SQL for DDL
op.execute("CREATE TABLE users (...)")
```

### Columns

```python
# ✅ GOOD: Use SQLAlchemy operations
op.add_column('users', sa.Column('email', sa.String(255)))
op.drop_column('users', 'old_column')
op.alter_column('users', 'old_name', new_column_name='new_name')

# ❌ BAD: Avoid raw SQL
op.execute("ALTER TABLE users ADD COLUMN email VARCHAR(255)")
```

### Foreign Keys

```python
# ✅ GOOD: Use SQLAlchemy operations
op.create_foreign_key(
    'fk_users_organization_id',
    'users', 'organizations',
    ['organization_id'], ['id'],
    ondelete='CASCADE'
)
op.drop_constraint('fk_users_organization_id', 'users', type_='foreignkey')

# ❌ BAD: Avoid raw SQL
op.execute("ALTER TABLE users ADD CONSTRAINT fk_users_organization_id...")
```

### Indexes

```python
# ✅ GOOD: Use SQLAlchemy operations for create/drop
op.create_index('idx_users_email', 'users', ['email'], unique=True)
op.drop_index('idx_users_email', table_name='users')

# ⚠️ ACCEPTABLE: Raw SQL for rename (no SQLAlchemy op exists)
op.execute("ALTER INDEX idx_old_name RENAME TO idx_new_name;")
```

### Enums

```python
# ✅ GOOD: Let SQLAlchemy manage enums automatically
sa.Column(
    'role',
    sa.Enum('owner', 'admin', 'member', name='user_role', create_type=True),
    nullable=False
)

# ❌ BAD: Manual enum creation (SQLAlchemy won't track it)
op.execute("CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member');")
```

**Key enum rules:**
- First migration using enum: `create_type=True`
- Subsequent migrations: `create_type=False` (reuse existing enum)
- Downgrade: Drop enum only in the migration that created it

## Data Migrations (INSERT/UPDATE/DELETE) → Use Raw SQL

```python
# ✅ GOOD: Raw SQL for data migrations (clear and explicit)
op.execute("""
    INSERT INTO organizations (id, name, slug, owner_id)
    SELECT
        gen_random_uuid(),
        'Default Organization',
        'default-org',
        (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
    ON CONFLICT DO NOTHING;
""")

op.execute("""
    UPDATE users
    SET organization_id = (SELECT id FROM organizations WHERE slug = 'default-org')
    WHERE organization_id IS NULL;
""")

# ⚠️ ACCEPTABLE: SQLAlchemy Core (but raw SQL is clearer for complex data migrations)
from sqlalchemy import table, column, select

users = table('users', column('organization_id'))
op.execute(users.update().values(organization_id=...))
```

**Why raw SQL for data migrations:**
- More explicit and reviewable
- Better for complex queries with JOINs/subqueries
- Easier to test independently

## Migration Structure Template

```python
"""descriptive migration title (TICKET-123)

Revision ID: YYYYMMDD_short_name
Revises: previous_revision
Create Date: YYYY-MM-DD HH:MM:SS

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'YYYYMMDD_short_name'
down_revision: Union[str, Sequence[str], None] = 'previous_revision'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Clear description of what this migration does.

    Steps:
    1. Step 1
    2. Step 2
    3. Step 3
    """

    # Step 1: Schema changes (use SQLAlchemy ops)
    op.create_table(...)

    # Step 2: Data migrations (use raw SQL)
    op.execute("INSERT INTO ...")


def downgrade() -> None:
    """Reverse the changes from upgrade().

    Steps (reverse order):
    1. Revert data changes
    2. Revert schema changes
    """

    # Reverse order of upgrade
    op.drop_table(...)
```

## Common Patterns

### Adding a new column with backfill

```python
def upgrade() -> None:
    # 1. Add column (nullable initially)
    op.add_column('users', sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True))

    # 2. Backfill data
    op.execute("""
        UPDATE users
        SET organization_id = (SELECT id FROM organizations LIMIT 1)
        WHERE organization_id IS NULL;
    """)

    # 3. Make column NOT NULL
    op.alter_column('users', 'organization_id', nullable=False)

    # 4. Add foreign key
    op.create_foreign_key(
        'fk_users_organization_id',
        'users', 'organizations',
        ['organization_id'], ['id'],
        ondelete='CASCADE'
    )
```

### Renaming a table with relationships

```python
def upgrade() -> None:
    # 1. Rename enum if exists
    op.execute("ALTER TYPE old_status RENAME TO new_status;")

    # 2. Rename table
    op.rename_table('old_table', 'new_table')

    # 3. Update foreign keys in related tables
    op.drop_constraint('fk_related_old_table_id', 'related_table', type_='foreignkey')
    op.create_foreign_key(
        'fk_related_new_table_id',
        'related_table', 'new_table',
        ['new_table_id'], ['id'],
        ondelete='CASCADE'
    )

    # 4. Rename indexes
    op.execute("ALTER INDEX idx_old_table_column RENAME TO idx_new_table_column;")
```

## Testing Migrations

```bash
# Test upgrade
docker compose exec api poetry run alembic upgrade head

# Test downgrade
docker compose exec api poetry run alembic downgrade -1

# Test re-upgrade
docker compose exec api poetry run alembic upgrade head

# Check current version
docker compose exec api poetry run alembic current

# View migration history
docker compose exec api poetry run alembic history
```

## Common Mistakes to Avoid

1. ❌ Modifying applied migrations
2. ❌ Using raw SQL for DDL operations
3. ❌ Forgetting to test downgrade
4. ❌ Not handling existing data during schema changes
5. ❌ Creating enums with raw SQL (SQLAlchemy can't track them)
6. ❌ Using `create_type=False` in the first migration with an enum
7. ❌ Hardcoding UUIDs or timestamps in data migrations

## Checklist Before Committing

- [ ] Migration tested with `upgrade` and `downgrade`
- [ ] DDL operations use SQLAlchemy ops (not raw SQL)
- [ ] Data migrations use clear raw SQL
- [ ] Enums use `create_type=True` (first use) or `False` (reuse)
- [ ] Foreign keys use `op.create_foreign_key()` / `op.drop_constraint()`
- [ ] Migration has clear docstring explaining changes
- [ ] Related models updated to match schema
