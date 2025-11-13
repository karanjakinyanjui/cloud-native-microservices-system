import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/orders.api';
import { CreateOrderRequest } from '../types';

export const useOrders = (page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ['orders', page, limit],
    queryFn: () => ordersApi.getOrders(page, limit),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useOrder = (id: string) => {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => ordersApi.getOrderById(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderData: CreateOrderRequest) => ordersApi.createOrder(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => ordersApi.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useTrackOrder = (id: string) => {
  return useQuery({
    queryKey: ['orders', id, 'track'],
    queryFn: () => ordersApi.trackOrder(id),
    enabled: !!id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};
