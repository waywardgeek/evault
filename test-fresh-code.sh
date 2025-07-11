#!/bin/bash
echo "🔍 Fetching latest OAuth logs..."
CODE=$(curl -s https://evaultapp.com/api/oauth-log | jq -r '.logs[0]' | grep -oP 'code=\K[^&"]+' | head -1)

if [ -z "$CODE" ]; then
    echo "❌ No code found in logs. Please try Apple Sign In first."
    exit 1
fi

echo "✅ Found code: $CODE"
echo ""
echo "�� Testing token exchange..."

curl -X POST https://evaultapp.com/api/test-token-exchange \
  -H "Content-Type: application/json" \
  -d "{\"code\": \"$CODE\"}" \
  | jq

echo ""
echo "📝 If you see 'invalid_grant', the code works but is expired."
echo "📝 If you see 'invalid_client', there's a credential issue."
