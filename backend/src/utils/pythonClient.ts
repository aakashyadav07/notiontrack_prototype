import { getEnv } from '../config/env';

const env = getEnv();

export interface TimetableGenerationRequest {
  period: { start: string; end: string };
  timeSlots: Array<{ type: string; start: string; end: string }>;
  rooms: Array<{ id: string; capacity: number; building?: string }>;
  exams: Array<{
    id: string;
    subjectId: string;
    duration: number;
    studentIds: string[];
    studentCount: number;
  }>;
  faculty: Array<{
    id: string;
    maxWorkload: number;
    examIds: string[];
  }>;
  constraints?: {
    maxExamsPerDayPerStudent?: number;
    minGapHours?: number;
    invigilatorRatio?: number;
    preferredTimeSlots?: string[];
    avoidConsecutiveDays?: boolean;
  };
}

export interface TimetableGenerationResponse {
  status: 'success' | 'partial' | 'failed';
  entries: Array<{
    examId: string;
    roomId: string;
    date: string;
    startTime: string;
    endTime: string;
  }>;
  statistics: {
    examsScheduled: number;
    conflictsDetected: number;
    conflictsResolved: number;
    remainingConflicts: number;
    roomUtilization: number;
    roomsUsed: number;
    studentsAffected: number;
    invigilatorsAssigned: number;
    optimizationScore: number;
    generationTime: number;
  };
  conflicts?: Array<{
    type: string;
    severity: string;
    description: string;
    entityType: string;
    entityId: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }>;
}

export interface SeatAllocationRequest {
  timetableEntries: Array<{
    examId: string;
    roomId: string;
    date: string;
    startTime: string;
    endTime: string;
  }>;
  rooms: Array<{
    id: string;
    capacity: number;
    rows: number;
    columns: number;
    layout?: Record<string, unknown>;
  }>;
  studentsByExam: Record<string, Array<{
    id: string;
    departmentId: string;
    section?: string;
  }>>;
  antiCheatingRules?: {
    separateSameSubject?: boolean;
    separateSameSection?: boolean;
    separateSameDepartment?: boolean;
    minColumnGap?: number;
  };
}

export interface SeatAllocationResponse {
  allocations: Array<{
    studentId: string;
    examId: string;
    roomId: string;
    seatRow: string;
    seatColumn: number;
    seatNumber: string;
  }>;
  statistics: {
    totalAllocated: number;
    roomsUsed: number;
    antiCheatingViolations: number;
  };
}

export interface InvigilatorAllocationRequest {
  examSessions: Array<{
    examId: string;
    roomId: string;
    date: string;
    startTime: string;
    endTime: string;
    studentCount: number;
  }>;
  faculty: Array<{
    id: string;
    maxWorkload: number;
  }>;
  invigilatorRatio: number;
  includeRelievers: boolean;
  relieverPercentage: number;
}

export interface InvigilatorAllocationResponse {
  assignments: Array<{
    examId: string;
    facultyId: string;
    roomId: string;
    date: string;
    startTime: string;
    endTime: string;
    role: string;
  }>;
  statistics: {
    totalAssigned: number;
    facultyUtilized: number;
    averageWorkload: number;
  };
}

export interface ConflictDetectionRequest {
  timetableEntries: Array<{
    id: string;
    examId: string;
    roomId: string;
    date: string;
    startTime: string;
    endTime: string;
  }>;
  exams: Array<{
    id: string;
    studentIds: string[];
    facultyIds: string[];
  }>;
  rooms: Array<{ id: string; capacity: number }>;
  faculty: Array<{ id: string; maxWorkload: number }>;
}

export interface ConflictDetectionResponse {
  conflicts: Array<{
    type: string;
    severity: string;
    description: string;
    entityType: string;
    entityId: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }>;
}

class PythonClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = env.PYTHON_SERVICE_URL;
    this.apiKey = env.PYTHON_SERVICE_API_KEY;
  }

  private async request<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' })) as { message: string };
      throw new Error(`Python service error: ${errorData.message || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async generateTimetable(request: TimetableGenerationRequest): Promise<TimetableGenerationResponse> {
    return this.request<TimetableGenerationResponse>('/api/v1/timetable/generate', request);
  }

  async generateSeatAllocation(request: SeatAllocationRequest): Promise<SeatAllocationResponse> {
    return this.request<SeatAllocationResponse>('/api/v1/seat-allocation/generate', request);
  }

  async generateInvigilatorAssignments(request: InvigilatorAllocationRequest): Promise<InvigilatorAllocationResponse> {
    return this.request<InvigilatorAllocationResponse>('/api/v1/invigilators/generate', request);
  }

  async detectConflicts(request: ConflictDetectionRequest): Promise<ConflictDetectionResponse> {
    return this.request<ConflictDetectionResponse>('/api/v1/conflicts/detect', request);
  }

  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl}/health`, {
      headers: { 'X-API-Key': this.apiKey },
    });
    return response.json() as Promise<{ status: string }>;
  }
}

export const pythonClient = new PythonClient();