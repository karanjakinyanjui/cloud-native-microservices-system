import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('No token provided', 401);
    }

    // Verify token with auth service
    try {
      const response = await axios.get(`${config.authService.url}/api/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 5000,
      });

      req.user = response.data.user;
      next();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new AppError('Invalid or expired token', 401);
        }
        logger.error('Auth service error', { error: error.message });
        throw new AppError('Authentication service unavailable', 503);
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('User not authenticated', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};
