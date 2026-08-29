import apiClient from './client';
import type { Room, PaginatedResponse, SeatLayout } from '../types/timetable';

export const roomApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: string;
    minCapacity?: number;
    maxCapacity?: number;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<PaginatedResponse<Room>> {
    return apiClient.get('/rooms', params);
  },

  async get(id: string): Promise<Room> {
    return apiClient.get(`/rooms/${id}`);
  },

  async create(data: {
    code: string;
    name: string;
    capacity: number;
    departmentId?: string;
    floor?: number;
    building?: string;
    hasProjector?: boolean;
    hasAC?: boolean;
    isAccessible?: boolean;
  }): Promise<Room> {
    return apiClient.post('/rooms', data);
  },

  async update(id: string, data: Partial<Room>): Promise<Room> {
    return apiClient.put(`/rooms/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/rooms/${id}`);
  },

  async getLayout(id: string): Promise<SeatLayout> {
    return apiClient.get(`/rooms/${id}/layout`);
  },

  async updateLayout(id: string, data: { rows: number; columns: number; layout?: Record<string, unknown> }): Promise<SeatLayout> {
    return apiClient.put(`/rooms/${id}/layout`, data);
  },
};

export default roomApi;