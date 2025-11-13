import { Router, Request, Response } from 'express';
import { database } from '../database';
import { emailService } from '../services/emailService';
import { smsService } from '../services/smsService';
import { logger } from '../utils/logger';
import { register } from '../utils/metrics';

const router = Router();

/**
 * @route   GET /health
 * @desc    Basic health check endpoint
 * @access  Public
 */
router.get('/', async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route   GET /health/ready
 * @desc    Readiness probe - checks if service is ready to accept traffic
 * @access  Public
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await database.query('SELECT 1');

    res.status(200).json({
      status: 'ready',
      checks: {
        database: 'connected',
        email: 'configured',
        sms: 'configured',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   GET /health/live
 * @desc    Liveness probe - checks if service is alive
 * @access  Public
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route   GET /health/detailed
 * @desc    Detailed health check with component status
 * @access  Public
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const health: any = {
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // Check database
  try {
    await database.query('SELECT 1');
    health.checks.database = {
      status: 'healthy',
      message: 'Database connection successful',
    };
  } catch (error: any) {
    health.status = 'unhealthy';
    health.checks.database = {
      status: 'unhealthy',
      message: error.message,
    };
  }

  // Check email service
  try {
    const emailReady = await emailService.verifyConnection();
    health.checks.email = {
      status: emailReady ? 'healthy' : 'degraded',
      message: emailReady ? 'Email service ready' : 'Email service in mock mode',
    };
  } catch (error: any) {
    health.checks.email = {
      status: 'unhealthy',
      message: error.message,
    };
  }

  // Check SMS service
  try {
    const smsReady = await smsService.verifyConfiguration();
    health.checks.sms = {
      status: smsReady ? 'healthy' : 'degraded',
      message: smsReady ? 'SMS service ready' : 'SMS service in mock mode',
    };
  } catch (error: any) {
    health.checks.sms = {
      status: 'unhealthy',
      message: error.message,
    };
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * @route   GET /metrics
 * @desc    Prometheus metrics endpoint
 * @access  Public
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error: any) {
    logger.error('Error generating metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

export default router;
