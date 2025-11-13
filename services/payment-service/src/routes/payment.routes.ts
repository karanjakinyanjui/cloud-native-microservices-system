import { Router } from 'express';
import {
  processPayment,
  getPayment,
  listPayments,
  refundPayment,
  webhookHandler,
} from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/payments
 * Process a new payment
 * Requires authentication
 * Supports idempotency via Idempotency-Key header
 */
router.post('/', authenticate, processPayment);

/**
 * GET /api/payments
 * List payments with pagination and filtering
 * Requires authentication
 * Query params: page, limit, user_id (admin only), order_id, status
 */
router.get('/', authenticate, listPayments);

/**
 * GET /api/payments/:id
 * Get payment details by ID
 * Requires authentication
 * Users can only view their own payments unless admin
 */
router.get('/:id', authenticate, getPayment);

/**
 * POST /api/payments/:id/refund
 * Process a refund for a payment
 * Requires authentication
 * Users can only refund their own payments unless admin
 */
router.post('/:id/refund', authenticate, refundPayment);

/**
 * POST /api/payments/webhook
 * Handle webhook events from payment gateway
 * No authentication required (verified via signature)
 */
router.post('/webhook', webhookHandler);

export default router;
