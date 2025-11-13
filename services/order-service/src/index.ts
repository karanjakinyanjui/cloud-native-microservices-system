import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import logger from './utils/logger';
import { initializeTracer } from './utils/tracer';
import { register, httpRequestDuration, httpRequestTotal } from './utils/metrics';
import { initializeDatabase, closeDatabase } from './database';
import errorHandler from './middleware/errorHandler';
import orderRoutes from './routes/order.routes';
import healthRoutes from './routes/health.routes';

const app: Application = express();

// Initialize tracer
initializeTracer();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
const morganFormat = config.nodeEnv === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: {
    write: (message: string) => logger.http(message.trim()),
  },
}));

// Metrics middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);

    httpRequestTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });

  next();
});

// Routes
app.use('/health', healthRoutes);
app.use('/api/orders', orderRoutes);

// Metrics endpoint
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error(`Error generating metrics: ${error}`);
    res.status(500).end();
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close database connections
      await closeDatabase();
      logger.info('Database connections closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error(`Error during graceful shutdown: ${error}`);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Start server
let server: any;

const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Start HTTP server
    server = app.listen(config.port, () => {
      logger.info(`Order Service is running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
      logger.info(`Metrics: http://localhost:${config.port}/metrics`);
    });

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error: Error) => {
      logger.error(`Uncaught Exception: ${error.message}`);
      logger.error(error.stack);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
      gracefulShutdown('unhandledRejection');
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
