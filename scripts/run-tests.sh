#!/bin/bash

# eVault Test Runner
# Runs all test types with detailed reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Get the project root directory
PROJECT_ROOT=$(pwd)

echo -e "${BLUE}🧪 eVault Comprehensive Test Suite${NC}"
echo "Project root: $PROJECT_ROOT"
echo "=========================================="

# Function to print test section headers
print_section() {
    echo ""
    echo -e "${YELLOW}📋 $1${NC}"
    echo "----------------------------------------"
}

# Function to handle test results
handle_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2 PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ $2 FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Check if server is running for integration tests
check_server() {
    print_section "Server Health Check"
    
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server is running on port 8080${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Server not running on port 8080${NC}"
        echo "Starting server in background..."
        
        # Start server in background
        cd "$PROJECT_ROOT/server" && go run cmd/server/main.go &
        SERVER_PID=$!
        cd "$PROJECT_ROOT"
        
        # Wait for server to start
        echo "Waiting for server to start..."
        for i in {1..30}; do
            if curl -s http://localhost:8080/health > /dev/null 2>&1; then
                echo -e "${GREEN}✅ Server started successfully${NC}"
                return 0
            fi
            sleep 1
        done
        
        echo -e "${RED}❌ Failed to start server${NC}"
        return 1
    fi
}

# Install dependencies if needed
print_section "Dependency Check"

echo "Checking root dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
fi

echo "Checking client dependencies..."
if [ ! -d "client/node_modules" ]; then
    echo "Installing client dependencies..."
    cd "$PROJECT_ROOT/client" && npm install && cd "$PROJECT_ROOT"
fi

echo -e "${GREEN}✅ Dependencies ready${NC}"

# 1. Server Unit Tests (Go)
print_section "Server Unit Tests (Go)"

cd "$PROJECT_ROOT/server"
if go test ./... -v; then
    handle_result 0 "Server Unit Tests"
else
    handle_result 1 "Server Unit Tests"
fi
cd "$PROJECT_ROOT"

# 2. Client Unit Tests (Jest)
print_section "Client Unit Tests (Jest)"

cd "$PROJECT_ROOT/client"
if npm test -- --passWithNoTests --watchAll=false; then
    handle_result 0 "Client Unit Tests"
else
    handle_result 1 "Client Unit Tests"
fi
cd "$PROJECT_ROOT"

# 3. Integration Tests (API)
print_section "Integration Tests (API)"

# Check server status
if check_server; then
    if npm run test:integration; then
        handle_result 0 "Integration Tests"
    else
        handle_result 1 "Integration Tests"
    fi
else
    echo -e "${RED}❌ Cannot run integration tests - server not available${NC}"
    handle_result 1 "Integration Tests"
fi

# 4. OpenADP Integration Tests (Optional)
print_section "OpenADP Integration Tests (Optional)"

# Check if we should run OpenADP tests
if [ "$RUN_OPENADP_TESTS" = "true" ]; then
    echo "Running OpenADP integration tests..."
    
    # API-level OpenADP tests
    if npm run test:integration:openadp; then
        handle_result 0 "OpenADP API Integration Tests"
    else
        handle_result 1 "OpenADP API Integration Tests"
    fi
    
    # Live OpenADP tests (requires real servers)
    echo ""
    echo -e "${YELLOW}⚠️  Live OpenADP tests require network access to OpenADP servers${NC}"
    echo -e "${YELLOW}   These tests will connect to: xyzzy.openadp.org, sky.openadp.org, etc.${NC}"
    
    # Real OpenADP integration tests
    echo "Running REAL OpenADP integration tests..."
    
    if npm run test:real:openadp; then
        handle_result 0 "Real OpenADP Integration Tests"
    else
        handle_result 1 "Real OpenADP Integration Tests"
    fi
    
    # Original mock OpenADP tests  
    echo "Running mock OpenADP tests..."
    
    if npm run test:live:openadp; then
        handle_result 0 "Mock OpenADP Integration Tests"
    else
        handle_result 1 "Mock OpenADP Integration Tests"
    fi
else
    echo -e "${YELLOW}⚠️  OpenADP integration tests skipped${NC}"
    echo "   To run OpenADP tests: RUN_OPENADP_TESTS=true ./scripts/run-tests.sh"
    echo "   These tests require:"
    echo "     - Network access to OpenADP servers"
    echo "     - OpenADP SDK integration to be properly configured"
    echo "     - Live servers: xyzzy.openadp.org, sky.openadp.org, etc."
    echo ""
    echo "   Available OpenADP test types:"
    echo "     - API tests: npm run test:integration:openadp"
    echo "     - Real live tests: npm run test:real:openadp"
    echo "     - Mock tests: npm run test:live:openadp"
fi

# 5. E2E Tests (Playwright)
print_section "End-to-End Tests (Playwright)"

# Start client if needed
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "Starting client in background..."
    cd "$PROJECT_ROOT/client" && npm run dev &
    CLIENT_PID=$!
    cd "$PROJECT_ROOT"
    
    # Wait for client to start
    echo "Waiting for client to start..."
    for i in {1..60}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Client started successfully${NC}"
            break
        fi
        sleep 1
    done
fi

if npm run test:e2e -- --reporter=list; then
    handle_result 0 "E2E Tests"
else
    handle_result 1 "E2E Tests"
fi

# Cleanup background processes
if [ ! -z "$SERVER_PID" ]; then
    echo "Stopping background server..."
    kill $SERVER_PID 2>/dev/null || true
fi

if [ ! -z "$CLIENT_PID" ]; then
    echo "Stopping background client..."
    kill $CLIENT_PID 2>/dev/null || true
fi

# Test Summary
echo ""
echo "=========================================="
echo -e "${BLUE}📊 Test Summary${NC}"
echo "=========================================="
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}💥 ${FAILED_TESTS} test suite(s) failed${NC}"
    echo ""
    echo "To debug failures:"
    echo "  - Server tests: cd server && go test -v ./..."
    echo "  - Client tests: cd client && npm test"
    echo "  - Integration:  npm run test:integration"
    echo "  - OpenADP API:  npm run test:integration:openadp"
    echo "  - OpenADP Live: npm run test:live:openadp"
    echo "  - E2E tests:    npm run test:e2e:headed"
    echo ""
    echo "Note: OpenADP tests require RUN_OPENADP_TESTS=true"
    exit 1
fi 