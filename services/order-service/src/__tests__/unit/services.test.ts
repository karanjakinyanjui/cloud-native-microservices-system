import paymentService from '../../services/paymentService';
import productService from '../../services/productService';
import notificationService from '../../services/notificationService';
import axios from 'axios';

jest.mock('axios');
jest.mock('../../utils/logger');
jest.mock('../../utils/metrics', () => ({
  externalServiceRequests: { labels: jest.fn(() => ({ inc: jest.fn() })) },
  externalServiceDuration: { labels: jest.fn(() => ({ observe: jest.fn() })) },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Order Services', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PaymentService', () => {
    it('should process payment successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            transactionId: 'txn_123',
            status: 'success',
          },
        },
      };

      mockedAxios.create = jest.fn(() => ({
        post: jest.fn().mockResolvedValue(mockResponse),
      } as any));

      const result = await paymentService.processPayment({
        orderId: 1,
        userId: 1,
        amount: 100.50,
      });

      expect(result.data.transactionId).toBe('txn_123');
      expect(result.data.status).toBe('success');
    });

    it('should handle payment failure', async () => {
      mockedAxios.create = jest.fn(() => ({
        post: jest.fn().mockRejectedValue(new Error('Payment failed')),
      } as any));

      await expect(
        paymentService.processPayment({
          orderId: 1,
          userId: 1,
          amount: 100.50,
        })
      ).rejects.toThrow('Payment failed');
    });

    it('should retry on network errors', async () => {
      const mockPost = jest.fn()
        .mockRejectedValueOnce({ response: { status: 503 } })
        .mockRejectedValueOnce({ response: { status: 503 } })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { transactionId: 'txn_456', status: 'success' },
          },
        });

      mockedAxios.create = jest.fn(() => ({
        post: mockPost,
      } as any));

      const result = await paymentService.processPayment({
        orderId: 2,
        userId: 1,
        amount: 50.00,
      });

      expect(mockPost).toHaveBeenCalledTimes(3);
      expect(result.data.transactionId).toBe('txn_456');
    });

    it('should refund payment', async () => {
      mockedAxios.create = jest.fn(() => ({
        post: jest.fn().mockResolvedValue({
          data: {
            success: true,
            data: { transactionId: 'refund_123', status: 'refunded' },
          },
        }),
      } as any));

      const result = await paymentService.refundPayment('txn_123', 100.50);

      expect(result.data.status).toBe('refunded');
    });

    it('should get payment status', async () => {
      mockedAxios.create = jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          data: {
            transactionId: 'txn_123',
            status: 'completed',
            amount: 100.50,
          },
        }),
      } as any));

      const result = await paymentService.getPaymentStatus('txn_123');

      expect(result.status).toBe('completed');
    });
  });

  describe('ProductService', () => {
    it('should check product availability', async () => {
      mockedAxios.create = jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          data: {
            success: true,
            data: {
              id: 1,
              name: 'Test Product',
              stock_quantity: 10,
              is_active: true,
            },
          },
        }),
      } as any));

      const result = await productService.checkAvailability(1);

      expect(result.available).toBe(true);
      expect(result.stock_quantity).toBe(10);
    });

    it('should return unavailable for out of stock', async () => {
      mockedAxios.create = jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          data: {
            success: true,
            data: {
              id: 1,
              stock_quantity: 0,
              is_active: true,
            },
          },
        }),
      } as any));

      const result = await productService.checkAvailability(1);

      expect(result.available).toBe(false);
    });

    it('should reserve product stock', async () => {
      mockedAxios.create = jest.fn(() => ({
        post: jest.fn().mockResolvedValue({
          data: {
            success: true,
            data: { stock_quantity: 8 },
          },
        }),
      } as any));

      const result = await productService.reserveStock(1, 2);

      expect(result.success).toBe(true);
    });

    it('should handle stock reservation failure', async () => {
      mockedAxios.create = jest.fn(() => ({
        post: jest.fn().mockRejectedValue({
          response: {
            status: 400,
            data: { message: 'Insufficient stock' },
          },
        }),
      } as any));

      await expect(productService.reserveStock(1, 100)).rejects.toThrow();
    });
  });

  describe('NotificationService', () => {
    it('should send order confirmation', async () => {
      mockedAxios.create = jest.fn(() => ({
        post: jest.fn().mockResolvedValue({
          data: { success: true, messageId: 'msg_123' },
        }),
      } as any));

      const result = await notificationService.sendOrderConfirmation({
        orderId: 1,
        userId: 1,
        email: 'test@example.com',
        orderDetails: { total: 100 },
      });

      expect(result.messageId).toBe('msg_123');
    });

    it('should send order status update', async () => {
      mockedAxios.create = jest.fn(() => ({
        post: jest.fn().mockResolvedValue({
          data: { success: true },
        }),
      } as any));

      await expect(
        notificationService.sendOrderStatusUpdate({
          orderId: 1,
          email: 'test@example.com',
          status: 'shipped',
        })
      ).resolves.not.toThrow();
    });

    it('should handle notification service errors gracefully', async () => {
      mockedAxios.create = jest.fn(() => ({
        post: jest.fn().mockRejectedValue(new Error('Service unavailable')),
      } as any));

      // Notification failures should not break the order flow
      await expect(
        notificationService.sendOrderConfirmation({
          orderId: 1,
          userId: 1,
          email: 'test@example.com',
          orderDetails: {},
        })
      ).rejects.toThrow();
    });

    it('should retry failed notifications', async () => {
      const mockPost = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { success: true, messageId: 'msg_456' },
        });

      mockedAxios.create = jest.fn(() => ({
        post: mockPost,
      } as any));

      const result = await notificationService.sendOrderConfirmation({
        orderId: 2,
        userId: 1,
        email: 'test@example.com',
        orderDetails: {},
      });

      expect(mockPost).toHaveBeenCalledTimes(2);
      expect(result.messageId).toBe('msg_456');
    });
  });
});
