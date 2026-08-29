import apiClient from './client';
import type { SeatAllocation, PaginatedResponse, GenerateSeatAllocationRequest, GenerateSeatAllocationResponse, JobStatus } from '../types/timetable';

export const seatAllocationApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    timetableId?: string;
    examId?: string;
    roomId?: string;
    studentId?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<PaginatedResponse<SeatAllocation>> {
    return apiClient.get('/seat-allocation', params);
  },

  async get(id: string): Promise<SeatAllocation> {
    return apiClient.get(`/seat-allocation/${id}`);
  },

  async generate(data: GenerateSeatAllocationRequest): Promise<GenerateSeatAllocationResponse> {
    return apiClient.post('/seat-allocation/generate', data);
  },

  async getJobStatus(jobId: string): Promise<JobStatus> {
    return apiClient.get(`/seat-allocation/jobs/${jobId}`);
  },

  async export(timetableId: string, format: 'pdf' | 'excel' = 'excel'): Promise<Blob> {
    return apiClient.download(`/seat-allocation/${timetableId}/export`, { format });
  },

  async regenerate(timetableId: string): Promise<GenerateSeatAllocationResponse> {
    return apiClient.post(`/seat-allocation/${timetableId}/regenerate`);
  },
};

export default seatAllocationApi;