import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/auth_test';

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup global test timeout
jest.setTimeout(10000);

// Mock external services
jest.mock('../utils/tracer', () => ({
  getTracer: jest.fn(() => ({
    startSpan: jest.fn(() => ({
      setTag: jest.fn(),
      log: jest.fn(),
      finish: jest.fn(),
    })),
    inject: jest.fn(),
  })),
  initTracer: jest.fn(),
}));

// Mock metrics
jest.mock('../utils/metrics', () => ({
  authAttempts: {
    labels: jest.fn(() => ({
      inc: jest.fn(),
    })),
  },
  activeUsers: {
    inc: jest.fn(),
    dec: jest.fn(),
    set: jest.fn(),
  },
  httpRequestDuration: {
    labels: jest.fn(() => ({
      observe: jest.fn(),
    })),
  },
  httpRequestTotal: {
    labels: jest.fn(() => ({
      inc: jest.fn(),
    })),
  },
}));

// Global test hooks
beforeAll(async () => {
  // Setup test database, connections, etc.
});

afterAll(async () => {
  // Cleanup test database, close connections, etc.
  jest.clearAllTimers();
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});

// Custom matchers
expect.extend({
  toBeValidToken(received: string) {
    const isValid = typeof received === 'string' && received.length > 0;
    return {
      message: () =>
        `expected ${received} to be a valid token`,
      pass: isValid,
    };
  },
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(received);
    return {
      message: () =>
        `expected ${received} to be a valid email`,
      pass: isValid,
    };
  },
});

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidToken(): R;
      toBeValidEmail(): R;
    }
  }
}

// Export test utilities
export const testUtils = {
  generateTestEmail: () => `test-${Date.now()}@example.com`,
  generateTestPassword: () => `Test123!${Math.random()}`,
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};
