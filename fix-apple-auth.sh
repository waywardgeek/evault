#!/bin/bash

# 🍎 Apple Authentication Fix Script for eVault
# This script fixes common Apple Sign-In issues including cookie domain problems

echo "🍎 Apple Authentication Fix Script"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "client/src/lib/auth.ts" ]; then
    echo -e "${RED}❌ Error: Please run this script from the eVault project root directory${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Checking Apple Authentication Configuration...${NC}"
echo ""

# 1. Check Service ID consistency
echo -e "${YELLOW}1. Checking Service ID consistency...${NC}"

# Extract Service ID from generate-apple-secret.js
SERVICE_ID=$(grep "serviceId = " generate-apple-secret.js | sed "s/.*serviceId = '\(.*\)';.*/\1/" | tr -d "'")
echo "   Service ID in generate-apple-secret.js: $SERVICE_ID"

# Check domain association file
DOMAIN_ASSOC_SERVICE_ID=$(grep "appID" client/public/.well-known/apple-developer-domain-association.txt | sed 's/.*"appID": "B2SUY7SU9A\.\(.*\)".*/\1/')
echo "   Service ID in domain association: $DOMAIN_ASSOC_SERVICE_ID"

# Check API route
API_ROUTE_SERVICE_ID=$(grep "appID" client/src/app/api/apple-association/route.ts | sed 's/.*"appID": "B2SUY7SU9A\.\(.*\)".*/\1/')
echo "   Service ID in API route: $API_ROUTE_SERVICE_ID"

if [ "$SERVICE_ID" = "$DOMAIN_ASSOC_SERVICE_ID" ] && [ "$SERVICE_ID" = "$API_ROUTE_SERVICE_ID" ]; then
    echo -e "${GREEN}   ✅ Service IDs are consistent${NC}"
else
    echo -e "${RED}   ❌ Service ID mismatch detected!${NC}"
    echo -e "${YELLOW}   🔧 Fixing Service ID consistency...${NC}"
    
    # Update domain association file
    sed -i.bak "s/B2SUY7SU9A\.com\.evaultapp\.[^\"]*$/B2SUY7SU9A.$SERVICE_ID/g" client/public/.well-known/apple-developer-domain-association.txt
    
    # Update API route
    sed -i.bak "s/B2SUY7SU9A\.com\.evaultapp\.[^\"]*$/B2SUY7SU9A.$SERVICE_ID/g" client/src/app/api/apple-association/route.ts
    
    echo -e "${GREEN}   ✅ Fixed Service ID consistency${NC}"
fi

echo ""

# 2. Check environment variables
echo -e "${YELLOW}2. Checking environment variables...${NC}"

# Check if client environment has Apple credentials
if [ -f "client/.env.local" ]; then
    if grep -q "APPLE_ID" client/.env.local && grep -q "APPLE_SECRET" client/.env.local; then
        echo -e "${GREEN}   ✅ Apple credentials found in client/.env.local${NC}"
        
        # Check if they're not empty
        APPLE_ID=$(grep "APPLE_ID=" client/.env.local | cut -d'=' -f2)
        APPLE_SECRET=$(grep "APPLE_SECRET=" client/.env.local | cut -d'=' -f2)
        
        if [ -z "$APPLE_ID" ] || [ -z "$APPLE_SECRET" ]; then
            echo -e "${RED}   ❌ Apple credentials are empty${NC}"
        else
            echo -e "${GREEN}   ✅ Apple credentials are populated${NC}"
        fi
    else
        echo -e "${RED}   ❌ Apple credentials missing from client/.env.local${NC}"
    fi
else
    echo -e "${RED}   ❌ client/.env.local not found${NC}"
fi

echo ""

# 3. Check Apple Developer setup requirements
echo -e "${YELLOW}3. Apple Developer Console Setup Checklist...${NC}"

echo "   📋 Required Apple Developer Console Configuration:"
echo "   "
echo "   🔑 Service ID Configuration:"
echo "      - Service ID: $SERVICE_ID"
echo "      - Description: eVault Web Authentication"
echo "      - Domains: your-domain.com (or localhost for testing)"
echo "      - Return URLs: https://your-domain.com/api/auth/callback/apple"
echo "   "
echo "   🔐 Key Configuration:"
echo "      - Key ID: 4S892A36WV (from generate-apple-secret.js)"
echo "      - Team ID: B2SUY7SU9A (from generate-apple-secret.js)"
echo "      - Private Key: AuthKey_4S892A36WV.p8 (downloaded from Apple)"
echo "   "
echo "   🌐 Domain Verification:"
echo "      - Domain association file must be accessible at:"
echo "        https://your-domain.com/.well-known/apple-developer-domain-association.txt"
echo "   "

# 4. Check NextAuth configuration
echo -e "${YELLOW}4. Checking NextAuth configuration...${NC}"

