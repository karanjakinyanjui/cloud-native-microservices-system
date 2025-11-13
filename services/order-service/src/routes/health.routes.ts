import { Router, Request, Response } from 'express';
import { getPool } from '../database';
import logger from '../utils/logger';

const router = Router();

/**
 * @route   GET /health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'order-service',
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
    const pool = getPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    res.json({
      status: 'ready',
      service: 'order-service',
      checks: {
        database: 'healthy',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Readiness check failed: ${error}`);
    res.status(503).json({
      status: 'not ready',
      service: 'order-service',
      checks: {
        database: 'unhealthy',
      },
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
  res.json({
    status: 'alive',
    service: 'order-service',
    timestamp: new Date().toISOString(),
  });
});

export default router;
