#!/usr/bin/env python3
"""
Migration workflow utility for Alembic with environment-specific database support.
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings


def run_alembic_command(command: list[str], env_vars: dict = None) -> tuple[bool, str]:
    """Run an Alembic command with proper environment setup."""
    # Set up environment
    env = os.environ.copy()
    if env_vars:
        env.update(env_vars)

    try:
        result = subprocess.run(
            ["poetry", "run", "alembic"] + command,
            capture_output=True,
            text=True,
            env=env,
            cwd=Path(__file__).parent.parent,
        )

        output = result.stdout + result.stderr if result.stderr else result.stdout
        return result.returncode == 0, output
    except Exception as e:
        return False, str(e)


def generate_migration(message: str, use_local: bool = None) -> tuple[bool, str]:
    """Generate a new migration from model changes."""
    print(f"🔄 Generating migration: {message}")

    env_vars = {}
    if use_local is not None:
        env_vars["USE_LOCAL_DB"] = "true" if use_local else "false"

    command = ["revision", "--autogenerate", "-m", message]
    success, output = run_alembic_command(command, env_vars)

    if success:
        print("✅ Migration generated successfully")
    else:
        print("❌ Failed to generate migration")

    return success, output


def apply_migrations(use_local: bool = None) -> tuple[bool, str]:
    """Apply pending migrations to the database."""
    print("🔄 Applying migrations...")

    env_vars = {}
    if use_local is not None:
        env_vars["USE_LOCAL_DB"] = "true" if use_local else "false"

    command = ["upgrade", "head"]
    success, output = run_alembic_command(command, env_vars)

    if success:
        print("✅ Migrations applied successfully")
    else:
        print("❌ Failed to apply migrations")

    return success, output


def rollback_migration(revision: str = None, use_local: bool = None) -> tuple[bool, str]:
    """Rollback to a specific migration or previous one."""
    target = revision or "-1"
    print(f"🔄 Rolling back to: {target}")

    env_vars = {}
    if use_local is not None:
        env_vars["USE_LOCAL_DB"] = "true" if use_local else "false"

    command = ["downgrade", target]
    success, output = run_alembic_command(command, env_vars)

    if success:
        print("✅ Rollback completed successfully")
    else:
        print("❌ Failed to rollback")

    return success, output


def migration_status(use_local: bool = None) -> tuple[bool, str]:
    """Show current migration status."""
    print("🔍 Checking migration status...")

    env_vars = {}
    if use_local is not None:
        env_vars["USE_LOCAL_DB"] = "true" if use_local else "false"

    command = ["current"]
    success, output = run_alembic_command(command, env_vars)

    if success:
        print("✅ Migration status retrieved")
    else:
        print("❌ Failed to get migration status")

    # Also get history
    command = ["history", "--verbose"]
    hist_success, hist_output = run_alembic_command(command, env_vars)

    combined_output = output
    if hist_success:
        combined_output += "\n\nMigration History:\n" + hist_output

    return success, combined_output


def show_pending_migrations(use_local: bool = None) -> tuple[bool, str]:
    """Show pending migrations that haven't been applied."""
    print("🔍 Checking for pending migrations...")

    env_vars = {}
    if use_local is not None:
        env_vars["USE_LOCAL_DB"] = "true" if use_local else "false"

    command = ["show", "head"]
    success, output = run_alembic_command(command, env_vars)

    return success, output


def main():
    """Main CLI interface."""
    parser = argparse.ArgumentParser(description="Migration workflow utility")
    parser.add_argument(
        "--local", action="store_true", help="Use local database instead of configured default"
    )
    parser.add_argument(
        "--supabase", action="store_true", help="Use Supabase database (override local flag)"
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Generate command
    gen_parser = subparsers.add_parser("generate", help="Generate new migration")
    gen_parser.add_argument("message", help="Migration message")

    # Apply command
    subparsers.add_parser("apply", help="Apply pending migrations")

    # Rollback command
    rollback_parser = subparsers.add_parser("rollback", help="Rollback migrations")
    rollback_parser.add_argument(
        "revision", nargs="?", help="Specific revision to rollback to (default: previous)"
    )

    # Status command
    subparsers.add_parser("status", help="Show migration status")

    # Pending command
    subparsers.add_parser("pending", help="Show pending migrations")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # Determine database selection
    use_local = None
    if args.supabase:
        use_local = False
    elif args.local:
        use_local = True

    # Display configuration
    db_type = "local" if use_local else "configured"
    if use_local is None:
        db_type = f"configured ({settings.db_url[:20]}...)"

    print(f"Database: {db_type}")
    print("=" * 50)

    # Execute command
    success = False
    output = ""

    if args.command == "generate":
        success, output = generate_migration(args.message, use_local)
    elif args.command == "apply":
        success, output = apply_migrations(use_local)
    elif args.command == "rollback":
        success, output = rollback_migration(args.revision, use_local)
    elif args.command == "status":
        success, output = migration_status(use_local)
    elif args.command == "pending":
        success, output = show_pending_migrations(use_local)

    # Display output
    if output:
        print("\nOutput:")
        print("-" * 30)
        print(output)

    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
