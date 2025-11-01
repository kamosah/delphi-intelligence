#!/bin/bash
# Test authentication setup for Swagger UI and GraphiQL

set -e

API_URL="http://localhost:8000"
TEST_EMAIL="testuser$(date +%s)@test.example.com"
TEST_PASSWORD="TestPassword123!"

echo "=========================================="
echo "Testing Authentication Setup"
echo "=========================================="
echo ""

echo "1. Testing API is accessible..."
curl -s "${API_URL}/" | python3 -m json.tool
echo "✓ API is running"
echo ""

echo "2. Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\",
    \"full_name\": \"Test User\"
  }")

echo "$REGISTER_RESPONSE" | python3 -m json.tool
echo "✓ User registered"
echo ""

echo "3. Logging in to get access token..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\"
  }")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
echo "✓ Login successful"
echo ""

echo "4. Testing authenticated endpoint..."
curl -s -X GET "${API_URL}/auth/me" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | python3 -m json.tool
echo "✓ Authentication working"
echo ""

echo "=========================================="
echo "Setup Complete! ✓"
echo "=========================================="
echo ""
echo "Your test credentials:"
echo "  Email: ${TEST_EMAIL}"
echo "  Password: ${TEST_PASSWORD}"
echo ""
echo "Your access token (valid for 24 hours):"
echo "${ACCESS_TOKEN}"
echo ""
echo "Next steps:"
echo ""
echo "1. For Swagger UI (${API_URL}/docs):"
echo "   - Click the 'Authorize' button (🔒 icon)"
echo "   - Paste the token above"
echo "   - Click 'Authorize', then 'Close'"
echo ""
echo "2. For GraphiQL (${API_URL}/graphql):"
echo "   - Click the 'Headers' button at the bottom"
echo "   - Add this JSON:"
echo '   {'
echo '     "Authorization": "Bearer YOUR_TOKEN_HERE"'
echo '   }'
echo ""
