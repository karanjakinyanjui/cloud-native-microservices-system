import crypto from 'crypto';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: string;
  orderId: number;
  userId: number;
  metadata?: any;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  status: 'completed' | 'failed' | 'pending';
  message?: string;
  metadata?: any;
}

export interface RefundRequest {
  transactionId: string;
  amount: number;
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  status: 'completed' | 'failed' | 'pending';
  message?: string;
}

/**
 * Mock Payment Gateway Service
 * Simulates a payment gateway like Stripe for demonstration purposes
 * In production, this would integrate with real payment APIs
 */
export class PaymentGatewayService {
  private mode: string;

  constructor() {
    this.mode = config.paymentGateway.mode;
  }

  /**
   * Process a payment through the gateway
   * Simulates various scenarios for demo purposes
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    logger.info('Processing payment through gateway', {
      amount: request.amount,
      currency: request.currency,
      paymentMethod: request.paymentMethod,
    });

    // Simulate processing delay
    await this.delay(500 + Math.random() * 1000);

    // Generate mock transaction ID
    const transactionId = this.generateTransactionId();

    // Simulate different scenarios based on amount or payment method
    // This makes the demo more realistic

    // Scenario 1: Amounts ending in .99 fail (simulating insufficient funds)
    if (this.isAmountEndingWith(request.amount, 99)) {
      logger.warn('Payment failed - insufficient funds simulation', { transactionId });
      return {
        success: false,
        transactionId,
        status: 'failed',
        message: 'Insufficient funds',
      };
    }

    // Scenario 2: Very large amounts (> 10000) require additional verification
    if (request.amount > 10000) {
      logger.info('Large payment requires verification', { transactionId });
      return {
        success: true,
        transactionId,
        status: 'pending',
        message: 'Payment pending verification for large amounts',
        metadata: {
          requiresVerification: true,
        },
      };
    }

    // Scenario 3: Random 5% failure rate to simulate network/gateway issues
    if (Math.random() < 0.05) {
      logger.warn('Payment failed - random gateway error simulation', { transactionId });
      return {
        success: false,
        transactionId,
        status: 'failed',
        message: 'Gateway error - please try again',
      };
    }

    // Scenario 4: Payment method specific handling
    if (request.paymentMethod === 'bank_transfer') {
      logger.info('Bank transfer requires manual confirmation', { transactionId });
      return {
        success: true,
        transactionId,
        status: 'pending',
        message: 'Bank transfer initiated - awaiting confirmation',
        metadata: {
          requiresConfirmation: true,
          estimatedCompletionTime: '2-3 business days',
        },
      };
    }

    // Default: Successful payment
    logger.info('Payment processed successfully', { transactionId });
    return {
      success: true,
      transactionId,
      status: 'completed',
      message: 'Payment processed successfully',
      metadata: {
        processedAt: new Date().toISOString(),
        gateway: 'stripe_mock',
      },
    };
  }

  /**
   * Process a refund
   */
  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    logger.info('Processing refund through gateway', {
      transactionId: request.transactionId,
      amount: request.amount,
    });

    // Simulate processing delay
    await this.delay(300 + Math.random() * 700);

    // Generate mock refund ID
    const refundId = this.generateRefundId();

    // Simulate 2% failure rate for refunds
    if (Math.random() < 0.02) {
      logger.warn('Refund failed - simulation', { refundId });
      return {
        success: false,
        refundId,
        status: 'failed',
        message: 'Refund failed - transaction not found or already refunded',
      };
    }

    // Default: Successful refund
    logger.info('Refund processed successfully', { refundId });
    return {
      success: true,
      refundId,
      status: 'completed',
      message: 'Refund processed successfully',
    };
  }

  /**
   * Verify webhook signature
   * In production, this would verify signatures from the payment gateway
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (this.mode === 'mock') {
      // In mock mode, accept any signature for testing
      return true;
    }

    try {
      // Simulate signature verification
      const expectedSignature = crypto
        .createHmac('sha256', config.stripe.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Webhook signature verification failed', { error });
      return false;
    }
  }

  /**
   * Get payment status from gateway
   * Used for payment verification and reconciliation
   */
  async getPaymentStatus(transactionId: string): Promise<{
    status: string;
    amount?: number;
    currency?: string;
  }> {
    logger.info('Fetching payment status from gateway', { transactionId });

    // Simulate API call delay
    await this.delay(200);

    // In mock mode, return completed status
    return {
      status: 'completed',
      amount: 0, // Would be actual amount in production
      currency: 'USD',
    };
  }

  // Helper methods

  private generateTransactionId(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `txn_${timestamp}_${random}`;
  }

  private generateRefundId(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `ref_${timestamp}_${random}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isAmountEndingWith(amount: number, ending: number): boolean {
    const amountCents = Math.round(amount * 100);
    return amountCents % 100 === ending;
  }
}

// Export singleton instance
export const paymentGateway = new PaymentGatewayService();
