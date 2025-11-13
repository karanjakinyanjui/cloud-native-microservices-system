import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config';
import logger from '../utils/logger';
import { externalServiceRequests, externalServiceDuration } from '../utils/metrics';
import { getTracer } from '../utils/tracer';
import { FORMAT_HTTP_HEADERS, Span } from 'opentracing';

interface NotificationRequest {
  userId: number;
  type: 'order_created' | 'order_paid' | 'order_shipped' | 'order_delivered' | 'order_cancelled';
  orderId: number;
  email?: string;
  data?: any;
}

class NotificationService {
  private client: AxiosInstance;
  private serviceName = 'notification-service';

  constructor() {
    this.client = axios.create({
      baseURL: config.services.notificationService,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async retryRequest<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 2, // Lower retry for notifications (fire and forget)
    delayMs: number = config.retry.delayMs
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const axiosError = error as AxiosError;

        // Don't retry on 4xx errors (client errors)
        if (axiosError.response && axiosError.response.status >= 400 && axiosError.response.status < 500) {
          throw error;
        }

        if (attempt < maxAttempts) {
          const delay = delayMs * Math.pow(config.retry.backoffMultiplier, attempt - 1);
          logger.warn(`${this.serviceName} request failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  async sendNotification(notification: NotificationRequest, parentSpan?: Span): Promise<void> {
    const tracer = getTracer();
    const span = tracer.startSpan('notification-service.sendNotification', {
      childOf: parentSpan,
    });

    const start = Date.now();

    try {
      const headers: any = {};
      tracer.inject(span, FORMAT_HTTP_HEADERS, headers);

      await this.retryRequest(async () => {
        await this.client.post('/api/notifications', notification, { headers });
      });

      const duration = (Date.now() - start) / 1000;
      externalServiceDuration.labels(this.serviceName, 'POST').observe(duration);
      externalServiceRequests.labels(this.serviceName, 'POST', 'success').inc();

      span.setTag('notification.type', notification.type);
      span.setTag('order.id', notification.orderId);
      span.setTag('user.id', notification.userId);
      span.finish();

      logger.info(`Notification sent for order ${notification.orderId}: ${notification.type}`);
    } catch (error) {
      externalServiceRequests.labels(this.serviceName, 'POST', 'error').inc();
      span.setTag('error', true);
      span.log({ event: 'error', message: (error as Error).message });
      span.finish();

      // Don't throw error for notifications - they are non-critical
      logger.error(`Failed to send notification for order ${notification.orderId}: ${(error as Error).message}`);
    }
  }

  async sendOrderCreatedNotification(userId: number, orderId: number, orderData: any, parentSpan?: Span): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'order_created',
      orderId,
      data: orderData,
    }, parentSpan);
  }

  async sendOrderPaidNotification(userId: number, orderId: number, orderData: any, parentSpan?: Span): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'order_paid',
      orderId,
      data: orderData,
    }, parentSpan);
  }

  async sendOrderShippedNotification(userId: number, orderId: number, orderData: any, parentSpan?: Span): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'order_shipped',
      orderId,
      data: orderData,
    }, parentSpan);
  }

  async sendOrderDeliveredNotification(userId: number, orderId: number, orderData: any, parentSpan?: Span): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'order_delivered',
      orderId,
      data: orderData,
    }, parentSpan);
  }

  async sendOrderCancelledNotification(userId: number, orderId: number, orderData: any, parentSpan?: Span): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'order_cancelled',
      orderId,
      data: orderData,
    }, parentSpan);
  }
}

export default new NotificationService();
