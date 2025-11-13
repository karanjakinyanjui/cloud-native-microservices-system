import { Router } from 'express';
import config from '../config';
import { createServiceProxy, serviceHealthCheck } from '../middleware/proxy';
import { applyRateLimiting, strictRateLimiter } from '../middleware/rateLimit';

const router = Router();

// Auth service routes
router.use(
  '/api/auth/login',
  strictRateLimiter,
  serviceHealthCheck('auth-service'),
  createServiceProxy(config.services.auth, {
    '^/api/auth': '',
  })
);

router.use(
  '/api/auth/register',
  strictRateLimiter,
  serviceHealthCheck('auth-service'),
  createServiceProxy(config.services.auth, {
    '^/api/auth': '',
  })
);

router.use(
  '/api/auth',
  applyRateLimiting,
  serviceHealthCheck('auth-service'),
  createServiceProxy(config.services.auth, {
    '^/api/auth': '',
  })
);

// User service routes
router.use(
  '/api/users',
  applyRateLimiting,
  serviceHealthCheck('user-service'),
  createServiceProxy(config.services.user, {
    '^/api/users': '',
  })
);

// Product service routes
router.use(
  '/api/products',
  applyRateLimiting,
  serviceHealthCheck('product-service'),
  createServiceProxy(config.services.product, {
    '^/api/products': '',
  })
);

// Order service routes
router.use(
  '/api/orders',
  applyRateLimiting,
  serviceHealthCheck('order-service'),
  createServiceProxy(config.services.order, {
    '^/api/orders': '',
  })
);

// Payment service routes
router.use(
  '/api/payments',
  applyRateLimiting,
  serviceHealthCheck('payment-service'),
  createServiceProxy(config.services.payment, {
    '^/api/payments': '',
  })
);

// Notification service routes
router.use(
  '/api/notifications',
  applyRateLimiting,
  serviceHealthCheck('notification-service'),
  createServiceProxy(config.services.notification, {
    '^/api/notifications': '',
  })
);

export default router;
