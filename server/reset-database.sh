#!/bin/bash

# Database reset script for evault
# This will DELETE ALL DATA - use with caution!

set -e

echo "⚠️  WARNING: This will DELETE ALL DATA from the evault database!"
echo "This includes all users, vaults, and entries."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection details
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-password}
DB_NAME=${DB_NAME:-evault}

echo ""
echo "🔧 Connecting to database..."
echo "   Host: $DB_HOST:$DB_PORT"
echo "   Database: $DB_NAME"
echo ""

# Create SQL commands to reset the database
SQL_COMMANDS="
-- Delete all data (order matters due to foreign keys)
DELETE FROM entries;
DELETE FROM users;

-- Reset any sequences if needed
-- (PostgreSQL auto-sequences don't need resetting for our schema)

-- Verify the cleanup
SELECT 'Users remaining: ' || COUNT(*) FROM users;
SELECT 'Entries remaining: ' || COUNT(*) FROM entries;
"

# Execute the reset
echo "🗑️  Deleting all data..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "$SQL_COMMANDS"

echo ""
echo "✅ Database reset complete!"
echo ""
echo "📊 Current status:"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
SELECT 'Total users: ' || COUNT(*) FROM users
UNION ALL
SELECT 'Total entries: ' || COUNT(*) FROM entries;
"

echo ""
echo "🎯 Your database is now empty and ready for fresh data!" 