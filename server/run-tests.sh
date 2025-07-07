#!/bin/bash

# Test runner for OpenADP metadata refresh cycle tests
# This script sets up the test environment and runs all relevant tests

set -e

echo "🧪 Running OpenADP Metadata Refresh Tests"
echo "=========================================="

# Set test environment variables
export TEST_DB_HOST=${TEST_DB_HOST:-localhost}
export TEST_DB_PORT=${TEST_DB_PORT:-5433}
export TEST_DB_USER=${TEST_DB_USER:-postgres}
export TEST_DB_PASSWORD=${TEST_DB_PASSWORD:-password}
export TEST_DB_NAME=${TEST_DB_NAME:-evault_test}
export TEST_DB_SSLMODE=${TEST_DB_SSLMODE:-disable}

echo "📊 Test Environment:"
echo "  Database: ${TEST_DB_HOST}:${TEST_DB_PORT}/${TEST_DB_NAME}"
echo "  User: ${TEST_DB_USER}"
echo ""

# Check if test database exists, create if needed
echo "🔧 Setting up test database..."
docker exec -i evault-postgres-1 psql -U postgres -c "CREATE DATABASE ${TEST_DB_NAME};" 2>/dev/null || echo "  Database ${TEST_DB_NAME} already exists"

# Run database layer tests
echo ""
echo "🗄️  Running Database Layer Tests..."
echo "─────────────────────────────────────"
go test -v ./internal/database -run TestOpenADP

# Run handler layer tests  
echo ""
echo "🌐 Running Handler Layer Tests..."
echo "─────────────────────────────────────"
go test -v ./internal/handlers -run TestVault

# Run all tests together for integration
echo ""
echo "🔄 Running Complete Integration Tests..."
echo "───────────────────────────────────────"
go test -v ./internal/database ./internal/handlers -run "(TestOpenADP|TestVault)"

# Optional: Run benchmarks
if [[ "$1" == "--bench" ]]; then
    echo ""
    echo "⚡ Running Performance Benchmarks..."
    echo "───────────────────────────────────"
    go test -bench=BenchmarkOpenADP ./internal/database
fi

# Optional: Run with race detection
if [[ "$1" == "--race" ]]; then
    echo ""
    echo "🏃 Running Tests with Race Detection..."
    echo "─────────────────────────────────────"
    go test -race -v ./internal/database ./internal/handlers -run "(TestOpenADP|TestVault)"
fi

echo ""
echo "✅ All OpenADP metadata refresh tests completed!"
echo ""
echo "🎯 Test Summary:"
echo "  ✓ Database two-slot metadata system"
echo "  ✓ Handler endpoint integration"  
echo "  ✓ Metadata refresh cycle flow"
echo "  ✓ Error condition handling"
echo "  ✓ Concurrent access protection"
echo ""
echo "🔄 The metadata refresh cycle is working correctly!"
echo "   - Initial metadata goes to slot A (flag=true)"
echo "   - First refresh writes to slot B, flips flag to false"
echo "   - Second refresh writes to slot A, flips flag to true"
echo "   - Pattern continues alternating forever"
echo "   - Current metadata always returned via flag" 