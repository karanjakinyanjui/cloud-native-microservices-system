import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import config from '../config';
import logger from '../utils/logger';
import { rateLimitExceeded } from '../utils/metrics';

// Custom key generator that considers authentication
const keyGenerator = (req: Request): string => {
  // Use user ID if authenticated, otherwise use IP
  const userId = (req as any).user?.id;
  return userId || req.ip || 'unknown';
};

// Rate limit handler
const rateLimitHandler = (req: Request, res: Response, tier: string): void => {
  const route = req.route?.path || req.path;

  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    userId: (req as any).user?.id,
    tier,
    route,
    requestId: req.headers['x-request-id'],
  });

  rateLimitExceeded.inc({
    tier,
    route,
  });

  res.status(429).json({
    status: 'error',
    statusCode: 429,
    message: 'Too many requests, please try again later.',
    retryAfter: res.getHeader('Retry-After'),
    requestId: req.headers['x-request-id'],
  });
};

// General rate limiter (for unauthenticated requests)
export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimit.general.windowMs,
  max: config.rateLimit.general.max,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res) => rateLimitHandler(req, res, 'general'),
  skip: (req) => {
    // Skip rate limiting for authenticated users
    return !!(req as any).user?.id;
  },
});

// Authenticated user rate limiter
export const authenticatedRateLimiter = rateLimit({
  windowMs: config.rateLimit.authenticated.windowMs,
  max: config.rateLimit.authenticated.max,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
  handler: (req, res) => rateLimitHandler(req, res, 'authenticated'),
  skip: (req) => {
    const user = (req as any).user;
    // Skip if not authenticated or is premium user
    return !user?.id || user?.tier === 'premium';
  },
});

// Premium user rate limiter
export const premiumRateLimiter = rateLimit({
  windowMs: config.rateLimit.premium.windowMs,
  max: config.rateLimit.premium.max,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
  handler: (req, res) => rateLimitHandler(req, res, 'premium'),
  skip: (req) => {
    const user = (req as any).user;
    // Only apply to premium users
    return !user?.id || user?.tier !== 'premium';
  },
});

// Strict rate limiter for sensitive endpoints (e.g., login, register)
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  keyGenerator: (req) => req.ip || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many attempts, please try again later.',
  handler: (req, res) => rateLimitHandler(req, res, 'strict'),
});

// Combined rate limiter middleware
export const applyRateLimiting = [
  generalRateLimiter,
  authenticatedRateLimiter,
  premiumRateLimiter,
];

export default {
  generalRateLimiter,
  authenticatedRateLimiter,
  premiumRateLimiter,
  strictRateLimiter,
  applyRateLimiting,
};
