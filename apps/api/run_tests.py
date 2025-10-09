#!/usr/bin/env python3
"""
Test Runner Script

This script demonstrates different approaches to testing the database models:
1. Simple mock tests (fast, comprehensive validation)
2. Docker PostgreSQL tests (comprehensive, requires Docker)
"""

import subprocess
import sys


def check_docker():
    """Check if Docker is available and running."""
    try:
        subprocess.run(["docker", "info"], capture_output=True, text=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def run_simple_tests():
    """Run simple mock tests (fast, comprehensive validation)."""
    print("🏃 Running simple mock tests (fast, comprehensive validation)...")
    result = subprocess.run(["poetry", "run", "pytest", "test_models_simple.py", "-v"])
    return result.returncode == 0


def run_postgres_tests():
    """Run PostgreSQL tests with Docker."""
    print("🐘 Running PostgreSQL tests (comprehensive, requires Docker)...")
    result = subprocess.run(
        [
            "poetry",
            "run",
            "pytest",
            "tests/test_models_postgres.py",
            "-v",
            "-s",  # Don't capture output so we can see Docker logs
        ]
    )
    return result.returncode == 0


def main():
    """Main test runner."""
    print("🧪 Olympus Database Model Test Runner")
    print("=" * 50)

    # Check what's available
    docker_available = check_docker()

    print(f"Docker available: {'✅' if docker_available else '❌'}")
    print()

    if len(sys.argv) > 1:
        test_type = sys.argv[1].lower()
    else:
        # Interactive mode
        print("Available test types:")
        print("1. simple   - Fast mock tests (comprehensive validation)")
        if docker_available:
            print("2. postgres - Comprehensive PostgreSQL tests (requires Docker)")
        print("3. both     - Run both test suites")
        print()

        choice = input("Choose test type (1-3) or name: ").strip()

        if choice == "1":
            test_type = "simple"
        elif choice == "2" and docker_available:
            test_type = "postgres"
        elif choice == "3":
            test_type = "both"
        else:
            test_type = choice

    # Run tests based on selection
    success = True

    if test_type in ["simple", "both"]:
        print()
        if not run_simple_tests():
            success = False
            print("❌ Simple tests failed!")
        else:
            print("✅ Simple tests passed!")

    if test_type in ["postgres", "both"] and docker_available:
        print()
        if not run_postgres_tests():
            success = False
            print("❌ PostgreSQL tests failed!")
        else:
            print("✅ PostgreSQL tests passed!")
    elif test_type in ["postgres", "both"] and not docker_available:
        print("⚠️  PostgreSQL tests skipped - Docker not available")

    print()
    if success:
        print("🎉 All tests completed successfully!")
        sys.exit(0)
    else:
        print("💥 Some tests failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
