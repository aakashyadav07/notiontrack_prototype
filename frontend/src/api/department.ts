import apiClient from './client';
import type { Department, PaginatedResponse } from '../types/timetable';

export const departmentApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<PaginatedResponse<Department>> {
    return apiClient.get('/departments', params);
  },

  async get(id: string): Promise<Department> {
    return apiClient.get(`/departments/${id}`);
  },

  async create(data: { code: string; name: string; description?: string }): Promise<Department> {
    return apiClient.post('/departments', data);
  },

  async update(id: string, data: Partial<Department>): Promise<Department> {
    return apiClient.put(`/departments/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/departments/${id}`);
  },
};

export default departmentApi;