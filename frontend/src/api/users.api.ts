import axiosClient from './axiosClient';
import { User } from '../types';

export const usersApi = {
  getProfile: async (): Promise<User> => {
    const response = await axiosClient.get<User>('/users/profile');
    return response.data;
  },

  updateProfile: async (userData: Partial<User>): Promise<User> => {
    const response = await axiosClient.put<User>('/users/profile', userData);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await axiosClient.post('/users/change-password', {
      currentPassword,
      newPassword,
    });
  },

  deleteAccount: async (): Promise<void> => {
    await axiosClient.delete('/users/profile');
  },
};
