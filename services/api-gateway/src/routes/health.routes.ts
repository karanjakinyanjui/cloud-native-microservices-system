import { Router, Request, Response } from 'express';
import { serviceRegistry } from '../services/serviceRegistry';
import { getMetrics } from '../utils/metrics';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';

const router = Router();

// Basic health check
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readiness check
router.get(
  '/ready',
  asyncHandler(async (req: Request, res: Response) => {
    const serviceHealth = await serviceRegistry.checkAllServices();
    const allHealthy = Object.values(serviceHealth).every((s) => s.healthy);

    if (allHealthy) {
      res.status(200).json({
        status: 'ready',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
        services: serviceHealth,
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
        services: serviceHealth,
      });
    }
  })
);

// Liveness check
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// Service status endpoint
router.get(
  '/status',
  asyncHandler(async (req: Request, res: Response) => {
    const serviceHealth = await serviceRegistry.checkAllServices();

    res.status(200).json({
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: serviceHealth,
    });
  })
);

// Metrics endpoint
router.get(
  '/metrics',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const metrics = await getMetrics();
      res.set('Content-Type', 'text/plain');
      res.status(200).send(metrics);
    } catch (error) {
      logger.error('Error collecting metrics', { error });
      res.status(500).json({
        status: 'error',
        message: 'Failed to collect metrics',
      });
    }
  })
);

// Individual service health check
router.get(
  '/health/:serviceName',
  asyncHandler(async (req: Request, res: Response) => {
    const { serviceName } = req.params;
    const health = await serviceRegistry.checkService(serviceName);

    if (!health) {
      res.status(404).json({
        status: 'error',
        message: `Service ${serviceName} not found`,
      });
      return;
    }

    const statusCode = health.healthy ? 200 : 503;
    res.status(statusCode).json(health);
  })
);

export default router;
