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
OPENADP_DIR="$PROJECT_ROOT/../openadp"

# OpenADP server tracking
OPENADP_SERVERS_STARTED=false
OPENADP_REGISTRY_PORT=8085
OPENADP_SERVER_PORTS="8083 8084 8086"

echo -e "${BLUE}🧪 eVault Comprehensive Test Suite${NC}"
echo "Project root: $PROJECT_ROOT"
echo "OpenADP dir: $OPENADP_DIR"
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

# Function to setup OpenADP test servers
setup_openadp_servers() {
    if [ "$RUN_OPENADP_TESTS" = "true" ]; then
        print_section "OpenADP Test Server Setup"
        
        if [ ! -d "$OPENADP_DIR" ]; then
            echo -e "${RED}❌ OpenADP directory not found at $OPENADP_DIR${NC}"
            return 1
        fi
        
        if [ ! -f "$OPENADP_DIR/build/openadp-server" ]; then
            echo -e "${RED}❌ OpenADP server binary not found${NC}"
            echo "   Build OpenADP first: cd $OPENADP_DIR && make build"
            return 1
        fi
        
        echo "🚀 Setting up OpenADP test servers..."
        
        # Launch OpenADP servers
        cd "$OPENADP_DIR"
        
        # Use the server manager to launch test servers
        python3 manage_test_servers.py --launch 3 --start-port 8083 &
        OPENADP_MANAGER_PID=$!
        
        # Wait for servers to start
        sleep 10
        
        # Check if servers are running
        local servers_ok=true
        for port in $OPENADP_SERVER_PORTS; do
            if ! curl -s -m 5 "http://127.0.0.1:$port" > /dev/null 2>&1; then
                echo -e "${RED}❌ OpenADP server on port $port not responding${NC}"
                servers_ok=false
            else
                echo -e "${GREEN}✅ OpenADP server on port $port is running${NC}"
            fi
        done
        
        if [ "$servers_ok" = "true" ]; then
            # Generate servers.json
            python3 manage_test_servers.py --generate-json --output-file test_servers.json
            
            # Start registry server
            python3 manage_test_servers.py --start-registry --port $OPENADP_REGISTRY_PORT &
            OPENADP_REGISTRY_PID=$!
            
            sleep 3
            
            # Test registry server
            if curl -s -m 5 "http://127.0.0.1:$OPENADP_REGISTRY_PORT/test_servers.json" > /dev/null 2>&1; then
                echo -e "${GREEN}✅ OpenADP registry server is running on port $OPENADP_REGISTRY_PORT${NC}"
                OPENADP_SERVERS_STARTED=true
            else
                echo -e "${RED}❌ OpenADP registry server failed to start${NC}"
                cleanup_openadp_servers
                return 1
            fi
        else
            echo -e "${RED}❌ Failed to start OpenADP servers${NC}"
            cleanup_openadp_servers
            return 1
        fi
        
        cd "$PROJECT_ROOT"
        return 0
    else
        echo -e "${YELLOW}⚠️  OpenADP server setup skipped (RUN_OPENADP_TESTS not set)${NC}"
        return 0
    fi
}

# Function to cleanup OpenADP test servers
cleanup_openadp_servers() {
    if [ "$OPENADP_SERVERS_STARTED" = "true" ]; then
        print_section "OpenADP Test Server Cleanup"
        
        echo "🧹 Cleaning up OpenADP test servers..."
        
        cd "$OPENADP_DIR"
        
        # Use the server manager to teardown servers
        python3 manage_test_servers.py --teardown
        
        # Kill any remaining processes
        for port in $OPENADP_SERVER_PORTS $OPENADP_REGISTRY_PORT; do
            if lsof -ti:$port > /dev/null 2>&1; then
                echo "Killing process on port $port..."
                kill $(lsof -ti:$port) 2>/dev/null || true
            fi
        done
        
        # Clean up PIDs
        if [ ! -z "$OPENADP_MANAGER_PID" ]; then
            kill $OPENADP_MANAGER_PID 2>/dev/null || true
        fi
        
        if [ ! -z "$OPENADP_REGISTRY_PID" ]; then
            kill $OPENADP_REGISTRY_PID 2>/dev/null || true
        fi
        
        cd "$PROJECT_ROOT"
        echo -e "${GREEN}✅ OpenADP servers cleaned up${NC}"
    fi
}

