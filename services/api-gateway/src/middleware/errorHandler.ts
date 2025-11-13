import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { httpRequestErrors } from '../utils/metrics';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  service?: string;
}

export class AppError extends Error implements ApiError {
  statusCode: number;
  isOperational: boolean;
  service?: string;

  constructor(message: string, statusCode: number = 500, service?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.service = service;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const service = err.service || 'api-gateway';

  // Log error
  logger.error('Error occurred', {
    method: req.method,
    path: req.path,
    statusCode,
    message,
    service,
    stack: err.stack,
    requestId: req.headers['x-request-id'],
  });

  // Record error metrics
  httpRequestErrors.inc({
    method: req.method,
    route: req.route?.path || req.path,
    error_type: err.name || 'UnknownError',
    service,
  });

  // Send error response
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    service,
    requestId: req.headers['x-request-id'],
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;
