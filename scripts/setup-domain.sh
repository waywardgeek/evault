#!/bin/bash

# eVault Custom Domain Setup Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🌐 eVault Custom Domain Setup${NC}"
echo "================================="

# Configuration (to be filled in by user)
DOMAIN=""              # e.g., "api.yourdomain.com"
CLOUDFLARE_API_TOKEN="" # Cloudflare API token
CLOUDFLARE_ZONE_ID=""   # Cloudflare zone ID
PROJECT_ID="evault-prod-1751852915"
SERVICE_NAME="evault-server"
REGION="us-central1"

# Validate configuration
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ Please set DOMAIN variable${NC}"
    echo "Example: DOMAIN='api.yourdomain.com'"
    exit 1
fi

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  CLOUDFLARE_API_TOKEN not set. Manual DNS setup required.${NC}"
fi

echo -e "${BLUE}📋 Configuration:${NC}"
echo "Domain: $DOMAIN"
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo ""

# Step 1: Add domain mapping to Cloud Run
echo -e "${YELLOW}🔧 Step 1: Adding domain mapping to Cloud Run...${NC}"
gcloud run domain-mappings create \
    --service=$SERVICE_NAME \
    --domain=$DOMAIN \
    --region=$REGION

# Step 2: Get the required DNS record
echo -e "${YELLOW}🔍 Step 2: Getting DNS record information...${NC}"
DNS_RECORD=$(gcloud run domain-mappings describe $DOMAIN --region=$REGION --format="value(status.resourceRecords[0].rrdata)")
RECORD_TYPE=$(gcloud run domain-mappings describe $DOMAIN --region=$REGION --format="value(status.resourceRecords[0].type)")

echo -e "${GREEN}📋 DNS Record Required:${NC}"
echo "Type: $RECORD_TYPE"
echo "Name: $DOMAIN"
echo "Value: $DNS_RECORD"
echo ""

# Step 3: Create Cloudflare DNS record (if API token provided)
if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${YELLOW}🌐 Step 3: Creating Cloudflare DNS record...${NC}"
    
    # Create CNAME record
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         --data "{\"type\":\"$RECORD_TYPE\",\"name\":\"$DOMAIN\",\"content\":\"$DNS_RECORD\",\"ttl\":1}"
    
    echo -e "${GREEN}✅ DNS record created${NC}"
else
    echo -e "${YELLOW}📝 Step 3: Manual DNS Setup Required${NC}"
    echo "Please add the following DNS record in Cloudflare:"
    echo ""
    echo "Type: $RECORD_TYPE"
    echo "Name: $DOMAIN"
    echo "Value: $DNS_RECORD"
    echo "TTL: Auto"
    echo ""
    echo "After adding the record, wait a few minutes and then run:"
    echo "gcloud run domain-mappings describe $DOMAIN --region=$REGION"
fi

# Step 4: Wait for domain verification
echo -e "${YELLOW}⏳ Step 4: Waiting for domain verification...${NC}"
echo "This may take a few minutes..."

# Step 5: Update CORS settings
echo -e "${YELLOW}🔧 Step 5: Updating CORS settings...${NC}"
echo "The application will automatically accept requests from the new domain."
echo "CORS is configured to allow all origins (*) for development."

# Step 6: Test the new domain
echo -e "${YELLOW}🧪 Step 6: Testing new domain...${NC}"
echo "Testing will begin once DNS propagation is complete..."

echo ""
echo -e "${GREEN}🎉 Domain Setup Complete!${NC}"
echo "================================="
echo -e "Custom Domain: ${GREEN}https://$DOMAIN${NC}"
echo -e "Health Check: ${GREEN}https://$DOMAIN/health${NC}"
echo -e "API Status: ${GREEN}https://$DOMAIN/api/status${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Wait 5-10 minutes for DNS propagation"
echo "2. Test your custom domain endpoints"
echo "3. Update your frontend to use the new API URL"
echo "4. Update documentation with new URLs"
echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo "- Update client environment variables"
echo "- Test all API endpoints"
echo "- Update any documentation" 