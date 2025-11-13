import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from './errorHandler';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // In a real application, verify JWT token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('No authorization header provided');
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedError('Invalid token format');
    }

    // Mock token validation - in production, use JWT verification
    // For demo purposes, we'll extract user info from a mock token
    // In real implementation: jwt.verify(token, secret)

    // Mock user data - replace with actual JWT decode
    req.user = {
      id: 1,
      email: 'user@example.com',
      role: 'user',
    };

    logger.debug('User authenticated', { userId: req.user.id });
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      if (token) {
        // Mock user data
        req.user = {
          id: 1,
          email: 'user@example.com',
          role: 'user',
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new UnauthorizedError('Insufficient permissions');
    }

    next();
  };
};
