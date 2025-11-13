import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError } from './errorHandler';

// Extend Express Request type to include user information
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Middleware to verify JWT token by calling auth-service
 * Extracts token from Authorization header and validates it
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Call auth-service to verify token
    try {
      const response = await axios.get(`${config.authServiceUrl}/api/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 5000, // 5 second timeout
      });

      // If verification successful, attach user info to request
      if (response.data.success && response.data.user) {
        req.user = {
          id: response.data.user.id,
          email: response.data.user.email,
          role: response.data.user.role,
        };

        logger.debug('User authenticated successfully', { userId: req.user.id });
        next();
      } else {
        throw new AppError('Invalid token', 401);
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new AppError('Invalid or expired token', 401);
        } else if (error.code === 'ECONNREFUSED') {
          logger.error('Auth service unavailable', { error: error.message });
          throw new AppError('Authentication service unavailable', 503);
        } else {
          logger.error('Error calling auth service', { error: error.message });
          throw new AppError('Authentication failed', 500);
        }
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user has admin role
 * Must be used after authenticate middleware
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    next(new AppError('Authentication required', 401));
    return;
  }

  if (req.user.role !== 'admin') {
    next(new AppError('Admin access required', 403));
    return;
  }

  next();
};
