import axiosClient from './axiosClient';
import { Payment, CreatePaymentRequest } from '../types';

export const paymentsApi = {
  createPayment: async (paymentData: CreatePaymentRequest): Promise<Payment> => {
    const response = await axiosClient.post<Payment>('/payments', paymentData);
    return response.data;
  },

  getPayment: async (id: string): Promise<Payment> => {
    const response = await axiosClient.get<Payment>(`/payments/${id}`);
    return response.data;
  },

  getPaymentByOrderId: async (orderId: string): Promise<Payment> => {
    const response = await axiosClient.get<Payment>(`/payments/order/${orderId}`);
    return response.data;
  },

  refundPayment: async (id: string): Promise<Payment> => {
    const response = await axiosClient.post<Payment>(`/payments/${id}/refund`);
    return response.data;
  },
};
