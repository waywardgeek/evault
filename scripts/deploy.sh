#!/bin/bash

# eVault GCP Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 eVault GCP Deployment Script${NC}"
echo "=================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  Not authenticated with gcloud. Please run:${NC}"
    echo "gcloud auth login"
    exit 1
fi

# Get or set project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}📝 No project set. Please enter your GCP Project ID:${NC}"
    read -p "Project ID: " PROJECT_ID
    gcloud config set project $PROJECT_ID
fi

echo -e "${GREEN}📋 Using project: $PROJECT_ID${NC}"

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com

# Create Cloud SQL instance (if it doesn't exist)
INSTANCE_NAME="evault-db"
echo -e "${YELLOW}🗄️  Setting up Cloud SQL...${NC}"

if ! gcloud sql instances describe $INSTANCE_NAME &>/dev/null; then
    echo "Creating Cloud SQL instance..."
    gcloud sql instances create $INSTANCE_NAME \
        --database-version=POSTGRES_14 \
        --tier=db-f1-micro \
        --region=us-central1 \
        --storage-auto-increase \
        --backup-start-time=03:00
    
    echo "Creating database user..."
    gcloud sql users create evault-user \
        --instance=$INSTANCE_NAME \
        --password=evault-production-password-change-me
    
    echo "Creating database..."
    gcloud sql databases create evault --instance=$INSTANCE_NAME
else
    echo "Cloud SQL instance already exists."
fi

# Get database connection info
DB_CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE_NAME --format="value(connectionName)")
echo -e "${GREEN}📊 Database connection: $DB_CONNECTION_NAME${NC}"

# Build and deploy server
echo -e "${YELLOW}🏗️  Building and deploying server...${NC}"
gcloud builds submit --config cloudbuild.yaml

# Get the deployed service URL
SERVICE_URL=$(gcloud run services describe evault-server --region=us-central1 --format="value(status.url)")
echo -e "${GREEN}✅ Server deployed at: $SERVICE_URL${NC}"

# Database connection is already configured in cloudbuild.yaml
echo -e "${GREEN}✅ Database connection configured during deployment${NC}"

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "=================================="
echo -e "Server URL: ${GREEN}$SERVICE_URL${NC}"
echo -e "Health Check: ${GREEN}$SERVICE_URL/health${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Test your API: curl $SERVICE_URL/health"
echo "2. Deploy your client (Next.js) to Vercel or Netlify"
echo "3. Update client environment variables to point to: $SERVICE_URL"
echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo "- Change default passwords in production"
echo "- Set up proper secrets management"
echo "- Configure custom domain names" 