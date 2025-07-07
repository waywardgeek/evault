#!/bin/bash

# eVault Domain Status Checker
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔍 Checking eVaultApp.com verification status...${NC}"
echo ""

# Check if domain is verified
VERIFIED=$(gcloud domains list-user-verified --format="value(id)" | grep -c "evaultapp.com" || echo "0")

if [ "$VERIFIED" = "1" ]; then
    echo -e "${GREEN}✅ evaultapp.com is verified!${NC}"
    echo ""
    echo -e "${YELLOW}🚀 Creating domain mapping...${NC}"
    
    # Create the domain mapping
    gcloud beta run domain-mappings create \
        --service=evault-server \
        --domain=api.evaultapp.com \
        --region=us-central1
    
    echo ""
    echo -e "${YELLOW}📋 Getting DNS record information...${NC}"
    
    # Wait a moment for the mapping to be created
    sleep 5
    
    # Get the DNS record information
    DNS_RECORD=$(gcloud beta run domain-mappings describe api.evaultapp.com --region=us-central1 --format="value(status.resourceRecords[0].rrdata)" 2>/dev/null || echo "pending")
    RECORD_TYPE=$(gcloud beta run domain-mappings describe api.evaultapp.com --region=us-central1 --format="value(status.resourceRecords[0].type)" 2>/dev/null || echo "CNAME")
    
    echo -e "${GREEN}📡 Add this DNS record to Cloudflare:${NC}"
    echo "=================================="
    echo "Type: $RECORD_TYPE"
    echo "Name: api.evaultapp.com"
    echo "Value: $DNS_RECORD"
    echo "TTL: Auto"
    echo ""
    echo -e "${YELLOW}🌐 Cloudflare Steps:${NC}"
    echo "1. Go to https://dash.cloudflare.com"
    echo "2. Select evaultapp.com"
    echo "3. Go to DNS > Records"
    echo "4. Add the record above"
    echo "5. Wait 5-10 minutes for propagation"
    echo ""
    echo -e "${GREEN}🎉 Your API will be available at: https://api.evaultapp.com${NC}"
    
else
    echo -e "${RED}❌ evaultapp.com is not yet verified${NC}"
    echo ""
    echo -e "${YELLOW}📝 To complete verification:${NC}"
    echo "1. Complete the Google Search Console verification"
    echo "2. Add the TXT record to Cloudflare DNS"
    echo "3. Click 'Verify' in Google Search Console"
    echo "4. Run this script again: ./scripts/check-domain-status.sh"
    echo ""
    echo -e "${YELLOW}🔗 Links:${NC}"
    echo "- Google Search Console: https://search.google.com/search-console"
    echo "- Cloudflare Dashboard: https://dash.cloudflare.com"
fi 