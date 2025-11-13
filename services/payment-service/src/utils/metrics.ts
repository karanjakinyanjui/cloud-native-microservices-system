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

// Payment-specific metrics
export const paymentOperations = new client.Counter({
  name: 'payment_operations_total',
  help: 'Total number of payment operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

export const paymentAmount = new client.Histogram({
  name: 'payment_amount',
  help: 'Payment amounts processed',
  labelNames: ['currency', 'status'],
  buckets: [10, 50, 100, 500, 1000, 5000, 10000],
  registers: [register],
});

export const paymentProcessingDuration = new client.Histogram({
  name: 'payment_processing_duration_seconds',
  help: 'Duration of payment processing in seconds',
  labelNames: ['payment_method', 'status'],
  registers: [register],
});

export const activePayments = new client.Gauge({
  name: 'active_payments_total',
  help: 'Total number of active payments (pending/processing)',
  registers: [register],
});

export const refundOperations = new client.Counter({
  name: 'refund_operations_total',
  help: 'Total number of refund operations',
  labelNames: ['status'],
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
