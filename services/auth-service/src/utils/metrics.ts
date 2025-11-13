import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const authAttempts = new client.Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['status'],
  registers: [register],
});

export const activeUsers = new client.Gauge({
  name: 'active_users_total',
  help: 'Total number of active users',
  registers: [register],
});

// Middleware to track metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;

    httpRequestDuration.labels(req.method, route, res.statusCode.toString()).observe(duration);
    httpRequestTotal.labels(req.method, route, res.statusCode.toString()).inc();
  });

  next();
};

// Metrics endpoint
export const metricsEndpoint = async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};

export { register };
