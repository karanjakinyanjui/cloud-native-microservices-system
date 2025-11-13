import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { initTracer } from './utils/tracer';
import { metricsMiddleware, metricsEndpoint } from './utils/metrics';
import userRoutes from './routes/user.routes';
import healthRoutes from './routes/health.routes';
import { errorHandler } from './middleware/errorHandler';
import { Database } from './database';

const app = express();

// Initialize distributed tracing
const tracer = initTracer('user-service');

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - protect against brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to API routes only
app.use('/api/', limiter);

// Metrics middleware - track all requests
app.use(metricsMiddleware);

// Health check routes (should not be rate limited)
app.use('/health', healthRoutes);

// Metrics endpoint for Prometheus
app.use('/metrics', metricsEndpoint);

// API routes
app.use('/api/users', userRoutes);

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handling middleware (must be last)
app.use(errorHandler);

// Database initialization and server startup
const startServer = async () => {
  try {
    // Connect to database
    await Database.getInstance().connect();
    logger.info('Database connected successfully');

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`User service running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`Auth service URL: ${config.authServiceUrl}`);
    });

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      logger.info(`${signal} signal received. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');

        // Close database connections
        try {
          await Database.getInstance().disconnect();
          logger.info('Database connections closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled rejection', { reason });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
