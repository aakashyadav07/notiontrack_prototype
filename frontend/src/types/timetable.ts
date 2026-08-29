export interface Department {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    students: number;
    faculty: number;
    subjects: number;
    rooms: number;
  };
}

export interface Student {
  id: string;
  userId: string;
  studentId: string;
  departmentId: string;
  department?: Department;
  semester: number;
  section: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
  };
}

export interface Faculty {
  id: string;
  userId: string;
  employeeId: string;
  departmentId: string;
  department?: Department;
  designation: string;
  maxWorkload: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
  };
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  department?: Department;
  credits: number;
  examDuration: number;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  capacity: number;
  departmentId: string | null;
  department?: Department | null;
  floor: number | null;
  building: string | null;
  hasProjector: boolean;
  hasAC: boolean;
  isAccessible: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  seatLayout?: SeatLayout;
  _count?: {
    examSessions: number;
  };
}

export interface SeatLayout {
  id: string;
  roomId: string;
  rows: number;
  columns: number;
  layout: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Exam {
  id: string;
  subjectId: string;
  subject?: Subject;
  examType: 'REGULAR' | 'SUPPLEMENTARY' | 'PRACTICAL';
  duration: number;
  maxStudents: number | null;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  _count?: {
    registrations: number;
  };
}

export interface ExamRegistration {
  id: string;
  examId: string;
  studentId: string;
  student?: Student;
  exam?: Exam;
  status: 'REGISTERED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  createdAt: string;
  updatedAt: string;
}

export interface ExamSession {
  id: string;
  examId: string;
  exam?: Exam;
  roomId: string | null;
  room?: Room | null;
  date: string;
  startTime: string;
  endTime: string;
  sessionType: 'MORNING' | 'AFTERNOON' | 'EVENING';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface Timetable {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'GENERATING' | 'GENERATED' | 'PUBLISHED' | 'ARCHIVED';
  generatedBy: string;
  generatedAt: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  createdAt: string;
  updatedAt: string;
  entries?: TimetableEntry[];
  conflicts?: Conflict[];
  seatAllocations?: SeatAllocation[];
  _count?: {
    entries: number;
    conflicts: number;
    seatAllocations: number;
  };
}

export interface TimetableEntry {
  id: string;
  timetableId: string;
  timetable?: Timetable;
  examId: string;
  exam?: Exam;
  roomId: string;
  room?: Room;
  date: string;
  startTime: string;
  endTime: string;
  sessionType: 'MORNING' | 'AFTERNOON' | 'EVENING';
  createdAt: string;
}

export interface SeatAllocation {
  id: string;
  timetableId: string;
  timetable?: Timetable;
  studentId: string;
  student?: Student;
  examId: string;
  exam?: Exam;
  roomId: string;
  room?: Room;
  seatRow: string;
  seatColumn: number;
  seatNumber: string;
  createdAt: string;
}

export interface Conflict {
  id: string;
  timetableId: string | null;
  timetable?: Timetable | null;
  type: ConflictType;
  severity: ConflictSeverity;
  description: string;
  entityType: string;
  entityId: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  metadata: Record<string, unknown> | null;
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
}

export type ConflictType = 
  | 'STUDENT_TIME_CONFLICT'
  | 'ROOM_DOUBLE_BOOKING'
  | 'FACULTY_DOUBLE_BOOKING'
  | 'ROOM_CAPACITY_EXCEEDED'
  | 'MISSING_ROOM'
  | 'MISSING_INVIGILATOR'
  | 'INVALID_TIME_SLOT'
  | 'DUPLICATE_ALLOCATION'
  | 'INVALID_REGISTRATION'
  | 'EXAM_OUTSIDE_PERIOD';

export type ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface JobStatus {
  jobId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  result: unknown | null;
  error: string | null;
}

export interface GenerateTimetableRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  timeSlots: TimeSlot[];
  roomIds: string[];
  examIds?: string[];
  constraints?: TimetableConstraints;
}

export interface TimeSlot {
  type: 'MORNING' | 'AFTERNOON' | 'EVENING';
  start: string;
  end: string;
}

export interface TimetableConstraints {
  maxExamsPerDayPerStudent: number;
  minGapHours: number;
  invigilatorRatio: number;
  preferredTimeSlots?: string[];
  avoidConsecutiveDays: boolean;
}

export interface GenerateTimetableResponse {
  jobId: string;
  timetableId: string;
  status: string;
}

export interface GenerateSeatAllocationRequest {
  timetableId: string;
  antiCheatingRules?: AntiCheatingRules;
}

export interface AntiCheatingRules {
  separateSameSubject: boolean;
  separateSameSection: boolean;
  separateSameDepartment: boolean;
  minColumnGap: number;
}

export interface GenerateSeatAllocationResponse {
  jobId: string;
  status: string;
}

export interface GenerateInvigilatorAssignmentRequest {
  timetableId: string;
  invigilatorRatio: number;
  includeRelievers: boolean;
  relieverPercentage: number;
}

export interface InvigilatorAssignment {
  id: string;
  examId: string;
  exam?: Exam;
  facultyId: string;
  faculty?: Faculty;
  roomId: string | null;
  room?: Room | null;
  date: string;
  startTime: string;
  endTime: string;
  role: 'CHIEF' | 'INVIGILATOR' | 'RELIEVER';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
  };
}

export type NotificationType = 
  | 'TIMETABLE_PUBLISHED'
  | 'EXAM_SCHEDULE_CHANGED'
  | 'ROOM_CHANGED'
  | 'SEAT_ALLOCATION_PUBLISHED'
  | 'CONFLICT_DETECTED'
  | 'ADMIN_ALERT'
  | 'SYSTEM';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}