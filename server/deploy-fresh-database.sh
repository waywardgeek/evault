#!/bin/bash

# Deploy fresh database schema to production
set -e

echo "🚀 eVault Fresh Database Deployment"
echo "==================================="
echo ""
echo "This will create a FRESH database, removing ALL existing data!"
echo ""

# Production database details
PROJECT_ID="evault-prod-1751852915"
INSTANCE_NAME="evault-db"
DB_NAME="evault"
DB_USER="evault-user"
REGION="us-central1"

echo "📊 Target Database:"
echo "   Project: $PROJECT_ID"
echo "   Instance: $INSTANCE_NAME"
echo "   Database: $DB_NAME"
echo ""

read -p "Are you SURE you want to deploy a fresh database? Type 'DEPLOY FRESH' to confirm: " confirm

if [ "$confirm" != "DEPLOY FRESH" ]; then
    echo "Cancelled."
    exit 0
fi

# Check if user is authenticated with gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with gcloud. Please run: gcloud auth login"
    exit 1
fi

# Set the project
gcloud config set project $PROJECT_ID

echo ""
echo "🗑️  Creating fresh database schema..."

# Execute the fresh start migration
echo "📄 Uploading migration file..."
gcloud sql connect $INSTANCE_NAME \
    --user=$DB_USER \
    --database=$DB_NAME \
    < migrations/000_fresh_start.sql

echo ""
echo "✅ Fresh database deployed successfully!"
echo ""

# Verify the deployment
echo "📊 Verifying deployment..."
echo "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" | \
gcloud sql connect $INSTANCE_NAME \
    --user=$DB_USER \
    --database=$DB_NAME

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Deploy the updated server code with email-based authentication"
echo "2. Test with both Google and Apple sign-in"
echo "3. Monitor for any issues"
echo ""
echo "⚠️  Remember to update the database password for security!" 