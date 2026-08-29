import apiClient from './client';
import type {
  Timetable,
  TimetableEntry,
  Conflict,
  SeatAllocation,
  GenerateTimetableRequest,
  GenerateTimetableResponse,
  GenerateSeatAllocationRequest,
  GenerateSeatAllocationResponse,
  GenerateInvigilatorAssignmentRequest,
  TimeSlot,
  Department,
  Room,
  Exam,
  Faculty,
  Subject,
  Student,
  PaginatedResponse,
  JobStatus,
  InvigilatorAssignment,
} from '../types/timetable';

export const timetableApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<PaginatedResponse<Timetable>> {
    return apiClient.get('/timetable', params);
  },

  async get(id: string): Promise<Timetable> {
    return apiClient.get(`/timetable/${id}`);
  },

  async generate(data: GenerateTimetableRequest): Promise<GenerateTimetableResponse> {
    return apiClient.post('/timetable/generate', data);
  },

  async regenerate(id: string): Promise<GenerateTimetableResponse> {
    return apiClient.post(`/timetable/${id}/regenerate`);
  },

  async publish(id: string): Promise<Timetable> {
    return apiClient.post(`/timetable/${id}/publish`);
  },

  async getJobStatus(jobId: string): Promise<JobStatus> {
    return apiClient.get(`/timetable/jobs/${jobId}`);
  },

  async getConflicts(id: string): Promise<Conflict[]> {
    return apiClient.get(`/timetable/${id}/conflicts`);
  },

  async resolveConflict(
    timetableId: string,
    conflictId: string,
    action: {
      action: 'MOVE_EXAM' | 'CHANGE_ROOM' | 'CHANGE_TIME' | 'REMOVE_EXAM' | 'IGNORE';
      newRoomId?: string;
      newDate?: string;
      newStartTime?: string;
      newEndTime?: string;
      notes?: string;
    }
  ): Promise<void> {
    await apiClient.post(`/timetable/${timetableId}/conflicts/${conflictId}/resolve`, action);
  },
};

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

  async regenerate(id: string): Promise<GenerateSeatAllocationResponse> {
    return apiClient.post(`/seat-allocation/${id}/regenerate`);
  },

  async export(timetableId: string, format: 'pdf' | 'excel' = 'excel'): Promise<Blob> {
    return apiClient.download(`/seat-allocation/${timetableId}/export`, { format });
  },

  async getJobStatus(jobId: string): Promise<{
    jobId: string;
    status: string;
    progress: number;
    result: unknown;
    error: string | null;
  }> {
    return apiClient.get(`/seat-allocation/jobs/${jobId}`);
  },
};

export const invigilatorApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    facultyId?: string;
    examId?: string;
    date?: string;
    role?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<PaginatedResponse<InvigilatorAssignment>> {
    return apiClient.get('/invigilators/assignments', params);
  },

  async get(id: string): Promise<InvigilatorAssignment> {
    return apiClient.get(`/invigilators/assignments/${id}`);
  },

  async generate(data: GenerateInvigilatorAssignmentRequest): Promise<{
    jobId: string;
    status: string;
  }> {
    return apiClient.post('/invigilators/generate', data);
  },

  async update(id: string, data: Partial<InvigilatorAssignment>): Promise<InvigilatorAssignment> {
    return apiClient.put(`/invigilators/assignments/${id}`, data);
  },

  async getWorkload(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{
    faculty: {
      id: string;
      employeeId: string;
      user: { email: string };
      department: { code: string };
      designation: string;
      maxWorkload: number;
    };
    assignedCount: number;
    maxWorkload: number;
    utilization: number;
    exams: Array<{ examId: string; date: string; room: string }>;
  }>> {
    return apiClient.get('/invigilators/workload', params);
  },

  async getJobStatus(jobId: string): Promise<{
    jobId: string;
    status: string;
    progress: number;
    result: unknown;
    error: string | null;
  }> {
    return apiClient.get(`/invigilators/jobs/${jobId}`);
  },
};

