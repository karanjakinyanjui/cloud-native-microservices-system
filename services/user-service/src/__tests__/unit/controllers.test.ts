import { Response, NextFunction } from 'express';
import * as userController from '../../controllers/user.controller';
import { Database } from '../../database';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../middleware/errorHandler';

jest.mock('../../database');
jest.mock('../../utils/logger');
jest.mock('../../utils/metrics', () => ({
  userOperations: { labels: jest.fn(() => ({ inc: jest.fn() })) },
  userProfileViews: { inc: jest.fn() },
}));

describe('User Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockDatabase: any;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: { id: 1, email: 'test@example.com', role: 'user' },
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

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      const mockProfile = {
        id: 1,
        user_id: 1,
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890',
      };

      mockDatabase.query.mockResolvedValue({ rows: [mockProfile] });

      await userController.getProfile(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockProfile,
      });
    });

    it('should create profile if not exists', async () => {
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] });

      await userController.getProfile(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should deny access to other user profiles', async () => {
      mockRequest.params = { id: '2' };
      mockRequest.user = { id: 1, email: 'test@example.com', role: 'user' };

      await userController.getProfile(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should allow admin to view any profile', async () => {
      mockRequest.params = { id: '2' };
      mockRequest.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockDatabase.query.mockResolvedValue({ rows: [{ id: 1, user_id: 2 }] });

      await userController.getProfile(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      mockRequest.body = {
        first_name: 'Jane',
        last_name: 'Smith',
      };

      const updatedProfile = {
        id: 1,
        user_id: 1,
        first_name: 'Jane',
        last_name: 'Smith',
      };

      mockDatabase.query.mockResolvedValue({ rows: [updatedProfile] });

      await userController.updateProfile(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfile,
      });
    });

    it('should validate phone number format', async () => {
      mockRequest.body = {
        phone: 'invalid-phone',
      };

      await userController.updateProfile(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should reject empty update', async () => {
      mockRequest.body = {};

      await userController.updateProfile(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No fields to update',
        })
      );
    });

    it('should create profile during update if not exists', async () => {
      mockRequest.body = { first_name: 'John' };
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, first_name: 'John' }] });

      await userController.updateProfile(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile successfully', async () => {
      mockDatabase.query.mockResolvedValue({ rows: [{ id: 1 }] });

      await userController.deleteProfile(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile deleted successfully',
      });
    });

    it('should return 404 if profile not found', async () => {
      mockDatabase.query.mockResolvedValue({ rows: [] });

      await userController.deleteProfile(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Profile not found',
          statusCode: 404,
        })
      );
    });
  });

  describe('listUsers', () => {
    it('should list users with pagination', async () => {
      mockRequest.query = { page: '1', limit: '10' };
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [{ count: '25' }] })
        .mockResolvedValueOnce({
          rows: Array(10).fill({ id: 1, user_id: 1, first_name: 'Test' }),
        });

      await userController.listUsers(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            total: 25,
            totalPages: 3,
          }),
        })
      );
    });

    it('should limit max results per page', async () => {
      mockRequest.query = { limit: '200' };
      mockDatabase.query.mockResolvedValue({ rows: [{ count: '0' }] });

      await userController.listUsers(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // Should cap at 100
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([100, 0])
      );
    });
  });
});
