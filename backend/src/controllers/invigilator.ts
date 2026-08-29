import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { successResponse, paginatedResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, ConflictError } from '../utils/errors';
import { z } from 'zod';
import { pythonClient } from '../utils/pythonClient';
import { jobQueue, JobType } from '../config/queue';

const generateInvigilatorSchema = z.object({
  timetableId: z.string().cuid(),
  invigilatorRatio: z.number().int().positive().max(100).default(30),
  includeRelievers: z.boolean().default(true),
  relieverPercentage: z.number().int().min(0).max(50).default(10),
});

const invigilatorQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  facultyId: z.string().cuid().optional(),
  examId: z.string().cuid().optional(),
  date: z.string().datetime().optional(),
  role: z.enum(['CHIEF', 'INVIGILATOR', 'RELIEVER']).optional(),
  sortBy: z.enum(['date', 'facultyId', 'createdAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const updateAssignmentSchema = z.object({
  facultyId: z.string().cuid().optional(),
  role: z.enum(['CHIEF', 'INVIGILATOR', 'RELIEVER']).optional(),
  roomId: z.string().cuid().optional(),
});

export const generateInvigilatorAssignments = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as any;
  const data = generateInvigilatorSchema.parse(req.body);

  const timetable = await prisma.timetable.findUnique({
    where: { id: data.timetableId },
    include: {
      entries: {
        include: { exam: { include: { subject: true } }, room: true },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      },
    },
  });

  if (!timetable) throw new NotFoundError('Timetable', data.timetableId);

  const jobId = jobQueue.enqueue('INVIGILATOR_ASSIGNMENT', {
    timetableId: data.timetableId,
    invigilatorRatio: data.invigilatorRatio,
    includeRelievers: data.includeRelievers,
    relieverPercentage: data.relieverPercentage,
  });

  res.status(202).json(successResponse({ jobId, status: 'processing' }));
});

export const getInvigilatorJob = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { jobId } = req.params;
  const job = jobQueue.getJob(jobId);
  
  if (!job) throw new NotFoundError('Job', jobId);

  res.json(successResponse({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    result: job.result,
    error: job.error,
  }));
});

export const getInvigilatorAssignments = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const query = invigilatorQuerySchema.parse(req.query);
  const { page, limit, facultyId, examId, date, role, sortBy, sortOrder } = query;

  const where: any = {};
  if (facultyId) where.facultyId = facultyId;
  if (examId) where.examId = examId;
  if (date) where.date = new Date(date);
  if (role) where.role = role;

  const [assignments, total] = await Promise.all([
    prisma.invigilatorAssignment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        exam: { include: { subject: true } },
        faculty: { include: { user: { select: { email: true } }, department: true } },
        room: true,
      },
    }),
    prisma.invigilatorAssignment.count({ where }),
  ]);

  res.json(paginatedResponse(assignments, page, limit, total));
});

export const getInvigilatorAssignment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const assignment = await prisma.invigilatorAssignment.findUnique({
    where: { id },
    include: {
      exam: { include: { subject: true } },
      faculty: { include: { user: { select: { email: true } }, department: true } },
      room: true,
    },
  });

  if (!assignment) throw new NotFoundError('Invigilator assignment', id);

  res.json(successResponse(assignment));
});

export const updateInvigilatorAssignment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const data = updateAssignmentSchema.parse(req.body);

  if (data.facultyId) {
    const faculty = await prisma.faculty.findUnique({ where: { id: data.facultyId } });
    if (!faculty) throw new NotFoundError('Faculty', data.facultyId);
  }

  if (data.roomId) {
    const room = await prisma.room.findUnique({ where: { id: data.roomId } });
    if (!room) throw new NotFoundError('Room', data.roomId);
  }

  const assignment = await prisma.invigilatorAssignment.update({
    where: { id },
    data,
    include: {
      exam: { include: { subject: true } },
      faculty: { include: { user: { select: { email: true } }, department: true } },
      room: true,
    },
  });

  res.json(successResponse(assignment));
});

export const getFacultyWorkload = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { startDate, endDate } = req.query;

  const where: any = {};
  if (startDate && endDate) {
    where.date = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
  }

  const assignments = await prisma.invigilatorAssignment.findMany({
    where,
    include: { faculty: { include: { user: { select: { email: true } } } } },
  });

  const workload = new Map();
  for (const a of assignments) {
    if (!workload.has(a.facultyId)) {
      workload.set(a.facultyId, { faculty: a.faculty, count: 0, exams: [] });
    }
    const w = workload.get(a.facultyId);
    w.count++;
    w.exams.push({ examId: a.examId, date: a.date, room: a.roomId });
  }

  const result = Array.from(workload.values()).map(w => ({
    faculty: w.faculty,
    assignedCount: w.count,
    maxWorkload: w.faculty.maxWorkload,
    utilization: Math.round((w.count / w.faculty.maxWorkload) * 100),
    exams: w.exams,
  }));

  res.json(successResponse(result));
});