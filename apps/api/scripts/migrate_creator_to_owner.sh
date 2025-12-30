#!/bin/bash
#
# Migrate SpiceDB thread relationships from creator to owner
#
# This script copies all existing thread#creator relationships to thread#owner relationships,
# allowing us to safely deprecate the creator relation.
#
# Related: LOG-254
# Usage: ./scripts/migrate_creator_to_owner.sh

set -e

SPICEDB_ENDPOINT="localhost:50051"
SPICEDB_TOKEN="G6dfhQVrBnsFojxwHRiiyZslt9ZRo/Jg0YxFfHVcNXI="

echo "🔍 Fetching all thread#creator relationships..."

# Read all creator relationships as JSON
RELATIONSHIPS=$(zed relationship read thread creator \
  --endpoint "$SPICEDB_ENDPOINT" \
  --token "$SPICEDB_TOKEN" \
  --insecure \
  --json)

# Count relationships
TOTAL=$(echo "$RELATIONSHIPS" | grep -c '"relation": "creator"' || echo "0")

if [ "$TOTAL" -eq 0 ]; then
  echo "✅ No creator relationships found. Migration not needed."
  exit 0
fi

echo "📊 Found $TOTAL creator relationships to migrate"
echo ""

SUCCESS=0
ERRORS=0

# Process each relationship
echo "$RELATIONSHIPS" | jq -c 'select(.relationship != null) | .relationship' | while read -r rel; do
  THREAD_ID=$(echo "$rel" | jq -r '.resource.objectId')
  USER_ID=$(echo "$rel" | jq -r '.subject.object.objectId')

  # Write owner relationship
  if zed relationship create thread:"$THREAD_ID" owner user:"$USER_ID" \
      --endpoint "$SPICEDB_ENDPOINT" \
      --token "$SPICEDB_TOKEN" \
      --insecure \
      2>/dev/null; then
    echo "✓ Migrated thread:$THREAD_ID#creator@user:$USER_ID"
    ((SUCCESS++))
  else
    # Check if it already exists (not an error)
    if zed relationship read thread:"$THREAD_ID" owner user:"$USER_ID" \
        --endpoint "$SPICEDB_ENDPOINT" \
        --token "$SPICEDB_TOKEN" \
        --insecure \
        --json 2>/dev/null | grep -q "\"relation\": \"owner\""; then
      echo "⚠ Skipped thread:$THREAD_ID (owner relationship already exists)"
      ((SUCCESS++))
    else
      echo "✗ Failed to migrate thread:$THREAD_ID"
      ((ERRORS++))
    fi
  fi
done

echo ""
echo "============================================================"
echo "✅ Migration complete!"
echo "   Success: $SUCCESS"
echo "   Errors:  $ERRORS"
echo "============================================================"

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "⚠️  Some relationships failed to migrate. Check errors above."
  exit 1
fi
