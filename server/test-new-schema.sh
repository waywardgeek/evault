#!/bin/bash

# Test runner for new database schema
set -e

echo "🧪 Testing New Database Schema"
echo "=============================="

# Set test environment variables
export TEST_DB_HOST=${TEST_DB_HOST:-localhost}
export TEST_DB_PORT=${TEST_DB_PORT:-5433}
export TEST_DB_USER=${TEST_DB_USER:-postgres}
export TEST_DB_PASSWORD=${TEST_DB_PASSWORD:-password}
export TEST_DB_NAME=${TEST_DB_NAME:-evault_new_test}
export TEST_DB_SSLMODE=${TEST_DB_SSLMODE:-disable}

echo "📊 Test Environment:"
echo "  Database: ${TEST_DB_HOST}:${TEST_DB_PORT}/${TEST_DB_NAME}"
echo "  User: ${TEST_DB_USER}"
echo ""

# Check if test database exists, create if needed
echo "🔧 Setting up test database..."
if command -v docker &> /dev/null && docker ps | grep -q evault-postgres; then
    echo "Using Docker PostgreSQL..."
    docker exec -i evault-postgres-1 psql -U postgres -c "DROP DATABASE IF EXISTS ${TEST_DB_NAME};" 2>/dev/null || true
    docker exec -i evault-postgres-1 psql -U postgres -c "CREATE DATABASE ${TEST_DB_NAME};" 2>/dev/null || echo "  Database ${TEST_DB_NAME} created"
else
    echo "Using local PostgreSQL..."
    PGPASSWORD=$TEST_DB_PASSWORD psql -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER -c "DROP DATABASE IF EXISTS ${TEST_DB_NAME};" 2>/dev/null || true
    PGPASSWORD=$TEST_DB_PASSWORD psql -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER -c "CREATE DATABASE ${TEST_DB_NAME};" 2>/dev/null || echo "  Database ${TEST_DB_NAME} created"
fi

# Run the new schema tests
echo ""
echo "🗄️  Running New Schema Tests..."
echo "─────────────────────────────────────"
go test -v ./internal/database -run TestNewDatabaseSchema

echo ""
echo "🔐 Running Email-Based Auth Tests..."
echo "─────────────────────────────────────"
go test -v ./internal/database -run TestEmailBasedAuthentication

echo ""
echo "📦 Running OpenADP Metadata Tests..."
echo "─────────────────────────────────────"
go test -v ./internal/database -run TestOpenADPMetadataWithNewSchema

echo ""
echo "🔑 Running Entries Tests..."
echo "─────────────────────────────────────"
go test -v ./internal/database -run TestEntriesWithNewSchema

echo ""
echo "🔄 Running Migration Scenario Tests..."
echo "─────────────────────────────────────"
go test -v ./internal/database -run TestMigrationScenarios

echo ""
echo "✅ All new schema tests passed!"
echo ""
echo "📋 Summary:"
echo "  ✓ Email-based user identification working"
echo "  ✓ No vault_public_key column"
echo "  ✓ Auth provider tracking working"
echo "  ✓ OpenADP metadata operations unchanged"
echo "  ✓ Entries table with cascade delete working"
echo ""
echo "🚀 Ready to deploy the new schema!" 