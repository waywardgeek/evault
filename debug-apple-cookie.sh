#!/bin/bash

# 🔍 Apple Cookie Domain Debug Script
# Comprehensive debugging for "Cookie 'aasp' has been rejected for invalid domain"

echo "🔍 Apple Cookie Domain Debug Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🍪 Diagnosing Apple 'aasp' Cookie Domain Rejection...${NC}"
echo ""

# 1. Check what domain/URL you're currently using
echo -e "${YELLOW}1. Current Development Environment:${NC}"
echo "   What URL are you accessing the app from?"
echo "   Common options:"
echo "   - http://localhost:3000 ❌ (HTTP not allowed by Apple)"
echo "   - https://localhost:3000 ✅ (HTTPS required)"
echo "   - https://your-domain.com ✅ (Production domain)"
echo ""

# 2. Check if development server supports HTTPS
echo -e "${YELLOW}2. HTTPS Configuration Check:${NC}"
if [ -f "package.json" ]; then
    if grep -q "\"dev\".*\"next dev\"" client/package.json 2>/dev/null; then
        echo -e "${RED}   ❌ Standard Next.js dev server (HTTP only)${NC}"
        echo "   💡 Apple Sign-In requires HTTPS even in development"
    else
        echo -e "${GREEN}   ✅ Custom dev server configuration detected${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  No package.json found in client directory${NC}"
fi
echo ""

# 3. Apple Developer Console Domain Configuration
echo -e "${YELLOW}3. Apple Developer Console Domain Setup:${NC}"
echo "   📋 Required Apple Developer Console Configuration:"
echo ""
echo "   🔗 Service ID (com.evaultapp.web) must have:"
echo "   ✅ Domains and Subdomains:"
echo "      - localhost (for development)"
echo "      - your-production-domain.com (for production)"
echo ""
echo "   🔗 Return URLs:"
echo "      - https://localhost:3000/api/auth/callback/apple"
echo "      - https://your-domain.com/api/auth/callback/apple"
echo ""
echo "   ⚠️  CRITICAL: Apple does NOT accept HTTP URLs!"
echo ""

# 4. Check current domain association configuration
echo -e "${YELLOW}4. Domain Association File Check:${NC}"
if [ -f "client/public/.well-known/apple-developer-domain-association.txt" ]; then
    echo -e "${GREEN}   ✅ Domain association file exists${NC}"
    echo "   📄 Content:"
    cat client/public/.well-known/apple-developer-domain-association.txt | head -15
    echo ""
else
    echo -e "${RED}   ❌ Domain association file missing${NC}"
fi

# 5. NextAuth configuration
echo -e "${YELLOW}5. NextAuth Configuration Check:${NC}"
if grep -q "AppleProvider" client/src/lib/auth.ts; then
    echo -e "${GREEN}   ✅ AppleProvider configured${NC}"
    
    # Check if NEXTAUTH_URL is set for HTTPS
    echo "   🔍 Environment variables needed:"
    echo "      NEXTAUTH_URL=https://localhost:3000 (development)"
    echo "      NEXTAUTH_URL=https://your-domain.com (production)"
    echo ""
else
    echo -e "${RED}   ❌ AppleProvider not found${NC}"
fi

# 6. Common solutions for cookie domain issues
echo -e "${YELLOW}6. Common Solutions for Apple Cookie Domain Issues:${NC}"
echo ""
echo "   🔧 Solution 1: Use HTTPS in Development"
echo "      Create client/.env.local with:"
echo "      NEXTAUTH_URL=https://localhost:3000"
echo ""
echo "   🔧 Solution 2: Update Next.js for HTTPS Development"
echo "      npm install --save-dev https-localhost"
echo "      Update package.json dev script:"
echo "      \"dev\": \"https-localhost --port 3000 -- next dev\""
echo ""
echo "   🔧 Solution 3: Use ngrok for HTTPS Tunnel"
echo "      npm install -g ngrok"
echo "      ngrok http 3000"
echo "      Use the https://xxx.ngrok.io URL"
echo ""
echo "   🔧 Solution 4: Apple Developer Console Domain"
echo "      Ensure 'localhost' is added to Service ID domains"
echo "      Ensure return URL uses HTTPS"
echo ""

# 7. Testing commands
echo -e "${YELLOW}7. Testing Commands:${NC}"
echo ""
echo "   🧪 Test domain association accessibility:"
echo "      curl -s https://localhost:3000/.well-known/apple-developer-domain-association.txt"
echo ""
echo "   🧪 Test Apple Developer Console configuration:"
echo "      1. Go to https://developer.apple.com/account/resources/identifiers/list/serviceId"
echo "      2. Click on 'com.evaultapp.web'"
echo "      3. Verify domains include 'localhost' or your domain"
echo "      4. Verify return URLs use HTTPS"
echo ""

# 8. Environment variables template
echo -e "${YELLOW}8. Required Environment Variables:${NC}"
echo ""
echo "   📝 Create client/.env.local with:"
echo "   ================================"
echo "   NEXTAUTH_URL=https://localhost:3000"
echo "   NEXTAUTH_SECRET=your-random-secret"
echo "   APPLE_ID=com.evaultapp.web"
echo "   APPLE_SECRET=your-generated-jwt-token"
echo "   NEXT_PUBLIC_API_URL=http://localhost:8080"
echo ""

# 9. Quick fixes to try
echo -e "${YELLOW}9. Quick Fixes to Try Right Now:${NC}"
echo ""
echo "   1️⃣  Force HTTPS in development:"
echo "      Add to client/.env.local: NEXTAUTH_URL=https://localhost:3000"
echo ""
echo "   2️⃣  Check Apple Developer Console:"
echo "      - Service ID 'com.evaultapp.web' has 'localhost' in domains"
echo "      - Return URL is 'https://localhost:3000/api/auth/callback/apple'"
echo ""
echo "   3️⃣  Clear all browser data and test in incognito"
echo ""
echo "   4️⃣  Check browser console for specific error details"
echo ""

# 10. Advanced debugging
echo -e "${YELLOW}10. Advanced Debugging:${NC}"
echo ""
echo "    🔍 Check browser Network tab during Apple Sign-In:"
echo "       - Look for failed requests to appleid.apple.com"
echo "       - Check request headers and response codes"
echo "       - Look for CORS or domain-related errors"
echo ""
echo "    🔍 Check browser Console for additional errors:"
echo "       - Apple-specific JavaScript errors"
echo "       - NextAuth debugging messages"
echo "       - HTTPS/SSL certificate issues"
echo ""

echo -e "${GREEN}🎯 Most Likely Solution:${NC}"
echo -e "${BLUE}Apple Sign-In requires HTTPS even in development!${NC}"
echo ""
echo "Quick fix:"
echo "1. Add NEXTAUTH_URL=https://localhost:3000 to client/.env.local"
echo "2. Set up HTTPS development server or use ngrok"
echo "3. Update Apple Developer Console Return URL to use HTTPS"
echo ""
echo -e "${YELLOW}💡 The 'aasp' cookie is Apple's authentication state cookie.${NC}"
echo -e "${YELLOW}   It gets rejected when domain/protocol doesn't match Apple's config.${NC}" 