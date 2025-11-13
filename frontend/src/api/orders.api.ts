import axiosClient from './axiosClient';
import { Order, CreateOrderRequest, PaginatedResponse } from '../types';

export const ordersApi = {
  getOrders: async (page: number = 1, limit: number = 10): Promise<PaginatedResponse<Order>> => {
    const response = await axiosClient.get<PaginatedResponse<Order>>('/orders', {
      params: { page, limit },
    });
    return response.data;
  },

  getOrderById: async (id: string): Promise<Order> => {
    const response = await axiosClient.get<Order>(`/orders/${id}`);
    return response.data;
  },

  createOrder: async (orderData: CreateOrderRequest): Promise<Order> => {
    const response = await axiosClient.post<Order>('/orders', orderData);
    return response.data;
  },

  cancelOrder: async (id: string): Promise<Order> => {
    const response = await axiosClient.post<Order>(`/orders/${id}/cancel`);
    return response.data;
  },

  trackOrder: async (id: string): Promise<{ status: string; trackingNumber?: string }> => {
    const response = await axiosClient.get<{ status: string; trackingNumber?: string }>(
      `/orders/${id}/track`
    );
    return response.data;
  },
};
