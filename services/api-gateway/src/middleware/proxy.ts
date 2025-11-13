import {
  createProxyMiddleware,
  Options,
  RequestHandler,
} from 'http-proxy-middleware';
import CircuitBreaker from 'opossum';
import { Request, Response, NextFunction } from 'express';
import config, { ServiceConfig } from '../config';
import logger from '../utils/logger';
import {
  httpRequestDuration,
  httpRequestTotal,
  circuitBreakerStatus,
  circuitBreakerFailures,
} from '../utils/metrics';
import { AppError } from './errorHandler';

// Circuit breakers for each service
const circuitBreakers = new Map<string, CircuitBreaker>();

// Initialize circuit breaker for a service
function getCircuitBreaker(serviceName: string): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    const breaker = new CircuitBreaker(
      async (req: Request) => {
        return new Promise((resolve, reject) => {
          // This is a placeholder - actual request is handled by proxy
          resolve(req);
        });
      },
      {
        timeout: config.circuitBreaker.timeout,
        errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
        resetTimeout: config.circuitBreaker.resetTimeout,
      }
    );

    // Circuit breaker event listeners
    breaker.on('open', () => {
      logger.warn(`Circuit breaker opened for ${serviceName}`);
      circuitBreakerStatus.set({ service: serviceName }, 1);
    });

    breaker.on('halfOpen', () => {
      logger.info(`Circuit breaker half-open for ${serviceName}`);
      circuitBreakerStatus.set({ service: serviceName }, 2);
    });

    breaker.on('close', () => {
      logger.info(`Circuit breaker closed for ${serviceName}`);
      circuitBreakerStatus.set({ service: serviceName }, 0);
    });

    breaker.on('failure', () => {
      circuitBreakerFailures.inc({ service: serviceName });
    });

    circuitBreakers.set(serviceName, breaker);
  }

  return circuitBreakers.get(serviceName)!;
}

// Create proxy middleware for a service
export function createServiceProxy(
  serviceConfig: ServiceConfig,
  pathRewrite?: Record<string, string>
): RequestHandler {
  const serviceName = serviceConfig.name;
  const breaker = getCircuitBreaker(serviceName);

  const proxyOptions: Options = {
    target: serviceConfig.url,
    changeOrigin: true,
    pathRewrite: pathRewrite || {},
    timeout: config.requestTimeout,
    proxyTimeout: config.requestTimeout,

    // Logging
    logLevel: config.env === 'development' ? 'debug' : 'warn',

    // Error handling
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${serviceName}`, {
        error: err.message,
        service: serviceName,
        path: req.url,
        requestId: req.headers['x-request-id'],
      });

      breaker.fire(req as Request).catch(() => {});

      if (!res.headersSent) {
        (res as Response).status(502).json({
          status: 'error',
          statusCode: 502,
          message: `Service ${serviceName} is unavailable`,
          service: serviceName,
          requestId: req.headers['x-request-id'],
        });
      }
    },

    // Request interceptor
    onProxyReq: (proxyReq, req, res) => {
      const startTime = Date.now();
      (req as any).startTime = startTime;

      // Propagate request ID
      const requestId = req.headers['x-request-id'] as string;
      if (requestId) {
        proxyReq.setHeader('x-request-id', requestId);
      }

      // Add trace context
      const traceId = req.headers['x-trace-id'] as string;
      if (traceId) {
        proxyReq.setHeader('x-trace-id', traceId);
      }

      logger.debug(`Proxying request to ${serviceName}`, {
        method: req.method,
        path: req.url,
        service: serviceName,
        requestId,
      });
    },

    // Response interceptor
    onProxyRes: (proxyRes, req, res) => {
      const startTime = (req as any).startTime;
      const duration = (Date.now() - startTime) / 1000;
      const statusCode = proxyRes.statusCode || 500;

      // Record metrics
      httpRequestDuration.observe(
        {
          method: req.method,
          route: req.url || '',
          status_code: statusCode.toString(),
          service: serviceName,
        },
        duration
      );

      httpRequestTotal.inc({
        method: req.method,
        route: req.url || '',
        status_code: statusCode.toString(),
        service: serviceName,
      });

      logger.debug(`Received response from ${serviceName}`, {
        method: req.method,
        path: req.url,
        statusCode,
        duration: `${duration}s`,
        service: serviceName,
        requestId: req.headers['x-request-id'],
      });

      // Mark circuit breaker as success for 2xx responses
      if (statusCode >= 200 && statusCode < 300) {
        breaker.fire(req as Request).catch(() => {});
      } else if (statusCode >= 500) {
        // Mark as failure for 5xx errors
        breaker.fire(req as Request).catch(() => {});
      }
    },
  };

  const proxy = createProxyMiddleware(proxyOptions);

  // Wrap proxy with circuit breaker check
  return (req: Request, res: Response, next: NextFunction) => {
    if (breaker.opened) {
      logger.warn(`Circuit breaker is open for ${serviceName}`, {
        service: serviceName,
        path: req.url,
        requestId: req.headers['x-request-id'],
      });

      return res.status(503).json({
        status: 'error',
        statusCode: 503,
        message: `Service ${serviceName} is temporarily unavailable`,
        service: serviceName,
        requestId: req.headers['x-request-id'],
      });
    }

    proxy(req, res, next);
  };
}

// Middleware to check service health before proxying
export function serviceHealthCheck(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const breaker = getCircuitBreaker(serviceName);

    if (breaker.opened) {
      return next(
        new AppError(
          `Service ${serviceName} is temporarily unavailable`,
          503,
          serviceName
        )
      );
    }

    next();
  };
}

export { circuitBreakers };

export default {
  createServiceProxy,
  serviceHealthCheck,
  getCircuitBreaker,
};
