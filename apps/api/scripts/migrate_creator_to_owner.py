"""
Migrate SpiceDB thread relationships from creator to owner.

This script copies all existing thread#creator relationships to thread#owner relationships,
allowing us to safely deprecate the creator relation.

Related: LOG-254
Usage: python scripts/migrate_creator_to_owner.py
"""

import json
import subprocess
import sys


def run_zed_command(args: list[str]) -> str:
    """Run a zed CLI command and return the output."""
    cmd = [
        "zed",
        *args,
        "--endpoint",
        "localhost:50051",
        "--token",
        "G6dfhQVrBnsFojxwHRiiyZslt9ZRo/Jg0YxFfHVcNXI=",
        "--insecure",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    return result.stdout


def main():
    """Migrate all creator relationships to owner relationships."""
    print("🔍 Fetching all thread#creator relationships...")

    # Read all creator relationships as JSON
    output = run_zed_command(["relationship", "read", "thread", "creator", "--json"])

    # Parse JSON lines
    relationships = []
    for line in output.strip().split("\n"):
        if line.strip():
            try:
                data = json.loads(line)
                if "relationship" in data:
                    relationships.append(data["relationship"])
            except json.JSONDecodeError:
                continue

    if not relationships:
        print("✅ No creator relationships found. Migration not needed.")
        return

    print(f"📊 Found {len(relationships)} creator relationships to migrate\n")

    # Write corresponding owner relationships
    success_count = 0
    error_count = 0

    for rel in relationships:
        thread_id = rel["resource"]["objectId"]
        user_id = rel["subject"]["object"]["objectId"]

        # Create owner relationship
        result = run_zed_command([
            "relationship",
            "create",
            f"thread:{thread_id}",
            "owner",
            f"user:{user_id}",
        ])

        if result:  # Success returns a zedtoken
            success_count += 1
            print(f"✓ Migrated thread:{thread_id}#creator@user:{user_id}")
        else:
            error_count += 1
            print(f"✗ Failed to migrate thread:{thread_id}")

    print("\n" + "=" * 60)
    print("✅ Migration complete!")
    print(f"   Success: {success_count}")
    print(f"   Errors:  {error_count}")
    print("=" * 60)

    if error_count > 0:
        print("\n⚠️  Some relationships failed to migrate. Check errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
