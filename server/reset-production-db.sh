#!/bin/bash

# Production Database Reset Script for eVault
# This will DELETE ALL DATA from the production database - use with extreme caution!

set -e

echo "⚠️  WARNING: This will DELETE ALL DATA from the PRODUCTION evault database!"
echo "This includes all users, vaults, and entries."
echo ""
echo "🔴 THIS IS THE PRODUCTION DATABASE ON GOOGLE CLOUD SQL 🔴"
echo ""
read -p "Are you ABSOLUTELY SURE you want to continue? Type 'DELETE PRODUCTION DATA' to confirm: " confirm

if [ "$confirm" != "DELETE PRODUCTION DATA" ]; then
    echo "Cancelled. Production data is safe."
    exit 0
fi

# Production database details from cloudbuild.yaml
PROJECT_ID="evault-prod-1751852915"
INSTANCE_NAME="evault-db"
DB_NAME="evault"
DB_USER="evault-user"
REGION="us-central1"

echo ""
echo "🔧 Connecting to Google Cloud SQL production database..."
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

# Create SQL commands to reset the database
SQL_COMMANDS="
-- Delete all data (order matters due to foreign keys)
DELETE FROM entries;
DELETE FROM users;

-- Verify the cleanup
SELECT 'Users remaining: ' || COUNT(*) FROM users;
SELECT 'Entries remaining: ' || COUNT(*) FROM entries;
"

# Create a temporary SQL file
TEMP_SQL_FILE="/tmp/reset_evault_prod_$$.sql"
echo "$SQL_COMMANDS" > "$TEMP_SQL_FILE"

echo ""
echo "🗑️  Deleting all production data..."

# Execute the SQL commands via Cloud SQL proxy
gcloud sql connect $INSTANCE_NAME \
    --user=$DB_USER \
    --database=$DB_NAME \
    < "$TEMP_SQL_FILE"

# Clean up temp file
rm -f "$TEMP_SQL_FILE"

echo ""
echo "✅ Production database reset complete!"
echo ""

# Show current stats
echo "📊 Verifying empty database..."
echo "SELECT 'Total users: ' || COUNT(*) FROM users UNION ALL SELECT 'Total entries: ' || COUNT(*) FROM entries;" | \
gcloud sql connect $INSTANCE_NAME \
    --user=$DB_USER \
    --database=$DB_NAME

echo ""
echo "🎯 Your production database is now empty!"
echo ""
echo "⚠️  Note: This only deleted the data. The database schema (tables) remains intact." 