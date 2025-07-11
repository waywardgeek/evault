#!/bin/bash

echo "🍎 Apple Sign In Configuration Checker"
echo "======================================"
echo ""

# Check environment
echo "1️⃣ Environment Check:"
echo "   Current time: $(date)"
echo "   Unix timestamp: $(date +%s)"
echo ""

# Check key file
echo "2️⃣ Private Key Check:"
if [ -f "AuthKey_4S892A36WV.p8" ]; then
    echo "   ✅ Key file found: AuthKey_4S892A36WV.p8"
    echo "   File size: $(wc -c < AuthKey_4S892A36WV.p8) bytes"
    echo "   File permissions: $(ls -l AuthKey_4S892A36WV.p8 | awk '{print $1}')"
else
    echo "   ❌ Key file NOT FOUND: AuthKey_4S892A36WV.p8"
fi
echo ""

# Check JWT
echo "3️⃣ JWT Analysis:"
JWT="eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjRTODkyQTM2V1YifQ.eyJpYXQiOjE3NTIyNDQ3NjksImV4cCI6MTc4MzgwMjM2OSwiYXVkIjoiaHR0cHM6Ly9hcHBsZWlkLmFwcGxlLmNvbSIsImlzcyI6IkIyU1VZN1NVOUEiLCJzdWIiOiJjb20uZXZhdWx0YXBwLndlYiJ9.DPboQsqjqyPgE4HqOfiM-F1SmO5h7Pzpal_n0mPxmXQRBI-9HIog2uC2PjJy-HtMWguspACZaRQbtY9WpcEKMw"
echo "   JWT length: ${#JWT} characters"
echo ""

# Apple Developer Console Checklist
echo "4️⃣ Apple Developer Console Verification Checklist:"
echo ""
echo "   📱 Primary App ID Setup:"
echo "   □ Do you have a primary iOS/macOS App ID created?"
echo "   □ Is the App ID Bundle ID something like: com.evaultapp.ios"
echo "   □ Is 'Sign In with Apple' capability enabled on the App ID?"
echo ""
echo "   🌐 Service ID Setup (com.evaultapp.web):"
echo "   □ Is the Service ID associated with the correct primary App ID?"
echo "   □ Is 'Sign In with Apple' enabled and configured?"
echo "   □ Domain: evaultapp.com (without https://)"
echo "   □ Return URL: https://evaultapp.com/api/auth/callback/apple"
echo ""
echo "   🔑 Key Setup (4S892A36WV):"
echo "   □ Is the key still active (not revoked)?"
echo "   □ Does it have 'Sign In with Apple' enabled?"
echo "   □ Is it associated with the same Team ID (B2SUY7SU9A)?"
echo ""

# Common issues
echo "5️⃣ Common 'invalid_client' Causes:"
echo ""
echo "   1. Service ID not associated with a primary App ID"
echo "      → In Service ID settings, check 'Primary App ID' dropdown"
echo ""
echo "   2. Domain not verified (even if configured)"
echo "      → No verification status shown means not verified"
echo "      → Try removing and re-adding the domain"
echo ""
echo "   3. Mismatch between Service ID and what's in the JWT 'sub' claim"
echo "      → JWT sub: com.evaultapp.web"
echo "      → Must match exactly with Service ID"
echo ""
echo "   4. Key revoked or regenerated"
echo "      → Check if key 4S892A36WV is still active"
echo ""

# Test recommendations
echo "6️⃣ Debugging Steps:"
echo ""
echo "   1. Try creating a NEW Service ID:"
echo "      - Create com.evaultapp.web2"
echo "      - Associate with primary App ID"
echo "      - Configure domain and return URL"
echo "      - Update APPLE_ID in environment"
echo "      - Regenerate JWT with new Service ID"
echo ""
echo "   2. Try with a fresh key:"
echo "      - Create new key in Apple Developer"
echo "      - Download the .p8 file"
echo "      - Generate new JWT"
echo "      - Update APPLE_SECRET"
echo ""
echo "   3. Verify Primary App ID association:"
echo "      - The Service ID MUST be linked to an App ID"
echo "      - This is often missed and causes invalid_client"
echo ""

echo "🔍 Current Configuration Summary:"
echo "   Team ID: B2SUY7SU9A"
echo "   Service ID: com.evaultapp.web"
echo "   Key ID: 4S892A36WV"
echo "   Domain: evaultapp.com"
echo "   Return URL: https://evaultapp.com/api/auth/callback/apple" 