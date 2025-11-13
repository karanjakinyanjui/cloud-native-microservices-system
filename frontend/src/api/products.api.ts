import axiosClient from './axiosClient';
import { Product, PaginatedResponse } from '../types';

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: 'price' | 'name' | 'rating' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const productsApi = {
  getProducts: async (filters?: ProductFilters): Promise<PaginatedResponse<Product>> => {
    const response = await axiosClient.get<PaginatedResponse<Product>>('/products', {
      params: filters,
    });
    return response.data;
  },

  getProductById: async (id: string): Promise<Product> => {
    const response = await axiosClient.get<Product>(`/products/${id}`);
    return response.data;
  },

  getCategories: async (): Promise<string[]> => {
    const response = await axiosClient.get<string[]>('/products/categories');
    return response.data;
  },

  getFeaturedProducts: async (limit: number = 8): Promise<Product[]> => {
    const response = await axiosClient.get<Product[]>('/products/featured', {
      params: { limit },
    });
    return response.data;
  },

  searchProducts: async (query: string): Promise<Product[]> => {
    const response = await axiosClient.get<Product[]>('/products/search', {
      params: { q: query },
    });
    return response.data;
  },
};
