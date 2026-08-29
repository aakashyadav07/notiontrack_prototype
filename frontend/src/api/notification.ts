import apiClient from './client';
import type { Notification, PaginatedResponse } from '../types/timetable';

export const notificationApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    type?: string;
    isRead?: boolean;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<PaginatedResponse<Notification>> {
    return apiClient.get('/notifications', params);
  },

  async get(id: string): Promise<Notification> {
    return apiClient.get(`/notifications/${id}`);
  },

  async markAsRead(id: string): Promise<Notification> {
    return apiClient.patch(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  },

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return response.count;
  },
};

export default notificationApi;