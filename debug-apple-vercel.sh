#!/bin/bash

# 🔍 Apple Authentication Debug Script for Vercel
# Debugging "Cookie 'aasp' has been rejected for invalid domain" on Vercel

echo "🔍 Apple Authentication Debug - Vercel Deployment"
echo "================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🍪 Diagnosing Apple 'aasp' Cookie Domain Rejection on Vercel...${NC}"
echo ""

# 1. Vercel domain configuration
echo -e "${YELLOW}1. Vercel Domain Configuration:${NC}"
echo "   What's your Vercel deployment URL?"
echo "   Examples:"
echo "   - https://evault-xxx.vercel.app (auto-generated)"
echo "   - https://your-custom-domain.com (custom domain)"
echo ""
echo "   🎯 This URL must EXACTLY match your Apple Developer Console configuration!"
echo ""

# 2. Apple Developer Console Domain Setup for Vercel
echo -e "${YELLOW}2. Apple Developer Console Setup for Vercel:${NC}"
echo ""
echo "   📋 Required Apple Developer Console Configuration:"
echo "   🔗 Service ID: com.evaultapp.web"
echo ""
echo "   ✅ Domains and Subdomains must include:"
echo "      - your-vercel-app.vercel.app"
echo "      - your-custom-domain.com (if using custom domain)"
echo ""
echo "   ✅ Return URLs must include:"
echo "      - https://your-vercel-app.vercel.app/api/auth/callback/apple"
echo "      - https://your-custom-domain.com/api/auth/callback/apple (if using custom domain)"
echo ""

# 3. Vercel Environment Variables
echo -e "${YELLOW}3. Vercel Environment Variables Check:${NC}"
echo ""
echo "   📝 Required in Vercel Dashboard → Project → Settings → Environment Variables:"
echo "   ================================================================"
echo "   NEXTAUTH_URL=https://your-vercel-app.vercel.app"
echo "   NEXTAUTH_SECRET=your-random-secret"
echo "   APPLE_ID=com.evaultapp.web"
echo "   APPLE_SECRET=your-generated-jwt-token"
echo "   NEXT_PUBLIC_API_URL=https://your-backend-url"
echo ""
echo "   ⚠️  CRITICAL: NEXTAUTH_URL must match your actual Vercel URL exactly!"
echo ""

# 4. Domain Association File Accessibility
echo -e "${YELLOW}4. Domain Association File Test:${NC}"
echo ""
echo "   🧪 Test if domain association is accessible on Vercel:"
echo "   curl -s https://your-vercel-app.vercel.app/.well-known/apple-developer-domain-association.txt"
echo ""
echo "   📄 Expected content:"
cat client/public/.well-known/apple-developer-domain-association.txt 2>/dev/null || echo "   ❌ Domain association file not found locally"
echo ""

# 5. Common Vercel + Apple Issues
echo -e "${YELLOW}5. Common Vercel + Apple Authentication Issues:${NC}"
echo ""
echo "   🚨 Issue 1: Domain Mismatch"
echo "      - Apple Service ID domains don't include Vercel URL"
echo "      - NEXTAUTH_URL doesn't match actual Vercel URL"
echo ""
echo "   🚨 Issue 2: Return URL Mismatch"
echo "      - Apple Return URL doesn't match Vercel callback URL"
echo "      - Missing '/api/auth/callback/apple' in Apple config"
echo ""
echo "   🚨 Issue 3: Environment Variables"
echo "      - APPLE_ID or APPLE_SECRET not set in Vercel"
echo "      - NEXTAUTH_SECRET missing or incorrect"
echo ""
echo "   🚨 Issue 4: Domain Association Not Accessible"
echo "      - File not deploying to Vercel public folder"
echo "      - NextJS routing issues with .well-known files"
echo ""

