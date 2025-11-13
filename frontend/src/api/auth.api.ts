import axiosClient from './axiosClient';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await axiosClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await axiosClient.post<AuthResponse>('/auth/register', userData);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await axiosClient.post('/auth/logout');
  },

  verify: async (): Promise<User> => {
    const response = await axiosClient.get<User>('/auth/verify');
    return response.data;
  },

  refreshToken: async (): Promise<{ token: string }> => {
    const response = await axiosClient.post<{ token: string }>('/auth/refresh');
    return response.data;
  },
};
