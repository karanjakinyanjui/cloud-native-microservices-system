import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock JWT functions
export const mockJwt = {
  sign: jest.fn((payload: any, secret: string, options?: any) => {
    return `mock.jwt.token.${payload.id}`;
  }),
  verify: jest.fn((token: string, secret: string) => {
    if (token.includes('expired')) {
      throw new jwt.TokenExpiredError('Token expired', new Date());
    }
    if (token.includes('invalid')) {
      throw new jwt.JsonWebTokenError('Invalid token');
    }
    return {
      id: 1,
      email: 'test@example.com',
      role: 'user',
    };
  }),
  decode: jest.fn((token: string) => {
    return {
      id: 1,
      email: 'test@example.com',
      role: 'user',
    };
  }),
};

// Mock bcrypt functions
export const mockBcrypt = {
  hash: jest.fn(async (password: string, rounds: number) => {
    return `$2a$12$hashed_${password}`;
  }),
  compare: jest.fn(async (password: string, hash: string) => {
    return hash.includes(password) || password === 'password123';
  }),
};

// Mock logger
export const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock metrics
export const mockMetrics = {
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
};

// Mock Express Request
export const createMockRequest = (overrides?: any) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: undefined,
  ...overrides,
});

// Mock Express Response
export const createMockResponse = () => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res;
};

// Mock Next Function
export const createMockNext = () => jest.fn();

// Mock Database Client
export const createMockDatabaseClient = () => ({
  query: jest.fn(),
  release: jest.fn(),
});

// Mock Config
export const mockConfig = {
  port: 3000,
  nodeEnv: 'test',
  jwtSecret: 'test-secret',
  jwtExpiresIn: '1h',
  database: {
    host: 'localhost',
    port: 5432,
    database: 'test_db',
    user: 'test_user',
    password: 'test_password',
  },
  redis: {
    host: 'localhost',
    port: 6379,
  },
};

// Test data factories
export const factories = {
  user: (overrides?: any) => ({
    id: Math.floor(Math.random() * 10000),
    email: `user${Math.random()}@example.com`,
    password_hash: '$2a$12$mockhashedpassword',
    role: 'user',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }),

  adminUser: (overrides?: any) => ({
    ...factories.user(),
    role: 'admin',
    ...overrides,
  }),

  refreshToken: (userId?: number, overrides?: any) => ({
    id: Math.floor(Math.random() * 10000),
    user_id: userId || 1,
    token: `refresh_token_${Math.random().toString(36).substring(7)}`,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    ...overrides,
  }),

  expiredRefreshToken: (userId?: number, overrides?: any) => ({
    ...factories.refreshToken(userId),
    expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    ...overrides,
  }),

  accessToken: (userId?: number) => {
    return jwt.sign(
      {
        id: userId || 1,
        email: 'test@example.com',
        role: 'user',
      },
      'test-secret',
      { expiresIn: '1h' }
    );
  },
};

// Helper to wait for promises
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to spy on console
export const suppressConsoleOutput = () => {
  const original = {
    log: console.log,
    error: console.error,
    warn: console.warn,
  };

  beforeEach(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    console.log = original.log;
    console.error = original.error;
    console.warn = original.warn;
  });
};
