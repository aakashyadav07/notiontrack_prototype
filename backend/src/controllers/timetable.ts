import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { successResponse, paginatedResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, ConflictError } from '../utils/errors';
import { z } from 'zod';
import { pythonClient } from '../utils/pythonClient';
import { jobQueue, JobType } from '../config/queue';
import { randomUUID } from 'crypto';

const generateTimetableSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  timeSlots: z.array(z.object({
    type: z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  })).min(1),
  roomIds: z.array(z.string().cuid()).min(1),
  examIds: z.array(z.string().cuid()).optional(),
  constraints: z.object({
    maxExamsPerDayPerStudent: z.number().int().positive().max(3).default(2),
    minGapHours: z.number().int().nonnegative().default(2),
    invigilatorRatio: z.number().int().positive().max(100).default(30),
    preferredTimeSlots: z.array(z.string()).optional(),
    avoidConsecutiveDays: z.boolean().default(true),
  }).optional(),
});

const timetableQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['DRAFT', 'GENERATING', 'GENERATED', 'PUBLISHED', 'ARCHIVED']).optional(),
  sortBy: z.enum(['createdAt', 'name', 'startDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const timetableIdParamSchema = z.object({ params: z.object({ id: z.string().cuid() }) });

const resolveConflictSchema = z.object({
  params: z.object({ id: z.string().cuid(), conflictId: z.string().cuid() }),
  body: z.object({
    action: z.enum(['MOVE_EXAM', 'CHANGE_ROOM', 'CHANGE_TIME', 'REMOVE_EXAM', 'IGNORE']),
    newRoomId: z.string().cuid().optional(),
    newDate: z.string().datetime().optional(),
    newStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    newEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    notes: z.string().optional(),
  }),
});

function generateTimeSlots(startDate: string, endDate: string, slotConfigs: any[]) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const slots = [];
  const current = new Date(start);
  while (current <= end) {
    for (const config of slotConfigs) {
      slots.push({
        date: current.toISOString().split('T')[0],
        type: config.type,
        start: config.start,
        end: config.end,
      });
    }
    current.setDate(current.getDate() + 1);
  }
  return slots;
}

export const generateTimetable = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as any;
  const data = generateTimetableSchema.parse(req.body);

  const rooms = await prisma.room.findMany({
    where: { id: { in: data.roomIds }, isActive: true },
    include: { seatLayout: true },
  });
  if (rooms.length !== data.roomIds.length) {
    throw new NotFoundError('One or more rooms not found or inactive');
  }

  let examIds = data.examIds;
  if (!examIds || examIds.length === 0) {
    const exams = await prisma.exam.findMany({
      where: { status: { in: ['DRAFT', 'SCHEDULED'] } },
      select: { id: true },
    });
    examIds = exams.map(e => e.id);
  }

  const exams = await prisma.exam.findMany({
    where: { id: { in: examIds } },
    include: {
      subject: true,
      registrations: { where: { status: 'REGISTERED' }, include: { student: true } },
    },
  });

  if (exams.length === 0) {
    throw new ConflictError('No exams found to schedule');
  }

  const faculty = await prisma.faculty.findMany({
    include: { user: true },
  });

  const timetable = await prisma.timetable.create({
    data: {
      name: data.name,
      description: data.description,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: 'GENERATING',
      generatedBy: authReq.user.userId,
    },
  });

  const jobId = jobQueue.enqueue('TIMETABLE_GENERATION', {
    timetableId: timetable.id,
    period: { start: data.startDate, end: data.endDate },
    timeSlots: data.timeSlots,
    rooms: rooms.map(r => ({ id: r.id, capacity: r.capacity, building: r.building })),
    exams: exams.map(e => ({
      id: e.id,
      subjectId: e.subjectId,
      duration: e.duration,
      studentIds: e.registrations.map(r => r.studentId),
      studentCount: e.registrations.length,
    })),
    faculty: faculty.map(f => ({
      id: f.id,
      maxWorkload: f.maxWorkload,
      examIds: [],
    })),
    constraints: data.constraints,
  });

  res.status(202).json(successResponse({ jobId, timetableId: timetable.id, status: 'processing' }));
});

export const getTimetableJob = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { jobId } = req.params;
  const job = jobQueue.getJob(jobId);
  
  if (!job) {
    throw new NotFoundError('Job', jobId);
  }

  res.json(successResponse({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    result: job.result,
    error: job.error,
  }));
});

