import apiClient from './client';
import type { Exam, PaginatedResponse } from '../types/timetable';

export const examApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    subjectId?: string;
    examType?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<PaginatedResponse<Exam>> {
    return apiClient.get('/exams', params);
  },

  async get(id: string): Promise<Exam> {
    return apiClient.get(`/exams/${id}`);
  },

  async create(data: {
    subjectId: string;
    examType: 'REGULAR' | 'SUPPLEMENTARY' | 'PRACTICAL';
    duration: number;
    maxStudents?: number;
  }): Promise<Exam> {
    return apiClient.post('/exams', data);
  },

  async update(id: string, data: Partial<Exam>): Promise<Exam> {
    return apiClient.put(`/exams/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/exams/${id}`);
  },

  async registerStudents(id: string, studentIds: string[]): Promise<Array<{ studentId: string; success: boolean; error?: string }>> {
    return apiClient.post(`/exams/${id}/register`, { studentIds });
  },

  async unregisterStudents(id: string, studentIds: string[]): Promise<void> {
    await apiClient.delete(`/exams/${id}/register?studentIds=${studentIds.join(',')}`);
  },
};

export default examApi;