import apiClient from './client';
import type { Faculty, PaginatedResponse, InvigilatorAssignment } from '../types/timetable';

export const facultyApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: string;
    designation?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<PaginatedResponse<Faculty>> {
    return apiClient.get('/faculty', params);
  },

  async get(id: string): Promise<Faculty> {
    return apiClient.get(`/faculty/${id}`);
  },

  async create(data: {
    email: string;
    password: string;
    employeeId: string;
    departmentId: string;
    designation: string;
    maxWorkload?: number;
  }): Promise<Faculty> {
    return apiClient.post('/faculty', data);
  },

  async update(id: string, data: Partial<Faculty>): Promise<Faculty> {
    return apiClient.put(`/faculty/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/faculty/${id}`);
  },

  async getAssignments(id: string, params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<InvigilatorAssignment[]> {
    return apiClient.get(`/faculty/${id}/assignments`, params);
  },
};

export default facultyApi;