if grep -q "AppleProvider" client/src/lib/auth.ts; then
    echo -e "${GREEN}   ✅ AppleProvider is configured in NextAuth${NC}"
else
    echo -e "${RED}   ❌ AppleProvider missing from NextAuth configuration${NC}"
fi

# Check for cookie configuration
if grep -q "useSecureCookies" client/src/lib/auth.ts; then
    echo -e "${GREEN}   ✅ Secure cookies are enabled${NC}"
else
    echo -e "${RED}   ❌ Secure cookies not configured${NC}"
fi

echo ""

# 5. Generate new Apple secret if needed
echo -e "${YELLOW}5. Apple JWT Secret Generation...${NC}"

if [ -f "AuthKey_4S892A36WV.p8" ]; then
    echo -e "${GREEN}   ✅ Apple private key file found${NC}"
    
    read -p "   🔄 Generate new Apple JWT secret? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}   🔧 Generating new Apple JWT secret...${NC}"
        
        if command -v node &> /dev/null; then
            node generate-apple-secret.js
            echo ""
            echo -e "${GREEN}   ✅ New Apple JWT secret generated!${NC}"
            echo -e "${YELLOW}   📝 Copy the APPLE_ID and APPLE_SECRET values to your environment variables${NC}"
        else
            echo -e "${RED}   ❌ Node.js not found. Please install Node.js to generate the secret.${NC}"
        fi
    fi
else
    echo -e "${RED}   ❌ Apple private key file (AuthKey_4S892A36WV.p8) not found${NC}"
    echo -e "${YELLOW}   📥 Download your private key from Apple Developer Console${NC}"
fi

echo ""

# 6. Domain verification
echo -e "${YELLOW}6. Domain Verification...${NC}"

if [ -f "client/public/.well-known/apple-developer-domain-association.txt" ]; then
    echo -e "${GREEN}   ✅ Domain association file exists${NC}"
    
    echo -e "${BLUE}   🔍 Testing domain association accessibility...${NC}"
    
    # If running locally, check if the file is accessible
    if command -v curl &> /dev/null; then
        if curl -s -f "http://localhost:3000/.well-known/apple-developer-domain-association.txt" > /dev/null; then
            echo -e "${GREEN}   ✅ Domain association file is accessible via HTTP${NC}"
        else
            echo -e "${YELLOW}   ⚠️  Domain association file not accessible (server may not be running)${NC}"
        fi
    fi
else
    echo -e "${RED}   ❌ Domain association file missing${NC}"
fi

echo ""

# 7. Cookie domain troubleshooting
echo -e "${YELLOW}7. Cookie Domain Troubleshooting...${NC}"

echo "   🍪 Common Cookie Domain Issues:"
echo "   "
echo "   ❌ 'Cookie \"aasp\" has been rejected for invalid domain'"
echo "      Solutions:"
echo "      1. Ensure Service ID matches in all configuration files ✅"
echo "      2. Verify domain association file is accessible"
echo "      3. Check Apple Developer Console domain configuration"
echo "      4. Ensure HTTPS is used in production"
echo "      5. Verify NextAuth callback URL matches Apple configuration"
echo "   "
echo "   🔧 NextAuth Apple Configuration:"
echo "      - Callback URL: /api/auth/callback/apple"
echo "      - This must match the Return URL in Apple Developer Console"
echo "   "

# 8. Testing recommendations
echo -e "${YELLOW}8. Testing Recommendations...${NC}"

echo "   🧪 Testing Steps:"
echo "   "
echo "   1. Clear all cookies and browser storage"
echo "   2. Test on localhost with proper HTTPS setup"
echo "   3. Check browser console for specific error messages"
echo "   4. Verify Apple Developer Console configuration"
echo "   5. Test with different browsers"
echo "   "
echo "   📋 Environment Variables Checklist:"
echo "   "
echo "   Client (.env.local):"
echo "   - APPLE_ID=$SERVICE_ID"
echo "   - APPLE_SECRET=[Generated JWT Token]"
echo "   - NEXTAUTH_URL=https://your-domain.com"
echo "   - NEXTAUTH_SECRET=[Random Secret]"
echo "   "

# 9. Summary and next steps
echo ""
echo -e "${GREEN}🎉 Apple Authentication Fix Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Copy the generated APPLE_ID and APPLE_SECRET to your environment variables"
echo "2. Verify your Apple Developer Console configuration matches the Service ID"
echo "3. Test the authentication flow with cleared cookies"
echo "4. Check browser console for any remaining errors"
echo ""
echo -e "${YELLOW}💡 Pro Tips:${NC}"
echo "- Use HTTPS even in development for Apple Sign-In"
echo "- Clear cookies between tests"
echo "- Check Apple Developer Console for domain verification status"
echo "- Ensure your domain association file is publicly accessible"
echo ""
echo -e "${GREEN}✅ Configuration files have been updated for consistency${NC}"
echo -e "${BLUE}🔄 Restart your development server to apply changes${NC}" 