import { Router, Request, Response } from 'express';
import { Database } from '../database';

const router = Router();

router.get('/liveness', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/readiness', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await Database.getInstance().query('SELECT 1');

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'failed',
      },
    });
  }
});

export default router;
