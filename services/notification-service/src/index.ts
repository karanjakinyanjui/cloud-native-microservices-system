import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { initializeTracer } from './utils/tracer';
import { database } from './database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { httpRequestDuration, httpRequestTotal } from './utils/metrics';
import notificationRoutes from './routes/notification.routes';
import healthRoutes from './routes/health.routes';

class NotificationService {
  private app: Application;
  private server: any;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandlers();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Request logging and metrics middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();

      // Log request
      logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });

      // Capture response
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;

        // Record metrics
        httpRequestDuration.observe(
          { method: req.method, route, status_code: res.statusCode.toString() },
          duration
        );
        httpRequestTotal.inc({
          method: req.method,
          route,
          status_code: res.statusCode.toString(),
        });

        // Log response
        logger.info('Request completed', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}s`,
        });
      });

      next();
    });
  }

  private setupRoutes(): void {
    // Health check routes
    this.app.use('/health', healthRoutes);
    this.app.use('/metrics', healthRoutes);

    // API routes
    this.app.use('/api/notifications', notificationRoutes);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        service: 'notification-service',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          metrics: '/metrics',
          api: '/api/notifications',
        },
      });
    });
  }

  private setupErrorHandlers(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    try {
      // Initialize tracer
      initializeTracer();
      logger.info('Tracing initialized');

      // Initialize database schema
      await database.initializeSchema();
      logger.info('Database schema initialized');

      // Test database connection
      await database.query('SELECT NOW()');
      logger.info('Database connection established');

      // Start server
      this.server = this.app.listen(config.port, () => {
        logger.info(`Notification Service started successfully`, {
          port: config.port,
          nodeEnv: config.nodeEnv,
          pid: process.pid,
        });
      });

      // Graceful shutdown handlers
      process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    } catch (error: any) {
      logger.error('Failed to start Notification Service', { error: error.message });
      process.exit(1);
    }
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    logger.info(`${signal} signal received: closing HTTP server`);

    // Stop accepting new requests
    if (this.server) {
      this.server.close(() => {
        logger.info('HTTP server closed');
      });
    }

    try {
      // Close database connections
      await database.close();
      logger.info('Database connections closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error: any) {
      logger.error('Error during graceful shutdown', { error: error.message });
      process.exit(1);
    }
  }
}

// Start the service
const service = new NotificationService();
service.start();

export default NotificationService;
