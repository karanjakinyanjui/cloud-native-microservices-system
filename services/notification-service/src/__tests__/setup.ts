import { config } from 'dotenv';

config({ path: '.env.test' });

process.env.NODE_ENV = 'test';

global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.setTimeout(10000);

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

beforeAll(async () => {
  // Setup test environment
});

afterAll(async () => {
  jest.clearAllTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
});
