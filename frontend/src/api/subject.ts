import apiClient from './client';
import type { Subject, PaginatedResponse } from '../types/timetable';

export const subjectApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<PaginatedResponse<Subject>> {
    return apiClient.get('/subjects', params);
  },

  async get(id: string): Promise<Subject> {
    return apiClient.get(`/subjects/${id}`);
  },

  async create(data: {
    code: string;
    name: string;
    departmentId: string;
    credits?: number;
    examDuration?: number;
  }): Promise<Subject> {
    return apiClient.post('/subjects', data);
  },

  async update(id: string, data: Partial<Subject>): Promise<Subject> {
    return apiClient.put(`/subjects/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/subjects/${id}`);
  },
};

export default subjectApi;