import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { query, getClient, CreateOrderData } from '../database';
import logger from '../utils/logger';
import {
  ordersCreatedTotal,
  ordersStatusTotal,
  orderProcessingDuration
} from '../utils/metrics';
import { getTracer } from '../utils/tracer';
import productService from '../services/productService';
import paymentService from '../services/paymentService';
import notificationService from '../services/notificationService';

export class OrderController {
  async createOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const tracer = getTracer();
    const span = tracer.startSpan('order.createOrder');
    const start = Date.now();

    const client = await getClient();

    try {
      await client.query('BEGIN');

      const { items, shipping_address } = req.body;
      const userId = req.user!.id;

      // Validate input
      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new AppError('Order must contain at least one item', 400);
      }

      if (!shipping_address || !shipping_address.street || !shipping_address.city) {
        throw new AppError('Valid shipping address is required', 400);
      }

      // Step 1: Verify products and check stock
      span.log({ event: 'verify_products_start' });
      const productIds = items.map((item: any) => item.product_id);
      const products = await productService.getProducts(productIds, span);

      // Validate all products exist and have sufficient stock
      for (const item of items) {
        const product = products.find(p => p.data?.id === item.product_id);

        if (!product || !product.data) {
          await client.query('ROLLBACK');
          throw new AppError(`Product ${item.product_id} not found`, 404);
        }

        const hasStock = await productService.checkStock(item.product_id, item.quantity, span);
        if (!hasStock) {
          await client.query('ROLLBACK');
          throw new AppError(`Insufficient stock for product ${item.product_id}`, 400);
        }
      }

      // Step 2: Calculate total amount
      let totalAmount = 0;
      const orderItems = items.map((item: any) => {
        const product = products.find(p => p.data?.id === item.product_id);
        const price = product.data.price;
        totalAmount += price * item.quantity;
        return {
          product_id: item.product_id,
          quantity: item.quantity,
          price,
        };
      });

