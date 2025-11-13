import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config';
import logger from '../utils/logger';
import { externalServiceRequests, externalServiceDuration } from '../utils/metrics';
import { getTracer } from '../utils/tracer';
import { FORMAT_HTTP_HEADERS, Span } from 'opentracing';

interface PaymentRequest {
  orderId: number;
  userId: number;
  amount: number;
  currency?: string;
  paymentMethod?: string;
}

interface PaymentResponse {
  success: boolean;
  transactionId: string;
  status: string;
  message?: string;
}

class PaymentService {
  private client: AxiosInstance;
  private serviceName = 'payment-service';

  constructor() {
    this.client = axios.create({
      baseURL: config.services.paymentService,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async retryRequest<T>(
    fn: () => Promise<T>,
    maxAttempts: number = config.retry.maxAttempts,
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

  async processPayment(paymentData: PaymentRequest, parentSpan?: Span): Promise<PaymentResponse> {
    const tracer = getTracer();
    const span = tracer.startSpan('payment-service.processPayment', {
      childOf: parentSpan,
    });

    const start = Date.now();

    try {
      const headers: any = {};
      tracer.inject(span, FORMAT_HTTP_HEADERS, headers);

      const result = await this.retryRequest(async () => {
        const response = await this.client.post('/api/payments', {
          ...paymentData,
          currency: paymentData.currency || 'USD',
          paymentMethod: paymentData.paymentMethod || 'credit_card',
        }, { headers });
        return response.data;
      });

      const duration = (Date.now() - start) / 1000;
      externalServiceDuration.labels(this.serviceName, 'POST').observe(duration);
      externalServiceRequests.labels(this.serviceName, 'POST', 'success').inc();

      span.setTag('order.id', paymentData.orderId);
      span.setTag('payment.amount', paymentData.amount);
      span.setTag('payment.transaction_id', result.data?.transactionId);
      span.setTag('http.status_code', 200);
      span.finish();

      logger.info(`Payment processed for order ${paymentData.orderId}: ${result.data?.transactionId}`);

      return result.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status || 500;

      externalServiceRequests.labels(this.serviceName, 'POST', 'error').inc();
      span.setTag('error', true);
      span.setTag('http.status_code', statusCode);
      span.log({ event: 'error', message: (error as Error).message });
      span.finish();

      logger.error(`Failed to process payment for order ${paymentData.orderId}: ${(error as Error).message}`);
      throw error;
    }
  }

  async refundPayment(transactionId: string, amount: number, parentSpan?: Span): Promise<PaymentResponse> {
    const tracer = getTracer();
    const span = tracer.startSpan('payment-service.refundPayment', {
      childOf: parentSpan,
    });

    const start = Date.now();

    try {
      const headers: any = {};
      tracer.inject(span, FORMAT_HTTP_HEADERS, headers);

      const result = await this.retryRequest(async () => {
        const response = await this.client.post('/api/payments/refund', {
          transactionId,
          amount,
        }, { headers });
        return response.data;
      });

      const duration = (Date.now() - start) / 1000;
      externalServiceDuration.labels(this.serviceName, 'POST').observe(duration);
      externalServiceRequests.labels(this.serviceName, 'POST', 'success').inc();

      span.setTag('payment.transaction_id', transactionId);
      span.setTag('payment.amount', amount);
      span.finish();

      logger.info(`Payment refunded for transaction ${transactionId}: ${amount}`);

      return result.data;
    } catch (error) {
      externalServiceRequests.labels(this.serviceName, 'POST', 'error').inc();
      span.setTag('error', true);
      span.log({ event: 'error', message: (error as Error).message });
      span.finish();

      logger.error(`Failed to refund payment for transaction ${transactionId}: ${(error as Error).message}`);
      throw error;
    }
  }

  async getPaymentStatus(transactionId: string, parentSpan?: Span): Promise<any> {
    const tracer = getTracer();
    const span = tracer.startSpan('payment-service.getPaymentStatus', {
      childOf: parentSpan,
    });

    const start = Date.now();

    try {
      const headers: any = {};
      tracer.inject(span, FORMAT_HTTP_HEADERS, headers);

      const result = await this.retryRequest(async () => {
        const response = await this.client.get(`/api/payments/${transactionId}`, { headers });
        return response.data;
      });

      const duration = (Date.now() - start) / 1000;
      externalServiceDuration.labels(this.serviceName, 'GET').observe(duration);
      externalServiceRequests.labels(this.serviceName, 'GET', 'success').inc();

      span.setTag('payment.transaction_id', transactionId);
      span.finish();

      return result;
    } catch (error) {
      externalServiceRequests.labels(this.serviceName, 'GET', 'error').inc();
      span.setTag('error', true);
      span.log({ event: 'error', message: (error as Error).message });
      span.finish();

      logger.error(`Failed to get payment status for transaction ${transactionId}: ${(error as Error).message}`);
      throw error;
    }
  }
}

export default new PaymentService();