export const getTimetables = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const query = timetableQuerySchema.parse(req.query);
  const { page, limit, status, sortBy, sortOrder } = query;

  const where = status ? { status } : {};

  const [timetables, total] = await Promise.all([
    prisma.timetable.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: { select: { entries: true, conflicts: true, seatAllocations: true } },
      },
    }),
    prisma.timetable.count({ where }),
  ]);

  res.json(paginatedResponse(timetables, page, limit, total));
});

export const getTimetable = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const timetable = await prisma.timetable.findUnique({
    where: { id },
    include: {
      entries: {
        include: { exam: { include: { subject: true } }, room: true },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      },
      conflicts: { orderBy: { createdAt: 'desc' } },
      _count: { select: { entries: true, conflicts: true, seatAllocations: true } },
    },
  });

  if (!timetable) throw new NotFoundError('Timetable', id);

  res.json(successResponse(timetable));
});

export const publishTimetable = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const authReq = req as any;

  const timetable = await prisma.timetable.findUnique({ where: { id } });
  if (!timetable) throw new NotFoundError('Timetable', id);

  if (timetable.status !== 'GENERATED') {
    throw new ConflictError('Only generated timetables can be published');
  }

  const conflicts = await prisma.conflict.count({ where: { timetableId: id, isResolved: false } });
  if (conflicts > 0) {
    throw new ConflictError(`Cannot publish timetable with ${conflicts} unresolved conflicts`);
  }

  const updated = await prisma.timetable.update({
    where: { id },
    data: { status: 'PUBLISHED', publishedAt: new Date(), publishedBy: authReq.user.userId },
  });

  await prisma.notification.createMany({
    data: [
      { userId: authReq.user.userId, title: 'Timetable Published', message: `Timetable "${timetable.name}" has been published`, type: 'TIMETABLE_PUBLISHED' },
    ],
  });

  res.json(successResponse(updated));
});

export const getTimetableConflicts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const timetable = await prisma.timetable.findUnique({ where: { id } });
  if (!timetable) throw new NotFoundError('Timetable', id);

  const conflicts = await prisma.conflict.findMany({
    where: { timetableId: id },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
  });

  res.json(successResponse(conflicts));
});

export const resolveConflict = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id, conflictId } = req.params;
  const data = resolveConflictSchema.parse(req.body);
  const authReq = req as any;

  const conflict = await prisma.conflict.findFirst({ where: { id: conflictId, timetableId: id } });
  if (!conflict) throw new NotFoundError('Conflict', conflictId);

  if (conflict.isResolved) throw new ConflictError('Conflict already resolved');

  await prisma.conflict.update({
    where: { id: conflictId },
    data: { isResolved: true, resolvedAt: new Date(), resolvedBy: authReq.user.userId, metadata: { ...(conflict.metadata as object ?? {}), resolution: data } },
  });

  res.json(successResponse({ message: 'Conflict resolved successfully' }));
});

export const regenerateTimetable = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const authReq = req as any;

  const timetable = await prisma.timetable.findUnique({ where: { id } });
  if (!timetable) throw new NotFoundError('Timetable', id);

  if (timetable.status === 'PUBLISHED') {
    throw new ConflictError('Cannot regenerate a published timetable');
  }

  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    include: { seatLayout: true },
  });

  const exams = await prisma.exam.findMany({
    where: { status: { in: ['DRAFT', 'SCHEDULED'] } },
    include: {
      subject: true,
      registrations: { where: { status: 'REGISTERED' }, include: { student: true } },
    },
  });

  const faculty = await prisma.faculty.findMany({ include: { user: true } });

  await prisma.timetable.update({ where: { id }, data: { status: 'GENERATING' } });
  await prisma.timetableEntry.deleteMany({ where: { timetableId: id } });
  await prisma.conflict.deleteMany({ where: { timetableId: id } });

  const jobId = jobQueue.enqueue('TIMETABLE_GENERATION', {
    timetableId: id,
    period: { start: timetable.startDate.toISOString().split('T')[0], end: timetable.endDate.toISOString().split('T')[0] },
    timeSlots: [
      { type: 'MORNING', start: '09:00', end: '12:00' },
      { type: 'AFTERNOON', start: '13:00', end: '16:00' },
      { type: 'EVENING', start: '17:00', end: '20:00' },
    ],
    rooms: rooms.map(r => ({ id: r.id, capacity: r.capacity, building: r.building })),
    exams: exams.map(e => ({
      id: e.id,
      subjectId: e.subjectId,
      duration: e.duration,
      studentIds: e.registrations.map(r => r.studentId),
      studentCount: e.registrations.length,
    })),
    faculty: faculty.map(f => ({ id: f.id, maxWorkload: f.maxWorkload, examIds: [] })),
  });

  res.status(202).json(successResponse({ jobId, timetableId: id, status: 'processing' }));
});