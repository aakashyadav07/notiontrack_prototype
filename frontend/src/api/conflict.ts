import apiClient from './client';
import type { Conflict, PaginatedResponse, JobStatus } from '../types/timetable';

export const conflictApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    timetableId?: string;
    type?: string;
    severity?: string;
    isResolved?: boolean;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<PaginatedResponse<Conflict>> {
    return apiClient.get('/conflicts', params);
  },

  async get(id: string): Promise<Conflict> {
    return apiClient.get(`/conflicts/${id}`);
  },

  async resolve(
    id: string,
    action: {
      action: 'MOVE_EXAM' | 'CHANGE_ROOM' | 'CHANGE_TIME' | 'REMOVE_EXAM' | 'IGNORE' | 'MANUAL_FIX';
      newRoomId?: string;
      newDate?: string;
      newStartTime?: string;
      newEndTime?: string;
      notes?: string;
    }
  ): Promise<void> {
    await apiClient.post(`/conflicts/${id}/resolve`, action);
  },

  async detect(timetableId: string): Promise<{ jobId: string; status: string }> {
    return apiClient.post('/conflicts/detect', { timetableId });
  },

  async getStats(timetableId?: string): Promise<{
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    resolved: number;
    unresolved: number;
  }> {
    return apiClient.get('/conflicts/stats', { timetableId });
  },
};

export default conflictApi;