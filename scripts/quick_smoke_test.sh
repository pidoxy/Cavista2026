#!/bin/bash
# Quick smoke test using curl. Run: ./scripts/quick_smoke_test.sh [BASE_URL]
# Requires: curl, jq (optional, for pretty output)

BASE="${1:-https://cavista2026-production.up.railway.app}"
BASE="${BASE%/}"

echo "=== AidCare Quick Smoke Test ==="
echo "Base URL: $BASE"
echo ""

# 1. Health
echo "1. Health check..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE/health" | grep -q 200; then
  echo "   OK"
else
  echo "   FAIL - is the backend running?"
  exit 1
fi

# 2. Login
echo "2. Login..."
RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"chioma@lasuth.ng","password":"demo1234"}')
TOKEN=$(echo "$RESP" | grep -o '"access_token":"[^"]*"' | sed 's/.*:"\([^"]*\)".*/\1/')

if [ -z "$TOKEN" ]; then
  echo "   FAIL - run seed_demo.py to create test user"
  exit 1
fi
echo "   OK (token obtained)"

# 3. /auth/me
echo "3. /auth/me..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/me" -H "Authorization: Bearer $TOKEN" | grep -q 200; then
  echo "   OK"
else
  echo "   FAIL"
  exit 1
fi

# 4. Patients
echo "4. Patients list..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/patients/" -H "Authorization: Bearer $TOKEN")
if [ "$STATUS" = "200" ]; then
  echo "   OK"
else
  echo "   FAIL (status $STATUS)"
fi

echo ""
echo "=== Smoke test complete ==="