# Function to create test JWT token
create_test_jwt() {
    # Use the existing JWT helper script
    node scripts/create-test-jwt.js
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
        
        # Start server in background with test configuration
        cd "$PROJECT_ROOT/server"
        DB_NAME="evault_test" \
        GOOGLE_CLIENT_ID="test-google-client-id" \
        GOOGLE_CLIENT_SECRET="test-google-client-secret" \
        go run cmd/server/main.go &
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

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    
    # Stop OpenADP servers
    cleanup_openadp_servers
    
    # Stop background server if we started it
    if [ ! -z "$SERVER_PID" ]; then
        echo "Stopping background server..."
        kill $SERVER_PID 2>/dev/null || true
    fi
    
    # Stop background client if we started it
    if [ ! -z "$CLIENT_PID" ]; then
        echo "Stopping background client..."
        kill $CLIENT_PID 2>/dev/null || true
    fi
    
    # Clean up temp files
    # No temporary files to clean up
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Set up signal handlers
trap cleanup EXIT INT TERM

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

# Setup OpenADP servers if needed
setup_openadp_servers

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
    # Create test JWT token
    TEST_JWT_TOKEN=$(create_test_jwt)
    export TEST_JWT_TOKEN
    
    if npm run test:integration; then
        handle_result 0 "Integration Tests"
    else
        handle_result 1 "Integration Tests"
    fi
else
    echo -e "${RED}❌ Cannot run integration tests - server not available${NC}"
    handle_result 1 "Integration Tests"
fi

# 4. OpenADP Integration Tests
print_section "OpenADP Integration Tests"

if [ "$RUN_OPENADP_TESTS" = "true" ] && [ "$OPENADP_SERVERS_STARTED" = "true" ]; then
    echo "Running OpenADP integration tests with local servers..."
    
    # Set environment variables for OpenADP tests
    export OPENADP_SERVERS_URL="http://127.0.0.1:$OPENADP_REGISTRY_PORT/test_servers.json"
    export TEST_JWT_TOKEN
    
    if npm run test:integration:openadp; then
        handle_result 0 "OpenADP Integration Tests"
    else
        handle_result 1 "OpenADP Integration Tests"
    fi
else
    echo -e "${YELLOW}⚠️  OpenADP integration tests skipped${NC}"
    if [ "$RUN_OPENADP_TESTS" != "true" ]; then
        echo "   To run OpenADP tests: RUN_OPENADP_TESTS=true ./scripts/run-tests.sh"
    fi
    if [ "$OPENADP_SERVERS_STARTED" != "true" ]; then
        echo "   OpenADP servers not available"
    fi
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

# Run E2E tests
if npm run test:e2e; then
    handle_result 0 "E2E Tests"
else
    handle_result 1 "E2E Tests"
fi

# Test Summary
echo ""
echo "=========================================="
echo -e "${BLUE}📊 Test Summary${NC}"
echo "=========================================="
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed: ${RED}${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -gt 0 ]; then
    echo ""
    echo -e "${RED}💥 ${FAILED_TESTS} test suite(s) failed${NC}"
    echo ""
    echo "To debug failures:"
    echo "  - Server tests: cd server && go test -v ./..."
    echo "  - Client tests: cd client && npm test"
    echo "  - Integration:  TEST_JWT_TOKEN=\$(node scripts/create-test-jwt.js) npm run test:integration"
    echo "  - E2E tests:    npm run test:e2e:headed"
    
    if [ "$RUN_OPENADP_TESTS" = "true" ]; then
        echo "  - OpenADP tests: RUN_OPENADP_TESTS=true OPENADP_SERVERS_URL=... npm run test:integration:openadp"
    else
        echo ""
        echo "Note: OpenADP tests require RUN_OPENADP_TESTS=true and local OpenADP servers"
    fi
    
    exit 1
else
    echo ""
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
fi 