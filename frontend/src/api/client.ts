import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types/timetable';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(() => this.client(originalRequest))
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await axios.post<{ accessToken: string }>(
              `${API_BASE_URL}/auth/refresh`,
              { refreshToken },
              { withCredentials: true }
            );

            const { accessToken } = response.data;
            localStorage.setItem('accessToken', accessToken);
            this.processQueue(null, accessToken);

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            this.logout();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }

  private processQueue(error: unknown, token: string | null): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    this.failedQueue = [];
  }

  private formatError(error: AxiosError): Error {
    if (error.response?.data) {
      const data = error.response.data as ApiResponse<unknown>;
      const message = data.error?.message || 'An error occurred';
      const formattedError = new Error(message);
      formattedError.name = data.error?.code || 'API_ERROR';
      return formattedError;
    }
    
    if (error.message === 'Network Error') {
      return new Error('Unable to connect to server. Please check your connection.');
    }
    
    return new Error(error.message || 'An unexpected error occurred');
  }

  private logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  public async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    return response.data.data as T;
  }

  public async post<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    return response.data.data as T;
  }

  public async put<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return response.data.data as T;
  }

  public async patch<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data);
    return response.data.data as T;
  }

  public async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url);
    return response.data.data as T;
  }

  public async download(url: string, params?: Record<string, unknown>): Promise<Blob> {
    const response = await this.client.get(url, {
      params,
      responseType: 'blob',
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;