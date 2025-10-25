import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Import our models and settings
from app.config import settings
from app.models import Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Set the database URL from our settings
config.set_main_option("sqlalchemy.url", settings.db_url)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def include_object(object, name, type_, reflected, compare_to):  # noqa: ARG001
    """
    Filter objects to include/exclude from autogenerate.

    Exclude Supabase internal schemas to prevent unwanted migrations.
    """
    # Exclude Supabase internal schemas
    if type_ == "table":
        # Get schema name
        schema = object.schema if hasattr(object, "schema") else None

        # Exclude Supabase internal schemas
        supabase_schemas = {
            "auth",
            "storage",
            "realtime",
            "vault",
            "supabase_migrations",
            "extensions",
        }
        if schema in supabase_schemas:
            return False

    # Exclude Supabase internal tables in public schema
    if type_ == "table" and name in ["schema_migrations", "supabase_migrations", "alembic_version"]:
        return False

    # Include everything else
    return True


def compare_type(context, inspected_column, metadata_column, inspected_type, metadata_type):  # noqa: PLR0911, ARG001
    """
    Custom type comparison for better enum and type detection.

    This helps Alembic properly detect:
    - Enum type changes
    - PostgreSQL-specific type differences
    - Supabase pooler type variations
    """
    from sqlalchemy import Enum as SQLEnum
    from sqlalchemy.dialects import postgresql

    # Handle PostgreSQL Enum types
    if isinstance(metadata_type, SQLEnum):
        # If both are enums, compare their values
        if hasattr(inspected_type, "enums"):
            # Compare enum values
            metadata_values = set(metadata_type.enums)
            inspected_values = set(inspected_type.enums)
            if metadata_values != inspected_values:
                return True  # Types differ
            return False  # Types match

        # If inspected is string but metadata is enum, they match if enum exists in DB
        # (Alembic sometimes reflects enums as strings)
        if isinstance(inspected_type, postgresql.VARCHAR | str):
            return False  # Assume match, migration will handle if needed

    # Handle numeric types - compare precision
    if isinstance(metadata_type, postgresql.NUMERIC) and hasattr(inspected_type, "precision") and hasattr(metadata_type, "precision"):
        if inspected_type.precision != metadata_type.precision:
            return True
        if inspected_type.scale != metadata_type.scale:
            return True
        return False

    # Handle timestamp with/without timezone
    if isinstance(metadata_type, postgresql.TIMESTAMP) and hasattr(inspected_type, "timezone") and hasattr(metadata_type, "timezone"):
        if inspected_type.timezone != metadata_type.timezone:
            return True
        return False

    # Default: let Alembic handle the comparison
    return None


def render_item(type_, obj, autogen_context):  # noqa: ARG001
    """
    Custom rendering for PostgreSQL types to avoid duplicate enum creation.

    This ensures that when Alembic generates migrations, it uses create_type=False
    for existing enum types to prevent "type already exists" errors.
    """
    from sqlalchemy import Enum as SQLEnum

    # Handle Enum types - use create_type=False to reference existing enums
    if isinstance(obj, SQLEnum):
        enum_values = ", ".join(repr(e) for e in obj.enums)
        enum_name = obj.name
        # Always use create_type=False to reference existing enums
        # The alignment migration will create the actual enum types
        return f"sa.Enum({enum_values}, name={enum_name!r}, create_type=False)"

    # Default rendering
    return False


def do_run_migrations(connection: Connection) -> None:
    """Run migrations with the provided connection."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        # Enable better change detection with custom comparators
        compare_type=compare_type,  # Use our custom type comparison
        compare_server_default=True,
        # Include schemas if needed
        include_schemas=True,
        # Filter out Supabase internal objects
        include_object=include_object,
        # Custom rendering for enums
        render_item=render_item,
        # Render item sorting for consistent migrations
        render_as_batch=True,
        # Store alembic_version in _internal schema (not exposed via PostgREST)
        # This resolves Supabase RLS linter warnings for system tables
        version_table_schema="_internal",
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in async mode."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = settings.db_url

    # Supabase uses PgBouncer which doesn't support prepared statements
    # We must disable statement cache for compatibility
    connect_args = {"statement_cache_size": 0}

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
