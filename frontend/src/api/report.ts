import apiClient from './client';
import type { PaginatedResponse } from '../types/timetable';

export const reportApi = {
  async getDashboard(): Promise<Record<string, unknown>> {
    return apiClient.get('/reports/dashboard');
  },

  async getTimetableReport(timetableId: string, format: 'pdf' | 'excel' | 'json' = 'pdf'): Promise<Blob> {
    return apiClient.download(`/reports/timetable/${timetableId}`, { format });
  },

  async getRoomUtilizationReport(params?: { startDate?: string; endDate?: string; format?: 'pdf' | 'excel' | 'json' }): Promise<Blob> {
    return apiClient.download('/reports/room-utilization', params);
  },

  async getSeatAllocationReport(timetableId: string, format: 'pdf' | 'excel' | 'json' = 'pdf'): Promise<Blob> {
    return apiClient.download(`/reports/seat-allocation/${timetableId}`, { format });
  },

  async getConflictStatistics(timetableId: string, format: 'pdf' | 'excel' | 'json' = 'pdf'): Promise<Blob> {
    return apiClient.download(`/reports/conflicts/${timetableId}`, { format });
  },

  async getFacultyWorkloadReport(timetableId: string, format: 'pdf' | 'excel' | 'json' = 'pdf'): Promise<Blob> {
    return apiClient.download(`/reports/faculty-workload/${timetableId}`, { format });
  },

  async getExamStatistics(format: 'pdf' | 'excel' | 'json' = 'pdf'): Promise<Blob> {
    return apiClient.download('/reports/exam-statistics', { format });
  },
};

export default reportApi;