      // Step 3: Create order
      span.log({ event: 'create_order_start' });
      const orderResult = await client.query(
        `INSERT INTO orders (user_id, status, total_amount, shipping_address)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, 'pending', totalAmount, JSON.stringify(shipping_address)]
      );

      const order = orderResult.rows[0];

      // Step 4: Create order items
      for (const item of orderItems) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price)
           VALUES ($1, $2, $3, $4)`,
          [order.id, item.product_id, item.quantity, item.price]
        );
      }

      // Step 5: Update stock (decrease)
      span.log({ event: 'update_stock_start' });
      for (const item of items) {
        try {
          await productService.updateStock(item.product_id, item.quantity, 'decrease', span);
        } catch (error) {
          // Rollback if stock update fails
          await client.query('ROLLBACK');
          logger.error(`Failed to update stock for product ${item.product_id}: ${error}`);
          throw new AppError('Failed to update product stock', 500);
        }
      }

      await client.query('COMMIT');

      // Step 6: Process payment
      span.log({ event: 'process_payment_start' });
      let paymentResult;
      try {
        paymentResult = await paymentService.processPayment({
          orderId: order.id,
          userId,
          amount: totalAmount,
        }, span);

        if (paymentResult.success) {
          // Update order status to paid
          await query(
            'UPDATE orders SET status = $1 WHERE id = $2',
            ['paid', order.id]
          );
          order.status = 'paid';
          ordersStatusTotal.labels('paid').inc();

          // Send payment success notification
          await notificationService.sendOrderPaidNotification(userId, order.id, {
            totalAmount,
            transactionId: paymentResult.transactionId,
          }, span);
        } else {
          throw new Error('Payment failed');
        }
      } catch (error) {
        // Payment failed - compensate by restoring stock
        logger.error(`Payment failed for order ${order.id}, initiating compensation`);
        span.log({ event: 'payment_failed', message: (error as Error).message });

        // Compensate: Restore stock
        for (const item of items) {
          try {
            await productService.updateStock(item.product_id, item.quantity, 'increase', span);
          } catch (stockError) {
            logger.error(`Failed to restore stock for product ${item.product_id}: ${stockError}`);
          }
        }

        // Update order status to failed
        await query(
          'UPDATE orders SET status = $1 WHERE id = $2',
          ['failed', order.id]
        );

        throw new AppError('Payment processing failed', 400);
      }

      // Step 7: Send order created notification
      await notificationService.sendOrderCreatedNotification(userId, order.id, {
        totalAmount,
        itemCount: items.length,
        shipping_address,
      }, span);

      // Metrics
      const duration = (Date.now() - start) / 1000;
      orderProcessingDuration.labels('created').observe(duration);
      ordersCreatedTotal.labels('paid').inc();

      span.setTag('order.id', order.id);
      span.setTag('order.status', order.status);
      span.setTag('order.total', totalAmount);
      span.finish();

      logger.info(`Order created successfully: ${order.id}`);

      res.status(201).json({
        status: 'success',
        data: {
          order: {
            ...order,
            items: orderItems,
          },
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      span.setTag('error', true);
      span.log({ event: 'error', message: (error as Error).message });
      span.finish();
      next(error);
    } finally {
      client.release();
    }
  }

  async getOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const tracer = getTracer();
    const span = tracer.startSpan('order.getOrder');

    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Get order
      const orderResult = await query(
        'SELECT * FROM orders WHERE id = $1',
        [id]
      );

      if (orderResult.rows.length === 0) {
        throw new AppError('Order not found', 404);
      }

      const order = orderResult.rows[0];

      // Check authorization (users can only see their own orders, admins can see all)
      if (userRole !== 'admin' && order.user_id !== userId) {
        throw new AppError('Forbidden: Access denied', 403);
      }

      // Get order items
      const itemsResult = await query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [id]
      );

      span.setTag('order.id', id);
      span.finish();

      res.json({
        status: 'success',
        data: {
          order: {
            ...order,
            items: itemsResult.rows,
          },
        },
      });
    } catch (error) {
      span.setTag('error', true);
      span.log({ event: 'error', message: (error as Error).message });
      span.finish();
      next(error);
    }
  }

  async listOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const tracer = getTracer();
    const span = tracer.startSpan('order.listOrders');

    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const { status, page = 1, limit = 10 } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      let queryText = 'SELECT * FROM orders';
      const queryParams: any[] = [];
      const conditions: string[] = [];

      // Non-admin users can only see their own orders
      if (userRole !== 'admin') {
        conditions.push('user_id = $1');
        queryParams.push(userId);
      }

      // Filter by status if provided
      if (status) {
        conditions.push(`status = $${queryParams.length + 1}`);
        queryParams.push(status);
      }

      if (conditions.length > 0) {
        queryText += ' WHERE ' + conditions.join(' AND ');
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(Number(limit), offset);

      const result = await query(queryText, queryParams);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM orders';
      const countParams: any[] = [];

      if (conditions.length > 0) {
        countQuery += ' WHERE ' + conditions.join(' AND ');
        // Re-add the filter params for count query
        if (userRole !== 'admin') {
          countParams.push(userId);
        }
        if (status) {
          countParams.push(status);
        }
      }

      const countResult = await query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);

      span.setTag('orders.count', result.rows.length);
      span.finish();

      res.json({
        status: 'success',
        data: {
          orders: result.rows,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalCount,
            totalPages: Math.ceil(totalCount / Number(limit)),
          },
        },
      });
    } catch (error) {
      span.setTag('error', true);
      span.log({ event: 'error', message: (error as Error).message });
      span.finish();
      next(error);
    }
  }

  async updateOrderStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const tracer = getTracer();
    const span = tracer.startSpan('order.updateOrderStatus');

    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'failed'];
      if (!validStatuses.includes(status)) {
        throw new AppError('Invalid order status', 400);
      }

      // Get current order
      const orderResult = await query(
        'SELECT * FROM orders WHERE id = $1',
        [id]
      );

      if (orderResult.rows.length === 0) {
        throw new AppError('Order not found', 404);
      }

      const order = orderResult.rows[0];

      // Update order status
      await query(
        'UPDATE orders SET status = $1 WHERE id = $2',
        [status, id]
      );

      ordersStatusTotal.labels(status).inc();

      // Send notification based on status
      if (status === 'shipped') {
        await notificationService.sendOrderShippedNotification(order.user_id, order.id, {
          totalAmount: order.total_amount,
        }, span);
      } else if (status === 'delivered') {
        await notificationService.sendOrderDeliveredNotification(order.user_id, order.id, {
          totalAmount: order.total_amount,
        }, span);
      }

      span.setTag('order.id', id);
      span.setTag('order.status', status);
      span.finish();

      logger.info(`Order ${id} status updated to ${status}`);

      res.json({
        status: 'success',
        message: 'Order status updated successfully',
        data: {
          orderId: id,
          status,
        },
      });
    } catch (error) {
      span.setTag('error', true);
      span.log({ event: 'error', message: (error as Error).message });
      span.finish();
      next(error);
    }
  }

  async cancelOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const tracer = getTracer();
    const span = tracer.startSpan('order.cancelOrder');

    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Get order
      const orderResult = await query(
        'SELECT * FROM orders WHERE id = $1',
        [id]
      );

      if (orderResult.rows.length === 0) {
        throw new AppError('Order not found', 404);
      }

      const order = orderResult.rows[0];

      // Check authorization
      if (userRole !== 'admin' && order.user_id !== userId) {
        throw new AppError('Forbidden: Access denied', 403);
      }

      // Check if order can be cancelled
      if (['delivered', 'cancelled', 'failed'].includes(order.status)) {
        throw new AppError(`Cannot cancel order with status: ${order.status}`, 400);
      }

      // Get order items to restore stock
      const itemsResult = await query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [id]
      );

      // Restore stock
      span.log({ event: 'restore_stock_start' });
      for (const item of itemsResult.rows) {
        try {
          await productService.updateStock(item.product_id, item.quantity, 'increase', span);
        } catch (error) {
          logger.error(`Failed to restore stock for product ${item.product_id}: ${error}`);
        }
      }

      // If order was paid, initiate refund
      if (order.status === 'paid' || order.status === 'processing' || order.status === 'shipped') {
        span.log({ event: 'refund_payment_start' });
        // In a real system, you would track the transaction ID
        // For now, we'll just log the refund attempt
        logger.info(`Refund initiated for order ${id}, amount: ${order.total_amount}`);
      }

      // Update order status
      await query(
        'UPDATE orders SET status = $1 WHERE id = $2',
        ['cancelled', id]
      );

      ordersStatusTotal.labels('cancelled').inc();

      // Send cancellation notification
      await notificationService.sendOrderCancelledNotification(order.user_id, order.id, {
        totalAmount: order.total_amount,
      }, span);

      span.setTag('order.id', id);
      span.finish();

      logger.info(`Order ${id} cancelled successfully`);

      res.json({
        status: 'success',
        message: 'Order cancelled successfully',
        data: {
          orderId: id,
          status: 'cancelled',
        },
      });
    } catch (error) {
      span.setTag('error', true);
      span.log({ event: 'error', message: (error as Error).message });
      span.finish();
      next(error);
    }
  }
}

export default new OrderController();
