#!/bin/bash

echo "🍎 Testing Apple Domain Verification"
echo "===================================="
echo ""

# Test 1: Check if Apple can access the file
echo "1️⃣ Testing domain association file accessibility:"
echo "   URL: https://evaultapp.com/.well-known/apple-developer-domain-association.txt"
echo ""

# Simulate Apple's request
echo "   Simulating Apple's verification request:"
curl -H "User-Agent: Apple-Domain-Verification" \
     -H "Accept: application/json" \
     -L -s -w "\n   HTTP Status: %{http_code}\n   Content-Type: %{content_type}\n" \
     https://evaultapp.com/.well-known/apple-developer-domain-association.txt \
     -o /tmp/apple-domain-test.json

echo ""
echo "   Response content:"
cat /tmp/apple-domain-test.json | jq . 2>/dev/null || cat /tmp/apple-domain-test.json
echo ""

# Test 2: Verify JSON structure
echo "2️⃣ Validating JSON structure:"
if jq . /tmp/apple-domain-test.json > /dev/null 2>&1; then
    echo "   ✅ Valid JSON"
    
    # Check for required fields
    if jq -e '.webcredentials.apps[]' /tmp/apple-domain-test.json > /dev/null 2>&1; then
        echo "   ✅ webcredentials.apps found"
        echo "   Apps: $(jq -r '.webcredentials.apps[]' /tmp/apple-domain-test.json)"
    else
        echo "   ❌ webcredentials.apps NOT found"
    fi
else
    echo "   ❌ Invalid JSON"
fi
echo ""

# Test 3: Check alternative domain formats
echo "3️⃣ Testing alternative domain configurations:"
echo ""
echo "   Current domain in Apple Console: evaultapp.com"
echo "   Alternative formats to try:"
echo "   - www.evaultapp.com"
echo "   - *.evaultapp.com"
echo ""

# Test 4: Direct verification test
echo "4️⃣ Apple verification requirements:"
echo "   ✓ HTTPS required (using https://)"
echo "   ✓ No redirects allowed (check with -L flag)"
echo "   ✓ Content-Type: application/json"
echo "   ✓ Valid JSON format"
echo "   ✓ Correct Team ID (B2SUY7SU9A)"
echo "   ✓ Correct Service ID (com.evaultapp.web)"
echo ""

# Cleanup
rm -f /tmp/apple-domain-test.json

echo "💡 Troubleshooting suggestions:"
echo ""
echo "   1. Force re-verification:"
echo "      - Remove domain from Service ID"
echo "      - Save"
echo "      - Wait 5 minutes"
echo "      - Re-add domain"
echo "      - Save again"
echo ""
echo "   2. Try adding www subdomain:"
echo "      - Add both 'evaultapp.com' AND 'www.evaultapp.com'"
echo "      - Some users report this triggers verification"
echo ""
echo "   3. Check DNS records:"
echo "      - Ensure no conflicting CNAME/A records"
echo "      - Apple may have issues with certain DNS setups"
