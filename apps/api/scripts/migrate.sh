#!/bin/bash
# Migration convenience script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "pyproject.toml" ]; then
    print_error "Please run this script from the API directory (where pyproject.toml is located)"
    exit 1
fi

# Default to local database for development
DB_FLAG="--local"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --supabase)
            DB_FLAG="--supabase"
            shift
            ;;
        --local)
            DB_FLAG="--local"
            shift
            ;;
        *)
            break
            ;;
    esac
done

case $1 in
    "init")
        print_status "Initializing database with initial migration..."
        poetry run python scripts/migrate.py $DB_FLAG generate "Initial migration"
        poetry run python scripts/migrate.py $DB_FLAG apply
        ;;
    "generate")
        if [ -z "$2" ]; then
            print_error "Please provide a migration message"
            echo "Usage: $0 generate \"Your migration message\""
            exit 1
        fi
        print_status "Generating migration: $2"
        poetry run python scripts/migrate.py $DB_FLAG generate "$2"
        ;;
    "apply")
        print_status "Applying pending migrations..."
        poetry run python scripts/migrate.py $DB_FLAG apply
        ;;
    "rollback")
        print_warning "Rolling back one migration..."
        poetry run python scripts/migrate.py $DB_FLAG rollback
        ;;
    "status")
        print_status "Checking migration status..."
        poetry run python scripts/migrate.py $DB_FLAG status
        ;;
    "check")
        print_status "Testing database connection..."
        poetry run python scripts/db_util.py
        ;;
    "reset")
        print_warning "This will reset all migrations. Are you sure? (y/N)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            print_warning "Resetting database..."
            poetry run python scripts/migrate.py $DB_FLAG rollback base || true
            # Remove migration files (keep this optional)
            # rm -f alembic/versions/*.py
            print_status "Database reset complete. Run 'init' to recreate migrations."
        else
            print_status "Reset cancelled."
        fi
        ;;
    "help"|"")
        echo "Migration Management Script"
        echo "=========================="
        echo ""
        echo "Usage: $0 [--local|--supabase] <command>"
        echo ""
        echo "Database Options:"
        echo "  --local     Use local PostgreSQL database (default)"
        echo "  --supabase  Use Supabase database"
        echo ""
        echo "Commands:"
        echo "  init                    Initialize database with first migration"
        echo "  generate \"message\"      Generate new migration from model changes"
        echo "  apply                   Apply all pending migrations"
        echo "  rollback                Rollback one migration"
        echo "  status                  Show current migration status"
        echo "  check                   Test database connection"
        echo "  reset                   Reset all migrations (destructive!)"
        echo "  help                    Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 --local generate \"Add user table\""
        echo "  $0 --supabase apply"
        echo "  $0 status"
        echo "  $0 check"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Run '$0 help' for available commands"
        exit 1
        ;;
esac