import apiClient from './client';
import type { Student, PaginatedResponse } from '../types/timetable';

export const studentApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: string;
    semester?: number;
    section?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<PaginatedResponse<Student>> {
    return apiClient.get('/students', params);
  },

  async get(id: string): Promise<Student> {
    return apiClient.get(`/students/${id}`);
  },

  async create(data: {
    email: string;
    password: string;
    studentId: string;
    departmentId: string;
    semester: number;
    section?: string;
  }): Promise<Student> {
    return apiClient.post('/students', data);
  },

  async update(id: string, data: Partial<Student>): Promise<Student> {
    return apiClient.put(`/students/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/students/${id}`);
  },

  async getTimetable(id: string): Promise<any> {
    return apiClient.get(`/students/${id}/timetable`);
  },

  async getSeatAllocation(id: string): Promise<any> {
    return apiClient.get(`/students/${id}/seat-allocation`);
  },
};

export default studentApi;