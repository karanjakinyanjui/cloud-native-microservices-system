import { Response, NextFunction } from 'express';
import Joi from 'joi';
import crypto from 'crypto';
import { Database } from '../database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  paymentOperations,
  paymentAmount,
  paymentProcessingDuration,
  activePayments,
  refundOperations,
} from '../utils/metrics';
import { paymentGateway } from '../services/paymentGateway';

// Validation schemas
const processPaymentSchema = Joi.object({
  order_id: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string().length(3).uppercase().default('USD'),
  payment_method: Joi.string()
    .valid('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'crypto')
    .required(),
  metadata: Joi.object().optional(),
});

const refundPaymentSchema = Joi.object({
  amount: Joi.number().positive().precision(2).optional(),
  reason: Joi.string().max(500).optional(),
});

/**
 * Process a new payment
 * Implements idempotency using idempotency_key
 */
export const processPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();

  try {
    const userId = req.user!.id;

    // Validate request body
    const { error, value } = processPaymentSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { order_id, amount, currency, payment_method, metadata } = value;

    // Generate or retrieve idempotency key
    const idempotencyKey =
      req.headers['idempotency-key'] as string ||
      crypto.randomBytes(16).toString('hex');

    const db = Database.getInstance();

    // Check for existing payment with same idempotency key
    const existingPayment = await db.query(
      'SELECT * FROM payments WHERE idempotency_key = $1',
      [idempotencyKey]
    );

    if (existingPayment.rows.length > 0) {
      logger.info('Returning existing payment (idempotency)', {
        idempotencyKey,
        paymentId: existingPayment.rows[0].id,
      });

      res.status(200).json({
        success: true,
        message: 'Payment already processed',
        data: existingPayment.rows[0],
      });
      return;
    }

    // Create payment record in pending state
    const paymentResult = await db.query(
      `INSERT INTO payments (order_id, user_id, amount, currency, status, payment_method, payment_gateway, idempotency_key, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        order_id,
        userId,
        amount,
        currency,
        'pending',
        payment_method,
        'stripe',
        idempotencyKey,
        JSON.stringify(metadata || {}),
      ]
    );

    const payment = paymentResult.rows[0];
    activePayments.inc();

    logger.info('Payment record created', { paymentId: payment.id, orderId: order_id });

    // Update status to processing
    await db.query(
      'UPDATE payments SET status = $1 WHERE id = $2',
      ['processing', payment.id]
    );

    try {
      // Process payment through gateway
      const gatewayResponse = await paymentGateway.processPayment({
        amount,
        currency,
        paymentMethod: payment_method,
        orderId: order_id,
        userId,
        metadata,
      });

      // Update payment with gateway response
      const finalStatus = gatewayResponse.success
        ? gatewayResponse.status
        : 'failed';

      const updatedPayment = await db.query(
        `UPDATE payments
         SET status = $1, transaction_id = $2, metadata = $3, error_message = $4
         WHERE id = $5
         RETURNING *`,
        [
          finalStatus,
          gatewayResponse.transactionId,
          JSON.stringify({
            ...(metadata || {}),
            ...(gatewayResponse.metadata || {}),
          }),
          gatewayResponse.message || null,
          payment.id,
        ]
      );

      const processingDuration = (Date.now() - startTime) / 1000;
      paymentProcessingDuration
        .labels(payment_method, finalStatus)
        .observe(processingDuration);
      paymentOperations.labels('process', finalStatus).inc();
      paymentAmount.labels(currency, finalStatus).observe(amount);

      if (finalStatus === 'completed' || finalStatus === 'pending') {
        activePayments.dec();
      }

      logger.info('Payment processed', {
        paymentId: payment.id,
        status: finalStatus,
        transactionId: gatewayResponse.transactionId,
      });

      res.status(gatewayResponse.success ? 200 : 402).json({
        success: gatewayResponse.success,
        message: gatewayResponse.message || 'Payment processed',
        data: updatedPayment.rows[0],
      });
    } catch (gatewayError: any) {
      // Update payment status to failed
      await db.query(
        'UPDATE payments SET status = $1, error_message = $2 WHERE id = $3',
        ['failed', gatewayError.message, payment.id]
      );

      activePayments.dec();
      paymentOperations.labels('process', 'failed').inc();

      logger.error('Payment gateway error', {
        paymentId: payment.id,
        error: gatewayError.message,
      });

      throw new AppError('Payment processing failed', 402);
    }
  } catch (error) {
    paymentOperations.labels('process', 'error').inc();
    next(error);
  }
};

/**
 * Get payment details by ID
 */
export const getPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const paymentId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (isNaN(paymentId)) {
      throw new AppError('Invalid payment ID', 400);
    }

    const db = Database.getInstance();
    const result = await db.query(
      'SELECT * FROM payments WHERE id = $1',
      [paymentId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Payment not found', 404);
    }

    const payment = result.rows[0];

    // Check authorization: user can only view their own payments unless admin
    if (payment.user_id !== userId && userRole !== 'admin') {
      throw new AppError('Access denied', 403);
    }

    paymentOperations.labels('get', 'success').inc();

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    paymentOperations.labels('get', 'failed').inc();
    next(error);
  }
};

/**
 * List payments with pagination and filtering
 */
export const listPayments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;

    // Parse filter parameters
    const filterUserId = req.query.user_id
      ? parseInt(req.query.user_id as string)
      : null;
    const filterOrderId = req.query.order_id
      ? parseInt(req.query.order_id as string)
      : null;
    const filterStatus = req.query.status as string;

    const db = Database.getInstance();

    // Build query based on user role and filters
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    // Non-admin users can only see their own payments
    if (userRole !== 'admin') {
      whereClause = `WHERE user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    } else if (filterUserId) {
      whereClause = `WHERE user_id = $${paramIndex}`;
      params.push(filterUserId);
      paramIndex++;
    }

    // Add order_id filter
    if (filterOrderId) {
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ` order_id = $${paramIndex}`;
      params.push(filterOrderId);
      paramIndex++;
    }

    // Add status filter
    if (filterStatus) {
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ` status = $${paramIndex}`;
      params.push(filterStatus);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM payments ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get paginated results
    const query = `
      SELECT * FROM payments
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await db.query(query, params);

    paymentOperations.labels('list', 'success').inc();
    logger.info('Payments listed', { page, limit, totalCount, userId });

    res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    paymentOperations.labels('list', 'failed').inc();
    next(error);
  }
};

/**
 * Process a refund for a payment
 */
export const refundPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const paymentId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (isNaN(paymentId)) {
      throw new AppError('Invalid payment ID', 400);
    }

    // Validate request body
    const { error, value } = refundPaymentSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { amount: refundAmount, reason } = value;

    const db = Database.getInstance();

    // Get payment details
    const paymentResult = await db.query(
      'SELECT * FROM payments WHERE id = $1',
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      throw new AppError('Payment not found', 404);
    }

    const payment = paymentResult.rows[0];

    // Check authorization
    if (payment.user_id !== userId && userRole !== 'admin') {
      throw new AppError('Access denied', 403);
    }

    // Validate payment status
    if (payment.status !== 'completed') {
      throw new AppError('Only completed payments can be refunded', 400);
    }

    // Calculate refund amount (partial or full)
    const amountToRefund = refundAmount || payment.amount;

    // Get total already refunded
    const refundedResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total_refunded
       FROM refunds
       WHERE payment_id = $1 AND status = 'completed'`,
      [paymentId]
    );

    const totalRefunded = parseFloat(refundedResult.rows[0].total_refunded);
    const remainingAmount = parseFloat(payment.amount) - totalRefunded;

    if (amountToRefund > remainingAmount) {
      throw new AppError(
        `Refund amount exceeds remaining refundable amount (${remainingAmount} ${payment.currency})`,
        400
      );
    }

    // Create refund record
    const refundResult = await db.query(
      `INSERT INTO refunds (payment_id, amount, reason, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [paymentId, amountToRefund, reason || null, 'processing']
    );

    const refund = refundResult.rows[0];

    try {
      // Process refund through gateway
      const gatewayResponse = await paymentGateway.processRefund({
        transactionId: payment.transaction_id,
        amount: amountToRefund,
        reason,
      });

      // Update refund with gateway response
      const finalStatus = gatewayResponse.success ? 'completed' : 'failed';

      const updatedRefund = await db.query(
        `UPDATE refunds
         SET status = $1, transaction_id = $2
         WHERE id = $3
         RETURNING *`,
        [finalStatus, gatewayResponse.refundId, refund.id]
      );

      // Update payment status if fully refunded
      if (finalStatus === 'completed') {
        const newTotalRefunded = totalRefunded + amountToRefund;
        const newPaymentStatus =
          newTotalRefunded >= parseFloat(payment.amount)
            ? 'refunded'
            : 'partially_refunded';

        await db.query('UPDATE payments SET status = $1 WHERE id = $2', [
          newPaymentStatus,
          paymentId,
        ]);
      }

      refundOperations.labels(finalStatus).inc();

      logger.info('Refund processed', {
        refundId: refund.id,
        paymentId,
        amount: amountToRefund,
        status: finalStatus,
      });

      res.status(gatewayResponse.success ? 200 : 402).json({
        success: gatewayResponse.success,
        message: gatewayResponse.message || 'Refund processed',
        data: updatedRefund.rows[0],
      });
    } catch (gatewayError: any) {
      // Update refund status to failed
      await db.query('UPDATE refunds SET status = $1 WHERE id = $2', [
        'failed',
        refund.id,
      ]);

      refundOperations.labels('failed').inc();

      logger.error('Refund gateway error', {
        refundId: refund.id,
        error: gatewayError.message,
      });

      throw new AppError('Refund processing failed', 402);
    }
  } catch (error) {
    refundOperations.labels('error').inc();
    next(error);
  }
};

/**
 * Handle webhook events from payment gateway
 */
export const webhookHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      throw new AppError('Missing webhook signature', 400);
    }

    // Verify webhook signature
    const payload = JSON.stringify(req.body);
    const isValid = paymentGateway.verifyWebhookSignature(payload, signature);

    if (!isValid) {
      logger.warn('Invalid webhook signature', { signature });
      throw new AppError('Invalid webhook signature', 401);
    }

    const event = req.body;

    logger.info('Webhook received', { type: event.type, id: event.id });

    // Handle different webhook event types
    switch (event.type) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(event.data);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event.data);
        break;

      case 'refund.completed':
        await handleRefundCompleted(event.data);
        break;

      default:
        logger.info('Unhandled webhook event type', { type: event.type });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook handling error', { error });
    next(error);
  }
};

// Webhook event handlers

async function handlePaymentSucceeded(data: any): Promise<void> {
  const { transaction_id } = data;

  const db = Database.getInstance();
  await db.query(
    'UPDATE payments SET status = $1 WHERE transaction_id = $2',
    ['completed', transaction_id]
  );

  activePayments.dec();
  logger.info('Payment updated from webhook', {
    transactionId: transaction_id,
    status: 'completed',
  });
}

async function handlePaymentFailed(data: any): Promise<void> {
  const { transaction_id, error_message } = data;

  const db = Database.getInstance();
  await db.query(
    'UPDATE payments SET status = $1, error_message = $2 WHERE transaction_id = $3',
    ['failed', error_message, transaction_id]
  );

  activePayments.dec();
  logger.info('Payment updated from webhook', {
    transactionId: transaction_id,
    status: 'failed',
  });
}

async function handleRefundCompleted(data: any): Promise<void> {
  const { refund_id } = data;

  const db = Database.getInstance();
  await db.query('UPDATE refunds SET status = $1 WHERE transaction_id = $2', [
    'completed',
    refund_id,
  ]);

  logger.info('Refund updated from webhook', {
    refundId: refund_id,
    status: 'completed',
  });
}