# 6. Vercel-specific Solutions
echo -e "${YELLOW}6. Vercel-Specific Solutions:${NC}"
echo ""
echo "   🔧 Solution 1: Update Apple Developer Console"
echo "      1. Go to https://developer.apple.com/account/resources/identifiers/list/serviceId"
echo "      2. Click 'com.evaultapp.web'"
echo "      3. Add your Vercel domain to 'Domains and Subdomains'"
echo "      4. Add your Vercel callback URL to 'Return URLs'"
echo ""
echo "   🔧 Solution 2: Fix Vercel Environment Variables"
echo "      1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables"
echo "      2. Set NEXTAUTH_URL to your exact Vercel URL"
echo "      3. Ensure all Apple credentials are properly set"
echo "      4. Redeploy after environment variable changes"
echo ""
echo "   🔧 Solution 3: Verify Domain Association Deployment"
echo "      1. Check if .well-known files deploy correctly to Vercel"
echo "      2. Test accessibility via browser/curl"
echo "      3. May need vercel.json configuration for .well-known routing"
echo ""

# 7. Vercel Configuration Check
echo -e "${YELLOW}7. Vercel Configuration (vercel.json):${NC}"
echo ""
if [ -f "vercel.json" ]; then
    echo -e "${GREEN}   ✅ vercel.json exists${NC}"
    echo "   📄 Content:"
    cat vercel.json
    echo ""
else
    echo -e "${YELLOW}   ⚠️  No vercel.json found${NC}"
    echo "   💡 You might need vercel.json for .well-known file routing:"
    echo '   {'
    echo '     "rewrites": ['
    echo '       {'
    echo '         "source": "/.well-known/apple-developer-domain-association.txt",'
    echo '         "destination": "/api/apple-association"'
    echo '       }'
    echo '     ]'
    echo '   }'
    echo ""
fi

# 8. Quick Diagnostic Commands
echo -e "${YELLOW}8. Quick Diagnostic Steps:${NC}"
echo ""
echo "   🔍 Step 1: Check your Vercel deployment URL"
echo "      - Go to Vercel Dashboard → Your Project"
echo "      - Copy the exact deployment URL"
echo ""
echo "   🔍 Step 2: Test domain association accessibility"
echo "      - Open: https://your-vercel-url/.well-known/apple-developer-domain-association.txt"
echo "      - Should return JSON with appID and webcredentials"
echo ""
echo "   🔍 Step 3: Verify Apple Developer Console"
echo "      - Service ID domains include your Vercel URL"
echo "      - Return URLs match your Vercel callback URL"
echo ""
echo "   🔍 Step 4: Check Vercel Environment Variables"
echo "      - NEXTAUTH_URL matches your Vercel URL exactly"
echo "      - All Apple credentials are set and correct"
echo ""

# 9. Advanced Vercel Debugging
echo -e "${YELLOW}9. Advanced Vercel Debugging:${NC}"
echo ""
echo "   🔧 Check Vercel Function Logs:"
echo "      - Go to Vercel Dashboard → Your Project → Functions"
echo "      - Look for Apple authentication-related errors"
echo "      - Check NextAuth logs during Apple Sign-In attempts"
echo ""
echo "   🔧 Check Vercel Build Logs:"
echo "      - Ensure .well-known files are included in build"
echo "      - Check for any Apple-related build warnings"
echo ""

echo -e "${GREEN}🎯 Most Likely Vercel + Apple Issues:${NC}"
echo ""
echo "1️⃣  **Domain Mismatch:** Apple Service ID doesn't include your Vercel URL"
echo "2️⃣  **Environment Variables:** NEXTAUTH_URL not set correctly in Vercel"
echo "3️⃣  **Return URL:** Apple callback URL doesn't match Vercel endpoint"
echo "4️⃣  **Domain Association:** File not accessible on Vercel domain"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo "1. Share your Vercel deployment URL"
echo "2. Check Apple Developer Console domain configuration"
echo "3. Verify Vercel environment variables"
echo "4. Test domain association file accessibility"
echo ""
echo -e "${YELLOW}💡 The 'aasp' cookie rejection on Vercel usually means:${NC}"
echo -e "${YELLOW}   Apple can't verify domain ownership or callback URL mismatch${NC}" 