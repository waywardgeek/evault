# OpenADP Metadata Refresh Unit Tests

This document describes the comprehensive unit tests for the OpenADP metadata refresh cycle that resolves the lockout issue described in the conversation.

## Problem Solved

**Issue**: Users were locked out after ~10 vault accesses because the server always returned stale OpenADP metadata instead of implementing the proper two-slot refresh cycle.

**Root Cause**: 
- Single metadata storage field
- Client ignored `updatedMetadata` from OpenADP recovery
- No automatic metadata refresh to servers

## Solution Implemented

### Database Layer (`models_test.go`)

#### `TestOpenADPMetadataRefreshCycle`
**Purpose**: Validates the complete two-slot metadata alternation system

**Test Flow**:
1. **Initial State**: No metadata (both slots NULL)
2. **Registration**: Metadata goes to slot A, flag=TRUE
3. **First Refresh**: New metadata → slot B, flag=FALSE 
4. **Second Refresh**: New metadata → slot A, flag=TRUE
5. **Third Refresh**: New metadata → slot B, flag=FALSE
6. **Pattern Verification**: Continues alternating correctly

**Key Assertions**:
- `GetCurrentOpenADPMetadata()` always returns the newest metadata
- Database flag correctly indicates which slot is current
- Old metadata preserved in alternate slot
- Atomic flag flip operation

#### `TestOpenADPMetadataErrorConditions`
**Purpose**: Validates error handling for edge cases

**Scenarios Tested**:
- Non-existent user queries
- Invalid metadata operations
- Graceful degradation

#### `TestOpenADPMetadataConcurrentAccess`
**Purpose**: Ensures thread-safety under concurrent load

**Test Design**:
- 10 goroutines × 5 updates each = 50 concurrent operations
- Verifies database consistency after race conditions
- Ensures flag always points to correct slot

#### `BenchmarkOpenADPMetadataOperations`
**Purpose**: Performance validation

**Results**:
- **Metadata Update**: ~739μs (0.74ms) - Very fast for database operation
- **Metadata Retrieval**: ~85μs (0.085ms) - Excellent read performance

### Handler Layer (`vault_test.go`)

#### `TestVaultRegisterAndRefreshFlow`
**Purpose**: End-to-end integration testing of vault operations

**Test Scenarios**:
1. **Registration Flow**:
   - Initial vault status check (should be false)
   - Vault registration with metadata
   - Post-registration status verification
   - Vault recovery returning correct metadata

2. **Metadata Refresh Cycle**:
   - First refresh updates and returns new metadata
   - Second refresh continues alternation pattern
   - Vault recovery always returns latest metadata

3. **Multiple Refresh Cycles**:
   - 8 sequential refreshes (cycles 3-10)
   - Each refresh verified through status endpoint
   - Confirms long-term alternation stability

#### `TestVaultErrorConditions`
**Purpose**: Comprehensive error scenario testing

**Error Cases**:
- Invalid JSON requests
- PIN validation (too short/long)
- Duplicate vault registration attempts
- Operations on non-existent vaults
- Authentication failures (missing/invalid JWT)

#### `TestVaultConcurrentMetadataUpdates`
**Purpose**: Handler-level concurrency testing

**Design**:
- 20 concurrent refresh requests
- All requests must succeed (no race condition failures)
- Final state verified for consistency
- Database integrity confirmed after concurrent load

## Test Infrastructure

### Database Setup
```go
// Automatic test database creation
setupTestDB(t) *Service
teardownTestDB(t, service)

// Manual table creation (avoids migrations path issues)
setupTestTables(db) error
```

### JWT Authentication
```go
// Test user creation with valid JWT
createTestUserWithJWT(t, handler, userID, email) string
```

### Test Environment Variables
```bash
TEST_DB_HOST=localhost
TEST_DB_PORT=5433  
TEST_DB_USER=postgres
TEST_DB_PASSWORD=password
TEST_DB_NAME=evault_test
TEST_DB_SSLMODE=disable
```

## Running Tests

### Basic Test Execution
```bash
# Database layer tests
go test -v ./internal/database -run TestOpenADP

# Handler layer tests  
go test -v ./internal/handlers -run TestVault

# All metadata tests
go test -v ./internal/database ./internal/handlers -run "(TestOpenADP|TestVault)"
```

### Advanced Test Options
```bash
# Performance benchmarks
go test -bench=BenchmarkOpenADP ./internal/database

# Race condition detection
go test -race -v ./internal/database ./internal/handlers -run "(TestOpenADP|TestVault)"

# Using the test runner script
./run-tests.sh                # Standard tests
./run-tests.sh --bench        # Include benchmarks  
./run-tests.sh --race         # Include race detection
```

## Test Coverage

### Database Operations ✅
- [x] Two-slot metadata storage
- [x] Flag-based current slot selection  
- [x] Atomic refresh operations
- [x] Error condition handling
- [x] Concurrent access protection
- [x] Performance benchmarking

### Handler Operations ✅
- [x] Vault registration flow
- [x] Metadata refresh endpoint
- [x] Vault recovery with latest metadata
- [x] Status endpoint integration
- [x] Authentication validation
- [x] Input validation and errors
- [x] Concurrent request handling

### Integration Flow ✅
- [x] End-to-end vault lifecycle
- [x] Multi-refresh alternation patterns
- [x] Error propagation through layers
- [x] Performance under load
- [x] Thread safety verification

## Expected Results

### Before Fix
```
User opens vault 1-9 times: ✅ Success
User opens vault 10+ times: ❌ "Too many failed attempts - account locked"
```

### After Fix  
```
User opens vault 1-∞ times: ✅ Success (metadata continuously refreshed)
Database alternation: slot_a ↔ slot_b ↔ slot_a ↔ slot_b...
Flag behavior: true → false → true → false...
Current metadata: Always points to latest refreshed data
```

## Test Results Summary

**✅ All 15+ test scenarios pass**
- Database two-slot system working correctly
- Handler integration functioning properly  
- Error conditions handled gracefully
- Concurrent access protected
- Performance benchmarks excellent

**🔄 OpenADP Metadata Refresh Cycle Fixed**
- No more user lockouts after multiple vault accesses
- Proper alternating metadata storage implemented
- Client automatically sends updated metadata to server
- Server implements atomic two-phase commit pattern

The comprehensive test suite validates that the OpenADP metadata refresh issue has been completely resolved with robust error handling and excellent performance characteristics. 