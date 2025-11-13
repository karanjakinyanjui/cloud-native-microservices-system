import { Router } from 'express';
import orderController from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  asyncHandler(orderController.createOrder.bind(orderController))
);

/**
 * @route   GET /api/orders
 * @desc    List orders (user's own orders or all for admin)
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(orderController.listOrders.bind(orderController))
);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(orderController.getOrder.bind(orderController))
);

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Update order status (admin only)
 * @access  Private/Admin
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin'),
  asyncHandler(orderController.updateOrderStatus.bind(orderController))
);

/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Cancel an order
 * @access  Private
 */
router.post(
  '/:id/cancel',
  authenticate,
  asyncHandler(orderController.cancelOrder.bind(orderController))
);

export default router;
