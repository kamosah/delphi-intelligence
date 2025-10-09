#!/usr/bin/env python3
"""
Database utility script for testing connections and managing migrations.
"""

import asyncio
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings


async def test_database_connection(url: str) -> tuple[bool, str]:
    """Test database connection with the given URL."""
    try:
        # Use settings for connect args if available
        from app.config import settings

        connect_args = settings.db_connect_args if hasattr(settings, "db_connect_args") else {}

        engine = create_async_engine(url, echo=False, connect_args=connect_args)
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            result.fetchone()  # fetchone() is not awaitable
        await engine.dispose()
        return True, "Connection successful"
    except Exception as e:
        return False, str(e)


async def get_database_info(url: str) -> dict:
    """Get basic database information."""
    try:
        # Use settings for connect args if available
        from app.config import settings

        connect_args = settings.db_connect_args if hasattr(settings, "db_connect_args") else {}

        engine = create_async_engine(url, echo=False, connect_args=connect_args)
        async with engine.connect() as conn:
            # Get PostgreSQL version
            version_result = await conn.execute(text("SELECT version()"))
            version = version_result.fetchone()[0]

            # Get current database name
            db_result = await conn.execute(text("SELECT current_database()"))
            database_name = db_result.fetchone()[0]

            # Check if alembic_version table exists
            alembic_check = await conn.execute(
                text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'alembic_version'
                )
            """)
            )
            has_alembic = alembic_check.fetchone()[0]

            # Get current migration version if alembic exists
            current_version = None
            if has_alembic:
                version_result = await conn.execute(text("SELECT version_num FROM alembic_version"))
                row = version_result.fetchone()
                current_version = row[0] if row else None

        await engine.dispose()

        return {
            "version": version,
            "database_name": database_name,
            "has_alembic": has_alembic,
            "current_migration": current_version,
        }
    except Exception as e:
        return {"error": str(e)}


async def main():
    """Main function to test database configurations."""
    print("🔍 Database Connection Utility")
    print("=" * 50)

    # Test current configuration
    print(f"Environment: {settings.env}")
    print(f"Use local DB: {settings.use_local_db}")
    print(f"Current DB URL: {settings.db_url}")
    print()

    # Test connection
    print("Testing database connection...")
    success, message = await test_database_connection(settings.db_url)

    if success:
        print("✅ Connection successful!")
        print("\nGetting database information...")
        info = await get_database_info(settings.db_url)

        if "error" not in info:
            print(f"Database: {info['database_name']}")
            print(f"PostgreSQL Version: {info['version'][:50]}...")
            print(f"Alembic initialized: {info['has_alembic']}")
            if info["current_migration"]:
                print(f"Current migration: {info['current_migration']}")
            else:
                print("No migrations applied yet")
        else:
            print(f"❌ Error getting database info: {info['error']}")
    else:
        print(f"❌ Connection failed: {message}")

    print()

    # Test alternative configurations
    if not settings.use_local_db:
        print("Testing local database connection...")
        local_success, local_message = await test_database_connection(settings.local_database_url)
        if local_success:
            print("✅ Local database is also available")
        else:
            print(f"❌ Local database not available: {local_message}")

    print("\n" + "=" * 50)
    print("Configuration options:")
    print("- Set USE_LOCAL_DB=true to use local PostgreSQL")
    print("- Set DATABASE_URL to override database connection")
    print("- Set SUPABASE_DB_URL for direct Supabase connection")


if __name__ == "__main__":
    asyncio.run(main())