export const reportApi = {
  async getDashboard(timetableId?: string): Promise<{
    totalStudents: number;
    totalFaculty: number;
    totalSubjects: number;
    totalRooms: number;
    totalExams: number;
    scheduledExams: number;
    pendingExams: number;
    conflicts: number;
    resolvedConflicts: number;
    roomUtilization: number;
    seatAllocationStatus: string;
    upcomingExams: Array<{
      id: string;
      subject: string;
      sessions: Array<{
        id: string;
        date: string;
        startTime: string;
        endTime: string;
        room: { code: string; name: string };
      }>;
    }>;
    recentNotifications: Array<{
      id: string;
      title: string;
      message: string;
      type: string;
      isRead: boolean;
      createdAt: string;
      user: { email: string };
    }>;
  }> {
    return apiClient.get('/reports/dashboard', { timetableId });
  },

  async getTimetableReport(timetableId: string, format: 'json' | 'pdf' | 'excel' = 'json'): Promise<Blob | Timetable> {
    if (format === 'json') {
      return apiClient.get(`/reports/timetable`, { timetableId, format });
    }
    return apiClient.download(`/reports/timetable`, { timetableId, format });
  },

  async getRoomUtilization(timetableId?: string, format: 'json' | 'excel' = 'json'): Promise<Blob | Array<{
    room: string;
    roomName: string;
    capacity: number;
    examsScheduled: number;
    totalStudents: number;
    totalCapacity: number;
    utilization: number;
  }>> {
    if (format === 'json') {
      return apiClient.get(`/reports/rooms`, { timetableId, format });
    }
    return apiClient.download(`/reports/rooms`, { timetableId, format });
  },

  async getSeatAllocationReport(timetableId: string, format: 'json' | 'excel' = 'json'): Promise<Blob | SeatAllocation[]> {
    if (format === 'json') {
      return apiClient.get(`/reports/seat-allocation`, { timetableId, format });
    }
    return apiClient.download(`/reports/seat-allocation`, { timetableId, format });
  },

  async getConflictReport(timetableId?: string, format: 'json' | 'excel' = 'json'): Promise<Blob | {
    stats: {
      total: number;
      resolved: number;
      unresolved: number;
      byType: Record<string, number>;
      bySeverity: Record<string, number>;
    };
    conflicts: Array<{
      id: string;
      type: string;
      severity: string;
      description: string;
      entityType: string;
      entityId: string;
      relatedEntityType: string | null;
      relatedEntityId: string | null;
      isResolved: boolean;
      createdAt: string;
    }>;
  }> {
    if (format === 'json') {
      return apiClient.get(`/reports/conflicts`, { timetableId, format });
    }
    return apiClient.download(`/reports/conflicts`, { timetableId, format });
  },

  async getFacultyWorkloadReport(params?: {
    startDate?: string;
    endDate?: string;
    format?: 'json' | 'excel';
  }): Promise<Blob | Array<{
    facultyId: string;
    name: string;
    department: string;
    designation: string;
    assignedCount: number;
    maxWorkload: number;
    utilization: number;
    exams: Array<{ examId: string; date: string; room: string }>;
  }>> {
    if (params?.format === 'excel') {
      return apiClient.download(`/reports/faculty-workload`, params);
    }
    return apiClient.get(`/reports/faculty-workload`, params);
  },

  async getExamStatistics(timetableId?: string): Promise<{
    totalExams: number;
    totalStudents: number;
    bySubject: Record<string, { exams: number; students: number }>;
    byExamType: Record<string, { exams: number; students: number }>;
    avgStudentsPerExam: number;
  }> {
    return apiClient.get(`/reports/exam-statistics`, { timetableId });
  },
};

export const notificationApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
    type?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{
    data: Array<{
      id: string;
      userId: string;
      title: string;
      message: string;
      type: string;
      metadata: Record<string, unknown> | null;
      isRead: boolean;
      readAt: string | null;
      createdAt: string;
      user: { email: string };
    }>;
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    return apiClient.get('/notifications', params);
  },

  async getUnreadCount(): Promise<{ count: number }> {
    return apiClient.get('/notifications/unread-count');
  },

  async markAsRead(id: string): Promise<{
    id: string;
    userId: string;
    title: string;
    message: string;
    type: string;
    metadata: Record<string, unknown> | null;
    isRead: boolean;
    readAt: string;
    createdAt: string;
  }> {
    return apiClient.post(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.post('/notifications/read-all');
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  },
};

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

  async update(id: string, data: { code?: string; name?: string; description?: string }): Promise<Department> {
    return apiClient.put(`/departments/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/departments/${id}`);
  },
};

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

  async getTimetable(id: string): Promise<Array<{
    exam: { id: string; subject: Subject };
    entries: TimetableEntry[];
  }>> {
    return apiClient.get(`/students/${id}/timetable`);
  },

  async getSeatAllocation(id: string): Promise<SeatAllocation[]> {
    return apiClient.get(`/students/${id}/seat-allocation`);
  },
};

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
    maxWorkload: number;
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
    credits: number;
    examDuration: number;
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

  async getLayout(id: string): Promise<{
    id: string;
    roomId: string;
    rows: number;
    columns: number;
    layout: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
  }> {
    return apiClient.get(`/rooms/${id}/layout`);
  },

  async updateLayout(id: string, data: { rows: number; columns: number; layout?: Record<string, unknown> }): Promise<{
    id: string;
    roomId: string;
    rows: number;
    columns: number;
    layout: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
  }> {
    return apiClient.put(`/rooms/${id}/layout`, data);
  },
};

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

export default timetableApi;