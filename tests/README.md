# eVault Integration Testing Guide

This directory contains comprehensive integration tests for the eVault application, covering API testing, end-to-end browser testing, and full-stack integration scenarios.

## Test Types

### 1. **API Integration Tests** (`/integration/`)
- **Technology**: Jest + Supertest
- **Purpose**: Test backend API endpoints directly
- **Coverage**: Authentication, vault operations, entries, security middleware
- **Location**: `tests/integration/api.test.ts`

### 2. **End-to-End Tests** (`/e2e/`)
- **Technology**: Playwright
- **Purpose**: Test complete user workflows in real browsers
- **Coverage**: UI interactions, authentication flows, vault operations
- **Location**: `tests/e2e/*.spec.ts`

### 3. **Component Integration Tests**
- **Technology**: React Testing Library (in client directory)
- **Purpose**: Test React components with real backend interactions
- **Location**: `client/src/**/*.test.tsx`

## Quick Start

### Prerequisites
```bash
# Install dependencies
npm install

# Ensure PostgreSQL is running locally
# Default: localhost:5432, user: postgres, password: password
```

### Run All Tests
```bash
# Complete test suite
npm test

# Individual test types
npm run test:unit        # React component tests
npm run test:integration # API integration tests
npm run test:e2e         # Browser E2E tests
```

### E2E Testing Options
```bash
# Run in headless mode (CI)
npm run test:e2e

# Run with browser UI visible
npm run test:e2e:headed

# Interactive test debugging
npm run test:e2e:ui
```

## Detailed Setup

### 1. **Local Development Testing**

Start your development environment:
```bash
# Terminal 1: Start database
docker run --name postgres-test -e POSTGRES_PASSWORD=password -e POSTGRES_DB=evault_test -p 5432:5432 -d postgres:15

# Terminal 2: Start server
npm run dev:server

# Terminal 3: Start client
npm run dev:client

# Terminal 4: Run tests
npm run test:integration
npm run test:e2e
```

### 2. **Docker-based Testing**

Use Docker Compose for isolated testing environment:
```bash
# Start test environment
npm run docker:test

# This will:
# - Start test database on port 5433
# - Build and start server in test mode
# - Build and start client in test mode
# - Run integration tests
# - Clean up automatically
```

### 3. **CI/CD Testing**

For continuous integration:
```bash
# Install browsers for Playwright
npx playwright install

# Run tests with coverage
npm test -- --coverage

# Generate test reports
npm run test:e2e -- --reporter=html
```

## Test Configuration

### API Integration Tests
- **Config**: `tests/integration/jest.config.js`
- **Setup**: `tests/integration/setup.ts`
- **Base URL**: `http://localhost:8080`
- **Test Database**: `evault_test`

### E2E Tests
- **Config**: `playwright.config.ts`
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Base URL**: `http://localhost:3000`
- **Screenshots**: On failure only
- **Videos**: Retained on failure

## Writing Tests

### API Integration Test Example
```typescript
import request from 'supertest';

test('POST /api/auth/url - should return Google OAuth URL', async () => {
  const response = await request('http://localhost:8080')
    .post('/api/auth/url')
    .send({
      redirect_uri: 'http://localhost:3000/auth/callback'
    })
    .expect(200);

  expect(response.body.url).toContain('accounts.google.com');
});
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test';

test('should register new vault', async ({ page }) => {
  await page.goto('/vault');
  await page.getByLabelText(/pin/i).fill('test123456');
  await page.getByRole('button', { name: /register/i }).click();
  await expect(page.getByText(/success/i)).toBeVisible();
});
```

## Mock Data and Test Helpers

### Authentication Mocking
```typescript
// Mock authenticated user
const mockAuth = async (page) => {
  await page.route('**/api/user', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        user: { user_id: 'test-123', email: 'test@example.com' }
      })
    });
  });
};
```

### API Response Mocking
```typescript
// Mock vault status
await page.route('**/api/vault/status', async route => {
  await route.fulfill({
    status: 200,
    body: JSON.stringify({ has_vault: true })
  });
});
```

## Test Data Management

### Database Setup
- Tests use `evault_test` database
- Automatic migrations run before tests
- Data cleanup handled in test teardown
- Each test should be independent

### Environment Variables
```bash
# Test environment
NODE_ENV=test
DB_NAME=evault_test
JWT_SECRET=test-jwt-secret-key
GOOGLE_CLIENT_ID=test-google-client-id
GOOGLE_CLIENT_SECRET=test-google-client-secret
```

## Debugging Tests

### API Tests
```bash
# Run specific test file
npm run test:integration -- api.test.ts

# Run with verbose output
npm run test:integration -- --verbose

# Debug mode
npm run test:integration -- --runInBand --detectOpenHandles
```

### E2E Tests
```bash
# Run specific test
npx playwright test homepage.spec.ts

# Debug mode (opens browser)
npx playwright test --debug

# Show trace viewer
npx playwright show-trace test-results/trace.zip
```

## Performance Testing

### Load Testing (Optional)
```bash
# Install k6 for load testing
brew install k6  # macOS
# or npm install -g k6

# Run load test
k6 run tests/load/api-load-test.js
```

## Test Reports

After running tests, find reports in:
- **Coverage**: `coverage/lcov-report/index.html`
- **E2E HTML Report**: `playwright-report/index.html`
- **Test Results**: `test-results/`

## Troubleshooting

### Common Issues

1. **Database Connection**
   ```bash
   # Check PostgreSQL is running
   pg_isready -h localhost -p 5432
   
   # Create test database manually
   createdb evault_test
   ```

2. **Port Conflicts**
   ```bash
   # Check what's using ports
   lsof -i :3000
   lsof -i :8080
   
   # Kill processes if needed
   kill -9 <PID>
   ```

3. **Browser Issues** (E2E)
   ```bash
   # Reinstall browser dependencies
   npx playwright install --with-deps
   ```

4. **Memory Issues**
   ```bash
   # Increase Node.js memory
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

## Best Practices

1. **Test Independence**: Each test should work in isolation
2. **Data Cleanup**: Clean up test data after each test
3. **Meaningful Assertions**: Test behavior, not implementation
4. **Error Scenarios**: Test both success and failure cases
5. **Performance**: Keep tests fast and reliable
6. **Documentation**: Update tests when functionality changes

## Integration with CI/CD

Example GitHub Actions workflow:
```yaml
- name: Run Integration Tests
  run: |
    npm install
    npm run docker:up
    sleep 10
    npm run test:integration
    npm run test:e2e
    npm run docker:down
``` 