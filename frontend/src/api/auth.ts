import apiClient from './client';
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, ChangePasswordRequest, User } from '../types/auth';

export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response;
  },

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', data);
    return response;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async refreshToken(refreshToken?: string): Promise<{ accessToken: string }> {
    const response = await apiClient.post<{ accessToken: string }>('/auth/refresh', { refreshToken });
    return response;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response;
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.put('/auth/password', data);
  },
};

export default authApi;