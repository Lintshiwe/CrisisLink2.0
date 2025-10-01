// Test setup configuration
const pool = require('../src/database/db');

// Mock console methods during tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Setup test database connection
beforeAll(async () => {
  // Ensure test database is ready
  try {
    await pool.query('SELECT 1');
    console.log('Test database connection established');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    process.exit(1);
  }
});

// Global test utilities
global.expect.extend({
  toBeArray(received) {
    const pass = Array.isArray(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be an array`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be an array`,
        pass: false,
      };
    }
  },
  
  toBeOneOf(received, array) {
    const pass = array.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${array}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${array}`,
        pass: false,
      };
    }
  }
});

// Cleanup after tests
afterAll(async () => {
  await pool.end();
});