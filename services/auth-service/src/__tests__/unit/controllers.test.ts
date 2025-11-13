import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../../controllers/auth.controller';
import { Database } from '../../database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../../middleware/errorHandler';

// Mock dependencies
jest.mock('../../database');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../utils/logger');
jest.mock('../../utils/metrics', () => ({
  authAttempts: { labels: jest.fn(() => ({ inc: jest.fn() })) },
  activeUsers: { inc: jest.fn(), dec: jest.fn() },
}));

describe('AuthController', () => {
  let authController: AuthController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockDatabase: any;

  beforeEach(() => {
    authController = new AuthController();
    mockRequest = {
      body: {},
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    mockDatabase = {
      query: jest.fn(),
    };
    (Database.getInstance as jest.Mock).mockReturnValue(mockDatabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      };

      mockDatabase.query
        .mockResolvedValueOnce({ rows: [] }) // Check user doesn't exist
        .mockResolvedValueOnce({ // Create user
          rows: [{
            id: 1,
            email: 'test@example.com',
            role: 'user',
            created_at: new Date(),
          }],
        });

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      (jwt.sign as jest.Mock).mockReturnValue('access_token');

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.any(Object),
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          }),
        })
      );
    });

    it('should return error if user already exists', async () => {
      mockRequest.body = {
        email: 'existing@example.com',
        password: 'password123',
      };

      mockDatabase.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User already exists',
          statusCode: 409,
        })
      );
    });

    it('should hash password with bcrypt', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockDatabase.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'test@example.com', role: 'user' }],
        });

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      (jwt.sign as jest.Mock).mockReturnValue('token');

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockDatabase.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password_hash: 'hashed_password',
          role: 'user',
          is_active: true,
        }],
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('access_token');

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.any(Object),
            accessToken: expect.any(String),
          }),
        })
      );
    });

    it('should return error for invalid email', async () => {
      mockRequest.body = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockDatabase.query.mockResolvedValueOnce({ rows: [] });

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid credentials',
          statusCode: 401,
        })
      );
    });

    it('should return error for invalid password', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrong_password',
      };

      mockDatabase.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password_hash: 'hashed_password',
          role: 'user',
          is_active: true,
        }],
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid credentials',
          statusCode: 401,
        })
      );
    });

    it('should return error for inactive account', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockDatabase.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password_hash: 'hashed_password',
          role: 'user',
          is_active: false,
        }],
      });

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Account is inactive',
          statusCode: 403,
        })
      );
    });
  });

  describe('refresh', () => {
    it('should generate new access token with valid refresh token', async () => {
      mockRequest.body = {
        refreshToken: 'valid_refresh_token',
      };

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      mockDatabase.query
        .mockResolvedValueOnce({
          rows: [{
            user_id: 1,
            expires_at: futureDate,
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'test@example.com',
            role: 'user',
          }],
        });

      (jwt.sign as jest.Mock).mockReturnValue('new_access_token');

      await authController.refresh(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: 'new_access_token',
          }),
        })
      );
    });

    it('should return error for invalid refresh token', async () => {
      mockRequest.body = {
        refreshToken: 'invalid_token',
      };

      mockDatabase.query.mockResolvedValueOnce({ rows: [] });

      await authController.refresh(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid refresh token',
          statusCode: 401,
        })
      );
    });

    it('should return error for expired refresh token', async () => {
      mockRequest.body = {
        refreshToken: 'expired_token',
      };

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      mockDatabase.query.mockResolvedValueOnce({
        rows: [{
          user_id: 1,
          expires_at: pastDate,
        }],
      });

      await authController.refresh(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Refresh token expired',
          statusCode: 401,
        })
      );
    });
  });

  describe('logout', () => {
    it('should logout user and delete refresh token', async () => {
      mockRequest.body = {
        refreshToken: 'valid_token',
      };

      mockDatabase.query.mockResolvedValueOnce({ rows: [] });

      await authController.logout(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDatabase.query).toHaveBeenCalledWith(
        'DELETE FROM refresh_tokens WHERE token = $1',
        ['valid_token']
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logged out successfully',
        })
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify valid JWT token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid_token',
      };

      const decoded = {
        id: 1,
        email: 'test@example.com',
        role: 'user',
      };

      (jwt.verify as jest.Mock).mockReturnValue(decoded);

      await authController.verifyToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            valid: true,
            user: decoded,
          }),
        })
      );
    });

    it('should return error if no token provided', async () => {
      mockRequest.headers = {};

      await authController.verifyToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No token provided',
          statusCode: 401,
        })
      );
    });

    it('should return invalid for expired token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired_token',
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      await authController.verifyToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          data: expect.objectContaining({
            valid: false,
          }),
        })
      );
    });
  });
});
