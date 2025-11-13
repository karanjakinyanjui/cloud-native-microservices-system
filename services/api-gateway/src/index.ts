import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import config from './config';
import logger from './utils/logger';
import { initializeTracer } from './utils/tracer';
import { activeConnections } from './utils/metrics';
import { serviceRegistry } from './services/serviceRegistry';
import gatewayRoutes from './routes/gateway.routes';
import healthRoutes from './routes/health.routes';
import errorHandler, { notFoundHandler } from './middleware/errorHandler';

// Initialize tracer
const tracer = initializeTracer();

// Create Express app
const app: Application = express();

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Trace-ID',
    ],
  })
);

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// Trace ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const traceId = (req.headers['x-trace-id'] as string) || uuidv4();
  req.headers['x-trace-id'] = traceId;
  res.setHeader('X-Trace-ID', traceId);
  next();
});

// Active connections tracking
app.use((req: Request, res: Response, next: NextFunction) => {
  activeConnections.inc();
  res.on('finish', () => {
    activeConnections.dec();
  });
  next();
});

// HTTP request logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );
}

// Custom request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.headers['x-request-id'],
      traceId: req.headers['x-trace-id'],
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
});

// Tracing middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan(`${req.method} ${req.path}`);

  span.setTag('http.method', req.method);
  span.setTag('http.url', req.url);
  span.setTag('http.path', req.path);
  span.setTag('request.id', req.headers['x-request-id']);

  (req as any).span = span;

  res.on('finish', () => {
    span.setTag('http.status_code', res.statusCode);

    if (res.statusCode >= 400) {
      span.setTag('error', true);
    }

    span.finish();
  });

  next();
});

// API Gateway info endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'api-gateway',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      ready: '/ready',
      live: '/live',
      status: '/status',
      metrics: '/metrics',
      auth: '/api/auth/*',
      users: '/api/users/*',
      products: '/api/products/*',
      orders: '/api/orders/*',
      payments: '/api/payments/*',
      notifications: '/api/notifications/*',
    },
  });
});

// Health check routes
app.use('/', healthRoutes);

// Gateway routes (proxy to microservices)
app.use('/', gatewayRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  logger.info(`API Gateway started successfully`, {
    port: config.port,
    env: config.env,
    nodeVersion: process.version,
  });

  // Start service health checks
  serviceRegistry.startHealthChecks();

  // Log registered services
  const services = serviceRegistry.getAllServices();
  logger.info(`Registered ${services.length} services`, {
    services: services.map((s) => ({
      name: s.name,
      url: s.url,
    })),
  });
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  server.close(() => {
    logger.info('HTTP server closed');

    // Stop health checks
    serviceRegistry.stopHealthChecks();

    // Close tracer
    if (tracer && typeof (tracer as any).close === 'function') {
      (tracer as any).close(() => {
        logger.info('Tracer closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
  });
});

// Uncaught exception handler
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });

  // Exit process after logging
  process.exit(1);
});

export default app;
