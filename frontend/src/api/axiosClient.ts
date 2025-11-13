import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { config } from '../config';

const axiosClient = axios.create({
  baseURL: config.apiGatewayUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // Format error message
    const message =
      (error.response?.data as any)?.message ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject({
      message,
      statusCode: error.response?.status || 500,
      errors: (error.response?.data as any)?.errors,
    });
  }
);

export default axiosClient;
