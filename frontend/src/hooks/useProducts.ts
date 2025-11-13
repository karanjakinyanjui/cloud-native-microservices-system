import { useQuery } from '@tanstack/react-query';
import { productsApi, ProductFilters } from '../api/products.api';

export const useProducts = (filters?: ProductFilters) => {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsApi.getProducts(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => productsApi.getProductById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['products', 'categories'],
    queryFn: () => productsApi.getCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useFeaturedProducts = (limit: number = 8) => {
  return useQuery({
    queryKey: ['products', 'featured', limit],
    queryFn: () => productsApi.getFeaturedProducts(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSearchProducts = (query: string) => {
  return useQuery({
    queryKey: ['products', 'search', query],
    queryFn: () => productsApi.searchProducts(query),
    enabled: query.length > 2,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};
