import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config';
import logger from '../utils/logger';
import { externalServiceRequests, externalServiceDuration } from '../utils/metrics';
import { getTracer } from '../utils/tracer';
import { FORMAT_HTTP_HEADERS, Span } from 'opentracing';

class ProductService {
  private client: AxiosInstance;
  private serviceName = 'product-service';

  constructor() {
    this.client = axios.create({
      baseURL: config.services.productService,
      timeout: 10000,
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

  async verifyProduct(productId: number, parentSpan?: Span): Promise<any> {
    const tracer = getTracer();
    const span = tracer.startSpan('product-service.verifyProduct', {
      childOf: parentSpan,
    });

    const start = Date.now();

    try {
      const headers: any = {};
      tracer.inject(span, FORMAT_HTTP_HEADERS, headers);

      const result = await this.retryRequest(async () => {
        const response = await this.client.get(`/api/products/${productId}`, { headers });
        return response.data;
      });

      const duration = (Date.now() - start) / 1000;
      externalServiceDuration.labels(this.serviceName, 'GET').observe(duration);
      externalServiceRequests.labels(this.serviceName, 'GET', 'success').inc();

      span.setTag('product.id', productId);
      span.setTag('http.status_code', 200);
      span.finish();

      return result;
    } catch (error) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status || 500;

      externalServiceRequests.labels(this.serviceName, 'GET', 'error').inc();
      span.setTag('error', true);
      span.setTag('http.status_code', statusCode);
      span.log({ event: 'error', message: (error as Error).message });
      span.finish();

      logger.error(`Failed to verify product ${productId}: ${(error as Error).message}`);
      throw error;
    }
  }

  async checkStock(productId: number, quantity: number, parentSpan?: Span): Promise<boolean> {
    const tracer = getTracer();
    const span = tracer.startSpan('product-service.checkStock', {
      childOf: parentSpan,
    });

    const start = Date.now();

    try {
      const headers: any = {};
      tracer.inject(span, FORMAT_HTTP_HEADERS, headers);

      const product = await this.retryRequest(async () => {
        const response = await this.client.get(`/api/products/${productId}`, { headers });
        return response.data;
      });

      const duration = (Date.now() - start) / 1000;
      externalServiceDuration.labels(this.serviceName, 'GET').observe(duration);
      externalServiceRequests.labels(this.serviceName, 'GET', 'success').inc();

      const hasStock = product.data?.stock >= quantity;

      span.setTag('product.id', productId);
      span.setTag('quantity', quantity);
      span.setTag('has_stock', hasStock);
      span.finish();

      return hasStock;
    } catch (error) {
      externalServiceRequests.labels(this.serviceName, 'GET', 'error').inc();
      span.setTag('error', true);
      span.log({ event: 'error', message: (error as Error).message });
      span.finish();

      logger.error(`Failed to check stock for product ${productId}: ${(error as Error).message}`);
      throw error;
    }
  }

  async updateStock(productId: number, quantity: number, operation: 'decrease' | 'increase', parentSpan?: Span): Promise<void> {
    const tracer = getTracer();
    const span = tracer.startSpan('product-service.updateStock', {
      childOf: parentSpan,
    });

    const start = Date.now();

    try {
      const headers: any = {};
      tracer.inject(span, FORMAT_HTTP_HEADERS, headers);

      await this.retryRequest(async () => {
        await this.client.patch(
          `/api/products/${productId}/stock`,
          { quantity, operation },
          { headers }
        );
      });

      const duration = (Date.now() - start) / 1000;
      externalServiceDuration.labels(this.serviceName, 'PATCH').observe(duration);
      externalServiceRequests.labels(this.serviceName, 'PATCH', 'success').inc();

      span.setTag('product.id', productId);
      span.setTag('quantity', quantity);
      span.setTag('operation', operation);
      span.finish();

      logger.info(`Stock updated for product ${productId}: ${operation} ${quantity}`);
    } catch (error) {
      externalServiceRequests.labels(this.serviceName, 'PATCH', 'error').inc();
      span.setTag('error', true);
      span.log({ event: 'error', message: (error as Error).message });
      span.finish();

      logger.error(`Failed to update stock for product ${productId}: ${(error as Error).message}`);
      throw error;
    }
  }

  async getProducts(productIds: number[], parentSpan?: Span): Promise<any[]> {
    const tracer = getTracer();
    const span = tracer.startSpan('product-service.getProducts', {
      childOf: parentSpan,
    });

    try {
      const headers: any = {};
      tracer.inject(span, FORMAT_HTTP_HEADERS, headers);

      const products = await Promise.all(
        productIds.map(id => this.verifyProduct(id, span))
      );

      span.setTag('product_count', productIds.length);
      span.finish();

      return products;
    } catch (error) {
      span.setTag('error', true);
      span.log({ event: 'error', message: (error as Error).message });
      span.finish();

      throw error;
    }
  }
}

export default new ProductService();
