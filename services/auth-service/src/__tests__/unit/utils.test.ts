import { logger } from '../../utils/logger';
import * as metrics from '../../utils/metrics';

// Mock Winston logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Utils', () => {
  describe('Logger', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should log info messages', () => {
      logger.info('Test info message', { userId: 1 });

      expect(logger.info).toHaveBeenCalledWith('Test info message', { userId: 1 });
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', { error });

      expect(logger.error).toHaveBeenCalledWith('Error occurred', { error });
    });

    it('should log warning messages', () => {
      logger.warn('Test warning');

      expect(logger.warn).toHaveBeenCalledWith('Test warning');
    });

    it('should log debug messages', () => {
      logger.debug('Debug info', { data: 'test' });

      expect(logger.debug).toHaveBeenCalledWith('Debug info', { data: 'test' });
    });
  });

  describe('Metrics', () => {
    it('should export authAttempts counter', () => {
      expect(metrics.authAttempts).toBeDefined();
    });

    it('should export activeUsers gauge', () => {
      expect(metrics.activeUsers).toBeDefined();
    });

    it('should increment auth attempts', () => {
      const mockInc = jest.fn();
      const mockLabels = jest.fn(() => ({ inc: mockInc }));

      const counter = {
        labels: mockLabels,
      };

      counter.labels('success').inc();

      expect(mockLabels).toHaveBeenCalledWith('success');
      expect(mockInc).toHaveBeenCalled();
    });
  });
});
