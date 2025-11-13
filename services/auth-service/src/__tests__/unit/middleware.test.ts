import { Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { AppError } from '../../middleware/errorHandler';
import jwt from 'jsonwebtoken';
import { config } from '../../config';

jest.mock('jsonwebtoken');
jest.mock('../../config', () => ({
  config: {
    jwtSecret: 'test-secret',
  },
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid_token',
      };

      const decoded = {
        id: 1,
        email: 'test@example.com',
        role: 'user',
      };

      (jwt.verify as jest.Mock).mockReturnValue(decoded);

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect((mockRequest as any).user).toEqual(decoded);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject request without token', async () => {
      mockRequest.headers = {};

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('token'),
          statusCode: 401,
        })
      );
    });

    it('should reject invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid_token',
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should reject expired token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired_token',
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle Bearer token format', async () => {
      mockRequest.headers = {
        authorization: 'Bearer token123',
      };

      (jwt.verify as jest.Mock).mockReturnValue({ id: 1 });

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jwt.verify).toHaveBeenCalledWith('token123', config.jwtSecret);
    });
  });

  describe('authorize', () => {
    it('should authorize user with correct role', () => {
      const authMiddleware = authorize(['admin']);

      mockRequest = {
        user: {
          id: 1,
          email: 'admin@example.com',
          role: 'admin',
        },
      };

      authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject user with incorrect role', () => {
      const authMiddleware = authorize(['admin']);

      mockRequest = {
        user: {
          id: 1,
          email: 'user@example.com',
          role: 'user',
        },
      };

      authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Forbidden'),
          statusCode: 403,
        })
      );
    });

    it('should authorize user with multiple allowed roles', () => {
      const authMiddleware = authorize(['admin', 'moderator']);

      mockRequest = {
        user: {
          id: 1,
          email: 'mod@example.com',
          role: 'moderator',
        },
      };

      authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject request without user object', () => {
      const authMiddleware = authorize(['admin']);

      mockRequest = {};

      authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
