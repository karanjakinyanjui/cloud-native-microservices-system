import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { initTracer } from './utils/tracer';
import { metricsMiddleware, metricsEndpoint } from './utils/metrics';
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';
import { errorHandler } from './middleware/errorHandler';
import { Database } from './database';

const app = express();
const tracer = initTracer('auth-service');

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Metrics middleware
app.use(metricsMiddleware);

// Routes
app.use('/health', healthRoutes);
app.use('/metrics', metricsEndpoint);
app.use('/api/auth', authRoutes);

// Error handling
app.use(errorHandler);

// Database initialization
Database.getInstance().connect().then(() => {
  logger.info('Database connected successfully');

  // Start server
  app.listen(config.port, () => {
    logger.info(`Auth service running on port ${config.port}`);
    logger.info(`Environment: ${config.env}`);
  });
}).catch((error) => {
  logger.error('Failed to connect to database', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received. Closing HTTP server...');
  await Database.getInstance().disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received. Closing HTTP server...');
  await Database.getInstance().disconnect();
  process.exit(0);
});

export default app;
