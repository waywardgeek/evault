#!/bin/bash

# Script to secure the production database with a new password

set -e

echo "🔒 eVault Production Database Security Script"
echo "============================================"
echo ""
echo "This script will:"
echo "1. Generate a secure password"
echo "2. Update the database user password in Cloud SQL"
echo "3. Update the Cloud Run service with the new password"
echo ""

# Production details
PROJECT_ID="evault-prod-1751852915"
INSTANCE_NAME="evault-db"
DB_USER="evault-user"
SERVICE_NAME="evault-server"
REGION="us-central1"

# Check if user is authenticated with gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with gcloud. Please run: gcloud auth login"
    exit 1
fi

# Set the project
gcloud config set project $PROJECT_ID

# Generate a secure password
echo "🔑 Generating secure password..."
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo ""
echo "📝 New password generated (save this securely!):"
echo "   $NEW_PASSWORD"
echo ""

read -p "Do you want to proceed with this password? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

# Update the database password
echo ""
echo "🔧 Updating Cloud SQL password..."
gcloud sql users set-password $DB_USER \
    --instance=$INSTANCE_NAME \
    --password="$NEW_PASSWORD"

if [ $? -eq 0 ]; then
    echo "✅ Database password updated successfully!"
else
    echo "❌ Failed to update database password"
    exit 1
fi

# Update Cloud Run environment variable
echo ""
echo "🚀 Updating Cloud Run service..."
gcloud run services update $SERVICE_NAME \
    --region=$REGION \
    --update-env-vars="DB_PASSWORD=$NEW_PASSWORD"

if [ $? -eq 0 ]; then
    echo "✅ Cloud Run service updated successfully!"
else
    echo "❌ Failed to update Cloud Run service"
    echo "⚠️  WARNING: Database password was changed but Cloud Run wasn't updated!"
    echo "   The application may not be able to connect to the database."
    exit 1
fi

echo ""
echo "🎉 Production database secured successfully!"
echo ""
echo "📋 Summary:"
echo "   - Database: $INSTANCE_NAME"
echo "   - User: $DB_USER"
echo "   - New Password: $NEW_PASSWORD"
echo "   - Cloud Run Service: $SERVICE_NAME"
echo ""
echo "⚠️  IMPORTANT:"
echo "   1. Save the password above in a secure password manager"
echo "   2. Do NOT commit this password to git"
echo "   3. Consider setting up Google Secret Manager for better security"
echo ""
echo "✅ Your production database is now secured with a strong password!" 