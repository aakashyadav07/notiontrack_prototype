import apiClient from './client';
import type { InvigilatorAssignment, PaginatedResponse, GenerateInvigilatorAssignmentRequest, JobStatus } from '../types/timetable';

export const invigilatorApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    timetableId?: string;
    examId?: string;
    facultyId?: string;
    date?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<PaginatedResponse<InvigilatorAssignment>> {
    return apiClient.get('/invigilators', params);
  },

  async get(id: string): Promise<InvigilatorAssignment> {
    return apiClient.get(`/invigilators/${id}`);
  },

  async generate(data: GenerateInvigilatorAssignmentRequest): Promise<{ jobId: string; status: string }> {
    return apiClient.post('/invigilators/generate', data);
  },

  async getJobStatus(jobId: string): Promise<JobStatus> {
    return apiClient.get(`/invigilators/jobs/${jobId}`);
  },

  async getFacultyAssignments(facultyId: string, params?: { date?: string; startDate?: string; endDate?: string }): Promise<InvigilatorAssignment[]> {
    return apiClient.get(`/invigilators/faculty/${facultyId}`, params);
  },

  async export(timetableId: string, format: 'pdf' | 'excel'): Promise<Blob> {
    return apiClient.download(`/invigilators/${timetableId}/export`, { format });
  },
};

export default invigilatorApi;