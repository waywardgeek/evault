#!/bin/bash

# Deploy fresh database schema to production (non-interactive)
set -e

echo "🚀 eVault Fresh Database Deployment (Automated)"
echo "=============================================="
echo ""

# Production database details
PROJECT_ID="evault-prod-1751852915"
INSTANCE_NAME="evault-db"
DB_NAME="evault"
DB_USER="evault-user"
DB_PASSWORD="evault-production-password-change-me"
REGION="us-central1"

echo "📊 Target Database:"
echo "   Project: $PROJECT_ID"
echo "   Instance: $INSTANCE_NAME"
echo "   Database: $DB_NAME"
echo ""

# Check if user is authenticated with gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with gcloud. Please run: gcloud auth login"
    exit 1
fi

# Set the project
gcloud config set project $PROJECT_ID

echo "🗑️  Creating fresh database schema..."

# Create a temporary file with the migration
TEMP_SQL="/tmp/fresh_database_$$.sql"
cp migrations/000_fresh_start.sql "$TEMP_SQL"

# Use gcloud with PGPASSWORD
echo "📄 Executing migration..."
PGPASSWORD="$DB_PASSWORD" gcloud sql connect $INSTANCE_NAME \
    --user=$DB_USER \
    --database=$DB_NAME \
    < "$TEMP_SQL"

# Clean up
rm -f "$TEMP_SQL"

echo ""
echo "✅ Fresh database deployed successfully!"
echo ""

# Verify the deployment
echo "📊 Verifying deployment..."
echo "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" | \
PGPASSWORD="$DB_PASSWORD" gcloud sql connect $INSTANCE_NAME \
    --user=$DB_USER \
    --database=$DB_NAME

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "⚠️  IMPORTANT: The database is now empty and ready for use!"
echo ""
echo "📋 The new schema includes:"
echo "  - users table (without vault_public_key)"
echo "  - entries table"
echo "  - schema_migrations table"
echo ""
echo "Next: Deploy the updated server code with email-based authentication" 