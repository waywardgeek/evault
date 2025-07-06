import { execSync } from 'child_process';

// Test environment configuration
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'password';
process.env.DB_NAME = 'evault_test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

// Global test setup
beforeAll(async () => {
  console.log('🔧 Setting up integration tests...');
  
  // Create test database if it doesn't exist
  try {
    execSync(`createdb ${process.env.DB_NAME}`, { stdio: 'ignore' });
    console.log('✅ Test database created');
  } catch (error) {
    console.log('ℹ️  Test database already exists or could not be created');
  }

  // Give servers time to start
  await new Promise(resolve => setTimeout(resolve, 2000));
}, 30000);

// Global test teardown
afterAll(async () => {
  console.log('🧹 Cleaning up integration tests...');
  
  // Clean up test data but keep database for next run
  // In a real scenario, you might want to truncate tables here
}, 10000);

// Global test timeout
jest.setTimeout(30000); 